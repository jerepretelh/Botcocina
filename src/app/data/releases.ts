import type { AppRelease } from '../../types';

export const appReleases: AppRelease[] = [
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
