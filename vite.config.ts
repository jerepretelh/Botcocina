import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { handleRecipesRequest } from './api/recipes/shared'

const AI_RECIPE_ROUTE = '/api/ai/recipe'
const AI_CONFIG_ROUTE = '/api/ai/config'
const RECIPES_ROUTE = '/api/recipes'
let localGoogleApiKey = ''
let localGoogleModel = ''
let localOpenAIApiKey = ''

type RecipeContextDraft = {
  prompt?: unknown
  servings?: unknown
  availableIngredients?: unknown
  avoidIngredients?: unknown
}

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
  let mode: 'generate' | 'clarify' = 'generate'
  try {
    const bodyText = await readRequestBody(req)
    const body = bodyText ? (JSON.parse(bodyText) as { prompt?: string; mode?: string; context?: RecipeContextDraft | null }) : {}
    userPrompt = buildStructuredUserPrompt(body.prompt?.trim() ?? '', body.context ?? null)
    mode = body.mode === 'clarify' ? 'clarify' : 'generate'
  } catch {
    sendJson(res, 400, { error: 'Body JSON invalido.' })
    return
  }

  if (!userPrompt) {
    sendJson(res, 400, { error: 'Debes enviar un prompt para generar la receta.' })
    return
  }

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
    'No inventes campos adicionales.',
    'Usa español de Perú.',
  ].join('\n')
  const systemPrompt = mode === 'clarify' ? clarifySystemPrompt : recipeSystemPrompt
  const userMessagePrefix = mode === 'clarify' ? 'Solicitud del usuario:' : 'Receta solicitada:'

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
                    text: `${systemPrompt}\n\n${userMessagePrefix} ${userPrompt}`,
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
            : {
                recipe: parsed,
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
        : {
            recipe: parsed,
            usage,
          },
    )
  } catch {
    sendJson(res, 502, { error: 'No se pudo interpretar la respuesta de OpenAI.' })
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
