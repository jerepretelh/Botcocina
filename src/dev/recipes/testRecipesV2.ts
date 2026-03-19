import type { RecipeV2 } from '../../app/types/recipe-v2';
import { normalizeStructuredAmount, normalizeYieldV2 } from '../../app/lib/recipe-v2/measurements';

function createYield(
  type: RecipeV2['baseYield']['type'],
  value: number | null,
  unit: string,
  label?: string,
  options?: {
    canonicalUnit?: string | null;
    visibleUnit?: string | null;
    containerKey?: string | null;
    containerMeta?: RecipeV2['baseYield']['containerMeta'];
  },
) {
  return normalizeYieldV2({
    type,
    value,
    canonicalUnit: options?.canonicalUnit ?? null,
    visibleUnit: options?.visibleUnit ?? unit,
    unit,
    label: label ?? unit,
    containerKey: options?.containerKey ?? null,
    containerMeta: options?.containerMeta ?? null,
  });
}

function createIngredient(args: {
  id: string;
  name: string;
  emoji: string;
  value: number | null;
  unit: string | null;
  text: string;
  indispensable?: boolean;
  scalingPolicy?: RecipeV2['ingredients'][number]['amount']['scalingPolicy'];
}): RecipeV2['ingredients'][number] {
  return {
    id: args.id,
    name: args.name,
    emoji: args.emoji,
    indispensable: args.indispensable,
    notes: null,
    amount: normalizeStructuredAmount({
      value: args.value,
      unit: args.unit,
      text: args.text,
      scalable: true,
      scalingPolicy: args.scalingPolicy ?? 'linear',
    }),
  };
}

function createAmountSubStep(args: {
  id: string;
  text: string;
  notes?: string | null;
  value: number | null;
  unit: string | null;
  amountText?: string;
  scalingPolicy?: RecipeV2['steps'][number]['subSteps'][number]['amount']['scalingPolicy'];
  containerMeta?: RecipeV2['baseYield']['containerMeta'];
}): RecipeV2['steps'][number]['subSteps'][number] {
  return {
    id: args.id,
    text: args.text,
    notes: args.notes ?? null,
    amount: normalizeStructuredAmount({
      value: args.value,
      unit: args.unit,
      text: args.amountText ?? null,
      scalable: true,
      scalingPolicy: args.scalingPolicy ?? 'linear',
      containerMeta: args.containerMeta ?? null,
    }),
    timer: null,
  };
}

function createTimerSubStep(args: {
  id: string;
  text: string;
  notes?: string | null;
  durationSeconds: number;
  scalingPolicy?: RecipeV2['steps'][number]['subSteps'][number]['timer']['scalingPolicy'];
}): RecipeV2['steps'][number]['subSteps'][number] {
  return {
    id: args.id,
    text: args.text,
    notes: args.notes ?? null,
    amount: null,
    timer: {
      durationSeconds: args.durationSeconds,
      scalingPolicy: args.scalingPolicy ?? 'gentle',
    },
  };
}

function createStep(args: {
  id: string;
  title: string;
  fireLevel?: RecipeV2['steps'][number]['fireLevel'];
  notes?: string | null;
  activeMinutes?: number | null;
  passiveMinutes?: number | null;
  subSteps: RecipeV2['steps'][number]['subSteps'];
  equipment?: RecipeV2['steps'][number]['equipment'];
}): RecipeV2['steps'][number] {
  return {
    id: args.id,
    title: args.title,
    fireLevel: args.fireLevel,
    notes: args.notes ?? null,
    activeMinutes: args.activeMinutes ?? null,
    passiveMinutes: args.passiveMinutes ?? null,
    equipment: args.equipment,
    subSteps: args.subSteps,
  };
}

function createTimeSummary(prepMinutes: number, cookMinutes: number): RecipeV2['timeSummary'] {
  return {
    prepMinutes,
    cookMinutes,
    totalMinutes: prepMinutes + cookMinutes,
  };
}

