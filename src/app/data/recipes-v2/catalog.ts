import type { CompoundRecipeMeta } from '../../types';
import type {
  ContainerMetaV2,
  RecipeIngredientV2,
  RecipeStepV2,
  RecipeSubStepV2,
  RecipeTimeSummaryV2,
  RecipeV2,
  RecipeYieldV2,
  ScalingPolicy,
} from '../../types/recipe-v2';
import { normalizeStructuredAmount, normalizeYieldV2 } from '../../lib/recipe-v2/measurements';

function createYield(
  type: RecipeYieldV2['type'],
  value: number | null,
  unit: string,
  label?: string,
  options?: {
    canonicalUnit?: string | null;
    visibleUnit?: string | null;
    containerKey?: string | null;
    containerMeta?: ContainerMetaV2 | null;
  },
): RecipeYieldV2 {
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
  text?: string | null;
  scalable?: boolean;
  scalingPolicy?: ScalingPolicy;
  indispensable?: boolean;
  notes?: string | null;
}): RecipeIngredientV2 {
  return {
    id: args.id,
    name: args.name,
    emoji: args.emoji,
    indispensable: args.indispensable,
    notes: args.notes ?? null,
    amount: normalizeStructuredAmount({
      value: args.value,
      unit: args.unit,
      text: args.text ?? null,
      scalable: args.scalable ?? true,
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
  amountText?: string | null;
  scalable?: boolean;
  scalingPolicy?: ScalingPolicy;
}): RecipeSubStepV2 {
  return {
    id: args.id,
    text: args.text,
    notes: args.notes ?? null,
    amount: normalizeStructuredAmount({
      value: args.value,
      unit: args.unit,
      text: args.amountText ?? null,
      scalable: args.scalable ?? true,
      scalingPolicy: args.scalingPolicy ?? 'linear',
    }),
    timer: null,
  };
}

function createTimerSubStep(args: {
  id: string;
  text: string;
  notes?: string | null;
  durationSeconds: number;
  scalingPolicy?: ScalingPolicy;
}): RecipeSubStepV2 {
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
  fireLevel?: 'low' | 'medium' | 'high';
  notes?: string | null;
  activeMinutes?: number | null;
  passiveMinutes?: number | null;
  subSteps: RecipeSubStepV2[];
}): RecipeStepV2 {
  return {
    id: args.id,
    title: args.title,
    fireLevel: args.fireLevel,
    notes: args.notes ?? null,
    activeMinutes: args.activeMinutes ?? null,
    passiveMinutes: args.passiveMinutes ?? null,
    subSteps: args.subSteps,
  };
}

function createTimeSummary(prepMinutes: number, cookMinutes: number): RecipeTimeSummaryV2 {
  return {
    prepMinutes,
    cookMinutes,
    totalMinutes: prepMinutes + cookMinutes,
  };
}

const arrozLentejasCompoundMeta: CompoundRecipeMeta = {
  components: [
    { id: 'lentejas', name: 'Lentejas', icon: '🫘', summary: 'Hervor y cocción base' },
    { id: 'arroz', name: 'Arroz', icon: '🍚', summary: 'Olla principal y graneado' },
    { id: 'sofrito', name: 'Sofrito', icon: '🧄', summary: 'Aromáticos para unir sabores' },
  ],
  timeline: [
    { id: 'al-setup-lavado', componentId: 'lentejas', stepIndex: 0, subStepIndex: 0 },
    { id: 'al-setup-picado', componentId: 'sofrito', stepIndex: 0, subStepIndex: 1 },
    { id: 'al-lentejas-hervor', componentId: 'lentejas', stepIndex: 1, subStepIndex: 0, timerLabel: 'Hervor inicial', autoAdvanceOnStart: true, backgroundHint: 'Las lentejas ya están al fuego. Continúa ahora con la olla del arroz.', completionMessage: 'El hervor inicial de lentejas ya está listo.' },
    { id: 'al-arroz-precalentar', componentId: 'arroz', stepIndex: 2, subStepIndex: 0, timerLabel: 'Precalentar olla' },
    { id: 'al-sofrito-base', componentId: 'sofrito', stepIndex: 2, subStepIndex: 1, timerLabel: 'Sofrito base' },
    { id: 'al-arroz-nacarar', componentId: 'arroz', stepIndex: 2, subStepIndex: 2, timerLabel: 'Nacarar arroz' },
    { id: 'al-lentejas-coccion', componentId: 'lentejas', stepIndex: 1, subStepIndex: 1, timerLabel: 'Cocción de lentejas', autoAdvanceOnStart: true, backgroundHint: 'Las lentejas siguen cocinándose en segundo plano. Avanza con la integración del arroz.', completionMessage: 'Las lentejas ya quedaron casi tiernas.' },
    { id: 'al-lentejas-check', componentId: 'lentejas', stepIndex: 1, subStepIndex: 2 },
    { id: 'al-integracion-unir', componentId: 'arroz', stepIndex: 3, subStepIndex: 0 },
    { id: 'al-integracion-ajuste', componentId: 'sofrito', stepIndex: 3, subStepIndex: 1 },
    { id: 'al-integracion-abierta', componentId: 'arroz', stepIndex: 3, subStepIndex: 2, timerLabel: 'Cocción abierta', autoAdvanceOnStart: true, backgroundHint: 'El arroz ya quedó en cocción abierta. Continúa con el control del fuego y el siguiente frente.', completionMessage: 'La cocción abierta del arroz ya terminó.' },
    { id: 'al-graneado-bajar', componentId: 'arroz', stepIndex: 4, subStepIndex: 0 },
    { id: 'al-graneado-final', componentId: 'arroz', stepIndex: 4, subStepIndex: 1, timerLabel: 'Graneado tapado', autoAdvanceOnStart: true, backgroundHint: 'El arroz terminó de graneado. Puedes preparar el cierre de la receta mientras tanto.', completionMessage: 'El graneado tapado ya terminó.' },
    { id: 'al-final-reposo', componentId: 'arroz', stepIndex: 5, subStepIndex: 0, timerLabel: 'Reposo final', autoAdvanceOnStart: true, backgroundHint: 'La olla está reposando. Ve preparando el servido final.', completionMessage: 'El reposo final ya quedó listo.' },
    { id: 'al-final-servir', componentId: 'arroz', stepIndex: 5, subStepIndex: 1 },
  ],
};

const tallarinesCompoundMeta: CompoundRecipeMeta = {
  components: [
    { id: 'pasta', name: 'Pasta', icon: '🍝', summary: 'Agua, cocción y escurrido' },
    { id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base roja y reducción' },
  ],
  timeline: [
    { id: 'tr-prep-picar', componentId: 'salsa', stepIndex: 0, subStepIndex: 0 },
    { id: 'tr-prep-agua', componentId: 'pasta', stepIndex: 0, subStepIndex: 1, timerLabel: 'Agua calentando', autoAdvanceOnStart: true, backgroundHint: 'El agua ya está calentando. Continúa ahora con la salsa.', completionMessage: 'El agua ya alcanzó el punto esperado.' },
    { id: 'tr-salsa-sofrito', componentId: 'salsa', stepIndex: 1, subStepIndex: 0, timerLabel: 'Sofrito', autoAdvanceOnStart: true, backgroundHint: 'El sofrito ya está en curso. Aprovecha para avanzar con el siguiente paso de la salsa.', completionMessage: 'El sofrito ya quedó en su punto.' },
    { id: 'tr-salsa-tomate', componentId: 'salsa', stepIndex: 1, subStepIndex: 1 },
    { id: 'tr-salsa-reducir', componentId: 'salsa', stepIndex: 1, subStepIndex: 2, timerLabel: 'Reducción de salsa', autoAdvanceOnStart: true, backgroundHint: 'La salsa está reduciendo sola. Continúa ahora con la pasta.', completionMessage: 'La reducción de salsa ya quedó lista.' },
    { id: 'tr-pasta-ingreso', componentId: 'pasta', stepIndex: 2, subStepIndex: 0 },
    { id: 'tr-pasta-coccion', componentId: 'pasta', stepIndex: 2, subStepIndex: 1, timerLabel: 'Cocción pasta', autoAdvanceOnStart: true, backgroundHint: 'La pasta ya está en cocción. Vuelve a la salsa o prepárate para integrar.', completionMessage: 'La pasta ya terminó su cocción.' },
    { id: 'tr-pasta-escurrir', componentId: 'pasta', stepIndex: 2, subStepIndex: 2 },
    { id: 'tr-final-unir', componentId: 'salsa', stepIndex: 3, subStepIndex: 0 },
    { id: 'tr-final-reposo', componentId: 'salsa', stepIndex: 3, subStepIndex: 1, timerLabel: 'Reposo corto', autoAdvanceOnStart: true, backgroundHint: 'La mezcla ya está reposando. Ve cerrando el servido.', completionMessage: 'El reposo corto ya terminó.' },
    { id: 'tr-final-servir', componentId: 'pasta', stepIndex: 3, subStepIndex: 2 },
  ],
};

export const localRecipesV2: RecipeV2[] = [
  {
    id: 'quinua-desayuno',
    name: 'Quinua del desayuno',
    description: 'Bowl tibio y simple para una manana ligera.',
    tip: 'Enjuaga la quinua hasta que el agua salga clara para evitar amargor.',
    icon: '🥣',
    ingredient: 'porciones',
    categoryId: 'breakfast',
    baseYield: createYield('servings', 2, 'porciones'),
    ingredients: [
      createIngredient({ id: 'quinua', name: 'Quinua', emoji: '🌾', value: 1, unit: 'taza', text: '1 taza', indispensable: true }),
      createIngredient({ id: 'agua', name: 'Agua', emoji: '💧', value: 2, unit: 'tazas', text: '2 tazas', indispensable: true }),
      createIngredient({ id: 'leche', name: 'Leche', emoji: '🥛', value: 1, unit: 'taza', text: '1 taza', indispensable: false, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'miel', name: 'Miel', emoji: '🍯', value: 2, unit: 'cdas', text: '2 cdas', indispensable: false, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'fruta', name: 'Fruta picada', emoji: '🍓', value: 1, unit: 'taza', text: '1 taza', indispensable: false }),
    ],
    steps: [
      createStep({
        id: 'qd-lavar',
        title: 'Lavar y medir',
        subSteps: [
          createAmountSubStep({ id: 'qd-lavar-1', text: 'Enjuaga la quinua hasta que deje de espumar.', notes: 'Usa colador fino.', value: 1, unit: 'taza', amountText: '1 taza' }),
          createAmountSubStep({ id: 'qd-lavar-2', text: 'Mide el agua para la cocción.', value: 2, unit: 'tazas', amountText: '2 tazas' }),
        ],
      }),
      createStep({
        id: 'qd-cocer',
        title: 'Cocer la quinua',
        fireLevel: 'medium',
        activeMinutes: 5,
        passiveMinutes: 15,
        subSteps: [
          createAmountSubStep({ id: 'qd-cocer-1', text: 'Lleva la quinua con el agua a una olla.', value: null, unit: null, amountText: 'Continuar' }),
          createTimerSubStep({ id: 'qd-cocer-2', text: 'Cocina tapado hasta que reviente.', durationSeconds: 900, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'qd-terminar',
        title: 'Terminar el bowl',
        subSteps: [
          createAmountSubStep({ id: 'qd-terminar-1', text: 'Afloja con tenedor y agrega la leche.', value: 1, unit: 'taza', amountText: '1 taza' }),
          createAmountSubStep({ id: 'qd-terminar-2', text: 'Sirve con miel y fruta por encima.', value: null, unit: null, amountText: 'Al gusto', scalable: false, scalingPolicy: 'non_scalable' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(8, 15),
    experience: 'standard',
  },
  {
    id: 'pan-palta-huevo',
    name: 'Pan con palta y huevo',
    description: 'Desayuno rapido para probar rendimiento por unidades.',
    tip: 'Tuesta el pan al final para que no pierda crocancia.',
    icon: '🥑',
    ingredient: 'tostadas',
    categoryId: 'breakfast',
    baseYield: createYield('units', 2, 'tostadas'),
    ingredients: [
      createIngredient({ id: 'pan', name: 'Pan tajado', emoji: '🍞', value: 2, unit: 'tajadas', text: '2 tajadas', indispensable: true }),
      createIngredient({ id: 'palta', name: 'Palta', emoji: '🥑', value: 1, unit: 'unidad', text: '1 palta', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'huevo', name: 'Huevo', emoji: '🥚', value: 2, unit: 'unidades', text: '2 huevos', indispensable: true }),
      createIngredient({ id: 'sal', name: 'Sal', emoji: '🧂', value: null, unit: null, text: 'Al gusto', indispensable: false, scalable: false, scalingPolicy: 'non_scalable' }),
    ],
    steps: [
      createStep({
        id: 'pph-tostar',
        title: 'Tostar y cocer',
        subSteps: [
          createTimerSubStep({ id: 'pph-tostar-1', text: 'Tuesta el pan hasta dorar.', durationSeconds: 150, scalingPolicy: 'fixed' }),
          createTimerSubStep({ id: 'pph-tostar-2', text: 'Cocina los huevos a tu gusto.', durationSeconds: 240, scalingPolicy: 'batch' }),
        ],
      }),
      createStep({
        id: 'pph-montar',
        title: 'Montar las tostadas',
        subSteps: [
          createAmountSubStep({ id: 'pph-montar-1', text: 'Maja la palta y sazona.', value: 1, unit: 'unidad', amountText: '1 palta', scalingPolicy: 'gentle' }),
          createAmountSubStep({ id: 'pph-montar-2', text: 'Unta el pan y termina con huevo encima.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(6, 6),
    experience: 'standard',
    isCoreRecipe: true,
  },
  {
    id: 'huevo-sancochado',
    name: 'Huevo sancochado',
    description: 'Prueba corta de yield por unidades y timer fijo.',
    tip: 'Enfria en agua para cortar la cocción y pelar mejor.',
    icon: '🥚',
    ingredient: 'huevos',
    categoryId: 'breakfast',
    baseYield: createYield('units', 4, 'huevos'),
    ingredients: [
      createIngredient({ id: 'huevo', name: 'Huevos', emoji: '🥚', value: 4, unit: 'unidades', text: '4 huevos', indispensable: true }),
      createIngredient({ id: 'agua', name: 'Agua', emoji: '💧', value: 1.5, unit: 'litros', text: '1.5 litros', indispensable: true, scalingPolicy: 'container_dependent' }),
      createIngredient({ id: 'sal', name: 'Sal', emoji: '🧂', value: 1, unit: 'cdta', text: '1 cdta', indispensable: false, scalingPolicy: 'fixed' }),
    ],
    steps: [
      createStep({
        id: 'hs-hervor',
        title: 'Llevar a hervor',
        subSteps: [
          createAmountSubStep({ id: 'hs-hervor-1', text: 'Coloca agua suficiente para cubrir los huevos.', value: 1.5, unit: 'litros', amountText: '1.5 litros', scalingPolicy: 'container_dependent' }),
          createTimerSubStep({ id: 'hs-hervor-2', text: 'Hierve el agua antes de ingresar los huevos.', durationSeconds: 300, scalingPolicy: 'fixed' }),
        ],
      }),
      createStep({
        id: 'hs-coccion',
        title: 'Cocción de huevos',
        subSteps: [
          createAmountSubStep({ id: 'hs-coccion-1', text: 'Baja los huevos con cuidado.', value: 4, unit: 'unidades', amountText: '4 huevos' }),
          createTimerSubStep({ id: 'hs-coccion-2', text: 'Cocina hasta yema firme.', durationSeconds: 600, scalingPolicy: 'fixed' }),
        ],
      }),
      createStep({
        id: 'hs-enfriar',
        title: 'Enfriar y servir',
        subSteps: [
          createTimerSubStep({ id: 'hs-enfriar-1', text: 'Enfria en agua para cortar la cocción.', durationSeconds: 120, scalingPolicy: 'fixed' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(4, 17),
    experience: 'standard',
  },
  {
    id: 'arroz',
    name: 'Arroz perfecto',
    description: 'Receta base para probar rendimiento por volumen.',
    tip: 'No destapes en el graneado final para que no pierda vapor.',
    icon: '🍚',
    ingredient: 'tazas',
    categoryId: 'lunch',
    baseYield: createYield('volume', 2, 'taza', 'tazas', { visibleUnit: 'taza' }),
    scalingModel: 'base_ingredient',
    sensitivity: 'ratio_sensitive',
    baseIngredientId: 'arroz',
    ingredients: [
      createIngredient({ id: 'arroz', name: 'Arroz', emoji: '🍚', value: 2, unit: 'tazas', text: '2 tazas', indispensable: true }),
      createIngredient({ id: 'agua', name: 'Agua', emoji: '💧', value: 3, unit: 'tazas', text: '3 tazas', indispensable: true, scalingPolicy: 'container_dependent' }),
      createIngredient({ id: 'aceite', name: 'Aceite', emoji: '🫒', value: 1, unit: 'cda', text: '1 cda', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'sal', name: 'Sal', emoji: '🧂', value: 1, unit: 'cdta', text: '1 cdta', indispensable: false, scalingPolicy: 'gentle' }),
    ],
    steps: [
      createStep({
        id: 'ar-medidas',
        title: 'Medir y lavar',
        subSteps: [
          createAmountSubStep({ id: 'ar-medidas-1', text: 'Mide el arroz base de la receta.', value: 2, unit: 'tazas', amountText: '2 tazas' }),
          createAmountSubStep({ id: 'ar-medidas-2', text: 'Enjuaga hasta que el agua salga menos turbia.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
      createStep({
        id: 'ar-base',
        title: 'Sellar la base',
        fireLevel: 'medium',
        subSteps: [
          createAmountSubStep({ id: 'ar-base-1', text: 'Calienta aceite y agrega el arroz.', value: 1, unit: 'cda', amountText: '1 cda', scalingPolicy: 'gentle' }),
          createTimerSubStep({ id: 'ar-base-2', text: 'Nacara el arroz sin tostarlo de más.', durationSeconds: 150, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'ar-coccion',
        title: 'Cocción y graneado',
        fireLevel: 'low',
        subSteps: [
          createAmountSubStep({ id: 'ar-coccion-1', text: 'Agrega agua y sal, luego tapa.', value: 3, unit: 'tazas', amountText: '3 tazas', scalingPolicy: 'container_dependent' }),
          createTimerSubStep({ id: 'ar-coccion-2', text: 'Cocina tapado a fuego bajo.', durationSeconds: 1020, scalingPolicy: 'gentle' }),
          createTimerSubStep({ id: 'ar-coccion-3', text: 'Deja reposar antes de esponjar.', durationSeconds: 300, scalingPolicy: 'fixed' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(6, 24),
    experience: 'standard',
    isCoreRecipe: true,
  },
  {
    id: 'lomo-saltado-casero',
    name: 'Lomo saltado casero',
    description: 'Receta estándar para probar fuego alto y escalado suave.',
    tip: 'Cocina por tandas si aumentas mucho la cantidad para no hervir la carne.',
    icon: '🥩',
    ingredient: 'porciones',
    categoryId: 'lunch',
    baseYield: createYield('servings', 2, 'porciones'),
    ingredients: [
      createIngredient({ id: 'carne', name: 'Lomo en tiras', emoji: '🥩', value: 300, unit: 'g', text: '300 g', indispensable: true }),
      createIngredient({ id: 'cebolla', name: 'Cebolla roja', emoji: '🧅', value: 1, unit: 'unidad', text: '1 unidad', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'tomate', name: 'Tomate', emoji: '🍅', value: 2, unit: 'unidades', text: '2 unidades', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'papas', name: 'Papas fritas', emoji: '🍟', value: 250, unit: 'g', text: '250 g', indispensable: false, scalingPolicy: 'batch' }),
      createIngredient({ id: 'sillao', name: 'Sillao', emoji: '🫙', value: 2, unit: 'cdas', text: '2 cdas', indispensable: true, scalingPolicy: 'gentle' }),
    ],
    steps: [
      createStep({
        id: 'ls-prep',
        title: 'Preparar mise en place',
        subSteps: [
          createAmountSubStep({ id: 'ls-prep-1', text: 'Corta la cebolla en pluma y el tomate en gajos.', value: null, unit: null, amountText: 'Continuar' }),
          createAmountSubStep({ id: 'ls-prep-2', text: 'Sazona la carne con sal y pimienta.', value: 300, unit: 'g', amountText: '300 g' }),
        ],
      }),
      createStep({
        id: 'ls-coccion',
        title: 'Saltear a fuego alto',
        fireLevel: 'high',
        subSteps: [
          createTimerSubStep({ id: 'ls-coccion-1', text: 'Dora la carne sin mover demasiado.', durationSeconds: 180, scalingPolicy: 'batch' }),
          createTimerSubStep({ id: 'ls-coccion-2', text: 'Agrega cebolla, tomate y sillao.', durationSeconds: 150, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'ls-final',
        title: 'Terminar y servir',
        subSteps: [
          createAmountSubStep({ id: 'ls-final-1', text: 'Integra las papas al final o sirve al costado.', value: 250, unit: 'g', amountText: '250 g', scalingPolicy: 'batch' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(12, 8),
    experience: 'standard',
  },
  {
    id: 'sopa-verduras',
    name: 'Sopa de verduras',
    description: 'Prueba de receta de olla con rendimiento por peso.',
    tip: 'Mantén el corte parejo para que todo quede listo a la vez.',
    icon: '🥣',
    ingredient: 'g de verdura',
    categoryId: 'sopas-guisos',
    baseYield: createYield('weight', 800, 'g', 'g de sopa', { visibleUnit: 'g' }),
    ingredients: [
      createIngredient({ id: 'mezcla', name: 'Verduras mixtas', emoji: '🥕', value: 500, unit: 'g', text: '500 g', indispensable: true }),
      createIngredient({ id: 'caldo', name: 'Caldo o agua', emoji: '🍲', value: 1.2, unit: 'litros', text: '1.2 litros', indispensable: true, scalingPolicy: 'container_dependent' }),
      createIngredient({ id: 'fideos', name: 'Fideos cortos', emoji: '🍜', value: 80, unit: 'g', text: '80 g', indispensable: false, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'sal', name: 'Sal', emoji: '🧂', value: null, unit: null, text: 'Al gusto', indispensable: false, scalable: false, scalingPolicy: 'non_scalable' }),
    ],
    steps: [
      createStep({
        id: 'sv-base',
        title: 'Preparar la base',
        subSteps: [
          createAmountSubStep({ id: 'sv-base-1', text: 'Pica las verduras en cubos parejos.', value: 500, unit: 'g', amountText: '500 g' }),
          createAmountSubStep({ id: 'sv-base-2', text: 'Lleva el caldo a una olla mediana.', value: 1.2, unit: 'litros', amountText: '1.2 litros', scalingPolicy: 'container_dependent' }),
        ],
      }),
      createStep({
        id: 'sv-cocer',
        title: 'Cocción',
        fireLevel: 'medium',
        subSteps: [
          createTimerSubStep({ id: 'sv-cocer-1', text: 'Cocina las verduras hasta suavizar.', durationSeconds: 900, scalingPolicy: 'gentle' }),
          createTimerSubStep({ id: 'sv-cocer-2', text: 'Agrega los fideos en la recta final.', durationSeconds: 360, scalingPolicy: 'gentle' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(10, 21),
    experience: 'standard',
  },
  {
    id: 'keke-platano-molde',
    name: 'Keke de plátano',
    description: 'Receta de prueba para rendimiento por molde.',
    tip: 'Si cambias a un molde más grande, revisa el punto unos minutos antes.',
    icon: '🍌',
    ingredient: 'molde',
    categoryId: 'breakfast',
    baseYield: createYield('pan_size', 1, 'molde mediano', 'molde mediano', {
      containerKey: 'mold-medium',
      containerMeta: { kind: 'mold', sizeLabel: 'Molde mediano', diameterCm: 22 },
    }),
    scalingModel: 'container_bound',
    sensitivity: 'ratio_sensitive',
    ingredients: [
      createIngredient({ id: 'platano', name: 'Plátano maduro', emoji: '🍌', value: 3, unit: 'unidades', text: '3 unidades', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'harina', name: 'Harina', emoji: '🌾', value: 240, unit: 'g', text: '240 g', indispensable: true, scalingPolicy: 'container_dependent' }),
      createIngredient({ id: 'huevo', name: 'Huevo', emoji: '🥚', value: 2, unit: 'unidades', text: '2 huevos', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'azucar', name: 'Azúcar', emoji: '🍚', value: 120, unit: 'g', text: '120 g', indispensable: true, scalingPolicy: 'gentle' }),
    ],
    steps: [
      createStep({
        id: 'kp-base',
        title: 'Preparar la mezcla',
        subSteps: [
          createAmountSubStep({ id: 'kp-base-1', text: 'Maja el plátano y mezcla con huevos y azúcar.', value: null, unit: null, amountText: 'Continuar' }),
          createAmountSubStep({ id: 'kp-base-2', text: 'Integra la harina sin sobrebatir.', value: 240, unit: 'g', amountText: '240 g', scalingPolicy: 'container_dependent' }),
        ],
      }),
      createStep({
        id: 'kp-horno',
        title: 'Hornear',
        subSteps: [
          createAmountSubStep({ id: 'kp-horno-1', text: 'Vierte en un molde mediano engrasado.', value: null, unit: null, amountText: 'Molde mediano', scalingPolicy: 'container_dependent' }),
          createTimerSubStep({ id: 'kp-horno-2', text: 'Hornea hasta que el centro salga seco.', durationSeconds: 2400, scalingPolicy: 'container_dependent' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(15, 40),
    experience: 'standard',
    isCoreRecipe: true,
  },
  {
    id: 'papas-airfryer',
    name: 'Papas en airfryer',
    description: 'Receta de prueba para canasta y tandas.',
    tip: 'No llenes demasiado la canasta si quieres dorado parejo.',
    icon: '🍟',
    ingredient: 'porciones',
    categoryId: 'airfryer',
    baseYield: createYield('servings', 2, 'porciones'),
    ingredients: [
      createIngredient({ id: 'papas', name: 'Papas', emoji: '🥔', value: 600, unit: 'g', text: '600 g', indispensable: true, scalingPolicy: 'container_dependent' }),
      createIngredient({ id: 'aceite', name: 'Aceite', emoji: '🫒', value: 1, unit: 'cda', text: '1 cda', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'sal', name: 'Sal', emoji: '🧂', value: null, unit: null, text: 'Al gusto', indispensable: false, scalable: false, scalingPolicy: 'non_scalable' }),
    ],
    steps: [
      createStep({
        id: 'pa-prep',
        title: 'Cortar y sazonar',
        subSteps: [
          createAmountSubStep({ id: 'pa-prep-1', text: 'Corta las papas en bastones y sécalas bien.', value: 600, unit: 'g', amountText: '600 g' }),
          createAmountSubStep({ id: 'pa-prep-2', text: 'Mezcla con aceite y sal.', value: 1, unit: 'cda', amountText: '1 cda', scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'pa-coccion',
        title: 'Cocinar en la canasta',
        equipment: 'airfryer',
        subSteps: [
          createAmountSubStep({ id: 'pa-coccion-1', text: 'Distribuye en la canasta sin amontonar.', value: null, unit: null, amountText: 'Canasta mediana', scalingPolicy: 'container_dependent' }),
          createTimerSubStep({ id: 'pa-coccion-2', text: 'Cocina hasta dorar, agitando a mitad.', durationSeconds: 1080, scalingPolicy: 'batch' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(12, 18),
    experience: 'standard',
    isCoreRecipe: true,
    cookingContextDefaults: {
      selectedContainerKey: 'basket-medium',
      selectedContainerMeta: { kind: 'basket', sizeLabel: 'Canasta mediana', capacityMl: 3500, widthCm: 20, heightCm: 9 },
    },
  },
  {
    id: 'arroz-lentejas-compuesto',
    name: 'Arroz con lentejas',
    description: 'Demo compuesta con varios frentes coordinados.',
    tip: 'Empieza por lentejas y luego cruza con arroz y sofrito.',
    icon: '🍛',
    ingredient: 'porciones',
    categoryId: 'saludables-veggies',
    baseYield: createYield('servings', 4, 'porciones'),
    ingredients: [
      createIngredient({ id: 'lentejas', name: 'Lentejas', emoji: '🫘', value: 1, unit: 'taza', text: '1 taza', indispensable: true }),
      createIngredient({ id: 'arroz', name: 'Arroz', emoji: '🍚', value: 2, unit: 'tazas', text: '2 tazas', indispensable: true }),
      createIngredient({ id: 'cebolla', name: 'Cebolla', emoji: '🧅', value: 1, unit: 'unidad', text: '1 unidad', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'ajo', name: 'Ajo', emoji: '🧄', value: 2, unit: 'dientes', text: '2 dientes', indispensable: true, scalingPolicy: 'gentle' }),
    ],
    steps: [
      createStep({
        id: 'alc-prep',
        title: 'Preparar los frentes',
        subSteps: [
          createAmountSubStep({ id: 'alc-prep-1', text: 'Lava las lentejas.', value: 1, unit: 'taza', amountText: '1 taza' }),
          createAmountSubStep({ id: 'alc-prep-2', text: 'Pica cebolla y ajo para el sofrito.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
      createStep({
        id: 'alc-lentejas',
        title: 'Cocción de lentejas',
        subSteps: [
          createTimerSubStep({ id: 'alc-lentejas-1', text: 'Hierve las lentejas.', durationSeconds: 900, scalingPolicy: 'gentle' }),
          createTimerSubStep({ id: 'alc-lentejas-2', text: 'Cocina hasta que estén casi tiernas.', durationSeconds: 1200, scalingPolicy: 'gentle' }),
          createAmountSubStep({ id: 'alc-lentejas-3', text: 'Prueba el punto y reserva.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
      createStep({
        id: 'alc-arroz',
        title: 'Arroz y sofrito',
        subSteps: [
          createTimerSubStep({ id: 'alc-arroz-1', text: 'Precalienta la olla del arroz.', durationSeconds: 120, scalingPolicy: 'fixed' }),
          createTimerSubStep({ id: 'alc-arroz-2', text: 'Sofríe cebolla y ajo.', durationSeconds: 240, scalingPolicy: 'gentle' }),
          createTimerSubStep({ id: 'alc-arroz-3', text: 'Nacara el arroz.', durationSeconds: 120, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'alc-integrar',
        title: 'Integrar y cerrar',
        subSteps: [
          createAmountSubStep({ id: 'alc-integrar-1', text: 'Une arroz, lentejas y sofrito.', value: null, unit: null, amountText: 'Continuar' }),
          createAmountSubStep({ id: 'alc-integrar-2', text: 'Ajusta sal y liquido.', value: null, unit: null, amountText: 'Al gusto', scalable: false, scalingPolicy: 'non_scalable' }),
          createTimerSubStep({ id: 'alc-integrar-3', text: 'Cocina destapado unos minutos.', durationSeconds: 480, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'alc-graneado',
        title: 'Graneado',
        subSteps: [
          createAmountSubStep({ id: 'alc-graneado-1', text: 'Baja el fuego y tapa.', value: null, unit: null, amountText: 'Continuar' }),
          createTimerSubStep({ id: 'alc-graneado-2', text: 'Deja graneando a fuego bajo.', durationSeconds: 900, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'alc-servir',
        title: 'Reposo y servido',
        subSteps: [
          createTimerSubStep({ id: 'alc-servir-1', text: 'Reposa antes de servir.', durationSeconds: 300, scalingPolicy: 'fixed' }),
          createAmountSubStep({ id: 'alc-servir-2', text: 'Esponja y sirve.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(12, 69),
    experience: 'compound',
    compoundMeta: arrozLentejasCompoundMeta,
  },
  {
    id: 'tallarines-rojos-compuesto',
    name: 'Tallarines rojos coordinados',
    description: 'Demo compuesta simple para validar foco y timers largos.',
    tip: 'Usa el hervor del agua como trabajo en segundo plano mientras haces la salsa.',
    icon: '🍝',
    ingredient: 'porciones',
    categoryId: 'saludables-veggies',
    baseYield: createYield('servings', 4, 'porciones'),
    ingredients: [
      createIngredient({ id: 'pasta', name: 'Tallarines', emoji: '🍝', value: 400, unit: 'g', text: '400 g', indispensable: true }),
      createIngredient({ id: 'tomate', name: 'Tomate', emoji: '🍅', value: 5, unit: 'unidades', text: '5 tomates', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'cebolla', name: 'Cebolla', emoji: '🧅', value: 1, unit: 'unidad', text: '1 unidad', indispensable: true, scalingPolicy: 'gentle' }),
      createIngredient({ id: 'ajo', name: 'Ajo', emoji: '🧄', value: 2, unit: 'dientes', text: '2 dientes', indispensable: true, scalingPolicy: 'gentle' }),
    ],
    steps: [
      createStep({
        id: 'tr-prep',
        title: 'Preparar salsa y agua',
        subSteps: [
          createAmountSubStep({ id: 'tr-prep-1', text: 'Pica cebolla y ajo.', value: null, unit: null, amountText: 'Continuar' }),
          createTimerSubStep({ id: 'tr-prep-2', text: 'Pon el agua a calentar.', durationSeconds: 600, scalingPolicy: 'fixed' }),
        ],
      }),
      createStep({
        id: 'tr-salsa',
        title: 'Salsa roja',
        subSteps: [
          createTimerSubStep({ id: 'tr-salsa-1', text: 'Sofríe cebolla y ajo.', durationSeconds: 240, scalingPolicy: 'gentle' }),
          createAmountSubStep({ id: 'tr-salsa-2', text: 'Agrega tomate licuado.', value: null, unit: null, amountText: 'Continuar' }),
          createTimerSubStep({ id: 'tr-salsa-3', text: 'Reduce la salsa.', durationSeconds: 720, scalingPolicy: 'gentle' }),
        ],
      }),
      createStep({
        id: 'tr-pasta',
        title: 'Pasta',
        subSteps: [
          createAmountSubStep({ id: 'tr-pasta-1', text: 'Ingresa los tallarines al agua.', value: 400, unit: 'g', amountText: '400 g' }),
          createTimerSubStep({ id: 'tr-pasta-2', text: 'Cocina la pasta al dente.', durationSeconds: 660, scalingPolicy: 'fixed' }),
          createAmountSubStep({ id: 'tr-pasta-3', text: 'Escurre y reserva un poco del agua.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
      createStep({
        id: 'tr-final',
        title: 'Unir y servir',
        subSteps: [
          createAmountSubStep({ id: 'tr-final-1', text: 'Une pasta con salsa.', value: null, unit: null, amountText: 'Continuar' }),
          createTimerSubStep({ id: 'tr-final-2', text: 'Reposa un momento antes de servir.', durationSeconds: 120, scalingPolicy: 'fixed' }),
          createAmountSubStep({ id: 'tr-final-3', text: 'Sirve de inmediato.', value: null, unit: null, amountText: 'Continuar' }),
        ],
      }),
    ],
    timeSummary: createTimeSummary(10, 39),
    experience: 'compound',
    compoundMeta: tallarinesCompoundMeta,
    isCoreRecipe: true,
  },
];

export const localRecipeV2ById: Record<string, RecipeV2> = Object.fromEntries(
  localRecipesV2.map((recipe) => [recipe.id, recipe]),
);
