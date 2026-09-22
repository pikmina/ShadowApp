import { z } from "zod";
import { nanoid } from "nanoid";

// ==========================================
// 1. MODES
// ==========================================
export const mechanicalBehaviorModeSchema = z.enum(["active", "reactive", "continuous"]);
export type MechanicalBehaviorMode = z.infer<typeof mechanicalBehaviorModeSchema>;

// ==========================================
// 2. ACTIVATION (for 'active' mode)
// ==========================================
export const activationActionTypeSchema = z.enum([
  "action",
  "quick_action",
  "voluntary_reaction",
  "free_action",
  "manual",
]);
export type ActivationActionType = z.infer<typeof activationActionTypeSchema>;

export const activationTimingSchema = z.enum(["immediate", "turns", "manual"]);
export type ActivationTiming = z.infer<typeof activationTimingSchema>;

export const mechanicalActivationSchema = z.object({
  actionType: activationActionTypeSchema.default("action"),
  timing: activationTimingSchema.default("immediate"),
  turns: z.number().int().nonnegative().optional().default(0),
  description: z.string().optional().default(""),
});
export type MechanicalActivation = z.infer<typeof mechanicalActivationSchema>;

// ==========================================
// 3. TRIGGER (for 'reactive' mode)
// ==========================================
export const triggerKindSchema = z.union([
  z.enum([
    "receive_damage",
    "deal_damage",
    "receive_healing",
    "receive_barrier",
    "attacked",
    "attack",
    "receive_critical",
    "deal_critical",
    "use_quirk",
    "use_technique",
    "activate_element",
    "end_element",
    "cancel_element",
    "roll",
    "roll_success",
    "roll_failure",
    "critical",
    "specific_result",
    "spend_resource",
    "recover_resource",
    "lose_resource",
    "resource_changed",
    "resource_threshold_crossed",
    "turn_start",
    "turn_end",
    "combat_start",
    "combat_end",
    "consume_item",
    "equip_item",
    "unequip_item",
    "manual",
  ]),
  z.string().min(1), // Extensible open trigger identifier
]);
export type TriggerKind = z.infer<typeof triggerKindSchema>;

export const mechanicalTriggerSchema = z.object({
  kind: triggerKindSchema,
  description: z.string().optional(),
  resourceId: z.enum(["SA", "ES"]).or(z.string()).optional(),
  threshold: z.number().optional(),
  direction: z.enum(["cross_up", "cross_down", "any"]).optional(),
  elementId: z.string().optional(),
  tag: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
});
export type MechanicalTrigger = z.infer<typeof mechanicalTriggerSchema>;

// ==========================================
// 4. CONDITIONS
// ==========================================
export const conditionComparisonSchema = z.enum(["<", "<=", "=", ">=", ">"]);
export type ConditionComparison = z.infer<typeof conditionComparisonSchema>;

export const conditionItemSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().optional(),
    type: z.literal("resource"),
    resourceId: z.enum(["SA", "ES"]).or(z.string()).optional(),
    comparison: conditionComparisonSchema,
    value: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("percentage"),
    resourceId: z.enum(["SA", "ES"]).or(z.string()).optional(),
    comparison: conditionComparisonSchema,
    percent: z.number().min(0).max(100),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("roll"),
    rollType: z.string().optional(),
    comparison: conditionComparisonSchema,
    target: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("die"),
    dieSelection: z.enum(["any", "both", "individual", "first", "second"]).default("any"),
    comparison: conditionComparisonSchema,
    value: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("status"),
    statusElementId: z.string().min(1),
    present: z.boolean().default(true),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("turn_aggregate"),
    metric: z.enum(["damage_dealt", "damage_taken", "es_spent", "hp_spent"]).or(z.string()),
    comparison: conditionComparisonSchema,
    value: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("turn_history"),
    event: z.enum(["used_quirk", "used_technique", "consecutive_turns_used"]).or(z.string()),
    comparison: conditionComparisonSchema.optional(),
    value: z.union([z.number(), z.boolean()]).optional(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("tag"),
    tag: z.string().min(1),
    scope: z.enum(["source", "target", "attack", "action", "any"]).default("any"),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("item"),
    elementId: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    comparison: conditionComparisonSchema.default(">="),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("counter"),
    counterId: z.string().min(1),
    comparison: conditionComparisonSchema.default(">="),
    value: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("attribute"),
    attributeId: z.string().min(1),
    comparison: conditionComparisonSchema,
    value: z.number(),
    negated: z.boolean().optional(),
  }),
  z.object({
    id: z.string().optional(),
    type: z.literal("manual"),
    signalId: z.string().min(1),
    description: z.string().optional(),
    negated: z.boolean().optional(),
  }),
]);
export type MechanicalCondition = z.infer<typeof conditionItemSchema>;

