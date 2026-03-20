import type { Recipe } from '../../../../types';
import type { RecipeV2, ScaledRecipeV2 } from '../../../types/recipe-v2';
import { describeRecipeYield } from '../../../lib/recipeV2';
import { getSetupQuestion } from '../../../lib/recipe-v2/setupUxContract';
import { RecipeSetupContentV2 } from '../../../components/screens/RecipeSetupScreenV2';
import { RecipeIngredientsContentV2 } from '../../../components/screens/IngredientsScreenV2';
import { JourneyPageShell } from '../../../components/ui/journey-page-shell';
import type { UnifiedCookingContext, UnifiedRecipeYield } from '../types';

interface RecipeUnifiedPageStageProps {
  recipe: Recipe | null;
  recipeV2: RecipeV2 | null;
  scaledRecipe: ScaledRecipeV2 | null;
  selectedYield: UnifiedRecipeYield | null;
  selectedCookingContext: UnifiedCookingContext | null;
  activeIngredientSelection: Record<string, boolean>;
  canStartRecipe: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  onSelectedYieldChange: (nextYield: UnifiedRecipeYield) => void;
  onSelectedCookingContextChange: (nextContext: UnifiedCookingContext | null) => void;
  onIngredientToggle: (ingredientId: string) => void;
  onBack: () => void;
  onClose: () => void;
  onStartRecipe: () => void;
}

export function RecipeUnifiedPageStage({
  recipe,
  recipeV2,
  scaledRecipe,
  selectedYield,
  selectedCookingContext,
  activeIngredientSelection,
  canStartRecipe,
  onDecrement,
  onIncrement,
  onSelectedYieldChange,
  onSelectedCookingContextChange,
  onIngredientToggle,
  onBack,
  onClose,
  onStartRecipe,
}: RecipeUnifiedPageStageProps) {
  const timingSummary = scaledRecipe?.timeSummary?.totalMinutes
    ? `${scaledRecipe.timeSummary.totalMinutes} min estimados`
    : null;
  const yieldSummary = selectedYield ? describeRecipeYield(selectedYield) : null;
  const description = [yieldSummary, timingSummary].filter(Boolean).join(' · ') || getSetupQuestion(recipeV2, selectedYield?.type);
  return (
    <JourneyPageShell
      eyebrow="Configura tu receta"
      title={recipe?.name ?? recipeV2?.name ?? 'Preparar receta'}
      description={description}
      onBack={onBack}
      onClose={onClose}
      contentMaxWidthClass="max-w-6xl"
      footerMaxWidthClass="max-w-2xl"
      footer={(
        <button
          type="button"
          onClick={onStartRecipe}
          disabled={!canStartRecipe}
          className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          Empezar receta
        </button>
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <RecipeSetupContentV2
          selectedRecipe={recipe}
          recipe={recipeV2}
          selectedYield={selectedYield}
          selectedCookingContext={selectedCookingContext}
          warnings={[]}
          onDecrement={onDecrement}
          onIncrement={onIncrement}
          onSelectedYieldChange={onSelectedYieldChange}
          onSelectedCookingContextChange={onSelectedCookingContextChange}
          layout="panel"
        />

        <RecipeIngredientsContentV2
          scaledRecipe={scaledRecipe}
          activeIngredientSelection={activeIngredientSelection}
          onIngredientToggle={onIngredientToggle}
          layout="panel"
        />
      </div>
    </JourneyPageShell>
  );
}
