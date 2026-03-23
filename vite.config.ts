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

const AI_RECIPE_ROUTE = '/api/ai/recipe'
const AI_CONFIG_ROUTE = '/api/ai/config'
const RECIPES_ROUTE = '/api/recipes'
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
