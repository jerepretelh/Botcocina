import { ArrowLeft, ListChecks, SlidersHorizontal } from 'lucide-react';
import type { Recipe } from '../../../types';
import type { ScaledRecipeIngredientV2, ScaledRecipeStepV2, ScaledRecipeSubStepV2, ScaledRecipeV2 } from '../../types/recipe-v2';
import type { CookingPresentationV2 } from '../../types/cooking-presentation-v2';
import type { CookingPrimaryActionV2Kind } from '../../lib/presentation/resolveCookingPrimaryActionV2';
import { CookingStepHero } from './CookingStepHero';

interface CookingScreenV2Props {
  selectedRecipe: Recipe | null;
  scaledRecipe: ScaledRecipeV2 | null;
  currentStep: ScaledRecipeStepV2 | null;
  currentSubStep: ScaledRecipeSubStepV2 | null;
  currentIndex: number;
  totalItems: number;
  progressPercent: number;
  isRecipeFinished: boolean;
  presentation: CookingPresentationV2;
  activeIngredients: ScaledRecipeIngredientV2[];
  isRunning: boolean;
  hasTimer: boolean;
  isTimerExpired: boolean;
  timeRemaining: number;
  onResetTimer: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onOpenIngredients: () => void;
  onOpenSetup: () => void;
  onExitRecipe: () => void;
  primaryActionLabel?: string;
  primaryActionKind?: CookingPrimaryActionV2Kind;
}

