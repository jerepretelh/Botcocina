import type {
  CookingPresentationCompletionMessage,
  CookingPresentationIntent,
  CookingPresentationNextStepPreview,
} from '../../types/cooking-presentation-v2';

export function formatMinutesApprox(seconds: number | null | undefined) {
  if (!(typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0)) return null;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} min aprox`;
}

export function buildNextStepPreview(args: {
  title?: string | null;
  durationSeconds?: number | null;
  displayValue?: string | number | null;
  componentName?: string | null;
}): CookingPresentationNextStepPreview | null {
  const title = args.title?.trim();
  if (!title) return null;

  const detail = formatMinutesApprox(args.durationSeconds)
    ?? (args.displayValue != null ? String(args.displayValue) : null);

  return {
    title,
    detail,
    componentName: args.componentName ?? null,
  };
}

export function buildCompletionMessage(args: {
  recipeName?: string | null;
  body: string;
  summary?: string | null;
}): CookingPresentationCompletionMessage {
  return {
    title: `Listo, quedó tu ${args.recipeName?.trim() || 'receta'}`,
    body: args.body,
    summary: args.summary ?? null,
  };
}

export function resolveCtaLabel(intent: CookingPresentationIntent, componentName?: string | null) {
  switch (intent) {
    case 'start_timer':
      return 'Reanudar';
    case 'start_and_continue':
      return 'Iniciar y continuar';
    case 'switch_front':
      return componentName ? `Ir al frente de ${componentName}` : 'Ir al siguiente frente';
    case 'next_batch':
      return 'Hacer siguiente tanda';
    case 'finish':
      return 'Terminar receta';
    case 'continue':
    default:
      return 'Continuar receta';
  }
}
