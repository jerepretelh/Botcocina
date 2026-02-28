# Revisión General del Proyecto - Thermomix Recipe Prototype

## 📋 Resumen Ejecutivo
El proyecto es una aplicación web interactiva para recetas de cocina con integración de IA (Google Gemini/OpenAI). Está bien estructurado pero tiene oportunidades de mejora significativas en rendimiento, UX, mantenibilidad y escalabilidad.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **Componente Monolítico Extremadamente Grande**
**Archivo:** `src/app/components/ThermomixCooker.tsx` (4,240 líneas)

**Impacto:** 
- Difícil de mantener y testear
- Lógica entrelazada compleja
- Riesgo de bugs al modificar

**Solución:**
Separar en componentes más pequeños:
```
src/app/components/
  ├── ThermomixCooker.tsx (orquestador principal)
  ├── screens/
  │   ├── CategorySelectScreen.tsx
  │   ├── RecipeSelectScreen.tsx
  │   ├── RecipeSetupScreen.tsx
  │   ├── IngredientsScreen.tsx
  │   └── CookingScreen.tsx
  ├── hooks/
  │   ├── useRecipeState.ts
  │   ├── useCookingProgress.ts
  │   └── usePortionCalculation.ts
  └── utils/
      ├── recipeHelpers.ts
      ├── timerUtils.ts
      └── ingredientParsers.ts
```

### 2. **Gestión de Estado Desorganizada**
**Problema:** 24+ estados independientes con `useState` en un componente
```tsx
const [screen, setScreen] = useState<Screen>('category-select');
const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>(defaultRecipes);
const [recipeContentById, setRecipeContentById] = useState<Record<string, RecipeContent>>(initialRecipeContent);
// ... 21 más
```

**Impacto:** 
- Difícil seguir el flujo de datos
- Rendimiento degradado por re-renders innecesarios
- Propenso a inconsistencias de estado

**Soluciones:**
1. Implementar `useReducer` para agrupar estados relacionados
2. Considerar Context API para estado compartido (receta actual, categoría, etc.)
3. Usar bibliotecas como Zustand o Jotai para estado global simple

```tsx
// Ejemplo con useReducer
type CookingAction = 
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SELECT_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_PORTION'; payload: Portion }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' };

const [state, dispatch] = useReducer(cookingReducer, initialState);
```

### 3. **Sin Persistencia de Datos**
**Problema:** No hay localStorage para guardar progreso de cocción o recetas favoritas

**Solución:**
```tsx
// Guardar progreso de cocción
useEffect(() => {
  if (selectedRecipe && currentStepIndex > 0) {
    localStorage.setItem(
      `cooking_progress_${selectedRecipe.id}`,
      JSON.stringify({
        stepIndex: currentStepIndex,
        subStepIndex: currentSubStepIndex,
        portion,
        timestamp: Date.now(),
      })
    );
  }
}, [selectedRecipe, currentStepIndex, currentSubStepIndex, portion]);

// Recuperar al cargar
useEffect(() => {
  if (selectedRecipe) {
    const saved = localStorage.getItem(`cooking_progress_${selectedRecipe.id}`);
    if (saved) {
      const { stepIndex, subStepIndex } = JSON.parse(saved);
      setCurrentStepIndex(stepIndex);
      setCurrentSubStepIndex(subStepIndex);
    }
  }
}, [selectedRecipe]);
```

### 4. **Tipado TypeScript Incompleto**
**Problemas encontrados:**
- `req: any` y `res: any` en `api/ai/recipe.ts`
- Tipos genéricos sin constrains
- Variables sin tipos explícitos

**Mejora:**
```tsx
// Antes
export default async function handler(req: any, res: any): Promise<void> {

// Después
import type { IncomingMessage, ServerResponse } from 'http';

interface RecipeRequest {
  prompt: string;
  mode?: 'generate' | 'clarify';
}

interface RecipeResponse {
  name: string;
  icon: string;
  ingredients: GeneratedIngredient[];
  steps: GeneratedRecipeStep[];
}

export default async function handler(
  req: IncomingMessage & { body?: RecipeRequest },
  res: ServerResponse
): Promise<void> {
```

