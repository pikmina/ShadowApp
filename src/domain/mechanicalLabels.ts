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
    action_interrupted: "Interrumpirse la acción",
    channel_interrupted: "Canalización interrumpida",
    traumatic_stimulus: "Estímulo traumático",
    receive_support: "Recibir soporte",
    ally_support_received: "Recibir soporte de aliado",
    roll_resolution: "Resolución de tirada",
    roll_resolved: "Resolución de tirada",
    damage_received: "Recibir daño",
    damage_dealt: "Infligir daño",
    status_applied: "Estado aplicado",
    status_removed: "Estado eliminado",
    behavior_resolved: "Comportamiento resuelto",
    effect_ended: "Efecto finalizado",
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
    equipped: "Equipado",
    active_behavior: "Técnica o habilidad activa",
    conscious: "Estado de consciencia",
    group: "Grupo de condiciones",
  },

  conditionLogic: {
    all: "Todas las condiciones (Y)",
    any: "Cualquiera de las condiciones (O)",
    and: "Todas las condiciones (Y)",
    or: "Cualquiera de las condiciones (O)",
  },

  // 4.1. REQUIREMENTS
  requirements: {
    physical_contact: "Contacto físico",
    visual_contact: "Contacto visual",
    auditory_contact: "Contacto auditivo",
    speak_directly: "Hablar directamente al objetivo",
    target_conscious: "Objetivo consciente",
    active_behavior: "Técnica o habilidad activa",
    consume: "Consumir algo",
    resource_threshold: "Reserva mínima de recurso",
    item: "Objeto requerido",
    previous_roll: "Tirada previa exitosa",
    manual: "Requisito manual / Narrativo",
    custom: "Requisito personalizado",
  },

  requirementResolutions: {
    automatic: "Automática",
    manual: "Manual (Director de Juego)",
  },

  counters: {
    combat_counter: "Contador de combate",
    charges: "Cargas",
    combo: "Combo",
    uses: "Usos",
    focus: "Concentración",
    heat: "Calor / Tensión",
    impacto: "impacto",
    bleed_stacks: "Cargas de sangrado",
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
    used_quirk: "ha usado Quirk este turno",
    used_quirk_this_turn: "ha usado Quirk este turno",
    used_technique: "ha usado Técnica este turno",
    used_technique_this_turn: "ha usado Técnica este turno",
    consecutive_turns_used: "turnos consecutivos de uso",
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
    transformation: "Transformación",
    object_manipulation: "Manipulación de Objetos",
  },

  objectSizes: {
    small: "Objetos pequeños (1–50 cm)",
    medium: "Objetos medianos (hasta 1.50 m)",
    large: "Objetos grandes (hasta 5 m)",
    huge: "Objetos enormes (hasta 10 m)",
  },

  transformationMagnitudes: {
    body: "Corporal",
    corporal: "Corporal",
    "2m": "2 metros",
    "5m": "5 metros",
    "10m": "10 metros",
    "20m": "20 metros",
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
    structure: "Estructura",
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
  areaShapes: {
    radius: "Radio",
    diameter: "Diámetro",
    cone: "Cono",
    line: "Línea",
    zone: "Zona delimitada",
    manual: "Manual",
  },

  selectionRestrictions: {
    standard_priority: "Prioridad estándar",
    none: "Sin restricción",
    nearest: "Más cercano",
    random: "Aleatorio",
    specific: "Objetivo específico",
    exclude: "Excluir objetivo",
    manual: "Manual",
  },

  selectionModes: {
    standard_priority: "Prioridad estándar",
    manual: "Elección manual",
    random: "Aleatoria",
  },

  ranges: {
    self: "Personal",
    contact: "Contacto",
    distance: "A distancia",
    unlimited: "Ilimitado",
    manual: "Manual",
  },

  periods: {
    turn: "Por turno",
    combat: "Por combate",
    mission: "Por misión",
    day: "Por día",
  },

  resetConditions: {
    when_triggered: "Al activarse el efecto",
    turn_end: "Al fin del turno",
    combat_end: "Al fin del combate",
    condition: "Por condición",
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
    modify: "Modificar acción",
    skip: "Omitir acción",
    reduce_penalty: "Reducir penalización",
  },

  comparisonOperators: {
    eq: "Igual a (==)",
    gte: "Mayor o igual (>=)",
    lte: "Menor o igual (<=)",
    neq: "Distinto (!=)",
  },

  itemReferenceTypes: {
    tag: "Etiqueta",
    category: "Categoría",
    item: "ID de Artículo",
  },

  resetConditionKinds: {
    state: "Estado / Tratamiento",
    resource: "Recurso alcanzado",
    roll_outcome: "Resultado de tirada",
  },

  scopeIds: {
    quirk: "Quirk",
    technique: "Técnicas",
    channeling: "Canalización",
    offensive: "Acciones Ofensivas",
    support: "Acciones de Soporte",
    all: "todas las acciones",
    movement: "Movimiento",
  },

  rollTypes: {
    all: "cualquier acción",
    action: "Acción general",
    attack: "Tirada de ataque",
    defense: "Tirada de defensa",
    saving: "Tirada de salvación",
    skill: "Prueba de habilidad",
    mental_defense: "Defensa mental",
    quirk: "Quirk",
    technique: "Técnica",
    physical: "Físico",
    mental: "Mental",
    evasion: "Evasión",
    carisma: "Carisma",
    presencia: "Presencia",
  },

  skills: {
    alerta: "Alerta",
    dominio_quirk: "Dominio de Quirk",
    carisma: "Carisma",
    presencia: "Presencia",
    sigilo: "Sigilo",
    atletismo: "Atletismo",
    "Combate cuerpo a cuerpo": "Combate cuerpo a cuerpo",
    "Combate con armas": "Combate con armas",
    "Tirador": "Tirador",
    "Dominio de Quirk": "Dominio de Quirk",
    "Atletismo": "Atletismo",
    "Percepción": "Percepción",
    "Medicina": "Medicina",
    "Sigilo": "Sigilo",
    "Tecnología": "Tecnología",
    "Acrobacia": "Acrobacia",
    "Intimidación": "Intimidación",
    "Estrategia": "Estrategia",
  },

  derivedStats: {
    ini: "Iniciativa",
    iniciativa: "Iniciativa",
    INI: "Iniciativa",
    eva: "Evasión",
    evasion: "Evasión",
    EVA: "Evasión",
    cor: "Coraje",
    coraje: "Coraje",
    COR: "Coraje",
    sal: "Salud Máxima",
    salud: "Salud Máxima",
    SAL: "Salud Máxima",
    sa: "Salud Máxima",
    SA: "Salud Máxima",
    est: "Estamina Máxima",
    estamina: "Estamina Máxima",
    EST: "Estamina Máxima",
    es: "Estamina Máxima",
    ES: "Estamina Máxima",
    rd: "Reducción de Daño",
    RD: "Reducción de Daño",
    red: "Reducción de Daño",
    RED: "Reducción de Daño",
    reduccion_dano: "Reducción de Daño",
    dano_base: "Daño Base",
    db: "Daño Base",
    DB: "Daño Base",
    carisma: "Carisma",
    presencia: "Presencia",
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
    "core.status.asfixia": "Asfixia",
    asfixia: "Asfixia",
    asphyxiation: "Asfixia",
    "core.status.stunned": "Aturdido",
    stunned: "Aturdido",
    aturdido: "Aturdido",
    "core.status.aturdido": "Aturdido",
    "core.status.berserker_grave": "Berserker Grave",
    berserker_grave: "Berserker Grave",
    "core.status.berserker_leve": "Berserker Leve",
    berserker_leve: "Berserker Leve",
    berserker: "Berserker",
    "core.status.berserker": "Berserker",
    "core.status.coma_ilusorio": "Coma Ilusorio",
    coma_ilusorio: "Coma Ilusorio",
    illusory_coma: "Coma Ilusorio",
    "core.status.congelado": "Congelado",
    congelado: "Congelado",
    frozen: "Congelado",
    "core.status.conmocion": "Conmoción",
    conmocion: "Conmoción",
    concussion: "Conmoción",
    "core.status.desbalanceado": "Desbalanceado",
    desbalanceado: "Desbalanceado",
    unbalanced: "Desbalanceado",
    "core.status.desorientado": "Desorientado",
    desorientado: "Desorientado",
    disoriented: "Desorientado",
    "core.status.dormido": "Dormido",
    dormido: "Dormido",
    asleep: "Dormido",
    "core.status.electrocutado": "Electrocutado",
    electrocutado: "Electrocutado",
    electrocuted: "Electrocutado",
    "core.status.hemorragia_grave": "Hemorragia Grave",
    hemorragia_grave: "Hemorragia Grave",
    bleeding_severe: "Hemorragia Grave",
    "core.status.hemorragia_leve": "Hemorragia Leve",
    hemorragia_leve: "Hemorragia Leve",
    bleeding_light: "Hemorragia Leve",
    "core.status.locura": "Locura",
    locura: "Locura",
    madness: "Locura",
    "core.status.miedo": "Miedo / Aterrorizado",
    miedo: "Miedo / Aterrorizado",
    fear: "Miedo / Aterrorizado",
    terror: "Miedo / Aterrorizado",
    "core.status.mutacion_visual": "Mutación Visual",
    mutacion_visual: "Mutación Visual",
    visual_mutation: "Mutación Visual",
    "core.status.nulificacion_don": "Nulificación de Don",
    nulificacion_don: "Nulificación de Don",
    quirk_nullification: "Nulificación de Don",
    "core.status.quemadura_grave": "Quemadura Grave",
    quemadura_grave: "Quemadura Grave",
    burn_severe: "Quemadura Grave",
    "core.status.quemadura_leve": "Quemadura Leve",
    quemadura_leve: "Quemadura Leve",
    quemadura: "Quemadura Leve",
    burn_light: "Quemadura Leve",
    "core.status.ralentizado": "Ralentizado",
    ralentizado: "Ralentizado",
    slowed: "Ralentizado",
    "core.status.sobrecalentado": "Sobrecalentado",
    sobrecalentado: "Sobrecalentado",
    overheated: "Sobrecalentado",
    "core.status.veneno_grave": "Veneno Grave",
    veneno_grave: "Veneno Grave",
    poison_severe: "Veneno Grave",
    "core.status.veneno_leve": "Veneno Leve",
    veneno_leve: "Veneno Leve",
    veneno: "Veneno Leve",
    poison_light: "Veneno Leve",
    "core.status.inmovilizado": "Inmovilizado",
    inmovilizado: "Inmovilizado",
    immobilized: "Inmovilizado",
    "core.status.paralyzed": "Paralizado",
    paralyzed: "Paralizado",
    paralizado: "Paralizado",
    "core.status.vulnerable": "Vulnerable",
    vulnerable: "Vulnerable",
    support_blocked: "Soporte Bloqueado",
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
  // 14. SOURCE TYPES
  sourceTypes: {
    quirk: "Don",
    physical: "Física",
    weapon: "Arma",
  },
  // 15. DAMAGE TYPES
  damageTypes: {
    fisico: "Físico",
    cinetico: "Cinético",
    fuego: "Fuego",
    hielo: "Hielo",
    electrico: "Eléctrico",
    acido: "Ácido",
    psiquico: "Psíquico / Mental",
    sonoro: "Sonoro",
    cortante: "Cortante",
    perforante: "Perforante",
    contundente: "Contundente",
  },
  // 16. ATTACK TYPES & OPPOSITION
  attackTypes: {
    physical: "Físico",
    mental: "Mental",
  },
  oppositions: {
    target_evasion: "Evasión",
    target_courage: "Coraje",
    support_defense_rd: "RD del Sistema",
    explicit_rd: "RD",
    narrator_rd: "RD del Narrador",
  },
  // 17. ADMINISTRATIVE & UI FILTERS
  filterScopes: {
    all: "Todos",
    all_characters: "Todos los personajes",
    all_sources: "Todos los orígenes",
    all_categories: "Todas las categorías",
    all_classifications: "Todas las clasificaciones",
  },
  // 18. TECHNIQUE FUNCTIONAL CLASSIFICATIONS
  techniqueClassifications: {
    offensive: "Ofensiva",
    support: "Soporte",
    defensive: "Defensiva",
    control: "Control",
  },
  // 19. MECHANIC CATEGORY FAMILIES
  mechanicCategoryFamilies: {
    activation: "Activación",
    condition: "Condiciones",
    resolution: "Resolución",
    target: "Objetivo",
    temporality: "Duración",
    limitation: "Limitaciones",
    effect: "Efectos",
    cost: "Costes y recursos",
    other: "Otros",
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
 * Specialized helper to get the Spanish name of a transformation magnitude
 */
export function getTransformationMagnitudeLabel(magType: string | undefined | null): string {
  if (!magType) return "Corporal";
  const dict = MECHANICAL_LABELS.transformationMagnitudes as Record<string, string>;
  return dict[magType] || dict[magType.toLowerCase()] || humanizeFallback(magType);
}

/**
 * Specialized helper to get the Spanish name of an attribute
 */
export function getAttributeLabel(attrId: string | undefined | null): string {
  if (!attrId) return "";
  return MECHANICAL_LABELS.attributes[attrId as keyof typeof MECHANICAL_LABELS.attributes] ?? humanizeFallback(attrId);
}

/**
 * Specialized helper to get the Spanish name of a derived stat (Salud, Estamina, Iniciativa, Reducción de Daño, etc.)
 */
export function getDerivedStatLabel(statId: string | undefined | null): string {
  if (!statId) return "";
  const dict = MECHANICAL_LABELS.derivedStats as Record<string, string>;
  if (dict[statId]) return dict[statId];
  const lower = statId.toLowerCase();
  if (dict[lower]) return dict[lower];
  const upper = statId.toUpperCase();
  if (dict[upper]) return dict[upper];
  return getStatOrSkillLabel(statId);
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

/**
 * Specialized helper to get the Spanish name of a technique functional classification
 */
export function getTechniqueClassificationLabel(classification: string | undefined | null): string {
  if (!classification) return "";
  const dict = MECHANICAL_LABELS.techniqueClassifications as Record<string, string>;
  return dict[classification] ?? humanizeFallback(classification);
}

/**
 * Specialized helper to get the Spanish name of a mechanic category family
 */
export function getMechanicCategoryFamilyLabel(family: string | undefined | null): string {
  if (!family) return "Otros";
  const dict = MECHANICAL_LABELS.mechanicCategoryFamilies as Record<string, string>;
  return dict[family] ?? humanizeFallback(family);
}

/**
 * Specialized helper to get the Spanish name of a stat, skill, or attribute
 */
export function getStatOrSkillLabel(id: string | undefined | null): string {
  if (!id) return "";
  const key = id.toLowerCase();
  const attr = (MECHANICAL_LABELS.attributes as Record<string, string>)[id] ||
    (MECHANICAL_LABELS.attributes as Record<string, string>)[key];
  if (attr) return attr;

  const skill = (MECHANICAL_LABELS.skills as Record<string, string>)[id] ||
    (MECHANICAL_LABELS.skills as Record<string, string>)[key];
  if (skill) return skill;

  const derived = (MECHANICAL_LABELS.derivedStats as Record<string, string>)[id] ||
    (MECHANICAL_LABELS.derivedStats as Record<string, string>)[key];
  if (derived) return derived;

  return humanizeFallback(id);
}

/**
 * Specialized helper to get the Spanish name of a roll type or check scope
 */
export function getRollTypeLabel(rollType: string | undefined | null): string {
  if (!rollType) return "";
  const key = rollType.toLowerCase();
  return (
    (MECHANICAL_LABELS.rollTypes as Record<string, string>)[rollType] ||
    (MECHANICAL_LABELS.rollTypes as Record<string, string>)[key] ||
    getStatOrSkillLabel(rollType)
  );
}

/**
 * Specialized helper to get the Spanish name of a technique source type
 */
export function getSourceTypeLabel(sourceType: string | undefined | null): string {
  if (!sourceType) return "";
  const dict = MECHANICAL_LABELS.sourceTypes as Record<string, string>;
  return dict[sourceType] || humanizeFallback(sourceType);
}

/**
 * Specialized helper to get the Spanish name of a counter
 */
export function getCounterLabel(counterId: string | undefined | null): string {
  if (!counterId) return "";
  const dict = MECHANICAL_LABELS.counters as Record<string, string>;
  if (dict[counterId]) return dict[counterId];
  const lower = counterId.toLowerCase();
  if (dict[lower]) return dict[lower];
  return humanizeFallback(counterId);
}

/**
 * Specialized helper to get the Spanish name of condition combination logic
 */
export function getConditionLogicLabel(logic: string | undefined | null): string {
  if (!logic) return "";
  if (logic === "all" || logic === "and") return "Todas (AND)";
  if (logic === "any" || logic === "or") return "Alguna (OR)";
  const dict = MECHANICAL_LABELS.conditionLogic as Record<string, string>;
  return dict[logic] || humanizeFallback(logic);
}

/**
 * Universal Presentation Label Resolver
 * Maps any machine/technical value to its localized user-facing label across domain categories.
 * Never leaks raw technical literals when a human-readable equivalent is available.
 */
export function resolveDomainLabel(
  val: string | undefined | null,
  context?: { placeholder?: string; category?: string }
): string {
  if (val === undefined || val === null || val === "") {
    return context?.placeholder ?? "";
  }

  const str = String(val).trim();

  // If specific category is requested
  if (context?.category && context.category in MECHANICAL_LABELS) {
    const dict = MECHANICAL_LABELS[context.category as MechanicalLabelCategory] as Record<string, string>;
    if (dict && dict[str]) return dict[str];
  }

  // 1. Generic structural filters
  if (str === "all") {
    return context?.placeholder ?? "Todos";
  }
  if (str === "any") {
    return "Alguna";
  }
  if (str === "and") {
    return "Todas (AND)";
  }
  if (str === "or") {
    return "Alguna (OR)";
  }

  // 2. Official attributes (preserve system abbreviations like FUE, DES, etc.)
  const attr = getAttributeLabel(str);
  if (attr && attr !== str && attr !== humanizeFallback(str)) return attr;
  if (/^(FUE|DES|RES|INT|VOL|VEL)$/i.test(str)) {
    return getAttributeLabel(str.toUpperCase());
  }

  // 3. Triggers
  const trgDict = MECHANICAL_LABELS.triggers as Record<string, string>;
  if (trgDict[str]) return trgDict[str];

  // 4. Action Types
  const actDict = MECHANICAL_LABELS.actionTypes as Record<string, string>;
  if (actDict[str]) return actDict[str];

  // 5. Counters
  const cntDict = MECHANICAL_LABELS.counters as Record<string, string>;
  if (cntDict[str]) return cntDict[str];

  // 6. Source Types
  const srcDict = MECHANICAL_LABELS.sourceTypes as Record<string, string>;
  if (srcDict[str]) return srcDict[str];

  // 7. Effect Types
  const effDict = MECHANICAL_LABELS.effectTypes as Record<string, string>;
  if (effDict[str]) return effDict[str];

  // 8. Resolutions
  const resDict = MECHANICAL_LABELS.resolutions as Record<string, string>;
  if (resDict[str]) return resDict[str];

  // 9. Targets & Ranges
  const tgtDict = MECHANICAL_LABELS.targets as Record<string, string>;
  if (tgtDict[str]) return tgtDict[str];
  const rngDict = MECHANICAL_LABELS.ranges as Record<string, string>;
  if (rngDict[str]) return rngDict[str];

  // 10. Damage Types
  const dmgDict = MECHANICAL_LABELS.damageTypes as Record<string, string>;
  if (dmgDict[str]) return dmgDict[str];

  // 11. Altered Statuses
  const stsDict = MECHANICAL_LABELS.alteredStatuses as Record<string, string>;
  if (stsDict[str]) return stsDict[str];

  // 12. Reset Conditions
  const rstDict = MECHANICAL_LABELS.resetConditions as Record<string, string>;
  if (rstDict[str]) return rstDict[str];

  // 13. Outcomes
  const outDict = MECHANICAL_LABELS.outcomes as Record<string, string>;
  if (outDict[str]) return outDict[str];

  // 14. Condition Types
  const cndTypeDict = MECHANICAL_LABELS.conditionTypes as Record<string, string>;
  if (cndTypeDict[str]) return cndTypeDict[str];

  // 15. Counter Operations
  const cntOpDict = MECHANICAL_LABELS.counterOperations as Record<string, string>;
  if (cntOpDict[str]) return cntOpDict[str];

  // If pure numeric ID without pre-registered label, do not leak raw number if placeholder is present
  if (/^\d+$/.test(str)) {
    return context?.placeholder ?? "Seleccionar...";
  }

  return humanizeFallback(str);
}