export const localTestRecipesV2: RecipeV2[] = [
  {
    id: 'test-arroz-perfecto-vaso',
    name: 'Arroz perfecto (prueba vaso)',
    description: 'Receta de validación para rendimiento por volumen con vaso explícito.',
    tip: 'No levantes la tapa en el graneado final.',
    icon: '🍚',
    ingredient: 'vaso',
    categoryId: 'lunch',
    baseYield: createYield('volume', 1, 'vaso', 'vaso', {
      canonicalUnit: 'ml',
      visibleUnit: 'vaso',
      containerMeta: {
        kind: 'glass',
        sizeLabel: 'Vaso',
        capacityMl: 250,
      },
    }),
    ingredients: [
      createIngredient({
        id: 'arroz-perfecto-arroz',
        name: 'Arroz',
        emoji: '🍚',
        value: 0.5,
        unit: 'taza',
        text: '0.5 taza',
        scalingPolicy: 'linear',
        indispensable: true,
      }),
      createIngredient({
        id: 'arroz-perfecto-agua',
        name: 'Agua',
        emoji: '💧',
        value: 1,
        unit: 'vaso',
        text: '1 vaso (250 ml)',
        scalingPolicy: 'container_dependent',
        indispensable: true,
      }),
      createIngredient({
        id: 'arroz-perfecto-sal',
        name: 'Sal',
        emoji: '🧂',
        value: null,
        unit: null,
        text: 'Al gusto',
        scalingPolicy: 'non_scalable',
      }),
    ],
    steps: [
      createStep({
        id: 'arroz-vaso-medidas',
        title: 'Medir y lavar',
        subSteps: [
          createAmountSubStep({
            id: 'arroz-vaso-medidas-1',
            text: 'Mide 1 vaso de arroz y enjuágalo.',
            value: 1,
            unit: 'vaso',
            amountText: '1 vaso',
            scalingPolicy: 'linear',
            containerMeta: { kind: 'glass', sizeLabel: 'Vaso', capacityMl: 250 },
          }),
          createAmountSubStep({
            id: 'arroz-vaso-medidas-2',
            text: 'Reserva el agua de remojo.',
            value: 1,
            unit: null,
            amountText: 'Porciona',
            scalingPolicy: 'non_scalable',
          }),
        ],
      }),
      createStep({
        id: 'arroz-vaso-coccion',
        title: 'Cocción con control de tiempo',
        subSteps: [
          createTimerSubStep({
            id: 'arroz-vaso-coccion-1',
            text: 'Cocina con tapa por 18 minutos.',
            durationSeconds: 1080,
            scalingPolicy: 'gentle',
          }),
          createAmountSubStep({
            id: 'arroz-vaso-coccion-2',
            text: 'Revisa el grano y deja reposar.',
            value: 10,
            unit: 'min',
            amountText: '10 minutos',
            scalingPolicy: 'fixed',
          }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(5, 24),
    experience: 'standard',
  },
  {
    id: 'test-keke-platano-molde-mediano',
    name: 'Keke de plátano (prueba molde)',
    description: 'Receta de validación para pan_size con pasos de seguimiento largos.',
    tip: 'La masa debe quedar densa, sin exceso de batido.',
    icon: '🍌',
    ingredient: 'molde',
    categoryId: 'breakfast',
    baseYield: createYield('pan_size', 1, 'molde mediano', 'molde mediano', {
      containerKey: 'mold-medium',
      containerMeta: {
        kind: 'mold',
        sizeLabel: 'Molde mediano',
        diameterCm: 22,
      },
    }),
    ingredients: [
      createIngredient({ id: 'keke-platano-platano', name: 'Plátano maduro', emoji: '🍌', value: 3, unit: 'unidades', text: '3 unidades', indispensable: true }),
      createIngredient({ id: 'keke-platano-harina', name: 'Harina', emoji: '🌾', value: 240, unit: 'g', text: '240 g', scalingPolicy: 'gentle', indispensable: true }),
      createIngredient({ id: 'keke-platano-huevo', name: 'Huevo', emoji: '🥚', value: 3, unit: 'unidades', text: '3 unidades', scalingPolicy: 'gentle', indispensable: true }),
      createIngredient({ id: 'keke-platano-azucar', name: 'Azúcar', emoji: '🍚', value: 120, unit: 'g', text: '120 g', scalingPolicy: 'gentle', indispensable: true }),
    ],
    steps: [
      createStep({
        id: 'keke-platano-paso1',
        title: 'Mezcla base y batido',
        subSteps: [
          createAmountSubStep({ id: 'keke-platano-paso1-1', text: 'Maja los plátanos y mézclalos con huevos y azúcar.', value: null, unit: null, amountText: 'Mezclar', scalingPolicy: 'non_scalable' }),
          createAmountSubStep({ id: 'keke-platano-paso1-2', text: 'Integra la harina en movimiento envolvente.', value: 240, unit: 'g', amountText: '240 g', scalingPolicy: 'gentle' }),
          createAmountSubStep({ id: 'keke-platano-paso1-3', text: 'Bate por 3 minutos para homogeneizar.', value: 3, unit: 'min', amountText: '3 min', scalingPolicy: 'fixed' }),
        ],
      }),
      createStep({
        id: 'keke-platano-paso2',
        title: 'Horneado largo',
        subSteps: [
          createAmountSubStep({ id: 'keke-platano-paso2-1', text: 'Vierte la mezcla en molde mediano engrasado.', value: null, unit: null, amountText: 'Molde mediano', scalingPolicy: 'container_dependent' }),
          createTimerSubStep({ id: 'keke-platano-paso2-2', text: 'Hornea a temperatura media.', durationSeconds: 2850, scalingPolicy: 'container_dependent' }),
          createAmountSubStep({ id: 'keke-platano-paso2-3', text: 'Deja reposar y desmolda tibio.', value: 10, unit: 'min', amountText: '10 min', scalingPolicy: 'fixed' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(25, 50),
    experience: 'standard',
  },
  {
    id: 'test-papas-airfryer-personas',
    name: 'Papas en airfryer (prueba)',
    description: 'Receta de validación para canasta de airfryer y múltiples temporizadores.',
    tip: 'Cocina por tandas para dorado uniforme.',
    icon: '🍟',
    ingredient: 'porciones',
    categoryId: 'airfryer',
    baseYield: createYield('servings', 3, 'porciones', 'porciones'),
    ingredients: [
      createIngredient({ id: 'papas-air-papas', name: 'Papas', emoji: '🥔', value: 900, unit: 'g', text: '900 g', scalingPolicy: 'container_dependent', indispensable: true }),
      createIngredient({ id: 'papas-air-aceite', name: 'Aceite', emoji: '🫒', value: 2, unit: 'cda', text: '2 cdas', scalingPolicy: 'gentle', indispensable: true }),
      createIngredient({ id: 'papas-air-sal', name: 'Sal', emoji: '🧂', value: null, unit: null, text: 'Al gusto', scalingPolicy: 'non_scalable' }),
    ],
    steps: [
      createStep({
        id: 'papas-air-paso1',
        title: 'Preparación inicial',
        subSteps: [
          createAmountSubStep({ id: 'papas-air-paso1-1', text: 'Corta las papas y sécalas bien.', value: 900, unit: 'g', amountText: '900 g' }),
          createAmountSubStep({ id: 'papas-air-paso1-2', text: 'Mezcla aceite y sal.', value: 2, unit: 'cda', amountText: '2 cdas' }),
        ],
      }),
      createStep({
        id: 'papas-air-coccion',
        title: 'Cocción en canasta',
        equipment: 'airfryer',
        subSteps: [
          createAmountSubStep({
            id: 'papas-air-coccion-1',
            text: 'Distribuye en la canasta mediana.',
            value: null,
            unit: null,
            amountText: 'Canasta mediana',
            scalingPolicy: 'container_dependent',
          }),
          createTimerSubStep({ id: 'papas-air-coccion-2', text: 'Cocina a temperatura alta.', durationSeconds: 900, scalingPolicy: 'batch' }),
          createTimerSubStep({ id: 'papas-air-coccion-3', text: 'Baja la temperatura y remueve, luego finaliza.', durationSeconds: 420, scalingPolicy: 'batch' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(20, 26),
    experience: 'standard',
    cookingContextDefaults: {
      selectedContainerKey: 'basket-medium',
      selectedContainerMeta: {
        kind: 'basket',
        sizeLabel: 'Canasta mediana',
        capacityMl: 3500,
        widthCm: 20,
        heightCm: 9,
      },
    },
  },
  {
    id: 'test-jugo-frutas',
    name: 'Jugo de frutas (prueba 2 litros)',
    description: 'Receta de validación para rendimiento de volumen en litros.',
    tip: 'Mezcla en frío y ajusta dulzor al gusto.',
    icon: '🥤',
    ingredient: 'litros',
    categoryId: 'desayuno',
    baseYield: createYield('volume', 2, 'litros', 'litros', {
      canonicalUnit: 'ml',
      visibleUnit: 'l',
    }),
    ingredients: [
      createIngredient({
        id: 'jugo-frutas-fruta',
        name: 'Fruta (naranja o piña)',
        emoji: '🍍',
        value: 900,
        unit: 'g',
        text: '900 g',
        indispensable: true,
      }),
      createIngredient({
        id: 'jugo-frutas-agua',
        name: 'Agua',
        emoji: '💧',
        value: 2,
        unit: 'l',
        text: '2 litros',
        scalingPolicy: 'container_dependent',
        indispensable: false,
      }),
      createIngredient({ id: 'jugo-frutas-azucar', name: 'Azúcar', emoji: '🍯', value: 2, unit: 'cdas', text: '2 cdas', scalingPolicy: 'gentle' }),
      createIngredient({ id: 'jugo-frutas-hielo', name: 'Hielo', emoji: '🧊', value: null, unit: null, text: 'Al gusto', scalingPolicy: 'non_scalable' }),
    ],
    steps: [
      createStep({
        id: 'jugo-frutas-1',
        title: 'Preparar base',
        subSteps: [
          createAmountSubStep({ id: 'jugo-frutas-1-1', text: 'Corta y licúa la fruta.', value: null, unit: null, amountText: 'Preparar fruta' }),
          createAmountSubStep({ id: 'jugo-frutas-1-2', text: 'Agrega agua y azúcar.', value: 2, unit: 'l', amountText: '2 litros' }),
          createAmountSubStep({ id: 'jugo-frutas-1-3', text: 'Sirve en vaso frío.', value: null, unit: null, amountText: '2 vasos' }),
        ],
      }),
      createStep({
        id: 'jugo-frutas-2',
        title: 'Ajuste final',
        subSteps: [
          createAmountSubStep({ id: 'jugo-frutas-2-1', text: 'Prueba sabor y corrige si necesitas.', value: null, unit: null, amountText: 'Al gusto' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(10, 10),
    experience: 'standard',
  },
];

export const localTestRecipeV2ById: Record<string, RecipeV2> = Object.fromEntries(
  localTestRecipesV2.map((recipe) => [recipe.id, recipe]),
);
