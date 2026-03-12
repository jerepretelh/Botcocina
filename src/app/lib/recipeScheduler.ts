import type {
  CookingSessionV2,
  ExecutionPlan,
  ExecutionTask,
  FlowResource,
  FlowResourceClaim,
  ResourceLockState,
  TaskRuntimeState,
} from '../../types';

export interface SchedulerBlockedTask {
  task: ExecutionTask;
  reason: string;
  category: 'dependency' | 'resource';
  detail?: string;
  pendingTaskTitles?: string[];
}

export interface SchedulerSnapshot {
  readyTasks: ExecutionTask[];
  activeTasks: ExecutionTask[];
  blockedTasks: SchedulerBlockedTask[];
  completedTasks: ExecutionTask[];
  recommendedTaskId: string | null;
  recommendationReason: string | null;
  availableResources: FlowResource[];
  busyResources: Array<FlowResource & { lock: ResourceLockState }>;
  nextMilestone: {
    taskId: string;
    title: string;
    pendingTaskTitles: string[];
  } | null;
}

function buildIncomingEdgeMap(plan: ExecutionPlan): Map<string, string[]> {
  const incoming = new Map<string, string[]>();
  for (const task of plan.tasks) incoming.set(task.id, []);
  for (const edge of plan.edges) {
    incoming.set(edge.toTaskId, [...(incoming.get(edge.toTaskId) ?? []), edge.fromTaskId]);
  }
  return incoming;
}

function areDependenciesSatisfied(task: ExecutionTask, incoming: Map<string, string[]>, runtime: Record<string, TaskRuntimeState>): boolean {
  const deps = incoming.get(task.id) ?? [];
  return deps.every((taskId) => {
    const state = runtime[taskId];
    return state?.status === 'completed' || state?.status === 'skipped';
  });
}

function getPendingDependencyIds(task: ExecutionTask, incoming: Map<string, string[]>, runtime: Record<string, TaskRuntimeState>): string[] {
  const deps = incoming.get(task.id) ?? [];
  return deps.filter((taskId) => {
    const state = runtime[taskId];
    return state?.status !== 'completed' && state?.status !== 'skipped';
  });
}

function hasCompatibleCapacity(claim: FlowResourceClaim, session: CookingSessionV2): boolean {
  const resource = session.plan.resources.find((item) => item.id === claim.resourceId);
  const capacity = resource?.capacity ?? 1;
  const used = Object.values(session.resourceLocks)
    .filter((lock) => lock.resourceId === claim.resourceId)
    .reduce((total, lock) => total + lock.units, 0);
  return used + (claim.units ?? 1) <= capacity;
}

function getResourceConflictReason(task: ExecutionTask, session: CookingSessionV2): SchedulerBlockedTask | null {
  for (const claim of task.resourceClaims) {
    if (hasCompatibleCapacity(claim, session)) continue;
    const resource = session.plan.resources.find((item) => item.id === claim.resourceId);
    const blockingLocks = Object.values(session.resourceLocks).filter((lock) => lock.resourceId === claim.resourceId);
    const holders = blockingLocks
      .map((lock) => session.plan.tasks.find((candidate) => candidate.id === lock.taskId)?.title ?? 'otra tarea')
      .filter(Boolean);
    return {
      task,
      category: 'resource',
      reason: `${resource?.label ?? claim.resourceId} está ocupado`,
      detail: holders.length > 0 ? `Ahora mismo lo usa: ${holders.join(', ')}.` : 'Ese recurso todavía no está libre.',
    };
  }
  return null;
}

function scoreTask(task: ExecutionTask, session: CookingSessionV2, incoming: Map<string, string[]>): number {
  let score = 0;
  const waitingCount = Object.keys(session.activeTimers).length;
  const outgoingCount = session.plan.edges.filter((edge) => edge.fromTaskId === task.id).length;
  const constrainedResources = task.resourceClaims.length;
  const duration = task.estimatedDurationSec ?? 300;
  const incomingCount = (incoming.get(task.id) ?? []).length;

  score += outgoingCount * 50;
  score += incomingCount > 1 ? 80 : 0;
  score += waitingCount > 0 && task.handsOn ? 40 : 0;
  score += constrainedResources * 20;
  score += duration <= 180 ? 25 : 0;
  score -= task.order;
  return score;
}

