import type { Recipe } from '../../../../types';
import type { ScaledRecipeV2 } from '../../../types/recipe-v2';
import { describeRecipeYield } from '../../../lib/recipeV2';
import { RecipeIngredientsContentV2, IngredientsScreenV2 } from '../../../components/screens/IngredientsScreenV2';
import { JourneyPageShell } from '../../../components/ui/journey-page-shell';
import type { RecipePresentationMode, UnifiedRecipeYield } from '../types';

interface RecipeIngredientsStageProps {
  selectedRecipe: Recipe | null;
  scaledRecipe: ScaledRecipeV2 | null;
  selectedYield: UnifiedRecipeYield | null;
  activeIngredientSelection: Record<string, boolean>;
  presentationMode: RecipePresentationMode;
  onIngredientToggle: (ingredientId: string) => void;
  onBack: () => void;
  onClose: () => void;
  onStartCooking: () => void;
}

export function RecipeIngredientsStage({
  selectedRecipe,
  scaledRecipe,
  selectedYield,
  activeIngredientSelection,
  presentationMode,
  onIngredientToggle,
  onBack,
  onClose,
  onStartCooking,
}: RecipeIngredientsStageProps) {
  if (presentationMode === 'page') {
    return (
      <JourneyPageShell
        eyebrow="Ingredientes"
        title={selectedRecipe?.name ?? scaledRecipe?.name ?? 'Checklist'}
        description={`${describeRecipeYield(selectedYield)} · ${scaledRecipe?.timeSummary.totalMinutes ?? '-'} min estimados`}
        onBack={onBack}
        onClose={onClose}
        footer={(
          <button
            type="button"
            onClick={onStartCooking}
            className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          >
            Empezar a cocinar
          </button>
        )}
      >
        <RecipeIngredientsContentV2
          scaledRecipe={scaledRecipe}
          activeIngredientSelection={activeIngredientSelection}
          onIngredientToggle={onIngredientToggle}
        />
      </JourneyPageShell>
    );
  }

  return (
    <IngredientsScreenV2
      selectedRecipe={selectedRecipe}
      scaledRecipe={scaledRecipe}
      selectedYield={selectedYield}
      activeIngredientSelection={activeIngredientSelection}
      presentationMode={presentationMode}
      onIngredientToggle={onIngredientToggle}
      onBack={onBack}
      onClose={onClose}
      onStartCooking={onStartCooking}
    />
  );
}
