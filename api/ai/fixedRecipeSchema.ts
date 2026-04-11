import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

export const FIXED_RECIPE_JSON_SCHEMA_V1 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://example.com/cooking-runtime-recipe.schema.json',
  title: 'Cooking Runtime Recipe',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'servings', 'ingredients', 'phases'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    yield: {
      type: 'string',
      minLength: 1,
      description: 'Describe el rendimiento físico de la receta, como tamaño de molde o volumen final',
    },
    servings: { type: 'integer', minimum: 1 },
    ingredients: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/ingredientGroup' },
    },
    phases: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/phase' },
    },
  },
  $defs: {
    ingredientGroup: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'icon', 'items'],
      properties: {
        title: { type: 'string', minLength: 1 },
        icon: { type: 'string', minLength: 1 },
        items: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/ingredientItem' },
        },
      },
    },
    ingredientItem: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'amount', 'unit'],
      properties: {
        name: { type: 'string', minLength: 1 },
        amount: {
          oneOf: [
            { type: 'number', exclusiveMinimum: 0 },
            { type: 'string', minLength: 1 },
          ],
        },
        unit: { type: 'string', minLength: 1 },
        notes: { type: 'string' },
      },
    },
    phase: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'number', 'title', 'emoji', 'purpose', 'steps'],
      properties: {
        id: { type: 'string', minLength: 1 },
        number: { type: 'string', pattern: '^FASE\\s+[0-9]+$' },
        title: { type: 'string', minLength: 1 },
        emoji: { type: 'string', minLength: 1 },
        purpose: { type: 'string', minLength: 1 },
        steps: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/step' },
        },
      },
    },
    step: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'kind', 'text'],
      properties: {
        id: { type: 'string', minLength: 1 },
        kind: {
          type: 'string',
          enum: ['action', 'timer', 'result'],
        },
        text: { type: 'string', minLength: 1 },
        container: { type: 'string', minLength: 1 },
        timerSec: { type: 'integer', minimum: 1 },
        result: { type: 'string', minLength: 1 },
        ingredients: {
          type: 'array',
          items: { $ref: '#/$defs/stepIngredientRef' },
        },
      },
      allOf: [
        {
          if: {
            properties: { kind: { const: 'timer' } },
            required: ['kind'],
          },
          then: {
            required: ['timerSec'],
          },
        },
        {
          if: {
            properties: { kind: { const: 'result' } },
            required: ['kind'],
          },
          then: {
            required: ['result'],
          },
        },
      ],
    },
    stepIngredientRef: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'amount', 'unit'],
      properties: {
        name: { type: 'string', minLength: 1 },
        amount: {
          oneOf: [
            { type: 'number', exclusiveMinimum: 0 },
            { type: 'string', minLength: 1 },
          ],
        },
        unit: { type: 'string', minLength: 1 },
      },
    },
  },
} as const;