export const conditionLogicSchema = z.enum(["all", "any"]);
export type MechanicalConditionLogic = z.infer<typeof conditionLogicSchema>;

// ==========================================
// 5. TARGET (unified object)
// ==========================================
export const targetTypeSchema = z.enum([
  "self",
  "ally",
  "enemy",
  "character",
  "object",
  "area",
  "roll",
  "resource",
  "active_element",
  "manual",
]);
export type TargetType = z.infer<typeof targetTypeSchema>;

export const targetQuantitySchema = z.object({
  mode: z.enum(["exact", "up_to", "all"]).default("exact"),
  count: z.number().int().positive().optional(),
});
export type TargetQuantity = z.infer<typeof targetQuantitySchema>;

export const targetRangeSchema = z.object({
  type: z.enum(["self", "contact", "distance", "unlimited", "manual"]).default("contact"),
  distanceMeters: z.number().nonnegative().optional(),
});
export type TargetRange = z.infer<typeof targetRangeSchema>;

export const targetAreaSchema = z.object({
  shape: z.enum(["radius", "diameter", "cone", "line", "zone", "manual"]).default("radius"),
  sizeMeters: z.number().positive().optional(),
});
export type TargetArea = z.infer<typeof targetAreaSchema>;

export const selectionRestrictionSchema = z.union([
  z.enum(["nearest", "random", "specific", "exclude", "manual"]),
  z.string(),
]);
export type SelectionRestriction = z.infer<typeof selectionRestrictionSchema>;

export const mechanicalTargetSchema = z.object({
  type: targetTypeSchema.default("self"),
  quantity: targetQuantitySchema.optional(),
  range: targetRangeSchema.optional(),
  area: targetAreaSchema.optional(),
  selectionRestriction: selectionRestrictionSchema.optional(),
  description: z.string().optional(),
});
export type MechanicalTarget = z.infer<typeof mechanicalTargetSchema>;

// ==========================================
// 6. TEMPORALITY (Duration, Frequency, Maintenance)
// ==========================================
export const durationTypeSchema = z.enum([
  "instant",
  "turns",
  "until_turn_end",
  "until_next_turn",
  "until_next_roll",
  "until_next_use",
  "while_condition",
  "while_element_active",
  "while_owned",
  "until_deactivated",
  "permanent",
  "manual",
]);
export type DurationType = z.infer<typeof durationTypeSchema>;

export const mechanicalDurationSchema = z.object({
  type: durationTypeSchema.default("instant"),
  turns: z.number().int().positive().optional(),
  conditionDescription: z.string().optional(),
});
export type MechanicalDuration = z.infer<typeof mechanicalDurationSchema>;

export const frequencyTypeSchema = z.enum([
  "once",
  "each_turn",
  "turn_start",
  "turn_end",
  "every_n_turns",
  "manual",
]);
export type FrequencyType = z.infer<typeof frequencyTypeSchema>;

export const mechanicalFrequencySchema = z.object({
  type: frequencyTypeSchema.default("once"),
  nTurns: z.number().int().positive().optional(),
  description: z.string().optional(),
});
export type MechanicalFrequency = z.infer<typeof mechanicalFrequencySchema>;

export const mechanicalMaintenanceSchema = z.object({
  enabled: z.boolean().default(false),
  resource: z.enum(["ES", "SA"]).or(z.string()).default("ES"),
  amount: z.number().nonnegative().default(1),
});
export type MechanicalMaintenance = z.infer<typeof mechanicalMaintenanceSchema>;

