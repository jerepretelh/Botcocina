import { RecipeStep, StepLoopState, RecipeContent, SubStep, Portion, Ingredient, Recipe } from '../../../types';
import { RotateCcw, Play, Pause, ChevronsRight } from 'lucide-react';

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
  currentIngredients: Ingredient[];
  activeIngredientSelection: Record<string, boolean>;
  activeRecipeContent: RecipeContent;
  selectedRecipe?: Recipe | null;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toDisplayValue(value: string | number) {
  if (typeof value === 'number') return formatClock(value);
  return value;
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

export function CookingScreen({
  currentStepIndex,
  currentSubStepIndex,
  isRunning,
  timeRemaining,
  flipPromptVisible,
  flipPromptCountdown,
  stirPromptVisible,
  stirPromptCountdown,
  awaitingNextUnitConfirmation,
  currentRecipeData,
  currentStep,
  currentSubStep,
  portion,
  portionValue,
  isRetirarSubStep,
  retirarTitle,
  retirarMessage,
  effectiveReminderTitle,
  effectiveReminderMessage,
  onChangeMission,
  onNext,
  onTogglePause,
  onContinue,
  onConfirmNextUnit,
  activeRecipeContent,
  selectedRecipe,
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
        : 'Iniciar'
      : 'Siguiente';
  const isRunningTimerStep = currentIsTimer && isRunning;

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
  const recipeIcon = selectedRecipe?.icon ?? '👨‍🍳';
  const nextPosition = nextItem ? currentPosition + 1 : currentPosition;
  const nextPortionValue = nextItem?.subStep.portions[portion];
  const nextValueIsNumber = typeof nextPortionValue === 'number';
  const hasInformativeNextValue = isInformativePortionValue(nextPortionValue);

  return (
    <div className="min-h-screen bg-[#f5efd9] px-4 py-4 md:px-5 lg:px-6">
      <div className="mx-auto max-w-[1280px]">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl text-orange-600">{recipeIcon}</div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#8f2f0d]">{recipeName}</h1>
          </div>
          <button
            onClick={onChangeMission}
            className="inline-flex items-center gap-3 rounded-3xl bg-[#f7f7f7] px-4 py-2.5 text-base md:text-xl lg:text-2xl font-semibold text-orange-600 shadow-md border border-slate-200"
          >
            <RotateCcw className="h-5 w-5 md:h-6 md:w-6" /> Reiniciar
          </button>
        </header>

        <section className="mt-4 rounded-3xl bg-[#ececef] px-5 py-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-slate-600">Progreso</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-600">Subpaso {currentPosition} de {totalSubSteps}</p>
          </div>
          <div className="mt-3 h-3.5 md:h-4 rounded-full bg-[#cfd1d7] overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <article className="rounded-[30px] border-[3px] border-orange-500 bg-[#ececef] p-5 md:p-6 lg:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-[18px] md:text-[24px] lg:text-[30px] font-extrabold uppercase tracking-wide text-orange-600">Subpaso actual</p>
              <p className="text-[24px] md:text-[34px] lg:text-[40px] font-bold text-[#7f2f14]">#{currentPosition}</p>
            </div>

            <h2 className="mt-5 text-[30px] md:text-[38px] lg:text-[44px] leading-[1.08] font-bold text-[#101c36]">{currentTitle}</h2>
            <p className="mt-4 text-[19px] md:text-[22px] lg:text-[26px] leading-[1.25] text-slate-600">{currentNotes}</p>

            {currentIsTimer && (
              <div className="mt-6 rounded-3xl bg-orange-500 px-6 py-5 text-white">
                <p className="text-[46px] md:text-[60px] lg:text-[72px] leading-none font-bold tabular-nums">{formatClock(timeRemaining)}</p>
                <p className="mt-2 text-[18px] md:text-[22px] lg:text-[26px]">minutos restantes</p>
              </div>
            )}

            {!currentIsTimer && hasPortionValue && (
              <div className="mt-6 rounded-3xl bg-[#ebdfc6] px-6 py-5 text-[#ab380f]">
                <p className="text-[30px] md:text-[36px] lg:text-[42px] font-bold">{String(portionValue)}</p>
                <p className="mt-1 text-[16px] md:text-[20px] lg:text-[22px]">Cantidad según porción.</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <button
                onClick={handleQuickAction}
                className={`w-full rounded-3xl px-6 py-3.5 md:py-4 text-[24px] md:text-[30px] lg:text-[34px] font-bold text-white shadow-md inline-flex items-center justify-center gap-3 transition-colors duration-200 ${
                  isRunningTimerStep
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {currentIsTimer ? (isRunning ? <Pause className="h-7 w-7 md:h-9 md:w-9" /> : <Play className="h-7 w-7 md:h-9 md:w-9" />) : <Play className="h-7 w-7 md:h-9 md:w-9" />}
                {quickActionLabel}
              </button>

              <button
                onClick={handleSkipStep}
                disabled={isLastSubStep}
                title="Saltar subpaso"
                aria-label="Saltar subpaso"
                className="h-full min-h-[56px] rounded-2xl border border-slate-400 bg-slate-100 px-4 md:px-5 text-slate-700 inline-flex items-center justify-center transition-colors duration-200 hover:bg-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:border-slate-400"
              >
                <ChevronsRight className="h-6 w-6 md:h-7 md:w-7" />
              </button>
            </div>
          </article>

          <article className="rounded-[30px] border-[3px] border-slate-300 bg-[#ececef] p-5 md:p-6 lg:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-[18px] md:text-[24px] lg:text-[30px] font-extrabold uppercase tracking-wide text-slate-500">Siguiente subpaso</p>
              <p className="text-[24px] md:text-[34px] lg:text-[40px] font-bold text-slate-500">#{nextPosition}</p>
            </div>

            {nextItem ? (
              <>
                <h3 className="mt-5 text-[30px] md:text-[38px] lg:text-[44px] leading-[1.08] font-bold text-[#1b2741]">{nextItem.subStep.subStepName}</h3>
                <p className="mt-4 text-[19px] md:text-[22px] lg:text-[26px] leading-[1.25] text-slate-600">{nextItem.subStep.notes || 'Continúa con este subpaso.'}</p>

                {hasInformativeNextValue && (
                  <div className="mt-6 rounded-3xl bg-[#cfd3db] px-5 py-5 md:px-6 md:py-6">
                    <p
                      className={`font-bold leading-none text-[#33415d] ${nextValueIsNumber ? 'text-[40px] md:text-[52px] lg:text-[64px] tabular-nums' : 'text-[26px] md:text-[34px] lg:text-[40px]'}`}
                    >
                      {toDisplayValue(nextPortionValue)}
                    </p>
                    <p className="mt-1 text-[16px] md:text-[18px] lg:text-[20px] text-[#4a566e]">
                      {typeof nextPortionValue === 'number' ? 'duración estimada' : 'cantidad estimada'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-8 text-[20px] md:text-[26px] text-slate-500">No hay más subpasos.</p>
            )}
          </article>
        </section>
      </div>

      {flipPromptVisible && (
        <div className="fixed inset-0 z-40 bg-orange-500 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white px-6">
            <h3 className="text-5xl md:text-6xl font-bold mb-4">Voltea el huevo</h3>
            <p className="text-2xl md:text-3xl">Da la vuelta ahora y continúa con el lado B.</p>
            <p className="mt-6 text-4xl md:text-5xl font-bold tabular-nums">{flipPromptCountdown}s</p>
          </div>
        </div>
      )}

      {/* Modal azul de recordatorio deshabilitado por UX: interrumpe demasiado el flujo */}
    </div>
  );
}
