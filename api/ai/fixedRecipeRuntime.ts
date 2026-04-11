type FixedStep = {
  id: string;
  text: string;
  timer?: number;
  type?: 'result';
};

type FixedPhase = {
  id: string;
  number: string;
  title: string;
  emoji?: string;
  steps: FixedStep[];
};

export type NormalizedFixedRecipe = {
  id: string;
  title: string;
  servings: number;
  ingredients: Array<{ title: string; icon?: string; items: string[] }>;
  phases: FixedPhase[];
};

export type FixedRuntimeDiagnostics = {
  severity: 'ok' | 'warning' | 'invalid';
  recoverableCount: number;
  fatalCount: number;
  codes: string[];
  repairActions: string[];
};

type RawRecipeDocument = {
  id: string;
  title: string;
  servings: number;
  ingredients: Array<{ title: string; icon?: string; items: string[] }>;
  phases: Array<{ id: string; number: string; title: string; emoji?: string; steps: Array<{ id: string; text: string; timer?: number; type?: 'result' }> }>;
};

type ParsedStep =
  | {
      kind: 'prep';
      sourceText: string;
      action: 'picar' | 'cortar' | 'rallar' | 'medir' | 'mezclar' | 'disolver' | 'separar' | 'licuar' | 'escurrir' | 'secar';
      ingredientRefs: string[];
      quantityRefs?: string[];
      confidence: number;
    }
  | {
      kind: 'heat_change';
      sourceText: string;
      action: 'calentar' | 'subir_fuego' | 'bajar_fuego' | 'retirar_del_fuego';
      target?: string;
      heatLevel?: 'bajo' | 'medio-bajo' | 'medio' | 'medio-alto' | 'alto';
      confidence: number;
    }
  | {
      kind: 'add_ingredient';
      sourceText: string;
      ingredientRef: string;
      quantityText: string;
      confidence: number;
    }
  | {
      kind: 'action';
      sourceText: string;
      action:
        | 'sofreir'
        | 'nacarar'
        | 'tapar'
        | 'reservar'
        | 'incorporar'
        | 'incorporar_reservado'
        | 'condimentar'
        | 'hervir'
        | 'esperar_secado'
        | 'reposar'
        | 'cocinar'
        | 'sellar'
        | 'dorar'
        | 'voltear';
      target?: string;
      confidence: number;
    }
  | {
      kind: 'wait';
      sourceText: string;
      seconds: number;
      confidence: number;
    }
  | {
      kind: 'result';
      sourceText: string;
      stateText: string;
      confidence: number;
    }
  | {
      kind: 'serve';
      sourceText: string;
      target?: string;
      confidence: number;
    }
  | {
      kind: 'unknown';
      sourceText: string;
      reason: 'truncated' | 'residual' | 'editorial' | 'multi_action' | 'ambiguous' | 'forbidden_construct';
    };

type ParsedStepWithMeta = {
  phaseId: string;
  phaseTitle: string;
  parsed: ParsedStep;
};

type ParsedRecipeDocument = {
  id: string;
  title: string;
  servings: number;
  ingredients: Array<{ title: string; icon?: string; items: string[] }>;
  parsedSteps: ParsedStepWithMeta[];
  unknownSteps: ParsedStepWithMeta[];
};

type ParsedStepToken = {
  phaseId: string;
  phaseTitle: string;
  sourceStepId: string;
  sourceTimer?: number;
  text: string;
};

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

type IngredientState = {
  ingredientRef: string;
  declared: boolean;
  prepared?: boolean;
  addedToVessel?: boolean;
  reserved?: boolean;
  reincorporated?: boolean;
  transformedStates: string[];
};

type AuditIssue =
  | { code: 'TRUNCATED_STEP'; phaseId: string; stepId?: string; text: string }
  | { code: 'UNKNOWN_STEP'; phaseId: string; text: string }
  | { code: 'INVALID_RESULT_CONTAINS_ACTION'; phaseId: string; text: string }
  | { code: 'DUPLICATE_ADD'; phaseId: string; ingredientRef: string }
  | { code: 'INGREDIENT_REINTRODUCED_WITHOUT_STATE'; phaseId: string; ingredientRef: string }
  | { code: 'INVALID_PREP_STEP'; phaseId: string; text: string }
  | { code: 'TIMER_WITHOUT_CAUSE'; phaseId: string; text: string }
  | { code: 'RESULT_WITHOUT_CAUSE'; phaseId: string; text: string }
  | { code: 'PHASE_TEMPLATE_GARBAGE'; phaseId: string; text: string }
  | { code: 'CULINARY_SEQUENCE_IMPLAUSIBLE'; phaseId: string; text: string };

type RecipeAuditResult = {
  isValid: boolean;
  severity: 'ok' | 'warning' | 'invalid';
  issues: AuditIssue[];
};

export type FixedRuntimeDebugSnapshot = {
  rawDocument: RawRecipeDocument;
  parsedSteps: Array<{
    phaseId: string;
    phaseTitle: string;
    kind: ParsedStep['kind'];
    sourceText: string;
    reason?: string;
    confidence?: number;
  }>;
  unknownSteps: Array<{
    phaseId: string;
    phaseTitle: string;
    sourceText: string;
    reason?: string;
  }>;
  reconstructedPhases: FixedPhase[];
  parsedAuditIssues: AuditIssue[];
  runtimeAuditIssues: AuditIssue[];
  mergedAuditIssues: AuditIssue[];
  repairActions: string[];
};

type BuildTrace = {
  rawDocument: RawRecipeDocument;
  parsed: ParsedRecipeDocument;
  reconstructed: NormalizedFixedRecipe;
  parsedAudit: RecipeAuditResult;
  runtimeAudit: RecipeAuditResult;
  mergedAudit: RecipeAuditResult;
  repairActions: string[];
};

type BuildResult =
  | { ok: true; recipe: NormalizedFixedRecipe; audit: RecipeAuditResult; diagnostics: FixedRuntimeDiagnostics; trace: BuildTrace }
  | { ok: false; error: 'recipe_invalid'; audit: RecipeAuditResult; diagnostics: FixedRuntimeDiagnostics; trace: BuildTrace };

