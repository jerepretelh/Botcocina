import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewObservatory } from './previewObservatory';

test('buildPreviewObservatory summarizes attempts with class counts and matrix mapping', () => {
  const debugRaw = {
    enabled: true,
    attempts: [
      {
        attempt: 'preview-shadow-generate',
        promptEffective: 'system\nuser',
        rawModelOutput: '{"id":"x"}',
        pipeline: {
          parsedSteps: [
            { kind: 'add_ingredient', sourceText: 'Agregar la cebolla picada a la olla con el aceite restante.' },
            { kind: 'unknown', sourceText: 'agregar 1 hoja de laurel.', reason: 'ambiguous' },
            { kind: 'unknown', sourceText: 'oscurezca.', reason: 'ambiguous' },
            { kind: 'unknown', sourceText: 'Destapar la olla.', reason: 'ambiguous' },
          ],
          unknownSteps: [
            { sourceText: 'agregar 1 hoja de laurel.' },
            { sourceText: 'oscurezca.' },
          ],
          mergedAuditIssues: [
            { code: 'UNKNOWN_STEP', text: 'agregar 1 hoja de laurel.' },
            { code: 'UNKNOWN_STEP', text: 'oscurezca.' },
          ],
        },
      },
    ],
  };

  const observatory = buildPreviewObservatory(debugRaw);
  assert.equal(observatory.enabled, true);
  assert.equal(observatory.attempts.length, 1);
  const first = observatory.attempts[0];
  assert.equal(first.counts.runtime_plausible >= 1, true);
  assert.equal(first.counts.falso_positivo_del_parser >= 1, true);
  assert.equal(first.topIssues.length >= 1, true);
  assert.equal(first.topUnknown.length >= 1, true);
  assert.equal(observatory.matrix.length >= 10, true);
});
