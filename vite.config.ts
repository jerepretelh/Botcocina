import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { handleRecipesRequest } from './api/recipes/shared'
import {
  buildPreviewConversation,
  buildStructuredUserPrompt,
  promptConfig,
  type AIRecipeRequestMode,
  serializeApprovedPreRecipe,
} from './api/ai/recipePrompts'
import {
  buildFixedRuntimeSystemPrompt,
  inspectGeneratedFixedRecipe,
  normalizeGeneratedFixedRecipeWithDiagnostics,
} from './api/ai/fixedRecipeRuntime'
import {
  buildFixedRecipeJsonContractPrompt,
  validateFixedRecipeJson,
  type FixedRecipeSchemaValidation,
} from './api/ai/fixedRecipeSchema'

const AI_RECIPE_ROUTE = '/api/ai/recipe'
const AI_FIXED_RECIPE_ROUTE = '/api/ai/fixed-recipe'
const AI_CONFIG_ROUTE = '/api/ai/config'
const RECIPES_ROUTE = '/api/recipes'
const DEFAULT_PROVIDER_TIMEOUT_MS = 25_000
let localGoogleApiKey = ''
let localGoogleModel = ''
let localOpenAIApiKey = ''

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = resolveProviderTimeoutMs()): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`provider_timeout: El proveedor IA superó ${Math.round(timeoutMs / 1000)}s.`)
    }
    throw new Error(
      `provider_unavailable: ${
        error instanceof Error ? error.message : 'No se pudo conectar con el proveedor IA.'
      }`,
    )
  } finally {
    clearTimeout(timeout)
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (char === '\\') {
        escape = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function parseModelJsonContent(content: string): unknown {
  const direct = content.trim()
  try {
    return JSON.parse(direct)
  } catch {}

  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim()
  if (fenced) {
    try {
      return JSON.parse(fenced)
    } catch {}
  }

  const extracted = extractFirstJsonObject(direct)
  if (extracted) {
    try {
      return JSON.parse(extracted)
    } catch {}
  }

  throw new Error('No se pudo interpretar la respuesta de Google AI.')
}

type RecipeInvalidFeedback = {
  codes: string[]
  snippets: string[]
}

function parseRecipeInvalidFeedback(message: string): RecipeInvalidFeedback {
  const normalized = message.trim()
  if (!normalized.toLowerCase().startsWith('recipe_invalid')) {
    return { codes: [], snippets: [] }
  }
  const [, detail = ''] = normalized.split(':', 2)
  const [codesPart = '', snippetsPart = ''] = detail.split('::').map((part) => part.trim())
  const codes = codesPart
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const snippets = snippetsPart
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
  return { codes, snippets }
}

function buildRetryPrompt(userPrompt: string, feedback: RecipeInvalidFeedback): string {
  const codeLine = feedback.codes.length > 0 ? feedback.codes.join(', ') : 'SIN_CODIGOS'
  const snippetLine = feedback.snippets.length > 0 ? feedback.snippets.join(' | ') : 'SIN_SNIPPETS'
  return [
    userPrompt,
    '',
    'Corrección obligatoria para Runtime Fijo v2:',
    `Errores detectados: ${codeLine}`,
    `Fragmentos conflictivos: ${snippetLine}`,
    'Reglas obligatorias:',
    '- Convertir frases de estado (ej: "esten tiernos", "reduzca", "espese") en steps "Resultado: ...".',
    '- Usa acción explícita para mantener/sazonar/reincorporar.',
    '- No devolver UNKNOWN_STEP, ni texto truncado, ni resultados con acciones.',
    '- Mantener steps atómicos y JSON válido.',
  ].join('\n')
}

function buildSchemaRetryPrompt(
  userPrompt: string,
  schemaErrors: FixedRecipeSchemaValidation['errors'],
  parseError?: string,
): string {
  const compactErrors = schemaErrors
    .slice(0, 8)
    .map((error) => `${error.path} :: ${error.keyword} :: ${error.message}`)
    .join('\n')
  const parseLine = parseError ? `Parse error: ${parseError}` : 'Parse error: none'
  return [
    userPrompt,
    '',
    'Corrección obligatoria para salida JSON runtime:',
    '- Devuelve SOLO un JSON válido (sin markdown, sin texto extra).',
    '- Respeta exactamente el schema compartido.',
    '- Corrige los errores indicados.',
    parseLine,
    compactErrors ? `Schema errors:\n${compactErrors}` : 'Schema errors: none',
  ].join('\n')
}

const FIXED_PREVIEW_INSTRUCTIONS = [
  'Preview principal: JSON pre-normalización.',
  'No devuelvas texto libre ni markdown fuera del JSON.',
  'Debe cumplir exactamente el schema de cooking runtime recipe.',
]

type FixedGenerateCallResult = {
  rawText: string
  effectivePrompt: string
}

type JsonPipelineLayer = {
  rawModelOutput: string
  parsedJson: unknown | null
  schemaValidation: FixedRecipeSchemaValidation
  parseError?: string
  normalizedOutput?: unknown
  normalizationError?: string
}

function buildFixedJsonPrompt(userPrompt: string): string {
  return buildFixedRecipeJsonContractPrompt(buildFixedRuntimeSystemPrompt(userPrompt))
}

function buildJsonPipelineLayer(rawModelOutput: string, parsedJson: unknown | null, parseError?: string): JsonPipelineLayer {
  if (parsedJson == null) {
    return {
      rawModelOutput,
      parsedJson: null,
      parseError: parseError ?? 'No se pudo interpretar JSON.',
      schemaValidation: {
        valid: false,
        errors: [{ path: '/', message: parseError ?? 'Invalid JSON', keyword: 'parse' }],
      },
    }
  }

  const schemaValidation = validateFixedRecipeJson(parsedJson)
  return {
    rawModelOutput,
    parsedJson,
    schemaValidation,
  }
}

function classifyRecipePromptComplexity(prompt: string): 'simple' | 'complex' {
  const normalized = prompt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const complexHints = [
    'mientras',
    'al mismo tiempo',
    'por separado',
    'en otra olla',
    'en otra sarten',
    'reserva',
    'vuelve',
    'integra al final',
    'salsa',
    'guarnicion',
    'acompanamiento',
    'acompaña',
    'compuesta',
    'paralelo',
  ]

  const hitCount = complexHints.filter((hint) => normalized.includes(hint)).length
  return hitCount >= 2 ? 'complex' : 'simple'
}

async function handleAIRecipeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const googleApiKey = process.env.GOOGLE_API_KEY || localGoogleApiKey
  const openAIApiKey = process.env.OPENAI_API_KEY || localOpenAIApiKey
  if (!googleApiKey && !openAIApiKey) {
    sendJson(res, 500, {
      error: 'Falta GOOGLE_API_KEY (o OPENAI_API_KEY). Define una variable de entorno para usar recetas con IA.',
    })
    return
  }

  let userPrompt = ''
  let mode: AIRecipeRequestMode = 'generate'
  try {
    const bodyText = await readRequestBody(req)
    const body = bodyText ? (JSON.parse(bodyText) as { prompt?: string; mode?: string; context?: Record<string, unknown> | null; messages?: unknown[]; preRecipe?: unknown }) : {}
    userPrompt = buildStructuredUserPrompt(body.prompt?.trim() ?? '', body.context ?? null)
    mode = body.mode === 'preview' ? 'preview' : body.mode === 'clarify' ? 'clarify' : 'generate'
    if (mode === 'generate' && !body.preRecipe) {
      sendJson(res, 400, { error: 'Debes confirmar una prereceta antes de generar la receta final.' })
      return
    }
    const previewConversation = buildPreviewConversation(body.messages as never)
    const approvedPreRecipe = serializeApprovedPreRecipe(body.preRecipe as never)
    ;(req as IncomingMessage & {
      _aiPromptExtras?: { previewConversation: string; approvedPreRecipe: string }
    })._aiPromptExtras = { previewConversation, approvedPreRecipe }
  } catch {
    sendJson(res, 400, { error: 'Body JSON invalido.' })
    return
  }

  if (!userPrompt) {
    sendJson(res, 400, { error: 'Debes enviar un prompt para generar la receta.' })
    return
  }

  const recipeComplexity = classifyRecipePromptComplexity(userPrompt)
  const { systemPrompt, userPrefix: userMessagePrefix } = promptConfig(mode as AIRecipeRequestMode)
  const promptExtras = (req as IncomingMessage & {
    _aiPromptExtras?: { previewConversation: string; approvedPreRecipe: string }
  })._aiPromptExtras

  if (googleApiKey) {
    const configuredGoogleModel = (process.env.GOOGLE_MODEL?.trim() || localGoogleModel || '').trim()
    const fallbackGoogleModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ]
    const googleModels = configuredGoogleModel
      ? [configuredGoogleModel, ...fallbackGoogleModels.filter((model) => model !== configuredGoogleModel)]
      : fallbackGoogleModels

    let lastGoogleError = ''
    for (const model of googleModels) {
      const googleResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.5,
              responseMimeType: 'application/json',
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      systemPrompt,
                      `${userMessagePrefix} ${userPrompt}`,
                      promptExtras?.previewConversation ?? '',
                      promptExtras?.approvedPreRecipe ? `Prereceta aprobada:\n${promptExtras.approvedPreRecipe}` : '',
                    ].filter(Boolean).join('\n\n'),
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!googleResponse.ok) {
        lastGoogleError = await googleResponse.text()
        if (googleResponse.status === 404) {
          continue
        }
        sendJson(res, 502, { error: `Google AI error (${model}): ${lastGoogleError}` })
        return
      }

      try {
        const completion = (await googleResponse.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          usageMetadata?: {
            promptTokenCount?: number
            candidatesTokenCount?: number
            totalTokenCount?: number
          }
        }
        const content = completion.candidates?.[0]?.content?.parts?.[0]?.text
        if (!content) {
          sendJson(res, 502, { error: `Google AI no devolvio contenido (${model}).` })
          return
        }
        const parsed = JSON.parse(content)
        const usage = {
          provider: 'google_gemini',
          model,
          authMode: 'platform_key',
          promptTokens: completion.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: completion.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: completion.usageMetadata?.totalTokenCount ?? 0,
          budgetMode: 'none',
          remainingPercent: null,
          requestKind: mode,
        }
        sendJson(
          res,
          200,
          mode === 'clarify'
            ? {
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
              }
            : mode === 'preview'
              ? {
                  preRecipe: parsed,
                  usage,
                }
            : {
                recipe: {
                  ...(parsed as Record<string, unknown>),
                  complexity: recipeComplexity,
                },
                usage,
              },
        )
        return
      } catch {
        sendJson(res, 502, { error: `No se pudo interpretar la respuesta de Google AI (${model}).` })
        return
      }
    }

    sendJson(res, 502, {
      error: `Google AI error: no se encontro un modelo compatible. Detalle: ${lastGoogleError}`,
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
        { role: 'user', content: `${userMessagePrefix} ${userPrompt}` },
      ],
    }),
  })

  if (!openAIResponse.ok) {
    const detail = await openAIResponse.text()
    sendJson(res, 502, { error: `OpenAI error: ${detail}` })
    return
  }

  try {
    const completion = (await openAIResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      sendJson(res, 502, { error: 'OpenAI no devolvio contenido.' })
      return
    }
    const parsed = JSON.parse(content)
    const usage = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      authMode: 'platform_key',
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
      budgetMode: 'none',
      remainingPercent: null,
      requestKind: mode,
    }
    sendJson(
      res,
      200,
          mode === 'clarify'
            ? {
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
              }
        : mode === 'preview'
          ? {
              preRecipe: parsed,
              usage,
            }
        : {
            recipe: {
              ...(parsed as Record<string, unknown>),
              complexity: recipeComplexity,
            },
            usage,
          },
    )
  } catch {
    sendJson(res, 502, { error: 'No se pudo interpretar la respuesta de OpenAI.' })
  }
}

