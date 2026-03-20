import type { BacklogEpic } from '../../types';

export const productBacklogLastUpdated = '2026-03-20';

export const productBacklog: BacklogEpic[] = [
  {
    id: 'recipev2-core-setup',
    title: 'RecipeV2 core y setup semántico',
    summary: 'Cerrar el contrato funcional del setup V2 por familia y mantener coherencia entre setup, scaling y cooking.',
    status: 'in_progress',
    area: 'recipe-v2',
    priority: 'high',
    items: [
      {
        id: 'recipev2-targetyield-saneado',
        type: 'story',
        title: 'Blindar targetYield y separar cookingContext',
        summary: 'Quedó estabilizado el saneamiento de targetYield, la persistencia segura y la separación entre rendimiento y contexto operativo.',
        status: 'done',
        priority: 'high',
        links: {
          recipeIds: ['arroz', 'papas-airfryer', 'pan-palta-huevo'],
          releaseVersions: ['0.0.4'],
        },
      },
      {
        id: 'recipev2-setup-por-familia',
        type: 'story',
        title: 'Alinear setup por familia',
        summary: 'Direct yield, base ingredient, container bound y cookingContext ya cuentan con preguntas y controles principales coherentes.',
        status: 'done',
        priority: 'high',
        links: {
          recipeIds: ['arroz', 'keke-platano-molde', 'papas-airfryer'],
          screenIds: ['recipe-setup'],
        },
      },
      {
        id: 'recipev2-ux-secundaria',
        type: 'task',
        title: 'Cerrar UX secundaria y validación extendida',
        summary: 'Queda revisar copy secundario, ayudas y smoke tests más amplios sobre familias V2 sin cambiar la semántica actual.',
        status: 'pending',
        priority: 'medium',
        links: {
          screenIds: ['recipe-setup'],
          notes: 'No reabrir separación targetYield/cookingContext.',
        },
      },
    ],
  },
  {
    id: 'library-overlays',
    title: 'Biblioteca global y navegación de overlays',
    summary: 'Hacer que biblioteca, rutas y overlays de receta cuenten la misma historia para recetas reales y V2 locales visibles.',
    status: 'in_progress',
    area: 'library-navigation',
    priority: 'high',
    items: [
      {
        id: 'library-all-real-recipes',
        type: 'story',
        title: 'Mostrar solo recetas reales y agrupar en Todas',
        summary: 'La biblioteca global ya muestra solo recetas reales, con una agrupación Todas y sin mezclar ideas.',
        status: 'done',
        priority: 'high',
        links: {
          screenIds: ['global-recipes', 'recipe-select'],
          releaseVersions: ['0.0.4'],
        },
      },
      {
        id: 'library-v2-local-routing',
        type: 'story',
        title: 'Estabilizar recetas V2 locales visibles',
        summary: 'Se resolvió la visibilidad V2 core, el hydration de selección y la estabilidad de overlays para casos como keke y papas-airfryer.',
        status: 'done',
        priority: 'high',
        links: {
          recipeIds: ['keke-platano-molde', 'papas-airfryer'],
          screenIds: ['global-recipes', 'recipe-select', 'recipe-setup', 'ingredients'],
        },
      },
      {
        id: 'library-navigation-integration',
        type: 'task',
        title: 'Ampliar cobertura de integración real',
        summary: 'Falta más cobertura de flujos completos de biblioteca y overlays, más allá de helpers y regresiones puntuales.',
        status: 'pending',
        priority: 'medium',
        links: {
          screenIds: ['global-recipes', 'recipe-select', 'recipe-setup', 'ingredients'],
        },
      },
    ],
  },
  {
    id: 'compound-runtime',
    title: 'Compound y persistencia operativa',
    summary: 'Reducir diferencias funcionales entre runtime standard y compound sin romper la subarquitectura actual.',
    status: 'pending',
    area: 'compound',
    priority: 'high',
    items: [
      {
        id: 'compound-config-aware-progress',
        type: 'story',
        title: 'Resetear progreso compound por configuración efectiva',
        summary: 'El snapshot compound ya no se rehidrata si la configuración efectiva cambió.',
        status: 'done',
        priority: 'high',
        links: {
          recipeIds: ['tallarines-rojos-compuesto'],
          screenIds: ['cooking'],
        },
      },
      {
        id: 'compound-functional-consolidation',
        type: 'task',
        title: 'Consolidar compound contra el contrato standard',
        summary: 'Queda revisar divergencias funcionales de experiencia, persistencia y narrativa operativa frente al runtime standard.',
        status: 'pending',
        priority: 'medium',
      },
    ],
  },
  {
    id: 'planning-shopping-v2',
    title: 'Planning y shopping sobre V2',
    summary: 'Cerrar la coherencia entre snapshots de planificación, setup semántico y agregación real sobre RecipeV2.',
    status: 'in_progress',
    area: 'planning-shopping',
    priority: 'high',
    items: [
      {
        id: 'planning-setup-contract',
        type: 'story',
        title: 'Alinear PlanRecipeSheet al contrato UX compartido',
        summary: 'El planning ya comparte reglas mínimas de setup por familia y evita controles inválidos en container bound.',
        status: 'in_progress',
        priority: 'high',
        links: {
          screenIds: ['weekly-plan'],
        },
      },
      {
        id: 'planning-v2-snapshots',
        type: 'task',
        title: 'Cerrar snapshots V2 y consistencia operativa',
        summary: 'Queda asegurar el cierre total de snapshots, shopping y resolución V2 real sin caminos legacy ambiguos.',
        status: 'pending',
        priority: 'high',
      },
    ],
  },
  {
    id: 'qa-regressions',
    title: 'QA regresión y smoke tests',
    summary: 'Convertir bugs reales observados en cobertura estable y asegurar smoke tests productivos de los flujos core.',
    status: 'in_progress',
    area: 'qa',
    priority: 'medium',
    items: [
      {
        id: 'qa-targeted-regressions',
        type: 'story',
        title: 'Agregar regresiones focalizadas de routing, setup y runtime',
        summary: 'Ya se añadieron tests de alto valor para global recipes, planning setup, runtime V2 y routing de overlays.',
        status: 'done',
        priority: 'medium',
        links: {
          releaseVersions: ['0.0.4'],
          screenIds: ['global-recipes', 'recipe-setup', 'ingredients', 'cooking'],
        },
      },
      {
        id: 'qa-authenticated-smoke',
        type: 'task',
        title: 'Ejecutar smoke autenticado en producción',
        summary: 'El harness y el smoke oficial ya están listos; queda correrlo recurrentemente sobre el deploy productivo autenticado y convertir hallazgos en regresiones.',
        status: 'in_progress',
        priority: 'medium',
      },
    ],
  },
];
