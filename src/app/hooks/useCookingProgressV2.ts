import { useEffect, useMemo, useState } from 'react';
import type { CookingSessionV2, Portion, Recipe, RecipeContent } from '../../types';
import { compileRecipeToExecutionPlan } from '../lib/recipeFlowCompiler';
import {
  completeTaskV2,
  createCookingSessionV2,
  isCookingSessionFinishedV2,
  skipTaskV2,
  startTaskV2,
  tickCookingSessionV2,
  toggleTimerPauseV2,
} from '../lib/cookingSessionV2';
import {
  getRecommendedTaskV2,
} from '../lib/cookingSessionSelectors';
import { isSupabaseEnabled, supabaseClient } from '../lib/supabaseClient';
import { getSchedulerSnapshot } from '../lib/recipeScheduler';

interface UseCookingProgressV2Params {
  recipe: Recipe | null;
  content: RecipeContent | null;
  portion: Portion;
  cloudUserId?: string | null;
}

const SESSION_PREFIX = 'cooking_progress_v2_';

function storageKey(recipeId: string) {
  return `${SESSION_PREFIX}${recipeId}`;
}

export function useCookingProgressV2({ recipe, content, portion, cloudUserId }: UseCookingProgressV2Params) {
  const [session, setSession] = useState<CookingSessionV2 | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const compiledPlan = useMemo(() => {
    if (!recipe || !content) return null;
    return compileRecipeToExecutionPlan(recipe, content);
  }, [recipe, content]);

  useEffect(() => {
    if (!recipe || !compiledPlan) {
      setSession(null);
      return;
    }

    const localRaw = window.localStorage.getItem(storageKey(recipe.id));
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw) as CookingSessionV2;
        if (parsed?.sessionVersion === 2) {
          setSession({
            ...parsed,
            plan: compiledPlan,
          });
          return;
        }
      } catch {
        // ignore invalid cache
      }
    }

    if (cloudUserId && isSupabaseEnabled && supabaseClient) {
      void supabaseClient
        .from('user_recipe_progress_v2')
        .select('session_version,plan_snapshot,runtime_state,active_timers,resource_locks,recommended_task_id')
        .eq('user_id', cloudUserId)
        .eq('recipe_id', recipe.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            setSession(createCookingSessionV2(recipe.id, compiledPlan));
            return;
          }
          setSession({
            sessionId: `${recipe.id}-cloud`,
            recipeId: recipe.id,
            sessionVersion: 2,
            plan: compiledPlan,
            tasks: (data.runtime_state as CookingSessionV2['tasks']) ?? {},
            activeTimers: (data.active_timers as CookingSessionV2['activeTimers']) ?? {},
            resourceLocks: (data.resource_locks as CookingSessionV2['resourceLocks']) ?? {},
            recommendedTaskId: data.recommended_task_id ?? null,
            updatedAt: new Date().toISOString(),
          });
        });
      return;
    }

    setSession(createCookingSessionV2(recipe.id, compiledPlan));
  }, [recipe, compiledPlan, cloudUserId]);

  useEffect(() => {
    if (!session || !recipe) return;
    window.localStorage.setItem(storageKey(recipe.id), JSON.stringify(session));
  }, [session, recipe]);

  useEffect(() => {
    if (!session || !recipe || !cloudUserId || !isSupabaseEnabled || !supabaseClient) return;
    const timeout = window.setTimeout(() => {
      void supabaseClient
        .from('user_recipe_progress_v2')
        .upsert(
          {
            user_id: cloudUserId,
            recipe_id: recipe.id,
            session_version: 2,
            plan_snapshot: session.plan,
            runtime_state: session.tasks,
            active_timers: session.activeTimers,
            resource_locks: session.resourceLocks,
            recommended_task_id: session.recommendedTaskId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,recipe_id' },
        )
        .then(({ error }) => {
          if (!error) return;
          setWarning('No se pudo sincronizar la sesión compuesta en la nube. Se seguirá usando almacenamiento local.');
        });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [session, recipe, cloudUserId]);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => {
      setSession((current) => (current ? tickCookingSessionV2(current) : current));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session?.sessionId]);

  const schedulerSnapshot = useMemo(() => {
    if (!session) return null;
    return getSchedulerSnapshot(session);
  }, [session]);

  const primaryAction = useMemo(() => {
    if (!session || !schedulerSnapshot) return null;
    const recommendedTask = getRecommendedTaskV2(session);
    if (!recommendedTask) return null;

    const timer = session.activeTimers[recommendedTask.id] ?? null;
    const state = session.tasks[recommendedTask.id];
    const status = state?.status ?? 'pending';
    const isTimer = recommendedTask.usesTimer;

    let primaryCtaLabel = 'Empezar';
    if (isTimer && timer) {
      primaryCtaLabel = timer.paused ? 'Reanudar' : 'Pausar';
    } else if (status === 'active' && !isTimer) {
      primaryCtaLabel = 'Completar';
    } else if (status === 'ready' && !isTimer) {
      primaryCtaLabel = 'Completar';
    } else if (isTimer) {
      primaryCtaLabel = 'Iniciar timer';
    }

    const badge = isTimer
      ? activeTimersLabel(timer?.paused ?? false)
      : Object.keys(session.activeTimers).length > 0
        ? 'Esperando otra cocción'
        : 'Manual';

    return {
      task: recommendedTask,
      timer,
      badge,
      reason: schedulerSnapshot.recommendationReason ?? null,
      nextJoinSummary: schedulerSnapshot.nextMilestone
        ? `Falta ${schedulerSnapshot.nextMilestone.pendingTaskTitles.join(', ')} para ${schedulerSnapshot.nextMilestone.title.toLowerCase()}.`
        : null,
      resourceAlert: schedulerSnapshot.blockedTasks.find((item) => item.category === 'resource')?.reason ?? null,
      primaryCtaLabel,
      shouldShowReason: Boolean(schedulerSnapshot.recommendationReason && (isTimer || Object.keys(session.activeTimers).length > 0)),
    };
  }, [session, schedulerSnapshot]);

  const secondarySummary = useMemo(() => {
    if (!schedulerSnapshot) return null;
    return {
      secondaryActionsCount: Math.max(schedulerSnapshot.readyTasks.length - 1, 0),
      waitingCount: schedulerSnapshot.blockedTasks.length,
      activeTimersCount: session ? Object.keys(session.activeTimers).length : 0,
    };
  }, [schedulerSnapshot, session]);

  return {
    session,
    warning,
    setSession,
    startTask: (taskId: string) => setSession((current) => (current ? startTaskV2(current, taskId, portion) : current)),
    completeTask: (taskId: string) => setSession((current) => (current ? completeTaskV2(current, taskId) : current)),
    skipTask: (taskId: string) => setSession((current) => (current ? skipTaskV2(current, taskId) : current)),
    toggleTimerPause: (taskId: string) => setSession((current) => (current ? toggleTimerPauseV2(current, taskId) : current)),
    resetSession: () => {
      if (!recipe || !compiledPlan) return;
      const next = createCookingSessionV2(recipe.id, compiledPlan);
      setSession(next);
      window.localStorage.removeItem(storageKey(recipe.id));
    },
    primaryAction,
    secondarySummary,
    recommendedTask: session ? getRecommendedTaskV2(session) : null,
    recommendationReason: schedulerSnapshot?.recommendationReason ?? null,
    nextMilestone: schedulerSnapshot?.nextMilestone ?? null,
    readyTasks: schedulerSnapshot?.readyTasks ?? [],
    blockedTasks: schedulerSnapshot?.blockedTasks ?? [],
    activeTasks: schedulerSnapshot?.activeTasks ?? [],
    completedTasks: schedulerSnapshot?.completedTasks ?? [],
    busyResources: schedulerSnapshot?.busyResources ?? [],
    availableResources: schedulerSnapshot?.availableResources ?? [],
    activeTimers: session
      ? Object.values(session.activeTimers)
        .map((timer) => ({
          ...timer,
          task: session.plan.tasks.find((task) => task.id === timer.taskId) ?? null,
        }))
        .sort((a, b) => a.remainingSec - b.remainingSec)
      : [],
    isFinished: session ? isCookingSessionFinishedV2(session) : false,
  };
}

function activeTimersLabel(paused: boolean) {
  return paused ? 'Timer pausado' : 'Con timer';
}
