export type ThermomixOverlayVariant = 'journey' | 'v2' | 'compat' | null;

export function resolveOverlayVariants(args: {
  shouldRenderUnifiedJourneyOverlay: boolean;
  shouldRenderSetupV2: boolean;
  shouldRenderSetupCompat: boolean;
  shouldRenderIngredientsV2: boolean;
  shouldRenderIngredientsCompat: boolean;
}) {
  return {
    setupVariant: args.shouldRenderUnifiedJourneyOverlay
      ? 'journey'
      : args.shouldRenderSetupV2
        ? 'v2'
        : args.shouldRenderSetupCompat
          ? 'compat'
          : null,
    ingredientsVariant: args.shouldRenderUnifiedJourneyOverlay
      ? 'journey'
      : args.shouldRenderIngredientsV2
        ? 'v2'
        : args.shouldRenderIngredientsCompat
          ? 'compat'
          : null,
  } as const;
}

export function resolvePlanSnapshotScaleFactor(args: {
  screen: string;
  cookingScaleFactor: number;
  setupScaleFactor: number;
}) {
  return args.screen === 'cooking' ? args.cookingScaleFactor : args.setupScaleFactor;
}

export function isOverlayBackgroundMuted(args: {
  isRecipeSetupSheetOpen: boolean;
  isIngredientsSheetOpen: boolean;
  isPlanSheetOpen: boolean;
}) {
  return Boolean(args.isRecipeSetupSheetOpen || args.isIngredientsSheetOpen || args.isPlanSheetOpen);
}
