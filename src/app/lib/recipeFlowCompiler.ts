import type {
  ExecutionEdge,
  ExecutionPlan,
  ExecutionTask,
  FlowResource,
  FlowStageNode,
  Portion,
  Recipe,
  RecipeContent,
  RecipeFlowDefinition,
  RecipeStep,
  SubStep,
} from '../../types';

type CompileResult = {
  tasks: ExecutionTask[];
  edges: ExecutionEdge[];
  entryTaskIds: string[];
  exitTaskIds: string[];
};

function portionTimerFromSubStep(subStep: SubStep): Partial<Record<Portion, number>> | undefined {
  if (!subStep.isTimer) return undefined;
  return {
    1: typeof subStep.portions[1] === 'number' ? subStep.portions[1] : 0,
    2: typeof subStep.portions[2] === 'number' ? subStep.portions[2] : 0,
    4: typeof subStep.portions[4] === 'number' ? subStep.portions[4] : 0,
  };
}

function buildLegacyResource(step: RecipeStep): ExecutionTask['resourceClaims'] {
  if (!step.equipment) return [];
  return [
    {
      resourceId: step.equipment,
      mode: 'exclusive',
      units: 1,
      retainDuringTimer: true,
    },
  ];
}

export function compileLegacyStepsToExecutionPlan(recipe: Recipe, content: RecipeContent): ExecutionPlan {
  const tasks: ExecutionTask[] = [];
  const edges: ExecutionEdge[] = [];
  let previousTaskId: string | null = null;
  let order = 0;

  for (const step of content.steps) {
    for (const subStep of step.subSteps) {
      const taskId = `${recipe.id}::legacy::${step.stepNumber}::${order + 1}`;
      tasks.push({
        id: taskId,
        title: subStep.subStepName,
        instructions: subStep.notes || step.stepName,
        order,
        taskKind: subStep.isTimer ? 'wait' : 'cook',
        estimatedDurationSec: typeof subStep.portions[2] === 'number' ? subStep.portions[2] : null,
        timerSecondsByPortion: portionTimerFromSubStep(subStep),
        usesTimer: subStep.isTimer,
        handsOn: !subStep.isTimer,
        resourceClaims: buildLegacyResource(step),
        metadata: {
          sourceNodeId: taskId,
          stageTitle: step.stepName,
        },
      });
      if (previousTaskId) {
        edges.push({ fromTaskId: previousTaskId, toTaskId: taskId, type: 'finish_to_start' });
      }
      previousTaskId = taskId;
      order += 1;
    }
  }

  const resourceIds = new Set(tasks.flatMap((task) => task.resourceClaims.map((claim) => claim.resourceId)));
  const resources: FlowResource[] = [...resourceIds].map((resourceId) => ({
    id: resourceId,
    label: resourceId,
    kind: resourceId,
    capacity: 1,
  }));

  return {
    id: `${recipe.id}::legacy-plan`,
    recipeId: recipe.id,
    modelVersion: 1,
    tasks,
    edges,
    resources,
  };
}

function cloneTask(task: ExecutionTask, prefix: string, orderOffset: number): ExecutionTask {
  return {
    ...task,
    id: `${prefix}${task.id}`,
    order: orderOffset + task.order,
    resourceClaims: task.resourceClaims.map((claim) => ({ ...claim })),
    metadata: {
      ...task.metadata,
      sourceNodeId: `${prefix}${task.metadata?.sourceNodeId ?? task.id}`,
    },
  };
}

function cloneEdge(edge: ExecutionEdge, prefix: string): ExecutionEdge {
  return {
    fromTaskId: `${prefix}${edge.fromTaskId}`,
    toTaskId: `${prefix}${edge.toTaskId}`,
    type: edge.type,
  };
}

