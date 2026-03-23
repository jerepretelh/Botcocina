import { Beaker, ChevronRight, Flame, TimerReset } from 'lucide-react';
import type { Recipe } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface CompoundLabScreenProps {
  currentUserEmail: string | null;
  recipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
  onQuickCook: (recipe: Recipe) => void;
  onSignOut: () => void;
}

export function CompoundLabScreen({
  currentUserEmail,
  recipes,
  onOpenRecipe,
  onQuickCook,
  onSignOut,
}: CompoundLabScreenProps) {
  return (
    <MainShellLayout
      activeItem="compound-lab"
      currentUserEmail={currentUserEmail}
      onSignOut={onSignOut}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(236,91,19,0.08),rgba(246,227,164,0.3))] p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary text-white shadow-lg shadow-primary/25">
              <Beaker className="h-7 w-7" />
            </div>
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary/85">Laboratorio</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Recetas compuestas de prueba
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Este módulo concentra las demos del nuevo flujo tipo cockpit. Aquí puedes abrir la configuración normal
                o entrar directo a cocinar para validar timers simultáneos, progreso por componente y vista previa del siguiente subpaso.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="rounded-[2rem] border border-primary/10 bg-card/90 p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                    <Flame className="h-3.5 w-3.5" />
                    Flujo compuesto
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                    <span className="mr-2">{recipe.icon}</span>
                    {recipe.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">{recipe.description}</p>
                </div>
                <div className="rounded-[1.2rem] bg-[#f7efe3] p-3 text-primary">
                  <TimerReset className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onOpenRecipe(recipe)}
                  className="rounded-full border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary/5"
                >
                  Abrir configuración
                </button>
                <button
                  type="button"
                  onClick={() => onQuickCook(recipe)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  Entrar al flujo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainShellLayout>
  );
}
