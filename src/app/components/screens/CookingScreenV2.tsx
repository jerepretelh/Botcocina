import { useMemo, useState } from 'react';
import type { CookingSessionV2, ExecutionTask, Recipe } from '../../../types';
import { AlertCircle, ChevronRight, Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';

interface CookingScreenV2Props {
  recipe: Recipe | null;
  session: CookingSessionV2 | null;
  primaryAction: {
    task: ExecutionTask;
    timer: { remainingSec: number; paused: boolean } | null;
    badge: string;
    reason: string | null;
    nextJoinSummary: string | null;
    resourceAlert: string | null;
    primaryCtaLabel: string;
    shouldShowReason: boolean;
  } | null;
  secondarySummary: {
    secondaryActionsCount: number;
    waitingCount: number;
    activeTimersCount: number;
  } | null;
  recommendationReason: string | null;
  readyTasks: ExecutionTask[];
  blockedTasks: Array<{
    task: ExecutionTask;
    reason: string;
    detail?: string;
    category: 'dependency' | 'resource';
  }>;
  activeTasks: ExecutionTask[];
  completedTasks: ExecutionTask[];
  busyResources: Array<{ id: string; label: string; lock: { taskId: string } }>;
  availableResources: Array<{ id: string; label: string }>;
  activeTimers: Array<{
    taskId: string;
    remainingSec: number;
    paused: boolean;
    task: ExecutionTask | null;
  }>;
  nextMilestone: {
    taskId: string;
    title: string;
    pendingTaskTitles: string[];
  } | null;
  warning?: string | null;
  onChangeMission: () => void;
  onOpenIngredients: () => void;
  onOpenSetup: () => void;
  onStartTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onSkipTask: (taskId: string) => void;
  onToggleTimerPause: (taskId: string) => void;
  onReset: () => void;
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function primaryContextLine(primaryAction: CookingScreenV2Props['primaryAction']) {
  if (!primaryAction) return null;
  if (primaryAction.resourceAlert) return primaryAction.resourceAlert;
  if (primaryAction.shouldShowReason && primaryAction.reason) return primaryAction.reason;
  if (primaryAction.nextJoinSummary) return primaryAction.nextJoinSummary;
  return null;
}

export function CookingScreenV2({
  recipe,
  session,
  primaryAction,
  secondarySummary,
  recommendationReason,
  readyTasks,
  blockedTasks,
  activeTasks,
  completedTasks,
  busyResources,
  availableResources,
  activeTimers,
  nextMilestone,
  warning,
  onChangeMission,
  onOpenIngredients,
  onOpenSetup,
  onStartTask,
  onCompleteTask,
  onSkipTask,
  onToggleTimerPause,
  onReset,
}: CookingScreenV2Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const recipeName = recipe?.name ?? 'Receta en curso';
  const recipeIcon = recipe?.emoji ?? recipe?.icon ?? '🍳';
  const totalTasks = session?.plan.tasks.length ?? 0;
  const completedCount = completedTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const currentTask = primaryAction?.task ?? null;
  const contextLine = primaryContextLine(primaryAction);
  const alternativeTasks = useMemo(
    () => readyTasks.filter((task) => task.id !== currentTask?.id),
    [readyTasks, currentTask?.id],
  );

  const handlePrimaryAction = () => {
    if (!currentTask) return;
    if (currentTask.usesTimer) {
      if (primaryAction?.timer) {
        onToggleTimerPause(currentTask.id);
        return;
      }
      onStartTask(currentTask.id);
      return;
    }

    const state = session?.tasks[currentTask.id]?.status;
    if (state === 'ready' || state === 'active') {
      onCompleteTask(currentTask.id);
      return;
    }

    onStartTask(currentTask.id);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.16),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.18),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05] [background-image:radial-gradient(rgba(236,91,19,0.6)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 h-1.5 w-full bg-white/5">
        <div
          className="h-full rounded-r-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="relative z-20 flex min-h-[calc(100dvh-6px)] flex-col px-4 py-4 sm:px-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">Cooking adaptativo</p>
            <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              <span className="text-3xl leading-none">{recipeIcon}</span>
              <span className="truncate">{recipeName}</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{completedCount} de {totalTasks} tareas resueltas</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={onOpenIngredients} className="rounded-full border border-primary/15 bg-card/80 px-3 py-2.5 text-sm font-bold text-foreground">Ingredientes</button>
            <button onClick={onOpenSetup} className="rounded-full border border-primary/15 bg-card/80 px-3 py-2.5 text-sm font-bold text-foreground">Configurar</button>
            <button onClick={onChangeMission} className="rounded-full bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground">Salir</button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-6">
          <div className="mx-auto w-full max-w-md">
            {warning ? (
              <div className="mb-4 rounded-[1.35rem] border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                {warning}
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-primary/10 bg-card/90 px-5 py-6 shadow-xl backdrop-blur-xl">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Qué hacer ahora</p>
                <h2 className="mt-3 text-[2rem] font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[2.35rem]">
                  {currentTask?.title ?? 'Espera un momento'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {currentTask?.instructions ?? 'No hay una acción disponible en este momento. Revisa el detalle del flujo.'}
                </p>
              </div>

              {primaryAction ? (
                <div className="mt-5 flex justify-center">
                  <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    {primaryAction.badge}
                  </span>
                </div>
              ) : null}

              {primaryAction?.timer ? (
                <div className="mt-6 text-center">
                  <div className="text-[4.5rem] font-black tracking-[-0.08em] text-slate-900 dark:text-white sm:text-[5.5rem]">
                    {formatClock(primaryAction.timer.remainingSec)}
                  </div>
                </div>
              ) : null}

              {contextLine ? (
                <div className="mt-5 rounded-[1.35rem] bg-primary/6 px-4 py-3 text-center text-sm text-primary">
                  {contextLine}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={handlePrimaryAction}
                  disabled={!currentTask}
                  className="rounded-[1.35rem] bg-primary px-5 py-4 text-base font-black text-primary-foreground shadow-[0_18px_36px_rgba(236,91,19,0.26)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {primaryAction?.primaryCtaLabel ?? 'Esperar'}
                </button>

                <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                  <SheetTrigger asChild>
                    <button className="rounded-[1.35rem] border border-primary/15 bg-card/80 px-5 py-4 text-sm font-bold text-foreground">
                      <span className="inline-flex items-center gap-2">
                        Ver más
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[82vh] rounded-t-[1.9rem] border-primary/10 bg-background px-0 pb-6">
                    <SheetHeader className="px-5 pb-2 pt-5">
                      <SheetTitle>Más opciones</SheetTitle>
                      <SheetDescription>
                        Detalle del flujo compuesto sin recargar la pantalla principal.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-5 overflow-y-auto px-5 pb-2">
                      <section className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">También puedes hacer</p>
                        <div className="mt-3 space-y-3">
                          {alternativeTasks.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay tareas alternativas listas.</p>
                          ) : alternativeTasks.map((task) => (
                            <div key={task.id} className="rounded-[1.1rem] bg-background/80 p-4">
                              <p className="font-bold text-slate-900 dark:text-slate-100">{task.title}</p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.instructions}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button onClick={() => { onStartTask(task.id); setDetailsOpen(false); }} className="rounded-full border border-primary/15 px-3 py-2 text-xs font-bold">Empezar</button>
                                {!task.usesTimer ? <button onClick={() => { onCompleteTask(task.id); setDetailsOpen(false); }} className="rounded-full border border-primary/15 px-3 py-2 text-xs font-bold">Completar</button> : null}
                                {task.optional ? <button onClick={() => { onSkipTask(task.id); setDetailsOpen(false); }} className="rounded-full border border-primary/15 px-3 py-2 text-xs font-bold">Omitir</button> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Timers en curso</p>
                        <div className="mt-3 space-y-3">
                          {activeTimers.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay timers secundarios activos.</p>
                          ) : activeTimers.map((timer) => (
                            <div key={timer.taskId} className="flex items-center justify-between rounded-[1.1rem] bg-background/80 p-4">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{timer.task?.title ?? 'Timer activo'}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  {timer.paused ? 'Pausado' : 'Corriendo'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{formatClock(timer.remainingSec)}</span>
                                <button onClick={() => onToggleTimerPause(timer.taskId)} className="rounded-full border border-primary/15 px-3 py-2 text-xs font-bold">
                                  {timer.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Qué estamos esperando</p>
                        <div className="mt-3 space-y-3">
                          {blockedTasks.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay tareas bloqueadas ahora.</p>
                          ) : blockedTasks.map(({ task, reason, detail, category }) => (
                            <div key={task.id} className="rounded-[1.1rem] bg-background/80 p-4">
                              <div className="flex items-start gap-3">
                                {category === 'resource'
                                  ? <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                                  : <TimerReset className="mt-0.5 h-4 w-4 text-slate-400" />}
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">{task.title}</p>
                                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{reason}</p>
                                  {detail ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{detail}</p> : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Recursos</p>
                        <div className="mt-3 space-y-3">
                          {busyResources.map((resource) => (
                            <div key={resource.id} className="flex items-center justify-between rounded-[1.1rem] bg-background/80 p-4">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{resource.label}</span>
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                ocupado por {session?.plan.tasks.find((task) => task.id === resource.lock.taskId)?.title ?? 'otra tarea'}
                              </span>
                            </div>
                          ))}
                          {availableResources.map((resource) => (
                            <div key={resource.id} className="flex items-center justify-between rounded-[1.1rem] border border-emerald-500/15 bg-emerald-500/8 p-4">
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">{resource.label}</span>
                              <span className="text-sm text-emerald-700/80 dark:text-emerald-300/80">libre</span>
                            </div>
                          ))}
                          {busyResources.length === 0 && availableResources.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Esta receta no declaró recursos específicos.</p>
                          ) : null}
                        </div>
                      </section>

                      <section className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Próximo hito</p>
                        {nextMilestone ? (
                          <div className="mt-3 rounded-[1.1rem] bg-background/80 p-4">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{nextMilestone.title}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Falta completar: {nextMilestone.pendingTaskTitles.join(', ')}.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No hay sincronizaciones pendientes ahora.</p>
                        )}
                      </section>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 px-1">
              <button onClick={onReset} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <RotateCcw className="h-4 w-4" />
                Reiniciar sesión
              </button>

              {secondarySummary ? (
                <p className="text-right text-xs text-slate-500 dark:text-slate-400">
                  {secondarySummary.secondaryActionsCount > 0 ? `${secondarySummary.secondaryActionsCount} opción${secondarySummary.secondaryActionsCount === 1 ? '' : 'es'} más` : 'Sin opciones extra'}
                  {' · '}
                  {secondarySummary.activeTimersCount > 0 ? `${secondarySummary.activeTimersCount} timer${secondarySummary.activeTimersCount === 1 ? '' : 's'}` : 'Sin timers'}
                </p>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
