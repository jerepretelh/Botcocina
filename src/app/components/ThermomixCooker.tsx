import { Suspense, lazy, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { Screen } from '../../types';
import { useAuthSession } from '../hooks/useAuthSession';
import { formatVersionLabel } from '../lib/appMetadata';
import { useThermomixComposition } from './thermomix/hooks/useThermomixComposition';
import { ThermomixCookerScreenHost } from './thermomix/presentation/ThermomixCookerScreenHost';
import { ThermomixOverlayHost } from './thermomix/presentation/ThermomixOverlayHost';

const RecipeJourneyHost = lazy(() => import('../features/recipe-journey/presentation/RecipeJourneyHost').then((module) => ({ default: module.RecipeJourneyHost })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="rounded-[1.5rem] border border-primary/10 bg-card/80 px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:text-slate-400">
        Cargando pantalla...
      </div>
    </div>
  );
}

interface ThermomixCookerProps {
  auth: ReturnType<typeof useAuthSession>;
}

export function ThermomixCooker({ auth }: ThermomixCookerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSyncRef = useRef(false);
  const lastProcessedRoutePathRef = useRef<string | null>(null);
  const currentScreenRef = useRef<Screen>('category-select');
  const currentRecipeOverlayHostScreenRef = useRef<Screen | null>(null);
  const [recipeSeedSearchTerm, setRecipeSeedSearchTerm] = useState('');

  const composition = useThermomixComposition({
    auth,
    pathname: location.pathname,
    navigate,
    appVersion: formatVersionLabel(),
    recipeSeedSearchTerm,
    setRecipeSeedSearchTerm,
    routeSyncRef,
    lastProcessedRoutePathRef,
    currentScreenRef,
    currentRecipeOverlayHostScreenRef,
  });

  if (composition.shouldRenderUnifiedJourneyPage) {
    return (
      <>
        <Suspense fallback={<ScreenFallback />}>
          <RecipeJourneyHost
            {...composition.unifiedJourneyShellAdapter}
            viewModel={composition.unifiedJourneyViewModel}
          />
        </Suspense>
        <ThermomixOverlayHost overlayModel={composition.overlayModel} />
      </>
    );
  }

  return (
    <ThermomixCookerScreenHost
      screen={composition.screen}
      appShell={composition.screenModels.appShell}
      libraryUi={composition.screenModels.libraryUi}
      planningUi={composition.screenModels.planningUi}
      cookingUi={composition.screenModels.cookingUi}
      overlayUi={composition.screenModels.overlayUi}
    />
  );
}
