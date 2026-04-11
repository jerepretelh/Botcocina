# Step Grouping Extension

Incremental extension for `Step` that adds grouped preparation blocks without changing `phases` or `ingredients`.

## Updated Step Shape

### TypeScript

```ts
type BaseStep = {
  id: string;
};

type ActionStep = BaseStep & {
  kind: 'action';
  text: string;
  container?: string;
  ingredients?: StepIngredientRef[];
};

type TimerStep = BaseStep & {
  kind: 'timer';
  text: string;
  timerSec: number;
  container?: string;
  ingredients?: StepIngredientRef[];
};

type ResultStep = BaseStep & {
  kind: 'result';
  text: string;
  result: string;
  container?: string;
  ingredients?: StepIngredientRef[];
};

type GroupStep = BaseStep & {
  kind: 'group';
  title: string;
  substeps: Step[];
};

type Step = ActionStep | TimerStep | ResultStep | GroupStep;
```

### JSON Schema Summary

`step` now becomes a discriminated union:

- `stepLeaf`: existing `action | timer | result`
- `stepGroup`: new `group`

Both schemas were updated here:

- [fixed-recipe.schema.json](/Users/trabajo/bot/AsistenteCocina/api/ai/schemas/fixed-recipe.schema.json)
- [fixed-recipe.v2.schema.json](/Users/trabajo/bot/AsistenteCocina/api/ai/schemas/fixed-recipe.v2.schema.json)

## Before vs After

### Before

```json
{
  "kind": "action",
  "text": "Cortar las vainitas en diagonal"
}
```

### After

```json
{
  "kind": "group",
  "title": "Preparar las vainitas (corte para salteado)",
  "substeps": [
    { "kind": "action", "text": "Corta las puntas" },
    { "kind": "action", "text": "Retira hebras si es necesario" },
    { "kind": "action", "text": "Corta en diagonal" }
  ]
}
```

## Validation Rules

### Existing step kinds keep working

- `action`, `timer`, `result` remain valid without changes.
- Existing recipes with flat steps remain valid.

### Group step rules

- `kind` must be `"group"`.
- `title` is required and must be a non-empty string.
- `substeps` is required and must contain at least one `Step`.
- `group` must not use `text`.
- `group` must not use `timerSec`, `result`, `ingredients`, or `container`.

### Action step rules

- `kind` must be `"action"`.
- `text` is required.
- `substeps` is not allowed.

### Timer step rules

- `kind` must be `"timer"`.
- `text` is required.
- `timerSec` is required and must be `>= 1`.
- `substeps` is not allowed.

### Result step rules

- `kind` must be `"result"`.
- `text` is required.
- `result` is required.
- `substeps` is not allowed.

## UI Rendering Suggestions

### Normal steps

- Render as today: indexed list item with text and optional metadata.
- Keep timer/result visual treatment unchanged.

### Group steps

- Render `title` as a parent row with stronger typography.
- Render `substeps` as an indented ordered or unordered list.
- Recommended mobile behavior:
  - expanded by default for short groups (2-4 substeps)
  - collapsible for long groups
- Recommended desktop behavior:
  - indent with lighter divider or spacing, not a heavy card

### Safe renderer fallback

- If `step.kind !== 'group'`, render exactly as current renderer does.
- If `step.kind === 'group'`, render `title` plus recursive `substeps`.
- If renderer has not yet been upgraded, ignore `substeps` only when `kind !== 'group'`.

## Compatibility Notes

- No change to `phases`.
- No change to `ingredients`.
- No change required for existing flat recipes.
- This is an additive evolution of `Step`, not a full model redesign.
