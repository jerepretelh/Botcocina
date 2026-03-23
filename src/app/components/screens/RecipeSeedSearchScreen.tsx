import type { MixedRecipeSearchResult } from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';
import { MixedRecipeSearchPanel } from '../search/MixedRecipeSearchPanel';

interface RecipeSeedSearchScreenProps {
  currentUserEmail: string | null;
  searchTerm: string;
  results: MixedRecipeSearchResult[];
  isLoading: boolean;
  warning: string | null;
  onSearchTermChange: (value: string) => void;
  onSelectResult: (result: MixedRecipeSearchResult) => void;
  onBack: () => void;
  onSignOut: () => void;
}

export function RecipeSeedSearchScreen({
  currentUserEmail,
  searchTerm,
  results,
  isLoading,
  warning,
  onSearchTermChange,
  onSelectResult,
  onBack,
  onSignOut,
}: RecipeSeedSearchScreenProps) {
  return (
    <MainShellLayout
      activeItem="home"
      currentUserEmail={currentUserEmail}
      onSignOut={onSignOut}
    >
      <ProductPage className="bg-[#ede4dc]">
        <ProductContainer>
          <ProductHeader
            eyebrow="Buscador"
            title="Buscar recetas e ideas"
            description="Explora recetas completas del catálogo y también ideas base para abrir el wizard IA."
            onBack={onBack}
          />

          <ProductSurface className="space-y-5 border-[#d8d1cb] bg-[#efe7df] p-5 md:p-7">
            <MixedRecipeSearchPanel
              query={searchTerm}
              onQueryChange={onSearchTermChange}
              results={results}
              isLoading={isLoading}
              placeholder="Busca por nombre, ingrediente o categoría..."
              emptyMessage="No encontré resultados con esa búsqueda. Intenta con otro plato o ingrediente."
              totalLabel={`${results.length} resultado${results.length === 1 ? '' : 's'} encontrados`}
              compact
              onSelectResult={onSelectResult}
            />

            {warning ? (
              <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {warning}
              </div>
            ) : null}
          </ProductSurface>
        </ProductContainer>
      </ProductPage>
    </MainShellLayout>
  );
}
