import { ArrowLeft, Lock } from 'lucide-react';
import type { Recipe } from '../../../types';
import type { RecipeYieldV2, ScaledRecipeIngredientV2, ScaledRecipeV2 } from '../../types/recipe-v2';
import { describeRecipeYield } from '../../lib/recipeV2';
import { ProductSurface } from '../ui/product-system';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';

interface IngredientsScreenV2Props {
  selectedRecipe: Recipe | null;
  scaledRecipe: ScaledRecipeV2 | null;
  selectedYield: RecipeYieldV2 | null;
  activeIngredientSelection: Record<string, boolean>;
  onIngredientToggle: (ingredientId: string) => void;
  onBack: () => void;
  onStartCooking: () => void;
}

function isSelected(ingredient: ScaledRecipeIngredientV2, selection: Record<string, boolean>) {
  return selection[ingredient.id] ?? true;
}

export function IngredientsScreenV2({
  selectedRecipe,
  scaledRecipe,
  selectedYield,
  activeIngredientSelection,
  onIngredientToggle,
  onBack,
  onStartCooking,
}: IngredientsScreenV2Props) {
  const ingredients = scaledRecipe?.ingredients ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && onBack()}>
      <SheetContent side="right" className="w-full max-w-xl overflow-hidden border-primary/10 bg-[#ede4dc] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{selectedRecipe?.name ?? 'Ingredientes'}</SheetTitle>
          <SheetDescription>Checklist de ingredientes resuelto por RecipeV2.</SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-20 border-b border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-4 pt-6 backdrop-blur">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onBack}
                className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-[#f7efe9] text-foreground transition-colors active:scale-[0.98]"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Ingredientes V2</p>
                <h1 className="mt-2 text-[1.45rem] font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-[1.75rem]">
                  {selectedRecipe?.name ?? scaledRecipe?.name ?? 'Checklist'}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  {describeRecipeYield(selectedYield)} · {scaledRecipe?.timeSummary.totalMinutes ?? '-'} min estimados
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
            <ProductSurface className="border-[#dfd5cd] bg-[#f7f5f2] p-4 sm:p-5">
              <div className="space-y-2">
                {ingredients.map((ingredient) => (
                  <button
                    key={ingredient.id}
                    type="button"
                    onClick={() => onIngredientToggle(ingredient.id)}
                    disabled={ingredient.indispensable}
                    className="flex w-full items-center gap-3 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] px-3 py-3.5 text-left transition-colors hover:border-primary/25 disabled:cursor-not-allowed"
                  >
                    <div className="w-4 shrink-0">
                      {ingredient.indispensable ? (
                        <div className="flex size-6 items-center justify-center rounded-full border border-[#edd9cc] bg-[#fbf6f2]">
                          <Lock className="size-3 text-slate-500" />
                        </div>
                      ) : (
                        <div className={`flex size-6 items-center justify-center rounded-full border ${isSelected(ingredient, activeIngredientSelection) ? 'border-primary bg-primary text-white' : 'border-[#edd9cc] bg-[#fbf6f2] text-transparent'}`}>
                          ✓
                        </div>
                      )}
                    </div>

                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f4ddd1] text-lg sm:size-12 sm:text-xl">
                      {ingredient.emoji}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[0.95rem] font-black text-[#131d36] sm:text-base">{ingredient.name}</p>
                        {ingredient.indispensable ? (
                          <span className="rounded-full bg-[#f4ddd1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                            indispensable
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-primary sm:text-[15px]">{ingredient.scaledAmount.displayText}</p>
                    </div>
                  </button>
                ))}
              </div>

              {scaledRecipe?.warnings.length ? (
                <div className="mt-4 rounded-[1.15rem] border border-[#edd9cc] bg-[#f3ece4] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Avisos</p>
                  <div className="mt-3 space-y-2">
                    {scaledRecipe.warnings.map((warning) => (
                      <p key={warning} className="text-sm leading-6 text-slate-600">
                        • {warning}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </ProductSurface>
          </div>

          <div className="sticky bottom-0 z-20 border-t border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-5 pt-4 backdrop-blur">
            <button
              type="button"
              onClick={onStartCooking}
              className="mx-auto block w-full rounded-[1.15rem] bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            >
              Empezar a cocinar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
