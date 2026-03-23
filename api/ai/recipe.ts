import {
  DEFAULT_GOOGLE_MODEL,
  clampRemainingPercent,
  decryptApiKey,
  getAIProviderSettings,
  getCurrentMonthTokenUsage,
  hasSupabaseServerConfig,
  getStoredSecret,
  logAIUsage,
  readRequestBody,
  requireAuthenticatedServerContext,
  sendJson,
} from './shared.js'
import type { AIPreRecipe, AIPreviewMessage } from '../../src/app/lib/recipeAI.js'
import {
  buildPreviewConversation,
  buildStructuredUserPrompt,
  promptConfig,
  serializeApprovedPreRecipe,
  type AIRecipeRequestMode,
} from './recipePrompts.js'

type GoogleGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

type GoogleCountTokensResponse = {
  totalTokens?: number
}

async function countGoogleTokens(apiKey: string, model: string, text: string): Promise<number> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    return 0
  }

  const payload = (await response.json()) as GoogleCountTokensResponse
  return payload.totalTokens ?? 0
}

async function callGoogleGenerate(
  apiKey: string,
  model: string,
  text: string,
): Promise<{ parsed: unknown; usage: { promptTokens: number; outputTokens: number; totalTokens: number } }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.5,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || 'Google AI no respondió correctamente.')
  }

  const completion = (await response.json()) as GoogleGenerateResponse
  const content = completion.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) {
    throw new Error('Google AI no devolvió contenido.')
  }

  return {
    parsed: JSON.parse(content),
    usage: {
      promptTokens: completion.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: completion.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: completion.usageMetadata?.totalTokenCount ?? 0,
    },
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  let ctx: Awaited<ReturnType<typeof requireAuthenticatedServerContext>> | null = null
  const canUseSupabaseContext = hasSupabaseServerConfig()
  if (canUseSupabaseContext) {
    try {
      ctx = await requireAuthenticatedServerContext(req)
    } catch (error) {
      sendJson(res, 401, { error: error instanceof Error ? error.message : 'No autenticado.' })
      return
    }
  }

  try {
    const body = await readRequestBody(req)
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const userPrompt = buildStructuredUserPrompt(rawPrompt, body.context as Record<string, unknown> | null)
    const mode: AIRecipeRequestMode = body.mode === 'preview' ? 'preview' : body.mode === 'clarify' ? 'clarify' : 'generate'
    const previewConversation = buildPreviewConversation(body.messages as AIPreviewMessage[] | undefined)
    const approvedPreRecipe = serializeApprovedPreRecipe((body.preRecipe ?? null) as AIPreRecipe | null)
    if (!userPrompt) {
      sendJson(res, 400, { error: 'Debes enviar un prompt para generar la receta.' })
      return
    }
    if (mode === 'generate' && !body.preRecipe) {
      sendJson(res, 400, { error: 'Debes confirmar una prereceta antes de generar la receta final.' })
      return
    }

    const settings = ctx
      ? await getAIProviderSettings(ctx.serviceClient, ctx.userId)
      : {
          aiProvider: 'google_gemini' as const,
          authMode: 'platform_key' as const,
          googleModel: DEFAULT_GOOGLE_MODEL,
          tokenBudgetMode: 'none' as const,
          monthlyTokenLimit: null,
          budgetAmount: null,
          isKeyConfigured: false,
          keyLast4: null,
          lastKeyCheckAt: null,
          lastKeyCheckStatus: 'unknown' as const,
          lastKeyCheckError: null,
          canUseUserKey: false,
        }
    const model = settings.googleModel || DEFAULT_GOOGLE_MODEL

    let provider: 'google_gemini' | 'openai' = 'google_gemini'
    let authMode: 'platform_key' | 'user_key' = settings.authMode
    let googleApiKey = ''
    let openAIApiKey = ''

    if (settings.authMode === 'user_key') {
      const storedSecret = await getStoredSecret(ctx.serviceClient, ctx.userId)
      if (!storedSecret || !settings.canUseUserKey) {
        sendJson(res, 400, {
          error: 'Tu API key propia no está lista para usarse. Valídala o vuelve a la clave de la plataforma.',
        })
        return
      }
      googleApiKey = decryptApiKey(storedSecret)
    } else {
      googleApiKey = process.env.GOOGLE_API_KEY?.trim() ?? ''
      openAIApiKey = process.env.OPENAI_API_KEY?.trim() ?? ''
      if (!googleApiKey && openAIApiKey) {
        provider = 'openai'
      }
    }

    if (!googleApiKey && !openAIApiKey) {
      sendJson(res, 500, {
        error: 'No hay una API key disponible para generar recetas con IA.',
      })
      return
    }

    const { systemPrompt, userPrefix } = promptConfig(mode)
    const promptText = [
      systemPrompt,
      `${userPrefix} ${userPrompt}`,
      previewConversation,
      approvedPreRecipe ? `Prereceta aprobada:\n${approvedPreRecipe}` : '',
    ].filter(Boolean).join('\n\n')
    const usedMonthTokens = ctx ? await getCurrentMonthTokenUsage(ctx.serviceClient, ctx.userId) : 0

    if (settings.tokenBudgetMode === 'app_limit' && settings.monthlyTokenLimit) {
      const estimatedPromptTokens =
        provider === 'google_gemini' && googleApiKey
          ? await countGoogleTokens(googleApiKey, model, promptText)
          : 0

      if (usedMonthTokens >= settings.monthlyTokenLimit || usedMonthTokens + estimatedPromptTokens > settings.monthlyTokenLimit) {
        const remainingPercent = clampRemainingPercent(
          ((settings.monthlyTokenLimit - usedMonthTokens) / settings.monthlyTokenLimit) * 100,
        )
        if (ctx) {
          await logAIUsage(ctx.serviceClient, ctx.userId, {
          provider,
          model: provider === 'google_gemini' ? model : 'gpt-4o-mini',
          authMode,
          requestKind: mode,
          requestStatus: 'blocked',
          promptTokens: estimatedPromptTokens,
          totalTokens: estimatedPromptTokens,
          budgetMode: settings.tokenBudgetMode,
          remainingPercent,
          errorCode: 'budget_exceeded',
          errorMessage: 'Límite mensual de tokens alcanzado.',
          }).catch(() => {})
        }

        sendJson(res, 402, {
          error: 'Alcanzaste tu límite mensual de tokens configurado en la app.',
        })
        return
      }
    }

    try {
      if (provider === 'google_gemini' && googleApiKey) {
        const googleResult = await callGoogleGenerate(googleApiKey, model, promptText)
        const remainingPercent =
          settings.tokenBudgetMode === 'app_limit' && settings.monthlyTokenLimit
            ? clampRemainingPercent(
                ((settings.monthlyTokenLimit - (usedMonthTokens + googleResult.usage.totalTokens)) / settings.monthlyTokenLimit) * 100,
              )
            : null

        if (ctx) {
          await logAIUsage(ctx.serviceClient, ctx.userId, {
          provider: 'google_gemini',
          model,
          authMode,
          requestKind: mode,
          requestStatus: 'success',
          promptTokens: googleResult.usage.promptTokens,
          outputTokens: googleResult.usage.outputTokens,
          totalTokens: googleResult.usage.totalTokens,
          budgetMode: settings.tokenBudgetMode,
          remainingPercent,
          }).catch(() => {})
        }

        const usage = {
          provider: 'google_gemini',
          model,
          authMode,
          promptTokens: googleResult.usage.promptTokens,
          outputTokens: googleResult.usage.outputTokens,
          totalTokens: googleResult.usage.totalTokens,
          budgetMode: settings.tokenBudgetMode,
          remainingPercent,
          requestKind: mode,
        }

        if (mode === 'clarify') {
          const parsed = googleResult.parsed as { needsClarification?: unknown; questions?: unknown; suggestedTitle?: unknown; tip?: unknown }
          sendJson(res, 200, {
            needsClarification: Boolean(parsed.needsClarification),
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            suggestedTitle: typeof parsed.suggestedTitle === 'string' ? parsed.suggestedTitle : undefined,
            tip: typeof parsed.tip === 'string' ? parsed.tip : undefined,
            usage,
          })
          return
        }

        if (mode === 'preview') {
          sendJson(res, 200, {
            preRecipe: googleResult.parsed,
            usage,
          })
          return
        }

        sendJson(res, 200, {
          recipe: googleResult.parsed,
          usage,
        })
        return
      }

      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${userPrefix} ${userPrompt}` },
          ],
        }),
      })

      if (!openAIResponse.ok) {
        throw new Error(await openAIResponse.text())
      }

      const completion = (await openAIResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      }
      const content = completion.choices?.[0]?.message?.content
      if (!content) throw new Error('OpenAI no devolvió contenido.')

      const usage = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        authMode: 'platform_key' as const,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        budgetMode: settings.tokenBudgetMode,
        remainingPercent: null,
        requestKind: mode,
      }

      if (ctx) {
        await logAIUsage(ctx.serviceClient, ctx.userId, {
          provider: 'openai',
          model: 'gpt-4o-mini',
          authMode: 'platform_key',
          requestKind: mode,
          requestStatus: 'success',
          promptTokens: usage.promptTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          budgetMode: settings.tokenBudgetMode,
        }).catch(() => {})
      }

      const parsed = JSON.parse(content)
      if (mode === 'clarify') {
        sendJson(res, 200, {
          needsClarification: Boolean((parsed as { needsClarification?: unknown }).needsClarification),
          questions: Array.isArray((parsed as { questions?: unknown }).questions)
            ? (parsed as { questions: unknown[] }).questions
            : [],
          suggestedTitle: typeof (parsed as { suggestedTitle?: unknown }).suggestedTitle === 'string'
            ? (parsed as { suggestedTitle: string }).suggestedTitle
            : undefined,
          tip: typeof (parsed as { tip?: unknown }).tip === 'string'
            ? (parsed as { tip: string }).tip
            : undefined,
          usage,
        })
        return
      }

      if (mode === 'preview') {
        sendJson(res, 200, {
          preRecipe: parsed,
          usage,
        })
        return
      }

      sendJson(res, 200, {
        recipe: parsed,
        usage,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar la receta.'
      if (ctx) {
        await logAIUsage(ctx.serviceClient, ctx.userId, {
          provider,
          model: provider === 'google_gemini' ? model : 'gpt-4o-mini',
          authMode,
          requestKind: mode,
          requestStatus: 'failed',
          budgetMode: settings.tokenBudgetMode,
          errorCode: provider === 'google_gemini' ? 'google_generate_failed' : 'openai_generate_failed',
          errorMessage: message,
        }).catch(() => {})
      }
      sendJson(res, 502, { error: message })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo completar la solicitud autenticada.'
    sendJson(res, 500, { error: message })
  }
}
