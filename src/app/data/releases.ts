import type { AppRelease } from '../../types';

export const appReleases: AppRelease[] = [
  {
    version: '0.0.4',
    title: 'RecipeV2 más confiable, setup saneado y catálogo core',
    date: '2026-03-18',
    summary: 'Se cerraron regresiones del flujo estándar V2, se endureció targetYield persistido, se definieron patrones mínimos de modelado y se marcó un set core de recetas para iterar con menos ruido.',
    changes: [
      'El CTA principal de cooking V2 volvió a alinearse con la intención real del paso, evitando cruces entre avanzar y togglear timers.',
      'Se corrigió el wiring de acciones en cooking V2 para que el botón principal avance, pause o termine según el estado real sin CTA duplicados.',
      'Se blindó targetYield persistido: hydration, resolución y setup ya no aceptan valores contaminados ni muestran notación científica.',
      'resolveTargetYield ahora rechaza NaN, Infinity y magnitudes absurdas; RecipeSetupScreenV2 usa fallbacks seguros para pintar valores humanos.',
      'Se cerró el fix final de render inicial en Arroz Perfecto usando effectiveYield para que la receta core base_ingredient muestre 2 tazas desde el primer render.',
      'Se introdujeron scalingModel, sensitivity y baseIngredientId como metadata mínima de dominio para distinguir direct_yield, base_ingredient y container_bound sin rediseño mayor.',
      'Arroz quedó establecido como patrón base_ingredient ratio_sensitive y Keke de plátano como patrón container_bound ratio_sensitive.',
      'Se mantuvo la separación entre targetYield y cookingContext; Papas en airfryer sigue siendo un caso de contexto operativo y no se forzó a container_bound.',
      'Se consolidó un catálogo core de cobertura con arroz, keke-platano-molde, tallarines-rojos-compuesto, papas-airfryer y pan-palta-huevo; quinua-desayuno quedó opcional y arroz-lentejas-compuesto congelada.',
      'Se añadió isCoreRecipe para marcar explícitamente las recetas principales sin cambiar todavía filtros, layout ni comportamiento funcional.',
      'El setup V2 ahora diferencia mejor sus preguntas y labels por familia: direct_yield mantiene su comportamiento limpio, base_ingredient pregunta por ingrediente base y container_bound pregunta por recipiente de referencia.',
      'Se agregaron tests para persistencia/hydration de targetYield, normalizeTargetYield y presentation del setup; además se validaron manualmente las recetas core principales antes de mergear.',
    ],
  },
  {
    version: '0.0.3',
    title: 'Estabilidad del núcleo culinario y fixes de navegación',
    date: '2026-03-12',
    summary: 'Se corrigieron regresiones del flujo de cocina, se estabilizó el wizard IA y se mejoró la navegación interna en móvil.',
    changes: [
      'El wizard IA ya no rebota silenciosamente a Inicio y mantiene un manejo de errores más claro al finalizar la generación.',
      'El paso Ingredientes -> Cooking volvió a funcionar sin depender de persistencias opcionales de Supabase.',
      'La ruta de Ajustes quedó unificada y el PlanRecipeSheet ya no se filtra a otras pantallas al cambiar de contexto.',
    ],
  },
  {
    version: '0.0.2',
    title: 'Versionado visible y centro de releases',
    date: '2026-03-11',
    summary: 'La app ahora muestra la versión real del build y añade una pantalla dedicada de actualizaciones accesible desde Ajustes.',
    changes: [
      'Se reemplazó la versión hardcodeada por metadata de build para Development, Preview y Production.',
      'Ajustes ahora muestra un resumen de versión con acceso directo a la pantalla de releases.',
      'Se añadió un historial de actualizaciones versionado dentro del repo para mantener notas de release consistentes.',
    ],
  },
];
