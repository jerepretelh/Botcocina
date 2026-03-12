import * as React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from './utils';

export function ProductPage({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('relative min-h-[100dvh] overflow-hidden bg-background text-foreground', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.14),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_56%)] dark:bg-[radial-gradient(circle_at_top,_rgba(236,91,19,0.18),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_56%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(236,91,19,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(236,91,19,0.14) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function ProductContainer({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('mx-auto w-full max-w-md px-4 py-5 sm:max-w-lg sm:px-5 md:max-w-3xl md:px-6 lg:max-w-6xl lg:px-8 lg:py-8', className)}>{children}</div>;
}

export function ProductHeader({
  eyebrow,
  title,
  description,
  onBack,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-7 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-card/75 text-foreground transition-colors active:scale-[0.98] sm:size-11"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1.5 text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl md:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function ProductSurface({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-primary/10 bg-card/85 shadow-[0_20px_60px_rgba(79,40,22,0.08)] backdrop-blur sm:rounded-[1.75rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProductSectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
    </div>
  );
}

export function ProductEmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-primary/20 bg-background/70 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <Sparkles className="size-7" />}
      </div>
      {message}
    </div>
  );
}

export function ProductBottomBar({
  children,
}: React.PropsWithChildren) {
  return (
    <div className="fixed inset-x-0 bottom-[4.85rem] z-20 border-t border-primary/10 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-3 backdrop-blur-xl lg:bottom-0 lg:px-6 lg:pb-6 lg:pt-4">
      <div className="mx-auto max-w-md sm:max-w-lg">{children}</div>
    </div>
  );
}