function buildRecommendationReason(task: ExecutionTask | undefined, session: CookingSessionV2, incoming: Map<string, string[]>): string | null {
  if (!task) return null;
  const waitingCount = Object.keys(session.activeTimers).length;
  const incomingCount = (incoming.get(task.id) ?? []).length;

  if (incomingCount > 1 || task.taskKind === 'sync') {
    return 'Se priorizó porque acerca el siguiente punto de sincronización de la receta.';
  }
  if (waitingCount > 0 && task.handsOn) {
    return 'Se priorizó para aprovechar un tiempo muerto mientras otra cocción sigue avanzando.';
  }
  if (task.resourceClaims.length > 0) {
    const labels = task.resourceClaims
      .map((claim) => session.plan.resources.find((resource) => resource.id === claim.resourceId)?.label ?? claim.resourceId)
      .join(', ');
    return `Se priorizó porque conviene usar ahora el recurso libre disponible: ${labels}.`;
  }
  if ((task.estimatedDurationSec ?? 0) > 0 && (task.estimatedDurationSec ?? 0) <= 180) {
    return 'Se priorizó porque es una tarea corta que destraba el siguiente tramo sin romper el ritmo.';
  }
  return 'Se priorizó por impacto en dependencias y orden estable de ejecución.';
}

export function getSchedulerSnapshot(session: CookingSessionV2): SchedulerSnapshot {
  const incoming = buildIncomingEdgeMap(session.plan);
  const readyTasks: ExecutionTask[] = [];
  const activeTasks: ExecutionTask[] = [];
  const blockedTasks: SchedulerBlockedTask[] = [];
  const completedTasks: ExecutionTask[] = [];

  for (const task of session.plan.tasks) {
    const state = session.tasks[task.id];
    if (!state) continue;

    if (state.status === 'completed' || state.status === 'skipped') {
      completedTasks.push(task);
      continue;
    }

    if (state.status === 'active') {
      activeTasks.push(task);
      continue;
    }

    const pendingDependencyIds = getPendingDependencyIds(task, incoming, session.tasks);
    if (pendingDependencyIds.length > 0) {
      const pendingTaskTitles = pendingDependencyIds.map((taskId) => session.plan.tasks.find((candidate) => candidate.id === taskId)?.title ?? taskId);
      blockedTasks.push({
        task,
        category: 'dependency',
        reason: task.taskKind === 'sync' ? 'Todavía no se puede sincronizar' : 'Depende de tareas previas',
        detail: task.taskKind === 'sync'
          ? `Falta cerrar estas ramas antes de integrar: ${pendingTaskTitles.join(', ')}.`
          : `Antes debes resolver: ${pendingTaskTitles.join(', ')}.`,
        pendingTaskTitles,
      });
      continue;
    }

    const conflictReason = getResourceConflictReason(task, session);
    if (conflictReason) {
      blockedTasks.push(conflictReason);
      continue;
    }

    readyTasks.push(task);
  }

  readyTasks.sort((a, b) => scoreTask(b, session, incoming) - scoreTask(a, session, incoming) || a.order - b.order);
  activeTasks.sort((a, b) => a.order - b.order);
  completedTasks.sort((a, b) => a.order - b.order);
  blockedTasks.sort((a, b) => a.task.order - b.task.order);

  const busyResources = Object.values(session.resourceLocks)
    .map((lock) => {
      const resource = session.plan.resources.find((item) => item.id === lock.resourceId);
      return resource ? { ...resource, lock } : null;
    })
    .filter(Boolean) as Array<FlowResource & { lock: ResourceLockState }>;

  const busyResourceIds = new Set(busyResources.map((item) => item.id));
  const availableResources = session.plan.resources.filter((resource) => !busyResourceIds.has(resource.id));
  const nextMilestoneBlocked = blockedTasks.find((blockedTask) => blockedTask.task.taskKind === 'sync');
  const recommendedTask = readyTasks[0];

  return {
    readyTasks,
    activeTasks,
    blockedTasks,
    completedTasks,
    recommendedTaskId: recommendedTask?.id ?? null,
    recommendationReason: buildRecommendationReason(recommendedTask, session, incoming),
    availableResources,
    busyResources,
    nextMilestone: nextMilestoneBlocked
      ? {
        taskId: nextMilestoneBlocked.task.id,
        title: nextMilestoneBlocked.task.title,
        pendingTaskTitles: nextMilestoneBlocked.pendingTaskTitles ?? [],
      }
      : null,
  };
}
