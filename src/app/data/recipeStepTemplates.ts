import type { RecipeStep } from '../../types/index.js';

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
    stepName: 'Servir',
    fireLevel: 'low',
    subSteps: [
      {
        subStepName: 'Servir inmediatamente',
        notes: 'Acompaña con pan, arroz o lo que prefieras.',
        portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
        isTimer: false,
      },
    ],
  },
];
