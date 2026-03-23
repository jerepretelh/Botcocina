import type { Screen } from '../../../../types';

export type ThermomixScreenDomain = 'library' | 'planning' | 'cooking';

export function resolveThermomixScreenDomain(screen: Screen): ThermomixScreenDomain {
  if (screen === 'weekly-plan' || screen === 'shopping-list') return 'planning';
  if (screen === 'ai-clarify' || screen === 'cooking') return 'cooking';
  return 'library';
}
