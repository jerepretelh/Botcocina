# Playwright Browser Workflow Automation

This folder contains a CLI-first Playwright automation for the Thermomix app flow:

1. Open app landing screen
2. Fill `Crear nueva receta con IA` prompt
3. Click `Agregar receta con IA`
4. Wait for one of these outcomes:
   - Clarification screen (`Personalizando tu idea`)
   - Recipe flow screen (`Configuración` or `Ingredientes necesarios`)
   - Explicit error message (for example missing API key)

## Script

- `scripts/playwright/automate_ai_recipe_flow.sh`

## Prerequisites

```bash
command -v npx >/dev/null 2>&1
```

## Run steps

1. Start the app:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

2. In a second terminal, run automation:

```bash
./scripts/playwright/automate_ai_recipe_flow.sh
```

3. Optional flags:

```bash
./scripts/playwright/automate_ai_recipe_flow.sh \
  --url http://127.0.0.1:4173/ \
  --prompt "Ceviche clásico para 4 personas" \
  --session asistente-cocina-flow \
  --timeout 120 \
  --poll 2 \
  --artifacts-dir output/playwright/ai-recipe-workflow \
  --headed
```

## Artifacts

Outputs are written to:

- `output/playwright/ai-recipe-workflow/`

Includes open/fill/click logs, polling snapshots, final snapshot, and screenshot log.
