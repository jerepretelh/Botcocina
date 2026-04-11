import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFixedRuntimeRecipeV2,
  expandPhaseToAtomicSteps,
  inspectGeneratedFixedRecipe,
  planPhaseSkeleton,
  repairRecipeDocument,
} from '../../../../api/ai/fixedRecipeRuntime';

test('buildFixedRuntimeRecipeV2 rebuilds runtime recipe with canonical timer steps', () => {
  const raw = {
    id: 'arroz-con-pollo',
    title: 'Arroz con pollo',
    servings: 3,
    ingredients: [
      {
        title: 'Base',
        items: ['30 ml aceite', '2 dientes de ajo picado', '200 g cebolla en brunoise', '300 g arroz', '750 ml caldo de pollo'],
      },
    ],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Calentar olla a fuego medio' },
          { id: 's2', text: 'Agregar 30 ml aceite' },
          { id: 's3', text: 'Sofreír ajo', timer: 60 },
          { id: 's4', text: 'Agregar 200 g cebolla en brunoise' },
          { id: 's5', text: 'Agregar 300 g arroz' },
          { id: 's6', text: 'Nacarar arroz', timer: 120 },
          { id: 's7', text: 'Agregar 750 ml caldo de pollo' },
          { id: 's8', text: 'Llevar arroz a hervor', timer: 300 },
          { id: 's9', text: 'Esperar secado de arroz', timer: 180 },
          { id: 's10', text: 'Tapar arroz' },
          { id: 's11', text: 'Bajar arroz a fuego mínimo' },
          { id: 's12', text: 'Cocinar arroz tapado', timer: 720 },
          { id: 's13', text: 'Reposar arroz tapado', timer: 300 },
          { id: 's14', text: 'Resultado: reposo completo', type: 'result' },
        ],
      },
    ],
  };

  const built = buildFixedRuntimeRecipeV2(raw);
  assert.equal(built.ok, true, built.ok ? '' : JSON.stringify(built.audit, null, 2));
  if (!built.ok) return;
  assert.equal(built.recipe.servings, 3);
  const phase = built.recipe.phases.find((item) => /cocci/i.test(item.title));
  assert.ok(phase);
  const texts = phase.steps.map((step) => step.text);
  const allTexts = built.recipe.phases.flatMap((p) => p.steps.map((s) => s.text));
  assert.equal(texts.some((text) => /Agregar 300 g arroz/i.test(text)), true, JSON.stringify(texts, null, 2));
  assert.equal(texts.some((text) => /Nacarar arroz/i.test(text)), true);
  assert.equal(texts.some((text) => /TIMER: 2:00/i.test(text)), true);
  assert.equal(texts.some((text) => /Llevar arroz a hervor/i.test(text)), true);
  assert.equal(texts.some((text) => /TIMER: 5:00/i.test(text)), true);
  assert.equal(allTexts.some((text) => /^Resultado:/i.test(text)), true);
});

