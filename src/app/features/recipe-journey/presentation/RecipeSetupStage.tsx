import type { Recipe } from '../../../../types';
import type { RecipeV2, ScaledRecipeV2 } from '../../../types/recipe-v2';
import { getSetupQuestion } from '../../../lib/recipe-v2/setupUxContract';
import { RecipeSetupContentV2, RecipeSetupScreenV2 } from '../../../components/screens/RecipeSetupScreenV2';
import { JourneyPageShell } from '../../../components/ui/journey-page-shell';
import type {
  RecipePresentationMode,
  UnifiedCookingContext,
  UnifiedRecipeDefinition,
  UnifiedRecipeYield,
} from '../types';
import { requiresExplicitContainerCapacity } from '../../../lib/recipe-v2/measurements';

interface RecipeSetupStageProps {
  definition: UnifiedRecipeDefinition;
  selectedRecipe: Recipe | null;
  recipeV2: RecipeV2 | null;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  scaledRecipe: ScaledRecipeV2 | null;
  onDecrement: () => void;
  onIncrement: () => void;
  onSelectedYieldChange: (nextYield: UnifiedRecipeYield) => void;
  onSelectedCookingContextChange: (nextContext: UnifiedCookingContext | null) => void;
  presentationMode: RecipePresentationMode;
  onContinue: () => void;
  onClose: () => void;
}

export function RecipeSetupStage({
  definition,
  selectedRecipe,
  recipeV2,
  selectedYield,
  selectedCookingContext,
  scaledRecipe,
  onDecrement,
  onIncrement,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  presentationMode,
  onContinue,
  onClose,
}: RecipeSetupStageProps) {
  const recipeSource = recipeV2 ?? definition.sourceRecipeV2 ?? null;

  if (presentationMode === 'page') {
    return (
      <JourneyPageShell
        eyebrow="Configura tu receta"
        title={selectedRecipe?.name ?? recipeSource?.name ?? 'Configurar receta'}
        description={getSetupQuestion(recipeSource, selectedYield?.type)}
        onBack={onClose}
        onClose={onClose}
        footer={(
          <button
            type="button"
            onClick={onContinue}
            disabled={requiresExplicitContainerCapacity(selectedYield)}
            className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            Ver ingredientes
          </button>
        )}
      >
        <RecipeSetupContentV2
          selectedRecipe={selectedRecipe}
          recipe={recipeSource}
          selectedYield={selectedYield}
          selectedCookingContext={selectedCookingContext}
          warnings={scaledRecipe?.warnings ?? []}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
          onSelectedYieldChange={onSelectedYieldChange}
          onSelectedCookingContextChange={onSelectedCookingContextChange}
        />
      </JourneyPageShell>
    );
  }

  return (
    <RecipeSetupScreenV2
      selectedRecipe={selectedRecipe}
      recipe={recipeSource}
      selectedYield={selectedYield}
      selectedCookingContext={selectedCookingContext}
      warnings={scaledRecipe?.warnings ?? []}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
      onSelectedYieldChange={onSelectedYieldChange}
      onSelectedCookingContextChange={onSelectedCookingContextChange}
      presentationMode={presentationMode}
      onBack={onClose}
      onClose={onClose}
      onContinue={onContinue}
    />
  );
}
