import type { AIProviderSettings, AIUsageSnapshot } from '../../types';
import { authenticatedJsonFetch } from './authenticatedApi';

export interface AISettingsResponse {
  settings: AIProviderSettings;
  usage: AIUsageSnapshot;
  supportedModels: string[];
}

export async function fetchAISettings(): Promise<AISettingsResponse> {
  return authenticatedJsonFetch<AISettingsResponse>('/api/ai/settings');
}

export async function updateAISettings(input: {
  authMode: AIProviderSettings['authMode'];
  googleModel: string;
  tokenBudgetMode: AIProviderSettings['tokenBudgetMode'];
  monthlyTokenLimit: number | null;
  budgetAmount: number | null;
}): Promise<AISettingsResponse> {
  return authenticatedJsonFetch<AISettingsResponse>('/api/ai/settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function validateStoredOrNewGoogleKey(input: {
  apiKey?: string;
  googleModel: string;
}): Promise<AISettingsResponse & { ok: boolean; message: string }> {
  return authenticatedJsonFetch<AISettingsResponse & { ok: boolean; message: string }>('/api/ai/validate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteStoredGoogleKey(): Promise<AISettingsResponse> {
  return authenticatedJsonFetch<AISettingsResponse>('/api/ai/settings', {
    method: 'DELETE',
  });
}
