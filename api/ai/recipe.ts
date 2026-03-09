import {
  DEFAULT_GOOGLE_MODEL,
  clampRemainingPercent,
  decryptApiKey,
  getAIProviderSettings,
  getCurrentMonthTokenUsage,
  getStoredSecret,
  logAIUsage,
  readRequestBody,
  requireAuthenticatedServerContext,
  sendJson,
} from './shared'

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

type RecipeContextDraft = {
  prompt?: unknown
  servings?: unknown
  availableIngredients?: unknown
  avoidIngredients?: unknown
}

function extractContextTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && typeof (item as { value?: unknown }).value === 'string') {
        return ((item as { value: string }).value || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function buildStructuredUserPrompt(rawPrompt: string, rawContext: RecipeContextDraft | null): string {
  const prompt = rawPrompt.trim()
  if (!rawContext || typeof rawContext !== 'object') {
    return prompt
  }

  const servings =
    typeof rawContext.servings === 'number' && Number.isFinite(rawContext.servings) && rawContext.servings > 0
      ? Math.round(rawContext.servings)
      : null
  const availableIngredients = extractContextTokens(rawContext.availableIngredients)
  const avoidIngredients = extractContextTokens(rawContext.avoidIngredients)
  const lines = [prompt]

  if (servings !== null) {
    lines.push(`- Comensales objetivo: ${servings}`)
  }
  if (availableIngredients.length > 0) {
    lines.push(`- Ingredientes disponibles: ${availableIngredients.join(', ')}`)
  }
  if (avoidIngredients.length > 0) {
    lines.push(`- Ingredientes a evitar: ${avoidIngredients.join(', ')}`)
  }

  return lines.join('\n')
}

function promptConfig(mode: 'generate' | 'clarify') {
  const recipeSystemPrompt = [
    'Eres un chef experto. Responde SOLO JSON valido sin markdown.',
    'Genera una receta en espanol para una app de cocina guiada.',
    'Usa nombres de ingredientes y acciones en espanol de Peru (ej: papa, choclo, culantro, cebolla china, aji amarillo) cuando aplique.',
    'Incluye tiempos realistas en segundos para sub-pasos con timer.',
    'Formato exacto:',
    '{',
    '  "id": "slug-corto-opcional",',
    '  "name": "Nombre receta",',
    '  "icon": "emoji",',
    '  "ingredient": "Ingrediente principal en plural",',
    '  "description": "N pasos · duracion aproximada",',
    '  "tip": "Consejo breve",',
    '  "portionLabels": { "singular": "unidad", "plural": "unidades" },',
    '  "ingredients": [',
    '    { "name": "Ingrediente", "emoji": "emoji", "indispensable": true, "portions": { "1": "texto", "2": "texto", "4": "texto" } }',
    '  ],',
    '  "steps": [',
    '    {',
    '      "stepNumber": 1,',
    '      "stepName": "Nombre paso",',
    '      "fireLevel": "low|medium|high",',
    '      "subSteps": [',
    '        {',
    '          "subStepName": "Accion",',
    '          "notes": "Detalle breve",',
    '          "portions": { "1": "Continuar o numero", "2": "Continuar o numero", "4": "Continuar o numero" },',
    '          "isTimer": true',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    'Reglas: 4 a 8 pasos, cada paso con 1 a 5 subpasos, JSON valido siempre.',
    'Cada step DEBE incluir fireLevel (low|medium|high).',
    'Orden obligatorio: primero mise en place (lavar/pelar/cortar), luego precalentado/calentar aceite, luego coccion.',
    'Nunca pongas un subpaso de pelar/cortar despues de calentar aceite o iniciar coccion.',
    'Cuando corresponda cambiar intensidad, agrega subpaso explicito: "Bajar fuego" o "Subir fuego" y especifica el nivel final en notes.',
    'Regla obligatoria para recetas en sarten:',
    '1) El paso 1 DEBE llamarse "Precalentado" e incluir un subpaso con isTimer=true para precalentar la sarten.',
    '2) El paso 2 DEBE llamarse "Calentar aceite" e incluir un subpaso con isTimer=true para calentar aceite.',
    '3) En ambos pasos debe existir accion manual + timer, y los timers deben ser numeros en segundos en portions.1/2/4.',
    '4) No omitir estos pasos aunque el usuario no los pida explicitamente.',
    '5) Marca "indispensable": true para ingredientes obligatorios del plato y false para opcionales (sal, pimienta, hierbas, condimentos extra).',
    '6) Si una coccion tiene "primera cara", "primer lado" o "primer tramo", agrega un subpaso no-timer con prefijo "Recordatorio:" antes del segundo tramo.',
    '7) El subpaso de recordatorio debe ser no-timer (isTimer=false) con portions en "Continuar". Ejemplo: "Recordatorio: mover papas" o "Recordatorio: voltear".',
    '8) Para frituras por tandas (papas, nuggets, etc.) usa secuencia repetible por tanda: timer tramo 1 -> recordatorio -> timer tramo 2 -> subpaso de tanda completada.',
  ].join('\n')

  const clarifySystemPrompt = [
    'Eres un asistente culinario. Responde SOLO JSON valido sin markdown.',
    'Tu tarea NO es generar receta aun.',
    'Debes devolver preguntas breves para aclarar datos faltantes antes de generar receta guiada.',
    'Si el pedido ya es suficientemente claro, devuelve needsClarification=false y questions=[].',
    'Si faltan datos criticos, devuelve needsClarification=true y entre 2 y 5 preguntas maximo.',
    'Las preguntas deben depender del plato solicitado; no usar plantillas fijas.',
    'Ejemplo: si piden pescado frito, pregunta tipo de pescado, tipo de corte (filete/trozos/entero), y base de cantidad (personas o lo que tiene en unidades/gramos).',
    'Para recetas de proteina o fritura, intenta cubrir: tipo, corte/tamano, cantidad objetivo y nivel de coccion si aplica.',
    'Incluye preguntas para "lo que tengo" cuando sea util (ej: 800 g, 4 filetes).',
    'Formato exacto:',
    '{',
    '  "needsClarification": true,',
    '  "suggestedTitle": "Nombre base opcional para el plato",',
    '  "tip": "Consejo corto opcional para orientar al usuario",',
    '  "questions": [',
    '    {',
    '      "id": "tipo_proteina",',
    '      "question": "¿Qué tipo usarás?",',
    '      "type": "single_choice",',
    '      "required": true,',
    '      "options": ["..."]',
    '    },',
    '    {',
    '      "id": "cantidad",',
    '      "question": "¿Cuántas unidades cocinarás?",',
    '      "type": "number",',
    '      "required": true,',
    '      "min": 1,',
    '      "max": 12,',
    '      "step": 1,',
    '      "unit": "und"',
    '    }',
    '  ]',
    '}',
    'Tipos permitidos: single_choice, number, text.',
    'Los campos suggestedTitle y tip son opcionales; si no aplican, omitelos.',
    'No inventes otros campos adicionales.',
    'Usa español de Perú.',
  ].join('\n')

  return {
    systemPrompt: mode === 'clarify' ? clarifySystemPrompt : recipeSystemPrompt,
    userPrefix: mode === 'clarify' ? 'Solicitud del usuario:' : 'Receta solicitada:',
  }
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

  let ctx
  try {
    ctx = await requireAuthenticatedServerContext(req)
  } catch (error) {
    sendJson(res, 401, { error: error instanceof Error ? error.message : 'No autenticado.' })
    return
  }

  const body = await readRequestBody(req)
  const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const userPrompt = buildStructuredUserPrompt(rawPrompt, body.context as RecipeContextDraft | null)
  const mode = body.mode === 'clarify' ? 'clarify' : 'generate'
  if (!userPrompt) {
    sendJson(res, 400, { error: 'Debes enviar un prompt para generar la receta.' })
    return
  }

  const settings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
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
  const promptText = `${systemPrompt}\n\n${userPrefix} ${userPrompt}`
  const usedMonthTokens = await getCurrentMonthTokenUsage(ctx.serviceClient, ctx.userId)

  if (settings.tokenBudgetMode === 'app_limit' && settings.monthlyTokenLimit) {
    const estimatedPromptTokens =
      provider === 'google_gemini' && googleApiKey
        ? await countGoogleTokens(googleApiKey, model, promptText)
        : 0

    if (usedMonthTokens >= settings.monthlyTokenLimit || usedMonthTokens + estimatedPromptTokens > settings.monthlyTokenLimit) {
      const remainingPercent = clampRemainingPercent(
        ((settings.monthlyTokenLimit - usedMonthTokens) / settings.monthlyTokenLimit) * 100,
      )
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

    sendJson(res, 200, {
      recipe: parsed,
      usage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar la receta.'
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
    sendJson(res, 502, { error: message })
  }
}
