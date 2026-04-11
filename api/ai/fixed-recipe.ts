import { readRequestBody, sendJson } from './shared.js';
import {
  buildFixedRuntimeSystemPrompt,
  inspectGeneratedFixedRecipe,
  normalizeGeneratedFixedRecipeWithDiagnostics,
} from './fixedRecipeRuntime.js';
import {
  buildFixedRecipeJsonContractPrompt,
  validateFixedRecipeJson,
  type FixedRecipeSchemaValidation,
} from './fixedRecipeSchema.js';

type GoogleGenerateResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

type RecipeInvalidFeedback = {
  codes: string[];
  snippets: string[];
};

type FixedRecipeRequestMode = 'generate' | 'preview';
type AIProvider = 'google_gemini' | 'openai';
type GenerateCallResult = { rawText: string; effectivePrompt: string; provider: AIProvider };
type DebugAttemptName = 'first' | 'retry' | 'preview-shadow-generate';
type JsonPipelineLayer = {
  rawModelOutput: string;
  parsedJson: unknown | null;
  schemaValidation: FixedRecipeSchemaValidation;
  parseError?: string;
  normalizedOutput?: unknown;
  normalizationError?: string;
};

const PREVIEW_INSTRUCTIONS = [
  'Preview principal: JSON pre-normalización.',
  'No devuelvas texto libre ni markdown fuera del JSON.',
  'Debe cumplir exactamente el schema de cooking runtime recipe.',
];
const DEFAULT_PROVIDER_TIMEOUT_MS = 25_000;

function resolveProviderTimeoutMs(): number {
  const raw = process.env.FIXED_RUNTIME_PROVIDER_TIMEOUT_MS;
  if (!raw) return DEFAULT_PROVIDER_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 5_000) return DEFAULT_PROVIDER_TIMEOUT_MS;
  return parsed;
}

function buildAttemptSnapshot(pipeline: unknown): {
  topIssues: string[];
  topUnknownSnippets: string[];
} {
  const root = (pipeline ?? {}) as {
    mergedAuditIssues?: Array<{ code?: string; text?: string; ingredientRef?: string }>;
    unknownSteps?: Array<{ sourceText?: string }>;
  };
  const topIssues = (Array.isArray(root.mergedAuditIssues) ? root.mergedAuditIssues : [])
    .slice(0, 5)
    .map((issue) => `${issue.code ?? 'ISSUE'}${issue.text ? `: ${issue.text}` : issue.ingredientRef ? `: ${issue.ingredientRef}` : ''}`);
  const topUnknownSnippets = (Array.isArray(root.unknownSteps) ? root.unknownSteps : [])
    .slice(0, 5)
    .map((item) => item.sourceText ?? '')
    .filter(Boolean);
  return { topIssues, topUnknownSnippets };
}

