import type { CompoundRecipeComponent, CompoundRecipeMeta, CompoundTimelineItem, RecipeContent, RecipeExperience } from '../../types';
import { normalizeText } from '../utils/recipeHelpers';

const COMPONENT_PATTERNS: Array<{
  id: string;
  name: string;
  icon: string;
  summary: string;
  keywords: string[];
}> = [
  { id: 'pasta', name: 'Pasta', icon: '🍝', summary: 'Cocción y acabado', keywords: ['pasta', 'tallarin', 'tallarines', 'fideo', 'espagueti', 'spaghetti', 'macarron', 'penne'] },
  { id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base y reducción', keywords: ['salsa', 'tomate', 'ragu', 'ragu', 'ragú'] },
  { id: 'arroz', name: 'Arroz', icon: '🍚', summary: 'Cocción y graneado', keywords: ['arroz'] },
  { id: 'lentejas', name: 'Lentejas', icon: '🫘', summary: 'Cocción y punto final', keywords: ['lenteja', 'lentejas'] },
  { id: 'sofrito', name: 'Sofrito', icon: '🧄', summary: 'Base aromática', keywords: ['sofrito', 'cebolla', 'ajo'] },
  { id: 'papas', name: 'Papas', icon: '🥔', summary: 'Cocción y acabado', keywords: ['papa', 'papas', 'camote', 'camotes'] },
  { id: 'pollo', name: 'Pollo', icon: '🍗', summary: 'Cocción principal', keywords: ['pollo'] },
  { id: 'caldo', name: 'Caldo', icon: '🍲', summary: 'Base líquida', keywords: ['caldo', 'sopa', 'hervir agua', 'agua caliente'] },
];

const PARALLEL_HINTS = [
  'mientras',
  'al mismo tiempo',
  'en otra olla',
  'en otra sarten',
  'reserva',
  'vuelve',
  'integra al final',
  'por separado',
];

const AUTO_ADVANCE_TIMER_HINTS = [
  'herv',
  'cocci',
  'cocina',
  'reduc',
  'repos',
  'horne',
  'descans',
  'deja',
];

function findComponentPattern(text: string): typeof COMPONENT_PATTERNS[number] | null {
  const normalized = normalizeText(text);
  for (const pattern of COMPONENT_PATTERNS) {
    if (pattern.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return pattern;
    }
  }
  return null;
}

function buildTimelineItemId(stepIndex: number, subStepIndex: number, componentId: string) {
  return `cmp-${componentId}-${stepIndex + 1}-${subStepIndex + 1}`;
}

function buildTimerLabel(subStepName: string, componentName: string) {
  const normalized = normalizeText(subStepName);
  if (normalized.includes('herv')) return `${componentName} hirviendo`;
  if (normalized.includes('reduc')) return `Reducción ${componentName.toLowerCase()}`;
  if (normalized.includes('repos')) return `Reposo ${componentName.toLowerCase()}`;
  if (normalized.includes('sofrit')) return 'Sofrito';
  return subStepName;
}

function buildBackgroundHint(subStepName: string, componentName: string) {
  const normalized = normalizeText(subStepName);
  if (normalized.includes('herv')) return `${componentName} sigue en curso. Avanza con el siguiente frente.`;
  if (normalized.includes('reduc')) return `${componentName} sigue reduciendo. Continúa con el resto de la receta.`;
  if (normalized.includes('repos')) return `${componentName} está reposando. Puedes seguir con el cierre.`;
  return `${componentName} sigue en curso mientras avanzas en otro frente.`;
}

function buildCompletionMessage(componentName: string) {
  return `${componentName} ya quedó listo.`;
}

function isAutoAdvanceTimer(text: string) {
  const normalized = normalizeText(text);
  return AUTO_ADVANCE_TIMER_HINTS.some((hint) => normalized.includes(hint));
}

export function validateCompoundMeta(content: RecipeContent, compoundMeta: CompoundRecipeMeta | null | undefined): compoundMeta is CompoundRecipeMeta {
  if (!compoundMeta) return false;
  if (!Array.isArray(compoundMeta.components) || compoundMeta.components.length < 2) return false;
  if (!Array.isArray(compoundMeta.timeline) || compoundMeta.timeline.length === 0) return false;

  const componentIds = new Set(compoundMeta.components.map((component) => component.id));
  if (componentIds.size !== compoundMeta.components.length) return false;

  return compoundMeta.timeline.every((item) => {
    if (!componentIds.has(item.componentId)) return false;
    const step = content.steps[item.stepIndex];
    const subStep = step?.subSteps[item.subStepIndex];
    return Boolean(step && subStep);
  });
}

export function detectCompoundRecipeCandidate(content: RecipeContent): CompoundRecipeMeta | null {
  if (!content.steps.length) return null;

  const timeline: CompoundTimelineItem[] = [];
  const usedComponents = new Map<string, CompoundRecipeComponent>();
  let lastComponentId: string | null = null;
  let timerCount = 0;
  let parallelSignalCount = 0;

  content.steps.forEach((step, stepIndex) => {
    const stepText = `${step.stepName} ${step.subSteps.map((subStep) => `${subStep.subStepName} ${subStep.notes}`).join(' ')}`;
    const stepComponent = findComponentPattern(stepText);

    step.subSteps.forEach((subStep, subStepIndex) => {
      const subStepText = `${subStep.subStepName} ${subStep.notes}`;
      const detectedComponent = findComponentPattern(subStepText) ?? stepComponent;
      const effectiveComponent = detectedComponent ?? (lastComponentId ? usedComponents.get(lastComponentId) ?? null : null);

      if (!effectiveComponent) return;

      usedComponents.set(effectiveComponent.id, {
        id: effectiveComponent.id,
        name: effectiveComponent.name,
        icon: effectiveComponent.icon,
        summary: effectiveComponent.summary,
      });
      lastComponentId = effectiveComponent.id;

      if (subStep.isTimer) timerCount += 1;
      if (PARALLEL_HINTS.some((hint) => normalizeText(subStepText).includes(normalizeText(hint)))) {
        parallelSignalCount += 1;
      }

      timeline.push({
        id: buildTimelineItemId(stepIndex, subStepIndex, effectiveComponent.id),
        componentId: effectiveComponent.id,
        stepIndex,
        subStepIndex,
        timerLabel: subStep.isTimer ? buildTimerLabel(subStep.subStepName, effectiveComponent.name) : undefined,
        autoAdvanceOnStart: subStep.isTimer ? isAutoAdvanceTimer(subStepText) : undefined,
        completionMessage: subStep.isTimer ? buildCompletionMessage(effectiveComponent.name) : undefined,
        backgroundHint: subStep.isTimer ? buildBackgroundHint(subStep.subStepName, effectiveComponent.name) : undefined,
      });
    });
  });

  const components = [...usedComponents.values()];
  const hasEnoughStructure = components.length >= 2 && timeline.length >= 4;
  const hasParallelSignals = timerCount >= 2 || parallelSignalCount >= 1;

  if (!hasEnoughStructure || !hasParallelSignals) return null;

  const compoundMeta: CompoundRecipeMeta = {
    components,
    timeline,
  };

  return validateCompoundMeta(content, compoundMeta) ? compoundMeta : null;
}

export function resolveCompoundExperience(content: RecipeContent): {
  experience?: RecipeExperience;
  compoundMeta?: CompoundRecipeMeta;
} {
  const detected = detectCompoundRecipeCandidate(content);
  if (!detected) return {};
  return {
    experience: 'compound',
    compoundMeta: detected,
  };
}

export function coercePersistedCompoundRecipe(args: {
  experience?: unknown;
  compoundMeta?: unknown;
  content: RecipeContent;
}): {
  experience?: RecipeExperience;
  compoundMeta?: CompoundRecipeMeta;
} {
  const nextExperience = args.experience === 'compound' ? 'compound' : undefined;
  if (!nextExperience || !validateCompoundMeta(args.content, args.compoundMeta as CompoundRecipeMeta | undefined)) {
    return {};
  }
  return {
    experience: 'compound',
    compoundMeta: args.compoundMeta as CompoundRecipeMeta,
  };
}
