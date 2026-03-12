import type {
  CookingSessionV2,
  ExecutionPlan,
  ExecutionTask,
  Portion,
  ResourceLockState,
  TaskRuntimeState,
  TimerRuntimeState,
} from '../../types';
import { getSchedulerSnapshot } from './recipeScheduler';

function nowIso(): string {
  return new Date().toISOString();
}

function buildTaskRuntime(plan: ExecutionPlan): Record<string, TaskRuntimeState> {
  return Object.fromEntries(
    plan.tasks.map((task) => [
      task.id,
      {
        taskId: task.id,
        status: 'pending',
      } satisfies TaskRuntimeState,
    ]),
  );
}

function createSessionId(recipeId: string): string {
  return `${recipeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTask(plan: ExecutionPlan, taskId: string): ExecutionTask | null {
  return plan.tasks.find((task) => task.id === taskId) ?? null;
}

function getTimerSeconds(task: ExecutionTask, portion: Portion): number | null {
  if (!task.usesTimer) return null;
  const exact = task.timerSecondsByPortion?.[portion];
  if (typeof exact === 'number' && exact > 0) return exact;
  return task.estimatedDurationSec && task.estimatedDurationSec > 0 ? task.estimatedDurationSec : null;
}

function syncReadyStates(session: CookingSessionV2): CookingSessionV2 {
  const snapshot = getSchedulerSnapshot(session);
  const readyIds = new Set(snapshot.readyTasks.map((task) => task.id));
  const nextTasks = { ...session.tasks };

  for (const task of session.plan.tasks) {
    const state = nextTasks[task.id];
    if (!state) continue;
    if (state.status === 'completed' || state.status === 'skipped' || state.status === 'active') continue;
    nextTasks[task.id] = {
      ...state,
      status: readyIds.has(task.id) ? 'ready' : 'pending',
    };
  }

  return {
    ...session,
    tasks: nextTasks,
    recommendedTaskId: snapshot.recommendedTaskId,
    updatedAt: nowIso(),
  };
}

export function createCookingSessionV2(recipeId: string, plan: ExecutionPlan): CookingSessionV2 {
  return syncReadyStates({
    sessionId: createSessionId(recipeId),
    recipeId,
    sessionVersion: 2,
    plan,
    tasks: buildTaskRuntime(plan),
    activeTimers: {},
    resourceLocks: {},
    recommendedTaskId: null,
    updatedAt: nowIso(),
  });
}

function claimResources(session: CookingSessionV2, task: ExecutionTask): Record<string, ResourceLockState> {
  const nextLocks = { ...session.resourceLocks };
  for (const claim of task.resourceClaims) {
    nextLocks[`${task.id}::${claim.resourceId}`] = {
      resourceId: claim.resourceId,
      taskId: task.id,
      mode: claim.mode,
      units: claim.units ?? 1,
      lockedAt: nowIso(),
    };
  }
  return nextLocks;
}

function releaseResources(session: CookingSessionV2, taskId: string): Record<string, ResourceLockState> {
  return Object.fromEntries(
    Object.entries(session.resourceLocks).filter(([, lock]) => lock.taskId !== taskId),
  );
}

export function startTaskV2(session: CookingSessionV2, taskId: string, portion: Portion): CookingSessionV2 {
  const task = getTask(session.plan, taskId);
  if (!task) return session;

  const currentState = session.tasks[task.id];
  if (!currentState || (currentState.status !== 'ready' && currentState.status !== 'pending')) return session;

  const timerSeconds = getTimerSeconds(task, portion);
  const next: CookingSessionV2 = {
    ...session,
    tasks: {
      ...session.tasks,
      [task.id]: {
        ...currentState,
        status: 'active',
        startedAt: currentState.startedAt ?? nowIso(),
      },
    },
    resourceLocks: claimResources(session, task),
    activeTimers: timerSeconds
      ? {
        ...session.activeTimers,
        [task.id]: {
          taskId: task.id,
          startedAt: nowIso(),
          endsAt: new Date(Date.now() + timerSeconds * 1000).toISOString(),
          remainingSec: timerSeconds,
          paused: false,
        } satisfies TimerRuntimeState,
      }
      : session.activeTimers,
    updatedAt: nowIso(),
  };

  return syncReadyStates(next);
}

export function completeTaskV2(session: CookingSessionV2, taskId: string): CookingSessionV2 {
  const currentState = session.tasks[taskId];
  if (!currentState || (currentState.status !== 'active' && currentState.status !== 'ready')) return session;

  const next: CookingSessionV2 = {
    ...session,
    tasks: {
      ...session.tasks,
      [taskId]: {
        ...currentState,
        status: 'completed',
        completedAt: nowIso(),
      },
    },
    activeTimers: Object.fromEntries(
      Object.entries(session.activeTimers).filter(([activeTaskId]) => activeTaskId !== taskId),
    ),
    resourceLocks: releaseResources(session, taskId),
    updatedAt: nowIso(),
  };

  return syncReadyStates(next);
}

export function skipTaskV2(session: CookingSessionV2, taskId: string): CookingSessionV2 {
  const task = getTask(session.plan, taskId);
  const currentState = session.tasks[taskId];
  if (!task || !task.optional || !currentState) return session;

  const next: CookingSessionV2 = {
    ...session,
    tasks: {
      ...session.tasks,
      [taskId]: {
        ...currentState,
        status: 'skipped',
        skippedAt: nowIso(),
      },
    },
    activeTimers: Object.fromEntries(
      Object.entries(session.activeTimers).filter(([activeTaskId]) => activeTaskId !== taskId),
    ),
    resourceLocks: releaseResources(session, taskId),
    updatedAt: nowIso(),
  };

  return syncReadyStates(next);
}

export function toggleTimerPauseV2(session: CookingSessionV2, taskId: string): CookingSessionV2 {
  const timer = session.activeTimers[taskId];
  if (!timer) return session;
  const nextTimer: TimerRuntimeState = timer.paused
    ? {
      ...timer,
      paused: false,
      startedAt: nowIso(),
      endsAt: new Date(Date.now() + timer.remainingSec * 1000).toISOString(),
    }
    : {
      ...timer,
      paused: true,
      remainingSec: Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - Date.now()) / 1000)),
    };

  return {
    ...session,
    activeTimers: {
      ...session.activeTimers,
      [taskId]: nextTimer,
    },
    updatedAt: nowIso(),
  };
}

export function tickCookingSessionV2(session: CookingSessionV2): CookingSessionV2 {
  let nextSession = session;
  let changed = false;

  for (const [taskId, timer] of Object.entries(session.activeTimers)) {
    if (timer.paused) continue;
    const remainingSec = Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - Date.now()) / 1000));
    if (remainingSec === timer.remainingSec && remainingSec > 0) continue;
    changed = true;
    nextSession = {
      ...nextSession,
      activeTimers: {
        ...nextSession.activeTimers,
        [taskId]: {
          ...nextSession.activeTimers[taskId],
          remainingSec,
        },
      },
      updatedAt: nowIso(),
    };
    if (remainingSec === 0) {
      nextSession = completeTaskV2(nextSession, taskId);
    }
  }

  return changed ? syncReadyStates(nextSession) : session;
}

export function isCookingSessionFinishedV2(session: CookingSessionV2): boolean {
  return session.plan.tasks.every((task) => {
    const status = session.tasks[task.id]?.status;
    return status === 'completed' || status === 'skipped';
  });
}
