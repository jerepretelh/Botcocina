import { Suspense, lazy } from 'react';
import type { AppShellModel, PlanningUiModel } from '../lib/screenModels';

const WeeklyPlanScreen = lazy(() => import('../../screens/WeeklyPlanScreen').then((module) => ({ default: module.WeeklyPlanScreen })));
const ShoppingListScreen = lazy(() => import('../../screens/ShoppingListScreen').then((module) => ({ default: module.ShoppingListScreen })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="rounded-[1.5rem] border border-primary/10 bg-card/80 px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:text-slate-400">
        Cargando pantalla...
      </div>
    </div>
  );
}

export function ThermomixPlanningScreenHost({ appShell, planningUi }: { appShell: AppShellModel; planningUi: PlanningUiModel }) {
  if (planningUi.screen === 'weekly-plan') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <WeeklyPlanScreen
          currentUserEmail={appShell.currentUserEmail}
          plan={planningUi.weeklyPlan.plan}
          items={planningUi.weeklyPlan.items}
          recipesById={Object.fromEntries(planningUi.runtimeRecipesById)}
          isLoading={planningUi.weeklyPlan.isLoading}
          error={planningUi.weeklyPlan.error}
          onGoShoppingList={() => planningUi.navigate('shopping-list')}
          onSignOut={() => void appShell.authSignOut()}
          onEditPlanItem={planningUi.editPlanItem}
          onRemovePlanItem={(itemId) => void planningUi.weeklyPlan.removeItem(itemId)}
          onOpenRecipeFromPlan={(item) => planningUi.applyPlannedRecipeSnapshot(item, 'recipe-setup')}
          onCookFromPlan={(item) => planningUi.applyPlannedRecipeSnapshot(item, 'cooking')}
          onCreateNextWeek={() => void planningUi.weeklyPlan.createNextWeek()}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ScreenFallback />}>
      <ShoppingListScreen
        currentUserEmail={appShell.currentUserEmail}
        plan={planningUi.weeklyPlan.plan}
        shoppingList={planningUi.weeklyPlan.shoppingList}
        shoppingItems={planningUi.weeklyPlan.shoppingItems}
        shoppingTrip={planningUi.weeklyPlan.shoppingTrip}
        shoppingTripItems={planningUi.weeklyPlan.shoppingTripItems}
        aggregation={planningUi.weeklyPlan.aggregation}
        variance={planningUi.weeklyPlan.shoppingVariance}
        isLoading={planningUi.weeklyPlan.isLoading}
        error={planningUi.weeklyPlan.error}
        onGoShoppingList={() => planningUi.navigate('shopping-list')}
        onGoWeeklyPlan={() => planningUi.navigate('weekly-plan')}
        onSignOut={() => void appShell.authSignOut()}
        onRegenerateShopping={() => void planningUi.weeklyPlan.regenerateShopping()}
        onToggleShoppingItem={(itemId, nextChecked) => void planningUi.weeklyPlan.updateShoppingItemState(itemId, { isChecked: nextChecked })}
        onUpdateShoppingItem={(itemId, input) => void planningUi.weeklyPlan.updateShoppingItemState(itemId, input)}
        onAddManualItem={(itemName, quantityText) => void planningUi.weeklyPlan.addManualShoppingItem(itemName, quantityText)}
        onRemoveShoppingItem={(itemId) => void planningUi.weeklyPlan.removeShoppingItem(itemId)}
        onStartShoppingTrip={() => void planningUi.weeklyPlan.startShoppingTripFromList()}
        onToggleTripItemInCart={(itemId, nextChecked) => void planningUi.weeklyPlan.toggleTripItemInCart(itemId, nextChecked)}
        onMarkTripItemSkipped={(itemId) => void planningUi.weeklyPlan.markTripItemSkipped(itemId)}
        onUpdateTripItem={(itemId, input) => void planningUi.weeklyPlan.updateTripItemActuals(itemId, input)}
        onAddExtraTripItem={(itemName, quantityText, lineTotal) => void planningUi.weeklyPlan.addExtraTripItem(itemName, quantityText, lineTotal)}
        onUpdateTripMeta={(input) => void planningUi.weeklyPlan.updateShoppingTripMeta(input)}
        onCheckoutTrip={(finalTotal, storeName) => void planningUi.weeklyPlan.checkoutTrip(finalTotal, storeName)}
      />
    </Suspense>
  );
}
