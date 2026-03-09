import {
  DEFAULT_GOOGLE_MODEL,
  SUPPORTED_GOOGLE_MODELS,
  getAIProviderSettings,
  getAIUsageSnapshot,
  getStoredSecret,
  logAIUsage,
  readRequestBody,
  requireAuthenticatedServerContext,
  saveEncryptedApiKey,
  sendJson,
  updateKeyValidationState,
  validateGoogleApiKey,
  decryptApiKey,
} from './shared'

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

  try {
    const body = await readRequestBody(req)
    const currentSettings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
    const model =
      typeof body.googleModel === 'string' && SUPPORTED_GOOGLE_MODELS.includes(body.googleModel)
        ? body.googleModel
        : currentSettings.googleModel || DEFAULT_GOOGLE_MODEL

    let apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
    if (!apiKey) {
      const storedSecret = await getStoredSecret(ctx.serviceClient, ctx.userId)
      if (!storedSecret) {
        sendJson(res, 400, { error: 'No hay una API key guardada para validar.' })
        return
      }
      apiKey = decryptApiKey(storedSecret)
    }

    const validation = await validateGoogleApiKey(apiKey, model)
    await saveEncryptedApiKey(ctx.serviceClient, ctx.userId, apiKey)
    await updateKeyValidationState(ctx.serviceClient, ctx.userId, {
      status: 'valid',
      errorMessage: null,
      apiKeyLast4: apiKey.slice(-4),
      isKeyConfigured: true,
    })
    await logAIUsage(ctx.serviceClient, ctx.userId, {
      provider: 'google_gemini',
      model,
      authMode: 'user_key',
      requestKind: 'validate',
      requestStatus: 'success',
      promptTokens: validation.promptTokens,
      outputTokens: 0,
      totalTokens: validation.promptTokens,
      budgetMode: currentSettings.tokenBudgetMode,
    })

    const settings = await getAIProviderSettings(ctx.serviceClient, ctx.userId)
    const usage = await getAIUsageSnapshot(ctx.serviceClient, ctx.userId, settings)
    sendJson(res, 200, {
      ok: true,
      message: 'API key validada correctamente.',
      settings,
      usage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo validar la API key.'
    await updateKeyValidationState(ctx.serviceClient, ctx.userId, {
      status: 'invalid',
      errorMessage: message,
    }).catch(() => {})
    await logAIUsage(ctx.serviceClient, ctx.userId, {
      provider: 'google_gemini',
      model: DEFAULT_GOOGLE_MODEL,
      authMode: 'user_key',
      requestKind: 'validate',
      requestStatus: 'failed',
      budgetMode: 'none',
      errorCode: 'validation_failed',
      errorMessage: message,
    }).catch(() => {})
    sendJson(res, 400, { error: message })
  }
}
