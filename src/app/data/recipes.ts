import { Recipe, RecipeCategory, Ingredient as BaseIngredient, RecipeStep, RecipeContent } from '../../types';

export const recipes: Recipe[] = [
  {
    id: 'quinua-desayuno',
    categoryId: 'desayunos',
    name: 'Quinua del desayuno',
    icon: '🥣',
    emoji: '🥣',
    ingredient: 'Porciones',
    description: '5 pasos · 20-25 min',
  },
  {
    id: 'pan-palta-huevo',
    categoryId: 'desayunos',
    name: 'Pan con palta y huevo',
    icon: '🥑',
    emoji: '🥑',
    ingredient: 'Porciones',
    description: '4 pasos · 10-15 min',
  },
  {
    id: 'lomo-saltado-casero',
    categoryId: 'almuerzos',
    name: 'Lomo saltado casero',
    icon: '🥩',
    emoji: '🥩',
    ingredient: 'Porciones',
    description: '6 pasos · 30-40 min',
  },
  {
    id: 'arroz-con-pollo-rapido',
    categoryId: 'almuerzos',
    name: 'Arroz con pollo rápido',
    icon: '🍗',
    emoji: '🍗',
    ingredient: 'Porciones',
    description: '6 pasos · 40-50 min',
  },
  {
    id: 'sopa-criolla',
    categoryId: 'cenas',
    name: 'Sopa criolla',
    icon: '🍲',
    ingredient: 'Porciones',
    description: '6 pasos · 25-35 min',
  },
  {
    id: 'tortilla-verduras',
    categoryId: 'cenas',
    name: 'Tortilla de verduras',
    icon: '🍳',
    ingredient: 'Porciones',
    description: '5 pasos · 20-25 min',
  },
  {
    id: 'airfryer-pollo-crocante',
    categoryId: 'airfryer',
    name: 'Pollo crocante Airfryer',
    icon: '🍗',
    ingredient: 'Piezas',
    description: '5 pasos · 25-35 min',
  },
  {
    id: 'airfryer-camote-chips',
    categoryId: 'airfryer',
    name: 'Chips de camote Airfryer',
    icon: '🍠',
    ingredient: 'Camotes',
    description: '5 pasos · 20-30 min',
  },
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
    id: 'arroz-lentejas-compuesto',
    categoryId: 'arroces',
    name: 'Arroz con lentejas',
    icon: '🍛',
    ingredient: 'Porciones',
    description: 'Fases guiadas · 45-55 min',
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

export const recipeCategories: RecipeCategory[] = [
  { id: 'desayunos', name: 'Desayunos', icon: '☀️', description: 'Opciones rápidas para iniciar el día' },
  { id: 'almuerzos', name: 'Almuerzos', icon: '🍽️', description: 'Platos de fondo y comida criolla' },
  { id: 'cenas', name: 'Cenas', icon: '🌙', description: 'Opciones ligeras y reconfortantes' },
  { id: 'airfryer', name: 'Airfryer', icon: '🧺', description: 'Recetas pensadas para freidora de aire' },
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

export const arrozIngredients: Ingredient[] = [
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

export const huevoFritoIngredients: Ingredient[] = [
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

export const arrozRecipeData: RecipeStep[] = [
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

export const huevoFritoRecipeData: RecipeStep[] = [
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

export const papasFritasIngredients: Ingredient[] = [
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

export const papasFritasRecipeData: RecipeStep[] = [
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

export const arrozAjoIngredients: Ingredient[] = [
  { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  { name: 'Ajo picado', emoji: '🧄', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '1 ½ tazas', 2: '3 tazas', 4: '5 ½ tazas' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const arrozAjoRecipeData: RecipeStep[] = [
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

export const huevoSancochadoIngredients: Ingredient[] = [
  { name: 'Huevos', emoji: '🥚', indispensable: true, portions: { 1: '1 huevo', 2: '2 huevos', 4: '4 huevos' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '500 ml', 2: '700 ml', 4: '1 L' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Pizca', 2: 'Pizca', 4: 'Pizca' } },
];

export const huevoSancochadoRecipeData: RecipeStep[] = [
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

export const sopaVerdurasIngredients: Ingredient[] = [
  { name: 'Verduras mixtas', emoji: '🥕', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  { name: 'Agua o caldo', emoji: '🍲', indispensable: true, portions: { 1: '2 tazas', 2: '4 tazas', 4: '8 tazas' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const sopaVerdurasRecipeData: RecipeStep[] = [
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

export const arrozLentejasCompuestoIngredients: Ingredient[] = [
  { name: 'Lentejas', emoji: '🫘', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '3 tazas', 2: '6 tazas', 4: '10 tazas' } },
  { name: 'Ajo picado', emoji: '🧄', indispensable: false, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Cebolla', emoji: '🧅', indispensable: false, portions: { 1: '1/4 unidad', 2: '1/2 unidad', 4: '1 unidad' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const arrozLentejasCompuestoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1,
    stepName: 'Mise en place',
    fireLevel: 'low',
    subSteps: [
      {
        subStepName: 'Lavar lentejas y arroz por separado',
        notes: 'Enjuaga hasta que el agua salga clara.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Picar cebolla y ajo',
        notes: 'Déjalos listos para el sofrito.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
  {
    stepNumber: 2,
    stepName: 'Lentejas - hervor inicial',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Hervir agua para lentejas',
        notes: 'Usa olla mediana con parte del agua total.',
        portions: { 1: 240, 2: 300, 4: 420 },
        isTimer: true,
      },
      {
        subStepName: 'Agregar lentejas',
        notes: 'Cocina hasta que estén casi tiernas.',
        portions: { 1: 900, 2: 1080, 4: 1320 },
        isTimer: true,
      },
      {
        subStepName: 'Recordatorio: revisar agua',
        notes: 'Si baja mucho, agrega un poco de agua caliente.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
  {
    stepNumber: 3,
    stepName: 'Arroz - base',
    fireLevel: 'medium',
    subSteps: [
      {
        subStepName: 'Precalentar olla del arroz',
        notes: 'Fuego medio, olla seca.',
        portions: { 1: 45, 2: 60, 4: 75 },
        isTimer: true,
      },
      {
        subStepName: 'Calentar aceite y sofreír ajo/cebolla',
        notes: 'Sofríe sin quemar el ajo.',
        portions: { 1: 120, 2: 150, 4: 180 },
        isTimer: true,
      },
      {
        subStepName: 'Nacarar el arroz',
        notes: 'Agrega arroz y revuelve para sellar.',
        portions: { 1: 60, 2: 90, 4: 120 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 4,
    stepName: 'Integración',
    fireLevel: 'high',
    subSteps: [
      {
        subStepName: 'Unir lentejas casi cocidas con arroz',
        notes: 'Añade también parte de su caldo.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Ajustar sal y nivel de líquido',
        notes: 'Debe quedar ligeramente por encima del grano.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Cocción abierta',
        notes: 'Hasta que baje el líquido en superficie.',
        portions: { 1: 420, 2: 540, 4: 720 },
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
        subStepName: 'Bajar fuego al mínimo',
        notes: 'Tapa la olla para terminar al vapor.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
      {
        subStepName: 'Terminar cocción tapada',
        notes: 'No destapar durante este tramo.',
        portions: { 1: 720, 2: 900, 4: 1080 },
        isTimer: true,
      },
    ],
  },
  {
    stepNumber: 6,
    stepName: 'Final',
    fireLevel: 'low',
    subSteps: [
      {
        subStepName: 'Reposar y esponjar',
        notes: 'Apaga fuego, reposa y mezcla con tenedor.',
        portions: { 1: 240, 2: 300, 4: 420 },
        isTimer: true,
      },
      {
        subStepName: 'Servir',
        notes: 'Prueba sal final antes de llevar a mesa.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
];

export const quinuaDesayunoIngredients: Ingredient[] = [
  { name: 'Quinua lavada', emoji: '🌾', indispensable: true, portions: { 1: '1/3 taza', 2: '2/3 taza', 4: '1 1/3 taza' } },
  { name: 'Agua', emoji: '💧', indispensable: true, portions: { 1: '1 taza', 2: '2 tazas', 4: '4 tazas' } },
  { name: 'Leche', emoji: '🥛', indispensable: false, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  { name: 'Canela', emoji: '🟤', indispensable: false, portions: { 1: 'Pizca', 2: 'Pizca', 4: '1/4 cdta' } },
  { name: 'Miel o azúcar', emoji: '🍯', indispensable: false, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
];

export const quinuaDesayunoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Lavado', fireLevel: 'low', subSteps: [
      { subStepName: 'Enjuagar quinua', notes: 'Lava hasta retirar espuma/saponina.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Hervor', fireLevel: 'high', subSteps: [
      { subStepName: 'Hervir agua', notes: 'Usa olla mediana.', portions: { 1: 180, 2: 240, 4: 360 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Cocción quinua', fireLevel: 'medium', subSteps: [
      { subStepName: 'Agregar quinua', notes: 'Remueve una vez y baja a fuego medio.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar', notes: 'Hasta que reviente el grano y esté suave.', portions: { 1: 720, 2: 840, 4: 1020 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Saborizar', fireLevel: 'low', subSteps: [
      { subStepName: 'Agregar leche, canela y miel', notes: 'Opcional para versión cremosa.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Integrar sabores', notes: 'Remueve constantemente.', portions: { 1: 120, 2: 150, 4: 180 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Servir', fireLevel: 'low', subSteps: [
      { subStepName: 'Reposar y servir', notes: 'Sirve caliente.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const panPaltaHuevoIngredients: Ingredient[] = [
  { name: 'Pan francés', emoji: '🥖', indispensable: true, portions: { 1: '1 unidad', 2: '2 unidades', 4: '4 unidades' } },
  { name: 'Palta', emoji: '🥑', indispensable: true, portions: { 1: '1/2 unidad', 2: '1 unidad', 4: '2 unidades' } },
  { name: 'Huevo', emoji: '🥚', indispensable: true, portions: { 1: '1 unidad', 2: '2 unidades', 4: '4 unidades' } },
  { name: 'Sal y limón', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const panPaltaHuevoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Preparar palta', fireLevel: 'low', subSteps: [
      { subStepName: 'Majar palta', notes: 'Agrega sal y unas gotas de limón.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Precalentado', fireLevel: 'medium', subSteps: [
      { subStepName: 'Precalentar sartén', notes: 'Fuego medio.', portions: { 1: 30, 2: 40, 4: 50 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Huevo', fireLevel: 'medium', subSteps: [
      { subStepName: 'Cocinar huevo', notes: 'Frito o revuelto, al punto deseado.', portions: { 1: 120, 2: 160, 4: 220 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Montaje', fireLevel: 'low', subSteps: [
      { subStepName: 'Armar pan con palta y huevo', notes: 'Servir de inmediato.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const lomoSaltadoIngredients: Ingredient[] = [
  { name: 'Carne de res en tiras', emoji: '🥩', indispensable: true, portions: { 1: '180 g', 2: '350 g', 4: '700 g' } },
  { name: 'Cebolla roja', emoji: '🧅', indispensable: true, portions: { 1: '1/2 unidad', 2: '1 unidad', 4: '2 unidades' } },
  { name: 'Tomate', emoji: '🍅', indispensable: true, portions: { 1: '1 unidad', 2: '2 unidades', 4: '4 unidades' } },
  { name: 'Sillao y vinagre', emoji: '🥢', indispensable: true, portions: { 1: '1 cda', 2: '2 cdas', 4: '4 cdas' } },
  { name: 'Papas fritas', emoji: '🍟', indispensable: false, portions: { 1: '1 porción', 2: '2 porciones', 4: '4 porciones' } },
];

export const lomoSaltadoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Mise en place', fireLevel: 'low', subSteps: [
      { subStepName: 'Cortar cebolla y tomate', notes: 'En pluma gruesa y gajos.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Sazonar carne', notes: 'Sal y pimienta al gusto.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Precalentado', fireLevel: 'high', subSteps: [
      { subStepName: 'Precalentar sartén o wok', notes: 'Debe estar bien caliente.', portions: { 1: 60, 2: 75, 4: 90 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Sellar carne', fireLevel: 'high', subSteps: [
      { subStepName: 'Dorar carne en tandas', notes: 'No llenar demasiado la sartén.', portions: { 1: 150, 2: 210, 4: 300 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Salteado', fireLevel: 'high', subSteps: [
      { subStepName: 'Agregar cebolla y tomate', notes: 'Saltear rápido para mantener textura.', portions: { 1: 90, 2: 120, 4: 180 }, isTimer: true },
      { subStepName: 'Agregar sillao y vinagre', notes: 'Flambear opcionalmente.', portions: { 1: 45, 2: 60, 4: 90 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Integración', fireLevel: 'medium', subSteps: [
      { subStepName: 'Volver a incorporar carne', notes: 'Mezcla por pocos segundos.', portions: { 1: 30, 2: 45, 4: 60 }, isTimer: true },
    ]
  },
  {
    stepNumber: 6, stepName: 'Servir', fireLevel: 'low', subSteps: [
      { subStepName: 'Servir con arroz y/o papas', notes: 'Idealmente bien caliente.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const arrozConPolloRapidoIngredients: Ingredient[] = [
  { name: 'Pollo en presas', emoji: '🍗', indispensable: true, portions: { 1: '1 presa', 2: '2 presas', 4: '4 presas' } },
  { name: 'Arroz', emoji: '🍚', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  { name: 'Culantro licuado', emoji: '🌿', indispensable: true, portions: { 1: '2 cdas', 2: '4 cdas', 4: '8 cdas' } },
  { name: 'Arveja y zanahoria', emoji: '🥕', indispensable: false, portions: { 1: '1/4 taza', 2: '1/2 taza', 4: '1 taza' } },
  { name: 'Agua o caldo', emoji: '🍲', indispensable: true, portions: { 1: '1 1/2 taza', 2: '3 tazas', 4: '5 1/2 tazas' } },
];

export const arrozConPolloRapidoRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Precalentado', fireLevel: 'high', subSteps: [
      { subStepName: 'Precalentar olla', notes: 'Fuego medio alto.', portions: { 1: 45, 2: 60, 4: 75 }, isTimer: true },
    ]
  },
  {
    stepNumber: 2, stepName: 'Dorar pollo', fireLevel: 'high', subSteps: [
      { subStepName: 'Sellar presas de pollo', notes: 'Dorar por ambos lados.', portions: { 1: 240, 2: 300, 4: 420 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Aderezo', fireLevel: 'medium', subSteps: [
      { subStepName: 'Agregar culantro y sofreír', notes: 'Integra con ajo/cebolla si tienes.', portions: { 1: 90, 2: 120, 4: 180 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Cocción arroz', fireLevel: 'high', subSteps: [
      { subStepName: 'Agregar arroz y agua/caldo', notes: 'Ajusta sal.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar abierto', notes: 'Hasta que baje el líquido visible.', portions: { 1: 420, 2: 540, 4: 720 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Graneado', fireLevel: 'low', subSteps: [
      { subStepName: 'Bajar fuego y tapar', notes: 'Añade arveja/zanahoria.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Terminar al vapor', notes: 'No destapar durante este tramo.', portions: { 1: 600, 2: 720, 4: 900 }, isTimer: true },
    ]
  },
  {
    stepNumber: 6, stepName: 'Final', fireLevel: 'low', subSteps: [
      { subStepName: 'Reposar y servir', notes: 'Esponjar con tenedor.', portions: { 1: 180, 2: 240, 4: 300 }, isTimer: true },
    ]
  },
];

export const sopaCriollaIngredients: Ingredient[] = [
  { name: 'Fideos cabello de ángel', emoji: '🍜', indispensable: true, portions: { 1: '40 g', 2: '80 g', 4: '160 g' } },
  { name: 'Leche evaporada', emoji: '🥛', indispensable: true, portions: { 1: '1/4 taza', 2: '1/2 taza', 4: '1 taza' } },
  { name: 'Carne molida', emoji: '🥩', indispensable: false, portions: { 1: '80 g', 2: '160 g', 4: '320 g' } },
  { name: 'Pan tostado y orégano', emoji: '🍞', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
  { name: 'Caldo o agua', emoji: '🍲', indispensable: true, portions: { 1: '2 tazas', 2: '4 tazas', 4: '8 tazas' } },
];

export const sopaCriollaRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Precalentado', fireLevel: 'medium', subSteps: [
      { subStepName: 'Precalentar olla', notes: 'Fuego medio.', portions: { 1: 40, 2: 50, 4: 60 }, isTimer: true },
    ]
  },
  {
    stepNumber: 2, stepName: 'Aderezo', fireLevel: 'medium', subSteps: [
      { subStepName: 'Sofreír base', notes: 'Cebolla, ajo y opcionalmente carne.', portions: { 1: 180, 2: 240, 4: 320 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Hervor', fireLevel: 'high', subSteps: [
      { subStepName: 'Agregar caldo o agua', notes: 'Llevar a hervor.', portions: { 1: 240, 2: 300, 4: 420 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Cocción fideo', fireLevel: 'medium', subSteps: [
      { subStepName: 'Agregar fideos', notes: 'Mueve para que no se peguen.', portions: { 1: 180, 2: 240, 4: 300 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Terminar', fireLevel: 'low', subSteps: [
      { subStepName: 'Agregar leche evaporada', notes: 'No hervir fuerte después.', portions: { 1: 60, 2: 90, 4: 120 }, isTimer: true },
      { subStepName: 'Ajustar sal y orégano', notes: 'Rectifica sazón.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 6, stepName: 'Servir', fireLevel: 'low', subSteps: [
      { subStepName: 'Servir con pan tostado', notes: 'Opcional huevo escalfado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const tortillaVerdurasIngredients: Ingredient[] = [
  { name: 'Huevos', emoji: '🥚', indispensable: true, portions: { 1: '2 unidades', 2: '4 unidades', 4: '8 unidades' } },
  { name: 'Verduras picadas', emoji: '🥬', indispensable: true, portions: { 1: '1/2 taza', 2: '1 taza', 4: '2 tazas' } },
  { name: 'Aceite', emoji: '🫒', indispensable: true, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal y pimienta', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const tortillaVerdurasRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Mise en place', fireLevel: 'low', subSteps: [
      { subStepName: 'Batir huevos', notes: 'Agregar sal y pimienta.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Picar verduras', notes: 'Corte pequeño y uniforme.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Precalentado', fireLevel: 'medium', subSteps: [
      { subStepName: 'Precalentar sartén', notes: 'Fuego medio.', portions: { 1: 35, 2: 45, 4: 60 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Salteado', fireLevel: 'medium', subSteps: [
      { subStepName: 'Saltear verduras', notes: 'Ablandar ligeramente.', portions: { 1: 120, 2: 150, 4: 210 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Cuajado', fireLevel: 'low', subSteps: [
      { subStepName: 'Agregar huevo batido', notes: 'Mueve bordes suavemente.', portions: { 1: 180, 2: 240, 4: 320 }, isTimer: true },
      { subStepName: 'Voltear tortilla', notes: 'Usa tapa/plato para girar con cuidado.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Terminar lado B', notes: 'Cocina hasta firme pero jugosa.', portions: { 1: 120, 2: 150, 4: 210 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Servir', fireLevel: 'low', subSteps: [
      { subStepName: 'Reposar y servir', notes: 'Ideal con ensalada fresca.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const airfryerPolloIngredients: Ingredient[] = [
  { name: 'Pollo en piezas', emoji: '🍗', indispensable: true, portions: { 1: '2 piezas', 2: '4 piezas', 4: '8 piezas' } },
  { name: 'Aceite en spray', emoji: '🫒', indispensable: true, portions: { 1: 'Ligero', 2: 'Ligero', 4: 'Ligero' } },
  { name: 'Ajo y paprika', emoji: '🧄', indispensable: false, portions: { 1: '1 cdta', 2: '2 cdtas', 4: '1 cda' } },
  { name: 'Sal y pimienta', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const airfryerPolloRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Preparación', equipment: 'stove', fireLevel: 'low', subSteps: [
      { subStepName: 'Sazonar pollo', notes: 'Seca bien antes de sazonar.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Precalentar Airfryer', equipment: 'airfryer', temperature: 200, subSteps: [
      { subStepName: 'Precalentar a 200°C', notes: 'Canasta vacía.', portions: { 1: 240, 2: 240, 4: 300 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Primera cocción', equipment: 'airfryer', temperature: 200, subSteps: [
      { subStepName: 'Cocinar lado A', notes: 'No sobrecargar canasta.', portions: { 1: 540, 2: 600, 4: 720 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Volteo y final', equipment: 'airfryer', temperature: 200, subSteps: [
      { subStepName: 'Recordatorio: voltear pollo', notes: 'Rocía un poco más de spray si hace falta.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar lado B', notes: 'Hasta dorado y jugoso.', portions: { 1: 480, 2: 540, 4: 660 }, isTimer: true },
    ]
  },
  {
    stepNumber: 5, stepName: 'Reposo', fireLevel: 'low', equipment: 'stove', subSteps: [
      { subStepName: 'Reposar antes de servir', notes: '5 minutos fuera de la canasta.', portions: { 1: 300, 2: 300, 4: 300 }, isTimer: true },
    ]
  },
];

export const airfryerCamoteIngredients: Ingredient[] = [
  { name: 'Camote', emoji: '🍠', indispensable: true, portions: { 1: '1 unidad', 2: '2 unidades', 4: '4 unidades' } },
  { name: 'Aceite en spray', emoji: '🫒', indispensable: true, portions: { 1: 'Ligero', 2: 'Ligero', 4: 'Ligero' } },
  { name: 'Sal', emoji: '🧂', indispensable: false, portions: { 1: 'Al gusto', 2: 'Al gusto', 4: 'Al gusto' } },
];

export const airfryerCamoteRecipeData: RecipeStep[] = [
  {
    stepNumber: 1, stepName: 'Preparación', fireLevel: 'low', subSteps: [
      { subStepName: 'Cortar camote en láminas finas', notes: 'Mientras más parejo, mejor cocción.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Secar y rociar aceite', notes: 'No empapar, solo película ligera.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 2, stepName: 'Precalentar Airfryer', fireLevel: 'high', subSteps: [
      { subStepName: 'Precalentar a 190°C', notes: 'Canasta vacía.', portions: { 1: 180, 2: 180, 4: 240 }, isTimer: true },
    ]
  },
  {
    stepNumber: 3, stepName: 'Primera tanda', fireLevel: 'high', subSteps: [
      { subStepName: 'Cocinar chips tramo 1', notes: 'Distribuye en una sola capa.', portions: { 1: 300, 2: 360, 4: 420 }, isTimer: true },
      { subStepName: 'Recordatorio: mover chips', notes: 'Sacude canasta para dorado parejo.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
      { subStepName: 'Cocinar chips tramo 2', notes: 'Vigila para evitar quemar puntas.', portions: { 1: 240, 2: 300, 4: 360 }, isTimer: true },
    ]
  },
  {
    stepNumber: 4, stepName: 'Segunda tanda (si aplica)', fireLevel: 'high', subSteps: [
      { subStepName: 'Repetir con el resto', notes: 'Misma lógica por tandas.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
  {
    stepNumber: 5, stepName: 'Final', fireLevel: 'low', subSteps: [
      { subStepName: 'Agregar sal y servir', notes: 'Servir apenas salgan para máxima crocancia.', portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' }, isTimer: false },
    ]
  },
];

export const initialRecipeContent: Record<string, RecipeContent> = {
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
  'arroz-lentejas-compuesto': {
    ingredients: arrozLentejasCompuestoIngredients,
    steps: arrozLentejasCompuestoRecipeData,
    tip: 'Empieza por lentejas y avanza el arroz en paralelo; al unir, controla siempre el nivel de líquido.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'quinua-desayuno': {
    ingredients: quinuaDesayunoIngredients,
    steps: quinuaDesayunoRecipeData,
    tip: 'Lava muy bien la quinua antes de cocinar para evitar sabor amargo.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'pan-palta-huevo': {
    ingredients: panPaltaHuevoIngredients,
    steps: panPaltaHuevoRecipeData,
    tip: 'Para mejor textura, tuesta ligeramente el pan justo antes de montar.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'lomo-saltado-casero': {
    ingredients: lomoSaltadoIngredients,
    steps: lomoSaltadoRecipeData,
    tip: 'El secreto está en fuego alto y salteado rápido para no aguachentar el tomate.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'arroz-con-pollo-rapido': {
    ingredients: arrozConPolloRapidoIngredients,
    steps: arrozConPolloRapidoRecipeData,
    tip: 'Usa culantro fresco para color y aroma más intenso.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'sopa-criolla': {
    ingredients: sopaCriollaIngredients,
    steps: sopaCriollaRecipeData,
    tip: 'No dejes hervir fuerte luego de agregar leche para mantener textura cremosa.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'tortilla-verduras': {
    ingredients: tortillaVerdurasIngredients,
    steps: tortillaVerdurasRecipeData,
    tip: 'Cocina a fuego bajo para que cuaje parejo y no se queme la base.',
    portionLabels: { singular: 'porción', plural: 'porciones' },
  },
  'airfryer-pollo-crocante': {
    ingredients: airfryerPolloIngredients,
    steps: airfryerPolloRecipeData,
    tip: 'Seca bien el pollo y evita encimar piezas para un dorado uniforme.',
    portionLabels: { singular: 'pieza', plural: 'piezas' },
  },
  'airfryer-camote-chips': {
    ingredients: airfryerCamoteIngredients,
    steps: airfryerCamoteRecipeData,
    tip: 'Corta muy parejo y cocina por tandas para mejor crocancia.',
    portionLabels: { singular: 'camote', plural: 'camotes' },
  },
};

export const defaultRecipes: Recipe[] = recipes;