export const FIXED_RECIPE_JSON_SCHEMA_V2 = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://example.com/cooking-runtime-recipe-v2.1.schema.json',
  title: 'Cooking Runtime Recipe v2.1',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'servings', 'ingredients', 'phases'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    yield: {
      type: 'string',
      minLength: 1,
      description: 'Describe el rendimiento físico de la receta, como tamaño de molde o volumen final',
    },
    recipeCategory: {
      type: 'string',
      enum: ['stovetop', 'baking', 'dessert', 'airfryer', 'beverage', 'other'],
    },
    equipment: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    servings: { type: 'integer', minimum: 1 },
    ingredients: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/ingredientGroup' },
    },
    phases: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/phase' },
    },
  },
  $defs: {
    ingredientGroup: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'icon', 'items'],
      properties: {
        title: { type: 'string', minLength: 1 },
        icon: { type: 'string', minLength: 1 },
        items: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/ingredientItem' },
        },
      },
    },
    ingredientItem: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'canonicalName', 'amount', 'unit'],
      properties: {
        name: { type: 'string', minLength: 1 },
        canonicalName: { type: 'string', minLength: 1 },
        shoppingKey: { type: 'string', minLength: 1 },
        amount: {
          oneOf: [
            { type: 'number', exclusiveMinimum: 0 },
            { type: 'string', minLength: 1 },
          ],
        },
        unit: { type: 'string', minLength: 1 },
        displayAmount: { type: 'string', minLength: 1 },
        displayUnit: { type: 'string', minLength: 1 },
        notes: { type: 'string' },
        preparation: { type: 'string' },
        isFlexible: { type: 'boolean', default: false },
        isOptional: { type: 'boolean', default: false },
        purchasable: { type: 'boolean', default: true },
      },
    },
    phase: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'number', 'title', 'emoji', 'purpose', 'steps'],
      properties: {
        id: { type: 'string', minLength: 1 },
        number: { type: 'string', pattern: '^FASE\\s+[0-9]+$' },
        title: { type: 'string', minLength: 1 },
        emoji: { type: 'string', minLength: 1 },
        purpose: { type: 'string', minLength: 1 },
        steps: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/step' },
        },
      },
    },
    step: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'kind', 'text'],
      properties: {
        id: { type: 'string', minLength: 1 },
        kind: {
          type: 'string',
          enum: ['action', 'timer', 'result'],
        },
        text: { type: 'string', minLength: 1 },
        container: { type: 'string', minLength: 1 },
        timerSec: { type: 'integer', minimum: 1 },
        result: { type: 'string', minLength: 1 },
        ingredients: {
          type: 'array',
          items: { $ref: '#/$defs/stepIngredientRef' },
        },
      },
      allOf: [
        {
          if: {
            properties: { kind: { const: 'timer' } },
            required: ['kind'],
          },
          then: { required: ['timerSec'] },
        },
        {
          if: {
            properties: { kind: { const: 'result' } },
            required: ['kind'],
          },
          then: { required: ['result'] },
        },
      ],
    },
    stepIngredientRef: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'canonicalName', 'amount', 'unit'],
      properties: {
        name: { type: 'string', minLength: 1 },
        canonicalName: { type: 'string', minLength: 1 },
        shoppingKey: { type: 'string', minLength: 1 },
        amount: {
          oneOf: [
            { type: 'number', exclusiveMinimum: 0 },
            { type: 'string', minLength: 1 },
          ],
        },
        unit: { type: 'string', minLength: 1 },
        displayAmount: { type: 'string', minLength: 1 },
        displayUnit: { type: 'string', minLength: 1 },
        notes: { type: 'string' },
        preparation: { type: 'string' },
        isFlexible: { type: 'boolean', default: false },
        isOptional: { type: 'boolean', default: false },
      },
    },
  },
} as const;

export const FIXED_RECIPE_JSON_SCHEMA = FIXED_RECIPE_JSON_SCHEMA_V2;

export type FixedRecipeSchemaError = {
  path: string;
  message: string;
  keyword: string;
};

export type FixedRecipeSchemaValidation = {
  valid: boolean;
  errors: FixedRecipeSchemaError[];
  schemaVersion?: 'v1' | 'v2.1';
};

const AjvConstructor = Ajv as unknown as new (options: Record<string, unknown>) => {
  compile: (
    schema: unknown,
  ) => ((value: unknown) => boolean) & { errors?: ErrorObject[] | null };
};

const ajv = new AjvConstructor({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});

const { $schema: _ignoredDraftSchemaV1, ...schemaV1ForValidation } =
  FIXED_RECIPE_JSON_SCHEMA_V1 as Record<string, unknown>;
const { $schema: _ignoredDraftSchemaV2, ...schemaV2ForValidation } =
  FIXED_RECIPE_JSON_SCHEMA_V2 as Record<string, unknown>;
const validateFixedRecipeV1 = ajv.compile(schemaV1ForValidation);
const validateFixedRecipeV2 = ajv.compile(schemaV2ForValidation);

function mapErrors(errors: ErrorObject[] | null | undefined): FixedRecipeSchemaError[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    message: error.message ?? 'Invalid value',
    keyword: error.keyword,
  }));
}

export function validateFixedRecipeJson(candidate: unknown): FixedRecipeSchemaValidation {
  const v2Valid = validateFixedRecipeV2(candidate);
  if (v2Valid) {
    return {
      valid: true,
      errors: [],
      schemaVersion: 'v2.1',
    };
  }

  const v1Valid = validateFixedRecipeV1(candidate);
  if (v1Valid) {
    return {
      valid: true,
      errors: [],
      schemaVersion: 'v1',
    };
  }

  return {
    valid: false,
    errors: mapErrors(validateFixedRecipeV2.errors),
    schemaVersion: 'v2.1',
  };
}

export function buildFixedRecipeJsonContractPrompt(basePrompt: string): string {
  return [
    basePrompt,
    '',
    'SALIDA OBLIGATORIA:',
    '- Devuelve SOLO un objeto JSON válido.',
    '- No uses markdown, no uses comentarios, no uses texto fuera del JSON.',
    '- Debe cumplir exactamente este JSON Schema v2.1.',
    '',
    'JSON_SCHEMA_V2_1:',
    JSON.stringify(FIXED_RECIPE_JSON_SCHEMA_V2, null, 2),
  ].join('\n');
}
