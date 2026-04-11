export type PreviewClassification =
  | 'runtime_plausible'
  | 'editorial_pero_rescatable'
  | 'residuo_o_truncado'
  | 'invalido_para_runtime'
  | 'falso_positivo_del_parser';

type ParsedStepLike = {
  kind?: string;
  sourceText?: string;
  reason?: string;
};

type IssueLike = {
  code?: string;
  text?: string;
  ingredientRef?: string;
};

type PipelineLike = {
  parsedSteps?: ParsedStepLike[];
  unknownSteps?: ParsedStepLike[];
  mergedAuditIssues?: IssueLike[];
};

type DebugAttemptLike = {
  attempt?: string;
  promptEffective?: string;
  rawModelOutput?: string;
  pipeline?: PipelineLike;
};

type DebugRawLike = {
  enabled?: boolean;
  attempts?: DebugAttemptLike[];
};

export type AttemptClassSummary = {
  attempt: string;
  promptEffective: string;
  rawModelOutput: string;
  counts: Record<PreviewClassification, number>;
  topIssues: string[];
  topUnknown: string[];
};

export type MatrixRowResult = {
  phrase: string;
  expected: PreviewClassification;
  parserCurrent: string;
  status: 'match' | 'mismatch' | 'not_found';
};

export type PreviewObservatory = {
  enabled: boolean;
  attempts: AttemptClassSummary[];
  matrix: MatrixRowResult[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyParsedStep(step: ParsedStepLike): PreviewClassification {
  const kind = (step.kind ?? '').toLowerCase();
  const reason = (step.reason ?? '').toLowerCase();
  const text = normalize(step.sourceText ?? '');

  if (kind === 'add_ingredient' || kind === 'action' || kind === 'heat_change' || kind === 'wait' || kind === 'result' || kind === 'serve') {
    return 'runtime_plausible';
  }

  if (kind === 'unknown' && (reason === 'truncated' || text.length <= 10 || /^[a-záéíóúñ]+\.?$/.test(text))) {
    return 'residuo_o_truncado';
  }

  if (
    kind === 'unknown' &&
    (text.startsWith('agregar ') || text.startsWith('destapar ') || text.startsWith('tapar ') || text.startsWith('retirar '))
  ) {
    return 'falso_positivo_del_parser';
  }

  if (kind === 'unknown' && (reason === 'forbidden_construct' || reason === 'multi_action')) {
    return 'invalido_para_runtime';
  }

  if (kind === 'unknown' && (reason === 'editorial' || /hasta que|luego|despues|aprox|aproximadamente/.test(text))) {
    return 'editorial_pero_rescatable';
  }

  if (kind === 'unknown' && reason === 'ambiguous') {
    return 'editorial_pero_rescatable';
  }

  return 'invalido_para_runtime';
}

const MANUAL_MATRIX: Array<{ phrase: string; expected: PreviewClassification }> = [
  { phrase: 'Agregar la cebolla picada a la olla con el aceite restante.', expected: 'runtime_plausible' },
  { phrase: 'Agregar el pimiento rojo picado a la olla.', expected: 'runtime_plausible' },
  { phrase: 'agregar 1 hoja de laurel.', expected: 'runtime_plausible' },
  { phrase: 'Destapar la olla.', expected: 'runtime_plausible' },
  { phrase: 'Tapar la olla.', expected: 'runtime_plausible' },
  { phrase: 'Mantener la olla tapada.', expected: 'editorial_pero_rescatable' },
  { phrase: 'hasta que esté dorado', expected: 'editorial_pero_rescatable' },
  { phrase: 'oscurezca.', expected: 'residuo_o_truncado' },
  { phrase: 'luego mezclar todo', expected: 'invalido_para_runtime' },
  { phrase: 'dorar por todos sus lados durante 8 minutos', expected: 'invalido_para_runtime' },
  { phrase: 'Resultado: cebolla translúcida', expected: 'runtime_plausible' },
  { phrase: 'TIMER: 3:00', expected: 'runtime_plausible' },
];

function parsedKindLabel(step: ParsedStepLike | undefined): string {
  if (!step) return 'not_found';
  if (step.kind === 'unknown') {
    return step.reason ? `unknown(${step.reason})` : 'unknown';
  }
  return step.kind ?? 'unknown';
}

function countByClass(parsedSteps: ParsedStepLike[]): Record<PreviewClassification, number> {
  const base: Record<PreviewClassification, number> = {
    runtime_plausible: 0,
    editorial_pero_rescatable: 0,
    residuo_o_truncado: 0,
    invalido_para_runtime: 0,
    falso_positivo_del_parser: 0,
  };
  parsedSteps.forEach((step) => {
    const key = classifyParsedStep(step);
    base[key] += 1;
  });
  return base;
}

export function buildPreviewObservatory(debugRaw: unknown): PreviewObservatory {
  const raw = (debugRaw ?? {}) as DebugRawLike;
  const attempts = Array.isArray(raw.attempts) ? raw.attempts : [];

  const summarizedAttempts: AttemptClassSummary[] = attempts.map((attempt) => {
    const pipeline = (attempt.pipeline ?? {}) as PipelineLike;
    const parsedSteps = Array.isArray(pipeline.parsedSteps) ? pipeline.parsedSteps : [];
    const issues = Array.isArray(pipeline.mergedAuditIssues) ? pipeline.mergedAuditIssues : [];
    const unknown = Array.isArray(pipeline.unknownSteps) ? pipeline.unknownSteps : [];
    return {
      attempt: attempt.attempt ?? 'attempt',
      promptEffective: attempt.promptEffective ?? '',
      rawModelOutput: attempt.rawModelOutput ?? '',
      counts: countByClass(parsedSteps),
      topIssues: issues
        .slice(0, 5)
        .map((issue) => `${issue.code ?? 'ISSUE'}${issue.text ? `: ${issue.text}` : issue.ingredientRef ? `: ${issue.ingredientRef}` : ''}`),
      topUnknown: unknown.slice(0, 5).map((item) => item.sourceText ?? '').filter(Boolean),
    };
  });

  const firstAttemptPipeline = (attempts[0]?.pipeline ?? {}) as PipelineLike;
  const firstParsedSteps = Array.isArray(firstAttemptPipeline.parsedSteps) ? firstAttemptPipeline.parsedSteps : [];

  const matrix: MatrixRowResult[] = MANUAL_MATRIX.map((row) => {
    const target = normalize(row.phrase);
    const found = firstParsedSteps.find((step) => normalize(step.sourceText ?? '').includes(target) || target.includes(normalize(step.sourceText ?? '')));
    const parserCurrent = parsedKindLabel(found);
    const parserClass = found ? classifyParsedStep(found) : null;
    return {
      phrase: row.phrase,
      expected: row.expected,
      parserCurrent,
      status: !found ? 'not_found' : parserClass === row.expected ? 'match' : 'mismatch',
    };
  });

  return {
    enabled: Boolean(raw.enabled),
    attempts: summarizedAttempts,
    matrix,
  };
}
