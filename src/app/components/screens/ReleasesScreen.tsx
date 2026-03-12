import { Badge } from '../ui/badge';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';
import { appBuildMetadata, formatVersionLabel, getEnvironmentLabel } from '../../lib/appMetadata';
import { appReleases } from '../../data/releases';

interface ReleasesScreenProps {
  currentUserEmail: string | null;
  onGoHome: () => void;
  onGoGlobalRecipes: () => void;
  onGoMyRecipes: () => void;
  onGoFavorites: () => void;
  onGoWeeklyPlan: () => void;
  onGoShoppingList: () => void;
  onGoSettings: () => void;
  onSignOut: () => void;
}

function formatReleaseDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReleasesScreen({
  currentUserEmail,
  onGoHome,
  onGoGlobalRecipes,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoSettings,
  onSignOut,
}: ReleasesScreenProps) {
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
      onGoSettings={onGoSettings}
      onSignOut={onSignOut}
    >
      <ProductPage>
        <ProductContainer className="space-y-6">
          <ProductHeader
            eyebrow="Releases"
            title="Actualizaciones de la app"
            description="Consulta la versión activa y el historial de cambios publicados en este producto."
            onBack={onGoSettings}
            actions={
              <Badge className="border border-primary/15 bg-primary/10 text-primary">
                {getEnvironmentLabel(appBuildMetadata.environment)}
              </Badge>
            }
          />

          <ProductSurface className="space-y-6 p-6 md:p-8">
            <div className="rounded-[1.5rem] border border-primary/10 bg-background/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Versión activa</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatVersionLabel()}</p>
                <Badge variant="outline" className="border-primary/10 text-slate-600 dark:text-slate-300">
                  Entorno {getEnvironmentLabel(appBuildMetadata.environment)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {appReleases.map((release) => (
                <article key={release.version} className="rounded-[1.5rem] border border-primary/10 bg-background/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">v{release.version}</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{release.title}</h2>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatReleaseDate(release.date)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{release.summary}</p>
                  <div className="mt-4 space-y-2">
                    {release.changes.map((change) => (
                      <p key={change} className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                        • {change}
                      </p>
                    ))}
                  </div>
                  {release.environmentNote ? (
                    <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {release.environmentNote}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </ProductSurface>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
