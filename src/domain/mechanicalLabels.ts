/**
 * Canonical Centralized Spanish Label Registry for Mechanical Behaviors & Domain Entities
 *
 * Rule: Machine values (internal English enums, literals, identifiers) must NEVER be exposed
 * directly in user-facing UI. This registry provides the single source of truth for UI display.
 */

export const MECHANICAL_LABELS = {
  // 1. MODES
  modes: {
    active: "Activo",
    reactive: "Reactivo",
    continuous: "Continuo",
  },

  // 2. ACTIVATION
  actionTypes: {
    action: "Acción estándar",
    quick_action: "Acción rápida",
    voluntary_reaction: "Reacción voluntaria",
    free_action: "Acción libre",
    manual: "Manual / Narrativa",
  },

  timings: {
    immediate: "Inmediata",
    turns: "Turnos",
    manual: "Manual",
  },

  // 3. TRIGGERS
  triggers: {
    receive_damage: "Recibir daño",
    deal_damage: "Infligir daño",
    receive_healing: "Recibir curación",
    receive_barrier: "Recibir barrera",
    attacked: "Ser atacado",
    attack: "Realizar ataque",
    receive_critical: "Recibir impacto crítico",
    deal_critical: "Infligir impacto crítico",
    use_quirk: "Usar Quirk",
    use_technique: "Usar técnica",
    activate_element: "Activar elemento",
    end_element: "Finalizar elemento",
    cancel_element: "Cancelar elemento",
    roll: "Realizar tirada",
    roll_success: "Tirada exitosa",
    roll_failure: "Tirada fallida",
    critical: "Resultado crítico",
    specific_result: "Resultado específico",
    spend_resource: "Gastar recurso",
    recover_resource: "Recuperar recurso",
    lose_resource: "Perder recurso",
    resource_changed: "Recurso modificado",
    resource_threshold_crossed: "Cruzar umbral de recurso",
    turn_start: "Inicio del turno",
    turn_end: "Fin del turno",
    combat_start: "Inicio del combate",
    combat_end: "Fin del combate",
    consume_item: "Consumir objeto",
    equip_item: "Equipar objeto",
    unequip_item: "Desequipar objeto",
    manual: "Manual / Narrativo",
    channel_interrupted: "Canalización interrumpida",
    traumatic_stimulus: "Estímulo traumático",
    ally_support_received: "Recibir soporte de aliado",
    roll_resolution: "Resolución de tirada",
  },

  triggerDirections: {
    cross_up: "Cruza hacia arriba (supera umbral)",
    cross_down: "Cruza hacia abajo (cae bajo umbral)",
    any: "Cualquier dirección",
  },

  // 4. CONDITIONS
  conditionTypes: {
    resource: "Valor de recurso",
    percentage: "Porcentaje de recurso",
    roll: "Tirada",
    die: "Dado individual",
    status: "Estado Alterado",
    turn_aggregate: "Acumulado del turno",
    turn_history: "Historial de turnos",
    tag: "Etiqueta / Tag",
    item: "Objeto en posesión",
    counter: "Contador de combate",
    attribute: "Atributo",
    manual: "Condición manual / Narrativa",
  },

  conditionLogic: {
    all: "Todas las condiciones (Y)",
    any: "Cualquiera de las condiciones (O)",
  },

  dieSelections: {
    any: "Cualquier dado",
    both: "Ambos dados (doble)",
    individual: "Dado individual",
    first: "Primer dado",
    second: "Segundo dado",
  },

  tagScopes: {
    any: "Cualquiera",
    source: "Origen / Atacante",
    target: "Objetivo / Defensor",
    attack: "Ataque / Técnica",
    action: "Acción",
  },

  turnAggregateMetrics: {
    damage_dealt: "Daño infligido",
    damage_taken: "Daño recibido",
    es_spent: "Estamina gastada",
    hp_spent: "Salud gastada",
  },

  turnHistoryEvents: {
    used_quirk: "Usó Quirk este turno",
    used_technique: "Usó Técnica este turno",
    consecutive_turns_used: "Turnos consecutivos de uso",
  },

  // 5. RESOLUTIONS
  resolutions: {
    automatic: "Automática",
    roll: "Tirada enfrentada / abierta",
    rd: "Dificultad fija (RD)",
    manual: "Manual / Narrativa",
  },

  outcomes: {
    success: "Éxito",
    failure: "Fallo",
    critical: "Crítico",
    success_margin: "Margen de éxito",
    failure_margin: "Margen de fallo",
  },

  // 6. EFFECTS
  effectTypes: {
    damage: "Infligir Daño",
    healing: "Curación",
    barrier: "Otorgar Barrera",
    bonus: "Bono general",
    penalty: "Penalización general",
    attribute_modifier: "Modificar Atributo",
    skill_modifier: "Modificar Habilidad",
    derived_stat_modifier: "Modificar Estadística Derivada",
    roll_modifier: "Modificar Tirada",
    cutoff_modifier: "Modificar Umbral de Corte",
    rd_modifier: "Modificar Dificultad (RD)",
    incoming_damage_modifier: "Modificar Daño Recibido",
    outgoing_damage_modifier: "Modificar Daño Infligido",
    incoming_healing_modifier: "Modificar Curación Recibida",
    outgoing_healing_modifier: "Modificar Curación Realizada",
    status_apply: "Aplicar Estado Alterado",
    status_remove: "Eliminar Estado Alterado",
    resource_modifier: "Modificar Recurso",
    cost_modifier: "Modificar Coste",
    action_block: "Bloquear Acción",
    turn_loss: "Pérdida de Turno",
    counter_modifier: "Modificar Contador",
    inventory_consume: "Consumir del Inventario",
    inventory_reserve: "Reservar en Inventario",
    inventory_release: "Liberar de Reserva",
    currency: "Modificar Moneda / EXP",
    experience: "Otorgar Experiencia",
    manual: "Efecto Manual / Narrativo",
  },

  modifierOperations: {
    add: "Sumar (+)",
    subtract: "Restar (-)",
    multiply: "Multiplicar (×)",
    divide: "Dividir (/)",
    set: "Establecer (=)",
  },

  counterOperations: {
    increment: "Incrementar (+)",
    decrement: "Decrementar (-)",
    set: "Establecer valor fijo",
    reset: "Reiniciar a cero",
  },

  blockedActions: {
    all: "Todas las acciones",
    quirk: "Quirk",
    technique: "Técnicas",
    movement: "Movimiento",
  },

  // 7. TARGETS
  targets: {
    self: "Uno mismo",
    ally: "Aliado",
    enemy: "Enemigo",
    character: "Personaje",
    object: "Objeto",
    area: "Área",
    roll: "Tirada",
    resource: "Recurso",
    active_element: "Elemento activo",
    manual: "Manual / A determinar",
  },

  targetQuantityModes: {
    exact: "Cantidad exacta",
    up_to: "Hasta X objetivos",
    all: "Todos los objetivos válidos",
  },

  targetRangeTypes: {
    self: "Personal",
    contact: "Contacto",
    distance: "A distancia",
    unlimited: "Ilimitado",
    manual: "Manual",
  },

  targetAreaShapes: {
    radius: "Radio",
    diameter: "Diámetro",
    cone: "Cono",
    line: "Línea",
    zone: "Zona delimitada",
    manual: "Manual",
  },

  selectionRestrictions: {
    nearest: "Más cercano",
    random: "Aleatorio",
    specific: "Objetivo específico",
    exclude: "Excluir objetivo",
    manual: "Manual",
  },

  // 8. TEMPORALITY
  durations: {
    instant: "Instantánea",
    turns: "Turnos",
    until_turn_end: "Hasta el final del turno",
    until_next_turn: "Hasta el siguiente turno",
    until_next_roll: "Hasta la siguiente tirada",
    until_next_use: "Hasta el siguiente uso",
    while_condition: "Mientras se cumpla la condición",
    while_element_active: "Mientras el elemento esté activo",
    while_owned: "Mientras posea el elemento",
    until_deactivated: "Hasta desactivarlo voluntariamente",
    permanent: "Permanente",
    manual: "Manual / Narrativa",
  },

  frequencies: {
    once: "Una sola vez",
    each_turn: "Cada turno",
    turn_start: "Al inicio de cada turno",
    turn_end: "Al final de cada turno",
    every_n_turns: "Cada N turnos",
    manual: "Manual",
  },

  // 9. LIMITATIONS
  limitationTypes: {
    cooldown: "Tiempo de recarga (Cooldown)",
    usage_limit: "Límite de uso",
    resource_threshold: "Umbral mínimo de recurso",
    physical_requirement: "Requisito físico/sensorial",
    item_requirement: "Requisito de objeto",
    manual: "Requisito manual / narrativo",
  },

  usagePeriods: {
    turn: "Por turno",
    combat: "Por combate",
    mission: "Por misión",
    day: "Por día",
  },

  itemRequirementModes: {
    require: "Requerir posesión",
    consume: "Consumir al activar",
    equip: "Tener equipado",
    reserve: "Reservar temporalmente",
  },

  physicalSenses: {
    physical: "Físico",
    visual: "Visual",
    auditory: "Auditivo",
  },

  // 10. ADVANCED CONTROL
  resetEvents: {
    turn_end: "Fin del turno",
    turn_without_quirk: "Turno sin usar Quirk",
    rest: "Descanso",
    combat_end: "Fin del combate",
    condition: "Por condición específica",
    manual: "Manual",
  },

  resetTargets: {
    counter: "Contador de combate",
    accumulated_cost: "Coste acumulado",
    modifiers: "Modificadores temporales",
  },

  accumulationSubjects: {
    trigger_count: "Cantidad de activaciones",
    damage_taken: "Daño recibido",
    es_spent: "Estamina gastada",
    turns_consecutive: "Turnos consecutivos",
  },

  capSubjects: {
    stamina_cost: "Coste de Estamina",
    damage: "Daño",
    healing: "Curación",
    barrier: "Barrera",
    modifier: "Modificador",
  },

  counterResetConditions: {
    when_triggered: "Al activarse el efecto",
    turn_end: "Al fin del turno",
    combat_end: "Al fin del combate",
    condition: "Por condición",
    manual: "Manual",
  },

  exceptionActions: {
    allow: "Permitir acción",
    reduce_penalty: "Reducir penalización",
  },

  // 11. CANONICAL RESOURCES & ATTRIBUTES
  resources: {
    SA: "Salud (SA)",
    ES: "Estamina (ES)",
  },

  attributes: {
    fue: "Fuerza (FUE)",
    des: "Destreza (DES)",
    res: "Resistencia (RES)",
    int: "Inteligencia (INT)",
    vol: "Voluntad (VOL)",
    vel: "Velocidad (VEL)",
    FUE: "Fuerza (FUE)",
    DES: "Destreza (DES)",
    RES: "Resistencia (RES)",
    INT: "Inteligencia (INT)",
    VOL: "Voluntad (VOL)",
    VEL: "Velocidad (VEL)",
    Carisma: "Carisma",
    Presencia: "Presencia",
  },

  // 12. CANONICAL ALTERED STATUSES
  alteredStatuses: {
    "core.status.stunned": "Aturdido",
    "core.status.vulnerable": "Vulnerable",
    "core.status.berserker": "Berserker",
    "core.status.paralyzed": "Paralizado",
    support_blocked: "Soporte Bloqueado",
    stunned: "Aturdido",
    vulnerable: "Vulnerable",
    berserker: "Berserker",
    paralyzed: "Paralizado",
  },

  // 13. CONTROLLED TAGS
  tags: {
    fire: "Fuego",
    ice: "Hielo",
    electricity: "Electricidad",
    offensive: "Ofensiva",
    support: "Soporte",
    mental: "Mental",
    quirk: "Quirk",
    physical: "Físico",
    critical: "Crítico",
    armor_pierced: "Perforación de armadura",
  },
} as const;

