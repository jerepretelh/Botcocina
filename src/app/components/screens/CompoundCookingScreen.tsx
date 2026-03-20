import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Ellipsis, ListChecks, Play, Pause, SlidersHorizontal, LogOut, RotateCcw, ArrowRight, X, Volume2, VolumeX } from 'lucide-react';
import type { ActiveCompoundTimer, CompoundComponentProgress, CompoundResolvedTimelineItem, Recipe } from '../../../types';
import type { CookingPresentationV2 } from '../../types/cooking-presentation-v2';
import type { CookingCompoundPrimaryActionV2Kind } from '../../lib/presentation/resolveCompoundPrimaryActionV2';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { formatCompoundClock } from '../../lib/compoundCookingV2';

interface CompoundCookingScreenProps {
  selectedRecipe?: Recipe | null;
  presentation: CookingPresentationV2;
  currentItem: CompoundResolvedTimelineItem | null;
  nextItem: CompoundResolvedTimelineItem | null;
  currentTimelineIndex: number;
  totalTimelineItems: number;
  progressPercent: number;
  activeTimers: ActiveCompoundTimer[];
  componentProgress: CompoundComponentProgress[];
  currentTimer: ActiveCompoundTimer | null;
  isCurrentTimerStarted: boolean;
  isCurrentTimerRunning: boolean;
  isCurrentTimerExpired: boolean;
  isRecipeComplete: boolean;
  primaryActionLabel?: string;
  primaryActionKind?: CookingCompoundPrimaryActionV2Kind;
  voiceEnabled: boolean;
  speechSupported: boolean;
  inlineMessage: {
    tone: 'info' | 'success';
    title: string;
    body: string;
  } | null;
  onPrevious: () => void;
  onNext: () => void;
  onToggleCurrentTimer: () => void;
  onFocusComponent: (componentId: string) => void;
  onDismissTimer: (timelineItemId: string) => void;
  onVoiceToggle: () => void;
  onOpenIngredients: () => void;
  onOpenSetup: () => void;
  onPlanRecipe: () => void;
  onExitRecipe: () => void;
  onChangeMission: () => void;
  isBackgroundMuted?: boolean;
}

