import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash'
export const SUPPORTED_GOOGLE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
]

export type AIAuthMode = 'platform_key' | 'user_key'
export type AIBudgetMode = 'none' | 'app_limit' | 'cloud_budget'
export type AIKeyCheckStatus = 'unknown' | 'valid' | 'invalid'
export type AIProvider = 'google_gemini' | 'openai'
export type AIRequestKind = 'generate' | 'clarify' | 'validate'
export type AIRequestStatus = 'success' | 'failed' | 'blocked'

type ServiceClient = ReturnType<typeof createClient>

type DbAIProviderSettings = {
  user_id: string
  ai_provider: 'google_gemini'
  auth_mode: AIAuthMode
  google_model: string
  token_budget_mode: AIBudgetMode
  monthly_token_limit: number | null
  budget_amount: number | null
  is_key_configured: boolean
  key_last4: string | null
  last_key_check_at: string | null
  last_key_check_status: AIKeyCheckStatus
  last_key_check_error: string | null
}

type DbAIProviderSecret = {
  encrypted_key: string
  key_iv: string
  key_tag: string
}

type DbAIRequestUsage = {
  id: string
  provider: AIProvider
  model: string
  auth_mode: AIAuthMode
  request_kind: AIRequestKind
  request_status: AIRequestStatus
  prompt_token_count: number
  candidates_token_count: number
  total_token_count: number
  remaining_percent: number | null
  error_code: string | null
  error_message: string | null
  created_at: string
}

export type AIProviderSettingsResponse = {
  aiProvider: 'google_gemini'
  authMode: AIAuthMode
  googleModel: string
  tokenBudgetMode: AIBudgetMode
  monthlyTokenLimit: number | null
  budgetAmount: number | null
  isKeyConfigured: boolean
  keyLast4: string | null
  lastKeyCheckAt: string | null
  lastKeyCheckStatus: AIKeyCheckStatus
  lastKeyCheckError: string | null
  canUseUserKey: boolean
}

export type AIUsageRecordResponse = {
  id: string
  provider: AIProvider
  model: string
  authMode: AIAuthMode
  requestKind: AIRequestKind
  requestStatus: AIRequestStatus
  promptTokens: number
  outputTokens: number
  totalTokens: number
  remainingPercent: number | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
}

export type AIUsageSnapshotResponse = {
  budgetMode: AIBudgetMode
  monthlyTokenLimit: number | null
  budgetAmount: number | null
  currentMonthTokens: number
  currentMonthRequests: number
  avgTokensPerRequest: number
  lastRequestAt: string | null
  lastRequestTokens: number | null
  remainingPercent: number | null
  budgetStatusText: string
  recentRequests: AIUsageRecordResponse[]
}

export type AuthenticatedServerContext = {
  accessToken: string
  serviceClient: ServiceClient
  userId: string
}

export function sendJson(res: any, statusCode: number, payload: unknown): void {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload)
    return
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export async function readRequestBody(req: any): Promise<Record<string, unknown>> {
  if (req?.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>
  }

  if (typeof req?.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const text = Buffer.concat(chunks).toString('utf-8')
  if (!text.trim()) return {}
  return JSON.parse(text) as Record<string, unknown>
}

function supabaseServerConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    ''
  if (!url || !key) return null
  return { url, key }
}

