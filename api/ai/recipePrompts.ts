import type { AIPreviewMessage, AIPreRecipe } from '../../src/app/lib/recipeAI.js'

type RecipeContextDraft = {
  prompt?: unknown
  servings?: unknown
  availableIngredients?: unknown
  avoidIngredients?: unknown
}

export type AIRecipeRequestMode = 'preview' | 'generate' | 'clarify'

export function extractContextTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && typeof (item as { value?: unknown }).value === 'string') {
        return ((item as { value: string }).value || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

export function resolveDefaultServings(rawContext: RecipeContextDraft | null): number {
  const servings =
    typeof rawContext?.servings === 'number' && Number.isFinite(rawContext.servings) && rawContext.servings > 0
      ? Math.round(rawContext.servings)
      : null
  return servings ?? 2
}

export function buildStructuredUserPrompt(rawPrompt: string, rawContext: RecipeContextDraft | null): string {
  const prompt = rawPrompt.trim()
  if (!rawContext || typeof rawContext !== 'object') {
    return [prompt, '- Comensales objetivo: 2'].filter(Boolean).join('\n')
  }

  const servings = resolveDefaultServings(rawContext)
  const availableIngredients = extractContextTokens(rawContext.availableIngredients)
  const avoidIngredients = extractContextTokens(rawContext.avoidIngredients)
  const lines = [prompt, `- Comensales objetivo: ${servings}`]

  if (availableIngredients.length > 0) {
    lines.push(`- Ingredientes disponibles: ${availableIngredients.join(', ')}`)
  }
  if (avoidIngredients.length > 0) {
    lines.push(`- Ingredientes a evitar: ${avoidIngredients.join(', ')}`)
  }

  return lines.filter(Boolean).join('\n')
}

export function buildPreviewConversation(messages: AIPreviewMessage[] | undefined): string {
  if (!Array.isArray(messages) || messages.length === 0) return ''
  const conversationLines = messages
    .filter((message) => message && typeof message.text === 'string' && message.text.trim())
    .map((message) => `- ${message.role === 'assistant' ? 'IA' : 'Usuario'}: ${message.text.trim()}`)

  if (conversationLines.length === 0) return ''
  return ['Historial de ajustes conversacionales:', ...conversationLines].join('\n')
}

export function serializeApprovedPreRecipe(preRecipe: AIPreRecipe | null | undefined): string {
  if (!preRecipe) return ''
  return JSON.stringify(preRecipe, null, 2)
}

export function promptConfig(mode: AIRecipeRequestMode) {
  const previewSystemPrompt = [
    'Eres un chef experto en cocina casera peruana. Responde SOLO JSON valido sin markdown.',
    'Tu tarea es generar una prereceta conversacional, no la receta final detallada.',
    'La prereceta SIEMPRE debe estar estructurada por fases aunque el plato sea simple.',
    'Incluye ingredientes visibles con cantidades explicitas.',
    'La prereceta debe estar completa a nivel culinario: ingredientes, preparacion, fases, orden, observaciones y puntos clave.',
    'Si el usuario no dio cantidad, usa por defecto una base de 2 personas.',
    'Usa lenguaje culinario de Peru cuando aplique.',
    'No la reduzcas a un resumen breve. Debe leerse como una receta completa explicada por chat.',
    'No incluyas timers de ejecucion estructurados como contrato final, pero si puedes mencionar tiempos orientativos dentro del texto de las fases.',
    'Formato exacto:',
    '{',
    '  "name": "Nombre del plato",',
    '  "icon": "emoji",',
    '  "description": "Resumen corto del enfoque",',
    '  "chatResponse": "Respuesta completa estilo chat, con emojis, secciones y saltos de linea, muy parecida a un mensaje humano como los ejemplos dados por el usuario.",',
    '  "baseYield": {',
    '    "type": "servings|units|weight|volume|pan_size|tray_size|custom",',
    '    "value": 2,',
    '    "unit": "personas",',
    '    "label": "2 personas"',
    '  },',
    '  "ingredients": [',
    '    { "name": "Ingrediente", "emoji": "emoji", "amountText": "2 tazas", "notes": "opcional" }',
    '  ],',
    '  "phases": [',
    '    {',
    '      "title": "FASE 1: Mise en place",',
    '      "summary": "objetivo corto",',
    '      "actions": ["Lavar arroz", "Picar cebolla"]',
    '    }',
    '  ],',
    '  "tips": ["Clave breve"],',
    '  "importantNotes": ["Observacion importante"]',
    '}',
    'Reglas:',
    '- chatResponse es obligatorio y debe verse como un mensaje de chat listo para mostrar al usuario.',
    '- chatResponse debe incluir: titulo del plato, bloque de ingredientes y desarrollo completo de la prereceta con fases detalladas.',
    '- En chatResponse, cada ingrediente real debe ir en una sola linea. No pongas el nombre en una linea y la cantidad en otra.',
    '- Solo puedes dejar una linea de titulo sin cantidad cuando sea un bloque o componente, por ejemplo "🍚 Arroz" o "🥩 Lomito al jugo".',
    '- Debajo de cada bloque, las cantidades y preparaciones deben ir linea por linea, tal como en los ejemplos del usuario.',
    '- Usa saltos de linea reales, no markdown complejo ni tablas.',
    '- Puedes usar encabezados como "🛒 Ingredientes", "🔪 FASE 1", "💡 Claves importantes".',
    '- Prioriza un estilo visual muy cercano a estos patrones: plato en la primera linea, luego ingredientes agrupados por bloque cuando aplique, luego fases secuenciales, luego claves importantes.',
    '- Ejemplo de tono esperado: "🍛 Arroz con lentejas + lomito al jugo", "🍌 Keke de plátano (banana bread)", "🍹 Jugo especial peruano (PRO)".',
    '- Dentro de chatResponse puedes usar bullets visuales como "👉", "❌", "🔥", "🔄", "🍽️" para que se lea como mensaje de chat humano.',
    '- No omitas componentes importantes de la receta. Si hay arroz, salsa, aderezo, masa, relleno, bebida base u otros frentes, todos deben aparecer.',
    '- Usa entre 4 y 10 fases cuando haga falta.',
    '- Cada fase debe tener suficiente detalle para que el usuario entienda el flujo completo sin ver todavia la receta final guiada.',
    '- El resultado debe parecerse mas a una receta editorial completa que a una lista corta de bullets.',
    '- Las fases deben venir desarrolladas con suficiente detalle, casi al nivel de una receta completa, pero todavia en formato de prereceta conversacional.',
    '- No inventes campos adicionales.',
    '- Si el usuario afina por chat, devuelve una prereceta completa actualizada.',
  ].join('\n')

  const generateSystemPrompt = [
    'Eres un chef experto. Responde SOLO JSON valido sin markdown.',
    'Debes generar la receta final detallada para una app de cocina guiada.',
    'Usa como fuente de verdad la prereceta aprobada por el usuario y respeta sus ingredientes, base y fases.',
    'La receta final debe modelarse por defecto como compuesta cuando sea posible.',
    'Convierte las fases aprobadas en pasos/subpasos operables con timers solo cuando realmente aporten.',
    'Usa lenguaje culinario de Peru cuando aplique.',
    'Formato exacto:',
    '{',
    '  "id": "slug-corto-opcional",',
    '  "name": "Nombre receta",',
    '  "icon": "emoji",',
    '  "ingredient": "Ingrediente principal",',
    '  "description": "Resumen corto",',
    '  "tip": "Consejo breve",',
    '  "baseYield": {',
    '    "type": "servings|units|weight|volume|pan_size|tray_size|custom",',
    '    "value": 2,',
    '    "unit": "personas",',
    '    "label": "texto corto opcional"',
    '  },',
    '  "ingredients": [',
    '    {',
    '      "name": "Ingrediente",',
    '      "emoji": "emoji",',
    '      "indispensable": true,',
    '      "amount": {',
    '        "value": 200,',
    '        "unit": "g",',
    '        "text": "200 g",',
    '        "scalable": true,',
    '        "scalingPolicy": "linear|fixed|gentle|batch|container_dependent|non_scalable"',
    '      }',
    '    }',
    '  ],',
    '  "steps": [',
    '    {',
    '      "title": "Nombre paso",',
    '      "fireLevel": "low|medium|high",',
    '      "subSteps": [',
    '        {',
    '          "text": "Accion",',
    '          "notes": "Detalle breve",',
    '          "amount": { "value": 1, "unit": "taza", "text": "1 taza", "scalable": true, "scalingPolicy": "linear" },',
    '          "timer": { "durationSeconds": 480, "scalingPolicy": "gentle" },',
    '          "isTimer": true',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "timeSummary": { "prepMinutes": 10, "cookMinutes": 18, "totalMinutes": 28 },',
    '  "experience": "compound",',
    '  "compoundMeta": null',
    '}',
    'No inventes campos adicionales.',
    'La receta debe seguir fielmente la prereceta aprobada y sus ajustes.',
  ].join('\n')

  const clarifySystemPrompt = [
    'Eres un asistente culinario. Responde SOLO JSON valido sin markdown.',
    'Devuelve { "needsClarification": false, "questions": [] }.',
  ].join('\n')

  if (mode === 'preview') {
    return {
      systemPrompt: previewSystemPrompt,
      userPrefix: 'Solicitud del usuario:',
    }
  }
  if (mode === 'generate') {
    return {
      systemPrompt: generateSystemPrompt,
      userPrefix: 'Receta final solicitada:',
    }
  }
  return {
    systemPrompt: clarifySystemPrompt,
    userPrefix: 'Solicitud del usuario:',
  }
}
