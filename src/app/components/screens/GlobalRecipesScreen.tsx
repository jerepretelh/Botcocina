import { ChevronRight, FolderOpen } from 'lucide-react';
import type { RecipeCategory } from '../../../types';
import { MainShellLayout } from './MainShellLayout';

interface GlobalCategoryEntry {
  category: RecipeCategory | {
    id: 'all';
    name: string;
    icon: string;
    description?: string;
  };
  recipeCount: number;
}

interface GlobalRecipesScreenProps {
  currentUserEmail: string | null;
  categories: GlobalCategoryEntry[];
  onSelectCategory: (category: GlobalCategoryEntry['category']) => void;
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

export function GlobalRecipesScreen({
  currentUserEmail,
  categories,
  onSelectCategory,
  onGoHome,
  onGoGlobalRecipes,
  onGoMyRecipes,
  onGoFavorites,
  onGoWeeklyPlan,
  onGoShoppingList,
  onGoCompoundLab,
  onGoSettings,
  onSignOut,
}: GlobalRecipesScreenProps) {
  return (
    <MainShellLayout
      activeItem="global-recipes"
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
      <div className="min-h-screen bg-[#ede4dc] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#da6f3e]">Recetas globales</p>
            <h1 className="mt-2 text-[1rem] font-black tracking-tight text-[#131d36]">Explora por categoría</h1>
            <p className="mt-1 text-[0.875rem] text-[#6d6a67]">Entra a una agrupación y elige una receta pública ya disponible.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map(({ category, recipeCount }) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category)}
                className="rounded-[1.35rem] border border-[#d8d1cb] bg-[#f5f4f3] p-4 text-left shadow-[0_8px_20px_rgba(78,64,53,0.08)] transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 items-center justify-center rounded-[1rem] bg-[#e7ddd5] text-2xl">
                      {category.icon}
                    </div>
                    <div>
                      <h2 className="text-[1rem] font-black text-[#182338]">{category.name}</h2>
                      <p className="mt-1 text-[0.875rem] text-[#6d7788]">{category.description ?? 'Categoría disponible'}</p>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 size-4 text-[#99a0ad]" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-2xl bg-[#d8e5ff] px-2.5 py-0.5 text-[0.75rem] font-bold text-[#2457eb]">
                    {recipeCount} receta{recipeCount === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))}

            {categories.length === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-[#d8d1cb] bg-[#f5f4f3] p-8 text-center text-[0.875rem] text-[#6d6a67] md:col-span-2 xl:col-span-3">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f4ddd1] text-[#da6f3e]">
                  <FolderOpen className="size-6" />
                </div>
                No encontré categorías globales disponibles por ahora.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MainShellLayout>
  );
}
