import type { MixedRecipeSearchResult } from '../../../../types';
import type { AIRecipeGenerationController } from '../lib/controllerTypes';
import type { RecipeOpenHandler } from '../lib/controllerTypes';

type UseThermomixSearchAndFavoritesArgs = {
  aiRecipeGen: AIRecipeGenerationController;
  handleRecipeOpen: RecipeOpenHandler;
};

export function useThermomixSearchAndFavorites(args: UseThermomixSearchAndFavoritesArgs) {
  const handleSearchResultSelect = (result: MixedRecipeSearchResult) => {
    if (result.kind === 'recipe' && result.recipe) {
      args.handleRecipeOpen(result.recipe);
      return;
    }

    if (result.kind === 'seed' && result.seed) {
      args.aiRecipeGen.startWizardFromSeed(result.seed);
    }
  };

  return {
    handleSearchResultSelect,
  };
}
