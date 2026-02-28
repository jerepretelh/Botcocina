import { Portion, QuantityMode, AmountUnit, ClarificationNumberMode, ClarificationQuantityUnit, RecipeStep, SubStep, Ingredient, FaceTimerPair, RecipeContent, RecipeCategory, Recipe, CookingEquipment } from '../../types';
import { AIClarificationQuestion, GeneratedRecipe, GeneratedRecipeStep, GeneratedSubStep } from '../lib/recipeAI';
import { parseTimerSeconds } from './timerUtils';
import { huevoFritoRecipeData } from '../data/recipes';

export function buildRecipeId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);

  return slug || `receta-${Date.now()}`;
}


export function normalizePortionText(value: string | number | undefined): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return 'Continuar';
}

export function inferPortionFromPrompt(prompt: string): Portion | null {
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

export function inferPeopleCountFromClarifications(
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

export function inferSizingFromClarifications(
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
      count: clampNumber(count, isPeople ? 1 : (selectedQuantityUnit === 'grams' ? 50 : 1), isPeople ? 12 : (selectedQuantityUnit === 'grams' ? 10000 : 99)),
      amountUnit: isPeople ? undefined : selectedQuantityUnit,
    };
  }

  return null;
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeIngredientNamePeru(name: string): string {
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

export function getIngredientKey(name: string): string {
  return normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function isLikelyDispensableIngredient(name: string): boolean {
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

export function buildInitialIngredientSelection(ingredients: Ingredient[]): Record<string, boolean> {
  return ingredients.reduce<Record<string, boolean>>((acc, ingredient) => {
    acc[getIngredientKey(ingredient.name)] = true;
    return acc;
  }, {});
}

export function buildCookingSteps(
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

export function fireLevelLabel(level: 'low' | 'medium' | 'high', equipment?: CookingEquipment): string {
  if (equipment === 'airfryer' || equipment === 'oven') {
    if (level === 'low') return '140°C';
    if (level === 'high') return '200°C';
    return '180°C';
  }
  if (level === 'low') return 'bajo';
  if (level === 'high') return 'alto';
  return 'medio';
}

export function ensureEquipmentTransitionSubSteps(steps: RecipeStep[], recipeEquipment?: CookingEquipment): RecipeStep[] {
  return steps.map((step, index) => {
    const currentEquipment = step.equipment || recipeEquipment || 'stove';
    if (index === 0) return { ...step, equipment: currentEquipment };

    const previousStep = steps[index - 1];
    const previousEquipment = previousStep.equipment || recipeEquipment || 'stove';

    // If equipment changed, we might need a transition, but for now focus on level changes
    const previousLevel = previousStep.fireLevel ?? 'medium';
    const currentLevel = step.fireLevel ?? 'medium';

    if (previousLevel === currentLevel && previousEquipment === currentEquipment) {
      return { ...step, equipment: currentEquipment };
    }

    const alreadyDeclared = step.subSteps.some((subStep) => {
      const text = normalizeText(`${subStep?.subStepName ?? ''} ${subStep?.notes ?? ''}`);
      const hasLevelWord = text.includes('fuego') || text.includes('temperatura') || text.includes('grados') || text.includes('°c');
      const hasAdjustmentVerb =
        text.includes('baja') ||
        text.includes('bajar') ||
        text.includes('sube') ||
        text.includes('subir') ||
        text.includes('ajusta') ||
        text.includes('ajustar');
      return hasLevelWord && hasAdjustmentVerb;
    });

    if (alreadyDeclared) return { ...step, equipment: currentEquipment };

    let action = '';
    let target = fireLevelLabel(currentLevel, currentEquipment);

    if (currentEquipment === 'airfryer' || currentEquipment === 'oven') {
      action = 'Ajustar temperatura';
    } else {
      action = currentLevel === 'low' ? 'Bajar fuego' : 'Subir fuego';
    }

    const transitionSubStep: SubStep = {
      subStepName: `${action} a ${target}`,
      notes: currentEquipment === 'airfryer'
        ? `Ajusta la freidora de aire a ${target}.`
        : `Ajusta de ${fireLevelLabel(previousLevel, previousEquipment)} a ${target} para este paso.`,
      portions: { 1: 'Continuar', 2: 'Continuar', 4: 'Continuar' },
      isTimer: false,
    };

    return {
      ...step,
      equipment: currentEquipment,
      subSteps: [transitionSubStep, ...step.subSteps],
    };
  });
}

export function buildEggFrySteps(eggCount: number): RecipeStep[] {
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

export function mapCountToPortion(value: number): Portion {
  if (value <= 1) return 1;
  if (value <= 3) return 2;
  return 4;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


export function parseFirstNumber(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildBatchUsageTips(ingredients: Ingredient[], portion: Portion, batches: number): string[] {
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

export function removeRedundantEggInsertSubStep(steps: RecipeStep[], recipeId: string | undefined): RecipeStep[] {
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

export function splitIngredientQuantity(value: string): { main: string; detail: string | null } {
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

export function parseUnitCount(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 2 || rounded > 12) return null;
  return rounded;
}

export function getLoopItemCount(ingredients: Ingredient[], portion: Portion): number {
  const candidates = ingredients.filter((ingredient) => ingredient.indispensable !== false);
  for (const ingredient of candidates) {
    const count = parseUnitCount(ingredient.portions[portion]);
    if (count && count > 1) {
      return count;
    }
  }
  return 1;
}

export function isLoopableStep(step: RecipeStep): boolean {
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

export function hasExplicitUnitFlow(steps: RecipeStep[]): boolean {
  const text = normalizeText(
    steps
      .map((step) => `${step.stepName} ${step.subSteps.map((subStep) => subStep.subStepName).join(' ')}`)
      .join(' '),
  );
  return /\b(huevo|pechuga|bistec|filete)\s*[12]\b/.test(text);
}

export function shouldShowFlipHint(subStep?: SubStep): boolean {
  if (!subStep?.isTimer) return false;
  const text = normalizeText(`${subStep.subStepName} ${subStep.notes}`);
  return (
    text.includes('primera cara') ||
    text.includes('primer lado') ||
    text.includes('primera vuelta') ||
    text.includes('por un lado')
  );
}


export function isPrepSubStep(subStep: GeneratedSubStep): boolean {
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

export function isHeatSubStep(subStep: GeneratedSubStep): boolean {
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

export function normalizeGeneratedStepOrder(steps: GeneratedRecipeStep[]): GeneratedRecipeStep[] {
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

export function ensureRecipeShape(data: GeneratedRecipe): GeneratedRecipe {
  const safeIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
  const safeStepsRaw = Array.isArray(data.steps) ? data.steps : [];
  const safeSteps = normalizeGeneratedStepOrder(safeStepsRaw);

  // Detect equipment from prompt or category
  let detectedEquipment: CookingEquipment = data.equipment || 'stove';
  const descriptionLower = (data.description || '').toLowerCase();
  const nameLower = (data.name || '').toLowerCase();

  if (descriptionLower.includes('airfryer') || descriptionLower.includes('freidora de aire') ||
    nameLower.includes('airfryer') || nameLower.includes('freidora de aire')) {
    detectedEquipment = 'airfryer';
  } else if (descriptionLower.includes('horno') || nameLower.includes('horno')) {
    detectedEquipment = 'oven';
  }

  return {
    ...data,
    equipment: detectedEquipment,
    icon: data.icon?.trim() || (detectedEquipment === 'airfryer' ? '🧺' : detectedEquipment === 'oven' ? '🔥' : '🍽️'),
    ingredient: data.ingredient?.trim() || 'porciones',
    description: data.description?.trim() || `${safeSteps.length || 1} pasos`,
    tip: data.tip?.trim() || (detectedEquipment === 'airfryer' ? 'Precalienta la freidora si es necesario.' : 'Ten todos los ingredientes listos antes de empezar.'),
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
    steps: ensureEquipmentTransitionSubSteps(safeSteps, detectedEquipment)
      .filter((step) => step?.stepName && Array.isArray(step.subSteps) && step.subSteps.length > 0)
      .map((step, index) => {
        const stepEquipment = step.equipment || detectedEquipment;
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
                ? ({
                  1: timer1 ?? timerFallback,
                  2: timer2 ?? timerFallback,
                  4: timer4 ?? timerFallback,
                } as const)
                : ({
                  1: normalizePortionText(subStep.portions?.[1]),
                  2: normalizePortionText(subStep.portions?.[2]),
                  4: normalizePortionText(subStep.portions?.[4]),
                } as any),
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
