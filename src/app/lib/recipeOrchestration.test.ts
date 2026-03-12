import test from 'node:test';
import assert from 'node:assert/strict';
import type { Recipe, RecipeContent } from '../../types';
import { compileLegacyStepsToExecutionPlan, compileRecipeToExecutionPlan } from './recipeFlowCompiler';
import { createCookingSessionV2, skipTaskV2, startTaskV2, completeTaskV2 } from './cookingSessionV2';
import { arrozLentejasFlow } from '../data/recipeFlows';

test('legacy recipes compile to a stable linear DAG', () => {
  const recipe: Recipe = {
    id: 'legacy-demo',
    categoryId: 'desayunos',
    name: 'Legacy demo',
    icon: '🍳',
    ingredient: 'Porciones',
    description: 'demo',
  };
  const content: RecipeContent = {
    ingredients: [],
    tip: 'demo',
    portionLabels: { singular: 'porción', plural: 'porciones' },
    steps: [
      {
        stepNumber: 1,
        stepName: 'Paso 1',
        subSteps: [
          { subStepName: 'A', notes: '', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'B', notes: '', portions: { 1: 30, 2: 45, 4: 60 }, isTimer: true },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Paso 2',
        subSteps: [
          { subStepName: 'C', notes: '', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
    ],
  };

  const plan = compileLegacyStepsToExecutionPlan(recipe, content);
  assert.equal(plan.tasks.length, 3);
  assert.equal(plan.edges.length, 2);
  assert.deepEqual(plan.edges.map((edge) => [edge.fromTaskId, edge.toTaskId]), [
    ['legacy-demo::legacy::1::1', 'legacy-demo::legacy::1::2'],
    ['legacy-demo::legacy::1::2', 'legacy-demo::legacy::2::3'],
  ]);
});

test('compound recipe exposes parallel ready tasks and respects joins', () => {
  const recipe: Recipe = {
    id: 'arroz-lentejas-compuesto',
    categoryId: 'arroces',
    name: 'Arroz con lentejas',
    icon: '🍛',
    ingredient: 'Porciones',
    description: 'demo',
    modelVersion: 2,
  };
  const content: RecipeContent = {
    ingredients: [],
    steps: [],
    tip: 'demo',
    portionLabels: { singular: 'porción', plural: 'porciones' },
    flowDefinition: arrozLentejasFlow,
  };

  const plan = compileRecipeToExecutionPlan(recipe, content);
  const session = createCookingSessionV2(recipe.id, plan);
  const readyTitles = plan.tasks
    .filter((task) => session.tasks[task.id]?.status === 'ready')
    .map((task) => task.title);

  assert.ok(readyTitles.includes('Hervir agua para las lentejas'));
  assert.ok(readyTitles.includes('Precalentar olla del arroz'));

  const afterStart = startTaskV2(session, readyTitles.includes('Hervir agua para las lentejas') ? plan.tasks.find((task) => task.title === 'Hervir agua para las lentejas')!.id : '', 2);
  const joinTask = plan.tasks.find((task) => task.title === 'Esperar arroz base y lentejas casi listas');
  assert.equal(afterStart.tasks[joinTask!.id].status, 'pending');
});

test('optional tasks can be skipped without breaking the graph', () => {
  const recipe: Recipe = {
    id: 'pasta-salsa-rapida',
    categoryId: 'almuerzos',
    name: 'Pasta',
    icon: '🍝',
    ingredient: 'Porciones',
    description: 'demo',
    modelVersion: 2,
  };
  const content: RecipeContent = {
    ingredients: [],
    steps: [],
    tip: 'demo',
    portionLabels: { singular: 'porción', plural: 'porciones' },
    flowDefinition: {
      ...arrozLentejasFlow,
      id: 'tiny',
      root: {
        type: 'sequence',
        id: 'root',
        title: 'tiny',
        children: [
          { type: 'task', id: 'base', title: 'Base', instructions: 'Base', estimatedDurationSec: 30, taskKind: 'prep' },
          { type: 'task', id: 'optional', title: 'Optional', instructions: 'Optional', estimatedDurationSec: 10, taskKind: 'finish', optional: { defaultEnabled: true } },
          { type: 'task', id: 'end', title: 'End', instructions: 'End', estimatedDurationSec: 10, taskKind: 'finish' },
        ],
      },
    },
  };
  const plan = compileRecipeToExecutionPlan(recipe, content);
  let session = createCookingSessionV2(recipe.id, plan);
  const base = plan.tasks.find((task) => task.title === 'Base')!;
  const optional = plan.tasks.find((task) => task.title === 'Optional')!;
  const end = plan.tasks.find((task) => task.title === 'End')!;

  session = startTaskV2(session, base.id, 2);
  session = completeTaskV2(session, base.id);
  session = skipTaskV2(session, optional.id);

  assert.equal(session.tasks[end.id].status, 'ready');
});
