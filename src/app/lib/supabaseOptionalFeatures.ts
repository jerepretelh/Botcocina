function isEnabled(value: string | undefined): boolean {
  return (value ?? 'false').trim().toLowerCase() === 'true';
}

const envRecipeSeedsEnabled = isEnabled(import.meta.env.VITE_SUPABASE_RECIPE_SEEDS_ENABLED);
const envUserRecipeConfigsEnabled = isEnabled(import.meta.env.VITE_SUPABASE_USER_RECIPE_CONFIGS_ENABLED);

let recipeSeedsRuntimeEnabled = envRecipeSeedsEnabled;
let userRecipeConfigsRuntimeEnabled = envUserRecipeConfigsEnabled;

export function canUseRecipeSeeds(): boolean {
  return recipeSeedsRuntimeEnabled;
}

export function canUseUserRecipeConfigs(): boolean {
  return userRecipeConfigsRuntimeEnabled;
}

export function disableRecipeSeedsForSession(): void {
  recipeSeedsRuntimeEnabled = false;
}

export function disableUserRecipeConfigsForSession(): void {
  userRecipeConfigsRuntimeEnabled = false;
}
