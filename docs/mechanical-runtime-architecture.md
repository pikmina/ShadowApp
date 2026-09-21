# Arquitectura del Runtime de Comportamientos Mecánicos (Fase 2)

Este documento define el ciclo de vida, los pipelines de resolución y los contratos de ejecución del motor genérico de `MechanicalBehavior` en ShadowApp.

---

## 1. Principio Fundamental de Diseño

> **El motor ejecuta comportamientos genéricos. Nunca contiene lógica específica para una técnica, rasgo, debilidad o personaje concreto.**

El motor opera exclusivamente sobre estructuras serializadas:
- Modos: `passive`, `active`, `reactive`, `continuous`
- Eventos e Intercepciones: `MechanicalEvent`, disparadores (`MechanicalTrigger`)
- Condiciones y Transiciones: `MechanicalCondition`, cruces de umbral (`cross_down`, `cross_up`)
- Pipelines Deterministas: `processDamagePipeline`, `processHealingPipeline`, `calculateEffectiveCost`
- Resolución por Ramas: `resolveOutcomesForRoll` (éxito, fallo, márgenes de fallo/éxito)
- Límites, Excepciones y Contadores: cooldowns, requisitos de inventario/estado, contadores de turnos consecutivos y gasto de recursos.

---

## 2. Ciclo de Vida del Runtime

El runtime opera sobre dos estructuras de estado inmutables:
1. `RuleWorld`: Estado persistente de las entidades (recursos SA/ES, atributos, barrera, modificadores y estados).
2. `EncounterRuntimeState`: Estado transitorio del encuentro (turno actual, acumuladores por turno, contadores activos, modificadores pendientes `until_next_use` / `until_turn_end`, eventos ejecutados).

```text
Entrada (Acción / Evento)
  ↓
1. Verificación de Limitaciones (Cooldowns, Requisitos)
  ↓
2. Evaluación de Condiciones (Predicados AND/OR, Umbrales, Tags)
  ↓ [Si falla: Chequeo de Excepción (Control Exception) con coste alternativo]
3. Resolución (Automática, Tirada Simple o RD con Ramas Diferenciadas)
  ↓
4. Ejecución Atómica de Efectos
  - Modificación de Recursos / Barrera
  - Aplicación de Modificadores Pendientes
  - Aplicación de Estados
  - Incremento / Reseteo de Contadores
  ↓
5. Trazabilidad y Prevención de Reentrancia
  ↓
Salida: { newWorld, newEncounter, trace }
```

---

## 3. Pipelines de Procesamiento

### 3.1 Pipeline de Daño (`processDamagePipeline`)
El daño no se resta arbitrariamente en componentes de UI. Pasa por un pipeline determinista:
1. **Daño Base**: Proporcionado por la acción o tirada.
2. **Modificadores Salientes**: Filtros de tags y multiplicadores del atacante.
3. **Modificadores Entrantes**: Filtros de vulnerabilidad/resistencia (ej. `tagFilter: "fire"`) aplicados en orden matemático estricto (`set` → `multiply/divide` → `add/subtract`).
4. **Absorción por Barrera**: La barrera del objetivo absorbe daño hasta agotarse.
5. **Daño a Salud (SA)**: El remanente reduce la Salud actual.
6. **Acumulador de Turno**: Se incrementa `damageReceivedThisTurn` del participante.

> **Importante:** La vulnerabilidad (ej. fuego +4) amplifica el daño del ataque existente en el paso 3. **Nunca** genera un segundo evento de daño separado.

### 3.2 Pipeline de Curación (`processHealingPipeline`)
1. **Curación Base**: Calculada por la acción o ítem.
2. **Modificadores Entrantes**: Reducciones o bonificaciones (ej. Salud Frágil: `subtract 1`).
3. **Cap al Máximo**: La curación efectiva nunca supera `max - current`.

