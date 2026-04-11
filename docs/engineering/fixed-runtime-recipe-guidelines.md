# Estructura oficial de recetas (Runtime fijo)

Este documento define la estructura y reglas de receta para el flujo `runtime-fijo`.

## 1. Título
- Formato recomendado: `Nombre del plato (porciones)`.
- Ejemplo: `Arroz con lentejas + lomito al jugo (4 personas)`.

## 2. Ingredientes agrupados por componente
- Agrupar por bloques reales de cocina (arroz, lentejas, proteína, base/salsa).
- Usar cantidades explícitas y consistentes (`g`, `ml`, `unidades`).
- Evitar ambigüedad (`un poco`, `al gusto`) cuando se busque ejecución estricta.
- Regla: ingredientes describen contexto global, no instrucciones.

## 3. Preparación (mise en place)
- Lista directa: 1 acción por línea.
- Debe incluir cortes/lavado/separación por uso.
- No incluir cocción ni timers.
- Regla: en preparación no hay fuego.

## 4. Fases de cocción
- Sin límite de fases; cada fase debe tener propósito claro.
- Flujo recomendado:
  - preparación
  - procesos largos
  - procesos paralelos
  - integración
  - finalización
  - armado
- La receta debe permitir paralelismo cuando aplique.
- Regla: cada paso debe ser una acción ejecutable.

## 5. Timers
- Solo usar timers cuando el usuario deba esperar un cambio de estado.
- Un timer debe representar un cambio físico observable.
- Evitar timers duplicados sin propósito.

## 6. Ingredientes dentro de los pasos
- Repetir cantidad explícita en pasos de agregado.
- Ejemplo correcto: `Agregar 30 ml de aceite`.
- Evitar: `Agregar aceite`.
- Regla: cada paso debe poder ejecutarse sin mirar arriba.

## 7. Resultados esperados
- Incluir checkpoints observables en puntos clave:
  - translúcido
  - huequitos visibles
  - aderezo espeso
  - dorado
- Estos resultados son validación en tiempo real.

## 8. Dependencias entre fases
- Cada fase debe implicar qué habilita antes/después.
- Ejemplo: lentejas listas habilitan integración.

## 9. Paralelismo
- Estructurar fases para cocción concurrente cuando aplique.
- Evitar linealizar por inercia recetas que naturalmente son paralelas.

## 10. Final / armado
- Incluir fase final de servido/integración/emplatado.

## 11. Container por paso (v2.2 opcional)
- Campo opcional recomendado en `step`: `container`.
- Usar identificadores estables con sufijo numérico para evitar ambigüedad futura.
- Formato recomendado: `<tipo>-<n>`.
- Ejemplos:
  - `bowl-1`
  - `molde-1`
  - `olla-1`
  - `sarten-1`
  - `licuadora-1`
  - `jarra-1`
  - `airfryer-1`
- Si no existe `container`, el runtime debe seguir funcionando sin cambios.