const FORBIDDEN_INLINE = /\b(luego|despu[eé]s|hasta que)\b|por todos sus lados/i;
const OPERATIVE_VERBS = /\b(agregar|agrega|anadir|añadir|anade|añade|incorporar|incorpora|reincorporar|reincorpora|integrar|integra|remover|remueve|raspar|raspa|encender|enciende|apagar|apaga|bajar|baja|subir|sube|tapar|tapa|cubrir|cubre|destapar|destapa|retirar|retira|reservar|reserva|decorar|decora|mantener|mantenga|mezclar|mezcla|sazonar|sazona|condimentar|condimenta|sofre[ií]r|sofrie|rehogar|dorar|dora|sellar|sella|voltear|voltea|hervir|hierve|reposar|reposa|reducir|reduce|servir|sirve|calentar|calienta|cocinar|cocina|nacarar|nacara|esperar|espera|llevar)\b/i;
const STRONG_OPERATIVE_VERBS = /\b(agregar|agrega|anadir|añadir|anade|añade|incorporar|incorpora|reincorporar|reincorpora|integrar|integra|remover|remueve|raspar|raspa|encender|enciende|apagar|apaga|bajar|baja|subir|sube|tapar|tapa|cubrir|cubre|destapar|destapa|retirar|retira|reservar|reserva|decorar|decora|mantener|mantenga|mezclar|mezcla|sazonar|sazona|condimentar|condimenta|sofre[ií]r|sofrie|rehogar|dorar|dora|sellar|sella|voltear|voltea|hervir|hierve|reposar|reposa|servir|sirve|calentar|calienta|cocinar|cocina|nacarar|nacara|esperar|espera|llevar)\b/i;
const PREP_ONLY = /\b(picar|cortar|rallar|medir|mezclar|disolver|separar|licuar|escurrir|secar)\b/i;
const INVALID_PREP = /\b(agregar|anadir|añadir|incorporar|hervir|sofre[ií]r|dorar|sellar|cocinar|reposar|servir|tapar|destapar)\b/i;
const TRUNCATED = /^(dejar|hacer|continuar|agregar|anadir|añadir|incorporar)\.?$/i;
const RESULT_PREFIX = /^resultado\s*:?\s*/i;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeStepText(value: string): string {
  return value
    .replace(/^[\s>*\-•\d.)]+/, '')
    .replace(/^[\p{Emoji}\u2600-\u27BF]+\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCommonCookingVerbs(text: string): string {
  return sanitizeStepText(text)
    .replace(/\breincorporar\b/gi, 'incorporar')
    .replace(/\bintegrar\b/gi, 'incorporar')
    .replace(/\bsazonar\b/gi, 'condimentar')
    .replace(/\bremover\b/gi, 'mezclar')
    .replace(/\braspar\b/gi, 'mezclar')
    .replace(/\bmantener\b/gi, 'cocinar')
    .replace(/\bmantenga\b/gi, 'cocine');
}

function isImplicitResultClause(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (RESULT_PREFIX.test(text)) return true;
  if (STRONG_OPERATIVE_VERBS.test(normalized)) return false;
  if (/(^|\s)(que|cuando|hasta que)\s+est[eé]n?\b/.test(normalized)) return true;
  if (/\b(est[eé]n?|queden?|se vea|se sienta)\b/.test(normalized)) return true;
  if (/\b(translucid|tiern|espes|aromatic|transparente|dorado|huequitos|hervor|listo|textura|absorbid|tuest)\b/.test(normalized)) return true;
  if (/\bse haya absorbid[oa]?\b/.test(normalized)) return true;
  if (/\bse tuest[ea]\b/.test(normalized)) return true;
  if (/\b(reduzca|espese)\b/.test(normalized)) return true;
  return false;
}

function normalizeImplicitResultText(text: string): string {
  return sanitizeStepText(text)
    .replace(RESULT_PREFIX, '')
    .replace(/^\s*hasta que\s+/i, '')
    .replace(/^\s*cuando\s+/i, '')
    .replace(/^\s*que\s+/i, '')
    .trim();
}

function extractServingsHint(prompt: string): number | null {
  const match = prompt.match(/(\d+)\s*(personas|porciones|comensales)/i);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? '', 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function extractQuantityText(text: string): string | null {
  const match = text.match(/\b(\d+([.,]\d+)?|\d+\/\d+)\s?(g|gr|kg|ml|l|litro|litros|taza|tazas|cda|cdas|cdta|cdtas|unidad|unidades|diente|dientes)\b/i);
  return match?.[0]?.trim() ?? null;
}

function normalizeIngredientIdentity(item: string): string {
  return normalizeText(item)
    .replace(/\b(\d+([.,]\d+)?|\d+\/\d+|g|gr|kg|ml|l|litro|litros|taza|tazas|cda|cdas|cdta|cdtas|unidad|unidades|diente|dientes|de|la|el|los|las)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeIngredientItems(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const key = normalizeIngredientIdentity(item);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item.trim());
  }
  return output;
}

function inferIngredientRefFromText(text: string, ingredientPool: string[]): string | null {
  const normalized = normalizeText(text);
  for (const item of ingredientPool) {
    const key = normalizeIngredientIdentity(item);
    if (!key) continue;
    const tokens = key.split(' ').filter((token) => token.length >= 3);
    if (tokens.some((token) => normalized.includes(token))) return item;
  }
  return null;
}

function parseDurationSeconds(text: string): number | null {
  const hhmm = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hhmm) {
    const mins = Number.parseInt(hhmm[1] ?? '', 10);
    const secs = Number.parseInt(hhmm[2] ?? '', 10);
    if (Number.isFinite(mins) && Number.isFinite(secs)) return Math.max(1, mins * 60 + secs);
  }

  const min = text.match(/\b(\d+([.,]\d+)?)\s*(min|minuto|minutos)\b/i);
  if (min) {
    const value = Number.parseFloat((min[1] ?? '').replace(',', '.'));
    if (Number.isFinite(value)) return Math.max(1, Math.round(value * 60));
  }

  const sec = text.match(/\b(\d+([.,]\d+)?)\s*(s|seg|segundo|segundos)\b/i);
  if (sec) {
    const value = Number.parseFloat((sec[1] ?? '').replace(',', '.'));
    if (Number.isFinite(value)) return Math.max(1, Math.round(value));
  }

  return null;
}

function inferMicroTimerFromAction(text: string): number | null {
  const normalized = normalizeText(text);
  if (/\bcalentar\b/.test(normalized) && /\b(olla|sarten|sarten)\b/.test(normalized)) return 60;
  if (/\bcalentar\b/.test(normalized) && /\baceite\b/.test(normalized)) return 30;
  if (/\bsofreir\b/.test(normalized) && /\bajo\b/.test(normalized)) return 60;
  if (/\bsofreir\b/.test(normalized) && /\bcebolla\b/.test(normalized)) return 180;
  if (/\bnacarar\b/.test(normalized)) return 120;
  if (/\bhervor|hervir\b/.test(normalized)) return 300;
  if (/\bsecado|huequitos\b/.test(normalized)) return 180;
  if (/\bcocinar\b/.test(normalized) && /\btapad|minimo|minimo|bajo\b/.test(normalized)) return 720;
  if (/\bcocinar\b/.test(normalized)) return 720;
  if (/\breposar\b/.test(normalized)) return 300;
  if (/\bsellar\b/.test(normalized) && /\bsegundo|segunda\b/.test(normalized)) return 75;
  if (/\bsellar|dorar\b/.test(normalized)) return 120;
  if (/\breducir|reduccion\b/.test(normalized)) return 210;
  return null;
}

function splitRawStepText(text: string): string[] {
  return sanitizeStepText(text)
    .replace(/;\s*/g, '. ')
    .replace(/,\s*(luego|despu[eé]s)\s+/gi, '. ')
    .replace(/,\s+y\s+/gi, '. ')
    .replace(/\s+luego\s+/gi, '. ')
    .replace(/\s+despu[eé]s\s+/gi, '. ')
    .replace(/\s+hasta que\s+/gi, '. ')
    .split(/\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeTruncatedOrResidualSteps(parts: string[]): string[] {
  const merged: string[] = [];
  for (const part of parts) {
    const compact = part.trim();
    if (!compact) continue;
    const residual = /^\)|^\(|^[,;:.-]+$|^[a-z]\)?$/i.test(compact) || compact.length <= 3;
    if (residual && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${compact}`.trim();
      continue;
    }
    merged.push(compact);
  }
  return merged;
}

function splitByContractEvents(text: string): string[] {
  const normalized = text
    .replace(/\s+luego\s+/gi, '. ')
    .replace(/\s+despu[eé]s\s+/gi, '. ')
    .replace(/\s+hasta que\s+/gi, '. Resultado: ')
    .replace(/;\s*/g, '. ')
    .trim();

  const coarse = normalized
    .split(/\.\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const expanded: string[] = [];
  for (const part of coarse) {
    const lower = normalizeText(part);
    if (
      /\s+y\s+/.test(lower) &&
      /\b(reduzca|espese|est[eé]n?|queden?)\b/.test(lower) &&
      !/\b(agregar|anadir|añadir|incorporar|calentar|sofre[ií]r|dorar|sellar|nacarar|hervir|llevar|tapar|bajar|cocinar|reposar|servir)\b/.test(lower)
    ) {
      const chunks = part
        .split(/\s+y\s+/i)
        .map((item) => item.trim())
        .filter(Boolean);
      chunks.forEach((chunk) => expanded.push(chunk));
      continue;
    }

    const addMatch = lower.match(/^(agregar|anadir|añadir|incorporar)\s+(.+)$/i);
    if (addMatch && /\s+y\s+/i.test(addMatch[2] ?? '')) {
      const verb = addMatch[1] ?? 'Agregar';
      const items = (addMatch[2] ?? '')
        .split(/\s+y\s+/i)
        .map((item) => item.trim())
        .filter(Boolean);
      items.forEach((item) => expanded.push(`${verb} ${item}`));
      continue;
    }

    if (/\s+y\s+/.test(lower) && /\b(agregar|agrega|anade|añade|incorpora|calentar|calienta|sofreir|sofrie|dorar|dora|sellar|sella|nacarar|hervir|llevar|tapar|bajar|cocinar|reposar|servir)\b/i.test(lower)) {
      const tokens = part
        .split(/\s+y\s+/i)
        .map((item) => item.trim())
        .filter(Boolean);
      if (tokens.length > 1) {
        const headVerb = lower.match(/^(agregar|agrega|anade|añade|incorporar|incorpora|sofreir|sofrie|dorar|dora|sellar|sella|mezclar|mezcla|cortar|corta|picar|pica)\b/i)?.[1];
        if (headVerb) {
          const rebuilt = [tokens[0], ...tokens.slice(1).map((token) => `${headVerb} ${token}`)];
          rebuilt.forEach((token) => expanded.push(token));
          continue;
        }
        tokens.forEach((token) => expanded.push(token));
        continue;
      }
    }

    expanded.push(part);
  }

  return expanded;
}

function tokenizePhaseStep(phaseId: string, phaseTitle: string, step: FixedStep): ParsedStepToken[] {
  const rawParts = splitRawStepText(step.text);
  const mergedParts = mergeTruncatedOrResidualSteps(rawParts);
  const strictParts = mergedParts.flatMap((part) => splitByContractEvents(part));
  return strictParts.map((text, index) => ({
    phaseId,
    phaseTitle,
    sourceStepId: step.id,
    sourceTimer: index === 0 ? step.timer : undefined,
    text,
  }));
}

export function planPhaseSkeleton(raw: RawRecipeDocument): RawRecipeDocument {
  const normalizePhaseTitle = (title: string): string => {
    const normalized = normalizeText(title);
    if (/\b(prepar|mise)\b/.test(normalized)) return 'Preparación';
    if (/\b(sell|dorar)\b/.test(normalized)) return 'Sellado';
    if (/\b(base|sofrit)\b/.test(normalized)) return 'Base';
    if (/\barroz\b/.test(normalized)) return 'Arroz';
    if (/\b(integra|union|unir)\b/.test(normalized)) return 'Integración';
    if (/\b(coccion|cocinar|hervor)\b/.test(normalized)) return 'Cocción';
    if (/\b(repos)\b/.test(normalized)) return 'Reposo';
    if (/\b(serv|emplat)\b/.test(normalized)) return 'Servido';
    return title;
  };

  const phases = raw.phases.map((phase) => ({
    ...phase,
    title: normalizePhaseTitle(phase.title),
  }));

  return {
    ...raw,
    phases,
  };
}

export function expandPhaseToAtomicSteps(raw: RawRecipeDocument): RawRecipeDocument {
  const phases = raw.phases.map((phase) => {
    const expandedSteps = phase.steps.flatMap((step) => {
      const parts = mergeTruncatedOrResidualSteps(splitRawStepText(step.text)).flatMap((part) => splitByContractEvents(part));
      if (parts.length <= 1) return [step];
      return parts.map((text, idx) => ({
        ...step,
        id: `${step.id}-x${idx + 1}`,
        text,
        timer: idx === 0 ? step.timer : undefined,
      }));
    });
    return {
      ...phase,
      steps: expandedSteps,
    };
  });

  return {
    ...raw,
    phases,
  };
}

export function repairRecipeDocument(raw: RawRecipeDocument): { document: RawRecipeDocument; repairActions: string[] } {
  const repairActions: string[] = [];
  const seenStepTexts = new Set<string>();
  const phases = raw.phases.map((phase) => {
    const steps = phase.steps.filter((step) => {
      const text = normalizeText(step.text);
      if (!text) return false;
      if (/^mezclar$/.test(text) || /^incorporar arroz$/.test(text)) {
        repairActions.push(`drop_generic_step:${phase.id}:${step.id}`);
        return false;
      }
      const key = `${phase.id}:${text}`;
      if (seenStepTexts.has(key)) {
        repairActions.push(`dedupe_step:${phase.id}:${step.id}`);
        return false;
      }
      seenStepTexts.add(key);
      return true;
    });
    return {
      ...phase,
      steps,
    };
  });

  return {
    document: {
      ...raw,
      phases,
    },
    repairActions,
  };
}

function classifyStepStrict(stepText: string, ingredientPool: string[], phaseTitle: string, stepTimer?: number): ParsedStep {
  const text = normalizeCommonCookingVerbs(stepText);
  const normalized = normalizeText(text);
  if (!text) {
    return { kind: 'unknown', sourceText: stepText, reason: 'residual' };
  }

  if (TRUNCATED.test(text) || /\b(y|para|con)\s*$/i.test(text)) {
    return { kind: 'unknown', sourceText: stepText, reason: 'truncated' };
  }

  if (FORBIDDEN_INLINE.test(text) && OPERATIVE_VERBS.test(text)) {
    return { kind: 'unknown', sourceText: stepText, reason: 'forbidden_construct' };
  }

  if (isImplicitResultClause(text)) {
    const stateText = normalizeImplicitResultText(text);
    if (STRONG_OPERATIVE_VERBS.test(stateText) || parseDurationSeconds(stateText) != null) {
      const actionFromResult = salvageUnknownStep(stateText);
      if (actionFromResult && actionFromResult.kind !== 'result' && actionFromResult.kind !== 'unknown') {
        return { ...actionFromResult, sourceText: stepText } as ParsedStep;
      }
      return { kind: 'unknown', sourceText: stepText, reason: 'forbidden_construct' };
    }
    if (!stateText) {
      return { kind: 'unknown', sourceText: stepText, reason: 'residual' };
    }
    return { kind: 'result', sourceText: stepText, stateText, confidence: 0.9 };
  }

  if (/^timer\s*:/i.test(text) || (parseDurationSeconds(text) != null && /\b(timer|esperar|reposa|reposar|cocinar|cocina|hervor|hervir|llevar)\b/i.test(text))) {
    const seconds = parseDurationSeconds(text) ?? stepTimer ?? inferMicroTimerFromAction(text) ?? 60;
    return { kind: 'wait', sourceText: stepText, seconds, confidence: 0.85 };
  }

  if (/\bservir|emplatar|decorar\b/i.test(normalized)) {
    return { kind: 'serve', sourceText: stepText, target: inferIngredientRefFromText(text, ingredientPool) ?? undefined, confidence: 0.9 };
  }

  if (/^(calentar|calienta|subir|sube|bajar|baja|apagar|apaga|retirar del fuego)\b/i.test(normalized) || /\bfuego\s+(alto|medio|bajo|minimo|mínimo)\b/i.test(normalized)) {
    const heatLevel = /\balto\b/.test(normalized)
      ? 'alto'
      : /\bmedio alto\b/.test(normalized)
      ? 'medio-alto'
      : /\bmedio bajo\b/.test(normalized)
      ? 'medio-bajo'
      : /\bmedio\b/.test(normalized)
      ? 'medio'
      : /\bbajo|minimo|mínimo\b/.test(normalized)
      ? 'bajo'
      : undefined;
    const action = /^subir|^sube/.test(normalized)
      ? 'subir_fuego'
      : /^bajar|^baja/.test(normalized)
      ? 'bajar_fuego'
      : /^apagar|^apaga|^retirar del fuego/.test(normalized)
      ? 'retirar_del_fuego'
      : 'calentar';
    return {
      kind: 'heat_change',
      sourceText: stepText,
      action,
      target: inferIngredientRefFromText(text, ingredientPool) ?? undefined,
      heatLevel,
      confidence: 0.8,
    };
  }

  if (/^(agregar|agrega|anadir|añadir|anade|añade|incorporar|incorpora)\b/i.test(normalized)) {
    const ingredientRef = inferIngredientRefFromText(text, ingredientPool);
    const quantityText = extractQuantityText(text) ?? (ingredientRef ? extractQuantityText(ingredientRef) : null);
    if (!ingredientRef || !quantityText) {
      return { kind: 'unknown', sourceText: stepText, reason: 'ambiguous' };
    }
    return {
      kind: 'add_ingredient',
      sourceText: stepText,
      ingredientRef,
      quantityText,
      confidence: 0.9,
    };
  }

  if (PREP_ONLY.test(normalized)) {
    const isPrepPhase = /\b(prepar|mise)\b/i.test(phaseTitle);
    if (!isPrepPhase && /\bmezclar\b/.test(normalized)) {
      return {
        kind: 'action',
        sourceText: stepText,
        action: 'incorporar',
        target: inferIngredientRefFromText(text, ingredientPool) ?? undefined,
        confidence: 0.65,
      };
    }
    if (INVALID_PREP.test(normalized) && /\b(prepar|mise)\b/i.test(phaseTitle)) {
      return { kind: 'unknown', sourceText: stepText, reason: 'forbidden_construct' };
    }
    const action = /\bpicar\b/.test(normalized)
      ? 'picar'
      : /\bcortar\b/.test(normalized)
      ? 'cortar'
      : /\brallar\b/.test(normalized)
      ? 'rallar'
      : /\bmedir\b/.test(normalized)
      ? 'medir'
      : /\bdisolver\b/.test(normalized)
      ? 'disolver'
      : /\bseparar\b/.test(normalized)
      ? 'separar'
      : /\blicuar\b/.test(normalized)
      ? 'licuar'
      : /\bescurrir\b/.test(normalized)
      ? 'escurrir'
      : /\bsecar\b/.test(normalized)
      ? 'secar'
      : 'mezclar';
    const ingredientRef = inferIngredientRefFromText(text, ingredientPool);
    return {
      kind: 'prep',
      sourceText: stepText,
      action,
      ingredientRefs: ingredientRef ? [ingredientRef] : [],
      quantityRefs: extractQuantityText(text) ? [extractQuantityText(text) as string] : undefined,
      confidence: 0.8,
    };
  }

  const fallbackIngredientRef = inferIngredientRefFromText(text, ingredientPool);
  const fallbackQuantity = extractQuantityText(text) ?? (fallbackIngredientRef ? extractQuantityText(fallbackIngredientRef) : null);
  if (!OPERATIVE_VERBS.test(normalized) && fallbackIngredientRef && fallbackQuantity) {
    return {
      kind: 'add_ingredient',
      sourceText: stepText,
      ingredientRef: fallbackIngredientRef,
      quantityText: fallbackQuantity,
      confidence: 0.55,
    };
  }

  if (/\b(sofreir|sofrie|nacarar|tapar|cubrir|reservar|incorporar|mezclar|hervir|llevar .*hervor|esperar secado|reposar|cocinar|sellar|dorar|voltear|condimentar)\b/i.test(normalized)) {
    const action = /\bsofreir\b/.test(normalized)
      ? 'sofreir'
      : /\bnacarar\b/.test(normalized)
      ? 'nacarar'
      : /\btapar|cubrir\b/.test(normalized)
      ? 'tapar'
      : /\breservar\b/.test(normalized)
      ? 'reservar'
      : /\bincorporar\b/.test(normalized) && /\breservad/.test(normalized)
      ? 'incorporar_reservado'
      : /\bincorporar\b/.test(normalized)
      ? 'incorporar'
      : /\bmezclar\b/.test(normalized)
      ? 'incorporar'
      : /\bcondimentar\b/.test(normalized)
      ? 'condimentar'
      : /\bhervir|hierve|llevar .*hervor|lleva .*hervor\b/.test(normalized)
      ? 'hervir'
      : /\besperar secado\b/.test(normalized)
      ? 'esperar_secado'
      : /\breposar\b/.test(normalized)
      ? 'reposar'
      : /\bcocinar\b/.test(normalized)
      ? 'cocinar'
      : /\bsellar\b/.test(normalized)
      ? 'sellar'
      : /\bdorar\b/.test(normalized)
      ? 'dorar'
      : 'voltear';
    return {
      kind: 'action',
      sourceText: stepText,
      action,
      target: inferIngredientRefFromText(text, ingredientPool) ?? undefined,
      confidence: 0.75,
    };
  }

  if (/\b(receta|mezcla lista|opcional|aprox|aproximadamente)\b/i.test(normalized)) {
    return { kind: 'unknown', sourceText: stepText, reason: 'editorial' };
  }

  return { kind: 'unknown', sourceText: stepText, reason: 'ambiguous' };
}

function salvageUnknownStep(stepText: string): ParsedStep | null {
  const text = normalizeCommonCookingVerbs(stepText);
  const normalized = normalizeText(text);
  if (!text) return null;
  if (RESULT_PREFIX.test(text)) {
    const stateText = normalizeImplicitResultText(text);
    if (!stateText) return null;
    if (STRONG_OPERATIVE_VERBS.test(normalizeText(stateText))) return null;
    if (parseDurationSeconds(stateText) != null) return null;
    return {
      kind: 'result',
      sourceText: stepText,
      stateText,
      confidence: 0.9,
    };
  }

  const duration = parseDurationSeconds(text);
  if (duration != null) {
    return { kind: 'wait', sourceText: stepText, seconds: duration, confidence: 0.5 };
  }

  if (isImplicitResultClause(text) && !STRONG_OPERATIVE_VERBS.test(normalized) && parseDurationSeconds(text) == null) {
    const stateText = normalizeImplicitResultText(text);
    if (!stateText) return null;
    return {
      kind: 'result',
      sourceText: stepText,
      stateText,
      confidence: 0.6,
    };
  }

  return null;
}

function parseRawRecipeStrict(raw: RawRecipeDocument): ParsedRecipeDocument {
  const ingredientPool = raw.ingredients.flatMap((group) => group.items);
  const parsedSteps: ParsedStepWithMeta[] = [];
  const unknownSteps: ParsedStepWithMeta[] = [];

  for (const phase of raw.phases) {
    const tokens = phase.steps.flatMap((step) => tokenizePhaseStep(phase.id, phase.title, step));
    tokens.forEach((token) => {
      let parsed = classifyStepStrict(token.text, ingredientPool, phase.title, token.sourceTimer);
      if (parsed.kind === 'unknown') {
        const salvaged = salvageUnknownStep(token.text);
        if (salvaged) parsed = salvaged;
      }
      if (parsed.kind === 'unknown' && isImplicitResultClause(token.text)) {
        const stateText = normalizeImplicitResultText(token.text);
        if (stateText && !STRONG_OPERATIVE_VERBS.test(normalizeText(stateText))) {
          parsed = { kind: 'result', sourceText: token.text, stateText, confidence: 0.35 };
        }
      }
      const entry = {
        phaseId: phase.id,
        phaseTitle: phase.title,
        parsed,
      };
      if (parsed.kind === 'unknown') unknownSteps.push(entry);
      parsedSteps.push(entry);
    });
  }

  return {
    id: raw.id,
    title: raw.title,
    servings: raw.servings,
    ingredients: raw.ingredients,
    parsedSteps,
    unknownSteps,
  };
}

function toTimerLabel(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `TIMER: ${mins}:${String(secs).padStart(2, '0')}`;
}

function toCanonicalIngredientTarget(ingredientRef: string | undefined, ingredientPool: string[]): string {
  if (ingredientRef) {
    const normalized = normalizeIngredientIdentity(ingredientRef);
    if (normalized.includes('arroz')) return 'arroz';
    if (normalized.includes('pasta')) return 'pasta';
    if (normalized.includes('lenteja')) return 'lentejas';
    if (normalized.includes('pollo')) return 'pollo';
    if (normalized.includes('cebolla')) return 'cebolla';
    if (normalized.includes('ajo')) return 'ajo';
    if (normalized.includes('pimiento')) return 'pimientos';
    if (normalized.includes('tomate')) return 'tomate';
  }
  return 'mezcla';
}

function isLowValueGenericStep(text: string): boolean {
  const normalized = normalizeText(text);
  if (/^mezclar$/.test(normalized)) return true;
  if (/^incorporar (arroz|mezcla)$/.test(normalized)) return true;
  if (/^cocinar arroz tapado$/.test(normalized)) return true;
  return false;
}

function canonicalizeParsedStep(step: ParsedStep, ingredientPool: string[], currentTarget: string | null): { steps: FixedStep[]; nextTarget: string | null } {
  const steps: FixedStep[] = [];
  let nextTarget = currentTarget;

  if (step.kind === 'prep') {
    if (step.ingredientRefs.length === 0) {
      return { steps, nextTarget };
    }
    steps.push({ id: '', text: `${step.action.charAt(0).toUpperCase()}${step.action.slice(1)}${step.ingredientRefs[0] ? ` ${normalizeIngredientIdentity(step.ingredientRefs[0])}` : ''}`.trim() });
    return { steps, nextTarget };
  }

  if (step.kind === 'heat_change') {
    const target = step.target ? toCanonicalIngredientTarget(step.target, ingredientPool) : 'olla';
    nextTarget = target;
    const actionText =
      step.action === 'calentar'
        ? `Calentar ${target} a fuego ${step.heatLevel ?? 'medio'}`
        : step.action === 'subir_fuego'
        ? `Subir ${target} a fuego ${step.heatLevel ?? 'alto'}`
        : step.action === 'bajar_fuego'
        ? `Bajar ${target} a fuego ${step.heatLevel ?? 'mínimo'}`
        : `Retirar ${target} del fuego`;
    steps.push({ id: '', text: actionText });
    const timer = inferMicroTimerFromAction(actionText);
    if (timer) steps.push({ id: '', text: toTimerLabel(timer), timer });
    return { steps, nextTarget };
  }

  if (step.kind === 'add_ingredient') {
    steps.push({ id: '', text: `Agregar ${step.quantityText} ${normalizeIngredientIdentity(step.ingredientRef)}` });
    nextTarget = toCanonicalIngredientTarget(step.ingredientRef, ingredientPool);
    return { steps, nextTarget };
  }

  if (step.kind === 'action') {
    const target = toCanonicalIngredientTarget(step.target, ingredientPool) || nextTarget || 'mezcla';
    nextTarget = target;
    const actionText =
      step.action === 'nacarar'
        ? `Nacarar ${target}`
        : step.action === 'cocinar'
        ? `Cocinar ${target} tapado`
        : step.action === 'reposar'
        ? `Reposar ${target} tapado`
        : step.action === 'esperar_secado'
        ? `Esperar secado de ${target}`
        : step.action === 'hervir'
        ? `Llevar ${target} a hervor`
        : step.action === 'sofreir'
        ? `Sofreír ${normalizeIngredientIdentity(step.target ?? 'ajo')}`
        : step.action === 'tapar'
        ? `Tapar ${target}`
        : step.action === 'reservar'
        ? `Reservar ${target}`
        : step.action === 'incorporar_reservado'
        ? `Incorporar ${target} reservado`
        : step.action === 'incorporar'
        ? `Incorporar ${target}`
        : step.action === 'condimentar'
        ? `Condimentar ${target}`
        : step.action === 'sellar'
        ? `Sellar ${target}`
        : step.action === 'dorar'
        ? `Dorar ${target}`
        : `Voltear ${target}`;
    steps.push({ id: '', text: actionText });
    const timer = inferMicroTimerFromAction(actionText);
    if (timer) steps.push({ id: '', text: toTimerLabel(timer), timer });
    return { steps, nextTarget };
  }

  if (step.kind === 'wait') {
    steps.push({ id: '', text: toTimerLabel(step.seconds), timer: step.seconds });
    return { steps, nextTarget };
  }

  if (step.kind === 'result') {
    steps.push({ id: '', text: `Resultado: ${step.stateText}`, type: 'result' });
    return { steps, nextTarget };
  }

  if (step.kind === 'serve') {
    const target = toCanonicalIngredientTarget(step.target, ingredientPool);
    steps.push({ id: '', text: `Servir ${target} caliente` });
    return { steps, nextTarget };
  }

  return { steps, nextTarget };
}

function classifyPhaseBucket(parsed: ParsedStep): 'prep' | 'cook' | 'rest' | 'serve' {
  if (parsed.kind === 'serve') return 'serve';
  if (parsed.kind === 'prep') return 'prep';
  if (parsed.kind === 'action' && parsed.action === 'reposar') return 'rest';
  return 'cook';
}

function reconstructRecipeFromContract(parsed: ParsedRecipeDocument): NormalizedFixedRecipe {
  const ingredientPool = parsed.ingredients.flatMap((group) => group.items);
  const phaseBuckets: Record<'prep' | 'cook' | 'rest' | 'serve', FixedStep[]> = {
    prep: [],
    cook: [],
    rest: [],
    serve: [],
  };
  const addedIngredientKeys = new Set<string>();
  const seenPrepTransforms = new Set<string>();
  let hasNacarar = false;

  const injectMissingCauseForResult = (bucket: 'prep' | 'cook' | 'rest' | 'serve', resultText: string, target: string | null): FixedStep[] => {
    if (bucket === 'prep' || bucket === 'serve') return [];
    const normalized = normalizeText(resultText);
    const baseTarget = target ?? 'mezcla';
    const actionText =
      /\b(translucid|abland|aromatic|tiern)\b/.test(normalized)
        ? `Sofreír ${baseTarget}`
        : /\b(espese|reduzca|espesor)\b/.test(normalized)
        ? `Cocinar ${baseTarget} tapado`
        : `Cocinar ${baseTarget} tapado`;
    const timer = inferMicroTimerFromAction(actionText) ?? 120;
    return [{ id: '', text: actionText }, { id: '', text: toTimerLabel(timer), timer }];
  };

  let currentTarget: string | null = null;
  let activeBucket: 'prep' | 'cook' | 'rest' | 'serve' = 'cook';
  for (const entry of parsed.parsedSteps) {
    if (entry.parsed.kind === 'unknown') continue;
    const canonical = canonicalizeParsedStep(entry.parsed, ingredientPool, currentTarget);
    currentTarget = canonical.nextTarget;
    const bucket: 'prep' | 'cook' | 'rest' | 'serve' =
      entry.parsed.kind === 'wait' || entry.parsed.kind === 'result'
        ? activeBucket
        : classifyPhaseBucket(entry.parsed);
    if (entry.parsed.kind !== 'wait' && entry.parsed.kind !== 'result') {
      activeBucket = bucket;
    }
    canonical.steps.forEach((step) => {
      if (isLowValueGenericStep(step.text)) {
        return;
      }

      if (bucket === 'prep') {
        if (/^mezclar\b/i.test(normalizeText(step.text))) {
          return;
        }
        const prepKey = normalizeText(step.text);
        if (seenPrepTransforms.has(prepKey)) {
          return;
        }
        seenPrepTransforms.add(prepKey);
      }

      const normalizedStepText = normalizeText(step.text);
      if (/^agregar\b/i.test(normalizedStepText)) {
        const ingredientRef = inferIngredientRefFromText(step.text, ingredientPool);
        const ingredientKey = ingredientRef ? normalizeIngredientIdentity(ingredientRef) : null;
        if (ingredientKey?.includes('aceite') && hasNacarar) {
          return;
        }
        if (ingredientKey) {
          if (addedIngredientKeys.has(ingredientKey)) return;
          addedIngredientKeys.add(ingredientKey);
        }
      }
      if (/^nacarar\b/i.test(normalizedStepText)) {
        hasNacarar = true;
      }
      const lastStep = phaseBuckets[bucket][phaseBuckets[bucket].length - 1];
      if (step.type === 'result') {
        if (!lastStep || lastStep.type === 'result') {
          injectMissingCauseForResult(bucket, step.text, currentTarget).forEach((injected) => {
            phaseBuckets[bucket].push(injected);
          });
        } else if (/^timer\s*:/i.test(normalizeText(lastStep.text))) {
          // timer already acts as causal continuation
        }
      }
      const refreshedLast = phaseBuckets[bucket][phaseBuckets[bucket].length - 1];
      if (refreshedLast && normalizeText(refreshedLast.text) === normalizeText(step.text)) {
        return;
      }
      if (
        step.type === 'result' &&
        refreshedLast?.type === 'result' &&
        normalizeText(refreshedLast.text) === normalizeText(step.text)
      ) {
        return;
      }
      phaseBuckets[bucket].push(step);
    });
  }

  const phases: FixedPhase[] = [];
  const pushPhase = (title: string, emoji: string, steps: FixedStep[]) => {
    if (steps.length === 0) return;
    const phaseIndex = phases.length + 1;
    phases.push({
      id: `fase-${phaseIndex}`,
      number: `FASE ${phaseIndex}`,
      title,
      emoji,
      steps: steps.map((step, index) => ({ ...step, id: `fase-${phaseIndex}-s${index + 1}` })),
    });
  };

  pushPhase('Preparación', '🔪', phaseBuckets.prep);
  pushPhase('Cocción principal', '🍳', phaseBuckets.cook);
  pushPhase('Reposo', '⏸️', phaseBuckets.rest);

  if (phaseBuckets.serve.length === 0) {
    const ingredientKeys = ingredientPool.map((item) => normalizeIngredientIdentity(item));
    const hasRice = ingredientKeys.some((item) => item.includes('arroz'));
    const hasChicken = ingredientKeys.some((item) => item.includes('pollo'));
    const text = hasRice && hasChicken
      ? 'Servir arroz con pollo caliente'
      : hasRice
      ? 'Servir arroz caliente'
      : hasChicken
      ? 'Servir pollo caliente'
      : 'Servir plato caliente';
    phaseBuckets.serve.push({ id: '', text });
  }
  pushPhase('Servido', '🍽️', phaseBuckets.serve);

  return {
    id: parsed.id,
    title: parsed.title,
    servings: parsed.servings,
    ingredients: parsed.ingredients,
    phases,
  };
}

function isResultWithAction(text: string): boolean {
  const body = text.replace(RESULT_PREFIX, '');
  return OPERATIVE_VERBS.test(body) || parseDurationSeconds(body) != null;
}

function trackIngredientState(recipe: NormalizedFixedRecipe): Map<string, IngredientState> {
  const allIngredients = recipe.ingredients.flatMap((group) => group.items);
  const map = new Map<string, IngredientState>();
  allIngredients.forEach((item) => {
    map.set(normalizeIngredientIdentity(item), {
      ingredientRef: normalizeIngredientIdentity(item),
      declared: true,
      transformedStates: [],
    });
  });
  return map;
}

function auditParsedInput(parsed: ParsedRecipeDocument): RecipeAuditResult {
  const issues: AuditIssue[] = [];
  const byPhase = new Map<string, ParsedStepWithMeta[]>();
  parsed.parsedSteps.forEach((entry) => {
    const list = byPhase.get(entry.phaseId) ?? [];
    list.push(entry);
    byPhase.set(entry.phaseId, list);
  });

  parsed.unknownSteps.forEach((entry) => {
    if (entry.parsed.kind !== 'unknown') return;
    issues.push({
      code: entry.parsed.reason === 'truncated' ? 'TRUNCATED_STEP' : 'UNKNOWN_STEP',
      phaseId: entry.phaseId,
      text: entry.parsed.sourceText,
    });
  });

  for (const [phaseId, entries] of byPhase.entries()) {
    entries.forEach((entry, index) => {
      const parsedStep = entry.parsed;
      if (parsedStep.kind === 'prep' && /\b(prepar|mise)\b/i.test(entry.phaseTitle) === false) {
        return;
      }
      if (/\b(prepar|mise)\b/i.test(entry.phaseTitle) && parsedStep.kind !== 'prep' && parsedStep.kind !== 'result') {
        issues.push({ code: 'INVALID_PREP_STEP', phaseId, text: parsedStep.sourceText });
      }
      if (parsedStep.kind === 'result') {
        if (isResultWithAction(parsedStep.sourceText)) {
          issues.push({ code: 'INVALID_RESULT_CONTAINS_ACTION', phaseId, text: parsedStep.sourceText });
        }
        const previous = entries[index - 1]?.parsed;
        if (!previous || previous.kind === 'result' || previous.kind === 'unknown') {
          issues.push({ code: 'RESULT_WITHOUT_CAUSE', phaseId, text: parsedStep.sourceText });
        }
      }
      if (parsedStep.kind === 'wait') {
        const previous = entries[index - 1]?.parsed;
        if (!previous || previous.kind === 'wait' || previous.kind === 'result' || previous.kind === 'unknown') {
          issues.push({ code: 'TIMER_WITHOUT_CAUSE', phaseId, text: parsedStep.sourceText });
        }
      }
    });
  }

  const criticalCodes: AuditIssue['code'][] = [
    'TRUNCATED_STEP',
    'UNKNOWN_STEP',
    'INVALID_RESULT_CONTAINS_ACTION',
    'INVALID_PREP_STEP',
    'TIMER_WITHOUT_CAUSE',
  ];
  const isValid = !issues.some((issue) => criticalCodes.includes(issue.code));
  return {
    isValid,
    severity: isValid ? (issues.length > 0 ? 'warning' : 'ok') : 'invalid',
    issues,
  };
}

function mergeAuditResults(parsedAudit: RecipeAuditResult, runtimeAudit: RecipeAuditResult): RecipeAuditResult {
  const mergedMap = new Map<string, AuditIssue>();
  [...parsedAudit.issues, ...runtimeAudit.issues].forEach((issue) => {
    const discriminator =
      'ingredientRef' in issue
        ? `${issue.code}|${issue.phaseId}|${issue.ingredientRef}`
        : `${issue.code}|${issue.phaseId}|${issue.text}`;
    if (!mergedMap.has(discriminator)) mergedMap.set(discriminator, issue);
  });
  const issues = Array.from(mergedMap.values());
  const isValid = parsedAudit.isValid && runtimeAudit.isValid;
  return {
    isValid,
    severity: isValid ? (issues.length > 0 ? 'warning' : 'ok') : 'invalid',
    issues,
  };
}

function auditRuntimeRecipe(recipe: NormalizedFixedRecipe, parsed: ParsedRecipeDocument): RecipeAuditResult {
  const issues: AuditIssue[] = [];
  const state = trackIngredientState(recipe);
  const allStepTexts = recipe.phases.flatMap((phase) => phase.steps.map((step) => normalizeText(step.text)));

  parsed.unknownSteps.forEach((entry) => {
    if (entry.parsed.kind !== 'unknown') return;
    if (
      isImplicitResultClause(entry.parsed.sourceText) &&
      !STRONG_OPERATIVE_VERBS.test(normalizeText(entry.parsed.sourceText))
    ) {
      return;
    }
    issues.push({
      code: entry.parsed.reason === 'truncated' ? 'TRUNCATED_STEP' : 'UNKNOWN_STEP',
      phaseId: entry.phaseId,
      text: entry.parsed.sourceText,
    });
  });

  recipe.phases.forEach((phase) => {
    const addSeenInPhase = new Set<string>();

    phase.steps.forEach((step, index) => {
      const text = step.text.trim();
      const normalized = normalizeText(text);

      if (TRUNCATED.test(text)) {
        issues.push({ code: 'TRUNCATED_STEP', phaseId: phase.id, stepId: step.id, text });
      }

      if (phase.title === 'Preparación') {
        if (step.type === 'result') return;
        if (!PREP_ONLY.test(normalized)) {
          issues.push({ code: 'INVALID_PREP_STEP', phaseId: phase.id, text });
        }
      }

      if (/^timer\s*:/i.test(normalized)) {
        const previous = phase.steps[index - 1];
        if (!previous || previous.type === 'result' || /^timer\s*:/i.test(normalizeText(previous.text))) {
          issues.push({ code: 'TIMER_WITHOUT_CAUSE', phaseId: phase.id, text });
        }
      }

      if (step.type === 'result') {
        if (isResultWithAction(text)) {
          issues.push({ code: 'INVALID_RESULT_CONTAINS_ACTION', phaseId: phase.id, text });
        }
        const previous = phase.steps[index - 1];
        if (!previous || previous.type === 'result') {
          issues.push({ code: 'RESULT_WITHOUT_CAUSE', phaseId: phase.id, text });
        }
      }

      if (/^agregar\b/i.test(normalized)) {
        const ingredientRef = inferIngredientRefFromText(text, recipe.ingredients.flatMap((group) => group.items));
        if (!ingredientRef) {
          issues.push({ code: 'CULINARY_SEQUENCE_IMPLAUSIBLE', phaseId: phase.id, text });
          return;
        }
        const key = normalizeIngredientIdentity(ingredientRef);
        if (addSeenInPhase.has(key)) {
          issues.push({ code: 'DUPLICATE_ADD', phaseId: phase.id, ingredientRef: key });
        }
        const entry = state.get(key);
        if (entry?.addedToVessel && !entry.reincorporated && !entry.reserved) {
          issues.push({ code: 'INGREDIENT_REINTRODUCED_WITHOUT_STATE', phaseId: phase.id, ingredientRef: key });
        }
        addSeenInPhase.add(key);
        if (entry) entry.addedToVessel = true;
      }
    });

    if (/armado final/i.test(phase.title) && !phase.steps.some((step) => /^servir\b/i.test(normalizeText(step.text)))) {
      issues.push({ code: 'PHASE_TEMPLATE_GARBAGE', phaseId: phase.id, text: phase.title });
    }
  });

  recipe.ingredients
    .flatMap((group) => group.items)
    .forEach((item) => {
      const normalizedItem = normalizeIngredientIdentity(item);
      if (!normalizedItem) return;
      if (/\b(sal|pimienta|gusto|opcional)\b/.test(normalizedItem)) return;
      if (/\s+o\s+/.test(normalizeText(item))) return;
      const tokens = normalizedItem.split(' ').filter((token) => token.length >= 3);
      if (tokens.length === 0) return;
      const used = allStepTexts.some((stepText) => tokens.some((token) => stepText.includes(token)));
      if (!used) {
        issues.push({
          code: 'CULINARY_SEQUENCE_IMPLAUSIBLE',
          phaseId: recipe.phases[0]?.id ?? 'fase-1',
          text: `Ingrediente declarado sin uso en pasos: ${item}`,
        });
      }
    });

  const criticalCodes: AuditIssue['code'][] = [
    'TRUNCATED_STEP',
    'UNKNOWN_STEP',
    'INVALID_RESULT_CONTAINS_ACTION',
    'DUPLICATE_ADD',
    'INGREDIENT_REINTRODUCED_WITHOUT_STATE',
    'INVALID_PREP_STEP',
    'TIMER_WITHOUT_CAUSE',
    'PHASE_TEMPLATE_GARBAGE',
  ];

  const isValid = !issues.some((issue) => criticalCodes.includes(issue.code));
  return {
    isValid,
    severity: isValid ? (issues.length > 0 ? 'warning' : 'ok') : 'invalid',
    issues,
  };
}

const FATAL_AUDIT_CODES: AuditIssue['code'][] = [
  'TRUNCATED_STEP',
  'UNKNOWN_STEP',
  'INVALID_RESULT_CONTAINS_ACTION',
  'DUPLICATE_ADD',
  'INGREDIENT_REINTRODUCED_WITHOUT_STATE',
  'INVALID_PREP_STEP',
  'TIMER_WITHOUT_CAUSE',
  'PHASE_TEMPLATE_GARBAGE',
];

function toDiagnostics(audit: RecipeAuditResult, repairActions: string[]): FixedRuntimeDiagnostics {
  const fatalCount = audit.issues.filter((issue) => FATAL_AUDIT_CODES.includes(issue.code)).length;
  const recoverableCount = Math.max(0, audit.issues.length - fatalCount);
  return {
    severity: audit.severity,
    recoverableCount,
    fatalCount,
    codes: audit.issues.map((issue) => issue.code),
    repairActions,
  };
}

export function buildFixedRuntimeRecipeV2(raw: RawRecipeDocument): BuildResult {
  const planned = planPhaseSkeleton(raw);
  const expanded = expandPhaseToAtomicSteps(planned);
  const repaired = repairRecipeDocument(expanded);
  const parsed = parseRawRecipeStrict(repaired.document);
  const reconstructed = reconstructRecipeFromContract(parsed);
  const parsedAudit = auditParsedInput(parsed);
  const runtimeAudit = auditRuntimeRecipe(reconstructed, parsed);
  const audit = mergeAuditResults(parsedAudit, runtimeAudit);
  const trace: BuildTrace = {
    rawDocument: repaired.document,
    parsed,
    reconstructed,
    parsedAudit,
    runtimeAudit,
    mergedAudit: audit,
    repairActions: repaired.repairActions,
  };
  const diagnostics = toDiagnostics(audit, repaired.repairActions);
  if (!audit.isValid) {
    return {
      ok: false,
      error: 'recipe_invalid',
      audit,
      diagnostics,
      trace,
    };
  }
  return {
    ok: true,
    recipe: reconstructed,
    audit,
    diagnostics,
    trace,
  };
}

export function buildFixedRuntimeSystemPrompt(userInput = '{{USER_INPUT}}'): string {
  return [
    'Genera una receta en formato ejecutable paso a paso.',
    '',
    'FORMATO:',
    'Título',
    'Ingredientes',
    'Fases',
    '',
    'NO incluir secciones separadas de "Timers" o "Resultados".',
    'Los timers y resultados deben estar dentro de los steps.',
    'No incluir texto narrativo.',
    '',
    'REGLA PRINCIPAL:',
    '1 step = 1 acción',
    '',
    'PROHIBIDO:',
    '- usar "y", "luego", "después", "hasta que"',
    '- múltiples acciones en un step',
    '- mezclar acción con tiempo o resultado',
    '',
    'ESTRUCTURA DE STEPS:',
    'Acción',
    'TIMER: mm:ss',
    'Resultado: estado observable',
    '',
    'INGREDIENTES:',
    '- cantidades exactas (g, ml, unidades)',
    '- evitar "al gusto" (excepto sal/pimienta)',
    '',
    'PREPARACIÓN:',
    '- solo cortes y organización',
    '- sin fuego',
    '- sin timers',
    '',
    'FASES (orden lógico):',
    'preparación',
    '→ base',
    '→ cocción',
    '→ finalización',
    '→ reposo',
    '',
    'TIMERS:',
    '- deben representar una transformación real',
    '- no usar tiempos genéricos',
    '',
    'RESULTADOS:',
    '- deben ser observables (ej: "cebolla transparente", "hervor activo")',
    '',
    'EJEMPLO CORRECTO:',
    'Agregar 200 g cebolla en brunoise',
    'Sofreír cebolla',
    'TIMER: 3:00',
    'Resultado: cebolla transparente',
    '',
    'EJEMPLO INCORRECTO:',
    '"Sofreír cebolla y ajo por 5 minutos hasta que estén dorados"',
    '',
    'Si incumples alguna regla, la respuesta es inválida.',
    'No generes la receta si no puedes cumplir todo.',
    '',
    'PEDIDO:',
    userInput,
  ].join('\n');
}

function coerceRawRecipeDocument(input: unknown, prompt: string): RawRecipeDocument {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('La IA devolvio un formato invalido.');
  }

  const candidate = input as Record<string, unknown>;
  const titleFromAI = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const title = titleFromAI || 'Receta generada';
  const servingsHint = extractServingsHint(prompt);
  const servingsFromAI = typeof candidate.servings === 'number' ? candidate.servings : null;
  const servings = Number.isInteger(servingsFromAI) && (servingsFromAI as number) > 0
    ? (servingsFromAI as number)
    : (servingsHint ?? 2);
  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : slugify(title) || `receta-${Date.now()}`;

  const rawIngredients = Array.isArray(candidate.ingredients) ? candidate.ingredients : [];
  const ingredients = rawIngredients
    .map((group, index) => {
      if (!group || typeof group !== 'object') return null;
      const item = group as Record<string, unknown>;
      const titleValue = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Componente ${index + 1}`;
      const icon = typeof item.icon === 'string' ? item.icon : undefined;
      const items = Array.isArray(item.items)
        ? item.items
            .map((entry) => {
              if (typeof entry === 'string' && entry.trim().length > 0) return entry.trim();
              if (!entry || typeof entry !== 'object') return null;
              const obj = entry as Record<string, unknown>;
              const name = typeof obj.name === 'string' ? obj.name.trim() : '';
              const amount = typeof obj.amount === 'number'
                ? String(obj.amount)
                : typeof obj.amount === 'string'
                ? obj.amount.trim()
                : '';
              const unit = typeof obj.unit === 'string' ? obj.unit.trim() : '';
              const prep = typeof obj.preparation === 'string' && obj.preparation.trim() ? `, ${obj.preparation.trim()}` : '';
              const notes = typeof obj.notes === 'string' && obj.notes.trim() ? ` (${obj.notes.trim()})` : '';
              const line = `${amount} ${unit} ${name}${prep}${notes}`.replace(/\s+/g, ' ').trim();
              return line || null;
            })
            .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        : [];
      return {
        title: titleValue,
        ...(icon ? { icon } : {}),
        items: dedupeIngredientItems(items),
      };
    })
    .filter(isDefined)
    .filter((group) => group.items.length > 0);

  if (ingredients.length === 0) {
    throw new Error('La receta generada no incluye ingredientes validos.');
  }

  const rawPhases = Array.isArray(candidate.phases) ? candidate.phases : [];
  const phases = rawPhases
    .map((phase, index) => {
      if (!phase || typeof phase !== 'object') return null;
      const phaseObj = phase as Record<string, unknown>;
      const phaseId = typeof phaseObj.id === 'string' && phaseObj.id.trim() ? phaseObj.id.trim() : `fase-${index + 1}`;
      const number = typeof phaseObj.number === 'string' && phaseObj.number.trim() ? phaseObj.number.trim() : `FASE ${index + 1}`;
      const phaseTitle = typeof phaseObj.title === 'string' && phaseObj.title.trim() ? phaseObj.title.trim() : `Fase ${index + 1}`;
      const emoji = typeof phaseObj.emoji === 'string' && phaseObj.emoji.trim() ? phaseObj.emoji.trim() : index === 0 ? '🔪' : '🍳';
      const rawSteps = Array.isArray(phaseObj.steps) ? phaseObj.steps : [];
      const steps = rawSteps
        .map((step, stepIndex) => {
          if (!step || typeof step !== 'object') return null;
          const stepObj = step as Record<string, unknown>;
          const stepText = typeof stepObj.text === 'string' ? stepObj.text.trim() : '';
          if (!stepText) return null;
          return {
            id: typeof stepObj.id === 'string' && stepObj.id.trim() ? stepObj.id.trim() : `${phaseId}-raw-${stepIndex + 1}`,
            text: stepText,
            ...((typeof stepObj.timer === 'number' && stepObj.timer > 0
              ? { timer: stepObj.timer }
              : typeof stepObj.timerSec === 'number' && stepObj.timerSec > 0
              ? { timer: stepObj.timerSec }
              : {}) as { timer?: number }),
            ...((stepObj.type === 'result' || stepObj.kind === 'result') ? { type: 'result' as const } : {}),
          };
        })
        .filter(isDefined);
      if (steps.length === 0) return null;
      return {
        id: phaseId,
        number,
        title: phaseTitle,
        ...(emoji ? { emoji } : {}),
        steps,
      };
    })
    .filter(isDefined);

  if (phases.length === 0) {
    throw new Error('La receta generada no incluye fases validas.');
  }

  return {
    id,
    title,
    servings,
    ingredients,
    phases,
  };
}

function toDebugSnapshot(trace: BuildTrace): FixedRuntimeDebugSnapshot {
  return {
    rawDocument: trace.rawDocument,
    parsedSteps: trace.parsed.parsedSteps.map((entry) => ({
      phaseId: entry.phaseId,
      phaseTitle: entry.phaseTitle,
      kind: entry.parsed.kind,
      sourceText: entry.parsed.sourceText,
      reason: entry.parsed.kind === 'unknown' ? entry.parsed.reason : undefined,
      confidence: 'confidence' in entry.parsed ? entry.parsed.confidence : undefined,
    })),
    unknownSteps: trace.parsed.unknownSteps.map((entry) => ({
      phaseId: entry.phaseId,
      phaseTitle: entry.phaseTitle,
      sourceText: entry.parsed.sourceText,
      reason: entry.parsed.kind === 'unknown' ? entry.parsed.reason : undefined,
    })),
    reconstructedPhases: trace.reconstructed.phases,
    parsedAuditIssues: trace.parsedAudit.issues,
    runtimeAuditIssues: trace.runtimeAudit.issues,
    mergedAuditIssues: trace.mergedAudit.issues,
    repairActions: trace.repairActions,
  };
}

export function inspectGeneratedFixedRecipe(input: unknown, prompt: string): FixedRuntimeDebugSnapshot {
  const rawDoc = coerceRawRecipeDocument(input, prompt);
  const built = buildFixedRuntimeRecipeV2(rawDoc);
  return toDebugSnapshot(built.trace);
}

export function normalizeGeneratedFixedRecipe(input: unknown, prompt: string): NormalizedFixedRecipe {
  const rawDoc = coerceRawRecipeDocument(input, prompt);
  const built = buildFixedRuntimeRecipeV2(rawDoc);
  if (!built.ok) {
    const fatalIssues = built.audit.issues.filter((issue) => FATAL_AUDIT_CODES.includes(issue.code));
    const sourceForMessage = fatalIssues.length > 0 ? fatalIssues : built.audit.issues;
    const reasons = sourceForMessage.slice(0, 6).map((issue) => issue.code).join(', ');
    const snippets = sourceForMessage
      .slice(0, 3)
      .map((issue) => ('text' in issue ? issue.text : ''))
      .filter(Boolean)
      .join(' | ');
    throw new Error(
      `recipe_invalid: ${reasons || 'AUDIT_FAILED'}${snippets ? ` :: ${snippets}` : ''} [recoverable_count: ${built.diagnostics.recoverableCount}] [fatal_count: ${built.diagnostics.fatalCount}]`,
    );
  }
  return built.recipe;
}

export function normalizeGeneratedFixedRecipeWithDiagnostics(
  input: unknown,
  prompt: string,
): { recipe: NormalizedFixedRecipe; diagnostics: FixedRuntimeDiagnostics } {
  const rawDoc = coerceRawRecipeDocument(input, prompt);
  const built = buildFixedRuntimeRecipeV2(rawDoc);
  if (!built.ok) {
    const fatalIssues = built.audit.issues.filter((issue) => FATAL_AUDIT_CODES.includes(issue.code));
    const sourceForMessage = fatalIssues.length > 0 ? fatalIssues : built.audit.issues;
    const reasons = sourceForMessage.slice(0, 6).map((issue) => issue.code).join(', ');
    const snippets = sourceForMessage
      .slice(0, 3)
      .map((issue) => ('text' in issue ? issue.text : ''))
      .filter(Boolean)
      .join(' | ');
    throw new Error(
      `recipe_invalid: ${reasons || 'AUDIT_FAILED'}${snippets ? ` :: ${snippets}` : ''} [recoverable_count: ${built.diagnostics.recoverableCount}] [fatal_count: ${built.diagnostics.fatalCount}]`,
    );
  }
  return {
    recipe: built.recipe,
    diagnostics: built.diagnostics,
  };
}