function compactText(value: string | null | undefined, maxLength: number) {
  if (!value) return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function normalizeMessage(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function TimerRail({
  activeTimers,
  componentProgress,
  frontStatuses,
  isRecipeComplete,
  currentTimerId,
  onFocusComponent,
  onDismissTimer,
}: {
  activeTimers: ActiveCompoundTimer[];
  componentProgress: CompoundComponentProgress[];
  frontStatuses: CookingPresentationV2['activeFrontStatus'];
  isRecipeComplete: boolean;
  currentTimerId?: string | null;
  onFocusComponent: (componentId: string) => void;
  onDismissTimer: (timelineItemId: string) => void;
}) {
  return (
    <>
      <div className="border-b border-primary/10 p-6">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Timers activos</h3>
        <p className="mt-1 text-sm text-primary/80">
          {isRecipeComplete ? 'Receta cerrada' : `${activeTimers.filter((timer) => timer.status !== 'expired').length} procesos en curso`}
        </p>
      </div>
      <div className="space-y-3 p-5">
        {activeTimers.length === 0 || isRecipeComplete ? (
          <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-background/70 p-4 text-sm text-slate-500">
            {isRecipeComplete ? 'Todos los procesos de esta receta quedaron cerrados.' : 'Los timers aparecerán aquí cuando empieces a coordinar varios frentes.'}
          </div>
        ) : (
          activeTimers.map((timer) => {
            const component = componentProgress.find((item) => item.componentId === timer.componentId);
            return (
              <div
                key={timer.timelineItemId}
                className={`w-full rounded-[1.35rem] border px-4 py-3 text-left transition-colors ${
                  timer.status === 'expired'
                    ? 'border-amber-300 bg-amber-50'
                    : currentTimerId === timer.timelineItemId
                      ? 'border-primary/40 bg-primary/8'
                    : component?.isFocused
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-primary/15 bg-card/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => onFocusComponent(timer.componentId)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{component?.icon ?? '•'}</span>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{component?.name ?? timer.componentId}</p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{timer.label}</p>
                  </button>
                  {timer.status === 'expired' ? (
                    <button
                      type="button"
                      onClick={() => onDismissTimer(timer.timelineItemId)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-white/80 text-amber-700 transition-colors hover:bg-amber-100"
                      aria-label="Cerrar timer listo"
                      title="Cerrar timer listo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className={`font-bold ${timer.status === 'expired' ? 'text-amber-700' : 'text-primary'}`}>
                    {timer.status === 'expired' ? 'Listo' : formatCompoundClock(timer.remainingSeconds)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {timer.status === 'expired' ? 'Cerrar cuando quieras' : timer.status === 'paused' ? 'Pausado' : 'Activo'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-primary/10 p-6">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">Estado de preparación</h3>
      </div>
      <div className="space-y-3 px-5 pb-6">
        {componentProgress.map((component) => {
          const completedCount = isRecipeComplete ? component.totalCount : component.completedCount;
          const progressPercent = component.totalCount > 0 ? Math.max(12, Math.round((completedCount / component.totalCount) * 100)) : 0;
          const frontStatus = frontStatuses.find((entry) => entry.componentId === component.componentId);
          return (
            <button
              key={component.componentId}
              type="button"
              onClick={() => onFocusComponent(component.componentId)}
              className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition-colors ${
                component.isFocused ? 'border-primary/40 bg-primary/5' : 'border-primary/10 bg-card/70'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{component.icon}</span>
                  <span className="font-semibold text-slate-800">{component.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  {frontStatus ? (
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      {frontStatus.state}
                    </span>
                  ) : null}
                  {!isRecipeComplete && component.hasExpiredTimer ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                  {!isRecipeComplete && component.hasActiveTimer ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                  <span>{frontStatus?.progressLabel ?? `${completedCount}/${component.totalCount}`}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-primary/10">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function CompoundCookingScreen({
  selectedRecipe,
  presentation,
  currentItem,
  nextItem,
  currentTimelineIndex,
  totalTimelineItems,
  progressPercent,
  activeTimers,
  componentProgress,
  currentTimer,
  isCurrentTimerStarted,
  isCurrentTimerRunning,
  isCurrentTimerExpired,
  isRecipeComplete,
  primaryActionLabel,
  primaryActionKind,
  voiceEnabled,
  speechSupported,
  inlineMessage,
  onPrevious,
  onNext,
  onToggleCurrentTimer,
  onFocusComponent,
  onDismissTimer,
  onVoiceToggle,
  onOpenIngredients,
  onOpenSetup,
  onPlanRecipe,
  onExitRecipe,
  onChangeMission,
  isBackgroundMuted = false,
}: CompoundCookingScreenProps) {
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const currentIsTimer = Boolean(currentItem?.durationSeconds != null);
  const recipeName = selectedRecipe?.name ?? 'Receta compuesta';
  const currentTimerStateLabel = isCurrentTimerExpired
    ? 'Listo'
    : isCurrentTimerRunning
      ? 'Activo'
      : isCurrentTimerStarted
        ? 'Pausado'
        : 'Pendiente';
  const primaryLabel = primaryActionLabel?.trim() || presentation.ctaLabel;
  const primaryIcon = (() => {
    switch (primaryActionKind) {
      case 'start_timer':
      case 'continue_step':
        return <Play className="h-6 w-6" />;
      case 'pause_timer':
        return isCurrentTimerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />;
      case 'focus_front':
        return <ArrowRight className="h-6 w-6" />;
      case 'finish_recipe':
        return <CheckCircle2 className="h-6 w-6" />;
      default:
        return <Play className="h-6 w-6" />;
    }
  })();

  const handlePrimaryAction = () => {
    if (presentation.ctaIntent === 'finish' && isRecipeComplete) {
      onChangeMission();
      return;
    }
    onNext();
  };

  const recipeIcon = selectedRecipe?.icon ?? '🍳';
  const compactNextNotes = compactText(nextItem?.notes ?? null, 78);
  const compactCurrentNotes = compactText(currentItem?.notes ?? null, 140);
  const compactTimerContext = compactText(
    isCurrentTimerExpired
      ? (currentItem?.completionMessage ?? 'Listo. Puedes revisarlo o cerrarlo cuando quieras.')
      : (currentItem?.backgroundHint ?? 'Esto sigue en curso mientras avanzas en otro frente.'),
    92,
  );
  const compactInlineBody = compactText(inlineMessage?.body ?? null, 84);
  const shouldShowInlineMessage = Boolean(
    inlineMessage &&
    normalizeMessage(compactInlineBody) &&
    normalizeMessage(compactInlineBody) !== normalizeMessage(compactTimerContext) &&
    normalizeMessage(compactInlineBody) !== normalizeMessage(compactCurrentNotes),
  );

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#f4efe9] text-slate-900 transition-[filter,opacity] duration-300 ${isBackgroundMuted ? 'opacity-75 saturate-[0.82] blur-[1px]' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.14),_transparent_32%)]" />

      <div className="relative z-10 h-1.5 w-full bg-black/5">
        <div className="h-full rounded-r-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
      </div>

      {shouldShowInlineMessage && inlineMessage ? (
        <div className="pointer-events-none fixed right-4 top-4 z-30 w-[min(24rem,calc(100vw-2rem))]">
          <div className={`rounded-[1.1rem] border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl ${
            inlineMessage.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
              : 'border-primary/15 bg-white/95 text-slate-800'
          }`}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]">
              {inlineMessage.title}
            </p>
            <p className="mt-1 text-sm leading-5">
              {compactInlineBody}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative z-20 flex min-h-[calc(100dvh-6px)]">
        <aside className="hidden w-[325px] shrink-0 border-r border-primary/10 bg-white/65 backdrop-blur-xl xl:block">
          <TimerRail
            activeTimers={activeTimers}
            componentProgress={componentProgress}
            frontStatuses={presentation.activeFrontStatus}
            isRecipeComplete={isRecipeComplete}
            currentTimerId={currentTimer?.timelineItemId}
            onFocusComponent={onFocusComponent}
            onDismissTimer={onDismissTimer}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/10 bg-white shadow-sm text-2xl">
                  {recipeIcon}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{recipeName}</h1>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={onVoiceToggle}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                    voiceEnabled
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-primary/15 bg-white/80 text-slate-500'
                  }`}
                  title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
                >
                  {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
                <button
                  onClick={onOpenIngredients}
                  className="flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-primary/5"
                >
                  <ListChecks className="h-4 w-4" />
                  Ingredientes
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Más acciones"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white/80 text-slate-700 transition-colors hover:bg-primary/5"
                    >
                      <Ellipsis className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl border-primary/10 bg-card/95 p-2 backdrop-blur">
                    <DropdownMenuItem onClick={onOpenSetup} className="rounded-xl px-3 py-2.5 text-sm font-semibold">
                      <SlidersHorizontal className="h-4 w-4" />
                      Configurar receta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onPlanRecipe} className="rounded-xl px-3 py-2.5 text-sm font-semibold">
                      <ListChecks className="h-4 w-4" />
                      Planificar receta
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-primary/10" />
                    <DropdownMenuItem onClick={onExitRecipe} className="rounded-xl px-3 py-2.5 text-sm font-semibold">
                      <LogOut className="h-4 w-4" />
                      Salir de la receta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onChangeMission} className="rounded-xl px-3 py-2.5 text-sm font-semibold">
                      <RotateCcw className="h-4 w-4" />
                      Reiniciar experiencia
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex items-center gap-3 xl:hidden">
              <button
                type="button"
                onClick={() => setLeftSheetOpen(true)}
                className="rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-sm font-semibold"
              >
                Timers y estado
              </button>
              <button
                type="button"
                onClick={() => setRightSheetOpen(true)}
                className="rounded-full border border-primary/15 bg-white/80 px-4 py-2 text-sm font-semibold"
              >
                Siguiente subpaso
              </button>
            </div>
          </header>

          <section className={`flex flex-1 justify-center px-4 sm:px-6 lg:px-10 ${isRecipeComplete ? 'items-stretch py-4 sm:py-6 lg:py-8' : 'items-center pb-8'}`}>
            <div className={`w-full rounded-[2.2rem] border border-white/80 bg-white/70 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl ${
              isRecipeComplete
                ? 'flex min-h-[calc(100dvh-9rem)] flex-col justify-center px-6 py-10 sm:px-10 sm:py-14'
                : 'max-w-4xl px-6 py-8 sm:px-10 sm:py-12'
            }`}>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-center">
                <span className="inline-flex items-center rounded-full bg-[#f6e3a4] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#b76400]">
                  {isRecipeComplete ? <CheckCircle2 className="mr-2 h-4 w-4" /> : currentItem?.componentIcon ?? '•'} {presentation.componentLabel ?? (isRecipeComplete ? 'Receta terminada' : currentItem?.componentName ?? 'Componente')}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  {presentation.stepProgressLabel ?? (isRecipeComplete ? `${Math.max(totalTimelineItems, 1)} de ${Math.max(totalTimelineItems, 1)} completados` : `Subpaso ${Math.min(currentTimelineIndex + 1, totalTimelineItems || 1)} de ${Math.max(totalTimelineItems, 1)}`)}
                </span>
              </div>

              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  {isRecipeComplete ? (presentation.completionMessage?.title ?? presentation.primaryTitle) : presentation.primaryTitle}
                </h2>
                {(isRecipeComplete ? presentation.completionMessage?.body : presentation.supportingText) ? (
                  <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    {isRecipeComplete
                      ? presentation.completionMessage?.body
                      : presentation.supportingText}
                  </p>
                ) : null}
                {!isRecipeComplete && presentation.nextStepPreview ? (
                  <p className="mx-auto mt-4 max-w-xl text-sm font-semibold text-slate-500">
                    Después sigue: <span className="text-slate-700">{presentation.nextStepPreview.title}</span>
                  </p>
                ) : null}
              </div>

              {isRecipeComplete ? (
                <div className="mx-auto mt-8 w-full max-w-3xl rounded-[1.8rem] border border-emerald-200 bg-emerald-50/80 p-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {componentProgress.map((component) => (
                      <div key={component.componentId} className="rounded-[1.2rem] bg-white/80 p-4 text-center">
                        <p className="text-2xl">{component.icon}</p>
                        <p className="mt-2 font-bold text-slate-900">{component.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{component.totalCount}/{component.totalCount} completos</p>
                      </div>
                    ))}
                  </div>
                  {presentation.completionMessage?.summary ? (
                    <p className="mt-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      {presentation.completionMessage.summary}
                    </p>
                  ) : null}
                  {activeTimers.some((timer) => timer.status === 'expired') ? (
                    <p className="mt-4 text-center text-sm font-medium text-slate-600">
                      Aun quedan timers listos en el panel lateral, pero ya no bloquean el cierre de la receta.
                    </p>
                  ) : null}
                </div>
              ) : presentation.timerBanner ? (
                <div className="mx-auto mt-8 max-w-2xl rounded-[1.6rem] border border-primary/10 bg-[#f9f5ef] p-5 text-left">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
                        <Clock3 className="h-4 w-4" />
                        {presentation.timerBanner.title}
                      </div>
                      {presentation.timerBanner.remainingSeconds != null ? (
                        <p className="mt-3 text-base font-bold text-slate-900">
                          {presentation.timerBanner.remainingSeconds > 0
                            ? `${presentation.componentLabel ?? currentItem?.componentName ?? 'Proceso'} en curso, ${formatCompoundClock(presentation.timerBanner.remainingSeconds)} restante.`
                            : 'Este proceso ya quedó listo.'}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        Estado del timer: {currentTimerStateLabel}
                      </p>
                      {presentation.timerBanner.detail ? (
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {presentation.timerBanner.detail}
                        </p>
                      ) : null}
                    </div>
                    {currentIsTimer && isCurrentTimerStarted && !isCurrentTimerExpired ? (
                      <button
                        type="button"
                        onClick={onToggleCurrentTimer}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-primary/5"
                      >
                        {isCurrentTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isCurrentTimerRunning ? 'Pausar' : 'Reanudar'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : currentItem?.displayValue ? (
                <div className="mt-10 rounded-[1.8rem] border border-primary/10 bg-[#f9f5ef] p-5 text-center">
                  <p className="text-3xl font-extrabold text-slate-900">{String(currentItem.displayValue)}</p>
                  <p className="mt-2 text-sm text-slate-500">Cantidad o referencia para este subpaso</p>
                </div>
              ) : null}

              {!isRecipeComplete && presentation.nextStepPreview ? (
                <div className="mx-auto mt-6 max-w-2xl rounded-[1.5rem] border border-primary/10 bg-white/70 p-5 text-left">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Siguiente mejor acción</p>
                  <h3 className="mt-3 text-2xl font-extrabold text-slate-900">{presentation.nextStepPreview.title}</h3>
                  {(presentation.nextStepPreview.componentName || presentation.nextStepPreview.detail) ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {[presentation.nextStepPreview.componentName, presentation.nextStepPreview.detail].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mx-auto mt-10 flex max-w-md items-center gap-3">
                <button
                  onClick={onPrevious}
                  disabled={currentTimelineIndex <= 0 && !isRecipeComplete}
                  className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-primary/10 bg-white text-slate-700 transition-all hover:bg-primary/5 disabled:opacity-40"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handlePrimaryAction}
                  className={`flex min-h-16 flex-1 items-center justify-center gap-3 rounded-[1.8rem] px-6 text-base font-extrabold text-white shadow-[0_15px_35px_rgba(236,91,19,0.25)] transition-transform active:scale-[0.99] ${
                    isRecipeComplete ? 'bg-slate-900 hover:bg-slate-800' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {primaryIcon}
                  {primaryLabel}
                </button>
              </div>
            </div>
          </section>
        </main>

        <aside className="hidden w-[315px] shrink-0 border-l border-primary/10 bg-white/65 backdrop-blur-xl xl:block">
          <div className="border-b border-primary/10 p-6">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary/85">Siguiente mejor acción</h3>
          </div>
          <div className="space-y-4 p-6">
            {!isRecipeComplete && presentation.nextStepPreview ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f6e3a4] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#b76400]">
                  <ArrowRight className="h-3.5 w-3.5" />
                  {nextItem?.componentIcon ?? '•'} {presentation.nextStepPreview.componentName ?? nextItem?.componentName ?? 'Siguiente frente'}
                </div>
                <h4 className="text-2xl font-extrabold leading-tight">{presentation.nextStepPreview.title}</h4>
                <p className="text-sm leading-7 text-slate-600">
                  {presentation.nextStepPreview.detail || compactNextNotes || 'Sigue con este frente cuando termines el paso actual.'}
                </p>
              </>
            ) : (
              <div className="rounded-[1.5rem] bg-[#f8f3ee] p-4 text-sm font-semibold text-slate-500">
                {isRecipeComplete ? 'La receta quedó completa. Ya puedes cerrar la experiencia o reiniciarla.' : 'No hay más subpasos pendientes en esta receta compuesta.'}
              </div>
            )}
          </div>
        </aside>
      </div>

      <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
        <SheetContent side="left" className="w-[92vw] max-w-sm overflow-y-auto border-primary/10 bg-[#f4efe9] p-0 xl:hidden">
          <SheetHeader className="border-b border-primary/10">
            <SheetTitle>Timers y estado</SheetTitle>
            <SheetDescription>Coordina los frentes activos sin perder el foco principal.</SheetDescription>
          </SheetHeader>
          <TimerRail
            activeTimers={activeTimers}
            componentProgress={componentProgress}
            frontStatuses={presentation.activeFrontStatus}
            isRecipeComplete={isRecipeComplete}
            currentTimerId={currentTimer?.timelineItemId}
            onDismissTimer={onDismissTimer}
            onFocusComponent={(componentId) => {
              onFocusComponent(componentId);
              setLeftSheetOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

        <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[1.75rem] border-primary/10 bg-[#f4efe9] xl:hidden">
          <SheetHeader>
            <SheetTitle>Siguiente mejor acción</SheetTitle>
            <SheetDescription>Un vistazo rápido para anticipar el siguiente frente.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-5 pb-8">
            {!isRecipeComplete && presentation.nextStepPreview ? (
              <>
                <div className="inline-flex items-center rounded-full bg-[#f6e3a4] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#b76400]">
                  {nextItem?.componentIcon ?? '•'} {presentation.nextStepPreview.componentName ?? nextItem?.componentName ?? 'Siguiente frente'}
                </div>
                <h4 className="text-2xl font-extrabold">{presentation.nextStepPreview.title}</h4>
                <p className="text-sm leading-7 text-slate-600">{presentation.nextStepPreview.detail || compactNextNotes || 'Sigue con este frente cuando termines el paso actual.'}</p>
              </>
            ) : (
              <div className="rounded-[1.5rem] bg-white/80 p-4 text-sm font-semibold text-slate-500">
                {isRecipeComplete ? 'Receta completa. Ya no quedan pasos pendientes.' : 'No quedan más subpasos en la cola.'}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
