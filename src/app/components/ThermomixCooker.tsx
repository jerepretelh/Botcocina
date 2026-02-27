import { useState, useEffect, useRef } from 'react';
import { ChefHat, Lock, Volume2, VolumeX, UtensilsCrossed } from 'lucide-react';
import {
  generateRecipeWithAI,
  requestRecipeClarificationWithAI,
  type AIClarificationQuestion,
  type GeneratedRecipe,
} from '../lib/recipeAI';

type Screen = 'category-select' | 'recipe-select' | 'ai-clarify' | 'recipe-setup' | 'ingredients' | 'cooking';
type Portion = 1 | 2 | 4;
type RecipeCategoryId = 'frituras' | 'arroces' | 'hervidos' | 'sopas' | 'personalizadas';
type QuantityMode = 'people' | 'have';
type AmountUnit = 'units' | 'grams';
type ClarificationNumberMode = 'people' | 'quantity';
type ClarificationQuantityUnit = 'units' | 'grams';
const APP_VERSION = `v${__APP_VERSION__}`;

interface RecipeCategory {
  id: RecipeCategoryId;
  name: string;
  icon: string;
  description: string;
}

interface Recipe {
  id: string;
  categoryId: RecipeCategoryId;
  name: string;
  icon: string;
  ingredient: string;
  description: string;
}

interface SubStep {
  subStepName: string;
  notes: string;
  portions: {
    1: string | number;
    2: string | number;
    4: string | number;
  };
  isTimer: boolean;
}

interface RecipeStep {
  stepNumber: number;
  stepName: string;
  fireLevel?: 'low' | 'medium' | 'high';
  subSteps: SubStep[];
}

interface RecipeContent {
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tip: string;
  portionLabels: {
    singular: string;
    plural: string;
  };
}

interface StepLoopState {
  stepIndex: number;
  totalItems: number;
  currentItem: number;
}

interface FaceTimerPair {
  firstIndex: number;
  secondIndex: number;
  firstSeconds: number;
  secondSeconds: number;
}

const recipes: Recipe[] = [
  {
    id: 'arroz',
    categoryId: 'arroces',
    name: 'Arroz Perfecto',
    icon: '🍚',
    ingredient: 'Tazas de arroz',
    description: '6 pasos · 45-60 min',
  },
  {
    id: 'arroz-ajo',
    categoryId: 'arroces',
    name: 'Arroz al ajo',
    icon: '🧄',
    ingredient: 'Tazas de arroz',
    description: '5 pasos · 30-40 min',
  },
  {
    id: 'huevo-frito',
    categoryId: 'frituras',
    name: 'Huevo frito',
    icon: '🍳',
    ingredient: 'Huevos',
    description: '5 pasos · automático',
  },
  {
    id: 'papas-fritas',
    categoryId: 'frituras',
    name: 'Papas fritas',
    icon: '🍟',
    ingredient: 'Papas',
    description: 'Movimiento guiado · 7-9 min',
  },
  {
    id: 'huevo-sancochado',
    categoryId: 'hervidos',
    name: 'Huevo sancochado',
    icon: '🥚',
    ingredient: 'Huevos',
    description: '4 pasos · 12-15 min',
  },
  {
    id: 'sopa-verduras',
    categoryId: 'sopas',
    name: 'Sopa de verduras',
    icon: '🥣',
    ingredient: 'Porciones',
    description: '6 pasos · 30-40 min',
  },
];

const recipeCategories: RecipeCategory[] = [
  { id: 'frituras', name: 'Frituras', icon: '🍳', description: 'Huevo, papas y sartén fuerte' },
  { id: 'arroces', name: 'Arroces', icon: '🍚', description: 'Arroces sueltos y aromáticos' },
  { id: 'hervidos', name: 'Hervidos', icon: '🍲', description: 'Sancochados y cocción en agua' },
  { id: 'sopas', name: 'Sopas', icon: '🥣', description: 'Caldos y sopas ligeras' },
  { id: 'personalizadas', name: 'Personalizadas', icon: '✨', description: 'Recetas creadas con IA' },
];

interface Ingredient {
  name: string;
  emoji: string;
  indispensable?: boolean;
  portions: {
    1: string;
    2: string;
    4: string;
  };
}

const arrozIngredients: Ingredient[] = [
  {
    name: 'Arroz',
    emoji: '🍚',
    indispensable: true,
    portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' },
  },
  {
    name: 'Agua',
    emoji: '💧',
    indispensable: true,
    portions: { 1: '1 ½ tazas', 2: '3 tazas', 4: '5 ½ tazas' },
  },
  {
    name: 'Aceite',
    emoji: '🫒',
    indispensable: true,
    portions: { 1: '1-2 cdtas', 2: '1 cda', 4: '2 cdas' },
  },
  {
    name: 'Ajo picado',
    emoji: '🧄',
    indispensable: false,
    portions: { 1: '1-2 cdtas', 2: '1 cda', 4: '2 cdas' },
  },
  {
    name: 'Sal',
    emoji: '🧂',
    indispensable: false,
    portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' },
  },
];

const huevoFritoIngredients: Ingredient[] = [
  {
    name: 'Huevos',
    emoji: '🥚',
    indispensable: true,
    portions: { 1: '1 huevo', 2: '2 huevos', 4: '4 huevos' },
  },
  {
    name: 'Aceite',
    emoji: '🫒',
    indispensable: true,
    portions: { 1: '2 cdas', 2: '3 cdas', 4: '4 cdas' },
  },
  {
    name: 'Sal',
    emoji: '🧂',
    indispensable: false,
    portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' },
  },
];

const arrozRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Precalentado',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Colocar olla a fuego medio alto',
        notes: 'Usa una olla con buen fondo para calor uniforme.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Precalentando...',
        notes: 'La olla debe estar bien seca antes del aceite.',
        portions: { 1: 60, 2: 90, 4: 120 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Calentar aceite',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Agregar aceite',
        notes: 'Cantidad:',
        portions: { 1: '1-2 cdtas', 2: '1 cda', 4: '2 cdas' },
        isTimer: false,
      },
      {
        subStepName: 'Calentando aceite...',
        notes: 'El aceite debe estar fluido, no humeando.',
        portions: { 1: 40, 2: 50, 4: 60 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Sofreír ajo',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Agregar ajo',
        notes: 'Cantidad:',
        portions: { 1: '1-2 cdtas', 2: '1 cda', 4: '2 cdas' },
        isTimer: false,
      },
      {
        subStepName: 'Friendo...',
        notes: 'Mueve el ajo para que no se amargue.',
        portions: { 1: 60, 2: 60, 4: 80 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Cocción',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Agregar el arroz',
        notes: 'Cantidad:',
        portions: { 1: '1 Taza', 2: '2 Tazas', 4: '4 Tazas' },
        isTimer: false,
      },
      {
        subStepName: 'Echa el arroz y revuelve',
        notes: 'Mezcla hasta que el grano brille (Nacarado).',
        portions: { 1: 60, 2: 90, 4: 120 },
        isTimer: true,
      },
      {
        subStepName: 'Agregar agua',
        notes: 'Cantidad (Agua):',
        portions: { 1: '1 ½ Tazas', 2: '3 Tazas', 4: '5 ½ Tazas' },
        isTimer: false,
      },
      {
        subStepName: 'Agregar sal y remover',
        notes: 'Prueba el agua; debe estar algo salada.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Cocinando (seca agua)',
        notes: 'Sin tapa. Hasta ver "huequitos" arriba.',
        portions: { 1: 380, 2: 540, 4: 840 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 5,
    stepName: 'Graneado',
    fireLevel: 'low',
    subSteps: [
      {
        subStepName: 'Baja el fuego',
        notes: 'Fuego al mínimo absoluto (fuego corona).',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Mueve el arroz',
        notes: 'Usa tenedor para airear de abajo hacia arriba.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Pon la tapa',
        notes: 'El vapor termina la cocción del centro.',
        portions: { 1: 960, 2: 1080, 4: 1200 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 6,
    stepName: 'Asentando',
    fireLevel: 'low',
    subSteps: [
      {
        subStepName: 'Apagar el fuego',
        notes: 'Vital para que el arroz no esté pegajoso.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Terminando',
        notes: 'No destapes. Deja que el calor estabilice.',
        portions: { 1: 300, 2: 420, 4: 600 },
        isTimer: true,
      },
    ],
  },
];

const huevoFritoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Precalentado',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Precalentar sartén',
        notes: 'Usa sartén antiadherente a fuego medio.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Precalentando...',
        notes: 'La sartén debe quedar bien caliente.',
        portions: { 1: 45, 2: 55, 4: 65 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Calentar aceite',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Agregar aceite',
        notes: 'Cantidad:',
        portions: { 1: '2 cdas', 2: '3 cdas', 4: '4 cdas' },
        isTimer: false,
      },
      {
        subStepName: 'Calentando aceite...',
        notes: 'Debe estar caliente sin humear.',
        portions: { 1: 25, 2: 35, 4: 45 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Freír huevo 1',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Incorporar el primer huevo',
        notes: 'Rompe el huevo con cuidado.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Dorar el primer lado',
        notes: 'Cocina por el primer lado. El recordatorio indicará cuándo girar.',
        portions: { 1: 10, 2: 10, 4: 10 },
        isTimer: true,
      },
      {
        subStepName: 'Voltear y dorar el reverso',
        notes: 'Después del giro, termina la cocción del lado B.',
        portions: { 1: 10, 2: 10, 4: 10 },
        isTimer: true,
      },
      {
        subStepName: 'Retirar huevo 1',
        notes: 'Lleva al plato y mantenlo tibio.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Freír huevo 2',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Dorar el primer lado',
        notes: 'Cocina por el primer lado. El recordatorio indicará cuándo girar.',
        portions: { 1: 10, 2: 10, 4: 10 },
        isTimer: true,
      },
      {
        subStepName: 'Voltear y dorar el reverso',
        notes: 'Después del giro, termina la cocción del lado B.',
        portions: { 1: 10, 2: 10, 4: 10 },
        isTimer: true,
      },
      {
        subStepName: 'Retirar huevo 2',
        notes: 'Lleva al plato para servir.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
  {
    stepNumber: 5,
    stepName: 'Finalizar',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Servir huevos',
        notes: 'Apaga el fuego, agrega sal y sirve.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
];

const papasFritasIngredients: Ingredient[] = [
  {
    name: 'Papas',
    emoji: '🥔',
    indispensable: true,
    portions: { 1: '1 papa grande', 2: '2 papas', 4: '4 papas' },
  },
  {
    name: 'Aceite',
    emoji: '🫒',
    indispensable: true,
    portions: { 1: '2 cdas', 2: '4 cdas', 4: '8 cdas' },
  },
  {
    name: 'Sal',
    emoji: '🧂',
    indispensable: false,
    portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' },
  },
];

const papasFritasRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Preparación',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Cortar las papas en bastones',
        notes: 'Haz cortes parejos para que se cocinen uniforme.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Secar y salar ligeramente',
        notes: 'Retira humedad para que queden crocantes.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Precalentar aceite',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Calentar aceite',
        notes: 'Aceite caliente sin humear.',
        portions: { 1: 40, 2: 50, 4: 60 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Cocción',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Incorporar papas',
        notes: 'Muévelas apenas entren para que no se peguen entre sí ni al fondo.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Dorar primer tramo',
        notes: 'Comienza la fritura hasta un dorado ligero.',
        portions: { 1: 75, 2: 90, 4: 120 },
        isTimer: true,
      },
      {
        subStepName: 'Dorar segundo tramo',
        notes: 'Tras moverlas, continúa hasta color más parejo.',
        portions: { 1: 75, 2: 90, 4: 120 },
        isTimer: true,
      },
      {
        subStepName: 'Crocancia final',
        notes: 'Último tramo corto para lograr textura crujiente.',
        portions: { 1: 40, 2: 50, 4: 60 },
        isTimer: true,
      },
      {
        subStepName: 'Tanda completada',
        notes: 'Retira, escurre y prepárate para la siguiente tanda.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
];

const arrozAjoIngredients: Ingredient[] = [
  { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  { name: 'Ajo picado', emoji: '🧄', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '1 ½ tazas', 2: '3 tazas', 4: '5 ½ tazas' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

const arrozAjoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Precalentado',
    fireLevel: 'high',
    subSteps: [
      { subStepName: 'Precalentar olla', notes: 'Fuego medio alto.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Precalentando...', notes: 'Olla seca y caliente.', portions: { 1: 50, 2: 70, 4: 90 }, isTimer: true },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Calentar aceite',
    fireLevel: 'high',
    subSteps: [
      { subStepName: 'Agregar aceite', notes: 'Cantidad indicada.', portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' }, isTimer: false },
      { subStepName: 'Calentando aceite...', notes: 'Sin humear.', portions: { 1: 35, 2: 45, 4: 55 }, isTimer: true },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Dorar ajo',
    fireLevel: 'medium',
    subSteps: [
      { subStepName: 'Agregar ajo', notes: 'Remueve constantemente.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Dorar ajo', notes: 'Aroma intenso, sin quemar.', portions: { 1: 45, 2: 55, 4: 70 }, isTimer: true },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Cocción',
    fireLevel: 'high',
    subSteps: [
      { subStepName: 'Agregar arroz y nacarar', notes: 'Mover para sellar el grano.', portions: { 1: 70, 2: 90, 4: 120 }, isTimer: true },
      { subStepName: 'Agregar agua y sal', notes: 'Ajusta al gusto.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Secar agua', notes: 'Sin tapa.', portions: { 1: 360, 2: 520, 4: 780 }, isTimer: true },
    ],
  },
  {
    stepNumber: 5,
    stepName: 'Reposo',
    fireLevel: 'low',
    subSteps: [
      { subStepName: 'Tapar y reposar', notes: 'Fuego mínimo.', portions: { 1: 420, 2: 540, 4: 720 }, isTimer: true },
      { subStepName: 'Apagar y servir', notes: 'Esponjar con tenedor.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ],
  },
];

const huevoSancochadoIngredients: Ingredient[] = [
  { name: 'Huevos', emoji: '🥚', indispensable: true, portions: { 1: '1 huevo', 2: '2 huevos', 4: '4 huevos' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '500 ml', 2: '700 ml', 4: '1 L' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Pizca', 2: 'Pizca', 4: 'Pizca' } },
];

const huevoSancochadoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Hervir agua',
    fireLevel: 'high',
    subSteps: [
      { subStepName: 'Agregar agua a la olla', notes: 'Cubre por completo los huevos.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Llevar a ebullición', notes: 'Agua burbujeando.', portions: { 1: 240, 2: 300, 4: 360 }, isTimer: true },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Cocción',
    fireLevel: 'medium',
    subSteps: [
      { subStepName: 'Añadir huevos con cuidado', notes: 'Usa cuchara para no romper.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar huevos', notes: 'Para yema semidura.', portions: { 1: 540, 2: 540, 4: 540 }, isTimer: true },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Enfriado',
    fireLevel: 'low',
    subSteps: [
      { subStepName: 'Pasar a agua fría', notes: 'Detén cocción.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Reposar en agua fría', notes: 'Facilita pelado.', portions: { 1: 120, 2: 120, 4: 120 }, isTimer: true },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Final',
    fireLevel: 'low',
    subSteps: [
      { subStepName: 'Pelar y servir', notes: 'Sazonar al gusto.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ],
  },
];

const sopaVerdurasIngredients: Ingredient[] = [
  { name: 'Verduras mixtas', emoji: '🥕', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  { name: 'Agua o caldo', emoji: '🍲', indispensable: true, portions: { 1: '2 tazas', 2: '4 tazas', 4: '8 tazas' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

const sopaVerdurasRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Precalentado',
    fireLevel: 'medium',
    subSteps: [
      { subStepName: 'Precalentar olla', notes: 'Fuego medio.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Calentar olla', notes: 'Lista para aceite.', portions: { 1: 45, 2: 55, 4: 65 }, isTimer: true },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Calentar aceite',
    fireLevel: 'medium',
    subSteps: [
      { subStepName: 'Agregar aceite', notes: 'Cantidad indicada.', portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' }, isTimer: false },
      { subStepName: 'Calentar aceite', notes: 'Sin humear.', portions: { 1: 25, 2: 30, 4: 40 }, isTimer: true },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Sofrito',
    fireLevel: 'medium',
    subSteps: [
      { subStepName: 'Agregar verduras', notes: 'Mezcla para sellar sabores.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Sofreír verduras', notes: 'Remueve constantemente.', portions: { 1: 120, 2: 150, 4: 180 }, isTimer: true },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Hervor',
    fireLevel: 'high',
    subSteps: [
      { subStepName: 'Agregar agua o caldo', notes: 'Cubre ingredientes.', portions: { 1: '2 tazas', 2: '4 tazas', 4: '8 tazas' }, isTimer: false },
      { subStepName: 'Llevar a hervor', notes: 'Burbujeo constante.', portions: { 1: 240, 2: 300, 4: 420 }, isTimer: true },
    ],
  },
  {
    stepNumber: 5,
    stepName: 'Cocción lenta',
    fireLevel: 'low',
    subSteps: [
      { subStepName: 'Bajar fuego', notes: 'Tapar parcialmente.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar hasta tiernas', notes: 'Verifica textura.', portions: { 1: 480, 2: 600, 4: 780 }, isTimer: true },
    ],
  },
  {
    stepNumber: 6,
    stepName: 'Final',
    fireLevel: 'low',
    subSteps: [
      { subStepName: 'Ajustar sal y servir', notes: 'Rectifica sazón.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ],
  },
];

const initialRecipeContent: Record<string, RecipeContent> = {
  arroz: {
    ingredients: arrozIngredients,
    steps: arrozRecipeData,
    tip: 'Prepara todos los ingredientes antes de empezar. La clave del arroz perfecto está en los tiempos de cocción, así que ten todo listo.',
    portionLabels: { singular: 'taza', plural: 'tazas' },
  },
  'huevo-frito': {
    ingredients: huevoFritoIngredients,
    steps: huevoFritoRecipeData,
    tip: 'Ten todo listo antes de empezar. El secreto está en el aceite bien caliente y no tocar el huevo mientras se cocina la primera cara.',
    portionLabels: { singular: 'huevo', plural: 'huevos' },
  },
  'papas-fritas': {
    ingredients: papasFritasIngredients,
    steps: papasFritasRecipeData,
    tip: 'No sobrecargues la sartén para mantener la temperatura del aceite.',
    portionLabels: { singular: 'papa', plural: 'papas' },
  },
  'arroz-ajo': {
    ingredients: arrozAjoIngredients,
    steps: arrozAjoRecipeData,
    tip: 'El ajo debe dorar, no quemarse. Mantén fuego medio al sofreír.',
    portionLabels: { singular: 'taza', plural: 'tazas' },
  },
  'huevo-sancochado': {
    ingredients: huevoSancochadoIngredients,
    steps: huevoSancochadoRecipeData,
    tip: 'Controla el tiempo exacto para obtener la textura de yema que prefieras.',
    portionLabels: { singular: 'huevo', plural: 'huevos' },
  },
  'sopa-verduras': {
    ingredients: sopaVerdurasIngredients,
    steps: sopaVerdurasRecipeData,
    tip: 'Corta las verduras de tamaño similar para una cocción pareja.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
};

const defaultRecipes: Recipe[] = recipes;

function buildRecipeId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

  return slug || `receta-${Date.now()}`;
}

function parseTimerSeconds(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function normalizePortionText(value: string | number | undefined): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return 'Continuar';
}

function inferPortionFromPrompt(prompt: string): Portion | null {
  const normalized = prompt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const patterns = [
    /\b(?:para|x|por)\s*(1|2|4)\b/,
    /\b(1|2|4)\s*(?:porcion|porciones|persona|personas|comensal|comensales|racion|raciones|huevo|huevos|taza|tazas)\b/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (value === 1 || value === 2 || value === 4) {
      return value;
    }
  }

  return null;
}

function inferPeopleCountFromClarifications(
  questions: AIClarificationQuestion[],
  answers: Record<string, string | number>,
  numberModes?: Record<string, ClarificationNumberMode>,
): number | null {
  if (numberModes && Object.keys(numberModes).length > 0) {
    const forcedPeopleQuestion = questions.find((question) => numberModes[question.id] === 'people');
    if (!forcedPeopleQuestion) return null;
    const forcedValue = answers[forcedPeopleQuestion.id];
    if (typeof forcedValue === 'number' && Number.isFinite(forcedValue)) {
      return clampNumber(Math.round(forcedValue), 1, 8);
    }
    if (typeof forcedValue === 'string') {
      const match = forcedValue.match(/(\d+(?:[.,]\d+)?)/);
      if (!match) return null;
      const parsed = Number.parseFloat(match[1].replace(',', '.'));
      if (!Number.isFinite(parsed)) return null;
      return clampNumber(Math.round(parsed), 1, 8);
    }
    return null;
  }

  const peopleQuestion = questions.find((question) => {
    const text = normalizeText(`${question.id} ${question.question}`);
    return (
      text.includes('persona') ||
      text.includes('personas') ||
      text.includes('porcion') ||
      text.includes('porciones') ||
      text.includes('comensal') ||
      text.includes('racion')
    );
  });

  if (!peopleQuestion) return null;
  const raw = answers[peopleQuestion.id];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return clampNumber(Math.round(raw), 1, 8);
  }
  if (typeof raw === 'string') {
    const match = raw.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return null;
    const parsed = Number.parseFloat(match[1].replace(',', '.'));
    if (!Number.isFinite(parsed)) return null;
    return clampNumber(Math.round(parsed), 1, 8);
  }
  return null;
}

function inferSizingFromClarifications(
  questions: AIClarificationQuestion[],
  answers: Record<string, string | number>,
  numberModes: Record<string, ClarificationNumberMode>,
  quantityUnits: Record<string, ClarificationQuantityUnit>,
): { quantityMode: QuantityMode; count: number; amountUnit?: AmountUnit } | null {
  const numericQuestions = questions.filter((question) => question.type === 'number');
  for (const question of numericQuestions) {
    const rawValue = answers[question.id];
    let count: number | null = null;
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      count = Math.round(rawValue);
    } else if (typeof rawValue === 'string') {
      const match = rawValue.match(/(\d+(?:[.,]\d+)?)/);
      if (match) {
        const parsed = Number.parseFloat(match[1].replace(',', '.'));
        if (Number.isFinite(parsed)) {
          count = Math.round(parsed);
        }
      }
    }
    if (!count || count < 1) continue;

    const questionText = normalizeText(`${question.id} ${question.question}`);
    const selectedMode = numberModes[question.id];
    const isPeople = selectedMode
      ? selectedMode === 'people'
      : (
        questionText.includes('persona') ||
        questionText.includes('personas') ||
        questionText.includes('porcion') ||
        questionText.includes('porciones') ||
        questionText.includes('comensal') ||
        questionText.includes('racion')
      );
    const selectedQuantityUnit = quantityUnits[question.id] ?? 'units';

    return {
      quantityMode: isPeople ? 'people' : 'have',
      count: clampNumber(count, isPeople ? 1 : (selectedQuantityUnit === 'grams' ? 50 : 1), isPeople ? 8 : (selectedQuantityUnit === 'grams' ? 5000 : 20)),
      amountUnit: isPeople ? undefined : selectedQuantityUnit,
    };
  }

  return null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeIngredientNamePeru(name: string): string {
  const value = normalizeText(name);
  if (value.includes('bell pepper') || value.includes('pimiento morron')) return 'Pimiento'
  if (value.includes('green onion') || value.includes('spring onion') || value.includes('scallion')) return 'Cebolla china'
  if (value.includes('cilantro')) return 'Culantro'
  if (value.includes('corn')) return 'Choclo'
  if (value.includes('sweet potato')) return 'Camote'
  if (value.includes('green peas')) return 'Arvejas'
  if (value.includes('potato')) return 'Papa'
  return name
}

function getIngredientKey(name: string): string {
  return normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function isLikelyDispensableIngredient(name: string): boolean {
  const normalized = normalizeText(name);
  const optionalHints = [
    'sal',
    'pimienta',
    'oregano',
    'perejil',
    'cilantro',
    'romero',
    'tomillo',
    'especia',
    'condimento',
    'aderezo',
    'salsa',
  ];
  return optionalHints.some((hint) => normalized.includes(hint));
}

function buildInitialIngredientSelection(ingredients: Ingredient[]): Record<string, boolean> {
  return ingredients.reduce<Record<string, boolean>>((acc, ingredient) => {
    acc[getIngredientKey(ingredient.name)] = true;
    return acc;
  }, {});
}

function buildCookingSteps(
  steps: RecipeStep[],
  ingredients: Ingredient[],
  selection: Record<string, boolean>,
): RecipeStep[] {
  const deselectedIngredients = ingredients.filter((ingredient) => {
    if (ingredient.indispensable) return false;
    const key = getIngredientKey(ingredient.name);
    return selection[key] === false;
  });

  if (deselectedIngredients.length === 0) {
    return steps;
  }

  const deselectedTerms = deselectedIngredients.map((ingredient) => normalizeText(ingredient.name));

  const filteredSteps = steps
    .map((step) => {
      const filteredSubSteps = step.subSteps.filter((subStep) => {
        const haystack = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
        return !deselectedTerms.some((term) => term.length >= 3 && haystack.includes(term));
      });

      return {
        ...step,
        subSteps: filteredSubSteps,
      };
    })
    .filter((step) => step.subSteps.length > 0)
    .map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));

  return filteredSteps.length > 0 ? filteredSteps : steps;
}

function fireLevelLabel(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') return 'bajo';
  if (level === 'high') return 'alto';
  return 'medio';
}

function ensureFireTransitionSubSteps(steps: RecipeStep[]): RecipeStep[] {
  return steps.map((step, index) => {
    if (index === 0) return step;

    const previousLevel = steps[index - 1]?.fireLevel ?? 'medium';
    const currentLevel = step.fireLevel ?? 'medium';
    if (previousLevel === currentLevel) return step;

    const alreadyDeclared = step.subSteps.some((subStep) => {
      const text = normalizeText(`${subStep?.subStepName ?? ''} ${subStep?.notes ?? ''}`);
      const hasFireWord = text.includes('fuego');
      const hasAdjustmentVerb =
        text.includes('baja') ||
        text.includes('bajar') ||
        text.includes('sube') ||
        text.includes('subir') ||
        text.includes('ajusta') ||
        text.includes('ajustar');
      return hasFireWord && hasAdjustmentVerb;
    });
    if (alreadyDeclared) return step;

    const action = currentLevel === 'low' ? 'Bajar fuego' : 'Subir fuego';
    const transitionSubStep: SubStep = {
      subStepName: `${action} a ${fireLevelLabel(currentLevel)}`,
      notes: `Ajusta de ${fireLevelLabel(previousLevel)} a ${fireLevelLabel(currentLevel)} para este paso.`,
      portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
      isTimer: false,
    };

    return {
      ...step,
      subSteps: [transitionSubStep, ...step.subSteps],
    };
  });
}

function buildEggFrySteps(eggCount: number): RecipeStep[] {
  const safeEggCount = clampNumber(Math.round(eggCount), 1, 8);
  const initialOil = safeEggCount >= 4 ? '2 cdas' : '1 cda';
  const prepSteps = huevoFritoRecipeData.slice(0, 2).map((step, index) => {
    if (index !== 1) return step;
    return {
      ...step,
      subSteps: step.subSteps.map((subStep) => {
        const subText = normalizeText(subStep.subStepName);
        if (!subText.includes('agregar aceite')) return subStep;
        return {
          ...subStep,
          notes: 'Usa aceite inicial para cocinar varias tandas. Luego solo corrige si hace falta.',
          portions: { 1: initialOil, 2: initialOil, 4: initialOil },
        };
      }),
    };
  });
  const finalStepTemplate = huevoFritoRecipeData[huevoFritoRecipeData.length - 1];

  const frySteps: RecipeStep[] = Array.from({ length: safeEggCount }, (_, index) => {
    const unit = index + 1;
    return {
      stepNumber: prepSteps.length + unit,
      stepName: `Freír huevo ${unit}`,
      fireLevel: 'medium',
      subSteps: [
        ...(unit === 1
          ? []
          : [
            {
              subStepName: 'Revisar aceite para la siguiente tanda',
              notes: 'Si la sartén está seca, agrega 1/2 cda. Si aún hay aceite, continúa.',
              portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
              isTimer: false as const,
            },
          ]),
        {
          subStepName: unit === 1 ? 'Incorporar el primer huevo' : `Incorporar huevo ${unit}`,
          notes: 'Rompe el huevo con cuidado.',
          portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
          isTimer: false,
        },
        {
          subStepName: 'Dorar el primer lado',
          notes: 'Cocina por el primer lado. El recordatorio indicará cuándo girar.',
          portions: { 1: 10, 2: 10, 4: 10 },
          isTimer: true,
        },
        {
          subStepName: 'Voltear y dorar el reverso',
          notes: 'Después del giro, termina la cocción del lado B.',
          portions: { 1: 10, 2: 10, 4: 10 },
          isTimer: true,
        },
        {
          subStepName: `Retirar huevo ${unit}`,
          notes: unit < safeEggCount ? 'Lleva al plato y prepárate para el siguiente.' : 'Lleva al plato para servir.',
          portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
          isTimer: false,
        },
      ],
    };
  });

  const finalStep: RecipeStep = {
    ...finalStepTemplate,
    stepNumber: prepSteps.length + frySteps.length + 1,
  };

  return [...prepSteps, ...frySteps, finalStep];
}

function mapCountToPortion(value: number): Portion {
  if (value <= 1) return 1;
  if (value <= 3) return 2;
  return 4;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function applyTimerScale(steps: RecipeStep[], factor: number): RecipeStep[] {
  if (Math.abs(factor - 1) < 0.01) return steps;
  return steps.map((step) => ({
    ...step,
    subSteps: step.subSteps.map((subStep) => {
      if (!subStep.isTimer) return subStep;
      return {
        ...subStep,
        portions: {
          1: Math.max(1, Math.round(Number(subStep.portions[1]) * factor)),
          2: Math.max(1, Math.round(Number(subStep.portions[2]) * factor)),
          4: Math.max(1, Math.round(Number(subStep.portions[4]) * factor)),
        },
      };
    }),
  }));
}

function parseFirstNumber(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildBatchUsageTips(ingredients: Ingredient[], portion: Portion, batches: number): string[] {
  if (batches <= 1) return [];

  const tips: string[] = [];
  for (const ingredient of ingredients) {
    const ingredientText = normalizeText(ingredient.name);
    if (!ingredientText.includes('aceite') && !ingredientText.includes('mantequilla')) continue;

    const raw = normalizePortionText(ingredient.portions[portion]);
    const total = parseFirstNumber(raw);
    if (!total) continue;

    let unit = 'porción';
    if (raw.includes('cda') || raw.includes('cucharada')) unit = raw.includes('cucharada') ? 'cucharada' : 'cda';
    else if (raw.includes('cdta') || raw.includes('cucharadita')) unit = raw.includes('cucharadita') ? 'cucharadita' : 'cdta';

    const perBatch = Math.max(0.25, Math.round((total / batches) * 4) / 4);
    tips.push(`${ingredient.name}: usa aprox. ${perBatch} ${unit}${perBatch === 1 ? '' : 's'} por tanda (no todo al inicio).`);
  }
  return tips;
}

function removeRedundantEggInsertSubStep(steps: RecipeStep[], recipeId: string | undefined): RecipeStep[] {
  if (recipeId !== 'huevo-frito') return steps;

  return steps.map((step) => {
    const stepName = normalizeText(step.stepName);
    if (!stepName.includes('freir huevo 2')) return step;

    const sanitizedSubSteps = step.subSteps.filter((subStep) => {
      const subName = normalizeText(subStep.subStepName);
      return !subName.includes('agregar huevo 2');
    });

    return {
      ...step,
      subSteps: sanitizedSubSteps.length > 0 ? sanitizedSubSteps : step.subSteps,
    };
  });
}

function splitIngredientQuantity(value: string): { main: string; detail: string | null } {
  const trimmed = value.trim();
  const parenMatch = trimmed.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    return {
      main: parenMatch[1].trim(),
      detail: `(${parenMatch[2].trim()})`,
    };
  }

  const separatorMatch = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (separatorMatch && separatorMatch[1].length <= 24) {
    return {
      main: separatorMatch[1].trim(),
      detail: separatorMatch[2].trim(),
    };
  }

  return { main: trimmed, detail: null };
}

function parseUnitCount(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 2 || rounded > 12) return null;
  return rounded;
}

function getLoopItemCount(ingredients: Ingredient[], portion: Portion): number {
  const candidates = ingredients.filter((ingredient) => ingredient.indispensable !== false);
  for (const ingredient of candidates) {
    const count = parseUnitCount(ingredient.portions[portion]);
    if (count && count > 1) {
      return count;
    }
  }
  return 1;
}

function isLoopableStep(step: RecipeStep): boolean {
  const text = normalizeText(
    `${step.stepName} ${step.subSteps.map((subStep) => `${subStep.subStepName} ${subStep.notes}`).join(' ')}`,
  );
  const blockedKeywords = ['precalent', 'calentar aceite', 'hervir', 'reposo'];
  if (blockedKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }
  const keywords = [
    'frei',
    'frit',
    'plancha',
    'sella',
    'dora',
    'huevo',
    'pechuga',
    'bistec',
    'filete',
  ];
  const hasKeyword = keywords.some((keyword) => text.includes(keyword));
  const hasTimer = step.subSteps.some((subStep) => subStep.isTimer);
  return hasKeyword && hasTimer;
}

function hasExplicitUnitFlow(steps: RecipeStep[]): boolean {
  const text = normalizeText(
    steps
      .map((step) => `${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`)
      .join(' '),
  );
  return /\b(huevo|pechuga|bistec|filete)\s*[12]\b/.test(text);
}

function shouldShowFlipHint(subStep?: SubStep): boolean {
  if (!subStep?.isTimer) return false;
  const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
  return (
    text.includes('primera cara') ||
    text.includes('primer lado') ||
    text.includes('primera vuelta') ||
    text.includes('por un lado')
  );
}

function getFaceTimerPair(step: RecipeStep | undefined, portion: Portion): FaceTimerPair | null {
  if (!step) return null;

  const firstIndex = step.subSteps.findIndex((subStep) => {
    const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
    return subStep.isTimer && (text.includes('primera cara') || text.includes('primer lado'));
  });
  const secondIndex = step.subSteps.findIndex((subStep) => {
    const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
    return subStep.isTimer && (text.includes('segunda cara') || text.includes('segundo lado'));
  });

  if (firstIndex < 0 || secondIndex <= firstIndex) return null;

  const firstSeconds = parseTimerSeconds(step.subSteps[firstIndex].portions[portion]);
  const secondSeconds = parseTimerSeconds(step.subSteps[secondIndex].portions[portion]);
  if (!firstSeconds || !secondSeconds) return null;

  return { firstIndex, secondIndex, firstSeconds, secondSeconds };
}

function isPrepSubStep(subStep: GeneratedSubStep): boolean {
  if (subStep.isTimer) return false;
  const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
  return (
    text.includes('pelar') ||
    text.includes('cortar') ||
    text.includes('picar') ||
    text.includes('lavar') ||
    text.includes('enjuagar') ||
    text.includes('trocear') ||
    text.includes('desinfectar') ||
    text.includes('secar')
  );
}

function isHeatSubStep(subStep: GeneratedSubStep): boolean {
  const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
  return (
    text.includes('precalent') ||
    text.includes('calentar') ||
    text.includes('aceite') ||
    text.includes('sarten') ||
    text.includes('olla') ||
    text.includes('hervir') ||
    text.includes('sofreir') ||
    text.includes('freir') ||
    text.includes('dorar')
  );
}

function normalizeGeneratedStepOrder(steps: GeneratedRecipeStep[]): GeneratedRecipeStep[] {
  const firstHeatIndex = steps.findIndex((step) => step.subSteps.some((subStep) => isHeatSubStep(subStep)));
  if (firstHeatIndex < 0) return steps;

  const cloned = steps.map((step) => ({ ...step, subSteps: [...step.subSteps] }));
  const movedPrep: GeneratedSubStep[] = [];

  for (let i = firstHeatIndex; i < cloned.length; i += 1) {
    const keep: GeneratedSubStep[] = [];
    for (const subStep of cloned[i].subSteps) {
      if (isPrepSubStep(subStep)) movedPrep.push(subStep);
      else keep.push(subStep);
    }
    cloned[i] = { ...cloned[i], subSteps: keep };
  }

  if (movedPrep.length === 0) return steps;

  const firstStepHasHeat = cloned[0].subSteps.some((subStep) => isHeatSubStep(subStep));
  if (firstStepHasHeat) {
    cloned.unshift({
      stepNumber: 1,
      stepName: 'Preparación previa',
      fireLevel: 'low',
      subSteps: movedPrep,
    });
  } else {
    cloned[0] = {
      ...cloned[0],
      subSteps: [...movedPrep, ...cloned[0].subSteps],
    };
  }

  const compacted = cloned.filter((step) => step.subSteps.length > 0);
  return compacted.map((step, index) => ({ ...step, stepNumber: index + 1 }));
}

function ensureRecipeShape(data: GeneratedRecipe): GeneratedRecipe {
  const safeIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const safeStepsRaw = Array.isArray(data.steps) ? data.steps : [];
  const safeSteps = normalizeGeneratedStepOrder(safeStepsRaw);

  return {
    ...data,
    icon: data.icon?.trim() || '🍽️',
    ingredient: data.ingredient?.trim() || 'porciones',
    description: data.description?.trim() || `${safeSteps.length || 1} pasos`,
    tip: data.tip?.trim() || 'Ten todos los ingredientes listos antes de empezar.',
    ingredients: safeIngredients
      .filter((ingredient) => ingredient?.name && ingredient?.portions)
      .map((ingredient, index) => ({
        ...ingredient,
        name: normalizeIngredientNamePeru(ingredient.name),
        indispensable:
          typeof ingredient.indispensable === 'boolean'
            ? ingredient.indispensable
            : index === 0 || !isLikelyDispensableIngredient(ingredient.name),
        portions: {
          1: normalizePortionText(ingredient.portions?.[1]),
          2: normalizePortionText(ingredient.portions?.[2]),
          4: normalizePortionText(ingredient.portions?.[4]),
        },
      })),
    steps: safeSteps
      .filter((step) => step?.stepName && Array.isArray(step.subSteps) && step.subSteps.length > 0)
      .map((step, index) => {
        const normalizedSubSteps = step.subSteps
          .filter((subStep) => subStep?.subStepName && subStep?.portions)
          .map((subStep) => {
            const timer1 = parseTimerSeconds(subStep.portions?.[1]);
            const timer2 = parseTimerSeconds(subStep.portions?.[2]);
            const timer4 = parseTimerSeconds(subStep.portions?.[4]);
            const timerFallback = timer1 ?? timer2 ?? timer4 ?? 60;
            const shouldUseTimer = Boolean(subStep.isTimer);

            return {
              ...subStep,
              isTimer: shouldUseTimer,
              portions: shouldUseTimer
                ? {
                    1: timer1 ?? timerFallback,
                    2: timer2 ?? timerFallback,
                    4: timer4 ?? timerFallback,
                  }
                : {
                    1: normalizePortionText(subStep.portions?.[1]),
                    2: normalizePortionText(subStep.portions?.[2]),
                    4: normalizePortionText(subStep.portions?.[4]),
                  },
            };
          });

        for (let i = 0; i < normalizedSubSteps.length - 1; i += 1) {
          const current = normalizedSubSteps[i];
          const next = normalizedSubSteps[i + 1];
          if (!current?.isTimer || !next?.isTimer) continue;

          const currentText = normalizeText(`${current.subStepName} ${current.notes}`);
          const nextText = normalizeText(`${next.subStepName} ${next.notes}`);
          const isTransitionPair =
            (currentText.includes('primer lado') || currentText.includes('primera cara') || currentText.includes('primer tramo')) &&
            (nextText.includes('segundo lado') || nextText.includes('segunda cara') || nextText.includes('segundo tramo'));

          if (!isTransitionPair) continue;

          const existingMid = normalizedSubSteps[i + 1];
          const midText = existingMid ? normalizeText(`${existingMid.subStepName} ${existingMid.notes}`) : '';
          if (midText.includes('recordatorio')) continue;

          normalizedSubSteps.splice(i + 1, 0, {
            subStepName: 'Recordatorio: mover o voltear',
            notes: 'Haz el giro o movimiento antes de iniciar el siguiente tramo.',
            portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
            isTimer: false,
          });
          i += 1;
        }

        // Keep same timer in first/second side cooking to avoid confusion.
        const firstIndex = normalizedSubSteps.findIndex((subStep) => {
          const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
          return subStep.isTimer && (text.includes('primera cara') || text.includes('primer lado'));
        });
        const secondIndex = normalizedSubSteps.findIndex((subStep) => {
          const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
          return subStep.isTimer && (text.includes('segunda cara') || text.includes('segundo lado'));
        });

        if (firstIndex >= 0 && secondIndex > firstIndex) {
          const firstTimer = normalizedSubSteps[firstIndex].portions;
          normalizedSubSteps[secondIndex] = {
            ...normalizedSubSteps[secondIndex],
            portions: {
              1: firstTimer[1],
              2: firstTimer[2],
              4: firstTimer[4],
            },
          };
        }

        return {
          ...step,
          stepNumber: Number.isFinite(step.stepNumber) ? step.stepNumber : index + 1,
          fireLevel: step.fireLevel === 'low' || step.fireLevel === 'high' || step.fireLevel === 'medium' ? step.fireLevel : 'medium',
          subSteps: normalizedSubSteps,
        };
      }),
  };
}

export function ThermomixCooker() {
  const [screen, setScreen] = useState<Screen>('category-select');
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>(defaultRecipes);
  const [recipeContentById, setRecipeContentById] = useState<Record<string, RecipeContent>>(initialRecipeContent);
  const [ingredientSelectionByRecipe, setIngredientSelectionByRecipe] = useState<Record<string, Record<string, boolean>>>({});
  const [cookingSteps, setCookingSteps] = useState<RecipeStep[] | null>(null);
  const [activeStepLoop, setActiveStepLoop] = useState<StepLoopState | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategoryId | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [portion, setPortion] = useState<Portion>(2);
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('people');
  const [peopleCount, setPeopleCount] = useState(2);
  const [availableCount, setAvailableCount] = useState(2);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('units');
  const [produceType, setProduceType] = useState('blanca');
  const [produceSize, setProduceSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [timerScaleFactor, setTimerScaleFactor] = useState(1);
  const [timingAdjustedLabel, setTimingAdjustedLabel] = useState('Tiempo estándar');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentSubStepIndex, setCurrentSubStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [flipPromptVisible, setFlipPromptVisible] = useState(false);
  const [pendingFlipAdvance, setPendingFlipAdvance] = useState(false);
  const [flipPromptCountdown, setFlipPromptCountdown] = useState(0);
  const [stirPromptVisible, setStirPromptVisible] = useState(false);
  const [pendingStirAdvance, setPendingStirAdvance] = useState(false);
  const [stirPromptCountdown, setStirPromptCountdown] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [, setVoiceStatus] = useState('Voz lista');
  const [awaitingNextUnitConfirmation, setAwaitingNextUnitConfirmation] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiClarificationQuestions, setAiClarificationQuestions] = useState<AIClarificationQuestion[]>([]);
  const [aiClarificationAnswers, setAiClarificationAnswers] = useState<Record<string, string | number>>({});
  const [aiClarificationNumberModes, setAiClarificationNumberModes] = useState<Record<string, ClarificationNumberMode>>({});
  const [aiClarificationQuantityUnits, setAiClarificationQuantityUnits] = useState<Record<string, ClarificationQuantityUnit>>({});
  const [isCheckingClarifications, setIsCheckingClarifications] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const activeRecipeId = selectedRecipe?.id ?? 'arroz';
  const activeRecipeContent = recipeContentById[activeRecipeId] ?? initialRecipeContent.arroz;
  const currentIngredients = activeRecipeContent.ingredients;
  const activeIngredientSelection =
    ingredientSelectionByRecipe[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);
  const currentRecipeData = screen === 'cooking'
    ? (cookingSteps ?? activeRecipeContent.steps)
    : activeRecipeContent.steps;
  const currentStep = currentRecipeData[currentStepIndex];
  const currentSubStep = currentStep?.subSteps[currentSubStepIndex];
  const portionValue = currentSubStep?.portions[portion];
  const currentTip = activeRecipeContent.tip;
  const currentPortionLabel = portion === 1
    ? activeRecipeContent.portionLabels.singular
    : activeRecipeContent.portionLabels.plural;
  const isLoopingCurrentStep = Boolean(activeStepLoop && activeStepLoop.stepIndex === currentStepIndex);
  const isAtLastSubStep = Boolean(currentStep && currentSubStepIndex === currentStep.subSteps.length - 1);
  const isAtLastStep = currentStepIndex === currentRecipeData.length - 1;
  const hasPendingLoopItems = Boolean(
    activeStepLoop &&
      activeStepLoop.stepIndex === currentStepIndex &&
      activeStepLoop.currentItem < activeStepLoop.totalItems,
  );
  const isRecipeFinished = isAtLastStep && isAtLastSubStep && !hasPendingLoopItems;
  const showFlipHint = shouldShowFlipHint(currentSubStep);
  const currentSubStepText = normalizeText(`${currentSubStep?.subStepName ?? ''} ${currentSubStep?.notes ?? ''}`);
  const showStirHint = Boolean(
    currentSubStep?.isTimer &&
      (
        currentSubStepText.includes('dorar primer tramo') ||
        currentSubStepText.includes('dorar segundo tramo') ||
        currentSubStepText.includes('freir primer tramo') ||
        currentSubStepText.includes('freir lado a') ||
        currentSubStepText.includes('primer lado') ||
        currentSubStepText.includes('primera cara')
      ),
  );
  const stirPromptTitle = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo') ? 'Mover nuevamente' : 'Mover papas')
    : 'Recordatorio';
  const stirPromptMessage = currentSubStepText.includes('papa') || currentSubStepText.includes('frita')
    ? (currentSubStepText.includes('segundo tramo')
      ? 'Vuelve a mover para terminar de dorar parejo.'
      : 'Remueve y separa para evitar que se peguen.')
    : 'Realiza el giro o movimiento indicado antes del siguiente tramo.';
  const isAutoReminderSubStep = Boolean(
    currentSubStep &&
      !currentSubStep.isTimer &&
      (() => {
        const text = normalizeText(`${currentSubStep.subStepName} ${currentSubStep.notes}`);
        return (
          text.includes('recordatorio') ||
          text.includes('mueve') ||
          text.includes('mover') ||
          text.includes('remueve') ||
          text.includes('remover') ||
          text.includes('revuelve') ||
          text.includes('revolver') ||
          text.includes('voltea') ||
          text.includes('voltear') ||
          text.includes('gira') ||
          text.includes('girar') ||
          text.includes('dar vuelta') ||
          text.includes('redistribuye') ||
          text.includes('redistribuir') ||
          text.includes('stir') ||
          text.includes('flip') ||
          text.includes('turn')
        );
      })(),
  );
  const effectiveReminderTitle = isAutoReminderSubStep
    ? currentSubStep?.subStepName.replace(/^Recordatorio:\s*/i, 'Recordatorio')
    : stirPromptTitle;
  const effectiveReminderMessage = isAutoReminderSubStep
    ? currentSubStep?.notes || 'Realiza la acción indicada antes de continuar.'
    : stirPromptMessage;
  const isRetirarSubStep = Boolean(
    currentSubStep &&
      !currentSubStep.isTimer &&
      (normalizeText(`${currentSubStep.subStepName} ${currentSubStep.notes}`).includes('retirar') ||
        normalizeText(`${currentSubStep.subStepName} ${currentSubStep.notes}`).includes('tanda completada')),
  );
  const retirarIsEgg = Boolean(
    currentSubStep &&
      normalizeText(`${currentSubStep.subStepName} ${currentSubStep.notes}`).includes('huevo'),
  );
  const retirarIsFries = Boolean(selectedRecipe?.id === 'papas-fritas' && isRetirarSubStep);
  const retirarTitle = retirarIsEgg
    ? 'El huevo está listo'
    : retirarIsFries
      ? 'Tanda completada'
      : 'Pieza completada';
  const retirarMessage = retirarIsEgg
    ? 'Retira tu huevo y prepárate para el siguiente.'
    : retirarIsFries
      ? 'Retira las papas, escurre y continúa con la siguiente tanda.'
      : 'Retira la pieza y prepárate para la siguiente.';
  const visibleRecipes = selectedCategory
    ? availableRecipes.filter((recipe) => recipe.categoryId === selectedCategory)
    : [];
  const selectedCategoryMeta = selectedCategory
    ? recipeCategories.find((category) => category.id === selectedCategory) ?? null
    : null;
  const recipeContextText = normalizeText(
    `${selectedRecipe?.name ?? ''} ${selectedRecipe?.ingredient ?? ''} ${currentIngredients.map((ingredient) => ingredient.name).join(' ')}`,
  );
  const isTubersBoilRecipe = Boolean(
    (recipeContextText.includes('papa') || recipeContextText.includes('camote')) &&
      (recipeContextText.includes('sancoch') || recipeContextText.includes('herv')),
  );
  const setupPortionPreview = quantityMode === 'people'
    ? mapCountToPortion(peopleCount)
    : mapCountToPortion(
      amountUnit === 'grams'
        ? Math.max(1, Math.round(availableCount / 250))
        : availableCount,
    );
  const setupScaleFactor = (() => {
    let factor = 1;
    if (quantityMode === 'people') {
      factor *= clampNumber(peopleCount / 2, 0.8, 2);
    } else if (amountUnit === 'grams') {
      factor *= clampNumber(availableCount / 500, 0.7, 2.2);
    } else {
      factor *= clampNumber(availableCount / 2, 0.7, 2.2);
    }

    if (isTubersBoilRecipe) {
      const typeFactorMap: Record<string, number> = {
        blanca: 1,
        yungay: 1.05,
        huayro: 1.12,
        canchan: 1.08,
        camote_amarillo: 0.95,
        camote_morado: 1.08,
      };
      const sizeFactorMap = { small: 0.85, medium: 1, large: 1.2 };
      factor *= typeFactorMap[produceType] ?? 1;
      factor *= sizeFactorMap[produceSize];
    }
    return clampNumber(factor, 0.7, 2.5);
  })();
  const targetMainCount = quantityMode === 'have'
    ? (amountUnit === 'grams' ? Math.max(1, Math.round(availableCount / 250)) : availableCount)
    : peopleCount;
  const batchCountForRecipe = selectedRecipe?.id === 'papas-fritas'
    ? 3
    : selectedRecipe?.id === 'huevo-frito'
      ? clampNumber(targetMainCount, 1, 8)
      : 1;
  const batchUsageTips = buildBatchUsageTips(currentIngredients, portion, batchCountForRecipe);

  // For step 5, get the timer value from the timer sub-step
  const getStep5TimerValue = () => {
    if (currentStep?.stepNumber === 5) {
      const timerSubStep = currentStep.subSteps.find(sub => sub.isTimer);
      return timerSubStep?.portions[portion];
    }
    return null;
  };

  const step5TimerValue = getStep5TimerValue();
  const shouldShowTimerInStep5 = currentStep?.stepNumber === 5 && step5TimerValue && typeof step5TimerValue === 'number';
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const beepAudioContextRef = useRef<AudioContext | null>(null);
  const ttsRequestIdRef = useRef(0);
  const intentionalCancelRef = useRef(false);
  const lastSpeechRef = useRef<{ text: string; ts: number }>({ text: '', ts: 0 });

  const playCountdownBeep = async () => {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!beepAudioContextRef.current || beepAudioContextRef.current.state === 'closed') {
        beepAudioContextRef.current = new AudioContextClass();
      }

      const ctx = beepAudioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(960, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch {
      // Ignore beep failures to avoid breaking timer flow.
    }
  };

  useEffect(() => {
    if (screen !== 'cooking') {
      setIsRunning(false);
      setTimeRemaining(0);
      setAwaitingNextUnitConfirmation(false);
      setStirPromptVisible(false);
      setPendingStirAdvance(false);
      setStirPromptCountdown(0);
      return;
    }

    if (currentSubStep?.isTimer && typeof portionValue === 'number') {
      setTimeRemaining(portionValue);
      // Auto start timer
      setIsRunning(true);
    } else if (currentStep?.stepNumber === 5) {
      // Special logic for step 5: start timer from first sub-step
      const timerSubStep = currentStep.subSteps.find(sub => sub.isTimer);
      if (timerSubStep && currentSubStepIndex === 0) {
        const timerValue = timerSubStep.portions[portion];
        if (typeof timerValue === 'number') {
          setTimeRemaining(timerValue);
          setIsRunning(true);
        }
      }
      // Keep timer running through all sub-steps in step 5
    } else {
      setTimeRemaining(0);
      setIsRunning(false);
    }
  }, [screen, currentStepIndex, currentSubStepIndex, portion, currentSubStep, portionValue]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (screen === 'cooking' && isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const nextValue = Math.max(prev - 1, 0);
          if (nextValue <= 5) {
            void playCountdownBeep();
          }

          if (prev <= 1) {
            setIsRunning(false);
            if (showFlipHint) {
              setFlipPromptVisible(true);
              setPendingFlipAdvance(true);
              setFlipPromptCountdown(7);
            } else if (showStirHint) {
              setStirPromptVisible(true);
              setPendingStirAdvance(true);
              setStirPromptCountdown(currentSubStepText.includes('huevo') ? 7 : 5);
            } else if (isAtLastSubStep && hasPendingLoopItems) {
              setAwaitingNextUnitConfirmation(true);
            } else {
              // Auto advance to next sub-step
              setTimeout(() => {
                handleNext();
              }, 1000);
            }
            return 0;
          }
          return nextValue;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [screen, isRunning, timeRemaining, showFlipHint, showStirHint, isAtLastSubStep, hasPendingLoopItems]);

  useEffect(() => {
    if (isRetirarSubStep) {
      setAwaitingNextUnitConfirmation(false);
    }
  }, [isRetirarSubStep]);

  useEffect(() => {
    if (!stirPromptVisible || !pendingStirAdvance) return;

    const durationMs = (currentSubStepText.includes('huevo') ? 7 : 5) * 1000;
    const timeout = setTimeout(() => {
      setStirPromptVisible(false);
      setPendingStirAdvance(false);
      setStirPromptCountdown(0);
      handleNext({ keepFlipPrompt: true });
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [stirPromptVisible, pendingStirAdvance, currentSubStepText]);

  useEffect(() => {
    if (screen !== 'cooking' || !isAutoReminderSubStep) return;
    setStirPromptVisible(true);
    setPendingStirAdvance(true);
    setStirPromptCountdown(5);
  }, [screen, currentStepIndex, currentSubStepIndex, isAutoReminderSubStep]);

  useEffect(() => {
    if (!stirPromptVisible || stirPromptCountdown <= 0) return;

    const interval = setInterval(() => {
      setStirPromptCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [stirPromptVisible, stirPromptCountdown]);

  useEffect(() => {
    if (!flipPromptVisible || !pendingFlipAdvance) return;

    const timeout = setTimeout(() => {
      setFlipPromptVisible(false);
      setPendingFlipAdvance(false);
      setFlipPromptCountdown(0);
      handleNext({ keepFlipPrompt: true });
    }, 7000);

    return () => clearTimeout(timeout);
  }, [flipPromptVisible, pendingFlipAdvance]);

  useEffect(() => {
    if (!flipPromptVisible || flipPromptCountdown <= 0) return;

    const interval = setInterval(() => {
      setFlipPromptCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [flipPromptVisible, flipPromptCountdown]);

  useEffect(() => {
    if (!speechSupported) return;

    const loadVoices = () => {
      const loadedVoices = window.speechSynthesis.getVoices();
      voicesRef.current = loadedVoices;
      console.debug('[TTS] voices loaded', {
        count: loadedVoices.length,
        voices: loadedVoices.map((voice) => ({
          name: voice.name,
          lang: voice.lang,
          default: voice.default,
          localService: voice.localService,
        })),
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [speechSupported]);

  useEffect(() => {
    return () => {
      if (!speechSupported) return;
      window.speechSynthesis.cancel();
    };
  }, [speechSupported]);

  const speakInstruction = (text: string, force = false) => {
    if (!speechSupported || (!voiceEnabled && !force) || !text.trim()) return;

    const now = Date.now();
    if (!force && lastSpeechRef.current.text === text && now - lastSpeechRef.current.ts < 900) {
      return;
    }
    lastSpeechRef.current = { text, ts: now };

    const synth = window.speechSynthesis;
    const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
    voicesRef.current = voices;
    const requestId = ++ttsRequestIdRef.current;
    let settled = false;
    let started = false;

    const resetSynth = () => {
      intentionalCancelRef.current = true;
      synth.cancel();
      synth.resume();
      setTimeout(() => {
        intentionalCancelRef.current = false;
      }, 260);
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const preferredVoice =
      voices.find((voice) => voice.default && voice.localService) ??
      voices.find((voice) => voice.default) ??
      voices.find((voice) => voice.localService && voice.lang.toLowerCase().startsWith('es')) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('es')) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
      null;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }

    utterance.onstart = () => {
      if (requestId !== ttsRequestIdRef.current) return;
      started = true;
      setVoiceStatus(`Reproduciendo voz${utterance.lang ? ` (${utterance.lang})` : ''}`);
      console.debug('[TTS] onstart', { requestId, lang: utterance.lang });
    };
    utterance.onend = () => {
      if (requestId !== ttsRequestIdRef.current) return;
      settled = true;
      setVoiceStatus('Última lectura completada');
      console.debug('[TTS] onend', { requestId, lang: utterance.lang });
    };
    utterance.onerror = (event) => {
      if (requestId !== ttsRequestIdRef.current) return;
      const errorCode = event.error || 'desconocido';
      if (errorCode === 'canceled' && intentionalCancelRef.current) {
        console.debug('[TTS] canceled by internal reset', { requestId });
        return;
      }
      settled = true;
      setVoiceStatus(`Error TTS final: ${errorCode}`);
      console.error('[TTS] onerror', { requestId, error: errorCode, lang: utterance.lang });
    };

    console.debug('[TTS] speak request', {
      requestId,
      text,
      force,
      voiceEnabled,
      speaking: synth.speaking,
      pending: synth.pending,
      paused: synth.paused,
      availableVoices: voices.length,
    });
    setVoiceStatus('Intentando reproducir voz...');
    if (synth.speaking || synth.pending) {
      resetSynth();
    } else {
      synth.resume();
    }
    setTimeout(() => {
      if (requestId !== ttsRequestIdRef.current) return;
      synth.speak(utterance);
    }, 70);

    setTimeout(() => {
      if (requestId !== ttsRequestIdRef.current || settled || started) return;
      console.error('[TTS] stalled utterance without callbacks', {
        requestId,
        speaking: synth.speaking,
        pending: synth.pending,
        paused: synth.paused,
      });
      // Soft recovery once without cancel storms.
      synth.pause();
      synth.resume();
      setVoiceStatus('TTS bloqueado: sin respuesta del motor de voz');
    }, 2200);
  };

  const speakCurrentInstruction = (force = false) => {
    if (screen !== 'cooking') return;
    if (flipPromptVisible) {
      speakInstruction('Voltea el huevo. Continúa con el lado B.', force);
      return;
    }
    if (stirPromptVisible) {
      speakInstruction(`${effectiveReminderTitle}. ${effectiveReminderMessage}`, force);
      return;
    }

    const title = isRetirarSubStep ? retirarTitle : currentSubStep?.subStepName;
    if (!title) return;

    const detail = isRetirarSubStep ? retirarMessage : currentSubStep?.notes;
    const text = detail && !detail.startsWith('Cantidad') ? `${title}. ${detail}` : title;
    speakInstruction(text, force);
  };

  useEffect(() => {
    if (!voiceEnabled) return;
    speakCurrentInstruction();
  }, [voiceEnabled, screen, currentStepIndex, currentSubStepIndex, flipPromptVisible, stirPromptVisible]);

  const handleVoiceToggle = () => {
    if (!speechSupported) return;

    if (voiceEnabled) {
      window.speechSynthesis.cancel();
      setVoiceEnabled(false);
      return;
    }

    setVoiceEnabled(true);
    // Replay current instruction right after enabling audio.
    setTimeout(() => {
      speakCurrentInstruction(true);
    }, 50);
  };


  const handleRecipeSelect = (recipe: Recipe) => {
    const content = recipeContentById[recipe.id];
    if (content && !ingredientSelectionByRecipe[recipe.id]) {
      setIngredientSelectionByRecipe((prev) => ({
        ...prev,
        [recipe.id]: buildInitialIngredientSelection(content.ingredients),
      }));
    }
    setCookingSteps(null);
    setActiveStepLoop(null);
    setSelectedRecipe(recipe);
    setQuantityMode('people');
    setPeopleCount(2);
    setAvailableCount(2);
    setAmountUnit('units');
    setProduceType('blanca');
    setProduceSize('medium');
    setTimerScaleFactor(1);
    setTimingAdjustedLabel('Tiempo estándar');
    setScreen('recipe-setup');
  };

  const handleCategorySelect = (categoryId: RecipeCategoryId) => {
    setSelectedCategory(categoryId);
    setScreen('recipe-select');
  };

  const handleBackToCategories = () => {
    setScreen('category-select');
    setSelectedCategory(null);
    setAiClarificationQuestions([]);
    setAiClarificationAnswers({});
    setAiClarificationNumberModes({});
    setAiClarificationQuantityUnits({});
    setAiError(null);
    setAiSuccess(null);
  };

  const handleBackToAIPrompt = () => {
    setScreen('recipe-select');
    setAiClarificationQuestions([]);
    setAiClarificationAnswers({});
    setAiClarificationNumberModes({});
    setAiClarificationQuantityUnits({});
    setAiError(null);
    setAiSuccess(null);
    setIsCheckingClarifications(false);
  };

  const handleSetupContinue = () => {
    const resolvedPortion = setupPortionPreview;
    setPortion(resolvedPortion);
    setTimerScaleFactor(setupScaleFactor);
    setTimingAdjustedLabel(
      Math.abs(setupScaleFactor - 1) < 0.01
        ? 'Tiempo estándar'
        : `Tiempo ajustado x${setupScaleFactor.toFixed(2)}`,
    );
    setScreen('ingredients');
  };

  const handleStartCooking = () => {
    const eggTargetCount = quantityMode === 'have'
      ? (amountUnit === 'grams'
        ? Math.max(1, Math.round(availableCount / 55))
        : availableCount)
      : peopleCount;
    const sourceSteps = selectedRecipe?.id === 'huevo-frito'
      ? buildEggFrySteps(eggTargetCount)
      : activeRecipeContent.steps;

    let selectedSteps = removeRedundantEggInsertSubStep(
      ensureFireTransitionSubSteps(
        buildCookingSteps(
          sourceSteps,
          currentIngredients,
          activeIngredientSelection,
        ),
      ),
      selectedRecipe?.id,
    );
    if (timerScaleFactor !== 1) {
      selectedSteps = applyTimerScale(selectedSteps, timerScaleFactor);
    }
    const loopItems = selectedRecipe?.id === 'papas-fritas' ? 3 : getLoopItemCount(currentIngredients, portion);
    const shouldDisableLoop =
      selectedRecipe?.id === 'huevo-frito' || hasExplicitUnitFlow(selectedSteps);
    const loopStepIndex = !shouldDisableLoop && loopItems > 1
      ? selectedSteps.findIndex((step) => isLoopableStep(step))
      : -1;

    if (loopStepIndex >= 0) {
      setActiveStepLoop({
        stepIndex: loopStepIndex,
        totalItems: loopItems,
        currentItem: 1,
      });
    } else {
      setActiveStepLoop(null);
    }

    setCookingSteps(selectedSteps);
    setScreen('cooking');
    setCurrentStepIndex(0);
    setCurrentSubStepIndex(0);
  };

  const handleChangeMission = () => {
    setScreen('category-select');
    setSelectedCategory(null);
    setSelectedRecipe(null);
    setQuantityMode('people');
    setPeopleCount(2);
    setAvailableCount(2);
    setAmountUnit('units');
    setProduceType('blanca');
    setProduceSize('medium');
    setTimerScaleFactor(1);
    setTimingAdjustedLabel('Tiempo estándar');
    setCookingSteps(null);
    setActiveStepLoop(null);
    setCurrentStepIndex(0);
    setCurrentSubStepIndex(0);
    setIsRunning(false);
    setFlipPromptVisible(false);
    setPendingFlipAdvance(false);
    setFlipPromptCountdown(0);
    setStirPromptVisible(false);
    setPendingStirAdvance(false);
    setStirPromptCountdown(0);
    setAwaitingNextUnitConfirmation(false);
    setAiClarificationQuestions([]);
    setAiClarificationAnswers({});
    setAiClarificationNumberModes({});
    setAiClarificationQuantityUnits({});
    setAiError(null);
    setAiSuccess(null);
  };

  const handleAiPromptChange = (value: string) => {
    setAiPrompt(value);
    if (aiClarificationQuestions.length > 0) {
      setAiClarificationQuestions([]);
      setAiClarificationAnswers({});
      setAiClarificationNumberModes({});
      setAiClarificationQuantityUnits({});
      setAiSuccess(null);
      setAiError(null);
    }
  };

  const setClarificationAnswer = (questionId: string, value: string | number) => {
    setAiClarificationAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setAiError(null);
  };

  const setClarificationNumberMode = (questionId: string, mode: ClarificationNumberMode) => {
    setAiClarificationNumberModes((prev) => ({
      ...prev,
      [questionId]: mode,
    }));
    if (mode === 'people') {
      setAiClarificationQuantityUnits((prev) => ({
        ...prev,
        [questionId]: 'units',
      }));
    }
    setAiError(null);
  };

  const setClarificationQuantityUnit = (questionId: string, unit: ClarificationQuantityUnit) => {
    setAiClarificationQuantityUnits((prev) => ({
      ...prev,
      [questionId]: unit,
    }));
    setAiError(null);
  };

  const resolveClarificationUnit = (question: AIClarificationQuestion) => {
    if (question.type !== 'number') return '';
    const mode = aiClarificationNumberModes[question.id];
    if (mode === 'people') return 'personas';
    const selectedQuantityUnit = aiClarificationQuantityUnits[question.id];
    if (selectedQuantityUnit === 'grams') return 'g';
    if (selectedQuantityUnit === 'units') return 'unidades';
    const normalizedQuestionUnit = normalizeText(question.unit ?? '');
    if (normalizedQuestionUnit.includes('g') || normalizedQuestionUnit.includes('gram')) return 'g';
    if (normalizedQuestionUnit.includes('persona')) return 'unidades';
    return question.unit || 'unidades';
  };

  const buildPromptWithClarifications = (basePrompt: string) => {
    if (aiClarificationQuestions.length === 0) return basePrompt;
    const answeredLines = aiClarificationQuestions
      .map((question) => {
        const value = aiClarificationAnswers[question.id];
        if (value === undefined || value === null || value === '') return '';
        const unit = resolveClarificationUnit(question);
        const numberMode = aiClarificationNumberModes[question.id];
        const label =
          question.type === 'number' &&
          numberMode === 'quantity' &&
          normalizeText(question.question).includes('persona')
            ? 'Cantidad disponible'
            : question.question;
        return `- ${label}: ${value}${unit ? ` ${unit}` : ''}`;
      })
      .filter(Boolean);
    if (answeredLines.length === 0) return basePrompt;
    return [
      basePrompt,
      '',
      'Datos adicionales confirmados por el usuario:',
      ...answeredLines,
      '- Genera la receta alineada a estos datos.',
    ].join('\n');
  };

  const getMissingClarificationQuestion = () =>
    aiClarificationQuestions.find((question) => {
      if (!question.required) return false;
      const value = aiClarificationAnswers[question.id];
      return value === undefined || value === null || value === '';
    });

  const enrichClarificationQuestions = (
    userPrompt: string,
    questions: AIClarificationQuestion[],
  ): AIClarificationQuestion[] => {
    const normalizedPrompt = normalizeText(userPrompt);
    const result = [...questions];

    const hasCutQuestion = result.some((question) => {
      const text = normalizeText(`${question.id} ${question.question}`);
      return text.includes('corte') || text.includes('filete') || text.includes('trozo');
    });
    const isFishFry =
      normalizedPrompt.includes('pescado') &&
      (normalizedPrompt.includes('frito') || normalizedPrompt.includes('freir') || normalizedPrompt.includes('chicharron'));
    if (isFishFry && !hasCutQuestion) {
      result.push({
        id: 'tipo_corte_pescado',
        question: '¿Qué tipo de corte usarás?',
        type: 'single_choice',
        required: true,
        options: ['Filete', 'Trozos medianos', 'Entero abierto'],
      });
    }

    const hasNumericQuestion = result.some((question) => question.type === 'number');
    if (!hasNumericQuestion) {
      result.push({
        id: 'cantidad_base',
        question: '¿Con qué base quieres cocinar esta receta?',
        type: 'number',
        required: true,
        min: 1,
        max: 20,
        step: 1,
        unit: 'unidades',
      });
    }

    return result.slice(0, 5);
  };

  const handleGenerateRecipe = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError('Escribe una idea de receta antes de generar.');
      return;
    }

    const missingQuestion = getMissingClarificationQuestion();
    if (missingQuestion) {
      setAiError(`Falta responder: ${missingQuestion.question}`);
      return;
    }

    setAiError(null);
    setAiSuccess(null);

    try {
      if (aiClarificationQuestions.length === 0) {
        setIsCheckingClarifications(true);
        const clarification = await requestRecipeClarificationWithAI(prompt);
        const normalizedQuestions = Array.isArray(clarification.questions)
          ? clarification.questions
              .filter((question) => question && question.id && question.question && question.type)
              .slice(0, 5)
          : [];
        const enrichedQuestions = enrichClarificationQuestions(prompt, normalizedQuestions);
        if (clarification.needsClarification && enrichedQuestions.length > 0) {
          const initialAnswers: Record<string, string | number> = {};
          const initialNumberModes: Record<string, ClarificationNumberMode> = {};
          const initialQuantityUnits: Record<string, ClarificationQuantityUnit> = {};
          enrichedQuestions.forEach((question) => {
            if (question.type === 'single_choice' && Array.isArray(question.options) && question.options.length > 0) {
              initialAnswers[question.id] = '';
              return;
            }
            if (question.type === 'number') {
              initialAnswers[question.id] = typeof question.min === 'number' ? question.min : 1;
              const normalizedQuestionText = normalizeText(`${question.id} ${question.question}`);
              initialNumberModes[question.id] =
                normalizedQuestionText.includes('persona') ||
                normalizedQuestionText.includes('porcion') ||
                normalizedQuestionText.includes('comensal')
                  ? 'people'
                  : 'quantity';
              initialQuantityUnits[question.id] =
                normalizeText(question.unit ?? '').includes('g') || normalizeText(question.unit ?? '').includes('gram')
                  ? 'grams'
                  : 'units';
              return;
            }
            initialAnswers[question.id] = '';
          });
          setAiClarificationQuestions(enrichedQuestions);
          setAiClarificationAnswers(initialAnswers);
          setAiClarificationNumberModes(initialNumberModes);
          setAiClarificationQuantityUnits(initialQuantityUnits);
          setAiSuccess(null);
          setScreen('ai-clarify');
          return;
        }
      }

      setIsGeneratingRecipe(true);
      const finalPrompt = buildPromptWithClarifications(prompt);
      const clarifiedSizing = inferSizingFromClarifications(
        aiClarificationQuestions,
        aiClarificationAnswers,
        aiClarificationNumberModes,
        aiClarificationQuantityUnits,
      );
      const clarifiedPeopleCount = inferPeopleCountFromClarifications(
        aiClarificationQuestions,
        aiClarificationAnswers,
        aiClarificationNumberModes,
      );
      const inferredPortion = inferPortionFromPrompt(finalPrompt);
      const generated = ensureRecipeShape(await generateRecipeWithAI(finalPrompt));
      const baseId = buildRecipeId(generated.id || generated.name);
      const uniqueId = availableRecipes.some((recipe) => recipe.id === baseId)
        ? `${baseId}-${Date.now()}`
        : baseId;

      if (generated.ingredients.length === 0 || generated.steps.length === 0) {
        throw new Error('La IA devolvió una receta incompleta. Intenta nuevamente.');
      }

      const newRecipe: Recipe = {
        id: uniqueId,
        categoryId: 'personalizadas',
        name: generated.name || 'Nueva receta',
        icon: generated.icon,
        ingredient: generated.ingredient,
        description: generated.description,
      };

      const newContent: RecipeContent = {
        ingredients: generated.ingredients,
        steps: generated.steps,
        tip: generated.tip,
        portionLabels: {
          singular: generated.portionLabels?.singular || 'porción',
          plural: generated.portionLabels?.plural || 'porciones',
        },
      };

      setAvailableRecipes((prev) => [...prev, newRecipe]);
      setRecipeContentById((prev) => ({ ...prev, [newRecipe.id]: newContent }));
      setIngredientSelectionByRecipe((prev) => ({
        ...prev,
        [newRecipe.id]: buildInitialIngredientSelection(newContent.ingredients),
      }));
      setCookingSteps(null);
      setSelectedCategory('personalizadas');
      setSelectedRecipe(newRecipe);
      if (clarifiedSizing?.quantityMode === 'have') {
        setQuantityMode('have');
        setAmountUnit(clarifiedSizing.amountUnit === 'grams' ? 'grams' : 'units');
        setAvailableCount(clarifiedSizing.count);
        setPortion(mapCountToPortion(clarifiedSizing.count));
      } else if (clarifiedPeopleCount) {
        setQuantityMode('people');
        setPeopleCount(clarifiedPeopleCount);
        setPortion(mapCountToPortion(clarifiedPeopleCount));
      } else if (inferredPortion) {
        setQuantityMode('people');
        setPortion(inferredPortion);
        setPeopleCount(inferredPortion);
      }
      if (clarifiedSizing) {
        const autoScaleFactor = clampNumber(clarifiedSizing.count / 2, 0.8, 2);
        setTimerScaleFactor(autoScaleFactor);
        setTimingAdjustedLabel(
          Math.abs(autoScaleFactor - 1) < 0.01
            ? 'Tiempo estándar'
            : `Tiempo ajustado x${autoScaleFactor.toFixed(2)}`,
        );
        setScreen('ingredients');
      } else {
        setScreen('recipe-setup');
      }
      setCurrentStepIndex(0);
      setCurrentSubStepIndex(0);
      setIsRunning(false);
      setActiveStepLoop(null);
      setFlipPromptVisible(false);
      setPendingFlipAdvance(false);
      setFlipPromptCountdown(0);
      setStirPromptVisible(false);
      setPendingStirAdvance(false);
      setStirPromptCountdown(0);
      setAwaitingNextUnitConfirmation(false);
      setAiPrompt('');
      setAiClarificationQuestions([]);
      setAiClarificationAnswers({});
      setAiClarificationNumberModes({});
      setAiClarificationQuantityUnits({});
      setAiSuccess(
        clarifiedSizing?.quantityMode === 'have'
          ? `Receta "${newRecipe.name}" agregada con base "lo que tienes" (${clarifiedSizing.count} ${clarifiedSizing.amountUnit === 'grams' ? 'g' : 'unid'}).`
          : clarifiedPeopleCount
          ? `Receta "${newRecipe.name}" agregada. Configurada para ${clarifiedPeopleCount} personas.`
          : inferredPortion
          ? `Receta "${newRecipe.name}" agregada. Detecté ${inferredPortion} porciones desde el prompt.`
          : `Receta "${newRecipe.name}" agregada.`,
      );
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'No se pudo generar la receta.');
    } finally {
      setIsCheckingClarifications(false);
      setIsGeneratingRecipe(false);
    }
  };

  const handleIngredientToggle = (ingredient: Ingredient) => {
    if (ingredient.indispensable) return;

    const key = getIngredientKey(ingredient.name);
    setIngredientSelectionByRecipe((prev) => {
      const recipeSelection = prev[activeRecipeId] ?? buildInitialIngredientSelection(currentIngredients);
      return {
        ...prev,
        [activeRecipeId]: {
          ...recipeSelection,
          [key]: !(recipeSelection[key] ?? true),
        },
      };
    });
  };

  const handleNext = (options?: { keepFlipPrompt?: boolean }) => {
    if (!options?.keepFlipPrompt) {
      setFlipPromptVisible(false);
    }
    setAwaitingNextUnitConfirmation(false);
    if (!currentStep) return;

    // Check if there are more sub-steps in current step
    if (currentSubStepIndex < currentStep.subSteps.length - 1) {
      setCurrentSubStepIndex((prev) => prev + 1);
      // Don't stop timer in step 5
      if (currentStep?.stepNumber !== 5) {
        setIsRunning(false);
      }
    } else if (
      activeStepLoop &&
      activeStepLoop.stepIndex === currentStepIndex &&
      activeStepLoop.currentItem < activeStepLoop.totalItems
    ) {
      setActiveStepLoop((prev) =>
        prev
          ? {
              ...prev,
              currentItem: prev.currentItem + 1,
            }
          : prev,
      );
      setCurrentSubStepIndex(0);
      setIsRunning(false);
    } else if (currentStepIndex < currentRecipeData.length - 1) {
      // Move to next step
      setCurrentStepIndex((prev) => prev + 1);
      setCurrentSubStepIndex(0);
      setIsRunning(false);
      if (activeStepLoop && activeStepLoop.stepIndex === currentStepIndex) {
        setActiveStepLoop(null);
      }
    }
  };

  const handlePrevious = () => {
    // Only go back within sub-steps, not across steps
    if (currentSubStepIndex > 0) {
      setCurrentSubStepIndex((prev) => prev - 1);
      // Don't stop timer in step 5
      if (currentStep?.stepNumber !== 5) {
        setIsRunning(false);
      }
    } else if (
      activeStepLoop &&
      activeStepLoop.stepIndex === currentStepIndex &&
      activeStepLoop.currentItem > 1
    ) {
      setActiveStepLoop((prev) =>
        prev
          ? {
              ...prev,
              currentItem: prev.currentItem - 1,
            }
          : prev,
      );
      setCurrentSubStepIndex(Math.max((currentStep?.subSteps.length ?? 1) - 1, 0));
      setIsRunning(false);
    }
  };

  const handleTogglePause = () => {
    if (currentSubStep?.isTimer || currentStep?.stepNumber === 5) {
      setIsRunning(!isRunning);
    }
  };

  const handleContinue = () => {
    if (!currentSubStep?.isTimer) {
      handleNext();
    }
  };

  const handleConfirmNextUnit = () => {
    setAwaitingNextUnitConfirmation(false);
    handleNext();
  };

  const handleJumpToSubStep = (stepIndex: number, subStepIndex: number) => {
    setCurrentStepIndex(stepIndex);
    setCurrentSubStepIndex(subStepIndex);
    setIsRunning(false);
  };

  const getFireEmojis = (level?: 'low' | 'medium' | 'high') => {
    if (level === 'low') return '🔥';
    if (level === 'medium') return '🔥🔥🔥';
    return '🔥🔥🔥🔥🔥';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Category Selection Screen
  if (screen === 'category-select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex items-end gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white">Chef Bot Pro</h1>
                <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{APP_VERSION}</span>
              </div>
            </div>
            <button
              onClick={handleVoiceToggle}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-colors ${
                voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
              }`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
              )}
            </button>
          </div>

          {/* Title */}
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Elige una categoría</h2>
            <p className="text-sm md:text-base text-slate-400">Selecciona el tipo de preparación</p>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-orange-400 text-xs md:text-sm font-semibold tracking-wider uppercase">
              CATEGORÍAS
            </h3>

            {recipeCategories.map((category) => {
              const recipeCount = availableRecipes.filter((recipe) => recipe.categoryId === category.id).length;
              if (recipeCount === 0) return null;

              return (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-700 hover:border-orange-500 transition-all hover:scale-[1.02] flex items-center gap-3 md:gap-4"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg">
                  {category.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                    {category.name}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">{category.description}</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-xs md:text-sm text-orange-300 font-bold">{recipeCount}</span>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                  </div>
                </div>
              </button>
            )})}
          </div>
        </div>
      </div>
    );
  }

  // Recipe List Screen
  if (screen === 'recipe-select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex items-end gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white">Chef Bot Pro</h1>
                <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{APP_VERSION}</span>
              </div>
            </div>
            <button
              onClick={handleVoiceToggle}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-colors ${
                voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
              }`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
              )}
            </button>
          </div>

          {/* Title */}
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {selectedCategoryMeta?.icon} {selectedCategoryMeta?.name ?? 'Recetas'}
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              Elige una receta o crea una personalizada con IA
            </p>
          </div>

          <div className="mb-4">
            <button
              onClick={handleBackToCategories}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl border border-slate-700 hover:border-orange-500 transition-colors text-sm font-semibold"
            >
              ← Volver a categorías
            </button>
          </div>

          {/* Recipes */}
          <div className="space-y-4">
            <h3 className="text-orange-400 text-xs md:text-sm font-semibold tracking-wider uppercase">
              RECETAS
            </h3>

            {visibleRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handleRecipeSelect(recipe)}
                className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-700 hover:border-orange-500 transition-all hover:scale-[1.02] flex items-center gap-3 md:gap-4"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-lg">
                  {recipe.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                    {recipe.name}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">{recipe.description}</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-base md:text-lg">👁️</span>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                  </div>
                </div>
              </button>
            ))}

            {visibleRecipes.length === 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 text-slate-300 text-sm">
                Esta categoría aún no tiene recetas.
              </div>
            )}

            <div className="mt-4 bg-slate-900 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-700 space-y-3">
              <p className="text-sm md:text-base text-white font-semibold">
                Crear nueva receta con IA
              </p>
              <textarea
                value={aiPrompt}
                onChange={(event) => handleAiPromptChange(event.target.value)}
                placeholder="Ej: salmón al ajillo en sartén, con tiempos para 1, 2 y 4 porciones"
                className="w-full min-h-24 bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm md:text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
              {aiError && <p className="text-sm text-red-400">{aiError}</p>}
              {aiSuccess && <p className="text-sm text-green-400">{aiSuccess}</p>}
              <button
                onClick={handleGenerateRecipe}
                disabled={isGeneratingRecipe || isCheckingClarifications}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCheckingClarifications
                  ? 'Consultando preguntas...'
                  : isGeneratingRecipe
                    ? 'Generando receta...'
                    : 'Agregar receta con IA'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'ai-clarify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8 md:mb-12 px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4">
              Ajustemos tu receta
            </h2>
            <p className="text-sm md:text-base text-slate-300">
              Responde estas preguntas para generar una receta más precisa
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 md:p-5 space-y-4 text-left">
            {aiClarificationQuestions.map((question) => {
              const answer = aiClarificationAnswers[question.id];
              if (question.type === 'single_choice' && Array.isArray(question.options)) {
                return (
                  <div key={question.id}>
                    <p className="text-sm text-slate-200 mb-2">
                      {question.question}
                      {question.required ? ' *' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => setClarificationAnswer(question.id, option)}
                          className={`px-3 py-1.5 text-sm rounded-full border ${
                            answer === option
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'text-slate-100 border-slate-500'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              if (question.type === 'number') {
                const unitMode = aiClarificationNumberModes[question.id] ?? 'quantity';
                const quantityUnit = aiClarificationQuantityUnits[question.id] ?? 'units';
                const min = unitMode === 'people'
                  ? 1
                  : quantityUnit === 'grams'
                    ? 50
                    : 1;
                const max = unitMode === 'people'
                  ? 8
                  : quantityUnit === 'grams'
                    ? 5000
                    : 20;
                const step = unitMode === 'people'
                  ? 1
                  : quantityUnit === 'grams'
                    ? 50
                    : 1;
                const rawCurrentValue = typeof answer === 'number' ? answer : min;
                const currentValue = clampNumber(rawCurrentValue, min, max);
                return (
                  <div key={question.id}>
                    <p className="text-sm text-slate-200 mb-2">
                      {question.question}
                      {question.required ? ' *' : ''}
                    </p>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => {
                          setClarificationNumberMode(question.id, 'quantity');
                          const current = typeof aiClarificationAnswers[question.id] === 'number'
                            ? (aiClarificationAnswers[question.id] as number)
                            : 1;
                          setClarificationAnswer(question.id, clampNumber(current, 1, 20));
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border ${
                          unitMode === 'quantity'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'text-slate-100 border-slate-500'
                        }`}
                      >
                        Cantidad
                      </button>
                      <button
                        onClick={() => {
                          setClarificationNumberMode(question.id, 'people');
                          const current = typeof aiClarificationAnswers[question.id] === 'number'
                            ? (aiClarificationAnswers[question.id] as number)
                            : 1;
                          setClarificationAnswer(question.id, clampNumber(current, 1, 8));
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border ${
                          unitMode === 'people'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'text-slate-100 border-slate-500'
                        }`}
                      >
                        Personas
                      </button>
                    </div>
                    {unitMode === 'quantity' && (
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            setClarificationQuantityUnit(question.id, 'units');
                            const current = typeof aiClarificationAnswers[question.id] === 'number'
                              ? (aiClarificationAnswers[question.id] as number)
                              : 1;
                            setClarificationAnswer(question.id, clampNumber(current, 1, 20));
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border ${
                            quantityUnit === 'units'
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'text-slate-100 border-slate-500'
                          }`}
                        >
                          Unidades
                        </button>
                        <button
                          onClick={() => {
                            setClarificationQuantityUnit(question.id, 'grams');
                            const current = typeof aiClarificationAnswers[question.id] === 'number'
                              ? (aiClarificationAnswers[question.id] as number)
                              : 50;
                            setClarificationAnswer(question.id, clampNumber(current, 50, 5000));
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border ${
                            quantityUnit === 'grams'
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'text-slate-100 border-slate-500'
                          }`}
                        >
                          Gramos
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setClarificationAnswer(question.id, Math.max(min, currentValue - step))}
                        className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl"
                      >
                        <span className="text-3xl font-bold text-slate-900">−</span>
                      </button>
                      <span className="text-3xl md:text-4xl font-bold text-white min-w-[120px] text-center">
                        {currentValue} {resolveClarificationUnit(question)}
                      </span>
                      <button
                        onClick={() => setClarificationAnswer(question.id, Math.min(max, currentValue + step))}
                        className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl"
                      >
                        <span className="text-3xl font-bold text-slate-900">+</span>
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={question.id}>
                  <p className="text-sm text-slate-200 mb-2">
                    {question.question}
                    {question.required ? ' *' : ''}
                  </p>
                  <input
                    value={typeof answer === 'string' ? answer : ''}
                    onChange={(event) => setClarificationAnswer(question.id, event.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white"
                    placeholder="Escribe tu respuesta"
                  />
                </div>
              );
            })}
          </div>

          {aiError && <p className="text-sm text-red-300 mt-3">{aiError}</p>}
          {aiSuccess && <p className="text-sm text-green-300 mt-3">{aiSuccess}</p>}

          <div className="space-y-3 mt-6">
            <button
              onClick={handleGenerateRecipe}
              disabled={isGeneratingRecipe || isCheckingClarifications}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 md:py-6 rounded-3xl text-xl md:text-2xl font-bold shadow-2xl hover:scale-105 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingRecipe ? 'Generando receta...' : 'Generar receta final'}
            </button>
            <button
              onClick={handleBackToAIPrompt}
              className="w-full text-slate-100 py-3 rounded-2xl border border-slate-500/60"
            >
              Volver al prompt
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recipe Setup Screen
  if (screen === 'recipe-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8 md:mb-12 px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4">
              Configura tu receta
            </h2>
            <p className="text-sm md:text-base text-blue-200">Define la base de cálculo antes de cocinar</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              onClick={() => setQuantityMode('people')}
              className={`py-3 rounded-xl border text-sm font-semibold ${
                quantityMode === 'people'
                  ? 'bg-white text-indigo-900 border-white'
                  : 'bg-indigo-800/40 text-white border-indigo-300/40'
              }`}
            >
              Para personas
            </button>
            <button
              onClick={() => setQuantityMode('have')}
              className={`py-3 rounded-xl border text-sm font-semibold ${
                quantityMode === 'have'
                  ? 'bg-white text-indigo-900 border-white'
                  : 'bg-indigo-800/40 text-white border-indigo-300/40'
              }`}
            >
              Con lo que tengo
            </button>
          </div>

          {quantityMode === 'have' && (
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={() => setAmountUnit('units')}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  amountUnit === 'units' ? 'bg-white text-indigo-900 border-white' : 'text-white border-indigo-300/40'
                }`}
              >
                Unidades
              </button>
              <button
                onClick={() => setAmountUnit('grams')}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  amountUnit === 'grams' ? 'bg-white text-indigo-900 border-white' : 'text-white border-indigo-300/40'
                }`}
              >
                Gramos
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
            <button
              onClick={() =>
                quantityMode === 'people'
                  ? setPeopleCount((prev) => Math.max(1, prev - 1))
                  : setAvailableCount((prev) => Math.max(1, prev - (amountUnit === 'grams' ? 50 : 1)))
              }
              className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
            >
              <span className="text-4xl md:text-5xl font-bold text-indigo-900">−</span>
            </button>

            <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
              <span className="text-6xl md:text-8xl font-bold text-white">
                {quantityMode === 'people' ? peopleCount : availableCount}
              </span>
            </div>

            <button
              onClick={() =>
                quantityMode === 'people'
                  ? setPeopleCount((prev) => Math.min(8, prev + 1))
                  : setAvailableCount((prev) => Math.min(amountUnit === 'grams' ? 5000 : 20, prev + (amountUnit === 'grams' ? 50 : 1)))
              }
              className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
            >
              <span className="text-4xl md:text-5xl font-bold text-indigo-900">+</span>
            </button>
          </div>

          <p className="text-sm text-blue-100 mb-6">
            {quantityMode === 'people'
              ? `Para ${peopleCount} persona${peopleCount === 1 ? '' : 's'}`
              : `Tienes ${availableCount} ${amountUnit === 'grams' ? 'g' : selectedRecipe?.ingredient ?? 'unidades'}`}
          </p>

          {isTubersBoilRecipe && (
            <div className="mb-6 space-y-3 bg-indigo-800/35 border border-indigo-300/25 rounded-2xl p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-blue-200">Ajuste de sancochado</p>
              <div>
                <p className="text-xs text-blue-200 mb-1">Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'blanca', label: 'Papa blanca' },
                    { id: 'yungay', label: 'Yungay' },
                    { id: 'huayro', label: 'Huayro' },
                    { id: 'canchan', label: 'Canchán' },
                    { id: 'camote_amarillo', label: 'Camote amarillo' },
                    { id: 'camote_morado', label: 'Camote morado' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setProduceType(option.id)}
                      className={`px-2.5 py-1.5 text-xs rounded-full border ${
                        produceType === option.id ? 'bg-white text-indigo-900 border-white' : 'text-white border-indigo-300/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-blue-200 mb-1">Tamaño</p>
                <div className="flex gap-2">
                  {[
                    { id: 'small', label: 'Pequeña' },
                    { id: 'medium', label: 'Mediana' },
                    { id: 'large', label: 'Grande' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setProduceSize(option.id as 'small' | 'medium' | 'large')}
                      className={`px-2.5 py-1.5 text-xs rounded-full border ${
                        produceSize === option.id ? 'bg-white text-indigo-900 border-white' : 'text-white border-indigo-300/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 text-sm text-blue-100 bg-indigo-800/30 border border-indigo-300/20 rounded-xl p-3">
            Base: {quantityMode === 'people' ? `personas (${peopleCount})` : 'lo que tienes'} · Porción calculada: {setupPortionPreview}
            <br />
            {Math.abs(setupScaleFactor - 1) < 0.01 ? 'Tiempo estándar' : `Tiempo ajustado x${setupScaleFactor.toFixed(2)}`}
          </div>

          {/* Start Button */}
          <div className="space-y-3">
            <button
              onClick={handleSetupContinue}
              className="w-full bg-white text-indigo-900 py-5 md:py-6 rounded-3xl text-xl md:text-2xl font-bold shadow-2xl hover:scale-105 transition-transform"
            >
              Siguiente
            </button>
            <button
              onClick={() => setScreen('recipe-select')}
              className="w-full text-white py-3 rounded-2xl border border-indigo-300/40"
            >
              Volver a recetas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ingredients Screen
  if (screen === 'ingredients') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex items-end gap-2">
                <h1 className="text-lg md:text-xl font-bold text-white">Chef Bot Pro</h1>
                <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{APP_VERSION}</span>
              </div>
            </div>
            <button
              onClick={handleVoiceToggle}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center border transition-colors ${
                voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
              }`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
              )}
            </button>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-black rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-800">
            {/* Title Section */}
            <div className="text-center mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
                <span className="text-3xl md:text-4xl">{selectedRecipe?.icon}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedRecipe?.name}</h2>
              </div>
              <div className="bg-orange-900/30 px-4 py-2 md:px-6 md:py-3 rounded-full border border-orange-700 inline-block">
                <span className="text-sm md:text-base text-orange-400 font-semibold">
                  Porción: {portion} {currentPortionLabel}
                </span>
              </div>
              <p className="mt-3 text-xs md:text-sm text-blue-200">
                Base: {quantityMode === 'people'
                  ? `para ${peopleCount} persona${peopleCount === 1 ? '' : 's'}`
                  : `con ${availableCount} ${amountUnit === 'grams' ? 'g' : selectedRecipe?.ingredient ?? 'unidades'}`} · {timingAdjustedLabel}
              </p>
            </div>

            {/* Ingredients List */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                <span className="text-xl md:text-2xl">📋</span>
                Ingredientes necesarios
              </h3>
              <div className="space-y-1.5 md:space-y-2">
                {currentIngredients.map((ingredient, index) => {
                  const displayPortionValue =
                    selectedRecipe?.id === 'huevo-frito' && normalizeText(ingredient.name).includes('huevo')
                      ? `${Math.max(1, batchCountForRecipe)} huevos`
                      : ingredient.portions[portion];
                  const quantity = splitIngredientQuantity(String(displayPortionValue));
                  const isSelected = activeIngredientSelection[getIngredientKey(ingredient.name)] ?? true;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleIngredientToggle(ingredient)}
                      className="w-full h-20 text-left bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl md:rounded-2xl px-3 md:px-4 border border-slate-700 hover:border-orange-500 transition-colors flex items-center gap-3 md:gap-4 disabled:cursor-not-allowed"
                      disabled={ingredient.indispensable}
                    >
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {ingredient.indispensable ? (
                          <div className="w-4 h-4 rounded border border-slate-600/60 bg-slate-700/40 flex items-center justify-center">
                            <Lock className="w-2.5 h-2.5 text-slate-400/80" />
                          </div>
                        ) : (
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'
                            }`}
                          >
                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        )}
                      </div>

                      <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center text-xl">
                        {ingredient.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-base md:text-lg font-semibold text-white truncate">
                            {ingredient.name}
                          </p>
                          {ingredient.indispensable && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-orange-900/40 text-orange-300 border border-orange-700 rounded-full leading-none">
                              indispensable
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right min-w-[110px] md:min-w-[150px]">
                        <p className="text-lg md:text-xl font-bold text-orange-400 leading-tight truncate">
                          {quantity.main}
                        </p>
                        {quantity.detail && (
                          <p className="text-[10px] md:text-xs text-orange-300/90 leading-tight truncate">
                            {quantity.detail}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-400 text-xs md:text-sm mt-3">
                Puedes desactivar ingredientes opcionales. Los indispensables están bloqueados y al cocinar se ajustan los pasos automáticamente.
              </p>
              {batchUsageTips.length > 0 && (
                <div className="mt-3 space-y-1 text-left">
                  {batchUsageTips.map((tip, index) => (
                    <p key={index} className="text-xs md:text-sm text-amber-300">
                      • {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-orange-900/20 border border-orange-700 rounded-xl md:rounded-2xl p-4 md:p-5 mb-6 md:mb-8">
              <div className="flex gap-2 md:gap-3">
                <span className="text-xl md:text-2xl shrink-0">💡</span>
                <div>
                  <p className="text-orange-300 font-semibold mb-1 text-sm md:text-base">Consejo</p>
                  <p className="text-slate-300 text-xs md:text-sm">
                    {currentTip}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => setScreen('recipe-setup')}
                className="flex-1 bg-slate-800 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg border border-slate-700 hover:border-orange-500 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleStartCooking}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                ¡Comenzar a cocinar!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cooking Screen
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-end gap-2">
              <h1 className="text-lg md:text-xl font-bold text-white">Chef Bot Pro</h1>
              <span className="text-[11px] md:text-xs text-slate-400 mb-0.5">{APP_VERSION}</span>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={handleChangeMission}
              className="px-3 py-2 md:px-4 md:py-2 bg-slate-800 text-white rounded-lg md:rounded-xl text-xs md:text-sm border border-slate-700 hover:border-orange-500 transition-colors"
            >
              Cambiar receta
            </button>
            <button
              onClick={handleVoiceToggle}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center border transition-colors ${
                voiceEnabled ? 'bg-orange-900/40 border-orange-600' : 'bg-slate-800 border-slate-700'
              }`}
              title={speechSupported ? (voiceEnabled ? 'Desactivar voz' : 'Activar voz') : 'Tu navegador no soporta voz'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-black rounded-2xl md:rounded-3xl p-4 md:p-8 border border-slate-800">
          {/* Status Badge */}
          <div className="flex justify-center items-center mb-4 md:mb-6 relative">
            <button
              onClick={handlePrevious}
              disabled={currentSubStepIndex === 0 || stirPromptVisible}
              className="absolute left-0 w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-lg md:rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          <div className="bg-gradient-to-r from-orange-900 to-orange-800 px-4 py-2 md:px-6 md:py-3 rounded-full border border-orange-700 flex items-center gap-1 md:gap-2">
            <span className="text-base md:text-lg">🔥</span>
            <span className="text-white font-semibold uppercase tracking-wide text-xs md:text-sm">
              {currentStep?.stepName}
            </span>
          </div>
            <button
              onClick={handleNext}
              disabled={isRecipeFinished || stirPromptVisible}
              className="absolute right-0 w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-lg md:rounded-xl flex items-center justify-center border border-slate-700 hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Step Counters */}
          <div className="text-center mb-4 md:mb-8">
            <p className="text-slate-500 uppercase tracking-wider text-xs md:text-sm">
              Paso {currentStep?.stepNumber} de {currentRecipeData.length}
            </p>
            <p className="text-orange-300 text-xs md:text-sm mt-1">
              Fuego: {currentStep?.fireLevel === 'low' ? 'bajo' : currentStep?.fireLevel === 'high' ? 'alto' : 'medio'} {getFireEmojis(currentStep?.fireLevel)}
            </p>
            {isLoopingCurrentStep && activeStepLoop && (
              <p className="text-orange-400 text-xs md:text-sm font-semibold mt-1">
                Pieza {activeStepLoop.currentItem} de {activeStepLoop.totalItems}
              </p>
            )}
          </div>

          {/* Main Content - Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Left Side - Instructions */}
            <div className="flex flex-col justify-center order-2 lg:order-1">
              <p className="text-slate-500 uppercase tracking-wider text-xs md:text-sm mb-2">
                Sub-paso {currentSubStepIndex + 1} de {currentStep?.subSteps.length}
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                {isRetirarSubStep ? retirarTitle : currentSubStep?.subStepName}
              </h3>
              {(isRetirarSubStep || (currentSubStep?.notes && !currentSubStep.notes.startsWith('Cantidad'))) && (
                <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
                  {isRetirarSubStep ? retirarMessage : currentSubStep?.notes}
                </p>
              )}
            </div>

            {/* Right Side - Timer or Quantity Display */}
            <div className="flex items-center justify-center order-1 lg:order-2">
              {currentSubStep?.isTimer && typeof portionValue === 'number' ? (
                <div className="relative">
                  <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
                    <circle
                      cx="128"
                      cy="128"
                      r="115"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-slate-800 md:hidden"
                    />
                    <circle
                      cx="128"
                      cy="128"
                      r="115"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 115}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 115 * (1 - (portionValue - timeRemaining) / portionValue)
                      }`}
                      className="text-orange-500 transition-all duration-1000 md:hidden"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="14"
                      fill="none"
                      className="text-slate-800 hidden md:block"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 145}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 145 * (1 - (portionValue - timeRemaining) / portionValue)
                      }`}
                      className="text-orange-500 transition-all duration-1000 hidden md:block"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
                    <span className="text-6xl md:text-8xl font-bold text-white tabular-nums">
                      {timeRemaining}
                    </span>
                    <button
                      onClick={handleTogglePause}
                      className="bg-slate-800 text-white px-4 py-2 md:px-6 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold border border-slate-700 hover:border-orange-500 transition-colors flex items-center gap-2"
                    >
                      <span className="text-base md:text-lg">{isRunning ? '⏸' : '▶'}</span>
                      {isRunning ? 'Pausar' : 'Iniciar'}
                    </button>
                  </div>
                </div>
              ) : shouldShowTimerInStep5 ? (
                <div className="relative">
                  <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
                    <circle
                      cx="128"
                      cy="128"
                      r="115"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-slate-800 md:hidden"
                    />
                    <circle
                      cx="128"
                      cy="128"
                      r="115"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 115}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 115 * (1 - (step5TimerValue - timeRemaining) / step5TimerValue)
                      }`}
                      className="text-orange-500 transition-all duration-1000 md:hidden"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="14"
                      fill="none"
                      className="text-slate-800 hidden md:block"
                    />
                    <circle
                      cx="160"
                      cy="160"
                      r="145"
                      stroke="currentColor"
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 145}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 145 * (1 - (step5TimerValue - timeRemaining) / step5TimerValue)
                      }`}
                      className="text-orange-500 transition-all duration-1000 hidden md:block"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 md:gap-4">
                    <span className="text-6xl md:text-8xl font-bold text-white tabular-nums">
                      {timeRemaining}
                    </span>
                    <button
                      onClick={handleTogglePause}
                      className="bg-slate-800 text-white px-4 py-2 md:px-6 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold border border-slate-700 hover:border-orange-500 transition-colors flex items-center gap-2"
                    >
                      <span className="text-base md:text-lg">{isRunning ? '⏸' : '▶'}</span>
                      {isRunning ? 'Pausar' : 'Iniciar'}
                    </button>
                  </div>
                </div>
              ) : portionValue !== 'Continuar' ? (
                <div className="bg-slate-800 rounded-2xl md:rounded-3xl p-12 md:p-16 border border-slate-700">
                  <p className="text-5xl md:text-7xl font-bold text-orange-400 text-center">
                    {portionValue}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="text-6xl md:text-8xl">👌</div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {isRetirarSubStep && !isRecipeFinished && (
            <div className="space-y-3 mb-4">
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:from-orange-600 hover:to-orange-700 transition-colors"
              >
                Listo
              </button>
            </div>
          )}

          {isRecipeFinished && (
            <div className="space-y-3 mb-4">
              <button
                onClick={handleChangeMission}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-colors"
              >
                Finalizar
              </button>
            </div>
          )}

          {awaitingNextUnitConfirmation && (
            <div className="space-y-3 mb-4">
              <button
                onClick={handleConfirmNextUnit}
                className="w-full bg-blue-600 text-white py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-lg hover:bg-blue-700 transition-colors"
              >
                Continuar con siguiente {activeRecipeContent.portionLabels.singular}
              </button>
            </div>
          )}

          {!currentSubStep?.isTimer && !isRetirarSubStep && !isAutoReminderSubStep && (
            <div className="space-y-4">
              <button
                onClick={handleNext}
                disabled={isRecipeFinished || awaitingNextUnitConfirmation || isRetirarSubStep}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-bold text-xl md:text-2xl shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ¡Listo!
              </button>
            </div>
          )}

        </div>
      </div>
      {flipPromptVisible && (
      <div className="fixed inset-0 z-40 bg-orange-500 flex items-center justify-center pointer-events-none">
        <div className="text-center text-white px-6">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-400/40 flex items-center justify-center text-4xl">
            ⏱️
          </div>
          <h3 className="text-5xl md:text-6xl font-bold mb-4">Voltea el huevo</h3>
          <p className="text-2xl md:text-3xl">Da la vuelta ahora y continúa con el lado B.</p>
          <p className="mt-6 text-4xl md:text-5xl font-bold tabular-nums">{flipPromptCountdown}s</p>
        </div>
      </div>
      )}
      {stirPromptVisible && (
      <div className="fixed inset-0 z-30 bg-blue-600/95 flex items-center justify-center pointer-events-none">
        <div className="text-center text-white px-6 max-w-2xl">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-400/30 flex items-center justify-center text-4xl">
            🍟
          </div>
          <h3 className="text-4xl md:text-5xl font-bold mb-4">{effectiveReminderTitle}</h3>
          <p className="text-xl md:text-2xl text-blue-100">{effectiveReminderMessage}</p>
          <p className="mt-6 text-4xl md:text-5xl font-bold tabular-nums">{stirPromptCountdown}s</p>
        </div>
      </div>
      )}
    </div>
  );
}