export type MechanicalLabelCategory = keyof typeof MECHANICAL_LABELS;

/**
 * Humanizes a machine-readable string (e.g. 'turn_aggregate' -> 'Turn Aggregate')
 * used ONLY as safe fallback when a value is not found in the registry.
 */
function humanizeFallback(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Gets the human-readable Spanish label for a mechanical machine value.
 *
 * @param category - Category key in MECHANICAL_LABELS
 * @param value - Machine value (e.g. 'status_apply', 'receive_damage')
 * @returns Human-readable Spanish label, or humanized fallback
 */
export function getMechanicalLabel<C extends MechanicalLabelCategory>(
  category: C,
  value: string | undefined | null
): string {
  if (!value) return "";
  const dict = MECHANICAL_LABELS[category] as Record<string, string>;
  if (dict && typeof dict[value] === "string") {
    return dict[value];
  }
  return humanizeFallback(value);
}

/**
 * Specialized helper to get the Spanish name of an altered status from its ID or code
 */
export function getAlteredStatusLabel(statusId: string | undefined | null): string {
  if (!statusId) return "";
  return MECHANICAL_LABELS.alteredStatuses[statusId as keyof typeof MECHANICAL_LABELS.alteredStatuses] ?? humanizeFallback(statusId);
}

/**
 * Specialized helper to get the Spanish name of an attribute
 */
export function getAttributeLabel(attrId: string | undefined | null): string {
  if (!attrId) return "";
  return MECHANICAL_LABELS.attributes[attrId as keyof typeof MECHANICAL_LABELS.attributes] ?? humanizeFallback(attrId);
}

/**
 * Specialized helper to get the Spanish name of a resource
 */
export function getResourceLabel(resourceId: string | undefined | null): string {
  if (!resourceId) return "";
  return MECHANICAL_LABELS.resources[resourceId as keyof typeof MECHANICAL_LABELS.resources] ?? humanizeFallback(resourceId);
}

/**
 * Specialized helper to get the Spanish name of a controlled tag
 */
export function getTagLabel(tag: string | undefined | null): string {
  if (!tag) return "";
  return MECHANICAL_LABELS.tags[tag as keyof typeof MECHANICAL_LABELS.tags] ?? tag;
}