test('buildFixedRuntimeRecipeV2 fails hard for invalid result containing action and timer', () => {
  const raw = {
    id: 'pollo',
    title: 'Pollo roto',
    servings: 4,
    ingredients: [{ title: 'Base', items: ['800 g muslos de pollo'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Resultado: Sellar el pollo por todos sus lados durante 5 minutos, hasta que esté dorado' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(
    result.audit.issues.some((issue) => issue.code === 'UNKNOWN_STEP' || issue.code === 'INVALID_RESULT_CONTAINS_ACTION' || issue.code === 'TIMER_WITHOUT_CAUSE'),
    true,
  );
});

test('buildFixedRuntimeRecipeV2 fails when timer has no causal action', () => {
  const raw = {
    id: 'timer-roto',
    title: 'Timer roto',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['300 g arroz'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [{ id: 's1', text: 'TIMER: 3:00' }],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.audit.issues.some((issue) => issue.code === 'TIMER_WITHOUT_CAUSE'), true);
});

test('buildFixedRuntimeRecipeV2 salvages short state clauses and cubrir action without invalid audit', () => {
  const raw = {
    id: 'arroz-pollo-frag',
    title: 'Arroz con pollo',
    servings: 3,
    ingredients: [{ title: 'Base', items: ['300 g arroz', '800 g pollo', '30 ml aceite'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Agregar 300 g arroz' },
          { id: 's2', text: 'esté translúcida.' },
          { id: 's3', text: 'Cubrir la sartén nuevamente.' },
          { id: 's4', text: 'esté tierno.' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const allTexts = result.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text));
  assert.equal(allTexts.some((text) => /^Tapar /i.test(text)), true);
  assert.equal(allTexts.some((text) => /Resultado: .*transl/i.test(text)), true);
});

test('buildFixedRuntimeRecipeV2 splits implicit result conjunctions into canonical result steps', () => {
  const raw = {
    id: 'reduccion',
    title: 'Salsa reducida',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['300 ml caldo'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Llevar salsa a hervor' },
          { id: 's2', text: 'reduzca y espese.' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const resultTexts = result.recipe.phases.flatMap((phase) => phase.steps.filter((step) => step.type === 'result').map((step) => step.text));
  assert.equal(resultTexts.length >= 2, true, JSON.stringify(result.recipe, null, 2));
  assert.equal(resultTexts.some((text) => /reduzca/i.test(text)), true);
  assert.equal(resultTexts.some((text) => /espese/i.test(text)), true);
});

test('buildFixedRuntimeRecipeV2 treats "hasta que esté translúcida" as result', () => {
  const raw = {
    id: 'translucida',
    title: 'Arroz',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['300 g arroz'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Nacarar arroz' },
          { id: 's2', text: 'hasta que esté translúcida.' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const allTexts = result.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text));
  assert.equal(allTexts.some((text) => /^Resultado:/i.test(text) && /transl/i.test(text)), true, JSON.stringify(allTexts, null, 2));
});

test('buildFixedRuntimeRecipeV2 maps mantener/sazonar and auto-injects causal steps before orphan results', () => {
  const raw = {
    id: 'lenguaje-natural',
    title: 'Pollo guisado',
    servings: 4,
    ingredients: [{ title: 'Base', items: ['800 g pollo', '200 g cebolla', '150 g pimiento'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Mantener la olla tapada.' },
          { id: 's2', text: 'Sazonar con sal y pimienta negra al gusto.' },
          { id: 's3', text: 'Resultado: Cebolla translúcida.' },
          { id: 's4', text: 'Resultado: Pimiento tierno.' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const allTexts = result.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text));
  assert.equal(allTexts.some((text) => /Cocinar .*tapado/i.test(text)), true, JSON.stringify(allTexts, null, 2));
  assert.equal(allTexts.some((text) => /Condimentar/i.test(text)), true, JSON.stringify(allTexts, null, 2));
  assert.equal(allTexts.filter((text) => /^Resultado:/i.test(text)).length >= 2, true, JSON.stringify(allTexts, null, 2));
});

test('buildFixedRuntimeRecipeV2 handles remover/integrar and absorbed-liquid result clause', () => {
  const raw = {
    id: 'regresion-liquido',
    title: 'Arroz',
    servings: 3,
    ingredients: [{ title: 'Base', items: ['300 g arroz', '750 ml caldo', '1 cdta especias'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Remover bien para integrar las especias.' },
          { id: 's2', text: 'el líquido se haya absorbido casi por completo.' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const allTexts = result.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text));
  assert.equal(allTexts.some((text) => /^Incorporar|^Condimentar|^Cocinar|^Sofreír|^Mezclar/i.test(text)), true, JSON.stringify(allTexts, null, 2));
  assert.equal(allTexts.some((text) => /^Resultado:/i.test(text) && /absorbid/i.test(text)), true, JSON.stringify(allTexts, null, 2));
});

test('buildFixedRuntimeRecipeV2 drops low-value generic duplicates and prefers vessel heat target', () => {
  const raw = {
    id: 'noisy-runtime',
    title: 'Noisy',
    servings: 3,
    ingredients: [{ title: 'Base', items: ['300 g arroz', '2 dientes de ajo'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [
          { id: 'p1', text: 'Mezclar' },
          { id: 'p2', text: 'Mezclar' },
          { id: 'p3', text: 'Picar ajo' },
        ],
      },
      {
        id: 'fase-2',
        number: 'FASE 2',
        title: 'Cocción',
        steps: [
          { id: 'c1', text: 'Calentar a fuego medio' },
          { id: 'c2', text: 'Incorporar arroz' },
          { id: 'c3', text: 'Incorporar arroz' },
          { id: 'c4', text: 'Agregar 300 g arroz' },
          { id: 'c5', text: 'Nacarar arroz' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.audit, null, 2));
  if (!result.ok) return;
  const allTexts = result.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text));
  assert.equal(allTexts.some((text) => /^Mezclar$/i.test(text)), false, JSON.stringify(allTexts, null, 2));
  assert.equal(allTexts.filter((text) => /^Incorporar arroz$/i.test(text)).length, 0, JSON.stringify(allTexts, null, 2));
  assert.equal(allTexts.some((text) => /^Calentar olla a fuego medio$/i.test(text)), true, JSON.stringify(allTexts, null, 2));
});

test('buildFixedRuntimeRecipeV2 fails result-with-action clauses as invalid', () => {
  const raw = {
    id: 'result-action',
    title: 'Result action',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['400 g pollo'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [{ id: 's1', text: 'Resultado: Retirar el pollo dorado de la olla y reservar.' }],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.audit.issues.some((issue) => issue.code === 'UNKNOWN_STEP' || issue.code === 'INVALID_RESULT_CONTAINS_ACTION'), true, JSON.stringify(result.audit.issues, null, 2));
});

test('planner + expander + repair pass keep canonical shape and collect repair actions', () => {
  const raw = {
    id: 'pipeline',
    title: 'Pipeline',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['300 g arroz'] }],
    phases: [
      {
        id: 'f1',
        number: 'FASE 1',
        title: 'coccion',
        steps: [{ id: 's1', text: 'Agregar 300 g arroz y mezclar' }, { id: 's2', text: 'Mezclar' }],
      },
    ],
  };

  const planned = planPhaseSkeleton(raw as any);
  const expanded = expandPhaseToAtomicSteps(planned as any);
  const repaired = repairRecipeDocument(expanded as any);
  assert.equal(planned.phases[0]?.title, 'Cocción');
  assert.equal(expanded.phases[0]?.steps.length >= 2, true);
  assert.equal(repaired.repairActions.length >= 1, true);
});

test('buildFixedRuntimeRecipeV2 emits diagnostics with recoverable/fatal counts', () => {
  const raw = {
    id: 'diag',
    title: 'Diag',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['300 g arroz'] }],
    phases: [
      {
        id: 'f1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [{ id: 's1', text: 'Agregar 300 g arroz' }],
      },
    ],
  };
  const built = buildFixedRuntimeRecipeV2(raw as any);
  assert.equal(typeof built.diagnostics.fatalCount, 'number');
  assert.equal(typeof built.diagnostics.recoverableCount, 'number');
});

test('buildFixedRuntimeRecipeV2 accepts rallar/decorar and implicit toast result clause', () => {
  const raw = {
    id: 'lexical-flex',
    title: 'Lexical',
    servings: 2,
    ingredients: [{ title: 'Base', items: ['1 tomate maduro', 'perejil fresco', '30 ml aceite de oliva'] }],
    phases: [
      {
        id: 'f1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [{ id: 's1', text: 'Rallar 1 tomate maduro' }],
      },
      {
        id: 'f2',
        number: 'FASE 2',
        title: 'Cocción',
        steps: [{ id: 's2', text: 'se tueste ligeramente.' }],
      },
      {
        id: 'f3',
        number: 'FASE 3',
        title: 'Servido',
        steps: [{ id: 's3', text: 'Decorar cada plato con perejil fresco picado' }],
      },
    ],
  };

  const built = buildFixedRuntimeRecipeV2(raw as any);
  assert.equal(built.ok, true, built.ok ? '' : JSON.stringify(built.audit, null, 2));
  if (!built.ok) return;
  const texts = built.recipe.phases.flatMap((phase) => phase.steps.map((step) => step.text.toLowerCase()));
  assert.equal(texts.some((text) => text.includes('rallar')), true, JSON.stringify(texts, null, 2));
  assert.equal(texts.some((text) => text.startsWith('resultado:') && text.includes('tuest')), true, JSON.stringify(texts, null, 2));
  assert.equal(texts.some((text) => text.startsWith('servir') || text.includes('decorar')), true, JSON.stringify(texts, null, 2));
});

test('buildFixedRuntimeRecipeV2 marks editorial drift as invalid with unknown steps', () => {
  const raw = {
    id: 'editorial-arroz-pollo',
    title: 'Arroz con pollo',
    servings: 3,
    ingredients: [{ title: 'Base', items: ['300 g arroz', '750 ml caldo de pollo', '600 g pollo', '1 cebolla', '30 ml aceite'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Preparación',
        steps: [{ id: 's1', text: 'Lavar y escurrir arroz' }, { id: 's2', text: 'Cortar cebolla' }],
      },
      {
        id: 'fase-2',
        number: 'FASE 2',
        title: 'Cocción',
        steps: [
          { id: 's1', text: 'Agregar 300 g arroz' },
          { id: 's2', text: 'Retirar pollo' },
          { id: 's3', text: 'Resultado: Cebolla translúcida' },
        ],
      },
    ],
  };

  const result = buildFixedRuntimeRecipeV2(raw as any);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.audit.issues.some((issue) => issue.code === 'UNKNOWN_STEP'), true, JSON.stringify(result.audit.issues, null, 2));
});

test('inspectGeneratedFixedRecipe exposes parsed/reconstructed/audit traces', () => {
  const input = {
    id: 'debug-arroz',
    title: 'Arroz debug',
    servings: 3,
    ingredients: [{ title: 'Base', items: ['300 g arroz', '750 ml caldo'] }],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        steps: [{ id: 's1', text: 'Agregar 300 g arroz y agregar 750 ml caldo' }],
      },
    ],
  };

  const debug = inspectGeneratedFixedRecipe(input, 'arroz para 3 personas');
  assert.equal(Array.isArray(debug.parsedSteps), true);
  assert.equal(Array.isArray(debug.reconstructedPhases), true);
  assert.equal(Array.isArray(debug.mergedAuditIssues), true);
});
