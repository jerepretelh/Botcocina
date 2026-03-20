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

## Estructura

- `e2e/helpers/app.ts`: navegación base y espera de hidratación
- `e2e/helpers/routes.ts`: helpers hash-aware
- `e2e/helpers/selectors.ts`: selectores reutilizables
- `e2e/helpers/auth.ts`: utilidades opcionales para `storageState`
- `e2e/specs/`: carpeta reservada para futuras specs

## Notas

- La app usa `HashRouter`, por eso los helpers navegan con `#/ruta`.
- El `webServer` levanta Vite localmente en `http://127.0.0.1:4173`.
- Los artefactos y auth state deben quedar fuera de git.
