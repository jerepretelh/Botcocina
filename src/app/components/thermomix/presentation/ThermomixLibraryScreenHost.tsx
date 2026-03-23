import { Suspense, lazy } from 'react';
import type { Recipe } from '../../../../types';
import { CategorySelectScreen } from '../../screens/CategorySelectScreen';
import { RecipeLibraryScreen } from '../../screens/RecipeLibraryScreen';
import { GlobalRecipesScreen } from '../../screens/GlobalRecipesScreen';
import { GlobalRecipesCategoryScreen } from '../../screens/GlobalRecipesCategoryScreen';
import { dedupeRecipesById, COMPOUND_DEMO_FALLBACKS, COMPOUND_DEMO_IDS } from '../lib/runtimeHelpers';
import type { AppShellModel, LibraryUiModel } from '../lib/screenModels';

const DesignSystemScreen = lazy(() => import('../../screens/DesignSystemScreen').then((module) => ({ default: module.DesignSystemScreen })));
const RecipeSeedSearchScreen = lazy(() => import('../../screens/RecipeSeedSearchScreen').then((module) => ({ default: module.RecipeSeedSearchScreen })));
const AISettingsScreen = lazy(() => import('../../screens/AISettingsScreen').then((module) => ({ default: module.AISettingsScreen })));
const ReleasesScreen = lazy(() => import('../../screens/ReleasesScreen').then((module) => ({ default: module.ReleasesScreen })));
const BacklogScreen = lazy(() => import('../../screens/BacklogScreen').then((module) => ({ default: module.BacklogScreen })));
const CompoundLabScreen = lazy(() => import('../../screens/CompoundLabScreen').then((module) => ({ default: module.CompoundLabScreen })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="rounded-[1.5rem] border border-primary/10 bg-card/80 px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:text-slate-400">
        Cargando pantalla...
      </div>
    </div>
  );
}

