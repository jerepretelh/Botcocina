import type { RecipeJourneyStage } from '../types';

const PATH_SEGMENT_BY_STAGE: Record<RecipeJourneyStage, string> = {
  setup: 'configurar',
  ingredients: 'ingredientes',
  cook: 'cocinar',
  done: 'completado',
};

const STAGE_BY_PATH_SEGMENT = Object.fromEntries(
  Object.entries(PATH_SEGMENT_BY_STAGE).map(([stage, segment]) => [segment, stage]),
) as Record<string, RecipeJourneyStage>;

export interface ParsedRecipeJourneyRoute {
  recipeId: string | null;
  stage: RecipeJourneyStage | null;
  pathname: string;
  isValid: boolean;
}

function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function buildRecipeJourneyPath(recipeId: string, stage: RecipeJourneyStage): string {
  return `/recetas/${encodeURIComponent(recipeId)}/${PATH_SEGMENT_BY_STAGE[stage]}`;
}

export function parseRecipeJourneyRoute(pathname: string): ParsedRecipeJourneyRoute {
  const normalizedPathname = normalizePathname(pathname);
  const match = normalizedPathname.match(/^\/recetas\/([^/]+)\/([^/]+)$/);

  if (!match) {
    return {
      recipeId: null,
      stage: null,
      pathname: normalizedPathname,
      isValid: false,
    };
  }

  const recipeId = decodeURIComponent(match[1]);
  const stage = STAGE_BY_PATH_SEGMENT[match[2]] ?? null;

  return {
    recipeId,
    stage,
    pathname: normalizedPathname,
    isValid: Boolean(recipeId && stage),
  };
}
