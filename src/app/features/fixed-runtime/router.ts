export interface ParsedFixedRuntimeRoute {
  isFixedRuntimeRoute: boolean;
  mode: 'library' | 'create' | 'runtime' | null;
  recipeId: string | null;
}

export function parseFixedRuntimeRoute(pathname: string): ParsedFixedRuntimeRoute {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/runtime-fijo') {
    return { isFixedRuntimeRoute: true, mode: 'library', recipeId: null };
  }

  if (normalized === '/runtime-fijo/nueva-receta') {
    return { isFixedRuntimeRoute: true, mode: 'create', recipeId: null };
  }

  const match = normalized.match(/^\/runtime-fijo\/([^/]+)$/);
  if (!match) {
    return { isFixedRuntimeRoute: false, mode: null, recipeId: null };
  }

  return {
    isFixedRuntimeRoute: true,
    mode: 'runtime',
    recipeId: decodeURIComponent(match[1] ?? ''),
  };
}
