const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';

export function getPlaywrightBaseUrl(): string {
  return (process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
}

export function isLocalPlaywrightTarget(baseUrl = getPlaywrightBaseUrl()): boolean {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return baseUrl.startsWith('http://127.0.0.1') || baseUrl.startsWith('http://localhost');
  }
}

export function isProductionLikePlaywrightTarget(baseUrl = getPlaywrightBaseUrl()): boolean {
  return !isLocalPlaywrightTarget(baseUrl);
}

