import type { AppRelease } from '../../types';

export const appReleases: AppRelease[] = [
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