async function handleAIFixedRecipeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const googleApiKey = process.env.GOOGLE_API_KEY || localGoogleApiKey
  const openAIApiKey = process.env.OPENAI_API_KEY || localOpenAIApiKey
  if (!googleApiKey && !openAIApiKey) {
    sendJson(res, 500, {
      error: 'Falta GOOGLE_API_KEY (o OPENAI_API_KEY) para generar recetas con IA en runtime fijo.',
    })
    return
  }

  let userPrompt = ''
  let mode: 'generate' | 'preview' = 'generate'
  let wantsDebugRaw = false
  try {
    const bodyText = await readRequestBody(req)
    const body = bodyText ? (JSON.parse(bodyText) as { prompt?: string; mode?: string; debugRaw?: boolean }) : {}
    userPrompt = body.prompt?.trim() ?? ''
    mode = body.mode === 'preview' ? 'preview' : 'generate'
    wantsDebugRaw = Boolean(body.debugRaw)
  } catch {
    sendJson(res, 400, { error: 'Body JSON invalido.' })
    return
  }

  if (!userPrompt) {
    sendJson(res, 400, { error: 'Debes describir la receta que quieres generar.' })
    return
  }
  const debugRawEnabled = wantsDebugRaw && (process.env.NODE_ENV !== 'production' || process.env.FIXED_RUNTIME_DEBUG_RAW === '1')
  const sendProviderError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'provider_unavailable: No se pudo contactar al proveedor IA.'
    if (message.startsWith('provider_timeout')) {
      sendJson(res, 504, { error: message })
      return
    }
    if (message.startsWith('provider_unavailable')) {
      sendJson(res, 502, { error: message })
      return
    }
    sendJson(res, 502, { error: message })
  }

  const buildDebugRawAttempt = (
    attempt: 'first' | 'retry' | 'preview-shadow-generate',
    effectivePrompt: string,
    rawModelOutput: string,
    parsedPayload: unknown | null,
  ) => {
    if (parsedPayload == null) {
      return {
        attempt,
        promptEffective: effectivePrompt,
        rawModelOutput,
        inspectError: 'No se pudo inspeccionar payload pre-normalización porque el JSON no parseó.',
      }
    }
    try {
      const pipeline = inspectGeneratedFixedRecipe(parsedPayload, userPrompt)
      const topIssues = (Array.isArray((pipeline as { mergedAuditIssues?: unknown[] }).mergedAuditIssues)
        ? ((pipeline as { mergedAuditIssues?: Array<{ code?: string; text?: string; ingredientRef?: string }> }).mergedAuditIssues ?? [])
        : [])
        .slice(0, 5)
        .map((issue) => `${issue.code ?? 'ISSUE'}${issue.text ? `: ${issue.text}` : issue.ingredientRef ? `: ${issue.ingredientRef}` : ''}`)
      const topUnknownSnippets = (Array.isArray((pipeline as { unknownSteps?: unknown[] }).unknownSteps)
        ? ((pipeline as { unknownSteps?: Array<{ sourceText?: string }> }).unknownSteps ?? [])
        : [])
        .slice(0, 5)
        .map((item) => item.sourceText ?? '')
        .filter(Boolean)
      return {
        attempt,
        promptEffective: effectivePrompt,
        rawModelOutput,
        pipeline,
        snapshot: {
          topIssues,
          topUnknownSnippets,
        },
      }
    } catch (error) {
      return {
        attempt,
        promptEffective: effectivePrompt,
        rawModelOutput,
        inspectError: error instanceof Error ? error.message : 'No se pudo inspeccionar payload pre-normalización.',
      }
    }
  }

  const previewPrompt = buildFixedJsonPrompt(userPrompt)

  if (googleApiKey) {
    const effectivePrompt = mode === 'preview' ? previewPrompt : buildFixedJsonPrompt(userPrompt)
    let googleResponse: Response
    try {
      googleResponse = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.4,
              ...(mode === 'generate' ? { responseMimeType: 'application/json' } : {}),
            },
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      effectivePrompt,
                  },
                ],
              },
            ],
          }),
        },
      )
    } catch (error) {
      sendProviderError(error)
      return
    }

    if (!googleResponse.ok) {
      const detail = await googleResponse.text()
      if ((googleResponse.status === 429 || /RESOURCE_EXHAUSTED|\"code\":\s*429/i.test(detail)) && openAIApiKey) {
        // Fallback automático a OpenAI cuando Google está sin cuota.
      } else {
        sendJson(res, 502, { error: `Google AI error: ${detail}` })
        return
      }
    } else {
      try {
      const completion = (await googleResponse.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const content = completion.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) {
        sendJson(res, 502, { error: 'Google AI no devolvio contenido.' })
        return
      }

      if (mode === 'preview') {
        let parsedJson: unknown | null = null
        let parseError: string | undefined
        try {
          parsedJson = parseModelJsonContent(content)
        } catch (error) {
          parseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.'
        }
        const firstJsonPreview = buildJsonPipelineLayer(content, parsedJson, parseError)
        const debugAttempts: unknown[] = []
        if (debugRawEnabled) {
          debugAttempts.push(
            buildDebugRawAttempt('preview-shadow-generate', effectivePrompt, content, parsedJson),
          )
        }
        let jsonPreview = firstJsonPreview
        let retryApplied = false
        if (!firstJsonPreview.schemaValidation.valid || firstJsonPreview.parsedJson == null) {
          const schemaRetryPrompt = buildSchemaRetryPrompt(
            userPrompt,
            firstJsonPreview.schemaValidation.errors,
            firstJsonPreview.parseError,
          )
          const retryEffectivePrompt = buildFixedJsonPrompt(schemaRetryPrompt)
          let retryGoogleResponse: Response
          try {
            retryGoogleResponse = await fetchWithTimeout(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  generationConfig: {
                    temperature: 0.4,
                    responseMimeType: 'application/json',
                  },
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: retryEffectivePrompt }],
                    },
                  ],
                }),
              },
            )
          } catch (error) {
            sendProviderError(error)
            return
          }

          if (!retryGoogleResponse.ok) {
            const detail = await retryGoogleResponse.text()
            sendJson(res, 502, { error: `Google AI error (preview retry): ${detail}` })
            return
          }

          const retryCompletion = (await retryGoogleResponse.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          const retryContent = retryCompletion.candidates?.[0]?.content?.parts?.[0]?.text
          if (!retryContent) {
            sendJson(res, 502, { error: 'Google AI no devolvio contenido en preview retry.' })
            return
          }
          let retryParsedJson: unknown | null = null
          let retryParseError: string | undefined
          try {
            retryParsedJson = parseModelJsonContent(retryContent)
          } catch (error) {
            retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.'
          }
          jsonPreview = buildJsonPipelineLayer(retryContent, retryParsedJson, retryParseError)
          retryApplied = true
          if (debugRawEnabled) {
            debugAttempts.push(
              buildDebugRawAttempt('retry', retryEffectivePrompt, retryContent, retryParsedJson),
            )
          }
        }
        if (jsonPreview.schemaValidation.valid && jsonPreview.parsedJson != null) {
          try {
            const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(jsonPreview.parsedJson, userPrompt)
            jsonPreview.normalizedOutput = normalized.recipe
          } catch (error) {
            jsonPreview.normalizationError =
              error instanceof Error ? error.message : 'No se pudo normalizar la receta.'
          }
        }
        let debugRaw: unknown = undefined
        if (debugRawEnabled) {
          debugRaw = {
            enabled: true,
            attempts: debugAttempts,
          }
        }
        sendJson(res, 200, {
          jsonPreview,
          retryApplied,
          previewDebug: {
            instructions: FIXED_PREVIEW_INSTRUCTIONS,
            userPrompt,
            composedPromptForGoogle: effectivePrompt,
            generationContractTemplate: buildFixedRuntimeSystemPrompt(),
            generationContractEffective: effectivePrompt,
          },
          ...(debugRawEnabled ? { debugRaw } : {}),
          provider: 'google_gemini',
        })
        return
      }

      let parsed: unknown
      let parseError: string | undefined
      try {
        parsed = parseModelJsonContent(content)
      } catch (error) {
        parseError = error instanceof Error ? error.message : 'No se pudo interpretar la respuesta de Google AI.'
        const layer = buildJsonPipelineLayer(content, null, parseError)
        const firstDebugRaw = debugRawEnabled
          ? buildDebugRawAttempt('first', effectivePrompt, content, null)
          : null
        sendJson(res, 422, {
          error: 'parse_invalid',
          valid: false,
          errors: layer.schemaValidation.errors,
          rawModelOutput: layer.rawModelOutput,
          parsedJson: layer.parsedJson,
          ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
          provider: 'google_gemini',
        })
        return
      }
      const firstJsonLayer = buildJsonPipelineLayer(content, parsed, parseError)
      const firstDebugRaw = debugRawEnabled
        ? buildDebugRawAttempt('first', effectivePrompt, content, parsed)
        : null
      if (!firstJsonLayer.schemaValidation.valid) {
        sendJson(res, 422, {
          error: 'schema_invalid',
          valid: false,
          errors: firstJsonLayer.schemaValidation.errors,
          rawModelOutput: firstJsonLayer.rawModelOutput,
          parsedJson: firstJsonLayer.parsedJson,
          ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
          provider: 'google_gemini',
        })
        return
      }

      try {
        const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(parsed, userPrompt)
        sendJson(res, 200, {
          recipe: normalized.recipe,
          diagnostics: normalized.diagnostics,
          jsonPipeline: firstJsonLayer,
          ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
          provider: 'google_gemini',
        })
        return
      } catch (error) {
        const firstMessage = error instanceof Error ? error.message : 'La receta generada no cumple contrato runtime.'
        if (!firstMessage.toLowerCase().startsWith('recipe_invalid')) {
          sendJson(res, 422, { error: firstMessage })
          return
        }
        const feedback = parseRecipeInvalidFeedback(firstMessage)
        const retryPrompt = buildRetryPrompt(userPrompt, feedback)
        const retryEffectivePrompt = buildFixedJsonPrompt(retryPrompt)
        let retryGoogleResponse: Response
        try {
          retryGoogleResponse = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                generationConfig: {
                  temperature: 0.4,
                  responseMimeType: 'application/json',
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: retryEffectivePrompt }],
                  },
                ],
              }),
            },
          )
        } catch (error) {
          sendProviderError(error)
          return
        }

        if (!retryGoogleResponse.ok) {
          const detail = await retryGoogleResponse.text()
          sendJson(res, 502, { error: `Google AI error (retry): ${detail}` })
          return
        }

        let retryParsed: unknown
        let retryRawText = ''
        let retryParseError: string | undefined
        try {
          const retryCompletion = (await retryGoogleResponse.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
          }
          const retryContent = retryCompletion.candidates?.[0]?.content?.parts?.[0]?.text
          if (!retryContent) {
            sendJson(res, 502, { error: 'Google AI no devolvio contenido en reintento.' })
            return
          }
          retryRawText = retryContent
          retryParsed = parseModelJsonContent(retryContent)
        } catch (error) {
          retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar la respuesta de Google AI en reintento.'
          const retryLayer = buildJsonPipelineLayer(retryRawText, null, retryParseError)
          const retryDebugRaw = debugRawEnabled
            ? buildDebugRawAttempt('retry', retryEffectivePrompt, retryRawText, null)
            : null
          sendJson(res, 422, {
            error: `parse_invalid [retry_after: ${firstMessage}]`,
            valid: false,
            errors: retryLayer.schemaValidation.errors,
            rawModelOutput: retryLayer.rawModelOutput,
            parsedJson: retryLayer.parsedJson,
            ...(debugRawEnabled
              ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
              : {}),
            provider: 'google_gemini',
          })
          return
        }
        const retryJsonLayer = buildJsonPipelineLayer(retryRawText, retryParsed, retryParseError)
        const retryDebugRaw = debugRawEnabled
          ? buildDebugRawAttempt('retry', retryEffectivePrompt, retryRawText, retryParsed)
          : null
        if (!retryJsonLayer.schemaValidation.valid) {
          sendJson(res, 422, {
            error: `schema_invalid [retry_after: ${firstMessage}]`,
            valid: false,
            errors: retryJsonLayer.schemaValidation.errors,
            rawModelOutput: retryJsonLayer.rawModelOutput,
            parsedJson: retryJsonLayer.parsedJson,
            ...(debugRawEnabled
              ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
              : {}),
            provider: 'google_gemini',
          })
          return
        }

        try {
          const retryNormalized = normalizeGeneratedFixedRecipeWithDiagnostics(retryParsed, userPrompt)
          sendJson(res, 200, {
            recipe: retryNormalized.recipe,
            diagnostics: retryNormalized.diagnostics,
            jsonPipeline: retryJsonLayer,
            ...(debugRawEnabled
              ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
              : {}),
            provider: 'google_gemini',
          })
          return
        } catch (secondError) {
          const secondMessage = secondError instanceof Error ? secondError.message : 'La receta generada no cumple contrato runtime.'
          sendJson(res, 422, {
            error: `${secondMessage} [retry_after: ${firstMessage}]`,
            ...(debugRawEnabled
              ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
              : {}),
          })
          return
        }
      }
      } catch (error) {
        sendJson(res, 502, { error: error instanceof Error ? error.message : 'Google AI no devolvio una respuesta valida.' })
        return
      }
    }
  }

  const openAIEffectivePrompt =
    mode === 'preview' ? previewPrompt : buildFixedJsonPrompt(userPrompt)

  let openAIResponse: Response
  try {
    openAIResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        ...(mode === 'generate' ? { response_format: { type: 'json_object' as const } } : {}),
        messages: [
          { role: 'user', content: openAIEffectivePrompt },
        ],
      }),
    })
  } catch (error) {
    sendProviderError(error)
    return
  }

  if (!openAIResponse.ok) {
    const detail = await openAIResponse.text()
    sendJson(res, 502, { error: `OpenAI error: ${detail}` })
    return
  }

  try {
    const completion = (await openAIResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      sendJson(res, 502, { error: 'OpenAI no devolvio contenido.' })
      return
    }

    if (mode === 'preview') {
      let parsedJson: unknown | null = null
      let parseError: string | undefined
      try {
        parsedJson = parseModelJsonContent(content)
      } catch (error) {
        parseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.'
      }
      const firstJsonPreview = buildJsonPipelineLayer(content, parsedJson, parseError)
      const debugAttempts: unknown[] = []
      if (debugRawEnabled) {
        debugAttempts.push(
          buildDebugRawAttempt('preview-shadow-generate', openAIEffectivePrompt, content, parsedJson),
        )
      }
      let jsonPreview = firstJsonPreview
      let retryApplied = false
      if (!firstJsonPreview.schemaValidation.valid || firstJsonPreview.parsedJson == null) {
        const schemaRetryPrompt = buildSchemaRetryPrompt(
          userPrompt,
          firstJsonPreview.schemaValidation.errors,
          firstJsonPreview.parseError,
        )
        const retryEffectivePrompt = buildFixedJsonPrompt(schemaRetryPrompt)
        let retryOpenAIResponse: Response
        try {
          retryOpenAIResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.4,
              response_format: { type: 'json_object' as const },
              messages: [
                { role: 'user', content: retryEffectivePrompt },
              ],
            }),
          })
        } catch (error) {
          sendProviderError(error)
          return
        }

        if (!retryOpenAIResponse.ok) {
          const detail = await retryOpenAIResponse.text()
          sendJson(res, 502, { error: `OpenAI error (preview retry): ${detail}` })
          return
        }

        const retryCompletion = (await retryOpenAIResponse.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const retryContent = retryCompletion.choices?.[0]?.message?.content
        if (!retryContent) {
          sendJson(res, 502, { error: 'OpenAI no devolvio contenido en preview retry.' })
          return
        }
        let retryParsedJson: unknown | null = null
        let retryParseError: string | undefined
        try {
          retryParsedJson = parseModelJsonContent(retryContent)
        } catch (error) {
          retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.'
        }
        jsonPreview = buildJsonPipelineLayer(retryContent, retryParsedJson, retryParseError)
        retryApplied = true
        if (debugRawEnabled) {
          debugAttempts.push(
            buildDebugRawAttempt('retry', retryEffectivePrompt, retryContent, retryParsedJson),
          )
        }
      }
      if (jsonPreview.schemaValidation.valid && jsonPreview.parsedJson != null) {
        try {
          const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(jsonPreview.parsedJson, userPrompt)
          jsonPreview.normalizedOutput = normalized.recipe
        } catch (error) {
          jsonPreview.normalizationError =
            error instanceof Error ? error.message : 'No se pudo normalizar la receta.'
        }
      }
      let debugRaw: unknown = undefined
      if (debugRawEnabled) {
        debugRaw = {
          enabled: true,
          attempts: debugAttempts,
        }
      }
      sendJson(res, 200, {
        jsonPreview,
        retryApplied,
        previewDebug: {
          instructions: FIXED_PREVIEW_INSTRUCTIONS,
          userPrompt,
          composedPromptForGoogle: openAIEffectivePrompt,
          generationContractTemplate: buildFixedRuntimeSystemPrompt(),
          generationContractEffective: openAIEffectivePrompt,
        },
        ...(debugRawEnabled ? { debugRaw } : {}),
        provider: 'openai',
      })
      return
    }

    let parsed: unknown
    let parseError: string | undefined
    try {
      parsed = parseModelJsonContent(content)
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'No se pudo interpretar la respuesta de OpenAI.'
      const layer = buildJsonPipelineLayer(content, null, parseError)
      const firstDebugRaw = debugRawEnabled
        ? buildDebugRawAttempt('first', openAIEffectivePrompt, content, null)
        : null
      sendJson(res, 422, {
        error: 'parse_invalid',
        valid: false,
        errors: layer.schemaValidation.errors,
        rawModelOutput: layer.rawModelOutput,
        parsedJson: layer.parsedJson,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
        provider: 'openai',
      })
      return
    }
    const firstJsonLayer = buildJsonPipelineLayer(content, parsed, parseError)
    const firstDebugRaw = debugRawEnabled
      ? buildDebugRawAttempt('first', openAIEffectivePrompt, content, parsed)
      : null
    if (!firstJsonLayer.schemaValidation.valid) {
      sendJson(res, 422, {
        error: 'schema_invalid',
        valid: false,
        errors: firstJsonLayer.schemaValidation.errors,
        rawModelOutput: firstJsonLayer.rawModelOutput,
        parsedJson: firstJsonLayer.parsedJson,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
        provider: 'openai',
      })
      return
    }

    try {
      const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(parsed, userPrompt)
      sendJson(res, 200, {
        recipe: normalized.recipe,
        diagnostics: normalized.diagnostics,
        jsonPipeline: firstJsonLayer,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: firstDebugRaw ? [firstDebugRaw] : [] } } : {}),
        provider: 'openai',
      })
      return
    } catch (error) {
      const firstMessage = error instanceof Error ? error.message : 'La receta generada no cumple contrato runtime.'
      if (!firstMessage.toLowerCase().startsWith('recipe_invalid')) {
        sendJson(res, 422, { error: firstMessage })
        return
      }
      const feedback = parseRecipeInvalidFeedback(firstMessage)
      const retryPrompt = buildRetryPrompt(userPrompt, feedback)
      const retryEffectivePrompt = buildFixedJsonPrompt(retryPrompt)
      let retryOpenAIResponse: Response
      try {
        retryOpenAIResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'user', content: retryEffectivePrompt },
            ],
          }),
        })
      } catch (error) {
        sendProviderError(error)
        return
      }

      if (!retryOpenAIResponse.ok) {
        const detail = await retryOpenAIResponse.text()
        sendJson(res, 502, { error: `OpenAI error (retry): ${detail}` })
        return
      }

      let retryParsed: unknown
      let retryRawText = ''
      let retryParseError: string | undefined
      try {
        const retryCompletion = (await retryOpenAIResponse.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const retryContent = retryCompletion.choices?.[0]?.message?.content
        if (!retryContent) {
          sendJson(res, 502, { error: 'OpenAI no devolvio contenido en reintento.' })
          return
        }
        retryRawText = retryContent
        retryParsed = parseModelJsonContent(retryContent)
      } catch (error) {
        retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar la respuesta de OpenAI en reintento.'
        const retryLayer = buildJsonPipelineLayer(retryRawText, null, retryParseError)
        const retryDebugRaw = debugRawEnabled
          ? buildDebugRawAttempt('retry', retryEffectivePrompt, retryRawText, null)
          : null
        sendJson(res, 422, {
          error: `parse_invalid [retry_after: ${firstMessage}]`,
          valid: false,
          errors: retryLayer.schemaValidation.errors,
          rawModelOutput: retryLayer.rawModelOutput,
          parsedJson: retryLayer.parsedJson,
          ...(debugRawEnabled
            ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
            : {}),
          provider: 'openai',
        })
        return
      }
      const retryJsonLayer = buildJsonPipelineLayer(retryRawText, retryParsed, retryParseError)
      const retryDebugRaw = debugRawEnabled
        ? buildDebugRawAttempt('retry', retryEffectivePrompt, retryRawText, retryParsed)
        : null
      if (!retryJsonLayer.schemaValidation.valid) {
        sendJson(res, 422, {
          error: `schema_invalid [retry_after: ${firstMessage}]`,
          valid: false,
          errors: retryJsonLayer.schemaValidation.errors,
          rawModelOutput: retryJsonLayer.rawModelOutput,
          parsedJson: retryJsonLayer.parsedJson,
          ...(debugRawEnabled
            ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
            : {}),
          provider: 'openai',
        })
        return
      }

      try {
        const retryNormalized = normalizeGeneratedFixedRecipeWithDiagnostics(retryParsed, userPrompt)
        sendJson(res, 200, {
          recipe: retryNormalized.recipe,
          diagnostics: retryNormalized.diagnostics,
          jsonPipeline: retryJsonLayer,
          ...(debugRawEnabled
            ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
            : {}),
          provider: 'openai',
        })
        return
      } catch (secondError) {
        const secondMessage = secondError instanceof Error ? secondError.message : 'La receta generada no cumple contrato runtime.'
        sendJson(res, 422, {
          error: `${secondMessage} [retry_after: ${firstMessage}]`,
          ...(debugRawEnabled
            ? { debugRaw: { enabled: true, attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean) } }
            : {}),
        })
        return
      }
    }
  } catch (error) {
    sendJson(res, 502, { error: error instanceof Error ? error.message : 'OpenAI no devolvio una respuesta valida.' })
  }
}

