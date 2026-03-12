import type { CookingSessionV2, ExecutionTask } from '../../types';
import { getSchedulerSnapshot } from './recipeScheduler';

export function getRecommendedTaskV2(session: CookingSessionV2): ExecutionTask | null {
  const recommendedTaskId = session.recommendedTaskId ?? getSchedulerSnapshot(session).recommendedTaskId;
  if (!recommendedTaskId) return null;
  return session.plan.tasks.find((task) => task.id === recommendedTaskId) ?? null;
}

export function getReadyTasksV2(session: CookingSessionV2): ExecutionTask[] {
  return getSchedulerSnapshot(session).readyTasks;
}

export function getBlockedTasksV2(session: CookingSessionV2) {
  return getSchedulerSnapshot(session).blockedTasks;
}

export function getActiveTasksV2(session: CookingSessionV2): ExecutionTask[] {
  return getSchedulerSnapshot(session).activeTasks;
}

export function getCompletedTasksV2(session: CookingSessionV2): ExecutionTask[] {
  return getSchedulerSnapshot(session).completedTasks;
}

export function getBusyResourcesV2(session: CookingSessionV2) {
  return getSchedulerSnapshot(session).busyResources;
}

export function getAvailableResourcesV2(session: CookingSessionV2) {
  return getSchedulerSnapshot(session).availableResources;
}
