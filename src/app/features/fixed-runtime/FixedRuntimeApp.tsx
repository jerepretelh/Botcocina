import './fixed-runtime.css';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDown,
  CalendarDays,
  Camera,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  ShoppingBasket,
  Sparkles,
  TimerReset,
  X,
} from 'lucide-react';
import { findFixedRecipeById, parseFixedRecipesJson } from './loader';
import { buildImportPreview, type ImportPreviewResult } from './importPreview';
import { validateRecipesGuidelines, type FixedRecipeGuidelineIssue } from './guidelines';
import { parseFixedRuntimeRoute } from './router';
import { uploadRecipeCover } from '../../lib/imageUpload';
import {
  buildLibraryCategoryOptions,
  filterLibraryRecipes,
  type LibraryCategoryOption,
} from './librarySearch';
import type {
  FixedRecipeIngredientItem,
  FixedRecipeJson,
  FixedRecipePhase,
  FixedRecipeStep,
  FixedRecipeStepIngredientRef,
  FixedRuntimeScreen,
  FixedTimerState,
} from './types';
import { buildPreviewObservatory } from './previewObservatory';
import { authenticatedJsonFetch } from '../../lib/authenticatedApi';
import { isSupabaseEnabled } from '../../lib/supabaseClient';
import {
  checkoutShoppingTrip,
  createManualShoppingListItem,
  createShoppingTrip,
  deleteWeeklyPlanItem,
  ensureWeeklyPlan,
  getOrCreateShoppingList,
  getShoppingListItems,
  getShoppingTripItems,
  getWeekStartDate,
  getWeeklyPlanItems,
  replaceShoppingListItems,
  saveWeeklyPlanItem,
  updateShoppingListItem,
  updateShoppingTripItem,
} from '../../lib/planRepository';
import {
  loadFixedRuntimeCatalog,
  clearUserFixedRecipes,
  upsertUserFixedRecipes,
  type FixedRuntimeStorageMode,
} from './fixedRuntimeRepository';
import {
  buildInitialExpandedPlanDays,
  buildShellShoppingItems,
  indexToShellDay,
  resolveTodayShellDay,
  SHELL_DAYS,
  SHELL_MOMENTS,
  shellDayToIndex,
  shoppingNameKey,
  type PlannedRecipeEntry,
  type ShellDay,
  type ShellMoment,
  type ManualShoppingItemInput,
  type ShoppingUiState,
} from './shellModel';
import type { ShoppingListItem, WeeklyPlanSlot } from '../../../types';
import type { RecipeYieldV2 } from '../../types/recipe-v2';

interface FixedRuntimeAppProps {
  pathname: string;
  navigate: (path: string) => void;
  userId: string | null;
}

const IMPORTED_RECIPES_STORAGE_KEY = 'fixed-runtime:imported-recipes';
const FIXED_RUNTIME_STORAGE_MODE = (import.meta as any).env?.VITE_FIXED_RUNTIME_STORAGE_MODE ?? 'supabase';
const LIBRARY_FILTERS_STORAGE_KEY = 'fixed-runtime:library-filters';
const RUNTIME_RETURN_TOAST_KEY = 'fixed-runtime:return-toast';
type ShellTab = 'recipes' | 'plan' | 'shopping';
type ShoppingScope = 'selected' | 'weekly';

const SHELL_UI = {
  surface:
    'rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]',
  surfaceSoft:
    'rounded-2xl bg-white shadow-[0_8px_22px_rgba(0,0,0,0.04)]',
  floatingNav:
    'rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.95)] p-2 shadow-[0_22px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl',
  btnPrimary:
    'inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#111111] px-5 text-sm font-bold text-white transition duration-200 hover:bg-[#000000] active:scale-[0.98]',
  btnSecondary:
    'inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#2d3436] transition duration-200 hover:bg-[#f8f9fa] active:scale-[0.98]',
} as const;

interface RuntimeRecipe {
  id: string;
  title: string;
  yield?: string;
  recipeCategory?: FixedRecipeJson['recipeCategory'];
  equipment?: string[];
  servings: string;
  ingredients: Array<{
    title: string;
    icon: string;
    items: FixedRecipeIngredientItem[];
  }>;
  phases: Array<{
    id: string;
    number: string;
    title: string;
    emoji: string;
    steps: FixedRecipeStep[];
  }>;
}

const DEV_RECIPES_FALLBACK: FixedRecipeJson[] = [
  {
    id: 'demo-arroz-expres',
    title: 'Arroz exprés de prueba',
    recipeCategory: 'stovetop',
    servings: 2,
    ingredients: [
      {
        title: 'Base',
        items: [
          { name: 'Arroz', canonicalName: 'arroz', shoppingKey: 'arroz', amount: 1, unit: 'taza' },
          { name: 'Agua', canonicalName: 'agua', shoppingKey: 'agua', amount: 2, unit: 'tazas' },
        ],
      },
    ],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        emoji: '🍳',
        steps: [
          { id: 's1', text: 'Agregar arroz y agua' },
          { id: 's2', text: 'Timer: 12 min', timer: 720 },
          { id: 's3', text: 'Resultado: arroz cocido', type: 'result' },
        ],
      },
    ],
  },
  {
    id: 'demo-huevo-rapido',
    title: 'Huevo rápido de prueba',
    recipeCategory: 'stovetop',
    servings: 1,
    ingredients: [
      {
        title: 'Base',
        items: [{ name: 'Huevo', canonicalName: 'huevo', shoppingKey: 'huevo', amount: 2, unit: 'unidad' }],
      },
    ],
    phases: [
      {
        id: 'fase-1',
        number: 'FASE 1',
        title: 'Cocción',
        emoji: '🥚',
        steps: [
          { id: 's1', text: 'Hervir agua' },
          { id: 's2', text: 'Timer: 8 min', timer: 480 },
          { id: 's3', text: 'Resultado: huevo sancochado', type: 'result' },
        ],
      },
    ],
  },
];

function shellMomentToSlot(moment: ShellMoment): WeeklyPlanSlot {
  if (moment === 'Desayuno') return 'desayuno';
  if (moment === 'Cena') return 'cena';
  return 'almuerzo';
}

function slotToShellMoment(slot: WeeklyPlanSlot | null): ShellMoment {
  if (slot === 'desayuno') return 'Desayuno';
  if (slot === 'cena') return 'Cena';
  return 'Almuerzo';
}

function defaultYieldFromRecipe(recipe: FixedRecipeJson): RecipeYieldV2 {
  return {
    type: 'servings',
    value: recipe.servings,
    canonicalUnit: 'servings',
    visibleUnit: 'porciones',
    label: `${recipe.servings} porciones`,
    unit: 'porciones',
  };
}