export const mechanicalTemporalitySchema = z.object({
  duration: mechanicalDurationSchema.default({ type: "instant" }),
  frequency: mechanicalFrequencySchema.optional(),
  maintenance: mechanicalMaintenanceSchema.optional(),
});
export type MechanicalTemporality = z.infer<typeof mechanicalTemporalitySchema>;

// ==========================================
// 7. MODIFIER OPERATIONS & EFFECTS
// ==========================================
export const modifierOperationSchema = z.enum(["add", "subtract", "multiply", "divide", "set"]);
export type ModifierOperation = z.infer<typeof modifierOperationSchema>;

export const mechanicalEffectItemSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("damage"),
    dice: z.string().min(1), // e.g. '4D8', '3'
    damageType: z.string().optional(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("healing"),
    resourceId: z.enum(["SA", "ES"]).default("SA"),
    amount: z.number().positive(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("barrier"),
    amount: z.number().positive(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("bonus"),
    targetStat: z.string().min(1),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("penalty"),
    targetStat: z.string().min(1),
    amount: z.number(),
    operation: modifierOperationSchema.default("subtract"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("attribute_modifier"),
    attributeId: z.string().min(1),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("skill_modifier"),
    skillId: z.string().min(1),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("derived_stat_modifier"),
    statId: z.string().min(1),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("roll_modifier"),
    rollType: z.string().optional(),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("cutoff_modifier"),
    statId: z.string().optional(),
    amount: z.number(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("rd_modifier"),
    skillId: z.string().optional(),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("incoming_damage_modifier"),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    tagFilter: z.string().optional(), // e.g. 'fire'
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("outgoing_damage_modifier"),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("incoming_healing_modifier"),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("outgoing_healing_modifier"),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("status_apply"),
    statusElementId: z.string().min(1),
    turns: z.number().int().positive().optional(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("status_remove"),
    statusElementId: z.string().min(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("resource_modifier"),
    resourceId: z.enum(["SA", "ES"]).or(z.string()),
    amount: z.number(),
    operation: modifierOperationSchema.default("add"),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("cost_modifier"),
    scopeId: z.string().optional().default("all"), // e.g. 'quirk', 'technique', 'all'
    amount: z.number(),
    operation: modifierOperationSchema.default("add"), // e.g. multiply 2
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("action_block"),
    blockedAction: z.enum(["all", "quirk", "technique", "movement"]).or(z.string()),
    duration: z.number().int().positive().optional().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("turn_loss"),
    turns: z.number().int().positive().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("counter_modifier"),
    counterId: z.string().min(1),
    operation: z.enum(["increment", "decrement", "set", "reset"]).default("increment"),
    value: z.number().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("inventory_consume"),
    elementId: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("inventory_reserve"),
    elementId: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("inventory_release"),
    elementId: z.string().min(1),
    quantity: z.number().int().positive().default(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("currency"),
    currencyId: z.enum(["yen", "exp"]),
    amount: z.number().int(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("experience"),
    amount: z.number().int(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("manual"),
    message: z.string().min(1),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
]);
export type MechanicalEffectItem = z.infer<typeof mechanicalEffectItemSchema>;

/**
 * Helper to resolve effective target for an effect (effect.target ?? behavior.target)
 */
export function resolveEffectiveTarget(
  effect: MechanicalEffectItem,
  behavior?: { target?: MechanicalTarget }
): MechanicalTarget | undefined {
  return effect.target ?? behavior?.target;
}

/**
 * Helper to resolve effective temporality for an effect (effect.temporality ?? behavior.temporality)
 */
export function resolveEffectiveTemporality(
  effect: MechanicalEffectItem,
  behavior?: { temporality?: MechanicalTemporality }
): MechanicalTemporality | undefined {
  return effect.temporality ?? behavior?.temporality;
}

// ==========================================
// 8. RESOLUTION
// ==========================================
export const resolutionTypeSchema = z.enum(["automatic", "roll", "rd", "manual"]);
export type ResolutionType = z.infer<typeof resolutionTypeSchema>;

export const outcomeTypeSchema = z.enum([
  "success",
  "failure",
  "critical",
  "success_margin",
  "failure_margin",
]);
export type OutcomeType = z.infer<typeof outcomeTypeSchema>;

export const differentiatedOutcomeSchema = z.object({
  id: z.string().min(1),
  outcome: outcomeTypeSchema,
  marginThreshold: z.number().int().optional(), // e.g. >= 5
  description: z.string().optional().default(""),
  effects: z.array(mechanicalEffectItemSchema).default([]),
});
export type DifferentiatedOutcome = z.infer<typeof differentiatedOutcomeSchema>;

export const mechanicalResolutionSchema = z.object({
  type: resolutionTypeSchema.default("automatic"),
  difficulty: z.number().int().optional(), // e.g. 12, 16 for RD
  attribute: z.string().optional(), // e.g. 'FUE', 'Carisma', 'Presencia'
  skill: z.string().optional(),
  description: z.string().optional(),
  outcomes: z.array(differentiatedOutcomeSchema).optional().default([]),
});
export type MechanicalResolution = z.infer<typeof mechanicalResolutionSchema>;

// ==========================================
// 9. LIMITATIONS
// ==========================================
export const mechanicalLimitationSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("cooldown"),
    turns: z.number().int().positive().default(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("usage_limit"),
    period: z.enum(["turn", "combat", "mission", "day"]).or(z.string()),
    max: z.number().int().positive().default(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("resource_threshold"),
    resourceId: z.enum(["ES", "SA"]).or(z.string()).default("ES"),
    minReserve: z.number().nonnegative().default(0),
    description: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("physical_requirement"),
    description: z.string().min(1),
    sense: z.enum(["physical", "visual", "auditory"]).optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("item_requirement"),
    referenceType: z.enum(["item", "category", "tag"]).default("item"),
    referenceValue: z.string().min(1), // item elementId, or category name, or tag name
    quantity: z.number().int().positive().default(1),
    mode: z.enum(["require", "consume", "equip", "reserve"]).default("require"),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("manual"),
    description: z.string().min(1),
  }),
]);
export type MechanicalLimitation = z.infer<typeof mechanicalLimitationSchema>;

// ==========================================
// 10. ADVANCED CONTROL
// ==========================================
export const mechanicalControlSchema = z.object({
  counter: z
    .object({
      id: z.string().min(1),
      name: z.string().optional(),
      initialValue: z.number().default(0),
      incrementOnTrigger: z.number().default(1),
      cap: z.number().optional(),
      resetCondition: z
        .enum(["when_triggered", "turn_end", "combat_end", "condition", "manual"])
        .or(z.string())
        .optional(),
      resetConditionRule: conditionItemSchema.optional(),
    })
    .optional(),
  accumulation: z
    .object({
      accumulateBy: z
        .enum(["trigger_count", "damage_taken", "es_spent", "turns_consecutive"])
        .or(z.string()),
      threshold: z.number(),
      resetOnThreshold: z.boolean().default(true),
    })
    .optional(),
  cap: z
    .object({
      subject: z.enum(["stamina_cost", "damage", "healing", "barrier", "modifier"]).or(z.string()),
      min: z.number().optional(),
      max: z.number(),
    })
    .optional(),
  reset: z
    .object({
      event: z
        .enum(["turn_end", "turn_without_quirk", "rest", "combat_end", "condition", "manual"])
        .or(z.string())
        .optional(),
      condition: conditionItemSchema.optional(),
      target: z.enum(["counter", "accumulated_cost", "modifiers"]).or(z.string()).default("counter"),
      description: z.string().optional(),
    })
    .optional(),
  exception: z
    .object({
      id: z.string().optional(),
      targetBehaviorId: z.string().optional(),
      failedConditionId: z.string().optional(),
      failedLimitationId: z.string().optional(),
      description: z.string().optional(),
      allowWhenRequirementFailed: z.boolean().default(true),
      costResource: z.enum(["ES", "SA"]).or(z.string()).default("ES"),
      costAmount: z.number().nonnegative().default(0),
      action: z.enum(["allow", "reduce_penalty"]).or(z.string()).default("allow"),
    })
    .optional(),
});
export type MechanicalControl = z.infer<typeof mechanicalControlSchema>;

// ==========================================
// 11. MECHANICAL BEHAVIOR (Core Root Entity)
// ==========================================
export const mechanicalBehaviorSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional().default(""),
  mode: mechanicalBehaviorModeSchema.default("active"),

  activation: mechanicalActivationSchema.optional(),
  trigger: mechanicalTriggerSchema.optional(),

  conditions: z.array(conditionItemSchema).default([]),
  conditionLogic: conditionLogicSchema.default("all"),

  resolution: mechanicalResolutionSchema.optional(),

  effects: z.array(mechanicalEffectItemSchema).default([]),

  target: mechanicalTargetSchema.optional(),

  temporality: mechanicalTemporalitySchema.optional(),

  limitations: z.array(mechanicalLimitationSchema).default([]),

  control: mechanicalControlSchema.optional(),
});
export type MechanicalBehavior = z.infer<typeof mechanicalBehaviorSchema>;
export type MechanicalBehaviorInput = z.input<typeof mechanicalBehaviorSchema>;

export const mechanicalBehaviorsSchema = z.array(mechanicalBehaviorSchema);

// ==========================================
// Helper functions
// ==========================================
export function createDefaultMechanicalBehavior(
  id: string,
  mode: MechanicalBehaviorMode = "active",
  name: string = "Nuevo comportamiento"
): MechanicalBehavior {
  return {
    id,
    name,
    mode,
    activation: mode === "active" ? { actionType: "action", timing: "immediate", turns: 0, description: "" } : undefined,
    trigger: mode === "reactive" ? { kind: "receive_damage", description: "", parameters: {} } : undefined,
    conditions: [],
    conditionLogic: "all",
    resolution: { type: "automatic", outcomes: [] },
    effects: [],
    target: { type: "self" },
    temporality: { duration: { type: "instant" } },
    limitations: [],
  };
}

export function isMechanicalBehavior(candidate: unknown): candidate is MechanicalBehavior {
  if (typeof candidate !== "object" || candidate === null) return false;
  return "mode" in candidate && "effects" in candidate && "id" in candidate;
}

export function isMechanicalBehaviorList(candidate: unknown): candidate is MechanicalBehavior[] {
  return Array.isArray(candidate) && candidate.length > 0 && candidate.every(isMechanicalBehavior);
}

export function createDefaultMechanicalEffect(
  type: MechanicalEffectItem["type"],
  existingId?: string,
  existingTarget?: MechanicalTarget,
  existingTemporality?: MechanicalTemporality
): MechanicalEffectItem {
  const id = existingId || nanoid(8);
  const base = {
    id,
    ...(existingTarget ? { target: existingTarget } : {}),
    ...(existingTemporality ? { temporality: existingTemporality } : {}),
  };

  switch (type) {
    case "damage":
      return { ...base, type: "damage", dice: "2D6" };
    case "healing":
      return { ...base, type: "healing", resourceId: "SA", amount: 4 };
    case "barrier":
      return { ...base, type: "barrier", amount: 5 };
    case "attribute_modifier":
      return { ...base, type: "attribute_modifier", attributeId: "fue", amount: 1, operation: "add" };
    case "cost_modifier":
      return { ...base, type: "cost_modifier", scopeId: "quirk", amount: 2, operation: "multiply" };
    case "incoming_damage_modifier":
      return { ...base, type: "incoming_damage_modifier", amount: 4, operation: "add", tagFilter: "fire" };
    case "outgoing_damage_modifier":
      return { ...base, type: "outgoing_damage_modifier", amount: 2, operation: "add" };
    case "roll_modifier":
      return { ...base, type: "roll_modifier", rollType: "action", amount: -2, operation: "add" };
    case "status_apply":
      return { ...base, type: "status_apply", statusElementId: "core.status.stunned", turns: 1 };
    case "turn_loss":
      return { ...base, type: "turn_loss", turns: 1 };
    case "action_block":
      return { ...base, type: "action_block", blockedAction: "all", duration: 1 };
    case "counter_modifier":
      return { ...base, type: "counter_modifier", counterId: "combat_counter", operation: "increment", value: 1 };
    case "manual":
      return { ...base, type: "manual", message: "Efecto manual a resolver por la narración." };
    default:
      return { ...base, type: "damage", dice: "1D6" };
  }
}