export function CookingScreenV2({
  selectedRecipe,
  scaledRecipe,
  currentStep,
  currentSubStep,
  currentIndex,
  totalItems,
  progressPercent,
  isRecipeFinished,
  presentation,
  activeIngredients,
  isRunning,
  hasTimer,
  isTimerExpired,
  timeRemaining,
  onPrevious,
  onNext,
  onTogglePause,
  onOpenIngredients,
  onOpenSetup,
  onExitRecipe,
  primaryActionLabel,
  primaryActionKind,
}: CookingScreenV2Props) {
  const stepWords = `${currentSubStep?.text ?? ''} ${currentSubStep?.notes ?? ''}`.toLowerCase();
  const isIngredientUsed = (ingredientName: string) => {
    const needle = ingredientName.toLowerCase();
    return stepWords.includes(needle);
  };

  const defaultPrimaryActionLabel = primaryActionLabel ?? presentation.ctaLabel;
  const defaultPrimaryActionKind: CookingPrimaryActionV2Kind = primaryActionKind ?? 'continue_step';
  const shouldShowSecondaryControls = totalItems > 1 && !isRecipeFinished;
  const shouldShowNextControls =
    shouldShowSecondaryControls &&
    (defaultPrimaryActionKind === 'start_timer' || defaultPrimaryActionKind === 'pause_timer' || defaultPrimaryActionKind === 'noop');
  const canAdvance = !isRunning;
  const canGoPrevious = currentIndex > 0;

  if (isRecipeFinished) {
    return (
      <div className="relative min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[75vh] max-w-4xl flex-col items-center justify-center rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Receta terminada</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            <span aria-hidden>✨</span> Cocina lograda
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
            {presentation.completionMessage?.title ?? `Listo, quedó tu ${selectedRecipe?.name ?? scaledRecipe?.name ?? 'receta'}`}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            {presentation.completionMessage?.body ?? 'Terminaste todos los pasos y ya no quedan timers activos.'}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Guarda este ritmo para la próxima vez: configuración y rendimiento ya quedaron en tu flujo de preparación.
          </p>
          {presentation.completionMessage?.summary ? (
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {presentation.completionMessage.summary}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onExitRecipe}
            className="mt-8 rounded-[1.15rem] bg-slate-900 px-8 py-4 text-base font-bold text-white transition-all active:scale-[0.98]"
          >
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="relative z-10 h-1.5 w-full bg-white/5">
        <div
          className="h-full rounded-r-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="relative z-20 flex h-[calc(100dvh-6px)] overflow-hidden">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-primary/10 bg-card/80 backdrop-blur-2xl lg:flex">
          <div className="border-b border-primary/10 p-7">
            <h3 className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Ingredientes activos</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Estado del paso actual</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {activeIngredients.map((ingredient) => {
              const isUsed = isIngredientUsed(ingredient.name);
              return (
                <div
                  key={ingredient.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${isUsed ? 'border-emerald-200 bg-emerald-50/50' : 'border-primary/10 bg-background/80'}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-background/80 text-lg text-primary">
                    {ingredient.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${isUsed ? 'line-through text-emerald-900' : 'text-slate-900 dark:text-slate-100'}`}>
                      {ingredient.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ingredient.scaledAmount.displayText}</p>
                  </div>
                  <ListChecks className={`ml-auto h-4 w-4 ${isUsed ? 'text-emerald-700' : 'text-slate-300'}`} />
                </div>
              );
            })}
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col">
          <header className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  <span className="text-3xl leading-none lg:text-5xl">{selectedRecipe?.icon ?? scaledRecipe?.icon ?? '🍳'}</span>
                  <span>{selectedRecipe?.name ?? scaledRecipe?.name ?? 'Receta en curso'}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={onOpenIngredients}
                className="flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-card/80 px-3 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/8"
              >
                <ListChecks className="h-4 w-4" />
                Ingredientes
              </button>
              <button
                onClick={onOpenSetup}
                className="flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-card/80 px-3 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/8"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Ajustar
              </button>
              <button
                onClick={onExitRecipe}
                className="flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-card/80 px-3 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-primary/8"
              >
                <ArrowLeft className="h-4 w-4" />
                Salir
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-10 sm:px-5 lg:px-8">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_380px]">
              <section>
                <CookingStepHero
                  stepLabel={`SUBPASO ${Math.min(currentIndex + 1, totalItems)} DE ${totalItems}`}
                  title={presentation.primaryTitle}
                  contextText={presentation.supportingText}
                  estimatedAmount={currentSubStep?.displayValue != null ? String(currentSubStep.displayValue) : null}
                  hasTimer={hasTimer}
                  isTimerRunning={isRunning}
                  isTimerExpired={isTimerExpired}
                  timerTitle={presentation.timerBanner?.title}
                  timerDetail={presentation.timerBanner?.detail}
                  timerRemainingSeconds={presentation.timerBanner?.remainingSeconds ?? timeRemaining}
                  primaryActionLabel={defaultPrimaryActionLabel}
                  primaryActionKind={defaultPrimaryActionKind}
                  onPrimaryAction={() => {
                    if (defaultPrimaryActionKind === 'continue_step' || defaultPrimaryActionKind === 'finish_recipe') {
                      onNext();
                      return;
                    }
                    if (defaultPrimaryActionKind === 'start_timer' || defaultPrimaryActionKind === 'pause_timer') {
                      onTogglePause();
                      return;
                    }
                    onNext();
                  }}
                  showSecondaryNavigation={shouldShowSecondaryControls}
                  showNextControl={shouldShowNextControls}
                  canAdvance={canAdvance}
                  canGoPrevious={canGoPrevious}
                  onPrevious={onPrevious}
                  onNext={onNext}
                />
              </section>

              <aside className="hidden lg:block">
                <div className="rounded-[1.5rem] border border-primary/20 bg-card/70 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Siguiente subpaso</p>
                  {presentation.nextStepPreview ? (
                    <>
                      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                        {presentation.nextStepPreview.title}
                      </p>
                      {(presentation.nextStepPreview.detail || presentation.nextStepPreview.componentName) ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {[presentation.nextStepPreview.componentName, presentation.nextStepPreview.detail].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">No hay más subpasos.</p>
                  )}
                </div>

                {presentation.backgroundHint ? (
                  <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    {presentation.backgroundHint}
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
