import { Layers, Palette, Type, Grid3X3, Merge, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface DesignSystemScreenProps {
  onBack: () => void;
}

const tokens = [
  { group: 'Color primario', value: 'Orange 500', sample: 'bg-orange-500' },
  { group: 'Surface dark', value: 'Black/Slate glass', sample: 'bg-black/30' },
  { group: 'Texto principal', value: 'Slate 50', sample: 'bg-slate-50' },
  { group: 'Radio base', value: '2xl / 3xl', sample: 'bg-slate-700' },
  { group: 'Espaciado base', value: '4 / 6 / 8', sample: 'bg-slate-600' },
  { group: 'Tipografía', value: 'Quicksand + Outfit', sample: 'bg-slate-500' },
];

const keepComponents = [
  'CookingScreen (layout task-first y timer)',
  'Ingredients checklist (con estado usado/no usado)',
  'AIClarifyScreen (flujo IA de aclaración)',
  'RecipeSetupScreen (configuración de porciones)',
  'RoadmapModal (navegación rápida de subpasos)',
];

const mergeComponents = [
  'Header de pantallas -> AppHeader (marca, voz, acciones)',
  'Botones primario/secundario -> ActionButton (variants: primary, secondary, danger, ghost)',
  'Cards de recetas/categorías -> RecipeCardBase con variantes',
  'Panel de estado/alertas -> StatusNotice único (error, success, warning)',
  'Bloques de progreso -> ProgressHeader reusable',
];

const deprecateComponents = [
  'Estilos legacy tipo dashboard estático en Home',
  'Duplicados de CTA con el mismo objetivo en una misma vista',
  'Mensajes auxiliares repetitivos sin contexto de tarea',
];

const usedComponents = {
  screens: [
    'CategorySelectScreen',
    'RecipeSelectScreen',
    'AIClarifyScreen',
    'RecipeSetupScreen',
    'IngredientsScreen',
    'CookingScreen',
    'DesignSystemScreen',
  ],
  ui: [
    'RoadmapModal',
    'Button (estilos utilitarios en pantallas)',
    'Cards/Sections con Tailwind (surface patterns)',
    'Status messaging embebido (error/success en Home IA)',
  ],
  hooks: [
    'useRecipeSelection',
    'useCookingProgress',
    'usePortions',
    'useThermomixHandlers',
    'useThermomixTimer',
    'useThermomixVoice',
    'useAIRecipeGeneration',
  ],
};

const storybookLikeCatalog = [
  {
    category: 'Screens',
    items: [
      { name: 'CategorySelectScreen', path: 'components/screens/CategorySelectScreen.tsx', status: 'used', description: 'Home y entrada a categorías/IA.' },
      { name: 'RecipeSelectScreen', path: 'components/screens/RecipeSelectScreen.tsx', status: 'used', description: 'Listado de recetas por categoría.' },
      { name: 'RecipeSetupScreen', path: 'components/screens/RecipeSetupScreen.tsx', status: 'used', description: 'Configuración de porciones y cantidad base.' },
      { name: 'IngredientsScreen', path: 'components/screens/IngredientsScreen.tsx', status: 'used', description: 'Checklist de ingredientes previos a cocción.' },
      { name: 'CookingScreen', path: 'components/screens/CookingScreen.tsx', status: 'used', description: 'Flujo principal durante subpasos y temporizador.' },
      { name: 'AIClarifyScreen', path: 'components/screens/AIClarifyScreen.tsx', status: 'used', description: 'Preguntas de aclaración para recetas IA.' },
      { name: 'DesignSystemScreen', path: 'components/screens/DesignSystemScreen.tsx', status: 'new', description: 'Catálogo de diseño y arquitectura UI.' },
    ],
  },
  {
    category: 'Custom UI',
    items: [
      { name: 'RoadmapModal', path: 'components/ui/RoadmapModal.tsx', status: 'used', description: 'Vista rápida de ruta de subpasos.' },
      { name: 'Action Buttons', path: 'components/screens/*', status: 'to-merge', description: 'Botones primario/secundario repetidos entre pantallas.' },
      { name: 'Progress Header', path: 'components/screens/CookingScreen.tsx', status: 'to-merge', description: 'Patrón de progreso reutilizable.' },
    ],
  },
  {
    category: 'UI Primitives (shadcn/radix)',
    items: [
      { name: 'button.tsx', path: 'components/ui/button.tsx', status: 'available', description: 'Primitiva disponible para estandarizar CTAs.' },
      { name: 'card.tsx', path: 'components/ui/card.tsx', status: 'available', description: 'Contenedor reutilizable para módulos.' },
      { name: 'sheet.tsx', path: 'components/ui/sheet.tsx', status: 'available', description: 'Base para menús laterales/drawers.' },
      { name: 'dialog.tsx', path: 'components/ui/dialog.tsx', status: 'available', description: 'Modales de confirmación/ayuda.' },
      { name: 'tabs.tsx', path: 'components/ui/tabs.tsx', status: 'available', description: 'Navegación de secciones internas.' },
      { name: 'input.tsx / textarea.tsx', path: 'components/ui/input.tsx', status: 'available', description: 'Campos de formulario consistentes.' },
    ],
  },
];

export function DesignSystemScreen({ onBack }: DesignSystemScreenProps) {
  const badgeClass = (status: string) => {
    if (status === 'used') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
    if (status === 'new') return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
    if (status === 'to-merge') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-black text-slate-100 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">Design System</p>
            <h1 className="text-3xl md:text-4xl font-extrabold">Sistema de diseño del proyecto</h1>
            <p className="text-slate-400 mt-2">Resumen de tokens, componentes y plan de consolidación UI.</p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 font-semibold"
          >
            Volver al inicio
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-orange-400 mb-2"><Palette className="h-5 w-5" />Tokens</div>
            <p className="text-sm text-slate-300">Paleta dark con acento naranja para acción principal y estados contextuales.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-cyan-400 mb-2"><Type className="h-5 w-5" />Tipografía</div>
            <p className="text-sm text-slate-300">Jerarquía clara: títulos de tarea, contexto corto y CTA dominante.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-emerald-400 mb-2"><Grid3X3 className="h-5 w-5" />Layout</div>
            <p className="text-sm text-slate-300">Patrón tablet landscape de 3 paneles: ingredientes, foco, siguiente.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Layers className="h-5 w-5 text-orange-400" />Tokens base</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tokens.map((token) => (
              <div key={token.group} className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{token.group}</p>
                  <p className="font-semibold">{token.value}</p>
                </div>
                <div className={`h-6 w-10 rounded ${token.sample}`} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            Componentes en uso (actual)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">Pantallas</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                {usedComponents.screens.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">UI / Contenedores</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                {usedComponents.ui.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">Hooks de flujo</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                {usedComponents.hooks.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-400" />
            Catálogo tipo Storybook
          </h2>
          <div className="space-y-5">
            {storybookLikeCatalog.map((group) => (
              <div key={group.category} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                <h3 className="font-semibold text-orange-300 mb-3">{group.category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <article key={`${group.category}-${item.name}`} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-100">{item.name}</p>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${badgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.path}</p>
                      <p className="text-sm text-slate-300 mt-2">{item.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            Previsualización de componentes
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            Vista rápida de variantes visuales actuales del proyecto.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">ActionButton</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-400 transition-colors">
                  Primario
                </button>
                <button className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 border border-slate-600 hover:bg-slate-700 transition-colors">
                  Secundario
                </button>
                <button className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-400 transition-colors">
                  Danger
                </button>
                <button className="px-4 py-2 rounded-xl bg-transparent text-slate-200 border border-slate-500 hover:bg-slate-800/60 transition-colors">
                  Ghost
                </button>
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">ProgressHeader</h3>
              <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-300">Progreso de cocción</span>
                  <span className="text-orange-400 font-semibold">Subpaso 4 de 16</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full w-1/4 bg-orange-500 rounded-full" />
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">RecipeCardBase</h3>
              <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-orange-300 font-semibold">🍳 Huevo frito</p>
                    <p className="text-xs text-slate-400 mt-1">Receta rápida</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                    listo
                  </span>
                </div>
                <button className="mt-4 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-colors">
                  Cocinar ahora
                </button>
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <h3 className="font-semibold text-cyan-300 mb-3">IngredientItem</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">🫒</span>
                    <span>Aceite</span>
                  </div>
                  <span className="text-slate-400 text-sm">1 cda</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300">✓</span>
                    <span className="line-through text-emerald-300">Ajo</span>
                  </div>
                  <span className="text-emerald-400 text-sm">1 diente</span>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 lg:col-span-2">
              <h3 className="font-semibold text-cyan-300 mb-3">StatusNotice</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-red-700/40 bg-red-900/20 p-3">
                  <p className="text-sm font-semibold text-red-300">Error</p>
                  <p className="text-xs text-red-200/90 mt-1">No se pudo generar la receta.</p>
                </div>
                <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 p-3">
                  <p className="text-sm font-semibold text-emerald-300">Success</p>
                  <p className="text-xs text-emerald-200/90 mt-1">Receta agregada correctamente.</p>
                </div>
                <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 p-3">
                  <p className="text-sm font-semibold text-amber-300">Warning</p>
                  <p className="text-xs text-amber-200/90 mt-1">Revisa ingredientes opcionales.</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5">
            <h3 className="font-bold text-emerald-300 mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />Mantener</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              {keepComponents.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-cyan-700/40 bg-cyan-950/20 p-5">
            <h3 className="font-bold text-cyan-300 mb-3 flex items-center gap-2"><Merge className="h-5 w-5" />Fusionar</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              {mergeComponents.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>

          <article className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5">
            <h3 className="font-bold text-amber-300 mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Deprecar</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              {deprecateComponents.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