---

## 🟡 PROBLEMAS MODERADOS

### 5. **Manejo de Errores Incompleto**
**Donde:** `src/app/lib/recipeAI.ts` y `api/ai/recipe.ts`

**Problemas:**
- Mensajes de error genéricos
- No hay retry logic para fallos de API
- No hay timeout configurado
- Fallos de parsing JSON sin contexto

**Mejora:**
```tsx
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30000; // 30s

async function fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (retries < MAX_RETRIES && error instanceof Error && error.name === 'AbortError') {
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}
```

### 6. **No hay Validación de Entrada**
**Problema:** El prompt del usuario se envía directamente a la API sin validar

**Solución:**
```tsx
function validateRecipePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt.trim()) {
    return { valid: false, error: 'El prompt no puede estar vacío' };
  }
  if (prompt.length < 5) {
    return { valid: false, error: 'El prompt debe tener al menos 5 caracteres' };
  }
  if (prompt.length > 500) {
    return { valid: false, error: 'El prompt no puede exceder 500 caracteres' };
  }
  return { valid: true };
}
```

### 7. **Performance Issues**
**Identificados:**

a) **Sin Memoización:**
```tsx
// Problema: recalcula en cada render
const filteredSteps = steps.filter(step => 
  step.subSteps.some(sub => {
    const haystack = normalizeText(`${sub.subStepName} ${sub.notes}`);
    return deselectedTerms.some(term => !haystack.includes(term));
  })
);

// Solución
const filteredSteps = useMemo(() => 
  buildCookingSteps(steps, ingredientSelection),
  [steps, ingredientSelection]
);
```

b) **Re-renders Innecesarios:**
- El componente se re-renderiza completamente cuando cambia un estado
- No hay división de componentes para aislar cambios

c) **Sin Code Splitting:**
- Vite puede aprovechar dynamic imports para screens

### 8. **Datos Hardcodeados**
**Problema:** Todas las recetas están en código (`recipes`, `recipeCategories`, etc.)

**Mejora:** Mover a estructura JSON/DB:
```
src/data/
  ├── recipes.json
  ├── categories.json
  └── ingredientMappings.json
```

---

## 🟢 PROBLEMAS MENORES / UX

### 9. **Accesibilidad (A11y) Insuficiente**
**Faltantes:**
- `aria-label` en elementos interactivos
- `role` explícitos en divs
- `tabindex` mal manejado
- Sin contraste de colores validado

**Mejora:**
```tsx
<button 
  onClick={handleNext}
  aria-label={`Ir al siguiente paso: ${nextStep.stepName}`}
  className={cn(buttonClasses, "focus:ring-2 focus:ring-offset-2")}
>
  Siguiente
</button>
```

### 10. **Sin Offline Support**
**Problema:** Si falla internet, la app es inutilizable

**Soluciones:**
- Implementar Service Worker
- Cache de recetas generadas
- Indicador de estado online/offline

### 11. **Sin Analytics/Logging**
**Problema:** No hay visibilidad de cómo usan la app

**Mejora:**
```tsx
function trackEvent(eventName: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, data);
  }
}

// Uso
trackEvent('recipe_started', { recipeId: selectedRecipe.id, portion });
trackEvent('cooking_completed', { recipeName: selectedRecipe.name });
```

### 12. **Interfaz No Responsive en Tablets**
**Problema:** Diseño optimizado para móvil, puede ser incómodo en tablets

**Verificar:** Media queries para tablets (768px-1024px)

---

## 📊 PROBLEMAS DE CÓDIGO

### 13. **Duplicación de Código**
**Ejemplos:**
```tsx
// Aparece 3+ veces
const match = normalized.match(/(\d+(?:[.,]\d+)?)/);
const parsed = Number.parseFloat(match[1].replace(',', '.'));

// Solución: extraer a utilidad
function extractNumberFromText(text: string): number | null {
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number.parseFloat(match[1].replace(',', '.')) : null;
}
```

### 14. **Funciones Muy Largas**
**Ejemplo:** `buildCookingSteps()` hace múltiples cosas:
1. Filtra ingredientes
2. Filtra pasos
3. Asegura transiciones de fuego

