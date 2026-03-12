import type { AIProviderSettings, AIUsageSnapshot } from '../../types';
import { authenticatedJsonFetch } from './authenticatedApi';

export interface AISettingsResponse {
  settings: AIProviderSettings;
  usage: AIUsageSnapshot;
  supportedModels: string[];
}

const DEFAULT_SETTINGS: AIProviderSettings = {
  aiProvider: 'google_gemini',
  authMode: 'platform_key',
  googleModel: 'gemini-2.5-flash',
  tokenBudgetMode: 'none',
  monthlyTokenLimit: null,
  budgetAmount: null,
  isKeyConfigured: false,
  keyLast4: null,
  lastKeyCheckAt: null,
  lastKeyCheckStatus: 'unknown',
  lastKeyCheckError: null,
  canUseUserKey: false,
};

const DEFAULT_USAGE: AIUsageSnapshot = {
  budgetMode: 'none',
  monthlyTokenLimit: null,
  budgetAmount: null,
  currentMonthTokens: 0,
  currentMonthRequests: 0,
  avgTokensPerRequest: 0,
  lastRequestAt: null,
  lastRequestTokens: null,
  remainingPercent: null,
  budgetStatusText: 'Sin datos disponibles.',
  recentRequests: [],
};

function normalizeSettingsResponse(payload: Partial<AISettingsResponse> | null | undefined): AISettingsResponse {
  return {
    settings: payload?.settings ? { ...DEFAULT_SETTINGS, ...payload.settings } : DEFAULT_SETTINGS,
    usage: payload?.usage ? { ...DEFAULT_USAGE, ...payload.usage } : DEFAULT_USAGE,
    supportedModels:
      Array.isArray(payload?.supportedModels) && payload.supportedModels.length > 0
        ? payload.supportedModels.filter((item): item is string => typeof item === 'string')
        : [DEFAULT_SETTINGS.googleModel],
  };
}

export async function fetchAISettings(): Promise<AISettingsResponse> {
  const payload = await authenticatedJsonFetch<Partial<AISettingsResponse> | null>('/api/ai/settings');
  return normalizeSettingsResponse(payload);
}

export async function updateAISettings(input: {
  authMode: AIProviderSettings['authMode'];
  googleModel: string;
  tokenBudgetMode: AIProviderSettings['tokenBudgetMode'];
  monthlyTokenLimit: number | null;
  budgetAmount: number | null;
}): Promise<AISettingsResponse> {
  const payload = await authenticatedJsonFetch<Partial<AISettingsResponse> | null>('/api/ai/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return normalizeSettingsResponse(payload);
}

export async function validateStoredOrNewGoogleKey(input: {
  apiKey?: string;
  googleModel: string;
}): Promise<AISettingsResponse & { ok: boolean; message: string }> {
  const payload = await authenticatedJsonFetch<Partial<AISettingsResponse> & { ok?: boolean; message?: string } | null>('/api/ai/validate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    ...normalizeSettingsResponse(payload),
    ok: payload?.ok ?? false,
    message: payload?.message ?? 'No se pudo validar la clave.',
  };
}

export async function deleteStoredGoogleKey(): Promise<AISettingsResponse> {
  const payload = await authenticatedJsonFetch<Partial<AISettingsResponse> | null>('/api/ai/settings', {
    method: 'DELETE',
  });
  return normalizeSettingsResponse(payload);
}