function buildDebugAttempt(
  attempt: DebugAttemptName,
  promptEffective: string,
  rawModelOutput: string,
  parsedPayload: unknown | null,
  userPrompt: string,
): {
  attempt: DebugAttemptName;
  promptEffective: string;
  rawModelOutput: string;
  pipeline?: unknown;
  snapshot?: { topIssues: string[]; topUnknownSnippets: string[] };
  inspectError?: string;
} {
  if (parsedPayload == null) {
    return {
      attempt,
      promptEffective,
      rawModelOutput,
      inspectError: 'No se pudo inspeccionar payload pre-normalización porque el JSON no parseó.',
    };
  }
  try {
    const pipeline = inspectGeneratedFixedRecipe(parsedPayload, userPrompt);
    return {
      attempt,
      promptEffective,
      rawModelOutput,
      pipeline,
      snapshot: buildAttemptSnapshot(pipeline),
    };
  } catch (error) {
    return {
      attempt,
      promptEffective,
      rawModelOutput,
      inspectError:
        error instanceof Error
          ? error.message
          : 'No se pudo inspeccionar payload pre-normalización.',
    };
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseModelJsonContent(content: string): unknown {
  const direct = content.trim();
  try {
    return JSON.parse(direct);
  } catch {}

  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) {
    try {
      return JSON.parse(fenced);
    } catch {}
  }

  const extracted = extractFirstJsonObject(direct);
  if (extracted) {
    try {
      return JSON.parse(extracted);
    } catch {}
  }

  throw new Error('No se pudo interpretar la respuesta de Google AI.');
}

function parseRecipeInvalidFeedback(message: string): RecipeInvalidFeedback {
  const normalized = message.trim();
  if (!normalized.toLowerCase().startsWith('recipe_invalid')) {
    return { codes: [], snippets: [] };
  }
  const [, detail = ''] = normalized.split(':', 2);
  const [codesPart = '', snippetsPart = ''] = detail.split('::').map((part) => part.trim());
  const codes = codesPart
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const snippets = snippetsPart
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
  return { codes, snippets };
}

function buildRetryPrompt(userPrompt: string, feedback: RecipeInvalidFeedback): string {
  const codeLine = feedback.codes.length > 0 ? feedback.codes.join(', ') : 'SIN_CODIGOS';
  const snippetLine = feedback.snippets.length > 0 ? feedback.snippets.join(' | ') : 'SIN_SNIPPETS';
  return [
    userPrompt,
    '',
    'Corrección obligatoria para Runtime Fijo v2:',
    `Errores detectados: ${codeLine}`,
    `Fragmentos conflictivos: ${snippetLine}`,
    'Reglas obligatorias:',
    '- Convertir frases de estado (ej: "esten tiernos", "reduzca", "espese") en steps "Resultado: ...".',
    '- Usa acción explícita para mantener/sazonar/reincorporar.',
    '- No devolver UNKNOWN_STEP, ni texto truncado, ni resultados con acciones.',
    '- Mantener steps atómicos y JSON válido.',
  ].join('\n');
}

function buildSchemaRetryPrompt(
  userPrompt: string,
  schemaErrors: FixedRecipeSchemaValidation['errors'],
  parseError?: string,
): string {
  const compactErrors = schemaErrors
    .slice(0, 8)
    .map((error) => `${error.path} :: ${error.keyword} :: ${error.message}`)
    .join('\n');
  const parseLine = parseError ? `Parse error: ${parseError}` : 'Parse error: none';
  return [
    userPrompt,
    '',
    'Corrección obligatoria para salida JSON runtime:',
    '- Devuelve SOLO un JSON válido (sin markdown, sin texto extra).',
    '- Respeta exactamente el schema compartido.',
    '- Corrige los errores indicados.',
    parseLine,
    compactErrors ? `Schema errors:\n${compactErrors}` : 'Schema errors: none',
  ].join('\n');
}

function buildJsonPrompt(userPrompt: string): string {
  return buildFixedRecipeJsonContractPrompt(buildFixedRuntimeSystemPrompt(userPrompt));
}

function isRateLimitMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('resource_exhausted') || normalized.includes('"code": 429') || normalized.includes('rate limit');
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = resolveProviderTimeoutMs()): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`provider_timeout: El proveedor IA superó ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw new Error(
      `provider_unavailable: ${
        error instanceof Error ? error.message : 'No se pudo conectar con el proveedor IA.'
      }`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildJsonPipelineLayer(rawModelOutput: string, parsedJson: unknown | null, parseError?: string): JsonPipelineLayer {
  if (parsedJson == null) {
    return {
      rawModelOutput,
      parsedJson: null,
      parseError: parseError ?? 'No se pudo interpretar JSON.',
      schemaValidation: {
        valid: false,
        errors: [{ path: '/', message: parseError ?? 'Invalid JSON', keyword: 'parse' }],
      },
    };
  }
  const schemaValidation = validateFixedRecipeJson(parsedJson);
  return {
    rawModelOutput,
    parsedJson,
    schemaValidation,
  };
}

async function callGoogle(apiKey: string, userPrompt: string): Promise<GenerateCallResult> {
  const effectivePrompt = buildJsonPrompt(userPrompt);
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: effectivePrompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text()) || 'Google AI no respondió correctamente.';
    if (response.status === 429 || isRateLimitMessage(detail)) {
      throw new Error(`provider_rate_limited:google_gemini:${detail}`);
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as GoogleGenerateResponse;
  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Google AI no devolvió contenido.');
  return {
    rawText: content,
    effectivePrompt,
    provider: 'google_gemini',
  };
}

async function callOpenAI(apiKey: string, userPrompt: string): Promise<GenerateCallResult> {
  const effectivePrompt = buildJsonPrompt(userPrompt);
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: effectivePrompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()) || 'OpenAI no respondió correctamente.';
    if (response.status === 429 || isRateLimitMessage(detail)) {
      throw new Error(`provider_rate_limited:openai:${detail}`);
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as OpenAIChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvió contenido.');
  return {
    rawText: content,
    effectivePrompt,
    provider: 'openai',
  };
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode: FixedRecipeRequestMode = body.mode === 'preview' ? 'preview' : 'generate';
    const wantsDebugRaw = Boolean(body.debugRaw);
    const debugRawEnabled = wantsDebugRaw && (process.env.NODE_ENV !== 'production' || process.env.FIXED_RUNTIME_DEBUG_RAW === '1');
    if (!prompt) {
      sendJson(res, 400, { error: 'Debes describir la receta que quieres generar.' });
      return;
    }

    const googleApiKey = process.env.GOOGLE_API_KEY?.trim() ?? '';
    const openAIApiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
    if (!googleApiKey && !openAIApiKey) {
      sendJson(res, 500, { error: 'No hay API key configurada para generar recetas con IA.' });
      return;
    }

    const callProviderGenerate = async (requestPrompt: string): Promise<GenerateCallResult> => {
      if (googleApiKey) {
        try {
          return await callGoogle(googleApiKey, requestPrompt);
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (openAIApiKey && message.startsWith('provider_rate_limited:google_gemini:')) {
            return callOpenAI(openAIApiKey, requestPrompt);
          }
          throw error;
        }
      }
      return callOpenAI(openAIApiKey, requestPrompt);
    };

    if (mode === 'preview') {
      const generated = await callProviderGenerate(prompt);
      let parsedJson: unknown | null = null;
      let parseError: string | undefined;
      try {
        parsedJson = parseModelJsonContent(generated.rawText);
      } catch (error) {
        parseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.';
      }
      const firstJsonPreview = buildJsonPipelineLayer(generated.rawText, parsedJson, parseError);
      const firstAttemptDebug = debugRawEnabled
        ? buildDebugAttempt(
            'preview-shadow-generate',
            generated.effectivePrompt,
            generated.rawText,
            parsedJson,
            prompt,
          )
        : null;

      let jsonPreview = firstJsonPreview;
      let retryApplied = false;
      const debugAttempts: Array<ReturnType<typeof buildDebugAttempt>> = [];
      if (firstAttemptDebug) debugAttempts.push(firstAttemptDebug);

      if (!firstJsonPreview.schemaValidation.valid || firstJsonPreview.parsedJson == null) {
        const retryPrompt = buildSchemaRetryPrompt(
          prompt,
          firstJsonPreview.schemaValidation.errors,
          firstJsonPreview.parseError,
        );
        const retryGenerated = await callProviderGenerate(retryPrompt);
        let retryParsedJson: unknown | null = null;
        let retryParseError: string | undefined;
        try {
          retryParsedJson = parseModelJsonContent(retryGenerated.rawText);
        } catch (error) {
          retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.';
        }
        jsonPreview = buildJsonPipelineLayer(retryGenerated.rawText, retryParsedJson, retryParseError);
        retryApplied = true;
        if (debugRawEnabled) {
          debugAttempts.push(
            buildDebugAttempt(
              'retry',
              retryGenerated.effectivePrompt,
              retryGenerated.rawText,
              retryParsedJson,
              prompt,
            ),
          );
        }
      }

      if (jsonPreview.schemaValidation.valid && jsonPreview.parsedJson != null) {
        try {
          const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(jsonPreview.parsedJson, prompt);
          jsonPreview.normalizedOutput = normalized.recipe;
        } catch (error) {
          jsonPreview.normalizationError =
            error instanceof Error ? error.message : 'No se pudo normalizar la receta.';
        }
      }
      const previewDebug = {
        instructions: PREVIEW_INSTRUCTIONS,
        userPrompt: prompt,
        composedPromptForGoogle: generated.effectivePrompt,
        generationContractTemplate: buildFixedRuntimeSystemPrompt(),
        generationContractEffective: generated.effectivePrompt,
      };
      let debugRaw: unknown = undefined;
      if (debugRawEnabled) {
        debugRaw = {
          enabled: true,
          attempts: debugAttempts,
        };
      }
      sendJson(res, 200, {
        jsonPreview,
        previewDebug,
        retryApplied,
        ...(debugRawEnabled ? { debugRaw } : {}),
        provider: generated.provider,
      });
      return;
    }

    const firstGenerated = await callProviderGenerate(prompt);
    let firstParsed: unknown | null = null;
    let firstParseError: string | undefined;
    try {
      firstParsed = parseModelJsonContent(firstGenerated.rawText);
    } catch (error) {
      firstParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.';
    }
    const firstJsonLayer = buildJsonPipelineLayer(firstGenerated.rawText, firstParsed, firstParseError);
    const firstDebugRaw = debugRawEnabled
      ? buildDebugAttempt('first', firstGenerated.effectivePrompt, firstGenerated.rawText, firstParsed, prompt)
      : null;
    const parseOrSchemaFailed = !firstParsed || !firstJsonLayer.schemaValidation.valid;
    let candidateParsed = firstParsed;
    let candidateJsonLayer = firstJsonLayer;
    let candidateProvider: AIProvider = firstGenerated.provider;
    const debugAttempts: Array<ReturnType<typeof buildDebugAttempt>> = [];
    if (firstDebugRaw) debugAttempts.push(firstDebugRaw);
    if (parseOrSchemaFailed) {
      const schemaRetryPrompt = buildSchemaRetryPrompt(
        prompt,
        firstJsonLayer.schemaValidation.errors,
        firstJsonLayer.parseError,
      );
      const retryGenerated = await callProviderGenerate(schemaRetryPrompt);
      let retryParsed: unknown | null = null;
      let retryParseError: string | undefined;
      try {
        retryParsed = parseModelJsonContent(retryGenerated.rawText);
      } catch (error) {
        retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.';
      }
      const retryJsonLayer = buildJsonPipelineLayer(retryGenerated.rawText, retryParsed, retryParseError);
      const retryDebugRaw = debugRawEnabled
        ? buildDebugAttempt('retry', retryGenerated.effectivePrompt, retryGenerated.rawText, retryParsed, prompt)
        : null;
      if (retryDebugRaw) debugAttempts.push(retryDebugRaw);

      if (!retryParsed) {
      sendJson(res, 422, {
        error: `parse_invalid [retry_after: ${firstJsonLayer.parseError ?? 'schema_invalid'}]`,
        valid: false,
        errors: retryJsonLayer.schemaValidation.errors,
        rawModelOutput: retryJsonLayer.rawModelOutput,
        parsedJson: retryJsonLayer.parsedJson,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: debugAttempts } } : {}),
        provider: retryGenerated.provider,
      });
      return;
      }
      if (!retryJsonLayer.schemaValidation.valid) {
      sendJson(res, 422, {
        error: `schema_invalid [retry_after: ${firstJsonLayer.parseError ?? 'schema_invalid'}]`,
        valid: false,
        errors: retryJsonLayer.schemaValidation.errors,
        rawModelOutput: retryJsonLayer.rawModelOutput,
        parsedJson: retryJsonLayer.parsedJson,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: debugAttempts } } : {}),
        provider: retryGenerated.provider,
      });
      return;
      }
      candidateParsed = retryParsed;
      candidateJsonLayer = retryJsonLayer;
      candidateProvider = retryGenerated.provider;
    }
    if (!candidateParsed || !candidateJsonLayer.schemaValidation.valid) {
      sendJson(res, 422, {
        error: 'schema_invalid',
        valid: false,
        errors: candidateJsonLayer.schemaValidation.errors,
        rawModelOutput: candidateJsonLayer.rawModelOutput,
        parsedJson: candidateJsonLayer.parsedJson,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: debugAttempts } } : {}),
        provider: firstGenerated.provider,
      });
      return;
    }
    try {
      const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(candidateParsed, prompt);
      sendJson(res, 200, {
        recipe: normalized.recipe,
        diagnostics: normalized.diagnostics,
        jsonPipeline: candidateJsonLayer,
        ...(debugRawEnabled ? { debugRaw: { enabled: true, attempts: debugAttempts } } : {}),
        provider: candidateProvider,
      });
      return;
    } catch (firstError) {
      const firstMessage = firstError instanceof Error ? firstError.message : 'No se pudo normalizar la receta.';
      if (!firstMessage.toLowerCase().startsWith('recipe_invalid')) {
        throw firstError;
      }

      const feedback = parseRecipeInvalidFeedback(firstMessage);
      const retryPrompt = buildRetryPrompt(prompt, feedback);
      const retryGenerated = await callProviderGenerate(retryPrompt);
      let retryParsed: unknown | null = null;
      let retryParseError: string | undefined;
      try {
        retryParsed = parseModelJsonContent(retryGenerated.rawText);
      } catch (error) {
        retryParseError = error instanceof Error ? error.message : 'No se pudo interpretar JSON.';
      }
      const retryJsonLayer = buildJsonPipelineLayer(retryGenerated.rawText, retryParsed, retryParseError);
      const retryDebugRaw = debugRawEnabled
        ? buildDebugAttempt('retry', retryGenerated.effectivePrompt, retryGenerated.rawText, retryParsed, prompt)
        : null;
      if (!retryParsed) {
        sendJson(res, 422, {
          error: `parse_invalid [retry_after: ${firstMessage}]`,
          valid: false,
          errors: retryJsonLayer.schemaValidation.errors,
          rawModelOutput: retryJsonLayer.rawModelOutput,
          parsedJson: retryJsonLayer.parsedJson,
          ...(debugRawEnabled
            ? {
                debugRaw: {
                  enabled: true,
                  attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean),
                },
              }
            : {}),
          provider: retryGenerated.provider,
        });
        return;
      }
      if (!retryJsonLayer.schemaValidation.valid) {
        sendJson(res, 422, {
          error: `schema_invalid [retry_after: ${firstMessage}]`,
          valid: false,
          errors: retryJsonLayer.schemaValidation.errors,
          rawModelOutput: retryJsonLayer.rawModelOutput,
          parsedJson: retryJsonLayer.parsedJson,
          ...(debugRawEnabled
            ? {
                debugRaw: {
                  enabled: true,
                  attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean),
                },
              }
            : {}),
          provider: retryGenerated.provider,
        });
        return;
      }
      try {
        const normalized = normalizeGeneratedFixedRecipeWithDiagnostics(retryParsed, prompt);
        sendJson(res, 200, {
          recipe: normalized.recipe,
          diagnostics: normalized.diagnostics,
          jsonPipeline: retryJsonLayer,
          ...(debugRawEnabled
            ? {
                debugRaw: {
                  enabled: true,
                  attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean),
                },
              }
            : {}),
          provider: retryGenerated.provider,
        });
        return;
      } catch (secondError) {
        const secondMessage = secondError instanceof Error ? secondError.message : 'recipe_invalid: AUDIT_FAILED';
        if (debugRawEnabled) {
          sendJson(res, 422, {
            error: `${secondMessage} [retry_after: ${firstMessage}]`,
            debugRaw: {
              enabled: true,
              attempts: [firstDebugRaw, retryDebugRaw].filter(Boolean),
            },
          });
          return;
        }
        throw new Error(`${secondMessage} [retry_after: ${firstMessage}]`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar la receta.';
    if (message.startsWith('provider_timeout')) {
      sendJson(res, 504, { error: message });
      return;
    }
    if (message.startsWith('provider_rate_limited')) {
      sendJson(res, 429, { error: message });
      return;
    }
    if (message.startsWith('provider_unavailable')) {
      sendJson(res, 502, { error: message });
      return;
    }
    sendJson(res, 500, { error: message });
  }
}
