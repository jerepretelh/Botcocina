import { Badge } from '../ui/badge';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductHeader, ProductPage, ProductSectionTitle, ProductSurface } from '../ui/product-system';
import { productBacklog, productBacklogLastUpdated } from '../../data/backlog';
import { buildBacklogSections, summarizeBacklog } from '../../lib/backlogView';

interface BacklogScreenProps {
  currentUserEmail: string | null;
  onGoHome: () => void;
  onGoGlobalRecipes: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoCompoundLab: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function priorityLabel(priority: 'high' | 'medium' | 'low'): string {
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Media';
  return 'Baja';
}

function statusTone(status: 'pending' | 'in_progress' | 'done'): string {
  if (status === 'pending') return 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  if (status === 'in_progress') return 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

export function BacklogScreen({
  currentUserEmail,
  onGoHome,
  onGoGlobalRecipes,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoCompoundLab,
  onGoSettings,
  onSignOut,
}: BacklogScreenProps) {
  const sections = buildBacklogSections(productBacklog);
  const summary = summarizeBacklog(productBacklog);

  return (
    <MainShellLayout
      activeItem="settings"
      currentUserEmail={currentUserEmail}
      onGoHome={onGoHome}
      onGoGlobalRecipes={onGoGlobalRecipes}
      onGoMyRecipes={onGoMyRecipes}
      onGoFavorites={onGoFavorites}
      onGoWeeklyPlan={onGoWeeklyPlan}
      onGoShoppingList={onGoShoppingList}
      onGoCompoundLab={onGoCompoundLab}
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <ProductPage>
        <ProductContainer className="space-y-6">
          <ProductHeader
            eyebrow="Backlog"
            title="Backlog curado de producto"
            description="Vista interna para ordenar lo ya resuelto y lo siguiente a trabajar, sin mezclar ideas sueltas ni cambiar el flujo operativo de la app."
            onBack={onGoSettings}
            actions={
              <>
                <Badge className="border border-primary/15 bg-primary/10 text-primary">
                  {summary.epics} épicas
                </Badge>
                <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                  Actualizado {formatDate(productBacklogLastUpdated)}
                </Badge>
              </>
            }
          />

          <ProductSurface className="p-6 md:p-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Épicas</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.epics}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Historias</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.stories}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Tareas</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.tasks}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">En progreso</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.inProgress}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Pendientes</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.pending}</p>
              </div>
            </div>
          </ProductSurface>

          <div className="grid gap-6 xl:grid-cols-3">
            {sections.map((section) => (
              <ProductSurface key={section.status} className="p-6">
                <div className="flex items-start justify-between gap-3 border-b border-primary/10 pb-4">
                  <ProductSectionTitle
                    eyebrow="Estado"
                    title={section.title}
                    description={section.description}
                  />
                  <Badge className={`border ${statusTone(section.status)}`}>
                    {section.count}
                  </Badge>
                </div>

                <div className="mt-5 space-y-4">
                  {section.epics.map((epic) => (
                    <article key={`${section.status}:${epic.epicId}`} className="rounded-[1.35rem] border border-primary/10 bg-background/75 p-4">
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge className="border border-primary/15 bg-primary/10 text-primary">Épica</Badge>
                        <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                          Prioridad {priorityLabel(epic.epicPriority)}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{epic.epicTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{epic.epicSummary}</p>

                      <div className="mt-4 space-y-3">
                        {epic.items.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-primary/10 bg-card/80 p-3">
                            <div className="flex flex-wrap items-start gap-2">
                              <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                                {item.type === 'story' ? 'Historia' : 'Tarea'}
                              </Badge>
                              <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                                Prioridad {priorityLabel(item.priority)}
                              </Badge>
                              {item.links?.recipeIds?.length ? (
                                <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                                  {item.links.recipeIds.join(', ')}
                                </Badge>
                              ) : null}
                            </div>
                            <h4 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.summary}</p>
                            {item.links?.notes ? (
                              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.links.notes}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </ProductSurface>
            ))}
          </div>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
