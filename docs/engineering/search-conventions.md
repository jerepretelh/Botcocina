# Convencion de busqueda operativa

Usa `rg` con las exclusiones por defecto del repositorio. `.rgignore` ya descarta:

- `e2e/.artifacts/`
- `dist/`
- `output/playwright/`
- `playwright-report/`

Practicas recomendadas:

- No abras reportes HTML, traces o capturas pesadas salvo que el bug sea estrictamente e2e.
- Para exploracion general, prefiere `rg --files src/app` o `rg -n "patron" src/app`.
- Si necesitas revisar e2e, entra al directorio relevante de forma explicita en vez de buscar en todo el repo.
- Para documentacion o revisiones, evita incluir artefactos generados en el contexto de trabajo.

