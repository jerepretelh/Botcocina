import { supabaseClient } from './supabaseClient';

async function getAccessToken(): Promise<string> {
  if (!supabaseClient) {
    throw new Error('Supabase Auth no está disponible.');
  }

  const sessionResult = await supabaseClient.auth.getSession();
  const token = sessionResult.data.session?.access_token;
  if (!token) {
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  return token;
}

export async function authenticatedJsonFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'No se pudo completar la solicitud autenticada.';
    throw new Error(message);
  }

  return payload as T;
}
