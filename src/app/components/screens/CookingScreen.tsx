import { RecipeStep, StepLoopState, RecipeContent, SubStep, Portion, Ingredient, Recipe } from '../../../types';
import { RotateCcw, Play, Pause, ChevronsRight, ArrowRight, ListChecks, SlidersHorizontal, Ellipsis, LogOut, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { resolveIngredientDisplayValue, resolveSubStepDisplayValue } from '../../lib/recipeScaling';

interface CookingScreenProps {
  appVersion: string;
  voiceEnabled: boolean;
  speechSupported: boolean;
  currentStepIndex: number;
  currentSubStepIndex: number;
  activeStepLoop: StepLoopState | null;
  isRunning: boolean;
  timeRemaining: number;
  flipPromptVisible: boolean;
  flipPromptCountdown: number;
  stirPromptVisible: boolean;
  stirPromptCountdown: number;
  awaitingNextUnitConfirmation: boolean;
  currentRecipeData: RecipeStep[];
  currentStep: RecipeStep | null;
  currentSubStep: SubStep | null;
  portion: Portion;
  portionValue: number | string | null;
  isRetirarSubStep: boolean;
  retirarTitle: string;
  retirarMessage: string;
  effectiveReminderTitle: string;
  effectiveReminderMessage: string;
  onVoiceToggle: () => void;
  onChangeMission: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onJumpToSubStep: (stepIndex: number, subStepIndex: number) => void;
  onContinue: () => void;
  onConfirmNextUnit: () => void;
  onOpenIngredients: () => void;
  onOpenSetup: () => void;
  onPlanRecipe: () => void;
  onExitRecipe: () => void;
  currentIngredients: Ingredient[];
  activeIngredientSelection: Record<string, boolean>;
  activeRecipeContent: RecipeContent;
  selectedRecipe?: Recipe | null;
  isBackgroundMuted?: boolean;
  peopleCount?: number;
  quantityMode?: 'people' | 'have';
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function isInformativePortionValue(value: string | number | null | undefined) {
  if (typeof value === 'number') return value > 0;
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  const nonInformative = new Set([
    'continuar',
    'siguiente',
    'listo',
    'ok',
    'n/a',
    'na',
    '-',
  ]);
  if (nonInformative.has(normalized)) return false;

  const hasNumber = /\d/.test(normalized);
  const hasMeasureWord = /(cda|cdas|cdita|cditas|gr|g|kg|ml|l|taza|tazas|unidad|unidades|huevo|huevos|pizca|al gusto)/.test(normalized);
  return hasNumber || hasMeasureWord;
}

function getIngredientKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_');
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function CookingScreen({
  currentStepIndex,
  currentSubStepIndex,
  isRunning,
  timeRemaining,
  flipPromptVisible,
  flipPromptCountdown,
  awaitingNextUnitConfirmation,
  currentRecipeData,
  currentStep,
  currentSubStep,
  portion,
  portionValue,
  isRetirarSubStep,
  retirarTitle,
  retirarMessage,
  onChangeMission,
  onPrevious,
  onNext,
  onTogglePause,
  onContinue,
  onConfirmNextUnit,
  onOpenIngredients,
  onOpenSetup,
  onPlanRecipe,
  onExitRecipe,
  currentIngredients,
  activeIngredientSelection,
  activeRecipeContent,
  selectedRecipe,
  isBackgroundMuted = false,
  peopleCount = 2,
  quantityMode = 'people',
}: CookingScreenProps) {
  const flattenedSubSteps = currentRecipeData.flatMap((step, sIdx) =>
    step.subSteps.map((subStep, ssIdx) => ({ stepIndex: sIdx, subStepIndex: ssIdx, step, subStep })),
  );

  const currentFlatIndex = flattenedSubSteps.findIndex(
    (item) => item.stepIndex === currentStepIndex && item.subStepIndex === currentSubStepIndex,
  );

  const currentPosition = currentFlatIndex >= 0 ? currentFlatIndex + 1 : 1;
  const totalSubSteps = Math.max(flattenedSubSteps.length, 1);
  const progressPercent = Math.round((currentPosition / totalSubSteps) * 100);
  const isLastSubStep = currentPosition >= totalSubSteps;
  const isFirstSubStep = currentPosition <= 1;

  const nextItem = currentFlatIndex >= 0 && currentFlatIndex < flattenedSubSteps.length - 1 ? flattenedSubSteps[currentFlatIndex + 1] : null;

  const currentTitle = isRetirarSubStep ? retirarTitle : currentSubStep?.subStepName || currentStep?.stepName || 'Siguiente acción';
  const currentNotes = isRetirarSubStep ? retirarMessage : currentSubStep?.notes || 'Sigue la indicación para continuar.';

  const currentIsTimer = Boolean(currentSubStep?.isTimer);
  const hasPortionValue = isInformativePortionValue(portionValue);

  const quickActionLabel = awaitingNextUnitConfirmation
    ? `Continuar ${activeRecipeContent.portionLabels.singular}`
    : currentIsTimer
      ? isRunning
        ? 'Pausar'
        : 'Reanudar'
      : 'Siguiente';

  const handleQuickAction = () => {
    if (awaitingNextUnitConfirmation) {
      onConfirmNextUnit();
      return;
    }
    if (currentIsTimer) {
      onTogglePause();
      return;
    }
    if (isRetirarSubStep) {
      onContinue();
      return;
    }
    onNext();
  };

  const handleSkipStep = () => {
    if (awaitingNextUnitConfirmation) {
      onConfirmNextUnit();
      return;
    }
    if (isRetirarSubStep) {
      onContinue();
      return;
    }
    if (!isLastSubStep) {
      onNext();
    }
  };

  const recipeName = selectedRecipe?.name ?? 'Receta en curso';
  const recipeIcon = selectedRecipe?.icon ?? '🍳';
  const activeIngredients = currentIngredients.filter((ingredient) => {
    const key = getIngredientKey(ingredient.name);
    return activeIngredientSelection[key] ?? true;
  });
  const nextEstimated = nextItem
    ? resolveSubStepDisplayValue({
      subStep: nextItem.subStep,
      recipe: selectedRecipe,
      content: activeRecipeContent,
      portion,
      peopleCount,
      quantityMode,
    })
    : null;
  const nextEstimatedLabel =
    typeof nextEstimated === 'number'
      ? `Tiempo estimado: ${nextEstimated}s`
      : typeof nextEstimated === 'string' && isInformativePortionValue(nextEstimated)
        ? `Cantidad estimada: ${nextEstimated}`
        : null;
  const consumedIngredientKeys = new Set(
    activeIngredients
      .filter((ingredient) => {
        const ingredientName = normalizeText(ingredient.name);
        const isConsumed = flattenedSubSteps.some((subStepItem, index) => {
          if (index > currentFlatIndex) return false;
          const haystack = normalizeText(
            `${subStepItem.step.stepName} ${subStepItem.subStep.subStepName} ${subStepItem.subStep.notes}`,
          );
          return haystack.includes(ingredientName);
        });
        return isConsumed;
      })
      .map((ingredient) => getIngredientKey(ingredient.name)),
  );

  return (
    <div className={`relative min-h-screen overflow-hidden bg-background text-foreground antialiased transition-[filter,opacity] duration-300 ${isBackgroundMuted ? 'opacity-75 saturate-[0.82] blur-[1px]' : ''}`}>
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.16),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.18),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_58%)] ${isBackgroundMuted ? 'opacity-45' : ''}`} />
      <div className={`pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(236,91,19,0.6)_1px,transparent_1px)] [background-size:24px_24px] transition-opacity duration-300 dark:opacity-[0.05] ${isBackgroundMuted ? 'opacity-[0.015]' : 'opacity-[0.03]'}`} />
      {isBackgroundMuted ? <div className="pointer-events-none absolute inset-0 bg-[#ede4dc]/42" /> : null}

      <div className="relative z-10 h-1.5 w-full bg-white/5">
        <div
          className="h-full rounded-r-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="relative z-20 flex h-[calc(100dvh-6px)] overflow-hidden">
        <aside className={`hidden w-72 shrink-0 flex-col border-r border-primary/10 bg-card/80 backdrop-blur-2xl transition-opacity duration-300 lg:flex ${isBackgroundMuted ? 'opacity-60' : ''}`}>
          <div className="border-b border-primary/10 p-7">
            <h3 className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Ingredientes</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Lista activa</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {activeIngredients.slice(0, 10).map((ingredient) => (
              <div key={ingredient.name} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${
                    consumedIngredientKeys.has(getIngredientKey(ingredient.name))
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-primary/10 bg-background/80 text-primary'
                  }`}
                >
                  {ingredient.emoji || '•'}
                </div>
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-bold ${
                      consumedIngredientKeys.has(getIngredientKey(ingredient.name))
                        ? 'text-emerald-600 line-through dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {ingredient.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resolveIngredientDisplayValue({
                      ingredient,
                      recipe: selectedRecipe,
                      content: activeRecipeContent,
                      portion,
                      peopleCount,
                      quantityMode,
                    })}
                    {consumedIngredientKeys.has(getIngredientKey(ingredient.name)) ? ' · usado' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className={`relative flex flex-1 flex-col transition-opacity duration-300 ${isBackgroundMuted ? 'opacity-70' : ''}`}>
          <header className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  <span className="text-3xl leading-none lg:text-5xl">{recipeIcon}</span>
                  <span>{recipeName}</span>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Más acciones"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card/80 text-foreground transition-all hover:bg-primary/8"
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
          </header>

          <section className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-5">
            <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-4 py-2 backdrop-blur-md">
              <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">
                Subpaso {currentPosition} de {totalSubSteps}
              </span>
            </div>

            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-6xl">{currentTitle}</h2>
            <p className="mb-6 max-w-lg text-base font-medium leading-7 text-slate-600 dark:text-slate-400 sm:mb-8 sm:text-lg">{currentNotes}</p>

            {currentIsTimer ? (
              <div className="relative mb-10 flex items-center justify-center">
                <div className="absolute h-56 w-56 rounded-full bg-primary/20 blur-[80px] sm:h-72 sm:w-72 sm:blur-[100px] lg:h-96 lg:w-96 lg:blur-[120px]" />
                <div className="relative">
                  <div className="text-[4.4rem] font-extrabold leading-none tracking-tight text-primary drop-shadow-[0_0_40px_rgba(236,91,19,0.24)] sm:text-[6rem] lg:text-[9rem]">
                    {formatClock(timeRemaining)}
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.45em] text-primary/80">
                    Minutos restantes
                  </div>
                </div>
              </div>
            ) : hasPortionValue ? (
              <div className="mb-8 w-full max-w-md rounded-3xl border border-primary/10 bg-card/80 p-5">
                <p className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{String(portionValue)}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cantidad estimada</p>
              </div>
            ) : null}

            <div className="relative z-20 mx-auto flex w-full max-w-sm gap-3">
              <button
                onClick={onPrevious}
                disabled={isFirstSubStep}
                title="Volver al subpaso anterior"
                aria-label="Volver al subpaso anterior"
                className="flex w-18 items-center justify-center rounded-[1.5rem] border border-primary/10 bg-card/80 px-4 text-slate-700 transition-all hover:bg-primary/8 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 sm:w-20 sm:rounded-[2rem]"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <button
                onClick={handleQuickAction}
                className={`flex flex-1 items-center justify-center gap-3 rounded-[1.5rem] border py-4 text-base font-extrabold transition-all active:scale-95 sm:rounded-[2rem] sm:py-5 sm:text-lg ${
                  currentIsTimer && isRunning
                    ? 'border-red-400/20 bg-red-500 text-white hover:bg-red-600'
                    : 'border-primary/20 bg-primary text-white shadow-[0_0_30px_rgba(236,91,19,0.22)] hover:bg-primary/92'
                }`}
              >
                {currentIsTimer && isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                {quickActionLabel}
              </button>
              <button
                onClick={handleSkipStep}
                disabled={isLastSubStep}
                title="Saltar subpaso"
                aria-label="Saltar subpaso"
                className="flex w-18 items-center justify-center rounded-[1.5rem] border border-primary/10 bg-card/80 px-4 text-slate-700 transition-all hover:bg-primary/8 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 sm:w-20 sm:rounded-[2rem]"
              >
                <ChevronsRight className="h-7 w-7" />
              </button>
            </div>
          </section>
        </main>

        <aside className={`hidden w-80 shrink-0 flex-col border-l border-primary/10 bg-card/80 backdrop-blur-2xl transition-opacity duration-300 xl:flex ${isBackgroundMuted ? 'opacity-60' : ''}`}>
          <div className="border-b border-primary/10 p-7">
            <h3 className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary/85">Siguiente subpaso</h3>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Vista previa</p>
          </div>
          <div className="space-y-6 p-7">
            {nextItem ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <ArrowRight className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.15em] text-primary/80">
                    Subpaso {currentPosition + 1} de {totalSubSteps}
                  </p>
                  <h4 className="mb-3 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{nextItem.subStep.subStepName}</h4>
                  <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {nextItem.subStep.notes || 'Continúa con este subpaso.'}
                    </p>
                  </div>
                </div>
                {nextEstimatedLabel && (
                  <div className="pt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {nextEstimatedLabel}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">No hay más subpasos</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {flipPromptVisible && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-orange-500 pointer-events-none">
          <div className="px-6 text-center text-white">
            <h3 className="mb-4 text-5xl font-bold md:text-6xl">Voltea el huevo</h3>
            <p className="text-2xl md:text-3xl">Da la vuelta ahora y continúa con el lado B.</p>
            <p className="mt-6 text-4xl font-bold tabular-nums md:text-5xl">{flipPromptCountdown}s</p>
          </div>
        </div>
      )}
    </div>
  );
}