async function handleAIConfigRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      hasGoogleApiKey: Boolean(process.env.GOOGLE_API_KEY || localGoogleApiKey),
      googleModel: process.env.GOOGLE_MODEL?.trim() || localGoogleModel || undefined,
      hasOpenAIApiKey: Boolean(process.env.OPENAI_API_KEY || localOpenAIApiKey),
    })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const bodyText = await readRequestBody(req)
    const body = bodyText
      ? (JSON.parse(bodyText) as { googleApiKey?: string; googleModel?: string; openAIApiKey?: string })
      : {}

    if (typeof body.googleApiKey === 'string') {
      localGoogleApiKey = body.googleApiKey.trim()
    }
    if (typeof body.googleModel === 'string') {
      localGoogleModel = body.googleModel.trim()
    }
    if (typeof body.openAIApiKey === 'string') {
      localOpenAIApiKey = body.openAIApiKey.trim()
    }

    sendJson(res, 200, {
      ok: true,
      hasGoogleApiKey: Boolean(process.env.GOOGLE_API_KEY || localGoogleApiKey),
      googleModel: process.env.GOOGLE_MODEL?.trim() || localGoogleModel || undefined,
      hasOpenAIApiKey: Boolean(process.env.OPENAI_API_KEY || localOpenAIApiKey),
    })
  } catch {
    sendJson(res, 400, { error: 'Body JSON invalido.' })
  }
}

