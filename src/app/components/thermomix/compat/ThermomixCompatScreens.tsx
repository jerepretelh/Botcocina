import { Suspense, lazy } from 'react';
import type { ComponentProps } from 'react';
import { RecipeSetupScreen } from '../../screens/RecipeSetupScreen';
import { IngredientsScreen } from '../../screens/IngredientsScreen';
import { CookingScreen } from '../../screens/CookingScreen';

const LazyCookingScreen = lazy(() => import('../../screens/CookingScreen').then((module) => ({ default: module.CookingScreen })));
const LazyRecipeSetupScreen = lazy(() => import('../../screens/RecipeSetupScreen').then((module) => ({ default: module.RecipeSetupScreen })));
const LazyIngredientsScreen = lazy(() => import('../../screens/IngredientsScreen').then((module) => ({ default: module.IngredientsScreen })));

export function ThermomixCompatSetupScreen(props: ComponentProps<typeof RecipeSetupScreen>) {
  return (
    <Suspense fallback={null}>
      <LazyRecipeSetupScreen {...props} />
    </Suspense>
  );
}

export function ThermomixCompatIngredientsScreen(props: ComponentProps<typeof IngredientsScreen>) {
  return (
    <Suspense fallback={null}>
      <LazyIngredientsScreen {...props} />
    </Suspense>
  );
}

export function ThermomixCompatCookingScreen(props: ComponentProps<typeof CookingScreen>) {
  return (
    <Suspense fallback={null}>
      <LazyCookingScreen {...props} />
    </Suspense>
  );
}