export function createServiceClient(): ServiceClient {
  const cfg = supabaseServerConfig()
  if (!cfg) {
    throw new Error('Falta configuración server-side de Supabase.')
  }
  return createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function getBearerToken(req: any): string | null {
  const raw = req?.headers?.authorization || req?.headers?.Authorization
  if (typeof raw !== 'string') return null
  const match = raw.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function requireAuthenticatedServerContext(req: any): Promise<AuthenticatedServerContext> {
  const accessToken = getBearerToken(req)
  if (!accessToken) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  }

  const serviceClient = createServiceClient()
  const userResult = await serviceClient.auth.getUser(accessToken)
  const userId = userResult.data.user?.id
  if (userResult.error || !userId) {
    throw new Error('No se pudo validar la sesión del usuario.')
  }

  return {
    accessToken,
    serviceClient,
    userId,
  }
}

function encryptionKey(): Buffer {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY?.trim() || ''
  if (!secret) {
    throw new Error('Falta AI_CONFIG_ENCRYPTION_KEY para almacenar claves de usuario.')
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptApiKey(apiKey: string): { encryptedKey: string; iv: string; tag: string } {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    encryptedKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptApiKey(secret: DbAIProviderSecret): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(secret.key_iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(secret.key_tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secret.encrypted_key, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

function defaultSettings(): AIProviderSettingsResponse {
  return {
    aiProvider: 'google_gemini',
    authMode: 'platform_key',
    googleModel: DEFAULT_GOOGLE_MODEL,
    tokenBudgetMode: 'none',
    monthlyTokenLimit: null,
    budgetAmount: null,
    isKeyConfigured: false,
    keyLast4: null,
    lastKeyCheckAt: null,
    lastKeyCheckStatus: 'unknown',
    lastKeyCheckError: null,
    canUseUserKey: false,
  }
}

function mapSettings(row: DbAIProviderSettings | null): AIProviderSettingsResponse {
  if (!row) return defaultSettings()
  return {
    aiProvider: 'google_gemini',
    authMode: row.auth_mode,
    googleModel: row.google_model || DEFAULT_GOOGLE_MODEL,
    tokenBudgetMode: row.token_budget_mode,
    monthlyTokenLimit: row.monthly_token_limit,
    budgetAmount: row.budget_amount,
    isKeyConfigured: row.is_key_configured,
    keyLast4: row.key_last4,
    lastKeyCheckAt: row.last_key_check_at,
    lastKeyCheckStatus: row.last_key_check_status,
    lastKeyCheckError: row.last_key_check_error,
    canUseUserKey: Boolean(row.is_key_configured && row.last_key_check_status === 'valid'),
  }
}

export async function getAIProviderSettings(
  serviceClient: ServiceClient,
  userId: string,
): Promise<AIProviderSettingsResponse> {
  const result = await serviceClient
    .from('ai_provider_settings')
    .select(
      'user_id,ai_provider,auth_mode,google_model,token_budget_mode,monthly_token_limit,budget_amount,is_key_configured,key_last4,last_key_check_at,last_key_check_status,last_key_check_error',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (result.error) {
    throw result.error
  }

  return mapSettings((result.data ?? null) as DbAIProviderSettings | null)
}

export async function getStoredSecret(
  serviceClient: ServiceClient,
  userId: string,
): Promise<DbAIProviderSecret | null> {
  const result = await serviceClient
    .from('ai_provider_secrets')
    .select('encrypted_key,key_iv,key_tag')
    .eq('user_id', userId)
    .maybeSingle()

  if (result.error) {
    throw result.error
  }

  return (result.data ?? null) as DbAIProviderSecret | null
}

function currentMonthStartIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
}

export async function getAIUsageSnapshot(
  serviceClient: ServiceClient,
  userId: string,
  settings: AIProviderSettingsResponse,
): Promise<AIUsageSnapshotResponse> {
  const currentMonthStart = currentMonthStartIso()
  const [monthResult, recentResult] = await Promise.all([
    serviceClient
      .from('ai_request_usage')
      .select('total_token_count,request_status,created_at')
      .eq('user_id', userId)
      .gte('created_at', currentMonthStart),
    serviceClient
      .from('ai_request_usage')
      .select(
        'id,provider,model,auth_mode,request_kind,request_status,prompt_token_count,candidates_token_count,total_token_count,remaining_percent,error_code,error_message,created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  if (monthResult.error) throw monthResult.error
  if (recentResult.error) throw recentResult.error

  const monthRows = (monthResult.data ?? []) as Array<{
    total_token_count: number
    request_status: AIRequestStatus
    created_at: string
  }>
  const recentRows = (recentResult.data ?? []) as DbAIRequestUsage[]

  const successfulRows = monthRows.filter((row) => row.request_status === 'success')
  const currentMonthTokens = successfulRows.reduce((sum, row) => sum + (row.total_token_count || 0), 0)
  const currentMonthRequests = successfulRows.length
  const avgTokensPerRequest =
    currentMonthRequests > 0 ? Math.round(currentMonthTokens / currentMonthRequests) : 0
  const latest = recentRows[0] ?? null

  let remainingPercent: number | null = null
  let budgetStatusText = 'No hay límite configurado.'
  if (settings.tokenBudgetMode === 'app_limit' && settings.monthlyTokenLimit) {
    remainingPercent = Math.max(
      0,
      Math.min(100, Number((((settings.monthlyTokenLimit - currentMonthTokens) / settings.monthlyTokenLimit) * 100).toFixed(2))),
    )
    budgetStatusText = `${currentMonthTokens} / ${settings.monthlyTokenLimit} tokens consumidos este mes.`
  } else if (settings.tokenBudgetMode === 'cloud_budget') {
    budgetStatusText = 'El presupuesto cloud requiere integración externa; solo se muestra consumo local.'
  }

  return {
    budgetMode: settings.tokenBudgetMode,
    monthlyTokenLimit: settings.monthlyTokenLimit,
    budgetAmount: settings.budgetAmount,
    currentMonthTokens,
    currentMonthRequests,
    avgTokensPerRequest,
    lastRequestAt: latest?.created_at ?? null,
    lastRequestTokens: latest?.total_token_count ?? null,
    remainingPercent,
    budgetStatusText,
    recentRequests: recentRows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      authMode: row.auth_mode,
      requestKind: row.request_kind,
      requestStatus: row.request_status,
      promptTokens: row.prompt_token_count,
      outputTokens: row.candidates_token_count,
      totalTokens: row.total_token_count,
      remainingPercent: row.remaining_percent,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    })),
  }
}

export async function upsertAIProviderSettings(
  serviceClient: ServiceClient,
  userId: string,
  input: {
    authMode: AIAuthMode
    googleModel: string
    tokenBudgetMode: AIBudgetMode
    monthlyTokenLimit: number | null
    budgetAmount: number | null
  },
): Promise<void> {
  const payload = {
    user_id: userId,
    ai_provider: 'google_gemini',
    auth_mode: input.authMode,
    google_model: input.googleModel,
    token_budget_mode: input.tokenBudgetMode,
    monthly_token_limit: input.monthlyTokenLimit,
    budget_amount: input.budgetAmount,
    updated_at: new Date().toISOString(),
  }

  const result = await serviceClient.from('ai_provider_settings').upsert(payload, { onConflict: 'user_id' })
  if (result.error) throw result.error
}

export async function saveEncryptedApiKey(
  serviceClient: ServiceClient,
  userId: string,
  apiKey: string,
): Promise<void> {
  const encrypted = encryptApiKey(apiKey)
  const result = await serviceClient.from('ai_provider_secrets').upsert(
    {
      user_id: userId,
      ai_provider: 'google_gemini',
      encrypted_key: encrypted.encryptedKey,
      key_iv: encrypted.iv,
      key_tag: encrypted.tag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (result.error) throw result.error

  const settingsResult = await serviceClient.from('ai_provider_settings').upsert(
    {
      user_id: userId,
      ai_provider: 'google_gemini',
      is_key_configured: true,
      key_last4: apiKey.slice(-4),
      last_key_check_status: 'unknown',
      last_key_check_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (settingsResult.error) throw settingsResult.error
}

export async function deleteStoredApiKey(serviceClient: ServiceClient, userId: string): Promise<void> {
  const [secretResult, settingsResult] = await Promise.all([
    serviceClient.from('ai_provider_secrets').delete().eq('user_id', userId),
    serviceClient
      .from('ai_provider_settings')
      .upsert(
        {
          user_id: userId,
          ai_provider: 'google_gemini',
          auth_mode: 'platform_key',
          is_key_configured: false,
          key_last4: null,
          last_key_check_status: 'unknown',
          last_key_check_at: null,
          last_key_check_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      ),
  ])

  if (secretResult.error) throw secretResult.error
  if (settingsResult.error) throw settingsResult.error
}

export async function updateKeyValidationState(
  serviceClient: ServiceClient,
  userId: string,
  input: {
    status: AIKeyCheckStatus
    errorMessage: string | null
    apiKeyLast4?: string | null
    isKeyConfigured?: boolean
  },
): Promise<void> {
  const result = await serviceClient.from('ai_provider_settings').upsert(
    {
      user_id: userId,
      ai_provider: 'google_gemini',
      is_key_configured: input.isKeyConfigured ?? true,
      key_last4: input.apiKeyLast4 ?? null,
      last_key_check_at: new Date().toISOString(),
      last_key_check_status: input.status,
      last_key_check_error: input.errorMessage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (result.error) throw result.error
}

export async function validateGoogleApiKey(
  apiKey: string,
  model: string,
): Promise<{ promptTokens: number }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Valida esta API key para una app de recetas.' }],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || 'No se pudo validar la API key de Google.')
  }

  const payload = (await response.json()) as { totalTokens?: number }
  return { promptTokens: payload.totalTokens ?? 0 }
}

export async function logAIUsage(
  serviceClient: ServiceClient,
  userId: string,
  input: {
    provider: AIProvider
    model: string
    authMode: AIAuthMode
    requestKind: AIRequestKind
    requestStatus: AIRequestStatus
    promptTokens?: number
    outputTokens?: number
    totalTokens?: number
    budgetMode: AIBudgetMode
    remainingPercent?: number | null
    errorCode?: string | null
    errorMessage?: string | null
  },
): Promise<void> {
  const result = await serviceClient.from('ai_request_usage').insert({
    user_id: userId,
    provider: input.provider,
    model: input.model,
    auth_mode: input.authMode,
    request_kind: input.requestKind,
    request_status: input.requestStatus,
    prompt_token_count: input.promptTokens ?? 0,
    candidates_token_count: input.outputTokens ?? 0,
    total_token_count: input.totalTokens ?? 0,
    budget_mode: input.budgetMode,
    remaining_percent: input.remainingPercent ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
  })
  if (result.error) throw result.error
}

export async function getCurrentMonthTokenUsage(
  serviceClient: ServiceClient,
  userId: string,
): Promise<number> {
  const result = await serviceClient
    .from('ai_request_usage')
    .select('total_token_count,request_status')
    .eq('user_id', userId)
    .gte('created_at', currentMonthStartIso())

  if (result.error) throw result.error

  return (result.data ?? [])
    .filter((row) => row.request_status === 'success')
    .reduce((sum, row) => sum + Number(row.total_token_count ?? 0), 0)
}

export function clampRemainingPercent(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))))
}
