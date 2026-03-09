import { Search, Sparkles } from 'lucide-react';
import { RecipeCategory, RecipeCategoryId, RecipeSeedSearchResult } from '../../../types';
import { MainShellLayout } from './MainShellLayout';
import { ProductContainer, ProductEmptyState, ProductHeader, ProductPage, ProductSurface } from '../ui/product-system';

interface RecipeSeedSearchScreenProps {
    currentUserEmail: string | null;
    categories: RecipeCategory[];
    searchTerm: string;
    selectedCategoryId: RecipeCategoryId | null;
    seeds: RecipeSeedSearchResult[];
    isLoading: boolean;
    warning: string | null;
    onSearchTermChange: (value: string) => void;
    onSelectCategory: (categoryId: RecipeCategoryId | null) => void;
    onSelectSeed: (seed: RecipeSeedSearchResult) => void;
    onBack: () => void;
    onGoHome: () => void;
    onGoMyRecipes: () => void;
    onGoFavorites: () => void;
    onGoWeeklyPlan: () => void;
    onGoShoppingList: () => void;
    onGoSettings: () => void;
    onSignOut: () => void;
}

export function RecipeSeedSearchScreen({
    currentUserEmail,
    categories,
    searchTerm,
    selectedCategoryId,
    seeds,
    isLoading,
    warning,
    onSearchTermChange,
    onSelectCategory,
    onSelectSeed,
    onBack,
    onGoHome,
    onGoMyRecipes,
    onGoFavorites,
    onGoWeeklyPlan,
    onGoShoppingList,
    onGoSettings,
    onSignOut,
}: RecipeSeedSearchScreenProps) {
    const searchableCategories = categories.filter((category) => category.id !== 'personalizadas');

    return (
        <MainShellLayout
            activeItem="home"
            currentUserEmail={currentUserEmail}
            onGoHome={onGoHome}
            onGoMyRecipes={onGoMyRecipes}
            onGoFavorites={onGoFavorites}
            onGoWeeklyPlan={onGoWeeklyPlan}
            onGoShoppingList={onGoShoppingList}
            onGoSettings={onGoSettings}
            onSignOut={onSignOut}
        >
            <ProductPage>
                <ProductContainer>
                    <ProductHeader
                        eyebrow="Buscador"
                        title="Ideas de receta"
                        description="Busca por nombre o categoría. Al elegir una idea, abriremos el wizard IA con esa receta base precargada."
                        onBack={onBack}
                    />

                    <ProductSurface className="space-y-6 p-6 md:p-8">
                        <div className="rounded-[1.75rem] border border-primary/15 bg-background/80 p-4 shadow-sm">
                            <div className="flex items-center gap-3 rounded-[1.25rem] border border-primary/10 bg-white/80 px-4 py-3 dark:bg-white/5">
                                <Search className="size-5 text-primary" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => onSearchTermChange(event.target.value)}
                                    placeholder="Busca milanesa, ceviche, lomo saltado, brownie..."
                                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSelectCategory(null)}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedCategoryId === null ? 'bg-primary text-primary-foreground' : 'border border-primary/10 bg-card text-slate-700 hover:text-primary dark:text-slate-300'}`}
                                >
                                    Todas
                                </button>
                                {searchableCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => onSelectCategory(category.id)}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedCategoryId === category.id ? 'bg-primary text-primary-foreground' : 'border border-primary/10 bg-card text-slate-700 hover:text-primary dark:text-slate-300'}`}
                                    >
                                        {category.icon} {category.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {warning ? (
                            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                                {warning}
                            </div>
                        ) : null}

                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Resultados</p>
                                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    {isLoading ? 'Buscando ideas...' : `${seeds.length} idea${seeds.length === 1 ? '' : 's'} encontradas`}
                                </h2>
                            </div>
                            <p className="max-w-sm text-right text-sm text-slate-500 dark:text-slate-400">
                                Estas entradas todavía no son recetas completas. Solo sirven para empezar una generación guiada.
                            </p>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className="h-40 animate-pulse rounded-[1.75rem] border border-primary/10 bg-card/70" />
                                ))}
                            </div>
                        ) : seeds.length === 0 ? (
                            <ProductEmptyState message="No encontré ideas con esa búsqueda. Prueba otro nombre o una categoría distinta." />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {seeds.map((seed) => {
                                    const category = categories.find((item) => item.id === seed.categoryId) ?? null;
                                    return (
                                        <div
                                            key={seed.id}
                                            className="flex h-full flex-col rounded-[1.75rem] border border-primary/10 bg-background/75 p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                                                    {category?.icon ?? '🍽️'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                                                            {category?.name ?? seed.categoryId}
                                                        </span>
                                                        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                                            Idea de receta
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">{seed.name}</h3>
                                                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                                        {seed.shortDescription || 'Usa esta receta base como punto de partida y completa el contexto con IA.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                                    {seed.searchTerms.slice(0, 3).join(' · ')}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectSeed(seed)}
                                                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
                                                >
                                                    <Sparkles className="size-4" />
                                                    Empezar con esta idea
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ProductSurface>
                </ProductContainer>
            </ProductPage>
        </MainShellLayout>
    );
}
