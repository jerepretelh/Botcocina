import type { AIRecipeContextDraft } from '../../types';
import type { AIClarificationResult, AIPreRecipe, GeneratedRecipe } from './recipeAI';
import { normalizeText } from '../utils/recipeHelpers';

export type AIMockScenarioId = 'milanesa' | 'arroz-pollo' | 'tallarines-rojos';

export interface AIMockScenario {
  id: AIMockScenarioId;
  label: string;
  triggerKeywords: string[];
  contextDraft: AIRecipeContextDraft;
  clarification: AIClarificationResult;
  preRecipe: AIPreRecipe;
  recipe: GeneratedRecipe;
}

function buildPreRecipeFromRecipe(recipe: GeneratedRecipe): AIPreRecipe {
  const resolveIngredientAmount = (ingredient: GeneratedRecipe['ingredients'][number]) =>
    ingredient.amount?.text ?? ingredient.baseValue ?? ingredient.portions?.[2] ?? 'Cantidad necesaria';

  const ingredientsLines = recipe.ingredients
    .map((ingredient) => `${ingredient.emoji ? `${ingredient.emoji} ` : ''}${resolveIngredientAmount(ingredient)} de ${ingredient.name}${ingredient.notes ? ` (${ingredient.notes})` : ''}`)
    .join('\n');
  const phasesLines = recipe.steps
    .map((step, index) => {
      const title = step.title ?? step.stepName ?? `Paso ${index + 1}`;
      const actionLines = step.subSteps
        .map((subStep) => {
          const text = subStep.text ?? subStep.subStepName ?? 'Continuar';
          const notes = subStep.notes ? `\n👉 ${subStep.notes}` : '';
          const timerText =
            subStep.timer?.durationSeconds != null
              ? `\n⏱️ ${Math.max(1, Math.round(subStep.timer.durationSeconds / 60))} min aprox.`
              : typeof subStep.portions?.[2] === 'number'
                ? `\n⏱️ ${Math.max(1, Math.round(subStep.portions[2] / 60))} min aprox.`
                : '';
          return `${text}${notes}${timerText}`;
        })
        .join('\n');
      const phaseSummary = step.notes ? `\n${step.notes}\n` : '';
      return `🔪 FASE ${index + 1}: ${title}${phaseSummary}\n${actionLines}\n\n👉 Esta fase debe quedar bien encaminada antes de pasar a la siguiente.`;
    })
    .join('\n\n');
  const ingredientNames = recipe.ingredients.slice(0, 4).map((ingredient) => ingredient.name.toLowerCase());
  const introLine =
    ingredientNames.length > 0
      ? `Te propongo una prereceta bien detallada, con ingredientes claros y fases ordenadas para que cocines con mejor flujo usando ${ingredientNames.join(', ')}.`
      : 'Te propongo una prereceta bien detallada, con ingredientes claros y fases ordenadas para que cocines con mejor flujo.';

  return {
    name: recipe.name,
    icon: recipe.icon,
    description: recipe.description,
    chatResponse: `${recipe.icon} ${recipe.name}\n\n${introLine}\n\n🛒 Ingredientes\n${ingredientsLines}\n\n${phasesLines}${recipe.tip ? `\n\n💡 Claves importantes\n${recipe.tip}\n👉 Mantén el orden de las fases para que todo salga a tiempo y con buena textura.` : ''}\n\n🍽️ Cuando confirmes esta prereceta, te la convierto en receta guiada con tiempos exactos, pasos más finos y orden de ejecución completo.`,
    baseYield: recipe.baseYield ?? {
      type: 'servings',
      value: 2,
      unit: 'personas',
      label: '2 personas',
    },
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      emoji: ingredient.emoji,
      amountText: resolveIngredientAmount(ingredient),
      notes: ingredient.notes ?? null,
    })),
    phases: recipe.steps.map((step, index) => ({
      title: `FASE ${index + 1}: ${step.title ?? step.stepName ?? 'Paso'}`,
      summary: step.notes ?? null,
      actions: step.subSteps.map((subStep) => subStep.text ?? subStep.subStepName ?? 'Continuar'),
    })),
    tips: recipe.tip ? [recipe.tip] : [],
    importantNotes: [],
  };
}