const StepIngredientsList = ({ 
  ingredients, 
  stepText, 
  allIngredients 
}: { 
  ingredients?: FixedRecipeStepIngredientRef[];
  stepText?: string;
  allIngredients?: any[];
}) => {
  let resolvedIngredients = (ingredients || []).slice();

  if (resolvedIngredients.length === 0 && stepText && allIngredients) {
    const textLower = stepText.toLowerCase();
    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedText = removeAccents(textLower);

    for (const group of allIngredients) {
      if (!group.items) continue;
      for (const item of group.items) {
        const itemName = removeAccents(item.name.toLowerCase());
        const canonicalName = removeAccents((item.canonicalName || '').toLowerCase());
        
        // Improved match logic: check full name, or significant individual words 
        // to handle "clavo" matching "clavos de olor"
        const isMatch = (name: string) => {
          if (!name || name.length < 3) return false;
          // Direct inclusion
          if (normalizedText.includes(name)) return true;
          // Plural/singular simple check (clavo vs clavos)
          if (name.endsWith('s') && normalizedText.includes(name.slice(0, -1))) return true;
          if (!name.endsWith('s') && normalizedText.includes(name + 's')) return true;
          // Check words
          const words = name.split(/\s+/).filter(w => w.length > 3);
          return words.some(w => normalizedText.includes(w) || (w.endsWith('s') && normalizedText.includes(w.slice(0, -1))));
        };

        const matched = isMatch(itemName) || isMatch(canonicalName);

        if (matched) {
          // Identify which name actually matched for the regex check
          const activeName = (itemName && normalizedText.includes(itemName.split(/\s+/)[0])) ? itemName.split(/\s+/)[0] : canonicalName.split(/\s+/)[0];
          
          const explicitQuantityRegex = new RegExp(`(?:\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+)?)\\s*(?:taza|cda|cucharada|cdta|cucharadita|g|gr|gramo|kg|kilo|ml|litro|l|pizca|chorrito|tallo|diente|rama|paquete|lata)\\w*\\s*(?:de\\s+)?${activeName}`, 'i');
          const explicitNumberRegex = new RegExp(`(?:\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+)?)\\s*${activeName}`, 'i');

          if (!explicitQuantityRegex.test(normalizedText) && !explicitNumberRegex.test(normalizedText)) {
            if (!resolvedIngredients.some(ri => ri.name === item.name || ri.canonicalName === item.canonicalName)) {
              resolvedIngredients.push(item);
            }
          }
        }
      }
    }
  }

  if (resolvedIngredients.length === 0) return null;
  return (
    <div className="mt-3.5 mb-1 flex flex-wrap gap-2.5">
      {resolvedIngredients.map((ing, i) => (
        <span key={`${ing.canonicalName || ing.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#f8f6f3] px-3 py-1.5 text-[14px] font-medium border border-[#e6e0d8] text-[#5f5245]">
          <span className="font-bold text-[#23180f]">{ing.displayAmount ?? ing.amount}</span>
          {ing.displayUnit || ing.unit ? <span className="font-semibold text-[#8c7a6b]">{ing.displayUnit ?? ing.unit}</span> : null}
          <span className="text-[#5f5245]">{ing.name}</span>
        </span>
      ))}
    </div>
  );
};

function createPlannedEntryId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function shellMomentSortValue(moment: ShellMoment): number {
  if (moment === 'Desayuno') return 1;
  if (moment === 'Almuerzo') return 2;
  return 3;
}

function formatDecimalToFraction(value: number | string): string {
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (isNaN(num) || String(num) !== value.trim()) return value.trim();
    value = num;
  }
  
  // Basic fractional mappings
  if (value === 0.25) return '1/4';
  if (value === 0.33 || value === 0.333 || value === 0.3333) return '1/3';
  if (value === 0.5) return '1/2';
  if (value === 0.66 || value === 0.666 || value === 0.6666) return '2/3';
  if (value === 0.75) return '3/4';
  if (value === 1.5) return '1 1/2';
  if (value === 1.25) return '1 1/4';
  if (value === 2.5) return '2 1/2';
  
  // Return original string representation if no match
  return String(value);
}

function formatIngredientLine(item: FixedRecipeIngredientItem): string {
  let amountText = item.displayAmount?.trim() || formatDecimalToFraction(item.amount);
  let unitText = item.displayUnit?.trim() || item.unit.trim();
  
  // Clean up common AI generation anomalies
  if (amountText.toLowerCase() === 'al gusto' && unitText.toLowerCase() === 'al gusto') {
    unitText = '';
  }
  if (amountText.toLowerCase() === 'al gusto' || amountText.toLowerCase() === 'cantidad necesaria') {
    if (unitText.toLowerCase() === 'texto' || unitText.toLowerCase() === 'ninguna') {
      unitText = '';
    }
  }

  const prepText = item.preparation ? `, ${item.preparation}` : '';
  const notesText = item.notes ? ` (${item.notes})` : '';
  return `${amountText} ${unitText} ${item.name}${prepText}${notesText}`.replace(/\s+/g, ' ').trim();
}

function ContainerChip({ container }: { container?: string }) {
  if (!container) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700 sm:text-xs">
      {container}
    </span>
  );
}

function readImportedRecipesFromStorage(): FixedRecipeJson[] {
  try {
    const raw = window.localStorage.getItem(IMPORTED_RECIPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FixedRecipeJson[]) : [];
  } catch {
    return [];
  }
}

function persistImportedRecipesLocally(nextRecipes: FixedRecipeJson[]) {
  window.localStorage.setItem(IMPORTED_RECIPES_STORAGE_KEY, JSON.stringify(nextRecipes));
}

interface StepMeta extends FixedRecipeStep {
  phaseId: string;
  phaseTitle: string;
  phaseNumber: string;
  phaseEmoji: string;
  phaseIndex: number;
  stepIndex: number;
}

interface SuggestionState {
  fromStepId: string;
  fromStep: StepMeta;
  nextStep: FixedRecipeStep & { phaseTitle: string; phaseNumber: string; phaseEmoji: string };
}

type ExecutionUnit =
  | {
      kind: 'action_unit';
      action: FixedRecipeStep;
      timer?: FixedRecipeStep;
      result?: FixedRecipeStep;
    }
  | {
      kind: 'timer_unit';
      timer: FixedRecipeStep;
      result?: FixedRecipeStep;
    }
  | {
      kind: 'fallback';
      step: FixedRecipeStep;
    };

type PhaseRenderBlock =
  | {
      kind: 'group';
      header: Extract<ExecutionUnit, { kind: 'action_unit' }>;
      subunits: ExecutionUnit[];
    }
  | {
      kind: 'unit';
      unit: ExecutionUnit;
    };

function isTimerOnlyStep(step: FixedRecipeStep): boolean {
  if (step.kind === 'timer') return true;
  if (!step.timer) return false;
  const normalized = step.text.trim().toLowerCase();
  return normalized.startsWith('timer:') || normalized.startsWith('⏱');
}

function isResultStep(step: FixedRecipeStep): boolean {
  return step.type === 'result' || step.kind === 'result';
}

function hasDescriptiveTimerText(step: FixedRecipeStep): boolean {
  if (!isTimerOnlyStep(step)) return false;
  const text = step.text.trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  if (normalized.startsWith('timer:') || normalized.startsWith('⏱')) return false;
  if (/^\d{1,2}:\d{2}$/.test(normalized)) return false;
  return text.split(/\s+/).length >= 2;
}

function resolveTimerPrimaryText(step: FixedRecipeStep): string {
  const text = step.text.trim();
  return text || 'Esperar';
}

function normalizeResultFeedbackText(text: string): string {
  const cleaned = text.trim().replace(/^resultado:\s*/i, '').trim();
  return cleaned || text.trim();
}

function cleanupStepText(text: string): string {
  // Strip "Paso X:", "1.", "Paso X -"
  return text.replace(/^(?:Paso\s+\d+|[0-9]+)[\.\-\:]\s*/i, '').trim() || text;
}

function getExecutionUnitNumber(units: ExecutionUnit[], unitIndex: number): number {
  return units
    .slice(0, unitIndex + 1)
    .filter((entry) => entry.kind === 'action_unit' || entry.kind === 'timer_unit')
    .length;
}

function getVisibleExecutionUnitNumber(units: ExecutionUnit[], unitIndex: number): number {
  return units
    .slice(0, unitIndex + 1)
    .filter((entry) => {
      if (entry.kind !== 'action_unit' && entry.kind !== 'timer_unit') return false;
      return getExecutionUnitPrimaryStep(entry).groupPosition !== 'substep';
    })
    .length;
}

function resolveExecutionUnitContainer(unit: ExecutionUnit): string | undefined {
  if (unit.kind === 'action_unit') {
    return unit.action.container ?? unit.timer?.container ?? unit.result?.container;
  }
  if (unit.kind === 'timer_unit') {
    return unit.timer.container ?? unit.result?.container;
  }
  return unit.step.container;
}

function shouldShowContainerTransition(
  currentContainer: string | undefined,
  previousContainer: string | undefined,
): boolean {
  if (!currentContainer) return false;
  return currentContainer !== previousContainer;
}

function findPreviousVisibleUnitContainer(units: ExecutionUnit[], currentIndex: number): string | undefined {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const unit = units[index];
    if (!unit) continue;
    const primaryStep = getExecutionUnitPrimaryStep(unit);
    if (primaryStep.groupPosition === 'substep') continue;
    return resolveExecutionUnitContainer(unit);
  }
  return undefined;
}

function getExecutionUnitPrimaryStep(unit: ExecutionUnit): FixedRecipeStep {
  if (unit.kind === 'action_unit') return unit.action;
  if (unit.kind === 'timer_unit') return unit.timer;
  return unit.step;
}

function buildPhaseRenderBlocks(units: ExecutionUnit[]): PhaseRenderBlock[] {
  const blocks: PhaseRenderBlock[] = [];
  let index = 0;

  while (index < units.length) {
    const unit = units[index];
    if (!unit) break;

    if (unit.kind === 'action_unit' && unit.action.groupPosition === 'header' && unit.action.groupId) {
      const subunits: ExecutionUnit[] = [];
      let cursor = index + 1;
      while (cursor < units.length) {
        const candidate = units[cursor];
        if (!candidate) break;
        const primaryStep = getExecutionUnitPrimaryStep(candidate);
        if (primaryStep.groupId !== unit.action.groupId || primaryStep.groupPosition !== 'substep') {
          break;
        }
        subunits.push(candidate);
        cursor += 1;
      }
      blocks.push({ kind: 'group', header: unit, subunits });
      index = cursor;
      continue;
    }

    blocks.push({ kind: 'unit', unit });
    index += 1;
  }

  return blocks;
}

function collectGroupedSubunits(units: ExecutionUnit[], startIndex: number, groupId: string): ExecutionUnit[] {
  const grouped: ExecutionUnit[] = [];
  for (let index = startIndex + 1; index < units.length; index += 1) {
    const unit = units[index];
    if (!unit) break;
    const primaryStep = getExecutionUnitPrimaryStep(unit);
    if (primaryStep.groupId !== groupId || primaryStep.groupPosition !== 'substep') {
      break;
    }
    grouped.push(unit);
  }
  return grouped;
}

function buildExecutionUnits(steps: FixedRecipeStep[]): ExecutionUnit[] {
  const units: ExecutionUnit[] = [];
  let index = 0;

  while (index < steps.length) {
    const current = steps[index];
    if (!current) break;

    if (isResultStep(current)) {
      units.push({ kind: 'fallback', step: current });
      index += 1;
      continue;
    }

    if (isTimerOnlyStep(current)) {
      const unit: Extract<ExecutionUnit, { kind: 'timer_unit' }> = {
        kind: 'timer_unit',
        timer: current,
      };
      const maybeResult = steps[index + 1];
      if (maybeResult && isResultStep(maybeResult)) {
        unit.result = maybeResult;
        index += 2;
      } else {
        index += 1;
      }
      units.push(unit);
      continue;
    }

    const unit: ExecutionUnit = {
      kind: 'action_unit',
      action: current,
    };
    let cursor = index + 1;

    const maybeTimer = steps[cursor];
    if (maybeTimer && isTimerOnlyStep(maybeTimer)) {
      unit.timer = maybeTimer;
      cursor += 1;
    }

    const maybeResult = steps[cursor];
    if (maybeResult && isResultStep(maybeResult)) {
      unit.result = maybeResult;
      cursor += 1;
    }

    units.push(unit);
    index = cursor;
  }

  return units;
}

function toRuntimeRecipe(recipe: FixedRecipeJson): RuntimeRecipe {
  return {
    id: recipe.id,
    title: recipe.title,
    yield: recipe.yield,
    recipeCategory: recipe.recipeCategory,
    equipment: recipe.equipment,
    servings: `${recipe.servings} personas`,
    ingredients: recipe.ingredients.map((group) => ({
      title: group.title,
      icon: group.icon ?? '🍽️',
      items: group.items,
    })),
    phases: recipe.phases.map((phase) => ({
      id: phase.id,
      number: phase.number,
      title: phase.title,
      emoji: phase.emoji ?? '🍳',
      steps: phase.steps,
    })),
  };
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/** Plays a short beep using Web Audio API. frequency in Hz, duration in ms. */
function playBeep(frequency = 880, duration = 150, volume = 0.3): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration / 1000);
    oscillator.onended = () => ctx.close();
  } catch {
    // Silent fallback if audio is not available
  }
}

function playTimerPreAlarm(): void {
  playBeep(660, 120, 0.2);
}

function playTimerEndAlarm(): void {
  // Play a triple beep pattern for completion
  playBeep(880, 200, 0.4);
  setTimeout(() => playBeep(880, 200, 0.4), 300);
  setTimeout(() => playBeep(1100, 300, 0.5), 600);
  // Vibrate if available
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch {
    // Silent fallback
  }
}

const PRE_ALARM_SECONDS = 10;

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function downloadRecipeAsJson(recipe: FixedRecipeJson): void {
  const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${recipe.id || 'receta'}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildGenerationStamp(date: Date): { idSuffix: string; label: string } {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return {
    idSuffix: `${year}${month}${day}-${hours}${minutes}${seconds}`,
    label: `${day}/${month}/${year} ${hours}:${minutes}`,
  };
}

function createGeneratedRecipeInstance(recipe: FixedRecipeJson, existing: FixedRecipeJson[]): FixedRecipeJson {
  const stamp = buildGenerationStamp(new Date());
  const existingIds = new Set(existing.map((item) => item.id));
  let nextId = `${recipe.id}-${stamp.idSuffix}`;
  let counter = 2;
  while (existingIds.has(nextId)) {
    nextId = `${recipe.id}-${stamp.idSuffix}-${counter}`;
    counter += 1;
  }

  return {
    ...recipe,
    id: nextId,
    title: `${recipe.title} · ${stamp.label}`,
  };
}

function formatRecipeCategory(category: FixedRecipeJson['recipeCategory'] | undefined): string {
  switch (category) {
    case 'stovetop':
      return 'Cocina diaria';
    case 'baking':
      return 'Horneado';
    case 'dessert':
      return 'Postre';
    case 'airfryer':
      return 'Airfryer';
    case 'beverage':
      return 'Bebida';
    default:
      return 'Runtime fijo';
  }
}

function recipeSummary(recipe: FixedRecipeJson): string {
  return `${recipe.servings} porciones · ${recipe.phases.length} fases · ${recipe.ingredients.length} bloques`;
}

function resolveRecipeEmoji(category: FixedRecipeJson['recipeCategory'] | undefined): string {
  switch (category) {
    case 'stovetop':
      return '🍲';
    case 'baking':
      return '🍰';
    case 'dessert':
      return '🍮';
    case 'airfryer':
      return '🍟';
    case 'beverage':
      return '🥤';
    default:
      return '🍽️';
  }
}

function estimateRecipeMinutes(recipe: FixedRecipeJson): number {
  let totalSeconds = 0;
  recipe.phases.forEach((phase) => {
    phase.steps.forEach((step) => {
      if (typeof step.timer === 'number') {
        totalSeconds += step.timer;
      }
    });
  });
  if (totalSeconds > 0) return Math.max(1, Math.round(totalSeconds / 60));
  return Math.max(10, recipe.phases.length * 8);
}

function recipeCardMeta(recipe: FixedRecipeJson): string {
  const minutes = estimateRecipeMinutes(recipe);
  const category = formatRecipeCategory(recipe.recipeCategory);
  return `${minutes} min · ${category}`;
}

function resolveRecipeOriginLabel(recipe: FixedRecipeJson, importedIds: Set<string>, sessionPreviewId: string | null): string {
  if (recipe.id === sessionPreviewId) return 'Preview';
  if (importedIds.has(recipe.id)) return 'Importada';
  return 'Catálogo';
}

function initialTimerState(phases: FixedRecipePhase[]) {
  const state: Record<string, FixedTimerState> = {};
  phases.forEach((phase) => {
    phase.steps.forEach((step) => {
      if (step.timer) {
        state[step.id] = {
          duration: step.timer,
          remaining: step.timer,
          running: false,
          done: false,
        };
      }
    });
  });
  return state;
}

function FixedRecipeRuntime({ recipe, recipeJson, onExit, recipeImages, updateRecipeImage }: { recipe: RuntimeRecipe; recipeJson: FixedRecipeJson; onExit: () => void; recipeImages: Record<string, string>; updateRecipeImage: (id: string, url: string) => void }) {
  const [phasesView, setPhasesView] = useState<'runtime' | 'guide'>('runtime');
  const [timers, setTimers] = useState<Record<string, FixedTimerState>>(() => initialTimerState(recipe.phases));
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const preAlarmFiredRef = useRef<Set<string>>(new Set());
  const endAlarmFiredRef = useRef<Set<string>>(new Set());
  const previousTimersRef = useRef(timers);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const url = await uploadRecipeCover(file, recipe.id);
      updateRecipeImage(recipe.id, url);
    } catch (error) {
      alert('Error al subir imagen. Revisa la consola o asegúrate de que haya conexión.');
      console.error(error);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    setPhasesView('runtime');
    const nextTimers = initialTimerState(recipe.phases);
    setTimers(nextTimers);
    setActiveTimerId(null);
    setSuggestion(null);
    setCollapsedPhases(Object.fromEntries(recipe.phases.map((phase) => [phase.id, false])));
    previousTimersRef.current = nextTimers;
  }, [recipe.id, recipe.phases]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const entries = Object.entries(prev);
        let changed = false;
        const next = { ...prev };

        for (const [id, timer] of entries) {
          if (!timer.running) continue;
          changed = true;
          const nextRemaining = Math.max(0, timer.remaining - 1);
          next[id] = {
            ...timer,
            remaining: nextRemaining,
            running: nextRemaining === 0 ? false : timer.running,
            done: nextRemaining === 0 ? true : timer.done,
          };
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Issue 4: Wake Lock — prevent screen from locking during recipe
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let released = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => {
            wakeLock = null;
          });
        }
      } catch {
        // Browser may deny wake lock (e.g. low battery mode)
      }
    };

    const handleVisibilityChange = () => {
      if (!released && document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        void wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Issue 3: Timer alarms — pre-alarm at 10s + end alarm
  useEffect(() => {
    Object.entries(timers).forEach(([id, timer]) => {
      if (!timer.running) return;
      // Pre-alarm: fire once when reaching PRE_ALARM_SECONDS
      if (
        timer.remaining <= PRE_ALARM_SECONDS &&
        timer.remaining > 0 &&
        timer.duration > PRE_ALARM_SECONDS &&
        !preAlarmFiredRef.current.has(id)
      ) {
        preAlarmFiredRef.current.add(id);
        playTimerPreAlarm();
      }
      // End alarm: fire once when timer hits 0
      if (timer.remaining === 0 && timer.done && !endAlarmFiredRef.current.has(id)) {
        endAlarmFiredRef.current.add(id);
        playTimerEndAlarm();
      }
    });
  }, [timers]);

  const stepMetaMap = useMemo(() => {
    const map: Record<string, StepMeta> = {};
    recipe.phases.forEach((phase, phaseIndex) => {
      phase.steps.forEach((step, stepIndex) => {
        map[step.id] = {
          ...step,
          phaseId: phase.id,
          phaseTitle: phase.title,
          phaseNumber: phase.number,
          phaseEmoji: phase.emoji,
          phaseIndex,
          stepIndex,
        };
      });
    });
    return map;
  }, [recipe.phases]);

  const activeTimer = activeTimerId ? timers[activeTimerId] : null;

  const runningTimers = useMemo(
    () =>
      Object.entries(timers)
        .filter(([, timer]) => timer.running)
        .map(([id, timer]) => ({
          id,
          ...timer,
          step: stepMetaMap[id],
        }))
        .sort((a, b) => a.remaining - b.remaining),
    [timers, stepMetaMap],
  );

  const currentFocusStepId = activeTimerId || suggestion?.nextStep?.id || runningTimers[0]?.id || null;

  useEffect(() => {
    setCollapsedPhases((prev) => {
      const next = { ...prev };
      let changed = false;

      recipe.phases.forEach((phase) => {
        const shouldOpen = phase.steps.some(
          (step) => timers[step.id]?.running || currentFocusStepId === step.id || suggestion?.nextStep?.id === step.id,
        );

        if (shouldOpen && next[phase.id]) {
          next[phase.id] = false;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [recipe.phases, timers, currentFocusStepId, suggestion]);

  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const exitRecipe = () => {
    setActiveTimerId(null);
    setSuggestion(null);
    onExit();
  };

  const findNextActionableStep = (stepId: string) => {
    const currentMeta = stepMetaMap[stepId];
    if (!currentMeta) return null;

    for (let phaseIndex = currentMeta.phaseIndex; phaseIndex < recipe.phases.length; phaseIndex += 1) {
      const phase = recipe.phases[phaseIndex];
      const startIndex = phaseIndex === currentMeta.phaseIndex ? currentMeta.stepIndex + 1 : 0;

      for (let stepIndex = startIndex; stepIndex < phase.steps.length; stepIndex += 1) {
        const step = phase.steps[stepIndex];
        if (isResultStep(step)) continue;
        return {
          ...step,
          phaseTitle: phase.title,
          phaseNumber: phase.number,
          phaseEmoji: phase.emoji,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    const previousTimers = previousTimersRef.current;
    let completedStepId: string | null = null;

    Object.keys(timers).forEach((id) => {
      const previous = previousTimers[id];
      const current = timers[id];
      if (previous && !previous.done && current.done) {
        completedStepId = id;
      }
    });

    if (completedStepId) {
      const nextStep = findNextActionableStep(completedStepId);
      if (nextStep) {
        const currentStep = stepMetaMap[completedStepId];
        setSuggestion({
          fromStepId: completedStepId,
          fromStep: currentStep,
          nextStep,
        });
      }
    }

    previousTimersRef.current = timers;
  }, [timers, stepMetaMap]);

  const openTimer = (stepId: string) => setActiveTimerId(stepId);

  const startTimer = (stepId: string) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        running: true,
        done: false,
        remaining: prev[stepId].remaining === 0 ? prev[stepId].duration : prev[stepId].remaining,
      },
    }));
    setActiveTimerId(null);
  };

  const pauseTimer = (stepId: string) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        running: false,
      },
    }));
  };

  const toggleRunningTimer = (stepId: string) => {
    const timer = timers[stepId];
    if (!timer) return;
    if (timer.running) {
      pauseTimer(stepId);
    } else {
      startTimer(stepId);
    }
  };

  const resetTimer = (stepId: string) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        remaining: prev[stepId].duration,
        running: false,
        done: false,
      },
    }));
  };

  const getTimerLabel = (stepId: string) => {
    const timer = timers[stepId];
    if (!timer) return null;
    if (timer.running) return `En curso · ${formatTime(timer.remaining)}`;
    if (timer.done && timer.remaining === 0) return 'Listo';
    if (timer.remaining !== timer.duration) return `Pausado · ${formatTime(timer.remaining)}`;
    return formatTime(timer.duration);
  };

  const scrollToStep = (stepId: string) => {
    const element = document.getElementById(`step-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSuggestionContinue = () => {
    if (!suggestion?.nextStep) return;
    const nextStep = suggestion.nextStep;
    setSuggestion(null);
    scrollToStep(nextStep.id);

    if (nextStep.timer) {
      setTimers((prev) => ({
        ...prev,
        [nextStep.id]: {
          ...prev[nextStep.id],
          running: true,
          done: false,
          remaining: prev[nextStep.id].remaining === 0 ? prev[nextStep.id].duration : prev[nextStep.id].remaining,
        },
      }));
    }
  };

  const PhaseSection = ({ phase }: { phase: RuntimeRecipe['phases'][number] }) => {
    const shouldShowResultFeedback = (_resultStep: FixedRecipeStep) => true;
    const executionUnits = useMemo(() => buildExecutionUnits(phase.steps), [phase.steps]);
    const timedCount = phase.steps.filter((step) => step.timer).length;
    const runningInPhase = phase.steps.filter((step) => timers[step.id]?.running).length;
    const completedInPhase = phase.steps.filter((step) => timers[step.id]?.done).length;
    const hasFocusInPhase = phase.steps.some(
      (step) => timers[step.id]?.running || currentFocusStepId === step.id || suggestion?.nextStep?.id === step.id,
    );
    const isCollapsed = collapsedPhases[phase.id] && !hasFocusInPhase;

    useEffect(() => {
      if (!(import.meta as any).env?.DEV) return;
      console.debug('[fixed-runtime][execution-units]', {
        phaseId: phase.id,
        units: executionUnits.map((unit) => {
          if (unit.kind === 'action_unit') {
            return {
              kind: unit.kind,
              actionId: unit.action.id,
              timerId: unit.timer?.id ?? null,
              resultId: unit.result?.id ?? null,
            };
          }
          if (unit.kind === 'timer_unit') {
            return {
              kind: unit.kind,
              timerId: unit.timer.id,
              resultId: unit.result?.id ?? null,
            };
          }
          return {
            kind: unit.kind,
            stepId: unit.step.id,
          };
        }),
      });
    }, [phase.id, executionUnits]);

    return (
      <section className={`rt-phase-block ${isCollapsed ? '!py-5 !sm:py-6' : ''}`}>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${isCollapsed ? 'mb-0' : 'mb-5 sm:mb-8'}`}>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              <span>{phase.emoji}</span>
              <span>{phase.number}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[22px] sm:text-[28px]">{phase.emoji}</span>
              <h2 className={`font-editorial font-medium tracking-[-0.03em] text-stone-950 ${isCollapsed ? 'text-[26px] sm:text-[34px]' : 'text-[30px] sm:text-[46px]'}`}>
                {phase.title}
              </h2>
            </div>

            {isCollapsed ? (
              <div className="mt-3 text-sm text-stone-500">
                <span>{phase.steps.length} pasos</span>
                {timedCount > 0 ? <span> · {completedInPhase}/{timedCount} timers listos</span> : null}
                {runningInPhase > 0 ? <span> · {runningInPhase} activos</span> : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isCollapsed && timedCount > 0 ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2 text-xs text-stone-600 sm:px-4 sm:text-sm">
                <span>{timedCount} timers</span>
                {runningInPhase > 0 ? <span className="text-amber-700">· {runningInPhase} activos</span> : null}
              </div>
            ) : null}

            <button
              onClick={() => togglePhaseCollapse(phase.id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-line-rt)] px-4 py-2 text-sm font-bold text-[var(--text-muted-rt)] transition hover:bg-[var(--bg-soft-rt)] active:scale-[0.99]"
              aria-label={isCollapsed ? `Expandir ${phase.title}` : `Colapsar ${phase.title}`}
            >
              <span>{isCollapsed ? 'Ver fase' : 'Ocultar'}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
              />
            </button>
          </div>
        </div>

        {isCollapsed ? null : (
          <div className="space-y-3 sm:space-y-0">
            {executionUnits.map((unit, unitIndex) => {
              const primaryStep = getExecutionUnitPrimaryStep(unit);
              const previousVisibleContainer = findPreviousVisibleUnitContainer(executionUnits, unitIndex);
              const unitContainer = resolveExecutionUnitContainer(unit);
              const showContainerChip = shouldShowContainerTransition(unitContainer, previousVisibleContainer);
              if (primaryStep.groupPosition === 'substep') {
                return null;
              }

              if (unit.kind === 'action_unit' && unit.action.groupPosition === 'header' && unit.action.groupId) {
                const groupedSubunits = collectGroupedSubunits(executionUnits, unitIndex, unit.action.groupId);
                const blockNumber = getVisibleExecutionUnitNumber(executionUnits, unitIndex);
                const groupHasFocus = groupedSubunits.some((entry) => {
                  const step = getExecutionUnitPrimaryStep(entry);
                  return timers[step.id]?.running || currentFocusStepId === step.id || suggestion?.nextStep?.id === step.id;
                });
                const isSuggested = suggestion?.nextStep?.groupId === unit.action.groupId;

                return (
                  <div
                    key={`group-${unit.action.id}`}
                    id={`step-${unit.action.id}`}
                    className={`relative rounded-3xl border border-[var(--border-line-rt)] bg-[var(--bg-surface-rt)] p-4 sm:p-6 ${
                      unitIndex === 0 ? '' : 'mt-3 sm:mt-0 sm:border-t sm:rounded-none sm:border-x-0 sm:border-b-0'
                    } ${(isSuggested || groupHasFocus) ? 'scroll-mt-28 border-l-4 border-l-[var(--primary-rt)]' : ''}`}
                  >
                    {/* Group Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 shrink-0 pt-0.5">
                        <span
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold tabular-nums ring-1 ${
                            isSuggested
                              ? 'bg-amber-100 text-amber-900 ring-amber-200'
                              : groupHasFocus
                              ? 'bg-[var(--text-main-rt)] text-white ring-[var(--text-main-rt)]'
                              : 'bg-[var(--bg-soft-rt)] text-[var(--text-muted-rt)] ring-[var(--border-line-rt)]'
                          }`}
                        >
                          {String(blockNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="max-w-4xl text-[19px] font-bold leading-[1.28] tracking-[-0.02em] text-[var(--text-main-rt)] sm:text-[26px]">
                          {unit.action.groupTitle ?? unit.action.text}
                        </p>
                      </div>
                    </div>

                    {/* Nested Substeps */}
                    <div className="ml-0 sm:ml-16 space-y-2 border-l-2 border-[var(--border-line-rt)] pl-4">
                      {groupedSubunits.map((entry) => {
                        if (entry.kind === 'fallback') return null;
                        const entryIndex = groupedSubunits.indexOf(entry);
                        const entryContainer = resolveExecutionUnitContainer(entry);
                        const previousEntryContainer = entryIndex === 0
                          ? previousVisibleContainer
                          : resolveExecutionUnitContainer(groupedSubunits[entryIndex - 1]);
                        const showEntryContainerChip = shouldShowContainerTransition(entryContainer, previousEntryContainer);

                        if (entry.kind === 'timer_unit') {
                          const timerStep = entry.timer;
                          const resultStep = entry.result;
                          const isRunning = timers[timerStep.id]?.running;
                          const isDone = timers[timerStep.id]?.done;
                          const isCurrent = currentFocusStepId === timerStep.id;
                          const timerLabel = getTimerLabel(timerStep.id);
                          return (
                            <div
                              key={`group-subunit-${timerStep.id}`}
                              className={`rounded-2xl border px-4 py-3 ${
                                isCurrent
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-[var(--border-line-rt)] bg-[var(--bg-soft-rt)]'
                              }`}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  {showEntryContainerChip ? (
                                    <div className="mb-2">
                                      <ContainerChip container={entryContainer} />
                                    </div>
                                  ) : null}
                                  <p className="text-[15px] leading-relaxed text-[var(--text-main-rt)] sm:text-[18px]">
                                    {timerStep.groupStepText ?? resolveTimerPrimaryText(timerStep)}
                                  </p>
                                  <StepIngredientsList ingredients={timerStep.ingredients} stepText={timerStep.groupStepText ?? resolveTimerPrimaryText(timerStep)} allIngredients={recipe.ingredients} />
                                  {resultStep && shouldShowResultFeedback(resultStep) ? (
                                    <p className="mt-2 text-sm text-[var(--text-muted-rt)] sm:text-base">
                                      → {normalizeResultFeedbackText(resultStep.text)}
                                    </p>
                                  ) : null}
                                </div>
                                <button
                                  onClick={() => openTimer(timerStep.id)}
                                  className={`rt-timer-btn ${
                                    isRunning ? 'running' : isDone ? 'done' : ''
                                  }`}
                                >
                                  <Clock3 size={16} />
                                  <span>{isRunning ? 'Ver timer' : isDone ? 'Timer listo' : timerLabel}</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        const actionStep = entry.action;
                        const timerStep = entry.timer ?? (actionStep.timer ? actionStep : undefined);
                        const resultStep = entry.result;
                        const isRunning = timerStep ? timers[timerStep.id]?.running : false;
                        const isDone = timerStep ? timers[timerStep.id]?.done : false;
                        const isCurrent = currentFocusStepId === actionStep.id || (timerStep ? currentFocusStepId === timerStep.id : false);
                        const timerLabel = timerStep ? getTimerLabel(timerStep.id) : null;

                        return (
                          <div
                            key={`group-subunit-${actionStep.id}`}
                            className={`rounded-2xl border px-4 py-3 ${
                              isCurrent
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-[var(--border-line-rt)] bg-[var(--bg-soft-rt)]'
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                {showEntryContainerChip ? (
                                  <div className="mb-2">
                                    <ContainerChip container={entryContainer} />
                                  </div>
                                ) : null}
                                <p className="text-[15px] leading-relaxed text-[var(--text-main-rt)] sm:text-[18px]">
                                  {actionStep.groupStepText ?? actionStep.text}
                                </p>
                                <StepIngredientsList ingredients={actionStep.ingredients} stepText={actionStep.groupStepText ?? actionStep.text} allIngredients={recipe.ingredients} />
                                {resultStep && shouldShowResultFeedback(resultStep) ? (
                                  <p className="mt-2 text-sm text-[var(--text-muted-rt)] sm:text-base">
                                    → {normalizeResultFeedbackText(resultStep.text)}
                                  </p>
                                ) : null}
                              </div>
                              {timerStep ? (
                                <button
                                  onClick={() => openTimer(timerStep.id)}
                                  className={`rt-timer-btn ${
                                    isRunning ? 'running' : isDone ? 'done' : ''
                                  }`}
                                >
                                  <Clock3 size={16} />
                                  <span>{isRunning ? 'Ver timer' : isDone ? 'Timer listo' : timerLabel}</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (unit.kind === 'fallback') {
                const step = unit.step;
                const timerLabel = step.timer ? getTimerLabel(step.id) : null;
                const isRunning = step.timer ? timers[step.id]?.running : false;
                const isDone = step.timer ? timers[step.id]?.done : false;
                const isCurrent = currentFocusStepId === step.id;
                const isResult = isResultStep(step);
                const isSuggested = suggestion?.nextStep?.id === step.id;
                return (
                  <div
                    key={`fallback-${step.id}`}
                    id={`step-${step.id}`}
                    className={`relative flex flex-col gap-4 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:border-t sm:py-5 ${
                      unitIndex === 0 ? 'sm:border-t-0 sm:pt-0' : 'sm:border-stone-200'
                    } ${isSuggested ? 'scroll-mt-28' : ''}`}
                  >
                    {isResult && shouldShowResultFeedback(step) ? (
                      <div className="w-full rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/70 px-4 py-4 sm:max-w-4xl sm:rounded-none sm:border-0 sm:border-l-[3px] sm:border-amber-300">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                          <Sparkles size={13} />
                          Resultado
                        </div>
                        <p className="font-editorial text-[22px] italic leading-[1.25] tracking-[-0.02em] text-stone-700 sm:text-[30px]">
                          {normalizeResultFeedbackText(step.text)}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`flex min-w-0 flex-1 items-start gap-4 rounded-[24px] px-4 py-4 transition sm:rounded-none sm:px-0 sm:py-0 ${
                            isCurrent
                              ? 'bg-amber-50 ring-1 ring-amber-200 sm:bg-transparent sm:ring-0'
                              : 'bg-white ring-1 ring-stone-200 sm:bg-transparent sm:ring-0'
                          }`}
                        >
                          <div className="w-12 shrink-0 pt-0.5">
                            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold tabular-nums ring-1 bg-stone-100 text-stone-600 ring-stone-200">
                              --
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            {showContainerChip ? (
                              <div className="mb-2">
                                <ContainerChip container={unitContainer} />
                              </div>
                            ) : null}
                            <p className="max-w-4xl text-[19px] font-medium leading-[1.28] tracking-[-0.02em] text-stone-900 sm:text-[31px]">
                              {step.text}
                            </p>
                            <StepIngredientsList ingredients={step.ingredients} stepText={step.text} allIngredients={recipe.ingredients} />
                            {step.timer ? (
                              <button
                                onClick={() => openTimer(step.id)}
                                className={`rt-timer-btn w-full justify-between ${isRunning ? 'running' : isDone ? 'done' : ''}`}
                              >
                                <span className="inline-flex items-center gap-3">
                                  <Clock3 size={18} />
                                  {isRunning ? 'Ver timer' : isDone ? 'Timer listo' : 'Abrir timer'}
                                </span>
                                <span>{timerLabel}</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {step.timer ? (
                          <button
                            onClick={() => openTimer(step.id)}
                            className={`rt-timer-btn hidden sm:inline-flex ${isRunning ? 'running' : isDone ? 'done' : ''}`}
                          >
                            <Clock3 size={18} />
                            <span>{isRunning ? timerLabel : isDone ? 'Timer listo' : timerLabel}</span>
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              }

              if (unit.kind === 'timer_unit') {
                const timerStep = unit.timer;
                const resultStep = unit.result;
                const timerLabel = getTimerLabel(timerStep.id);
                const primaryText = resolveTimerPrimaryText(timerStep);
                const isRunning = timers[timerStep.id]?.running;
                const isDone = timers[timerStep.id]?.done;
                const isCurrent = currentFocusStepId === timerStep.id;
                const isSuggested = suggestion?.nextStep?.id === timerStep.id;
                const actionNumber = getVisibleExecutionUnitNumber(executionUnits, unitIndex);

                return (
                  <div
                    key={`timer-unit-${timerStep.id}`}
                    id={`step-${timerStep.id}`}
                    className={`relative flex flex-col gap-4 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:border-t sm:py-5 ${
                      unitIndex === 0 ? 'sm:border-t-0 sm:pt-0' : 'sm:border-stone-200'
                    } ${isSuggested ? 'scroll-mt-28' : ''}`}
                  >
                    <div
                      className={`flex min-w-0 flex-1 items-start gap-4 rounded-[24px] px-4 py-4 transition sm:rounded-none sm:px-0 sm:py-0 ${
                        isCurrent
                          ? 'bg-amber-50 ring-1 ring-amber-200 sm:bg-transparent sm:ring-0'
                          : 'bg-white ring-1 ring-stone-200 sm:bg-transparent sm:ring-0'
                      }`}
                    >
                      <div className="w-12 shrink-0 pt-0.5">
                        <span
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold tabular-nums ring-1 ${
                            isSuggested
                              ? 'bg-amber-100 text-amber-900 ring-amber-200'
                              : isRunning
                              ? 'bg-stone-900 text-white ring-stone-900'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                              : 'bg-stone-100 text-stone-600 ring-stone-200'
                          }`}
                        >
                          {String(actionNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        {showContainerChip ? (
                          <div className="mb-2">
                            <ContainerChip container={unitContainer} />
                          </div>
                        ) : null}
                        <p className="max-w-4xl text-[19px] font-medium leading-[1.28] tracking-[-0.02em] text-stone-900 sm:text-[31px]">
                          {cleanupStepText(primaryText)}
                        </p>
                        <StepIngredientsList ingredients={timerStep.ingredients} stepText={cleanupStepText(primaryText)} allIngredients={recipe.ingredients} />

                        <button
                          onClick={() => openTimer(timerStep.id)}
                          className={`mt-4 inline-flex min-h-14 w-full items-center justify-between gap-3 rounded-full border px-5 py-3 text-base font-semibold transition active:scale-[0.99] sm:hidden ${
                            isRunning
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : isDone
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-stone-300 bg-stone-100 text-stone-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <Clock3 size={18} />
                            {isRunning ? 'Ver timer' : isDone ? 'Timer listo' : 'Abrir timer'}
                          </span>
                          <span>{timerLabel}</span>
                        </button>

                        {resultStep && shouldShowResultFeedback(resultStep) ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:text-base">
                            <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                              <Sparkles size={12} />
                              Resultado
                            </span>
                            <span>{normalizeResultFeedbackText(resultStep.text)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => openTimer(timerStep.id)}
                      className={`hidden min-h-14 shrink-0 items-center gap-3 self-start rounded-full border px-5 py-3 text-base font-semibold transition active:scale-[0.99] sm:inline-flex ${
                        isRunning
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : isDone
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-stone-300 bg-stone-100 text-stone-800 hover:border-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      <Clock3 size={18} />
                      <span>{isRunning ? timerLabel : isDone ? 'Timer listo' : timerLabel}</span>
                    </button>
                  </div>
                );
              }

              const action = unit.action;
              const timerStep = unit.timer;
              const resultStep = unit.result;
              const inlineTimerStep = action.timer && !timerStep ? action : timerStep ?? null;
              const timerLabel = inlineTimerStep ? getTimerLabel(inlineTimerStep.id) : null;
              const isRunning = inlineTimerStep ? timers[inlineTimerStep.id]?.running : false;
              const isDone = inlineTimerStep ? timers[inlineTimerStep.id]?.done : false;
              const isSuggested = suggestion?.nextStep?.id === action.id || (timerStep ? suggestion?.nextStep?.id === timerStep.id : false);
              const isCurrent = currentFocusStepId === action.id || (timerStep ? currentFocusStepId === timerStep.id : false);
              const actionNumber = getVisibleExecutionUnitNumber(executionUnits, unitIndex);

              return (
                <div
                  key={`unit-${action.id}`}
                  id={`step-${action.id}`}
                  className={`relative flex flex-col gap-4 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:border-t sm:py-5 ${
                    unitIndex === 0 ? 'sm:border-t-0 sm:pt-0' : 'sm:border-stone-200'
                  } ${isSuggested ? 'scroll-mt-28' : ''}`}
                >
                  <div
                    className={`flex min-w-0 flex-1 items-start gap-4 rounded-[24px] px-4 py-4 transition sm:rounded-none sm:px-0 sm:py-0 ${
                      isCurrent
                        ? 'bg-amber-50 ring-1 ring-amber-200 sm:bg-transparent sm:ring-0'
                        : 'bg-white ring-1 ring-stone-200 sm:bg-transparent sm:ring-0'
                    }`}
                  >
                    <div className="w-12 shrink-0 pt-0.5">
                      <span
                        className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold tabular-nums ring-1 ${
                          isSuggested
                            ? 'bg-amber-100 text-amber-900 ring-amber-200'
                            : isRunning
                            ? 'bg-stone-900 text-white ring-stone-900'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                            : 'bg-stone-100 text-stone-600 ring-stone-200'
                        }`}
                      >
                        {String(actionNumber).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {showContainerChip ? (
                        <div className="mb-2">
                          <ContainerChip container={unitContainer} />
                        </div>
                      ) : null}
                      {isCurrent ? (
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          {isRunning ? 'En curso' : isSuggested ? 'Sigue aquí' : 'Paso actual'}
                        </div>
                      ) : null}
                      <p className="max-w-4xl text-[19px] font-medium leading-[1.28] tracking-[-0.02em] text-stone-900 sm:text-[31px]">
                        {cleanupStepText(action.text)}
                      </p>
                      <StepIngredientsList ingredients={action.ingredients} stepText={cleanupStepText(action.text)} allIngredients={recipe.ingredients} />

                      {inlineTimerStep ? (
                        <button
                          onClick={() => openTimer(inlineTimerStep.id)}
                          className={`mt-4 inline-flex min-h-14 w-full items-center justify-between gap-3 rounded-full border px-5 py-3 text-base font-semibold transition active:scale-[0.99] sm:hidden ${
                            isRunning
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : isDone
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-stone-300 bg-stone-100 text-stone-800'
                          }`}
                        >
                          <span className="inline-flex items-center gap-3">
                            <Clock3 size={18} />
                            {isRunning ? 'Ver timer' : isDone ? 'Timer listo' : 'Abrir timer'}
                          </span>
                          <span>{timerLabel}</span>
                        </button>
                      ) : null}

                      {resultStep && shouldShowResultFeedback(resultStep) ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:text-base">
                            <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                              <Sparkles size={12} />
                              Resultado
                            </span>
                            <span>{normalizeResultFeedbackText(resultStep.text)}</span>
                          </div>
                        ) : null}
                      </div>
                  </div>

                  {inlineTimerStep ? (
                    <button
                      onClick={() => openTimer(inlineTimerStep.id)}
                      className={`hidden min-h-14 shrink-0 items-center gap-3 self-start rounded-full border px-5 py-3 text-base font-semibold transition active:scale-[0.99] sm:inline-flex ${
                        isRunning
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : isDone
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-stone-300 bg-stone-100 text-stone-800 hover:border-stone-400 hover:bg-stone-200'
                      }`}
                    >
                      <Clock3 size={18} />
                      <span>{isRunning ? timerLabel : isDone ? 'Timer listo' : timerLabel}</span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="fixed-runtime-scope rt-main-viewport" style={{ paddingTop: 0 }}>
      {/* We keep the inner style for Newsreader font if needed, though most classes apply out of the box */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Newsreader:opsz,wght@6..72,300..700&display=swap');
        .font-ui { font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .font-editorial { font-family: 'Newsreader', Georgia, serif; }
      `}</style>

      {/* Cinematic Header */}
      <div 
        className="rt-cinematic-header group relative overflow-hidden" 
        style={{ backgroundImage: `url('${recipeImages[recipe.id] || 'https://images.unsplash.com/photo-1544025162-811114cd354c?auto=format&fit=crop&w=1200&q=80'}')` }}
      >
        {/* Soft gradient just for UI legibility at the very top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 z-0 pointer-events-none" />
        
        <div className="absolute left-4 right-4 top-4 flex justify-between z-10 sm:left-6 sm:right-6 sm:top-6">
          <button onClick={onExit} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 font-bold text-white backdrop-blur-md transition hover:bg-black/50 hover:scale-105 active:scale-95 shadow-sm">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="hidden lg:flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-black/50 disabled:opacity-50 shadow-sm"
            >
              <Camera size={16} />
              <span>{isUploadingImage ? 'Subiendo...' : 'Editar portada'}</span>
            </button>
            <button
              onClick={() => downloadRecipeAsJson(recipeJson)}
              className="flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-black/50 shadow-sm"
            >
              <ArrowDown size={16} />
              <span className="hidden sm:inline">JSON</span>
            </button>
          </div>
        </div>

        {/* Mobile floating button at bottom right (less intrusive) */}
        <div className="absolute bottom-4 right-4 z-10 sm:bottom-6 sm:right-6 lg:hidden">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2.5 text-[13px] font-bold text-white backdrop-blur-md shadow-lg disabled:opacity-50 transition active:scale-95"
          >
            <Camera size={16} />
            <span>{isUploadingImage ? 'Subiendo...' : 'Portada'}</span>
          </button>
        </div>
      </div>

      <div className="rt-view-container relative z-20 pb-40">
        <div className="mb-10 mt-8 sm:mt-12 text-center sm:text-left">
          <h1 className="font-editorial text-[42px] font-medium leading-[1.05] tracking-[-0.02em] text-[#23180f] sm:text-[56px] lg:text-[72px]">
            {recipe.title}
          </h1>
          <p className="mt-4 text-[16px] font-semibold tracking-wide uppercase text-[#8c7a6b] sm:text-[18px]">
            {recipe.recipeCategory} {recipe.recipeCategory && '·'} {recipe.yield ? `Rinde: ${recipe.yield} · ` : ''}{recipe.servings} porciones
          </p>
        </div>

        <div className="flex flex-col gap-6 sm:gap-10">
          




          {/* Ingredients View (Inline on all screens) */}
          <div className="rt-focused-preparation">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-editorial text-[32px] font-medium tracking-tight text-[#23180f] sm:text-[42px]">🧺 Ingredientes</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipe.ingredients.map((group) => (
                <section key={group.title} className="w-full rounded-2xl bg-[var(--bg-soft-rt)] p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="text-xl">{group.icon}</div>
                    <h3 className="font-editorial text-[22px] font-medium tracking-tight text-[#23180f]">
                      {group.title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li key={`${item.shoppingKey ?? item.canonicalName}-${item.name}`} className="text-[15px] font-medium leading-relaxed text-[#5f5245]">
                        {formatIngredientLine(item)}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          {/* Phases View */}
          <div className="rt-focused-preparation mt-10">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-editorial text-[32px] font-medium tracking-tight text-[#23180f] sm:text-[42px]">🍳 Fases</h2>
                <div className="flex bg-[var(--bg-soft-rt)] rounded-full p-1">
                  <button
                    onClick={() => setPhasesView('runtime')}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${phasesView === 'runtime' ? 'bg-white text-[var(--primary-rt)] shadow-sm' : 'text-[var(--text-muted-rt)]'}`}
                  >
                    Runtime
                  </button>
                  <button
                    onClick={() => setPhasesView('guide')}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${phasesView === 'guide' ? 'bg-white text-[var(--primary-rt)] shadow-sm' : 'text-[var(--text-muted-rt)]'}`}
                  >
                    Guía IA
                  </button>
                </div>
              </div>

              {phasesView === 'runtime' ? (
                recipe.phases.map((phase) => (
                  <PhaseSection key={phase.id} phase={phase} />
                ))
              ) : (
                <div className="space-y-8 py-6 sm:py-10">
                  {recipe.phases.map((phase) => (
                    <section key={`${phase.id}-guide`} className="rounded-3xl border border-stone-200 bg-white px-5 py-5 sm:px-7 sm:py-7">
                      <h3 className="font-editorial text-[30px] leading-tight tracking-[-0.03em] text-stone-950 sm:text-[40px]">
                        {phase.emoji} {phase.number}: {phase.title}
                      </h3>
                      <div className="mt-4 space-y-3">
                        {buildPhaseRenderBlocks(buildExecutionUnits(phase.steps)).map((block, index, blocks) => {
                          const previousBlock = index > 0 ? blocks[index - 1] : undefined;
                          const previousBlockContainer = previousBlock
                            ? resolveExecutionUnitContainer(previousBlock.kind === 'group' ? previousBlock.header : previousBlock.unit)
                            : undefined;
                          if (block.kind === 'group') {
                            return (
                              <div key={`${block.header.action.id}-guide-group`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                                <p className="text-[18px] font-semibold leading-relaxed text-stone-900 sm:text-[22px]">
                                  {index + 1}. {block.header.action.groupTitle ?? block.header.action.text}
                                </p>
                                <div className="mt-3 space-y-2">
                                  {block.subunits.map((entry, entryIndex) => {
                                    if (entry.kind === 'fallback') return null;
                                    const entryContainer = resolveExecutionUnitContainer(entry);
                                    const previousEntryContainer = entryIndex === 0
                                      ? previousBlockContainer
                                      : resolveExecutionUnitContainer(block.subunits[entryIndex - 1]);
                                    const showEntryContainerChip = shouldShowContainerTransition(entryContainer, previousEntryContainer);
                                    if (entry.kind === 'timer_unit') {
                                      const timerText = entry.timer.timer ? formatTime(entry.timer.timer) : null;
                                      return (
                                        <div key={`${entry.timer.id}-guide-group-substep`} className="rounded-xl bg-white px-4 py-3">
                                          {showEntryContainerChip ? <ContainerChip container={entryContainer} /> : null}
                                          <p className="text-[16px] leading-relaxed text-stone-800 sm:text-[20px]">
                                            {entry.timer.groupStepText ?? resolveTimerPrimaryText(entry.timer)}
                                          </p>
                                          <StepIngredientsList ingredients={entry.timer.ingredients} stepText={entry.timer.groupStepText ?? resolveTimerPrimaryText(entry.timer)} allIngredients={recipe.ingredients} />
                                          {timerText ? (
                                            <p className="mt-1 text-[15px] font-semibold text-stone-900 sm:text-[18px]">
                                              ⏱ {timerText}
                                            </p>
                                          ) : null}
                                          {entry.result ? (
                                            <p className="mt-1 text-[16px] leading-relaxed text-stone-700 sm:text-[20px]">
                                              → {normalizeResultFeedbackText(entry.result.text)}
                                            </p>
                                          ) : null}
                                        </div>
                                      );
                                    }

                                    const action = entry.action;
                                    const timerStep = entry.timer ?? (action.timer ? action : undefined);
                                    const timerText = timerStep?.timer ? formatTime(timerStep.timer) : null;
                                    return (
                                      <div key={`${action.id}-guide-group-substep`} className="rounded-xl bg-white px-4 py-3">
                                        {showEntryContainerChip ? <ContainerChip container={entryContainer} /> : null}
                                        <p className="text-[16px] leading-relaxed text-stone-800 sm:text-[20px]">
                                          {action.groupStepText ?? action.text}
                                        </p>
                                        <StepIngredientsList ingredients={action.ingredients} stepText={action.groupStepText ?? action.text} allIngredients={recipe.ingredients} />
                                        {timerText ? (
                                          <p className="mt-1 text-[15px] font-semibold text-stone-900 sm:text-[18px]">
                                            ⏱ {timerText}
                                          </p>
                                        ) : null}
                                        {entry.result ? (
                                          <p className="mt-1 text-[16px] leading-relaxed text-stone-700 sm:text-[20px]">
                                            → {normalizeResultFeedbackText(entry.result.text)}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          const unit = block.unit;
                          const unitContainer = resolveExecutionUnitContainer(unit);
                          const showContainerChip = shouldShowContainerTransition(unitContainer, previousBlockContainer);
                          if (unit.kind === 'fallback') {
                            const fallback = unit.step;
                            const fallbackTimer = fallback.timer ? formatTime(fallback.timer) : null;
                            if (isResultStep(fallback)) {
                              return (
                                <p key={`${fallback.id}-guide-fallback-result`} className="text-[18px] leading-relaxed text-stone-700 sm:text-[22px]">
                                  → {normalizeResultFeedbackText(fallback.text)}
                                </p>
                              );
                            }
                            if (fallbackTimer) {
                              return (
                                <div key={`${fallback.id}-guide-fallback-timer`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                                  {showContainerChip ? <ContainerChip container={unitContainer} /> : null}
                                  <p className="text-[18px] leading-relaxed text-stone-800 sm:text-[22px]">{fallback.text}</p>
                                  <StepIngredientsList ingredients={fallback.ingredients} stepText={fallback.text} allIngredients={recipe.ingredients} />
                                  <p className="mt-1 text-[15px] font-semibold text-stone-700 sm:text-[18px]">⏱ {fallbackTimer}</p>
                                </div>
                              );
                            }
                            return (
                              <div key={`${fallback.id}-guide-fallback-action`}>
                                <p className="text-[18px] leading-relaxed text-stone-800 sm:text-[22px]">
                                  {showContainerChip ? <><ContainerChip container={unitContainer} /> </> : null}
                                  {fallback.text}
                                </p>
                                <StepIngredientsList ingredients={fallback.ingredients} stepText={fallback.text} allIngredients={recipe.ingredients} />
                              </div>
                            );
                          }
                          if (unit.kind === 'timer_unit') {
                            const timerText = unit.timer.timer ? formatTime(unit.timer.timer) : null;
                            const primaryText = resolveTimerPrimaryText(unit.timer);
                            const actionNumber = index + 1;
                            return (
                              <div key={`${unit.timer.id}-guide-timer-unit`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                                {showContainerChip ? <ContainerChip container={unitContainer} /> : null}
                                <p className="text-[18px] leading-relaxed text-stone-800 sm:text-[22px]">
                                  {actionNumber}. {primaryText}
                                </p>
                                <StepIngredientsList ingredients={unit.timer.ingredients} stepText={primaryText} allIngredients={recipe.ingredients} />
                                {timerText ? (
                                  <p className="mt-1 text-[15px] font-semibold text-stone-900 sm:text-[18px]">
                                    ⏱ {timerText}
                                  </p>
                                ) : null}
                                {unit.result ? (
                                  <p className="mt-1 text-[16px] leading-relaxed text-stone-700 sm:text-[20px]">
                                    → {normalizeResultFeedbackText(unit.result.text)}
                                  </p>
                                ) : null}
                              </div>
                            );
                          }
                          const action = unit.action;
                          const timerStep = unit.timer ?? (action.timer ? action : undefined);
                          const timerText = timerStep?.timer ? formatTime(timerStep.timer) : null;
                          const actionNumber = index + 1;
                          return (
                            <div key={`${action.id}-guide-unit`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                              {showContainerChip ? <ContainerChip container={unitContainer} /> : null}
                              <p className="text-[18px] leading-relaxed text-stone-800 sm:text-[22px]">
                                {actionNumber}. {action.text}
                              </p>
                              <StepIngredientsList ingredients={action.ingredients} stepText={action.text} allIngredients={recipe.ingredients} />
                              {timerText ? (
                                <p className="mt-1 text-[15px] font-semibold text-stone-900 sm:text-[18px]">
                                  ⏱ {timerText}
                                </p>
                              ) : null}
                              {unit.result ? (
                                <p className="mt-1 text-[16px] leading-relaxed text-stone-700 sm:text-[20px]">
                                  → {normalizeResultFeedbackText(unit.result.text)}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>





      {runningTimers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:px-0 sm:pb-4 sm:pt-0">
          <div className="rounded-[28px] border border-stone-300 bg-white/96 px-4 py-3 shadow-lg backdrop-blur sm:rounded-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleRunningTimer(runningTimers[0].id)}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-700 text-white shadow-sm active:scale-[0.99]"
              >
                {runningTimers[0].running ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={() => openTimer(runningTimers[0].id)}
                className="min-h-14 min-w-0 flex-1 rounded-full px-1 text-left active:scale-[0.99]"
              >
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {runningTimers[0].step.phaseTitle}
                  {runningTimers.length > 1 ? ` · +${runningTimers.length - 1} más` : ''}
                </p>
                <p className="truncate text-[15px] font-semibold text-stone-900 sm:text-base">
                  {runningTimers[0].step.text}
                </p>
              </button>

              <div className="shrink-0 rounded-full bg-stone-100 px-4 py-2 text-lg font-bold tabular-nums text-stone-950 ring-1 ring-stone-200 sm:text-xl">
                {formatTime(runningTimers[0].remaining)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTimerId && activeTimer ? (() => {
        const isPreAlarm = activeTimer.running && activeTimer.remaining <= PRE_ALARM_SECONDS && activeTimer.remaining > 0 && activeTimer.duration > PRE_ALARM_SECONDS;
        return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
          <div className={`w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:p-8 ${isPreAlarm ? 'rt-timer-pre-alarm' : ''}`}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {stepMetaMap[activeTimerId]?.phaseTitle}
                </p>
                <h3 className={`mt-2 text-[40px] font-semibold tracking-tight tabular-nums sm:text-4xl ${isPreAlarm ? 'text-amber-600' : activeTimer.done ? 'text-emerald-700' : 'text-stone-950'}`}>
                  {formatTime(activeTimer.remaining)}
                </h3>
              </div>
              <button
                onClick={() => setActiveTimerId(null)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 active:scale-[0.99]"
                aria-label="Cerrar timer"
              >
                <X size={20} />
              </button>
            </div>

            {isPreAlarm ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-800">
                <span className="text-lg">⚠️</span>
                <span>¡Faltan {activeTimer.remaining} segundos!</span>
              </div>
            ) : null}

            <p className="mb-6 text-[24px] font-medium leading-[1.15] text-stone-900 sm:text-2xl">
              {stepMetaMap[activeTimerId]?.text}
            </p>

            <div className="mb-7 h-[4px] w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-[4px] rounded-full transition-all ${isPreAlarm ? 'bg-amber-500' : activeTimer.done ? 'bg-emerald-500' : 'bg-amber-700'}`}
                style={{
                  width: `${((activeTimer.duration - activeTimer.remaining) / activeTimer.duration) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => (activeTimer.running ? pauseTimer(activeTimerId) : startTimer(activeTimerId))}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-amber-700 px-5 py-4 text-base font-semibold text-white transition hover:bg-amber-800 active:scale-[0.99]"
              >
                {activeTimer.running ? <Pause size={18} /> : <Play size={18} />}
                {activeTimer.running ? 'Pausar' : activeTimer.done ? 'Reiniciar' : 'Iniciar'}
              </button>
              <button
                onClick={() => resetTimer(activeTimerId)}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-stone-300 px-5 py-4 text-base font-semibold text-stone-700 transition hover:bg-stone-50 active:scale-[0.99]"
              >
                <TimerReset size={18} />
                Reiniciar
              </button>
            </div>
          </div>
        </div>
        );
      })() : null}

      {suggestion ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/25 sm:items-center sm:p-4">
          <div className="w-full rounded-t-[28px] bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-[28px] sm:p-7">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200 sm:hidden" />
            <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <ArrowDown size={18} />
              </div>
              <span>Ahora sigue con</span>
            </div>

            <div className="mb-5 border-y border-stone-200 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                {suggestion.nextStep.phaseTitle}
              </p>
              <p className="text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-stone-950 sm:text-[34px]">
                {suggestion.nextStep.text}
              </p>
              <p className="mt-4 text-sm text-stone-500">
                Antes: {suggestion.fromStep.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSuggestionContinue}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-amber-700 px-5 py-4 text-base font-semibold text-white transition hover:bg-amber-800 active:scale-[0.99]"
              >
                {suggestion.nextStep.timer ? 'Iniciar timer' : 'Continuar'}
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-stone-300 px-5 py-4 text-base font-semibold text-stone-700 transition hover:bg-stone-50 active:scale-[0.99]"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FixedRuntimeApp({ pathname, navigate, userId }: FixedRuntimeAppProps) {
  const parsedRoute = parseFixedRuntimeRoute(pathname);
  const runtimePersistenceEnabled = Boolean(isSupabaseEnabled && userId && FIXED_RUNTIME_STORAGE_MODE === 'supabase');
  const [baseRecipes, setBaseRecipes] = useState<FixedRecipeJson[]>([]);
  const [importedRecipes, setImportedRecipes] = useState<FixedRecipeJson[]>([]);
  const [recipeImages, setRecipeImages] = useState<Record<string, string>>(() => {
    try {
      const raw = window.localStorage.getItem('RUNTIME_RECIPE_IMAGES');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const updateRecipeImage = (id: string, url: string) => {
    setRecipeImages(prev => {
      const next = { ...prev, [id]: url };
      window.localStorage.setItem('RUNTIME_RECIPE_IMAGES', JSON.stringify(next));
      return next;
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<FixedRecipeGuidelineIssue[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [sessionPreviewRecipe, setSessionPreviewRecipe] = useState<FixedRecipeJson | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isPreviewingAI, setIsPreviewingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [aiDiagnostics, setAiDiagnostics] = useState<string | null>(null);
  const [aiPreviewError, setAiPreviewError] = useState<string | null>(null);
  const [aiPreviewText, setAiPreviewText] = useState<string | null>(null);
  const [aiPreviewRetryApplied, setAiPreviewRetryApplied] = useState(false);
  const [aiPreviewJson, setAiPreviewJson] = useState<{
    rawModelOutput: string;
    parsedJson: unknown | null;
    schemaValidation: {
      valid: boolean;
      errors: Array<{ path: string; message: string; keyword: string }>;
    };
    parseError?: string;
    normalizedOutput?: unknown;
    normalizationError?: string;
  } | null>(null);
  const [aiPreviewDebug, setAiPreviewDebug] = useState<{
    instructions?: string[];
    userPrompt?: string;
    composedPromptForGoogle?: string;
    generationContractTemplate?: string;
    generationContractEffective?: string;
  } | null>(null);
  const [aiPreviewRuntimeDebugRaw, setAiPreviewRuntimeDebugRaw] = useState<unknown>(null);
  const [activeShellTab, setActiveShellTab] = useState<ShellTab>('recipes');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [activeCategoryKey, setActiveCategoryKey] = useState('all');
  const [isPlanningSheetOpen, setIsPlanningSheetOpen] = useState(false);
  const [planningRecipeId, setPlanningRecipeId] = useState<string | null>(null);
  const [planningRecipeQuery, setPlanningRecipeQuery] = useState('');
  const [planningDay, setPlanningDay] = useState<ShellDay>('Lunes');
  const [planningMoment, setPlanningMoment] = useState<ShellMoment>('Almuerzo');
  const [plannedEntries, setPlannedEntries] = useState<PlannedRecipeEntry[]>([]);
  const [storageMode, setStorageMode] = useState<FixedRuntimeStorageMode>('local-fallback');
  const [shoppingUiState, setShoppingUiState] = useState<Record<string, ShoppingUiState>>({});
  const [shoppingScope, setShoppingScope] = useState<ShoppingScope>('weekly');
  const [shoppingStep, setShoppingStep] = useState<'list' | 'configure'>('list');
  const [weeklySelectedRecipeIds, setWeeklySelectedRecipeIds] = useState<string[]>([]);
  const knownWeeklyRecipeIdsRef = useRef<Set<string>>(new Set());
  const [extraSelectedRecipeIds, setExtraSelectedRecipeIds] = useState<string[]>([]);
  const [shoppingRecipeQuery, setShoppingRecipeQuery] = useState('');
  const [manualShoppingItems, setManualShoppingItems] = useState<ManualShoppingItemInput[]>([]);
  const [isManualSheetOpen, setIsManualSheetOpen] = useState(false);
  const [manualProductName, setManualProductName] = useState('');
  const [manualProductPrice, setManualProductPrice] = useState('');
  const [superMode, setSuperMode] = useState(false);
  const [expandedPlanDays, setExpandedPlanDays] = useState<Record<ShellDay, boolean>>(() =>
    buildInitialExpandedPlanDays(resolveTodayShellDay()),
  );
  const [shoppingCompleted, setShoppingCompleted] = useState(false);
  const [runtimePlanId, setRuntimePlanId] = useState<string | null>(null);
  const [runtimeShoppingListId, setRuntimeShoppingListId] = useState<string | null>(null);
  const [persistedShoppingItems, setPersistedShoppingItems] = useState<ShoppingListItem[]>([]);
  const [shellToast, setShellToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const weeklySelectionInitializedRef = useRef(false);
  const previewObservatory = useMemo(
    () => buildPreviewObservatory(aiPreviewRuntimeDebugRaw),
    [aiPreviewRuntimeDebugRaw],
  );

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await loadFixedRuntimeCatalog(userId);
        if (cancelled) return;
        setStorageMode(payload.storageMode);
        setBaseRecipes(payload.baseRecipes);
        setImportedRecipes(payload.storageMode === 'supabase' ? payload.importedRecipes : readImportedRecipesFromStorage());
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar recetas fijas.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [runtimePersistenceEnabled, userId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeShellTab !== 'shopping') {
      setShoppingCompleted(false);
    }
  }, [activeShellTab]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LIBRARY_FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { query?: string; category?: string };
      if (typeof parsed.query === 'string') setLibraryQuery(parsed.query);
      if (typeof parsed.category === 'string') setActiveCategoryKey(parsed.category);
    } catch {
      // Ignore corrupt storage payloads.
    }
  }, []);

  useEffect(() => {
    const pendingToast = window.sessionStorage.getItem(RUNTIME_RETURN_TOAST_KEY);
    if (!pendingToast) return;
    window.sessionStorage.removeItem(RUNTIME_RETURN_TOAST_KEY);
    showShellToast(pendingToast);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(
      LIBRARY_FILTERS_STORAGE_KEY,
      JSON.stringify({
        query: libraryQuery,
        category: activeCategoryKey,
      }),
    );
  }, [activeCategoryKey, libraryQuery]);

  const recipes = useMemo(() => {
    const map = new Map<string, FixedRecipeJson>();
    baseRecipes.forEach((recipe) => map.set(recipe.id, recipe));
    importedRecipes.forEach((recipe) => map.set(recipe.id, recipe));
    if (sessionPreviewRecipe) {
      map.set(sessionPreviewRecipe.id, sessionPreviewRecipe);
    }
    if (map.size === 0 && (import.meta as any).env?.DEV) {
      DEV_RECIPES_FALLBACK.forEach((recipe) => map.set(recipe.id, recipe));
    }
    return Array.from(map.values());
  }, [baseRecipes, importedRecipes, sessionPreviewRecipe]);

  const selectedRecipe = useMemo(
    () => findFixedRecipeById(recipes, parsedRoute.recipeId),
    [recipes, parsedRoute.recipeId],
  );
  const importedRecipeIds = useMemo(() => new Set(importedRecipes.map((recipe) => recipe.id)), [importedRecipes]);
  const recipesById = useMemo(() => new Map(recipes.map((recipe) => [recipe.id, recipe])), [recipes]);
  const runtimeScreen: FixedRuntimeScreen = parsedRoute.mode ?? 'library';
  const categoryOptions = useMemo(
    () => buildLibraryCategoryOptions({ recipes, formatCategoryLabel: formatRecipeCategory }),
    [recipes],
  );
  const filteredRecipes = useMemo(
    () => filterLibraryRecipes({
      recipes,
      query: libraryQuery,
      activeCategoryKey,
      formatCategoryLabel: formatRecipeCategory,
    }),
    [recipes, libraryQuery, activeCategoryKey],
  );
  const weeklyResolvableEntries = useMemo(
    () => plannedEntries.filter((entry) => recipesById.has(entry.recipeId)),
    [plannedEntries, recipesById],
  );
  const persistedManualShoppingItems = useMemo<ManualShoppingItemInput[]>(
    () =>
      persistedShoppingItems
        .filter((item) => item.sourceType === 'manual')
        .map((item) => ({
          key: `manual:${item.id}`,
          name: item.itemName,
          quantityLabel: item.quantityText || 'Libre',
          checked: item.isChecked,
          persistedItemId: item.id,
        })),
    [persistedShoppingItems],
  );
  const shoppingRecipeResults = useMemo(
    () => filterLibraryRecipes({
      recipes,
      query: shoppingRecipeQuery,
      activeCategoryKey: 'all',
      formatCategoryLabel: formatRecipeCategory,
    }),
    [recipes, shoppingRecipeQuery],
  );
  const weeklyRecipeIds = useMemo(
    () => Array.from(new Set(weeklyResolvableEntries.map((entry) => entry.recipeId))),
    [weeklyResolvableEntries],
  );
  const selectedWeeklyRecipes = useMemo(
    () => weeklySelectedRecipeIds.flatMap((recipeId) => {
      const recipe = recipesById.get(recipeId);
      return recipe ? [recipe] : [];
    }),
    [recipesById, weeklySelectedRecipeIds],
  );
  const selectedExtraRecipes = useMemo(
    () => extraSelectedRecipeIds.flatMap((recipeId) => {
      const recipe = recipesById.get(recipeId);
      return recipe ? [recipe] : [];
    }),
    [extraSelectedRecipeIds, recipesById],
  );
  const shoppingRecipeSuggestions = useMemo(
    () =>
      shoppingRecipeResults
        .filter((recipe) => !weeklySelectedRecipeIds.includes(recipe.id) && !extraSelectedRecipeIds.includes(recipe.id))
        .slice(0, 6),
    [extraSelectedRecipeIds, shoppingRecipeResults, weeklySelectedRecipeIds],
  );
  const shoppingSourceEntries = useMemo(() => {
    if (shoppingScope === 'selected') {
      return extraSelectedRecipeIds
        .filter((recipeId) => recipesById.has(recipeId))
        .map((recipeId) => ({
          id: `shopping-extra-${recipeId}`,
          recipeId,
          day: resolveTodayShellDay(),
          moment: 'Almuerzo' as ShellMoment,
          createdAt: 0,
        }));
    }

    const selectedWeeklySet = new Set(weeklySelectedRecipeIds);
    const selectedExtraSet = new Set(extraSelectedRecipeIds.filter((recipeId) => !selectedWeeklySet.has(recipeId)));
    const weeklyEntries = weeklyResolvableEntries.filter((entry) => selectedWeeklySet.has(entry.recipeId));
    const extraEntries = Array.from(selectedExtraSet.values())
      .map((recipeId) => ({
        id: `shopping-extra-${recipeId}`,
        recipeId,
        day: resolveTodayShellDay(),
        moment: 'Almuerzo' as ShellMoment,
        createdAt: 0,
      }));
    return [...weeklyEntries, ...extraEntries];
  }, [extraSelectedRecipeIds, recipesById, shoppingScope, weeklyResolvableEntries, weeklySelectedRecipeIds]);
  const shellShoppingItems = useMemo(
    () =>
      buildShellShoppingItems(
        shoppingSourceEntries,
        recipesById,
        shoppingUiState,
        {
          manualItems: [...persistedManualShoppingItems, ...manualShoppingItems],
        },
      ),
    [manualShoppingItems, persistedManualShoppingItems, recipesById, shoppingSourceEntries, shoppingUiState],
  );
  const shoppingTotal = useMemo(
    () => shellShoppingItems.reduce((sum, item) => {
      const parsed = Number(item.price);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0),
    [shellShoppingItems],
  );
  const persistedShoppingByName = useMemo(
    () => new Map(persistedShoppingItems.map((item) => [shoppingNameKey(item.itemName), item])),
    [persistedShoppingItems],
  );
  const persistedShoppingById = useMemo(
    () => new Map(persistedShoppingItems.map((item) => [item.id, item])),
    [persistedShoppingItems],
  );
  const hasPlannedRecipes = plannedEntries.some((entry) => recipesById.has(entry.recipeId));
  const plannedEntriesByDay = useMemo(() => {
    const map = new Map<ShellDay, PlannedRecipeEntry[]>();
    SHELL_DAYS.forEach((day) => map.set(day, []));
    plannedEntries.forEach((entry) => {
      const list = map.get(entry.day) ?? [];
      list.push(entry);
      map.set(entry.day, list);
    });
    map.forEach((list, day) => {
      map.set(
        day,
        [...list].sort((a, b) => {
          const momentDiff = shellMomentSortValue(a.moment) - shellMomentSortValue(b.moment);
          if (momentDiff !== 0) return momentDiff;
          return a.createdAt - b.createdAt;
        }),
      );
    });
    return map;
  }, [plannedEntries]);

  useEffect(() => {
    if (categoryOptions.some((option) => option.key === activeCategoryKey)) return;
    setActiveCategoryKey('all');
  }, [activeCategoryKey, categoryOptions]);

  useEffect(() => {
    setWeeklySelectedRecipeIds((current) => {
      const nextSelection = new Set(current);
      let hasChanges = false;
      
      weeklyRecipeIds.forEach(id => {
        if (!knownWeeklyRecipeIdsRef.current.has(id)) {
          nextSelection.add(id);
          knownWeeklyRecipeIdsRef.current.add(id);
          hasChanges = true;
        }
      });

      const finalSelection = weeklyRecipeIds.filter(id => nextSelection.has(id));
      if (finalSelection.length !== current.length || hasChanges) {
        return finalSelection;
      }
      return current;
    });
  }, [weeklyRecipeIds]);

  useEffect(() => {
    if (!runtimePersistenceEnabled || !userId || isLoading || recipes.length === 0) return;
    let cancelled = false;
    const hydratePlanAndShopping = async () => {
      try {
        const runtimePlan = await ensureWeeklyPlan(userId, getWeekStartDate());
        if (cancelled) return;
        setRuntimePlanId(runtimePlan.id);
        const planItems = await getWeeklyPlanItems(runtimePlan.id);
        if (cancelled) return;
        const hydratedPlan = planItems.flatMap((item) => {
          if (!item.recipeId || !recipesById.has(item.recipeId)) return [];
          const day = indexToShellDay(item.dayOfWeek);
          if (!day) return [];
          return [{
            id: item.id,
            recipeId: item.recipeId,
            day,
            moment: slotToShellMoment(item.slot),
            persistedPlanItemId: item.id,
            createdAt: Date.parse(item.createdAt) || Date.now(),
          }];
        });
        setPlannedEntries(hydratedPlan);
        const shoppingList = await getOrCreateShoppingList(userId, runtimePlan.id);
        if (cancelled) return;
        setRuntimeShoppingListId(shoppingList.id);
        const listItems = await getShoppingListItems(shoppingList.id);
        if (cancelled) return;
        setPersistedShoppingItems(listItems);
        setShoppingUiState((current) => {
          const next = { ...current };
          const checkedByName = new Map(listItems.map((item) => [shoppingNameKey(item.itemName), item.isChecked]));
          const derivedItems = buildShellShoppingItems(hydratedPlan, recipesById, current);
          derivedItems.forEach((item) => {
            const nameKey = shoppingNameKey(item.name);
            const prev = next[item.key] ?? { checked: false, price: '' };
            next[item.key] = {
              checked: checkedByName.get(nameKey) ?? prev.checked,
              price: prev.price,
            };
          });
          listItems.forEach((item) => {
            const key = shoppingNameKey(item.itemName);
            const prev = next[key] ?? { checked: false, price: '' };
            next[key] = {
              checked: item.isChecked,
              price: prev.price,
            };
          });
          return next;
        });
      } catch (hydrateError) {
        if (!cancelled) {
          setError(hydrateError instanceof Error ? hydrateError.message : 'No se pudo hidratar plan/compras runtime.');
        }
      }
    };
    void hydratePlanAndShopping();
    return () => {
      cancelled = true;
    };
  }, [runtimePersistenceEnabled, userId, isLoading, recipes, recipesById]);

  useEffect(() => {
    if (runtimePersistenceEnabled) return;
    if (plannedEntries.length > 0 || recipes.length === 0) return;
    const defaults = recipes.slice(0, 2).map((recipe, index) => ({
      id: createPlannedEntryId(),
      recipeId: recipe.id,
      day: SHELL_DAYS[index] ?? 'Miércoles',
      moment: index === 1 ? 'Cena' as ShellMoment : 'Almuerzo' as ShellMoment,
      createdAt: Date.now() + index,
    }));
    setPlannedEntries(defaults);
  }, [plannedEntries.length, recipes, runtimePersistenceEnabled, userId]);

  const applyImportedRecipes = async (nextRecipes: FixedRecipeJson[], source: 'import' | 'ai' = 'import') => {
    if (runtimePersistenceEnabled && userId) {
      try {
        await upsertUserFixedRecipes({ userId, recipes: nextRecipes, source });
        const payload = await loadFixedRuntimeCatalog(userId);
        setBaseRecipes(payload.baseRecipes);
        setImportedRecipes(payload.storageMode === 'supabase' ? payload.importedRecipes : readImportedRecipesFromStorage());
        setImportSuccess(`Importación lista: ${nextRecipes.length} receta(s) cargada(s).`);
      } catch (persistError) {
        setImportError(
          persistError instanceof Error 
            ? persistError.message 
            : 'Fallo al guardar receta en la nube. Tus datos no se han sincronizado.'
        );
      }
    } else {
      setImportedRecipes(nextRecipes);
      persistImportedRecipesLocally(nextRecipes);
      setImportSuccess(`Importación lista: ${nextRecipes.length} receta(s) cargada(s).`);
    }
    setImportError(null);
    setImportWarnings(validateRecipesGuidelines(nextRecipes));
  };

  const showShellToast = (message: string) => {
    setShellToast(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setShellToast(null);
      toastTimeoutRef.current = null;
    }, 2400);
  };

  const openCreateRecipeScreen = () => {
    navigate('/runtime-fijo/nueva-receta');
  };

  const openPlanningSheet = (recipeId?: string, day?: ShellDay, moment?: ShellMoment) => {
    setIsPlanningSheetOpen(true);
    setPlanningRecipeId(recipeId ?? null);
    setPlanningRecipeQuery('');
    setPlanningDay(day ?? resolveTodayShellDay());
    setPlanningMoment(moment ?? 'Almuerzo');
  };

  const openPlanDaySheet = (day: ShellDay) => {
    openPlanningSheet(undefined, day, 'Almuerzo');
  };

  const selectPlanningRecipe = (recipeId: string) => {
    setPlanningRecipeId(recipeId);
    setPlanningRecipeQuery('');
  };

  const planningRecipeResults = filterLibraryRecipes({
    recipes,
    query: planningRecipeQuery,
    activeCategoryKey: 'all',
    formatCategoryLabel: formatRecipeCategory,
  });

  const closePlanningSheet = () => {
    setIsPlanningSheetOpen(false);
    setPlanningRecipeQuery('');
    setPlanningRecipeId(null);
    setPlanningMoment('Almuerzo');
  };

  const handleImportJsonString = async (rawJson: string) => {
    setImportSuccess(null);
    setImportError(null);
    try {
      const preview = buildImportPreview(rawJson);
      setImportPreview(preview);
      if (!preview.ok) {
        setImportError(preview.errors[0] ?? 'JSON inválido para importar.');
        return;
      }
      await applyImportedRecipes(preview.recipes, 'import');
      if (runtimeScreen === 'create') {
        showShellToast('Receta añadida al catálogo');
        navigate('/runtime-fijo');
      }
    } catch (parseError) {
      setImportError(parseError instanceof Error ? parseError.message : 'No se pudo leer el JSON.');
    }
  };

  const handleImportTextarea = async () => {
    const trimmed = importText.trim();
    if (!trimmed) {
      setImportError('Pega un JSON antes de importar.');
      setImportSuccess(null);
      setImportPreview(null);
      return;
    }
    await handleImportJsonString(trimmed);
  };

  const handlePreviewTextarea = () => {
    const trimmed = importText.trim();
    setImportSuccess(null);
    setImportError(null);
    if (!trimmed) {
      setImportPreview({
        ok: false,
        mode: 'invalid',
        parsedJson: null,
        recipes: [],
        errors: ['Pega un JSON para previsualizar.'],
      });
      return;
    }
    const preview = buildImportPreview(trimmed);
    setImportPreview(preview);
    if (!preview.ok) {
      setImportError(preview.errors[0] ?? 'JSON inválido para previsualizar.');
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    setImportSuccess(null);
    setImportError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setImportText(content);
      await handleImportJsonString(content);
    } catch {
      setImportError('No se pudo leer el archivo JSON.');
    } finally {
      event.target.value = '';
    }
  };

  const clearImportedRecipes = async () => {
    if (runtimePersistenceEnabled && userId) {
      try {
        await clearUserFixedRecipes(userId);
        const payload = await loadFixedRuntimeCatalog(userId);
        setBaseRecipes(payload.baseRecipes);
        setImportedRecipes(payload.storageMode === 'supabase' ? payload.importedRecipes : readImportedRecipesFromStorage());
      } catch (persistError) {
        setImportError(
          persistError instanceof Error 
            ? persistError.message 
            : 'Fallo al limpiar recetas en la nube.'
        );
      }
    } else {
      setImportedRecipes([]);
      window.localStorage.removeItem(IMPORTED_RECIPES_STORAGE_KEY);
    }
    setImportSuccess('Importaciones eliminadas. Se usa el catálogo local por defecto.');
    setImportError(null);
    setImportWarnings([]);
    setImportPreview(null);
  };

  const applyPreviewImport = async () => {
    if (!importPreview?.ok) {
      setImportError('Previsualiza un JSON válido antes de importar.');
      return;
    }
    await applyImportedRecipes(importPreview.recipes, 'import');
    setActiveShellTab('recipes');
    showShellToast('Receta añadida al catálogo');
    navigate('/runtime-fijo');
  };

  const runPreviewRecipe = () => {
    if (!importPreview?.ok || importPreview.recipes.length === 0) {
      setImportError('Previsualiza un JSON válido antes de ejecutar.');
      return;
    }
    const firstRecipe = importPreview.recipes[0];
    if (!firstRecipe) {
      setImportError('No hay receta válida en el preview.');
      return;
    }
    const runtimeId = firstRecipe.id.startsWith('preview-')
      ? firstRecipe.id
      : `preview-${firstRecipe.id}`;
    const runtimeTitle = firstRecipe.title.startsWith('[Preview] ')
      ? firstRecipe.title
      : `[Preview] ${firstRecipe.title}`;
    const runtimeRecipe: FixedRecipeJson = {
      ...firstRecipe,
      id: runtimeId,
      title: runtimeTitle,
    };
    setSessionPreviewRecipe(runtimeRecipe);
    setImportSuccess(`Preview listo: ${runtimeRecipe.title}.`);
    setImportError(null);
    navigate(`/runtime-fijo/${encodeURIComponent(runtimeRecipe.id)}`);
  };

  const handleGenerateWithAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError('Describe la receta que quieres crear con IA.');
      setAiSuccess(null);
      return;
    }

    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuccess(null);
    setAiDiagnostics(null);
    setAiPreviewError(null);
    setAiPreviewDebug(null);
    setAiPreviewRuntimeDebugRaw(null);
    setAiPreviewRetryApplied(false);
    setAiPreviewJson(null);
    try {
      const response = await authenticatedJsonFetch<{
        recipe: unknown;
        provider?: string;
        diagnostics?: {
          severity?: 'ok' | 'warning' | 'invalid';
          recoverableCount?: number;
          fatalCount?: number;
          codes?: string[];
          repairActions?: string[];
        };
      }>('/api/ai/fixed-recipe', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });

      const parsedRecipes = parseFixedRecipesJson([response.recipe]);
      const generatedRecipe = parsedRecipes[0];
      if (!generatedRecipe) {
        throw new Error('La IA no devolvió una receta válida.');
      }

      const recipeInstance = createGeneratedRecipeInstance(generatedRecipe, recipes);

      const mergedMap = new Map<string, FixedRecipeJson>();
      importedRecipes.forEach((recipe) => mergedMap.set(recipe.id, recipe));
      mergedMap.set(recipeInstance.id, recipeInstance);
      const mergedRecipes = Array.from(mergedMap.values());
      await applyImportedRecipes(mergedRecipes, 'ai');
      setAiSuccess(`Receta creada con IA: ${recipeInstance.title}`);
      if (response.diagnostics) {
        const severity = response.diagnostics.severity ?? 'ok';
        const recoverable = response.diagnostics.recoverableCount ?? 0;
        const fatal = response.diagnostics.fatalCount ?? 0;
        setAiDiagnostics(`Diagnóstico: ${severity} · recoverable=${recoverable} · fatal=${fatal}`);
      }
      setAiPrompt('');
      setActiveShellTab('recipes');
    } catch (generationError) {
      setAiError(generationError instanceof Error ? generationError.message : 'No se pudo generar la receta con IA.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePreviewWithAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiPreviewError('Describe la receta que quieres previsualizar.');
      setAiError(null);
      setAiSuccess(null);
      return;
    }

    setIsPreviewingAI(true);
    setAiPreviewError(null);
    setAiError(null);
    setAiSuccess(null);
    setAiDiagnostics(null);
    setAiPreviewDebug(null);
    setAiPreviewRuntimeDebugRaw(null);
    setAiPreviewJson(null);
    try {
      const response = await authenticatedJsonFetch<{
        previewText?: string;
        jsonPreview?: {
          rawModelOutput: string;
          parsedJson: unknown | null;
          schemaValidation: {
            valid: boolean;
            errors: Array<{ path: string; message: string; keyword: string }>;
          };
          parseError?: string;
          normalizedOutput?: unknown;
          normalizationError?: string;
        };
        provider?: string;
        previewDebug?: {
          instructions?: string[];
          userPrompt?: string;
          composedPromptForGoogle?: string;
          generationContractTemplate?: string;
          generationContractEffective?: string;
        };
        retryApplied?: boolean;
        debugRaw?: unknown;
      }>('/api/ai/fixed-recipe', {
        method: 'POST',
        body: JSON.stringify({ prompt, mode: 'preview', debugRaw: true }),
      });

      if (!response.jsonPreview) {
        throw new Error('La IA no devolvió JSON para la previsualización.');
      }
      const previewText = typeof response.previewText === 'string' ? response.previewText.trim() : '';
      setAiPreviewText(previewText || null);
      setAiPreviewJson(response.jsonPreview);
      setAiPreviewRetryApplied(Boolean(response.retryApplied));
      setAiPreviewDebug(response.previewDebug ?? null);
      setAiPreviewRuntimeDebugRaw(response.debugRaw ?? null);
    } catch (previewError) {
      setAiPreviewError(
        previewError instanceof Error ? previewError.message : 'No se pudo generar la previsualización.',
      );
    } finally {
      setIsPreviewingAI(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setAiSuccess('JSON copiado al portapapeles.');
    } catch {
      setAiPreviewError('No se pudo copiar al portapapeles.');
    }
  };

  const syncShoppingListFromEntries = async (entries: PlannedRecipeEntry[]) => {
    if (!runtimePersistenceEnabled || !userId || !runtimePlanId) return;
    const shoppingList = await getOrCreateShoppingList(userId, runtimePlanId);
    setRuntimeShoppingListId(shoppingList.id);
    const derivedItems = buildShellShoppingItems(entries, recipesById, shoppingUiState);
    await replaceShoppingListItems(
      shoppingList.id,
      derivedItems.map((item, index) => ({
        itemName: item.name,
        quantityText: item.quantityLabel || null,
        sourceRecipeId: item.recipeIds.length === 1 ? item.recipeIds[0] : null,
        sourcePlanItemId: null,
        sortOrder: index,
      })),
    );
    const refreshed = await getShoppingListItems(shoppingList.id);
    setPersistedShoppingItems(refreshed);
    setShoppingUiState((current) => {
      const next = { ...current };
      const checkedByName = new Map(refreshed.map((item) => [shoppingNameKey(item.itemName), item.isChecked]));
      derivedItems.forEach((item) => {
        const nameKey = shoppingNameKey(item.name);
        next[item.key] = {
          checked: checkedByName.get(nameKey) ?? current[item.key]?.checked ?? false,
          price: current[item.key]?.price ?? '',
        };
      });
      refreshed.forEach((item) => {
        const key = shoppingNameKey(item.itemName);
        next[key] = {
          checked: item.isChecked,
          price: next[key]?.price ?? '',
        };
      });
      return next;
    });
  };

  const confirmPlanning = async () => {
    if (!planningRecipeId) {
      showShellToast('Selecciona una receta para continuar');
      return;
    }
    const nextEntry: PlannedRecipeEntry = {
      id: createPlannedEntryId(),
      recipeId: planningRecipeId,
      day: planningDay,
      moment: planningMoment,
      createdAt: Date.now(),
    };
    let nextEntries = [...plannedEntries, nextEntry];
    setPlannedEntries(nextEntries);

    if (runtimePersistenceEnabled && userId) {
      const recipe = recipesById.get(planningRecipeId);
      if (recipe) {
        try {
          const ensuredPlan = runtimePlanId
            ? { id: runtimePlanId }
            : await ensureWeeklyPlan(userId, getWeekStartDate());
          if (!runtimePlanId) setRuntimePlanId(ensuredPlan.id);
          const sortOrder = plannedEntries.filter((entry) => entry.day === planningDay && entry.moment === planningMoment).length + 1;
          const saved = await saveWeeklyPlanItem(ensuredPlan.id, {
            dayOfWeek: shellDayToIndex(planningDay),
            slot: shellMomentToSlot(planningMoment),
            recipeId: recipe.id,
            recipeNameSnapshot: recipe.title,
            notes: `runtime-entry:${nextEntry.id}`,
            sortOrder,
            configSnapshot: {
              quantityMode: 'people',
              peopleCount: recipe.servings,
              amountUnit: null,
              availableCount: null,
              targetYield: defaultYieldFromRecipe(recipe),
              cookingContext: null,
              selectedOptionalIngredients: [],
              sourceContextSummary: null,
              resolvedPortion: recipe.servings >= 4 ? 4 : recipe.servings <= 1 ? 1 : 2,
              scaleFactor: 1,
            },
          });
          nextEntries = nextEntries.map((entry) => (
            entry.id === nextEntry.id
              ? { ...entry, id: saved.id, persistedPlanItemId: saved.id, createdAt: Date.parse(saved.createdAt) || entry.createdAt }
              : entry
          ));
          setPlannedEntries(nextEntries);
          await syncShoppingListFromEntries(nextEntries);
        } catch (saveError) {
          console.error('Error saving plan item:', saveError);
          // Fallback handled by state set at beginning of function
        }
      }
    }

    setExpandedPlanDays((current) => ({ ...current, [planningDay]: true }));
    setActiveShellTab('plan');
    closePlanningSheet();
    showShellToast('Añadido al plan');
  };

  const removePlannedEntry = async (entryId: string) => {
    const target = plannedEntries.find((entry) => entry.id === entryId);
    if (!target) return;
    const nextEntries = plannedEntries.filter((entry) => entry.id !== entryId);
    setPlannedEntries(nextEntries);

    if (runtimePersistenceEnabled && userId && target.persistedPlanItemId) {
      try {
        await deleteWeeklyPlanItem(target.persistedPlanItemId);
      } catch {
        // Keep UI responsive even if persistence fails.
      }
    }
    if (runtimePersistenceEnabled && userId) {
      try {
        await syncShoppingListFromEntries(nextEntries);
      } catch {
        // Non-blocking.
      }
    }
    showShellToast('Receta quitada del plan');
  };

  const addRecipeToShoppingSelection = (recipeId: string) => {
    setExtraSelectedRecipeIds((current) => (
      current.includes(recipeId) ? current : [...current, recipeId]
    ));
    setShoppingRecipeQuery('');
    showShellToast('Receta añadida a compras');
  };

  const removeExtraRecipeFromShoppingSelection = (recipeId: string) => {
    setExtraSelectedRecipeIds((current) => current.filter((id) => id !== recipeId));
  };

  const toggleWeeklyRecipeSelection = (recipeId: string) => {
    setWeeklySelectedRecipeIds((current) => (
      current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId]
    ));
  };

  const addManualShoppingItem = async () => {
    const name = manualProductName.trim();
    const price = manualProductPrice.trim();
    if (!name) {
      showShellToast('Escribe el nombre del producto');
      return;
    }

    const localKey = `manual:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setShoppingUiState((current) => ({
      ...current,
      [localKey]: {
        checked: true,
        price,
      },
    }));

    if (runtimePersistenceEnabled && userId) {
      try {
        const ensuredPlan = runtimePlanId ? { id: runtimePlanId } : await ensureWeeklyPlan(userId, getWeekStartDate());
        if (!runtimePlanId) setRuntimePlanId(ensuredPlan.id);
        const shoppingList = await getOrCreateShoppingList(userId, ensuredPlan.id);
        setRuntimeShoppingListId(shoppingList.id);
        const sortOrder = persistedShoppingItems.length + manualShoppingItems.length + 100;
        const created = await createManualShoppingListItem(shoppingList.id, {
          itemName: name,
          quantityText: 'Libre',
          sortOrder,
        });
        await updateShoppingListItem(created.id, { isChecked: true });
        const refreshed = await getShoppingListItems(shoppingList.id);
        setPersistedShoppingItems(refreshed);
        setShoppingUiState((current) => ({
          ...current,
          [`manual:${created.id}`]: {
            checked: true,
            price,
          },
        }));
      } catch {
        setManualShoppingItems((current) => current.concat({
          key: localKey,
          name,
          quantityLabel: 'Libre',
          checked: true,
          price,
        }));
      }
    } else {
      setManualShoppingItems((current) => current.concat({
        key: localKey,
        name,
        quantityLabel: 'Libre',
        checked: true,
        price,
      }));
    }

    setManualProductName('');
    setManualProductPrice('');
    setIsManualSheetOpen(false);
    showShellToast('Producto libre agregado');
  };

  const togglePlanDay = (day: ShellDay) => {
    setExpandedPlanDays((current) => ({
      ...current,
      [day]: !current[day],
    }));
  };

  const toggleShoppingChecked = async (key: string) => {
    const shellItem = shellShoppingItems.find((item) => item.key === key);
    const persistedItem = shellItem?.persistedItemId
      ? persistedShoppingById.get(shellItem.persistedItemId) ?? null
      : shellItem
      ? persistedShoppingByName.get(shoppingNameKey(shellItem.name)) ?? null
      : null;
    setShoppingUiState((current) => {
      const existing = current[key] ?? { checked: false, price: '' };
      return {
        ...current,
        [key]: {
          checked: !existing.checked,
          price: !existing.checked ? existing.price : '',
        },
      };
    });
    if (persistedItem) {
      const nextChecked = !persistedItem.isChecked;
      setPersistedShoppingItems((current) => current.map((item) => (
        item.id === persistedItem.id ? { ...item, isChecked: nextChecked } : item
      )));
      if (runtimePersistenceEnabled && userId) {
        try {
          await updateShoppingListItem(persistedItem.id, { isChecked: nextChecked });
        } catch {
          // Keep UI responsive even if persistence fails.
        }
      }
    }
    showShellToast('Marcado actualizado');
  };

  const updateShoppingPrice = (key: string, price: string) => {
    setShoppingUiState((current) => ({
      ...current,
      [key]: {
        checked: current[key]?.checked ?? false,
        price,
      },
    }));
  };

  const finishShopping = async () => {
    if (runtimePersistenceEnabled && userId && runtimeShoppingListId) {
      try {
        const shoppingList = await getOrCreateShoppingList(userId, runtimePlanId ?? (await ensureWeeklyPlan(userId, getWeekStartDate())).id);
        const shoppingItems = await getShoppingListItems(shoppingList.id);
        const trip = await createShoppingTrip(userId, shoppingList, shoppingItems);
        const tripItems = await getShoppingTripItems(trip.id);
        for (const tripItem of tripItems) {
          const nameKey = shoppingNameKey(tripItem.actualItemName || tripItem.plannedItemNameSnapshot || '');
          const shellItem = shellShoppingItems.find((item) => shoppingNameKey(item.name) === nameKey);
          const ui = shellItem ? shoppingUiState[shellItem.key] : undefined;
          const lineTotal = ui?.price ? Number(ui.price) : null;
          await updateShoppingTripItem(tripItem.id, {
            status: ui?.checked ? 'in_cart' : 'pending',
            isInCart: Boolean(ui?.checked),
            lineTotal: Number.isFinite(lineTotal) ? lineTotal : null,
          });
        }
        await checkoutShoppingTrip(trip.id, { finalTotal: shoppingTotal });
      } catch {
        // Keep completion flow available even if backend checkout fails.
      }
    }
    setShoppingCompleted(true);
    showShellToast(`Compra finalizada · ${formatCurrency(shoppingTotal)}`);
  };

  const openShoppingTab = async (targetScope: ShoppingScope = shoppingScope) => {
    setShoppingScope(targetScope);
    try {
      const resolvableEntries = plannedEntries.filter((entry) => recipesById.has(entry.recipeId));
      const removedCount = plannedEntries.length - resolvableEntries.length;

      if (removedCount > 0) {
        setPlannedEntries(resolvableEntries);
        if (runtimePersistenceEnabled && runtimePlanId) {
          try {
            const persistedPlanItems = await getWeeklyPlanItems(runtimePlanId);
            const stalePersistedItems = persistedPlanItems.filter((item) => item.recipeId && !recipesById.has(item.recipeId));
            await Promise.all(stalePersistedItems.map((item) => deleteWeeklyPlanItem(item.id)));
          } catch {
            // Keep local cleanup even if persistence cleanup fails.
          }
        }
        showShellToast(`Se limpiaron ${removedCount} bloque(s) incompatibles del plan`);
      }

      const entriesForScope = [
        ...resolvableEntries.filter((entry) => weeklySelectedRecipeIds.includes(entry.recipeId)),
        ...extraSelectedRecipeIds
          .filter((recipeId) => recipesById.has(recipeId) && !weeklySelectedRecipeIds.includes(recipeId))
          .map((recipeId) => ({
            id: `shopping-extra-${recipeId}`,
            recipeId,
            day: resolveTodayShellDay(),
            moment: 'Almuerzo' as ShellMoment,
            createdAt: 0,
          })),
      ];

      if (entriesForScope.length > 0) {
        await syncShoppingListFromEntries(entriesForScope);
        showShellToast(targetScope === 'weekly' ? 'Lista semanal actualizada' : 'Lista por recetas actualizada');
      }
    } catch (syncError) {
      setImportError(syncError instanceof Error ? syncError.message : 'No se pudo actualizar compras.');
      showShellToast('Mostrando compras sin sincronizar');
    } finally {
      setShoppingStep('list');
      setActiveShellTab('shopping');
    }
  };

  if (!parsedRoute.isFixedRuntimeRoute) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-6 py-12 text-stone-900">
        <div className="rounded-[24px] bg-white px-6 py-4 text-sm font-medium shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          Cargando receta...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-6 py-12 text-stone-900">
        <div className="max-w-xl rounded-[24px] bg-white px-6 py-5 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <p className="font-bold">No se pudo cargar el runtime fijo.</p>
          <p className="mt-2">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (runtimeScreen === 'library' || runtimeScreen === 'create') {
    return (
      <div className="fixed-runtime-scope rt-app-layout">
        {runtimeScreen === 'library' && (
          <nav className="rt-nav-bar">
            {([
              { id: 'recipes', label: 'Explorar', icon: ChefHat },
              { id: 'plan', label: 'Mi Plan', icon: CalendarDays },
              { id: 'shopping', label: 'Compras', icon: ShoppingBasket },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const active = activeShellTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (tab.id === 'shopping') {
                      void openShoppingTab();
                      return;
                    }
                    setActiveShellTab(tab.id);
                  }}
                  className={`rt-nav-item ${active ? 'active' : ''}`}
                >
                  <div className="rt-nav-icon"><Icon size={20} strokeWidth={2.5} /></div>
                  <span className="mt-1">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
        <main className="rt-main-viewport">
          <div className="rt-view-container">
            {runtimeScreen === 'library' && activeShellTab === 'recipes' ? null : (
              <header className="relative z-10 flex items-start justify-between gap-4 px-1 pb-2 pt-3 sm:px-2 sm:pt-4">
                <div>
                  <h1 className="text-[34px] font-extrabold leading-[0.95] tracking-[-0.04em] text-[#23180f] sm:text-[42px]">
                    {runtimeScreen === 'create'
                      ? 'Nueva receta'
                      : activeShellTab === 'shopping'
                      ? 'Compras'
                      : 'Plan'}
                  </h1>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#5f5245]">
                    {runtimeScreen === 'create'
                      ? 'Pega JSON, valida y agrega.'
                      : activeShellTab === 'plan'
                      ? 'Semana activa, decisiones rápidas.'
                      : 'Marca, precio y finaliza en segundos.'}
                  </p>
                </div>
                <span
                  className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75 text-[#5f5245] shadow-[inset_0_0_0_1px_rgba(139,111,83,0.1)]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </span>
              </header>
            )}

            <section className="relative z-10 flex-1 overflow-auto px-1 pb-[152px] pt-1 sm:px-2 sm:pb-[166px]">
              {runtimeScreen === 'library' && activeShellTab === 'recipes' ? (
                <div className="space-y-4 pb-4">
                  <div className="rt-header-row mt-4">
                    <div>
                      <h1 className="rt-page-title">Tu Biblioteca</h1>
                      <p className="rt-page-subtitle">Explora tus recetas listas para cocinar</p>
                    </div>
                    <button type="button" onClick={openCreateRecipeScreen} className="rt-btn-create">
                      <Sparkles size={20} strokeWidth={2.5} /> Nueva rápida
                    </button>
                  </div>

                  {storageMode === 'local-fallback' ? (
                    <div className="mb-4 rounded-lg bg-orange-50 px-3 py-2 text-[13px] font-medium text-orange-800 shadow-sm ring-1 ring-inset ring-orange-600/20">
                      <span className="font-bold">Modo Local:</span> Tus recetas importadas solo se están guardando en este buscador offline.
                    </div>
                  ) : null}

                  <div className="rt-search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted-rt)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                      type="text"
                      value={libraryQuery}
                      onChange={(event) => setLibraryQuery(event.target.value)}
                      placeholder="Busca por ingrediente, nombre o estilo..."
                    />
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-6" style={{ scrollbarWidth: 'none' }}>
                    {categoryOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setActiveCategoryKey(option.key)}
                        className={`rt-pill ${activeCategoryKey === option.key ? 'active' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="rt-grid-recipes">
                    {filteredRecipes.map((recipe) => {
                      const originLabel = resolveRecipeOriginLabel(recipe, importedRecipeIds, sessionPreviewRecipe?.id ?? null);
                      const isExtra = originLabel === 'Preview' || originLabel === 'Importada';
                      // Unsplash placeholder or conditional logic can go here. For now we use standard default.
                      const bgImage = recipeImages[recipe.id] || (
                                      recipe.recipeCategory === 'stovetop' ? 'https://images.unsplash.com/photo-1544025162-811114cd354c?auto=format&fit=crop&w=800&q=80' : 
                                      recipe.recipeCategory === 'baking' ? 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80' : 
                                      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80'
                                    );
                      
                      return (
                        <button
                          key={recipe.id}
                          className="rt-recipe-card text-left"
                          onClick={() => navigate(`/runtime-fijo/${encodeURIComponent(recipe.id)}`)}
                        >
                          <div className="rt-rc-img" style={{ backgroundImage: `url('${bgImage}')` }}>
                            <div className="rt-rc-badge">
                              {resolveRecipeEmoji(recipe.recipeCategory)} {originLabel}
                            </div>
                          </div>
                          <div className="rt-rc-body">
                            <h3 className="rt-rc-title truncate">{recipe.title}</h3>
                            <div className="rt-rc-meta truncate mt-auto">
                              <span className="truncate"><Clock3 size={16} /> {recipeCardMeta(recipe)}</span>
                              <span className="truncate">🔥 {recipe.servings} px</span>
                            </div>
                            <div
                              onClick={(e) => { e.stopPropagation(); openPlanningSheet(recipe.id); }}
                              className="absolute bottom-6 right-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-stone-100/80 text-[#7a6759] backdrop-blur-sm transition-all hover:scale-110 hover:bg-[#d86315] hover:text-white shadow-sm"
                            >
                              <CalendarDays size={18} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {recipes.length === 0 ? (
                    <section className="rounded-[22px] border border-[#e7dccf] bg-[#fffaf5] px-4 py-4 text-sm text-[#8a7768] shadow-[0_10px_24px_rgba(50,35,20,0.06)]">
                      <p className="font-semibold text-[#5f5245]">Todavía no tienes recetas.</p>
                      <p className="mt-1">Crea una nueva para comenzar.</p>
                      <button
                        type="button"
                        onClick={openCreateRecipeScreen}
                        className="mt-3 inline-flex min-h-10 items-center rounded-full bg-[#eb7a2b] px-4 text-xs font-bold text-white transition hover:bg-[#d86315]"
                      >
                        Crear receta
                      </button>
                    </section>
                  ) : null}

                  {recipes.length > 0 && filteredRecipes.length === 0 ? (
                    <section className="rounded-[22px] border border-[#e7dccf] bg-[#fffaf5] px-4 py-4 text-sm text-[#8a7768] shadow-[0_10px_24px_rgba(50,35,20,0.06)]">
                      <p className="font-semibold text-[#5f5245]">No encontramos recetas con esos filtros.</p>
                      <p className="mt-1">Prueba otro término o limpia filtros.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryQuery('');
                          setActiveCategoryKey('all');
                        }}
                        className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                      >
                        Limpiar filtros
                      </button>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {runtimeScreen === 'create' ? (
                <div className="space-y-4 pb-3">
                  <section className={`${SHELL_UI.surface} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Importar JSON</p>
                        <h3 className="mt-1 text-[22px] font-extrabold tracking-[-0.04em] text-[#23180f]">Añadir recetas al runtime</h3>
                        <p className="mt-1 text-xs text-[#8a7768]">Pega o sube JSON y agrégalo al catálogo visible.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={clearImportedRecipes}
                          className="inline-flex min-h-9 items-center rounded-full border border-[#e3d9ce] bg-white px-3 text-xs font-semibold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/runtime-fijo')}
                          className="inline-flex min-h-9 items-center rounded-full border border-[#e3d9ce] bg-white px-3 text-xs font-semibold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={importText}
                      onChange={(event) => setImportText(event.target.value)}
                      placeholder='[{"id":"mi-receta","title":"...","servings":4,"ingredients":[],"phases":[]}]'
                      className="mt-3 min-h-32 w-full rounded-[16px] border border-[#e3d9ce] bg-[#fffaf5] px-3 py-2 text-xs text-[#23180f] outline-none transition focus:border-[#eb7a2b]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handlePreviewTextarea}
                        className="inline-flex min-h-10 items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={handleImportTextarea}
                        className="inline-flex min-h-10 items-center rounded-full bg-[#eb7a2b] px-4 text-xs font-bold text-white transition hover:bg-[#d86315]"
                      >
                        Importar y volver
                      </button>
                      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]">
                        Subir archivo
                        <input type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
                      </label>
                    </div>

                    {importError ? (
                      <p className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{importError}</p>
                    ) : null}
                    {importSuccess ? (
                      <p className="mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{importSuccess}</p>
                    ) : null}

                    {importPreview ? (
                      <div
                        className={`mt-3 rounded-[16px] border px-3 py-3 text-xs ${
                          importPreview.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                        }`}
                      >
                        <p className="font-semibold uppercase tracking-[0.12em]">Preview {importPreview.ok ? 'válido' : 'inválido'}</p>
                        <p className="mt-1">modo: {importPreview.mode}</p>
                        {importPreview.ok ? <p className="mt-1">recetas: {importPreview.recipes.length}</p> : null}
                        {!importPreview.ok && importPreview.errors.length > 0 ? (
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            {importPreview.errors.slice(0, 4).map((errorText, index) => (
                              <li key={`${errorText}-${index}`}>{errorText}</li>
                            ))}
                          </ul>
                        ) : null}
                        {importPreview.ok ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={applyPreviewImport}
                              className="inline-flex min-h-9 items-center rounded-full bg-emerald-700 px-3 text-[11px] font-bold text-white"
                            >
                              Agregar al catálogo
                            </button>
                            <button
                              type="button"
                              onClick={runPreviewRecipe}
                              className="inline-flex min-h-9 items-center rounded-full border border-emerald-300 bg-white px-3 text-[11px] font-bold text-emerald-800"
                            >
                              Abrir runtime preview
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}

              {runtimeScreen === 'library' && activeShellTab === 'plan' ? (
                <div className="space-y-4 pb-3">
                  <section className={`${SHELL_UI.surface} flex items-center justify-between gap-3 px-5 py-4`}>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Plan semanal</p>
                      <h2 className="mt-1 text-[26px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#23180f]">
                        Qué toca cocinar
                      </h2>
                    </div>
                    <span className="rounded-full bg-[#f3e7d9] px-3 py-2 text-xs font-bold text-[#7a6759]">
                      {plannedEntries.length} bloques · 7 días
                    </span>
                  </section>

                  {plannedEntries.length === 0 ? (
                    <section className="rounded-[22px] border border-[#e7dccf] bg-[#fffaf5] px-4 py-4 text-sm text-[#8a7768] shadow-[0_10px_24px_rgba(50,35,20,0.06)]">
                      <p className="font-semibold text-[#5f5245]">Tu semana aún está vacía.</p>
                      <p className="mt-1">Planifica una receta desde la pestaña Recetas para generar compras automáticamente.</p>
                      <button
                        type="button"
                        onClick={() => setActiveShellTab('recipes')}
                        className="mt-3 inline-flex min-h-10 items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                      >
                        Ir a recetas
                      </button>
                    </section>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {SHELL_DAYS.map((day) => {
                      const dayEntries = plannedEntriesByDay.get(day) ?? [];
                      const isExpanded = expandedPlanDays[day];
                      return (
                        <article key={day} className={`${SHELL_UI.surfaceSoft} p-4`}>
                          <button
                            type="button"
                            onClick={() => togglePlanDay(day)}
                            className="flex w-full items-center justify-between gap-2 text-left"
                          >
                            <div>
                              <h3 className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-[#23180f]">{day}</h3>
                              <p className="mt-1 text-xs text-[#8a7768]">{dayEntries.length ? `${dayEntries.length} receta(s)` : 'Sin recetas aún'}</p>
                            </div>
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e7d9] text-[#7a6759]">
                              {isExpanded ? <ChevronDown size={18} className="rotate-180" /> : <ChevronDown size={18} />}
                            </span>
                          </button>
                          {isExpanded ? (
                            <div className="mt-3 space-y-2">
                              <button
                                type="button"
                                onClick={() => openPlanDaySheet(day)}
                                className="inline-flex min-h-9 items-center rounded-full border border-[#dacfc3] bg-white px-3 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                              >
                                Agregar receta
                              </button>
                              {dayEntries.length === 0 ? (
                                <div className="rounded-[16px] border border-[#efe3d5] bg-[#fffaf5] px-3 py-3 text-xs text-[#8a7768]">
                                  Sin recetas aún. Puedes usar este espacio para adelantar una comida rápida.
                                </div>
                              ) : (
                                dayEntries.map((entry) => {
                                  const recipe = recipesById.get(entry.recipeId);
                                  if (!recipe) return null;
                                  return (
                                    <div key={`${entry.day}-${entry.moment}-${entry.recipeId}`} className="rounded-[16px] border border-[#efdcca] bg-[#fff2e7] px-3 py-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div>
                                          <p className="text-sm font-bold text-[#23180f]">{recipe.title}</p>
                                          <p className="text-xs text-[#8a7768]">{entry.moment}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => removePlannedEntry(entry.id)}
                                            className="inline-flex min-h-8 items-center rounded-full border border-[#efdcca] bg-white px-3 text-xs font-bold text-[#8a7768] transition hover:bg-[#fff7ef]"
                                          >
                                            Quitar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/runtime-fijo/${encodeURIComponent(recipe.id)}`)}
                                            className="inline-flex min-h-8 items-center rounded-full bg-white px-3 text-xs font-bold text-[#d86315] transition hover:bg-[#fff7ef]"
                                          >
                                            Abrir
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => void openShoppingTab('weekly')}
                    className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#eb7a2b] px-5 text-base font-bold text-white shadow-[0_14px_26px_rgba(216,99,21,0.25)] transition hover:bg-[#d86315] active:scale-[0.99]"
                  >
                    Generar compras
                  </button>
                </div>
              ) : null}

              {runtimeScreen === 'library' && activeShellTab === 'shopping' ? (
                <div className="space-y-4 pb-24">
                  {shoppingStep === 'configure' ? (
                    /* Step 2: Configure recipes */
                    <section className={`${SHELL_UI.surface} px-4 py-5`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h2 className="text-[22px] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#23180f]">Personalizar recetas</h2>
                          <p className="mt-1 text-[13px] text-[#5f5245] max-w-sm">
                            Busca recetas adicionales o selecciona platos de tu plan semanal.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShoppingStep('list'); void openShoppingTab(shoppingScope); }}
                          className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white transition hover:bg-stone-800"
                        >
                          ← Volver a la lista
                        </button>
                      </div>
                    
                      <div className="mt-6 border-t border-[#f4f1ea] pt-5">
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <div className="relative">
                            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0a6]">
                              <path d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14m0 0l0 0m8.5 15.5L17 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                            </svg>
                            <input
                              value={shoppingRecipeQuery}
                              onChange={(event) => setShoppingRecipeQuery(event.target.value)}
                              placeholder="Buscar y añadir receta extra (ej: Postre)"
                              className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f9fa] pl-11 pr-4 text-sm text-[#1f2328] outline-none transition focus:border-[var(--primary-rt)] focus:ring-2 focus:ring-[#fce2ba]"
                            />
                          </div>
                        </div>
                      </div>
                    
                      {shoppingRecipeQuery.trim().length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {shoppingRecipeSuggestions.length === 0 ? (
                            <span className="rounded-full bg-[#f8f2eb] px-3 py-1.5 text-xs font-semibold text-[#8a7768]">Sin coincidencias</span>
                          ) : (
                            shoppingRecipeSuggestions.map((recipe) => (
                              <button
                                key={recipe.id}
                                type="button"
                                onClick={() => {
                                  addRecipeToShoppingSelection(recipe.id);
                                  setShoppingRecipeQuery('');
                                }}
                                className="inline-flex min-h-9 items-center rounded-full border border-[#e3d9ce] bg-white px-3 text-xs font-bold text-[#d86315] transition hover:bg-[#fff7ef]"
                              >
                                + {recipe.title}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}

                      <div className="mt-6">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a6759]">
                          Recetas incluidas ({weeklySelectedRecipeIds.length + selectedExtraRecipes.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {weeklyRecipeIds.length === 0 && selectedExtraRecipes.length === 0 ? (
                            <span className="rounded-xl border border-dashed border-[#d5c9ba] px-4 py-3 text-[13px] font-medium text-[#8a7768] w-full text-center">
                              Ninguna receta seleccionada. ¿Planeamos la semana?
                            </span>
                          ) : (
                            <>
                              {weeklyRecipeIds.map((recipeId) => {
                                const recipe = recipesById.get(recipeId);
                                if (!recipe) return null;
                                const active = weeklySelectedRecipeIds.includes(recipeId);
                                return (
                                  <button
                                    key={recipeId}
                                    type="button"
                                    onClick={() => toggleWeeklyRecipeSelection(recipeId)}
                                    className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-[13px] font-semibold transition ${
                                      active
                                        ? 'border-[#eb7a2b] bg-[#fff1e3] text-[#d86315]'
                                        : 'border-[#dacfc3] bg-[#fdfaf7] text-[#8a7768] hover:bg-white'
                                    }`}
                                  >
                                    {active ? '✓ ' : ''}{recipe.title}
                                  </button>
                                );
                              })}
                              {selectedExtraRecipes.map((recipe) => (
                                <span key={recipe.id} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--primary-rt)] bg-[var(--primary-rt)] px-3 py-1 text-[13px] font-semibold text-white">
                                  ✓ {recipe.title}
                                  <button
                                    type="button"
                                    onClick={() => removeExtraRecipeFromShoppingSelection(recipe.id)}
                                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </section>
                  ) : (
                    /* Step 1: Shopping list */
                    <>
                      <section className={`${SHELL_UI.surface} px-4 py-5`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h2 className="text-[22px] font-extrabold leading-[1.04] tracking-[-0.03em] text-[#23180f]">Lista de compras</h2>
                            <p className="mt-1 text-[13px] text-[#5f5245] max-w-sm">
                              Lista semanal generada desde tu plan. Marca, precio y finaliza.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => setIsManualSheetOpen(true)}
                              className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
                            >
                              + Producto suelto
                            </button>
                            <button
                              type="button"
                              onClick={() => setShoppingStep('configure')}
                              className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white transition hover:bg-stone-800"
                            >
                              Personalizar recetas
                            </button>
                          </div>
                        </div>
                      </section>

                      <div className="grid gap-3 sm:grid-cols-[300px_1fr]">
                        <section className={`${SHELL_UI.surfaceSoft} px-4 py-4`}>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--primary-rt)]">Progreso</p>
                            <p className="text-xs font-bold text-[var(--text-muted-rt)]">{shellShoppingItems.filter(i => i.checked).length} / {shellShoppingItems.length}</p>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-[#f4f1ea] overflow-hidden">
                            <div 
                              className="h-full bg-[var(--success-rt)] transition-all duration-500" 
                              style={{ width: `${shellShoppingItems.length === 0 ? 0 : Math.round((shellShoppingItems.filter(i => i.checked).length / shellShoppingItems.length) * 100)}%` }}
                            />
                          </div>
                          <p className="mt-4 text-[48px] font-extrabold leading-none tracking-[-0.05em] text-[#23180f]">{formatCurrency(shoppingTotal)}</p>
                          <p className="mt-2 text-sm text-[var(--text-muted-rt)]">
                            {shoppingTotal <= 40 ? `Restante ${formatCurrency(40 - shoppingTotal)}` : `Excedido ${formatCurrency(shoppingTotal - 40)}`}
                          </p>
                        </section>
                        <section className={`${SHELL_UI.surfaceSoft} flex items-center justify-between gap-3 px-4 py-4`}>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Compras</p>
                            <h2 className="mt-1 text-[26px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#23180f]">Lista operativa</h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSuperMode((current) => !current)}
                            className={`inline-flex min-h-12 items-center gap-3 rounded-[18px] border px-3 py-2 text-left ${
                              superMode ? 'border-[#efc9aa] bg-[#fff2e7]' : 'border-[#e7dccf] bg-[#fffaf5]'
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-bold text-[#23180f]">Modo súper</span>
                              <span className="block text-xs text-[#8a7768]">Compactar lista</span>
                            </span>
                            <span className={`relative inline-flex h-8 w-14 rounded-full transition ${superMode ? 'bg-[#eb7a2b]' : 'bg-[#ddd4c8]'}`}>
                              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${superMode ? 'left-7' : 'left-1'}`} />
                            </span>
                          </button>
                        </section>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {shellShoppingItems.length === 0 ? (
                          <section className="col-span-full rounded-[20px] border border-[#e7dccf] bg-[#fffaf5] px-4 py-4 text-sm text-[#8a7768] shadow-[0_10px_24px_rgba(50,35,20,0.06)]">
                            {shoppingScope === 'selected' && extraSelectedRecipeIds.length === 0 ? (
                              <>
                                <p className="font-semibold text-[#5f5245]">Aún no elegiste recetas para comprar.</p>
                                <p className="mt-1">Busca recetas arriba y agrégalas para generar cantidades automáticamente.</p>
                              </>
                            ) : !hasPlannedRecipes && shoppingScope === 'weekly' ? (
                              <>
                                <p className="font-semibold text-[#5f5245]">No hay plan semanal activo para generar compras.</p>
                                <p className="mt-1">Puedes volver a plan o continuar comprando por platos elegidos.</p>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-[#5f5245]">No encontramos ingredientes para la selección actual.</p>
                                <p className="mt-1">Prueba con otras recetas o usa el plan semanal.</p>
                              </>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveShellTab('plan')}
                                className="inline-flex min-h-10 items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                              >
                                Ir al plan
                              </button>
                              <button
                                type="button"
                                onClick={() => setShoppingStep('configure')}
                                className="inline-flex min-h-10 items-center rounded-full border border-[#dacfc3] bg-white px-4 text-xs font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                              >
                                Personalizar recetas
                              </button>
                              <button
                                type="button"
                                onClick={() => void openShoppingTab(shoppingScope)}
                                className="inline-flex min-h-10 items-center rounded-full bg-[#eb7a2b] px-4 text-xs font-bold text-white transition hover:bg-[#d86315]"
                              >
                                Actualizar compras
                              </button>
                            </div>
                          </section>
                        ) : (
                          shellShoppingItems.map((item) => (
                            <div
                              key={item.key}
                              onClick={() => toggleShoppingChecked(item.key)}
                              className={`rt-shop-item ${item.checked ? 'checked' : ''} ${superMode ? 'py-3 gap-2' : ''}`}
                            >
                              <div
                                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                                  item.checked
                                    ? 'border-[var(--success-rt)] bg-[var(--success-rt)] text-white'
                                    : 'border-[var(--border-line-rt)] bg-white text-transparent'
                                }`}
                              >
                                ✓
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-[20px] font-extrabold leading-none tracking-[-0.02em] transition-all duration-300 ${item.checked ? 'text-[var(--text-muted-rt)] line-through opacity-75' : 'text-[#23180f]'}`}>
                                  {item.name}
                                </p>
                                <p className={`mt-1 text-sm font-bold ${item.checked ? 'text-[var(--text-muted-rt)]' : 'text-[var(--primary-rt)]'}`}>
                                  {item.quantityLabel}
                                </p>
                                {!superMode ? (
                                  <p className="mt-1 text-xs text-[#8a7768] overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                                    {item.isManual ? 'Producto libre' : `Para: ${item.recipeTitles.length <= 1 ? item.recipeTitles.join('') : `${item.recipeTitles[0]} y ${item.recipeTitles.length - 1} más`}`}
                                  </p>
                                ) : null}
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.10"
                                value={item.price}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(event) => updateShoppingPrice(item.key, event.target.value)}
                                disabled={!item.checked}
                                placeholder="S/"
                                className="min-h-12 w-[85px] sm:w-[100px] shrink-0 rounded-[14px] border border-[#ddd4c8] bg-white px-2 text-right text-sm font-bold text-[#5f5245] outline-none transition focus:border-[var(--primary-rt)] disabled:opacity-50"
                              />
                            </div>
                          ))
                        )}
                      </div>

                      <div className="sticky bottom-0 z-20 rounded-3xl border border-[#e8dbcc] bg-white/95 px-4 py-3 shadow-[0_18px_34px_rgba(93,63,33,0.2)] backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Total actual</p>
                            <p className="text-[38px] font-extrabold leading-none tracking-[-0.04em] text-[#23180f]">{formatCurrency(shoppingTotal)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={finishShopping}
                            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#eb7a2b] px-6 text-base font-bold text-white transition hover:bg-[#d86315] active:scale-[0.99]"
                          >
                            Finalizar
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </section>

            {/* Legacy nav block removed, moved to the outer layout */}

            {isPlanningSheetOpen ? (
              <div className="fixed inset-0 z-40 flex items-end bg-black/30 p-3 sm:items-center sm:justify-center" onClick={closePlanningSheet}>
                <div
                  className="w-full rounded-[28px] bg-white px-5 py-5 shadow-[0_24px_60px_rgba(20,10,0,0.18)] sm:max-w-md"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Planificar receta</p>
                      <h3 className="mt-1 text-[31px] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#23180f]">
                        {planningRecipeId ? (recipesById.get(planningRecipeId)?.title ?? 'Selecciona receta') : 'Selecciona receta'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={closePlanningSheet}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3d9ce] text-[#7a6759] transition hover:bg-[#faf1e7]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Receta</p>
                    <div className="relative mt-2">
                      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa0a6]">
                        <path d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14m0 0l0 0m8.5 15.5L17 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                      </svg>
                      <input
                        value={planningRecipeQuery}
                        onChange={(event) => setPlanningRecipeQuery(event.target.value)}
                        placeholder="Buscar receta por nombre o ingrediente"
                        className="h-11 w-full rounded-2xl border border-[#e3d9ce] bg-[#fffaf5] pl-11 pr-3 text-sm text-[#23180f] outline-none transition focus:border-[#eb7a2b]"
                      />
                    </div>
                    <div className="mt-2 max-h-28 space-y-1 overflow-auto pr-1">
                      {planningRecipeQuery.trim().length > 0 ? (
                        planningRecipeResults.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => selectPlanningRecipe(recipe.id)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                              planningRecipeId === recipe.id
                                ? 'bg-[#fff1e3] text-[#d86315]'
                                : 'bg-[#f8f2eb] text-[#5f5245] hover:bg-[#efe3d6]'
                            }`}
                          >
                            <span className="truncate">{recipe.title}</span>
                            {planningRecipeId === recipe.id ? <span className="text-xs">Seleccionada</span> : null}
                          </button>
                        ))
                      ) : planningRecipeId ? (
                        <div className="rounded-xl bg-[#fff1e3] px-3 py-2 text-sm font-semibold text-[#d86315]">
                          ✓ {recipesById.get(planningRecipeId)?.title ?? 'Receta seleccionada'}
                        </div>
                      ) : (
                        <p className="px-3 py-3 text-center text-sm text-[#8a7768]">Escribe para buscar recetas</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Día</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SHELL_DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setPlanningDay(day)}
                          className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold transition ${
                            planningDay === day ? 'bg-[#fff1e3] text-[#d86315]' : 'bg-[#f4ece3] text-[#7a6759] hover:bg-[#efe3d6]'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Momento</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SHELL_MOMENTS.map((moment) => (
                        <button
                          key={moment}
                          type="button"
                          onClick={() => setPlanningMoment(moment)}
                          className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold transition ${
                            planningMoment === moment ? 'bg-[#fff1e3] text-[#d86315]' : 'bg-[#f4ece3] text-[#7a6759] hover:bg-[#efe3d6]'
                          }`}
                        >
                          {moment}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={closePlanningSheet}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dacfc3] bg-white text-sm font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmPlanning}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#eb7a2b] text-sm font-bold text-white transition hover:bg-[#d86315]"
                    >
                      Agregar al plan
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {isManualSheetOpen ? (
              <div className="fixed inset-0 z-40 flex items-end bg-black/30 p-3 sm:items-center sm:justify-center" onClick={() => setIsManualSheetOpen(false)}>
                <div
                  className="w-full rounded-[28px] bg-white px-5 py-5 shadow-[0_24px_60px_rgba(20,10,0,0.18)] sm:max-w-md"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-stone-200" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Producto libre</p>
                      <h3 className="mt-1 text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#23180f]">
                        Agregar a compras
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsManualSheetOpen(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e3d9ce] text-[#7a6759] transition hover:bg-[#faf1e7]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Nombre</span>
                      <input
                        value={manualProductName}
                        onChange={(event) => setManualProductName(event.target.value)}
                        placeholder="Ej: Bolsa de hielo"
                        className="mt-2 h-11 w-full rounded-2xl border border-[#e3d9ce] bg-[#fffaf5] px-3 text-sm text-[#23180f] outline-none transition focus:border-[#eb7a2b]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d86315]">Precio</span>
                      <input
                        type="number"
                        min="0"
                        step="0.10"
                        value={manualProductPrice}
                        onChange={(event) => setManualProductPrice(event.target.value)}
                        placeholder="S/"
                        className="mt-2 h-11 w-full rounded-2xl border border-[#e3d9ce] bg-[#fffaf5] px-3 text-sm text-[#23180f] outline-none transition focus:border-[#eb7a2b]"
                      />
                    </label>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsManualSheetOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dacfc3] bg-white text-sm font-bold text-[#5f5245] transition hover:bg-[#f8f2eb]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void addManualShoppingItem()}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#eb7a2b] text-sm font-bold text-white transition hover:bg-[#d86315]"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {shellToast ? (
              <div className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
                <div className="rounded-full bg-[#23180f] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.25)]">
                  {shellToast}
                </div>
              </div>
            ) : null}

            {shoppingCompleted ? (
              <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                <div className="w-full max-w-sm rounded-[24px] bg-white px-5 py-6 text-center shadow-[0_20px_40px_rgba(48,31,15,0.25)]">
                  <div className="inline-flex rounded-full bg-[#fff1e3] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#d86315]">
                    Compra finalizada
                  </div>
                  <h2 className="mt-3 text-[34px] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#23180f]">Todo listo</h2>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[#23180f]">{formatCurrency(shoppingTotal)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShoppingCompleted(false);
                      setActiveShellTab('recipes');
                    }}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#eb7a2b] text-sm font-bold text-white transition hover:bg-[#d86315]"
                  >
                    Seguir explorando
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  if (!selectedRecipe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-6 py-12 text-stone-900">
        <div className="max-w-xl rounded-[24px] bg-white px-6 py-5 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <p className="font-bold">No se encontró la receta solicitada.</p>
          <p className="mt-2">Vuelve a la biblioteca para revisar el catálogo o las recetas importadas.</p>
          <button
            type="button"
            onClick={() => navigate('/runtime-fijo')}
            className="mt-4 inline-flex items-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
          >
            Ir a biblioteca
          </button>
        </div>
      </div>
    );
  }

  return (
    <FixedRecipeRuntime
      recipe={toRuntimeRecipe(selectedRecipe)}
      recipeJson={selectedRecipe}
      onExit={() => {
        window.sessionStorage.setItem(RUNTIME_RETURN_TOAST_KEY, 'Volviste a la biblioteca');
        navigate('/runtime-fijo');
      }}
      recipeImages={recipeImages}
      updateRecipeImage={updateRecipeImage}
    />
  );
}