**Mejora:** Dividir en funciones más pequeñas

### 15. **Sin Tests**
**Falta:**
- Tests unitarios para utilidades (`parseTimerSeconds`, etc.)
- Tests de integración para flujos
- Tests e2e para el flujo de cocción

**Implementar:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event
```

```tsx
// __tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { parseTimerSeconds } from '../utils';

describe('parseTimerSeconds', () => {
  it('parses "120" as 120', () => {
    expect(parseTimerSeconds('120')).toBe(120);
  });
  
  it('parses "1,5" as 1.5', () => {
    expect(parseTimerSeconds('1,5')).toBe(1.5);
  });
});
```

### 16. **Comentarios Insuficientes**
**Problema:** Lógica compleja sin explicación (ej: `inferPeopleCountFromClarifications`)

**Mejora:** Agregar comentarios explicativos

---

## 🛠️ MEJORAS DE INFRAESTRUCTURA

### 17. **Vite Config Demasiado Complejo**
**Problema:** 382 líneas de configuración personalizada

**Mejora:**
- Considerar usar Next.js para mejor DX (SSR, API routes out-of-box)
- O modularizar `vite.config.ts`

### 18. **Sin Linting/Formatting Automático**
**Falta:**
```bash
npm install --save-dev eslint prettier eslint-config-prettier
```

**Agregar `.eslintrc.json` y `.prettierrc`**

### 19. **Sin Variables de Entorno Documentadas**
**Crear `.env.example`:**
```
GOOGLE_API_KEY=
OPENAI_API_KEY=
GOOGLE_MODEL=gemini-2.5-flash
VITE_APP_VERSION=0.0.1
```

### 20. **CI/CD No Configurado**
**Falta:** GitHub Actions para testing y deployment

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

---

## ✨ MEJORAS OPCIONALES / FUTURO

### 21. **Internacionalización (i18n)**
Actualmente todo está en español. Facilitar traducción con `i18next`

### 22. **Temas (Dark Mode)**
Implementar con `next-themes` (ya está en package.json pero no se usa)

### 23. **Notificaciones Push**
Para recordar a usuarios que terminen una receta

### 24. **Compartir Recetas**
QR o URL para compartir recetas generadas con amigos

### 25. **Historial de Recetas**
Mostrar recetas cocinadas recientemente

---

## 📈 PLAN DE ACCIÓN PRIORIZADO

### **Semana 1 - Crítico**
1. ✅ Refactorizar componente monolítico (dividir en screens)
2. ✅ Implementar `useReducer` para estado
3. ✅ Agregar localStorage para persistencia
4. ✅ Mejorar tipado TypeScript

### **Semana 2 - Alto**
5. ✅ Implementar manejo de errores con retry
6. ✅ Agregar tests unitarios básicos
7. ✅ Configurar ESLint + Prettier
8. ✅ Mejorar a11y

### **Semana 3 - Medio**
9. ✅ Agregar validación de entrada
10. ✅ Optimizar performance con memo
11. ✅ Documentar variables de entorno
12. ✅ Agregar Service Worker para offline

### **Después - Bajo**
13. ⏳ Configurar CI/CD
14. ⏳ Agregar i18n
15. ⏳ Implementar analytics
16. ⏳ Agregar dark mode

---

## 📚 Recursos Recomendados

- **React Best Practices:** https://react.dev/learn
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Testing Library:** https://testing-library.com/docs/react-testing-library/intro/
- **Web Accessibility:** https://www.w3.org/WAI/fundamentals/
- **Vite Optimization:** https://vitejs.dev/guide/features.html

---

## ✅ Resumen de Puntos Fuertes

Pese a los puntos de mejora, el proyecto tiene:
- ✨ Buena estructura de carpetas
- ✨ Uso de componentes UI de calidad (shadcn/ui)
- ✨ Integración inteligente de IA
- ✨ UX intuitiva para cocinar
- ✨ Flexibilidad de porciones
- ✨ Soporte para múltiples APIs de IA

---

**Generado:** 27 de febrero, 2026
**Versión:** 1.0
