## Resumen

- [ ] Describe qué cambió en catálogo/UI/datos.

## Checklist Release Catálogo

- [ ] `npm run catalog:validate` sin errores.
- [ ] `npm run catalog:release:prepare` ejecutado.
- [ ] Seed aplicado en staging.
- [ ] QA flujo cocina en staging (Home → Setup → Cooking).
- [ ] Seed aplicado en producción.
- [ ] Registro actualizado en `docs/ops/catalog-release-log.md`.

## Riesgo y Rollback

- Riesgo principal:
- Plan de rollback:
  - [ ] Despublicar receta(s) afectada(s) (`is_published=false`), o
  - [ ] Restaurar snapshot SQL previo.

