import { ArrowLeft, ArrowRight, Check, Pause, Play } from 'lucide-react';
import type { CookingPrimaryActionV2Kind } from '../../lib/presentation/resolveCookingPrimaryActionV2';

interface CookingStepHeroProps {
  stepLabel: string;
  title: string;
  contextText?: string | null;
  estimatedAmount?: string | null;
  hasTimer: boolean;
  isTimerRunning: boolean;
  isTimerExpired: boolean;
  timerTitle?: string | null;
  timerDetail?: string | null;
  timerRemainingSeconds?: number | null;
  primaryActionLabel: string;
  primaryActionKind: CookingPrimaryActionV2Kind;
  onPrimaryAction: () => void;
  showSecondaryNavigation: boolean;
  canAdvance: boolean;
  canGoPrevious?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  showNextControl?: boolean;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function HeroIcon({
  primaryActionKind,
}: {
  primaryActionKind: CookingPrimaryActionV2Kind;
}) {
  if (primaryActionKind === 'pause_timer') {
    return <Pause className="h-5 w-5" />;
  }

  if (primaryActionKind === 'finish_recipe') {
    return <Check className="h-5 w-5" />;
  }

  if (primaryActionKind === 'start_timer' || primaryActionKind === 'continue_step' || primaryActionKind === 'noop') {
    return <Play className="h-5 w-5" />;
  }

  return <Play className="h-5 w-5" />;
}

interface HeroTimerModeProps {
  title?: string | null;
  detail?: string | null;
  remainingSeconds?: number | null;
  isTimerRunning: boolean;
}

function HeroTimerBlock({ title, detail, remainingSeconds, isTimerRunning }: HeroTimerModeProps) {
  if (title == null && detail == null && remainingSeconds == null) {
    return null;
  }

  return (
    <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/80">{title}</p>
      {remainingSeconds != null ? (
        <p className="mt-2 text-5xl font-black tracking-tight text-amber-950 sm:text-6xl">
          {formatClock(remainingSeconds)}
        </p>
      ) : null}
      {detail ? <p className="mt-2 text-sm text-amber-900">{detail}</p> : null}
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800/70">
        {isTimerRunning ? 'Temporizador activo' : 'Temporizador en pausa'}
      </p>
    </div>
  );
}

export function CookingStepHero({
  stepLabel,
  title,
  contextText,
  estimatedAmount,
  hasTimer,
  isTimerRunning,
  isTimerExpired,
  timerTitle,
  timerDetail,
  timerRemainingSeconds,
  primaryActionLabel,
  primaryActionKind,
  onPrimaryAction,
  showSecondaryNavigation,
  canAdvance,
  canGoPrevious = true,
  onPrevious,
  onNext,
  showNextControl = false,
}: CookingStepHeroProps) {
  const shouldRenderNextControl = showNextControl && (primaryActionKind === 'start_timer' || primaryActionKind === 'pause_timer');

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-card/80 p-6 shadow-sm sm:p-8">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80"> {stepLabel} </div>
      <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {contextText ? <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{contextText}</p> : null}
                  {estimatedAmount ? <p className="mt-4 text-sm font-bold text-slate-700">{estimatedAmount}</p> : null}

      {hasTimer ? (
        <HeroTimerBlock
          title={timerTitle}
          detail={timerDetail}
          remainingSeconds={timerRemainingSeconds}
          isTimerRunning={isTimerRunning}
        />
      ) : null}

      <div className="mt-7 flex flex-col gap-3">
        <button
          type="button"
          onClick={onPrimaryAction}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-black transition-colors ${hasTimer && isTimerRunning
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
                <HeroIcon
                  primaryActionKind={primaryActionKind}
                />
                {primaryActionLabel}
              </button>

        {showSecondaryNavigation ? (
          <div className="flex items-center justify-between gap-3">
            {shouldRenderNextControl ? (
              <button
                type="button"
                onClick={onNext}
                disabled={!canAdvance}
                className="rounded-full border border-[#edd9cc] bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ) : null}
            <button
                type="button"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className={`rounded-full border border-[#edd9cc] bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-[#fff8f4] ${!canGoPrevious ? 'cursor-not-allowed opacity-50' : ''}`}
              >
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
