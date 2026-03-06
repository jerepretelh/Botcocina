import { isSupabaseEnabled, supabaseClient } from './supabaseClient';

export type ProductEventName =
  | 'home_open'
  | 'recipe_start'
  | 'step_next'
  | 'recipe_complete'
  | 'recipe_abandon'
  | 'resume_used';

let cachedSessionId: string | null = null;

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  const key = 'product_events_session_id';
  const existing = localStorage.getItem(key);
  if (existing) {
    cachedSessionId = existing;
    return existing;
  }
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  cachedSessionId = created;
  return created;
}

export async function trackProductEvent(
  userId: string | null | undefined,
  eventName: ProductEventName,
  payload?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseEnabled || !supabaseClient || !userId) return;
  await supabaseClient.from('product_events').insert({
    user_id: userId,
    session_id: getSessionId(),
    event_name: eventName,
    event_payload: payload ?? {},
  });
}

