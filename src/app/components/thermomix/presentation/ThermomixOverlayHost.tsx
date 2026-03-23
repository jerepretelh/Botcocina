import { Suspense, lazy } from 'react';
import { ThermomixCompatIngredientsScreen, ThermomixCompatSetupScreen } from '../compat/ThermomixCompatScreens';
import type { OverlayUiModel } from '../lib/screenModels';

const PlanRecipeSheet = lazy(() => import('../../screens/PlanRecipeSheet').then((module) => ({ default: module.PlanRecipeSheet })));
const RecipeSetupScreenV2 = lazy(() => import('../../screens/RecipeSetupScreenV2').then((module) => ({ default: module.RecipeSetupScreenV2 })));
const IngredientsScreenV2 = lazy(() => import('../../screens/IngredientsScreenV2').then((module) => ({ default: module.IngredientsScreenV2 })));
const RecipeJourneyHost = lazy(() => import('../../../features/recipe-journey/presentation/RecipeJourneyHost').then((module) => ({ default: module.RecipeJourneyHost })));

export function ThermomixOverlayHost({ overlayModel }: OverlayUiModel) {
  return (
    <>
      {overlayModel.setupOverlay ? (
        <Suspense fallback={null}>
          {overlayModel.setupOverlay.kind === 'journey' ? (
            <RecipeJourneyHost
              {...overlayModel.setupOverlay.shellAdapter}
              viewModel={overlayModel.setupOverlay.viewModel}
            />
          ) : overlayModel.setupOverlay.kind === 'setup-v2' ? (
            <RecipeSetupScreenV2 {...overlayModel.setupOverlay.props} />
          ) : (
            <ThermomixCompatSetupScreen {...overlayModel.setupOverlay.props} />
          )}
        </Suspense>
      ) : null}
      {overlayModel.ingredientsOverlay ? (
        <Suspense fallback={null}>
          {overlayModel.ingredientsOverlay.kind === 'journey' ? (
            <RecipeJourneyHost
              {...overlayModel.ingredientsOverlay.shellAdapter}
              viewModel={overlayModel.ingredientsOverlay.viewModel}
            />
          ) : overlayModel.ingredientsOverlay.kind === 'ingredients-v2' ? (
            <IngredientsScreenV2 {...overlayModel.ingredientsOverlay.props} />
          ) : (
            <ThermomixCompatIngredientsScreen {...overlayModel.ingredientsOverlay.props} />
          )}
        </Suspense>
      ) : null}
      {overlayModel.planSheet ? (
        <Suspense fallback={null}>
          <PlanRecipeSheet {...overlayModel.planSheet} />
        </Suspense>
      ) : null}
    </>
  );
}
