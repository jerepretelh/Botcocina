# Product Smoke Regression Playbook

## Objetivo

Usar el smoke autenticado sobre el deploy real como filtro final de estabilidad y convertir cualquier hallazgo relevante en una regresión trazable dentro del repo.

## Comando oficial

```bash
PLAYWRIGHT_BASE_URL=https://tu-deploy-real \
PLAYWRIGHT_STORAGE_STATE=playwright/.auth/user.json \
npm run test:e2e:prod:smoke
```

Si la sesión expiró:

```bash
PLAYWRIGHT_BASE_URL=https://tu-deploy-real npm run test:e2e:auth:generate
```

## Recorrido oficial

El smoke productivo debe cubrir, como mínimo:

1. Biblioteca `Todas` y apertura de una receta `standard` V2.
2. `setup -> cook -> reopen setup -> close` con retorno correcto al host.
3. Receta `compound` desde lab con `setup -> cook -> returnTo/close`.
4. Planning/shopping con una receta V2 planificable.

## Registro de hallazgos

Cada hallazgo debe registrarse con estos campos mínimos:

- `symptom`: qué falló exactamente.
- `route`: ruta visible donde apareció.
- `environment`: producción, preview o local.
- `auth_state`: si hubo sesión válida, expirada o bootstrap defectuoso.
- `artifact`: trace, screenshot o video asociado.
- `classification`: `product`, `data`, `env` o `test`.
- `next_regression`: tipo de prueba que debe cubrirlo (`unit`, `integration`, `e2e`, `smoke-only`).

## Regla de conversión a regresión

- Routing, overlays, `close`, `back`, `reload`: preferir `e2e` o integration del contrato de navegación.
- Snapshots, persistencia y shopping: preferir node tests o integration de repositorio/aggregación.
- Auth, bootstrap o diferencias de deploy: dejar smoke productivo y fortalecer helpers del harness.

Ningún fix de producción debería cerrarse sin una prueba asociada, salvo incidentes exclusivos de datos o despliegue.

## Criterio de cierre

Un hallazgo puede considerarse cerrado cuando:

1. hay causa entendida o clasificación explícita,
2. existe prueba nueva o reforzada cuando aplica,
3. el smoke productivo vuelve a pasar,
4. el backlog QA queda actualizado con la nota correspondiente.