function aiRecipeApiPlugin(): Plugin {
  const middleware = (
    req: IncomingMessage & { url?: string },
    res: ServerResponse,
    next: () => void,
  ) => {
    if (!req.url) {
      next()
      return
    }

    if (req.url.startsWith(AI_RECIPE_ROUTE)) {
      void handleAIRecipeRequest(req, res)
      return
    }

    if (req.url.startsWith(AI_FIXED_RECIPE_ROUTE)) {
      void handleAIFixedRecipeRequest(req, res)
      return
    }

    if (req.url.startsWith(AI_CONFIG_ROUTE)) {
      void handleAIConfigRequest(req, res)
      return
    }

    if (req.url.startsWith(RECIPES_ROUTE)) {
      void handleRecipesRequest(req, res)
      return
    }

    next()
    return

  }

  return {
    name: 'ai-recipe-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }

  const vercelEnvironment = (process.env.VERCEL_ENV || '').trim().toLowerCase()
  const appEnvironment =
    mode === 'development'
      ? 'development'
      : vercelEnvironment === 'preview'
        ? 'preview'
        : 'production'

  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __APP_METADATA__: JSON.stringify({
        version: process.env.npm_package_version || '0.0.0',
        environment: appEnvironment,
      }),
      __SUPABASE_CLIENT_CONFIG__: JSON.stringify({
        enabled: (env.VITE_SUPABASE_ENABLED ?? 'false').trim().toLowerCase() === 'true',
        url: env.VITE_SUPABASE_URL?.trim() ?? '',
        anonKey: env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
      }),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('/@supabase/')) return 'vendor-supabase'
            if (
              id.includes('/@radix-ui/') ||
              id.includes('/lucide-react/') ||
              id.includes('/class-variance-authority/') ||
              id.includes('/clsx/') ||
              id.includes('/tailwind-merge/')
            ) {
              return 'vendor-ui-heavy'
            }
            return 'vendor'
          },
        },
      },
    },
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      aiRecipeApiPlugin(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
function resolveProviderTimeoutMs(): number {
  const raw = process.env.FIXED_RUNTIME_PROVIDER_TIMEOUT_MS
  if (!raw) return DEFAULT_PROVIDER_TIMEOUT_MS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 5_000) return DEFAULT_PROVIDER_TIMEOUT_MS
  return parsed
}