export function ThermomixLibraryScreenHost({ appShell, libraryUi }: { appShell: AppShellModel; libraryUi: LibraryUiModel }) {
  if (libraryUi.screen === 'category-select') {
    return (
      <CategorySelectScreen
        appVersion={appShell.appVersion}
        voiceEnabled={libraryUi.voiceEnabled}
        onVoiceToggle={libraryUi.onVoiceToggle}
        speechSupported={libraryUi.speechSupported}
        aiError={libraryUi.ai.aiError}
        aiSuccess={libraryUi.ai.aiSuccess}
        onOpenAIWizard={libraryUi.openAIWizard}
        recentRecipes={libraryUi.recentPrivateRecipes}
        favoriteRecipeIds={libraryUi.favoriteRecipeIds}
        searchTerm={libraryUi.recipeSeedSearchTerm}
        searchResults={libraryUi.mixedSearchResults}
        searchIsLoading={libraryUi.recipeSeeds.isLoading}
        onSearchTermChange={libraryUi.setRecipeSeedSearchTerm}
        onSearchSelectResult={libraryUi.handleSearchResultSelect}
        onRecipeOpen={libraryUi.handleRecipeOpen}
        onToggleFavorite={(recipeId) => void libraryUi.toggleFavorite(recipeId)}
        onOpenGlobalRecipes={() => libraryUi.navigate('global-recipes')}
        onOpenMyRecipes={() => libraryUi.navigate('my-recipes')}
        onOpenFavorites={() => libraryUi.navigate('favorites')}
        onOpenWeeklyPlan={() => libraryUi.navigate('weekly-plan')}
        onOpenShoppingList={() => libraryUi.navigate('shopping-list')}
        onOpenCompoundLab={() => libraryUi.navigate('compound-lab')}
        onOpenAISettings={() => libraryUi.navigate('ai-settings')}
        currentUserEmail={appShell.currentUserEmail}
        onSignOut={() => void appShell.authSignOut()}
        onPlanRecipe={(recipe) => libraryUi.openPlanForRecipe(recipe, libraryUi.screen)}
      />
    );
  }

  if (libraryUi.screen === 'design-system') {
    return <Suspense fallback={<ScreenFallback />}><DesignSystemScreen onBack={() => libraryUi.navigate('category-select')} /></Suspense>;
  }

  if (libraryUi.screen === 'global-recipes') {
    return (
      <GlobalRecipesScreen
        currentUserEmail={appShell.currentUserEmail}
        categories={libraryUi.globalCategories}
        onSelectCategory={(category) => libraryUi.selectGlobalCategory(category.id === 'all' ? null : category.id)}
        onSignOut={() => void appShell.authSignOut()}
      />
    );
  }

  if (libraryUi.screen === 'recipe-seed-search') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <RecipeSeedSearchScreen
          currentUserEmail={appShell.currentUserEmail}
          searchTerm={libraryUi.recipeSeedSearchTerm}
          results={libraryUi.mixedSearchResults}
          isLoading={libraryUi.recipeSeeds.isLoading}
          warning={libraryUi.recipeSeeds.warning}
          onSearchTermChange={libraryUi.setRecipeSeedSearchTerm}
          onSelectResult={libraryUi.handleSearchResultSelect}
          onBack={() => libraryUi.goBackScreen('category-select')}
          onSignOut={() => void appShell.authSignOut()}
        />
      </Suspense>
    );
  }

  if (libraryUi.screen === 'ai-settings') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AISettingsScreen
          currentUserEmail={appShell.currentUserEmail}
          onOpenReleases={() => libraryUi.navigate('releases')}
          onOpenBacklog={() => libraryUi.navigate('backlog')}
          onSignOut={() => void appShell.authSignOut()}
        />
      </Suspense>
    );
  }

  if (libraryUi.screen === 'releases') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <ReleasesScreen
          currentUserEmail={appShell.currentUserEmail}
          onGoSettings={() => libraryUi.navigate('ai-settings')}
          onSignOut={() => void appShell.authSignOut()}
        />
      </Suspense>
    );
  }

  if (libraryUi.screen === 'backlog') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <BacklogScreen
          currentUserEmail={appShell.currentUserEmail}
          onGoSettings={() => libraryUi.navigate('ai-settings')}
          onSignOut={() => void appShell.authSignOut()}
        />
      </Suspense>
    );
  }

  if (libraryUi.screen === 'my-recipes' || libraryUi.screen === 'favorites') {
    const isFavorites = libraryUi.screen === 'favorites';
    return (
      <RecipeLibraryScreen
        title={isFavorites ? 'Favoritos' : 'Mis recetas'}
        description={isFavorites
          ? 'Tus recetas favoritas, públicas o privadas, reunidas en un solo lugar para volver a ellas rápido.'
          : 'Tus recetas privadas y creaciones de IA guardadas para volver a cocinarlas o afinarlas cuando quieras.'}
        activeItem={libraryUi.screen}
        currentUserEmail={appShell.currentUserEmail}
        recipes={isFavorites ? libraryUi.favoriteRecipes : libraryUi.privateUserRecipes}
        favoriteRecipeIds={libraryUi.favoriteRecipeIds}
        emptyState={isFavorites
          ? 'Todavía no tienes favoritos. Usa el corazón en Inicio, Mis recetas o en cualquier listado de recetas.'
          : 'Aún no tienes recetas privadas. Crea una receta con IA desde Inicio para empezar tu biblioteca.'}
        onRecipeOpen={libraryUi.handleRecipeOpen}
        onToggleFavorite={(recipeId) => void libraryUi.toggleFavorite(recipeId)}
        onPlanRecipe={(recipe) => libraryUi.openPlanForRecipe(recipe, libraryUi.screen)}
        onSignOut={() => void appShell.authSignOut()}
      />
    );
  }

  if (libraryUi.screen === 'recipe-select') {
    return (
      <GlobalRecipesCategoryScreen
        currentUserEmail={appShell.currentUserEmail}
        category={libraryUi.selectedCategoryMeta ?? { id: 'all' as const, name: 'Todas', icon: '📚', description: 'Todas las recetas públicas disponibles en la fuente actual.' }}
        items={libraryUi.globalCategoryItems}
        favoriteRecipeIds={libraryUi.favoriteRecipeIds}
        onBack={() => libraryUi.goBackScreen('global-recipes')}
        onOpenRecipe={libraryUi.handleRecipeOpen}
        onPlanRecipe={(recipe) => libraryUi.openPlanForRecipe(recipe, libraryUi.screen)}
        onToggleFavorite={(recipeId) => void libraryUi.toggleFavorite(recipeId)}
        onSignOut={() => void appShell.authSignOut()}
      />
    );
  }

  const demoRecipes = dedupeRecipesById([
    ...libraryUi.availableRecipes.filter((recipe: Recipe) => recipe.experience === 'compound'),
    ...COMPOUND_DEMO_FALLBACKS,
  ]).filter((recipe) => COMPOUND_DEMO_IDS.has(recipe.id));

  return (
    <Suspense fallback={<ScreenFallback />}>
      <CompoundLabScreen
        currentUserEmail={appShell.currentUserEmail}
        recipes={demoRecipes}
        onOpenRecipe={libraryUi.handleRecipeOpen}
        onQuickCook={libraryUi.quickCookCompoundRecipe}
        onSignOut={() => void appShell.authSignOut()}
      />
    </Suspense>
  );
}