function compileNode(node: FlowStageNode, path: string[] = [], orderSeed = 0): CompileResult {
  const nodePath = [...path, node.id];
  const prefix = nodePath.join('__');

  if (node.type === 'task') {
    const taskId = prefix;
    const task: ExecutionTask = {
      id: taskId,
      title: node.title,
      instructions: node.instructions,
      order: orderSeed,
      taskKind: node.taskKind ?? (node.usesTimer ? 'wait' : 'prep'),
      estimatedDurationSec: node.estimatedDurationSec ?? node.activeDurationSec ?? node.timerSeconds?.[2] ?? null,
      timerSecondsByPortion: node.timerSeconds,
      usesTimer: Boolean(node.usesTimer || node.timerSeconds),
      handsOn: node.handsOn ?? !Boolean(node.usesTimer || node.timerSeconds),
      optional: node.optional,
      resourceClaims: node.resourceClaims ?? [],
      metadata: {
        sourceNodeId: taskId,
      },
    };
    return {
      tasks: [task],
      edges: [],
      entryTaskIds: [taskId],
      exitTaskIds: [taskId],
    };
  }

  if (node.type === 'sync') {
    const taskId = prefix;
    const task: ExecutionTask = {
      id: taskId,
      title: node.title,
      instructions: node.title,
      order: orderSeed,
      taskKind: 'sync',
      estimatedDurationSec: null,
      usesTimer: false,
      handsOn: false,
      resourceClaims: [],
      metadata: {
        sourceNodeId: taskId,
      },
    };
    return {
      tasks: [task],
      edges: [],
      entryTaskIds: [taskId],
      exitTaskIds: [taskId],
    };
  }

  if (node.type === 'subrecipe') {
    return compileNode(node.root, nodePath, orderSeed);
  }

  if (node.children.length === 0) {
    return { tasks: [], edges: [], entryTaskIds: [], exitTaskIds: [] };
  }

  if (node.type === 'parallel') {
    const tasks: ExecutionTask[] = [];
    const edges: ExecutionEdge[] = [];
    const entryTaskIds: string[] = [];
    const exitTaskIds: string[] = [];
    let localOrder = orderSeed;

    for (const child of node.children) {
      const compiled = compileNode(child, nodePath, localOrder);
      tasks.push(...compiled.tasks);
      edges.push(...compiled.edges);
      entryTaskIds.push(...compiled.entryTaskIds);
      exitTaskIds.push(...compiled.exitTaskIds);
      localOrder = tasks.length + orderSeed;
    }

    return { tasks, edges, entryTaskIds, exitTaskIds };
  }

  const tasks: ExecutionTask[] = [];
  const edges: ExecutionEdge[] = [];
  let localOrder = orderSeed;
  let previousExitIds: string[] = [];
  let firstEntryIds: string[] = [];

  for (const child of node.children) {
    const compiled = compileNode(child, nodePath, localOrder);
    tasks.push(...compiled.tasks);
    edges.push(...compiled.edges);
    if (firstEntryIds.length === 0) firstEntryIds = compiled.entryTaskIds;
    if (previousExitIds.length > 0) {
      for (const fromTaskId of previousExitIds) {
        for (const toTaskId of compiled.entryTaskIds) {
          edges.push({ fromTaskId, toTaskId, type: 'finish_to_start' });
        }
      }
    }
    previousExitIds = compiled.exitTaskIds;
    localOrder = tasks.length + orderSeed;
  }

  return {
    tasks,
    edges,
    entryTaskIds: firstEntryIds,
    exitTaskIds: previousExitIds,
  };
}

export function compileFlowDefinitionToExecutionPlan(recipe: Recipe, flow: RecipeFlowDefinition): ExecutionPlan {
  const compiled = compileNode(flow.root, [recipe.id], 0);
  const resources = flow.resources ?? [];

  return {
    id: flow.id,
    recipeId: recipe.id,
    modelVersion: 2,
    tasks: compiled.tasks.map((task, index) => ({ ...task, order: index })),
    edges: compiled.edges,
    resources,
  };
}

export function compileRecipeToExecutionPlan(recipe: Recipe, content: RecipeContent): ExecutionPlan {
  if (recipe.modelVersion === 2 && content.flowDefinition) {
    return compileFlowDefinitionToExecutionPlan(recipe, content.flowDefinition);
  }
  const plan = compileLegacyStepsToExecutionPlan(recipe, content);
  return recipe.modelVersion === 2
    ? {
      ...plan,
      id: `${recipe.id}::compat-plan`,
      modelVersion: 2,
    }
    : plan;
}
