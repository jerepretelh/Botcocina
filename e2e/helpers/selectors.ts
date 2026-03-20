import type { Locator, Page } from '@playwright/test';

export const appText = {
  authLoading: 'Validando sesión...',
  authTitle: 'Inicia sesión',
  setupHeading: 'Configuración',
  ingredientsHeading: 'Ingredientes necesarios',
  aiClarifyHeading: 'Personalizando tu idea',
} as const;

export function authLoadingLocator(page: Page): Locator {
  return page.getByText(appText.authLoading, { exact: true });
}

export function authScreenLocator(page: Page): Locator {
  return page.getByText(appText.authTitle, { exact: true });
}

export function recipeSetupHeadingLocator(page: Page): Locator {
  return page.getByRole('heading', { name: appText.setupHeading, exact: true });
}

export function ingredientsHeadingLocator(page: Page): Locator {
  return page.getByText(appText.ingredientsHeading, { exact: true });
}

export function aiClarifyHeadingLocator(page: Page): Locator {
  return page.getByRole('heading', { name: appText.aiClarifyHeading, exact: true });
}