const milanesaScenario: AIMockScenario = {
  id: 'milanesa',
  label: 'Milanesa',
  triggerKeywords: ['milanesa', 'milanesas'],
  contextDraft: {
    prompt: 'Quiero preparar una milanesa crocante para el almuerzo.',
    servings: 2,
    availableIngredients: [
      { id: 'avail-pollo', value: 'Pechuga de pollo' },
      { id: 'avail-pan', value: 'Pan rallado' },
      { id: 'avail-huevo', value: 'Huevos' },
    ],
    avoidIngredients: [],
  },
  clarification: {
    needsClarification: true,
    suggestedTitle: 'Milanesa crocante casera',
    tip: 'Si la haces en air fryer, rocía una capa ligera de aceite para dorar mejor el empanizado.',
    questions: [
      {
        id: 'tipo_proteina',
        question: '¿Qué proteína prefieres para la milanesa?',
        type: 'single_choice',
        required: true,
        options: ['Pollo', 'Carne vacuna', 'Cerdo', 'Soja / Veggie'],
      },
      {
        id: 'metodo_coccion',
        question: '¿Cómo quieres cocinarla?',
        type: 'single_choice',
        required: true,
        options: ['Frita', 'Horno', 'Air Fryer'],
      },
      {
        id: 'acompanamiento',
        question: '¿Con qué quieres acompañarla?',
        type: 'text',
        required: false,
      },
    ],
  },
  preRecipe: {} as AIPreRecipe,
  recipe: {
    name: 'Milanesa crocante de pollo',
    icon: '🍗',
    ingredient: 'milanesas',
    description: '5 pasos · 28 min aprox.',
    tip: 'Deja reposar el empanizado 5 minutos antes de freír para que no se desprenda.',
    portionLabels: { singular: 'milanesa', plural: 'milanesas' },
    ingredients: [
      { name: 'Pechuga de pollo', emoji: '🍗', indispensable: true, portions: { 1: '1 filete', 2: '2 filetes', 4: '4 filetes' } },
      { name: 'Huevos', emoji: '🥚', indispensable: true, portions: { 1: '1 unidad', 2: '2 unidades', 4: '3 unidades' } },
      { name: 'Pan rallado', emoji: '🍞', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
      { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
      { name: 'Pimienta', emoji: '🌶️', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
      { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: 'Cantidad necesaria', 2: 'Cantidad necesaria', 4: 'Cantidad necesaria' } },
    ],
    steps: [
      {
        stepNumber: 1,
        stepName: 'Mise en place',
        fireLevel: 'low',
        subSteps: [
          { subStepName: 'Aplana y sazona', notes: 'Golpea suavemente el pollo y condimenta con sal y pimienta.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Prepara el empanizado', notes: 'Bate los huevos y coloca el pan rallado en otro plato.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Precalentado',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Calienta la sartén', notes: 'Precalienta a fuego medio antes de agregar aceite.', portions: { 1: 45, 2: 50, 4: 60 }, isTimer: true },
        ],
      },
      {
        stepNumber: 3,
        stepName: 'Calentar aceite',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Añade aceite', notes: 'Cubre la base de la sartén con una capa pareja.', portions: { 1: 30, 2: 35, 4: 40 }, isTimer: true },
        ],
      },
      {
        stepNumber: 4,
        stepName: 'Empanizar',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Pasa por huevo', notes: 'Cubre bien cada filete.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Cubre con pan rallado', notes: 'Presiona para que el empanizado quede firme.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
      {
        stepNumber: 5,
        stepName: 'Cocinar',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Dora el primer lado', notes: 'Coloca la milanesa y deja que se selle.', portions: { 1: 180, 2: 200, 4: 220 }, isTimer: true },
          { subStepName: 'Recordatorio: voltear', notes: 'Da la vuelta con cuidado para no romper el empanizado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Dora el segundo lado', notes: 'Cocina hasta que quede bien crocante.', portions: { 1: 150, 2: 170, 4: 190 }, isTimer: true },
        ],
      },
    ],
  },
};
milanesaScenario.preRecipe = buildPreRecipeFromRecipe(milanesaScenario.recipe);

const arrozPolloScenario: AIMockScenario = {
  id: 'arroz-pollo',
  label: 'Arroz con pollo',
  triggerKeywords: ['arroz con pollo', 'arroz pollo'],
  contextDraft: {
    prompt: 'Quiero un arroz con pollo casero y rendidor.',
    servings: 4,
    availableIngredients: [
      { id: 'avail-arroz', value: 'Arroz' },
      { id: 'avail-pollo', value: 'Pollo' },
      { id: 'avail-arvejas', value: 'Arvejas' },
    ],
    avoidIngredients: [],
  },
  clarification: {
    needsClarification: true,
    suggestedTitle: 'Arroz con pollo de olla',
    tip: 'Licuar culantro con un poco de caldo ayuda a repartir mejor el color y el aroma.',
    questions: [
      { id: 'pieza_pollo', question: '¿Qué pieza de pollo usarás?', type: 'single_choice', required: true, options: ['Pierna', 'Encuentro', 'Pechuga', 'Mixto'] },
      { id: 'cantidad_base', question: '¿Para cuántas personas quieres cocinar?', type: 'number', required: true, min: 2, max: 8, step: 1, unit: 'personas' },
      { id: 'extra_sabor', question: '¿Quieres agregar alguna guarnición o toque final?', type: 'text', required: false },
    ],
  },
  preRecipe: {} as AIPreRecipe,
  recipe: {
    name: 'Arroz con pollo casero',
    icon: '🍚',
    ingredient: 'arroz con pollo',
    description: '6 pasos · 42 min aprox.',
    tip: 'Deja reposar el arroz tapado unos minutos antes de servir para que termine de absorber el vapor.',
    portionLabels: { singular: 'plato', plural: 'platos' },
    ingredients: [
      { name: 'Pollo', emoji: '🍗', indispensable: true, portions: { 1: '250 g', 2: '500 g', 4: '1 kg' } },
      { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '3/4 taza', 2: '1 1/2 tazas', 4: '3 tazas' } },
      { name: 'Culantro', emoji: '🌿', indispensable: true, portions: { 1: '1/4 taza', 2: '1/2 taza', 4: '1 taza' } },
      { name: 'Arvejas', emoji: '🟢', indispensable: false, portions: { 1: '2 cdas', 2: '1/4 taza', 4: '1/2 taza' } },
    ],
    steps: [
      { stepNumber: 1, stepName: 'Preparar base', fireLevel: 'medium', subSteps: [{ subStepName: 'Pica y licúa', notes: 'Licúa culantro con un poco de agua y pica cebolla.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false }] },
      { stepNumber: 2, stepName: 'Sellar pollo', fireLevel: 'medium', subSteps: [{ subStepName: 'Dora el pollo', notes: 'Sella por ambos lados.', portions: { 1: 180, 2: 220, 4: 260 }, isTimer: true }] },
      { stepNumber: 3, stepName: 'Aderezo', fireLevel: 'medium', subSteps: [{ subStepName: 'Sofríe cebolla', notes: 'Añade ajo y luego el culantro licuado.', portions: { 1: 240, 2: 280, 4: 320 }, isTimer: true }] },
      { stepNumber: 4, stepName: 'Cocción del arroz', fireLevel: 'medium', subSteps: [{ subStepName: 'Añade arroz y caldo', notes: 'Integra el pollo y ajusta sal.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false }] },
      { stepNumber: 5, stepName: 'Tapar', fireLevel: 'low', subSteps: [{ subStepName: 'Cocina tapado', notes: 'No destapes antes de tiempo.', portions: { 1: 900, 2: 1020, 4: 1140 }, isTimer: true }] },
      { stepNumber: 6, stepName: 'Reposo', fireLevel: 'low', subSteps: [{ subStepName: 'Reposar y servir', notes: 'Esponja con tenedor y sirve.', portions: { 1: 180, 2: 180, 4: 240 }, isTimer: true }] },
    ],
  },
};
arrozPolloScenario.preRecipe = buildPreRecipeFromRecipe(arrozPolloScenario.recipe);

const tallarinesRojosScenario: AIMockScenario = {
  id: 'tallarines-rojos',
  label: 'Tallarines rojos',
  triggerKeywords: ['tallarines rojos', 'tallarines rojos compuestos', 'tallarines con salsa'],
  contextDraft: {
    prompt: 'Quiero tallarines rojos con salsa y pasta en paralelo.',
    servings: 4,
    availableIngredients: [
      { id: 'avail-pasta', value: 'Tallarines' },
      { id: 'avail-tomate', value: 'Tomate' },
      { id: 'avail-queso', value: 'Queso rallado' },
    ],
    avoidIngredients: [],
  },
  clarification: {
    needsClarification: false,
    suggestedTitle: 'Tallarines rojos compuestos',
    tip: 'Coordina la reducción de la salsa mientras hierve la pasta para cerrar ambos frentes casi al mismo tiempo.',
    questions: [],
  },
  preRecipe: {} as AIPreRecipe,
  recipe: {
    name: 'Tallarines rojos compuestos',
    icon: '🍝',
    ingredient: 'tallarines rojos',
    description: '6 pasos · 40 min aprox.',
    tip: 'Guarda un poco del agua de la pasta para ajustar la salsa al final.',
    experience: 'compound',
    compoundMeta: {
      components: [
        { id: 'salsa', name: 'Salsa', icon: '🍅', summary: 'Base roja y reducción' },
        { id: 'pasta', name: 'Pasta', icon: '🍝', summary: 'Agua, cocción y escurrido' },
      ],
      timeline: [
        { id: 'tr-salsa-sofrito', componentId: 'salsa', stepIndex: 0, subStepIndex: 0 },
        { id: 'tr-salsa-reducir', componentId: 'salsa', stepIndex: 0, subStepIndex: 1, timerLabel: 'Reducción de salsa', autoAdvanceOnStart: true, backgroundHint: 'La salsa ya está reduciendo. Continúa con la pasta.', completionMessage: 'La reducción de salsa ya quedó lista.' },
        { id: 'tr-pasta-hervir', componentId: 'pasta', stepIndex: 1, subStepIndex: 0, timerLabel: 'Agua para pasta', autoAdvanceOnStart: true, backgroundHint: 'El agua está calentando. Ve preparando el siguiente frente.', completionMessage: 'El agua ya está lista para la pasta.' },
        { id: 'tr-pasta-escurrir', componentId: 'pasta', stepIndex: 1, subStepIndex: 1, completionMessage: 'La pasta ya quedó lista para integrar con la salsa.' },
      ],
    },
    portionLabels: { singular: 'plato', plural: 'platos' },
    ingredients: [
      { name: 'Tallarines', emoji: '🍝', indispensable: true, portions: { 1: '100 g', 2: '200 g', 4: '400 g' } },
      { name: 'Tomate', emoji: '🍅', indispensable: true, portions: { 1: '2 unidades', 2: '4 unidades', 4: '8 unidades' } },
      { name: 'Queso rallado', emoji: '🧀', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
    ],
    steps: [
      {
        stepNumber: 1,
        stepName: 'Preparar salsa',
        fireLevel: 'medium',
        subSteps: [
          { subStepName: 'Sofríe cebolla para la salsa', notes: 'Reserva por separado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
          { subStepName: 'Reducir salsa de tomate', notes: 'Mientras tanto avanza con la pasta.', portions: { 1: 480, 2: 540, 4: 600 }, isTimer: true },
        ],
      },
      {
        stepNumber: 2,
        stepName: 'Cocer pasta',
        fireLevel: 'high',
        subSteps: [
          { subStepName: 'Hervir agua para pasta', notes: 'En otra olla.', portions: { 1: 420, 2: 480, 4: 540 }, isTimer: true },
          { subStepName: 'Escurrir tallarines', notes: 'Reserva un poco del agua e integra al final.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
        ],
      },
    ],
  },
};
tallarinesRojosScenario.preRecipe = buildPreRecipeFromRecipe(tallarinesRojosScenario.recipe);

const SCENARIOS: AIMockScenario[] = [milanesaScenario, arrozPolloScenario, tallarinesRojosScenario];

export function isAIMockModeEnabled(): boolean {
  return import.meta.env.DEV || (import.meta.env.VITE_AI_MOCK_MODE ?? 'false').trim().toLowerCase() === 'true';
}

export function getAIMockScenario(id: AIMockScenarioId): AIMockScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

export function getDefaultAIMockScenario(): AIMockScenario {
  return milanesaScenario;
}

export function findAIMockScenarioForPrompt(prompt: string): AIMockScenario | null {
  const normalized = normalizeText(prompt);
  if (!normalized) return null;
  return SCENARIOS.find((scenario) => scenario.triggerKeywords.some((keyword) => normalized.includes(normalizeText(keyword)))) ?? null;
}
