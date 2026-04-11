import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173').trim().replace(/\/+$/, '');
const storageCandidates = ['playwright/.auth/user-4174.json', 'playwright/.auth/user.json'];
const storageStatePath = storageCandidates.find((candidate) => fs.existsSync(candidate));

if (!storageStatePath) {
  throw new Error('No se encontró storage state de Playwright en playwright/.auth.');
}

async function run(): Promise<void> {
  const recipeId = `qa-runtime-${Date.now()}`;
  const recipeTitle = `Receta QA Runtime ${new Date().toISOString().slice(11, 19)}`;
  const payload = JSON.stringify(
    [
      {
        id: recipeId,
        title: recipeTitle,
        servings: 2,
        ingredients: [{ title: 'Base', items: ['1 unidad tomate', '2 huevos'] }],
        phases: [
          {
            id: 'fase-1',
            number: 'FASE 1',
            title: 'Preparación',
            steps: [
              { id: 's1', text: 'Picar tomate' },
              { id: 's2', text: 'Agregar tomate' },
              { id: 's3', text: 'Servir caliente', type: 'result' as const },
            ],
          },
        ],
      },
    ],
    null,
    2,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/#/runtime-fijo`, { waitUntil: 'domcontentloaded' });
    if ((await page.url()).includes('/auth')) {
      throw new Error('La sesión actual redirige a /auth.');
    }

    await expect(page.getByRole('heading', { name: 'Organiza tu semana' })).toBeVisible({ timeout: 20_000 });

    const textarea = page.locator('textarea[placeholder*="id"]');
    await textarea.fill(payload);
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText('Preview válido')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Agregar al catálogo' }).click();

    const card = page.locator('article').filter({ hasText: recipeTitle }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: 'Planificar', exact: true }).click();
    await expect(page.getByText('Planificar receta')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Martes', exact: true }).click();
    await page.getByRole('button', { name: 'Cena', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar al plan', exact: true }).click();

    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.getByText(recipeTitle)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Generar compras', exact: true }).click();
    await page.locator('nav button').nth(2).click();
    await expect(page.getByText('Hecha para usar dentro del súper')).toBeVisible({ timeout: 10_000 });
    await page.locator('button').filter({ hasText: '✓' }).first().click();
    const enabledInput = page.locator('input[type="number"]:enabled').first();
    await expect(enabledInput).toBeVisible({ timeout: 10_000 });
    await enabledInput.fill('5.50');
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await expect(page.getByText('Compra finalizada')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Seguir explorando', exact: true }).click();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Organiza tu semana' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Plan', exact: true }).click();
    await expect(page.getByText(recipeTitle)).toBeVisible({ timeout: 10_000 });

    console.log(`QA_RUNTIME_FIJO_OK recipeId=${recipeId}`);
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

void run();
