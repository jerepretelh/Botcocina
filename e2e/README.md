# E2E Harness

Harness base E2E del repo con `@playwright/test`.

## Objetivo

Dejar una base reproducible para futuras regresiones de navegación, overlays y biblioteca sin depender de scripts shell ad hoc.

Este bloque no incluye specs E2E reales todavía.

## Instalación

```bash
npm install
npm run test:e2e:install
```

## Uso local

Ejecutar el harness base:

```bash
npm run test:e2e
```

Abrir en modo headed:

```bash
npm run test:e2e:headed
```

Abrir la UI de Playwright:

```bash
npm run test:e2e:ui
```

Smoke oficial productivo autenticado:

```bash
PLAYWRIGHT_BASE_URL=https://tu-deploy-real \
PLAYWRIGHT_STORAGE_STATE=playwright/.auth/user.json \
npm run test:e2e:prod:smoke
```

Smoke ampliado por capacidades:

```bash
PLAYWRIGHT_STORAGE_STATE=playwright/.auth/user.json \
npm run test:e2e:capabilities
```

## Auth opcional por storageState

Si quieres reutilizar una sesión autenticada ya guardada, pasa la ruta del archivo por variable de entorno:

```bash
PLAYWRIGHT_STORAGE_STATE=/ruta/absoluta/al/state.json npm run test:e2e
```

Si la variable no existe o el archivo no está presente, el harness no falla por eso y corre sin `storageState`.

## Generar storageState local desde Keychain

Este repo incluye un flujo local para generar `playwright/.auth/user.json` sin guardar secretos en git ni escribir credenciales en texto plano dentro del repo.

Generar o regenerar el archivo:

```bash
npm run test:e2e:auth:generate
```

Por defecto, el script:

- lee usuario y contraseña desde el Keychain de macOS usando el servicio `AsistenteCocina Playwright Auth`
- inicia sesión contra `http://127.0.0.1:4173/#/auth`
- guarda el estado en `playwright/.auth/user.json`

Si la sesión expira, vuelve a ejecutar el mismo comando para regenerarla.

Para usar ese estado local al correr los smoke tests:

```bash
PLAYWRIGHT_STORAGE_STATE=playwright/.auth/user.json npx playwright test e2e/specs/global-library-smoke.spec.ts
```

Para regenerar auth directamente contra el deploy productivo:

```bash
PLAYWRIGHT_BASE_URL=https://tu-deploy-real npm run test:e2e:auth:generate
```

## Estructura

- `e2e/helpers/app.ts`: navegación base y espera de hidratación
- `e2e/helpers/routes.ts`: helpers hash-aware
- `e2e/helpers/environment.ts`: resolución del target local vs productivo
- `e2e/helpers/selectors.ts`: selectores reutilizables
- `e2e/helpers/auth.ts`: utilidades opcionales para `storageState`
- `e2e/helpers/recipeSmoke.ts`: matriz canónica de recetas y flujos comunes del smoke
- `e2e/specs/`: carpeta reservada para futuras specs

## Niveles de smoke

- `e2e/specs/product-production-smoke.spec.ts`: smoke corto de release para deploy autenticado
- `e2e/specs/recipe-capability-smoke.spec.ts`: cobertura ampliada por capacidad de receta
- `global-library-smoke.spec.ts` y `recipe-journey-resilience.spec.ts`: regresiones finas y resiliencia, fuera del smoke corto

## Notas

- La app usa `HashRouter`, por eso los helpers navegan con `#/ruta`.
- El `webServer` levanta Vite localmente solo cuando `PLAYWRIGHT_BASE_URL` apunta a `localhost` o `127.0.0.1`.
- Los artefactos y auth state deben quedar fuera de git.
- Para el flujo operativo de hallazgos y conversión a regresiones, ver [docs/ops/product-smoke-regression-playbook.md](/Users/trabajo/bot/AsistenteCocina/docs/ops/product-smoke-regression-playbook.md).