### 3.3 Pipeline de Costes y Modificadores Pendientes (`calculateEffectiveCost`)
1. **Coste Base**: Declarado por la técnica o acción.
2. **Modificadores Continuos**: Bonificaciones pasivas activas.
3. **Modificadores Pendientes**: Efectos temporales acumulados (ej. Sobrecarga Total: multiplicador `x2` con duración `until_next_use`).
4. **Consumo Atómico**: Al pagar el coste, los modificadores de un solo uso son retirados de `pendingModifiers`. Los usos subsecuentes vuelven al coste normal.

---

## 4. Resolución Diferenciada por Ramas (RD / Tiradas)

Cuando un comportamiento define `resolution.type: "rd"`, los efectos no se mezclan en descripciones de texto. Se mapean a ramas estructuradas evaluadas según el resultado numérico:

```ts
const res = resolveOutcomesForRoll(rollResult, difficulty, outcomes);
```

### Precedencia de Ramas:
1. **Márgenes Específicos**: `failure_margin` (ej. margen >= 5) o `critical_failure` se evalúan primero.
2. **Resultado General**: Si no califica para margen específico, aplica la rama general `failure` o `success`.
3. **Efectos Propios por Rama**: Cada rama entrega su propio array `effects: MechanicalEffectItem[]` (por ejemplo, `turns: 1` vs `turns: 2`).

---

## 5. Prevención de Loops Infinitos y Reentrancia

Para evitar ciclos infinitos causados por triggers reactivos (ej. un evento de daño que dispara daño, disparando otro daño):
1. **Control de Profundidad (`depth`)**: Todo evento derivado hereda `depth: parent.depth + 1`. Si supera `MAX_EVENT_DEPTH` (default 5), se aborta la cadena con warning en la traza.
2. **Registro de Reentrancia (`executedBehaviorEvents`)**: Se registra la tupla `(behaviorId, eventId)`. Un comportamiento nunca se ejecuta dos veces para el mismo ID de evento en la misma transacción.
3. **Transiciones de Umbral (`cross_down` / `cross_up`)**: Un efecto reactivo que vigila cruces de recursos sólo se dispara cuando el valor previo estaba por encima del umbral y el actual cae por debajo (`checkResourceThresholdTransition`). Permanecer por debajo del umbral no dispara el evento de nuevo.

---

## 6. Registro de Nuevos Triggers y Eventos

Para emitir un evento en el sistema:
```ts
const result = dispatchMechanicalEvent({
  event: {
    id: generateId(),
    type: "use_quirk", // o "receive_damage", "resource_threshold_crossed", etc.
    sourceEntityId: "hero",
    targetEntityId: "hero",
    payload: { tags: ["fire"], rollResult: 14 }
  },
  ownedBehaviorsByEntity,
  world,
  encounter
});
```

El despachador busca en las entidades participantes todos los comportamientos reactivos cuyo `trigger.kind === event.type`, evalúa sus condiciones y aplica las consecuencias de forma secuencial y determinista.

---

## 7. Gestión del Turno (`advanceTurn`)

Al avanzar el turno del encuentro:
- Se limpia `damageReceivedThisTurn`, `esSpentThisTurn` y `actionsTakenThisTurn`.
- Se transfieren flags de historial: `usedQuirkPreviousTurn = usedQuirkThisTurn`, `usedQuirkThisTurn = false`.
- Se evalúan contadores vinculados a eventos de turno (ej. reset si no se usó Quirk en el turno).
- Se purgan modificadores temporales cuya duración es `until_turn_end`.
- Se decrementan duraciones de estados activos.

---

## 8. Coexistencia con el Motor Legacy

- **Precedencia**: La función `shouldUseMechanicalBehaviorRuntime(element)` determina si un elemento es procesado por el nuevo runtime de `MechanicalBehavior` o por el motor legacy `executeRuleSet`.
- Si un elemento tiene `mechanicalBehaviors` definidos, el nuevo runtime procesa exclusivamente esos comportamientos.
- Si solo tiene `effects: AppliedMechanicReference[]`, continúa ejecutándose con `executeRuleSet`.
- Esta separación estricta garantiza cero duplicaciones de efectos durante el periodo de transición.
