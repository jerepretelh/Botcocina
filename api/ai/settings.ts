import {
  DEFAULT_GOOGLE_MODEL,
  SUPPORTED_GOOGLE_MODELS,
  deleteStoredApiKey,
  getAIProviderSettings,
  getAIUsageSnapshot,
  readRequestBody,
  requireAuthenticatedServerContext,
  sendJson,
  upsertAIProviderSettings,
} from './shared.js'

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Los límites deben ser números positivos.')
  }
  return Math.round(parsed)
}

function normalizeNullableDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Los presupuestos deben ser números positivos.')
  }
  return Number(parsed.toFixed(2))
}

export default async function handler(req: any, res: any): Promise<void> {
  let ctx
  try {
    ctx = await requireAuthenticatedServerContext(req)
  } catch (error) {
    sendJson(res, 401, { error: error instanceof Error ? error.message : 'No autenticado.' })
    return
  }

  try {
    if (req.method === 'GET') {
      const settings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
      const usage = await getAIUsageSnapshot(ctx.serviceClient, ctx.userId, settings)
      sendJson(res, 200, {
        settings,
        usage,
        supportedModels: SUPPORTED_GOOGLE_MODELS,
      })
      return
    }

    if (req.method === 'PUT') {
      const body = await readRequestBody(req)
      const authMode = body.authMode === 'user_key' ? 'user_key' : 'platform_key'
      const googleModel =
        typeof body.googleModel === 'string' && SUPPORTED_GOOGLE_MODELS.includes(body.googleModel)
          ? body.googleModel
          : DEFAULT_GOOGLE_MODEL
      const tokenBudgetMode =
        body.tokenBudgetMode === 'app_limit' || body.tokenBudgetMode === 'cloud_budget'
          ? body.tokenBudgetMode
          : 'none'
      const monthlyTokenLimit = normalizeNullableNumber(body.monthlyTokenLimit)
      const budgetAmount = normalizeNullableDecimal(body.budgetAmount)
      const current = await getAIProviderSettings(ctx.serviceClient, ctx.userId)

      if (authMode === 'user_key' && !current.canUseUserKey) {
        sendJson(res, 400, {
          error: 'Primero valida y guarda una API key propia antes de activarla.',
        })
        return
      }

      await upsertAIProviderSettings(ctx.serviceClient, ctx.userId, {
        authMode,
        googleModel,
        tokenBudgetMode,
        monthlyTokenLimit,
        budgetAmount,
      })

      const settings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
      const usage = await getAIUsageSnapshot(ctx.serviceClient, ctx.userId, settings)
      sendJson(res, 200, {
        settings,
        usage,
        supportedModels: SUPPORTED_GOOGLE_MODELS,
      })
      return
    }

    if (req.method === 'DELETE') {
      await deleteStoredApiKey(ctx.serviceClient, ctx.userId)
      const settings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
      const usage = await getAIUsageSnapshot(ctx.serviceClient, ctx.userId, settings)
      sendJson(res, 200, {
        settings,
        usage,
        supportedModels: SUPPORTED_GOOGLE_MODELS,
      })
      return
    }

    sendJson(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'No se pudo gestionar la configuración IA.' })
  }
}
