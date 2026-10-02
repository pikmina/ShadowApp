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

export const baseMechanicalActivationSchema = z.object({
  actionType: activationActionTypeSchema.default("action"),
  timing: activationTimingSchema.default("immediate"),
  turns: z.number().int().nonnegative().optional().default(0),
  delay: z.number().int().nonnegative().optional().default(0),
  description: z.string().optional().default(""),
});

export const mechanicalActivationSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    const effectiveTurns = raw.delay ?? raw.turns ?? 0;
    if (raw.timing === "immediate" || effectiveTurns === 0) {
      delete raw.delay;
      raw.turns = 0;
      raw.timing = "immediate";
    } else {
      raw.turns = effectiveTurns;
      raw.delay = effectiveTurns;
      raw.timing = "turns";
    }
    return raw;
  }
  return val;
}, baseMechanicalActivationSchema).transform((act): {
  actionType: ActivationActionType;
  timing: ActivationTiming;
  turns?: number;
  delay?: number;
  description?: string;
} => {
  const effectiveDelay = act.delay ?? act.turns ?? 0;
  if (effectiveDelay > 0) {
    return {
      ...act,
      timing: "turns",
      turns: effectiveDelay,
      delay: effectiveDelay,
    };
  }
  return {
    ...act,
    timing: act.timing === "turns" ? "immediate" : act.timing,
    turns: 0,
    delay: 0,
  };
});
export type MechanicalActivation = z.infer<typeof mechanicalActivationSchema>;

// ==========================================
// 3. TRIGGER (for 'reactive' mode)
// ==========================================
export const triggerKindSchema = z.union([
  z.enum([
    "receive_damage",
    "damage_received",
    "deal_damage",
    "damage_dealt",
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
    "roll_resolved",
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
    "status_applied",
    "status_removed",
    "behavior_resolved",
    "effect_ended",
    "manual",
  ]),
  z.string().min(1), // Extensible open trigger identifier
]);
export type TriggerKind = z.infer<typeof triggerKindSchema>;

export const triggerFilterSchema = z.object({
  sourceEntityType: z.array(z.string()).optional(),
  origin: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  resourceId: z.array(z.string()).optional(),
  statusElementId: z.array(z.string()).optional(),
}).catchall(z.any());
export type TriggerFilter = z.infer<typeof triggerFilterSchema>;

export const mechanicalTriggerSchema = z.object({
  kind: triggerKindSchema,
  description: z.string().optional(),
  filters: triggerFilterSchema.optional(),
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

export type MechanicalCondition =
  | { id?: string; type: "resource"; resourceId?: string; comparison: ConditionComparison; value: number; negated?: boolean }
  | { id?: string; type: "percentage"; resourceId?: string; comparison: ConditionComparison; percent: number; negated?: boolean }
  | { id?: string; type: "roll"; rollType?: string; comparison: ConditionComparison; target: number; negated?: boolean }
  | { id?: string; type: "die"; dieSelection?: "any" | "both" | "individual" | "first" | "second" | "pair" | "double"; comparison?: ConditionComparison; value?: number; pair?: number[]; min?: number; max?: number; negated?: boolean }
  | { id?: string; type: "status"; statusElementId: string; present?: boolean; negated?: boolean }
  | { id?: string; type: "turn_aggregate"; metric?: string; comparison: ConditionComparison; value: number; negated?: boolean }
  | { id?: string; type: "turn_history"; event?: string; comparison?: ConditionComparison; value?: number | boolean; negated?: boolean }
  | { id?: string; type: "tag"; tag: string; scope?: "source" | "target" | "attack" | "action" | "any"; negated?: boolean }
  | { id?: string; type: "item"; elementId: string; quantity?: number; comparison?: ConditionComparison; negated?: boolean }
  | { id?: string; type: "counter"; counterId: string; comparison?: ConditionComparison; value: number; negated?: boolean }
  | { id?: string; type: "attribute"; attributeId: string; comparison: ConditionComparison; value: number; negated?: boolean }
  | { id?: string; type: "manual"; signalId: string; description?: string; negated?: boolean }
  | { id?: string; type: "equipped"; negated?: boolean }
  | { id?: string; type: "active_behavior"; behaviorId?: string; elementId?: string; present?: boolean; scope?: "self" | "target" | "any"; negated?: boolean }
  | { id?: string; type: "conscious"; target?: "self" | "target"; conscious?: boolean; negated?: boolean }
  | { id?: string; type: "group"; logic?: "all" | "any"; conditions: MechanicalCondition[]; negated?: boolean };

export const conditionItemSchema: z.ZodType<MechanicalCondition> = z.lazy(() =>
  z.discriminatedUnion("type", [
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
      dieSelection: z.enum(["any", "both", "individual", "first", "second", "pair", "double"]).default("any"),
      comparison: conditionComparisonSchema.default("="),
      value: z.number().optional().default(0),
      pair: z.array(z.number()).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
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
    z.object({
      id: z.string().optional(),
      type: z.literal("equipped"),
      negated: z.boolean().optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("active_behavior"),
      behaviorId: z.string().optional(),
      elementId: z.string().optional(),
      present: z.boolean().default(true),
      scope: z.enum(["self", "target", "any"]).default("self"),
      negated: z.boolean().optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("conscious"),
      target: z.enum(["self", "target"]).default("target"),
      conscious: z.boolean().default(true),
      negated: z.boolean().optional(),
    }),
    z.object({
      id: z.string().optional(),
      type: z.literal("group"),
      logic: z.enum(["all", "any"]).default("all"),
      conditions: z.array(z.lazy(() => conditionItemSchema)).default([]),
      negated: z.boolean().optional(),
    }),
  ])
);

export const conditionLogicSchema = z.enum(["all", "any"]);
export type MechanicalConditionLogic = z.infer<typeof conditionLogicSchema>;

// ==========================================
// 5. TARGET (unified object)
// ==========================================
export const targetTypeSchema = z.enum([
  "self",
  "ally",
  "allies",
  "enemy",
  "enemies",
  "character",
  "any",
  "object",
  "structure",
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

export const targetRangeSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = val as Record<string, any>;
    let t = raw.type;
    let distanceMeters = raw.distanceMeters;

    if (typeof t === "number" || (typeof t === "string" && !isNaN(Number(t)))) {
      distanceMeters = distanceMeters ?? Number(t);
      t = Number(t) === 0 ? "self" : "distance";
    }

    return {
      ...raw,
      type: t,
      distanceMeters,
    };
  }
  return val;
}, z.object({
  type: z.enum(["self", "contact", "distance", "unlimited", "manual"]).default("contact"),
  distanceMeters: z.number().nonnegative().optional(),
}));
export type TargetRange = z.infer<typeof targetRangeSchema>;

export const targetAreaSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = val as Record<string, any>;
    let shape = raw.shape;
    let sizeMeters = raw.sizeMeters;

    if (typeof shape === "number" || (typeof shape === "string" && !isNaN(Number(shape)))) {
      sizeMeters = sizeMeters ?? Number(shape);
      shape = "radius";
    }

    return {
      ...raw,
      shape,
      sizeMeters,
    };
  }
  return val;
}, z.object({
  shape: z.enum(["radius", "diameter", "cone", "line", "zone", "manual"]).default("radius"),
  sizeMeters: z.number().positive().optional(),
}));
export type TargetArea = z.infer<typeof targetAreaSchema>;

export const selectionRestrictionSchema = z.union([
  z.enum(["nearest", "random", "specific", "exclude", "manual"]),
  z.string(),
]);
export type SelectionRestriction = z.infer<typeof selectionRestrictionSchema>;

export const selectionModeSchema = z.enum([
  "standard_priority",
  "manual",
  "random",
]).default("standard_priority");
export type SelectionMode = z.infer<typeof selectionModeSchema>;

export const mechanicalTargetSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };

    // Invariant CE-4B.1: target.type === "self" does not accept quantity, range, area, selectionMode, or selectionRestriction
    if (raw.type === "self") {
      delete raw.quantity;
      delete raw.range;
      delete raw.area;
      delete raw.selectionMode;
      delete raw.selectionRestriction;
    }

    // Legacy normalization: allies / enemies -> ally / enemy + quantity all (if quantity not set)
    if (raw.type === "enemies") {
      raw.type = "enemy";
      if (!raw.quantity) {
        raw.quantity = { mode: "all" };
      }
    } else if (raw.type === "allies") {
      raw.type = "ally";
      if (!raw.quantity) {
        raw.quantity = { mode: "all" };
      }
    }

    // Legacy selectionRestriction -> selectionMode
    if (!raw.selectionMode && raw.selectionRestriction) {
      if (raw.selectionRestriction === "random") {
        raw.selectionMode = "random";
      } else if (raw.selectionRestriction === "manual") {
        raw.selectionMode = "manual";
      } else {
        raw.selectionMode = "standard_priority";
      }
    }

    return raw;
  }
  return val;
}, z.object({
  type: targetTypeSchema.default("self"),
  quantity: targetQuantitySchema.optional(),
  range: targetRangeSchema.optional(),
  area: targetAreaSchema.optional(),
  selectionMode: selectionModeSchema.optional(),
  selectionRestriction: selectionRestrictionSchema.optional(),
  description: z.string().optional(),
})).transform((target) => (
  target.type === "self"
    ? { type: "self" as const, ...(target.description ? { description: target.description } : {}) }
    : target
));
export type MechanicalTarget = z.infer<typeof mechanicalTargetSchema>;

export function normalizeMechanicalTarget(target: unknown): MechanicalTarget {
  const parsed = mechanicalTargetSchema.parse(target ?? { type: "self" });
  if (parsed.type === "self") {
    return { type: "self" };
  }
  return parsed;
}

// ==========================================
// 6. TEMPORALITY (Duration, Frequency, Maintenance)
// ==========================================
export const durationTypeSchema = z.enum([
  "instant",
  "turns",
  "1_day",
  "1_week",
  "1_month",
  "days",
  "weeks",
  "months",
  "passive_time",
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
  "sustained",
]);
export type DurationType = z.infer<typeof durationTypeSchema>;

export const mechanicalDurationSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    let t = raw.type;
    let turns = raw.turns ?? raw.value;

    if (typeof t === "number" || (typeof t === "string" && !isNaN(Number(t)) && Number(t) > 0)) {
      turns = turns ?? Number(t);
      t = "turns";
    } else if (t === "sustained") {
      t = "until_deactivated";
    }

    if (t !== "turns") {
      delete raw.turns;
      delete raw.value;
    }

    return {
      ...raw,
      type: t,
      ...(turns !== undefined ? { turns, value: turns } : {}),
    };
  }
  return val;
}, z.object({
  type: durationTypeSchema.default("instant"),
  turns: z.number().int().positive().optional(),
  value: z.number().int().positive().optional(),
  unit: z.enum(["turn", "day", "week", "month"]).optional(),
  conditionDescription: z.string().optional(),
})).transform((dur) => {
  if (dur.type !== "turns") {
    const { turns, value, ...rest } = dur;
    return rest;
  }
  const effectiveTurns = dur.turns ?? dur.value ?? 1;
  return {
    ...dur,
    turns: effectiveTurns,
    value: effectiveTurns,
  };
});
export type MechanicalDuration = z.infer<typeof mechanicalDurationSchema>;

export const periodicityModeSchema = z.enum(["once", "each_turn"]);
export type PeriodicityMode = z.infer<typeof periodicityModeSchema>;

export const periodicityTimingSchema = z.enum(["turn_start", "turn_end"]);
export type PeriodicityTiming = z.infer<typeof periodicityTimingSchema>;

export const mechanicalPeriodicitySchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    const mode = raw.mode ?? "once";
    if (mode === "once") {
      delete raw.timing;
    }
    return {
      ...raw,
      mode,
    };
  }
  return val;
}, z.object({
  mode: periodicityModeSchema.default("once"),
  timing: periodicityTimingSchema.optional(),
})).transform((p) => {
  if (p.mode === "once") {
    return { mode: "once" as const };
  }
  return { mode: "each_turn" as const, timing: p.timing ?? ("turn_start" as const) };
});
export type MechanicalPeriodicity = z.infer<typeof mechanicalPeriodicitySchema>;

export const frequencyTypeSchema = z.enum([
  "once",
  "each_turn",
  "turn_start",
  "turn_end",
  "every_n_turns",
  "manual",
]);
export type FrequencyType = z.infer<typeof frequencyTypeSchema>;

export const mechanicalFrequencySchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    if (raw.type === "once") {
      delete raw.nTurns;
    }
    return raw;
  }
  return val;
}, z.object({
  type: frequencyTypeSchema.default("once"),
  nTurns: z.number().int().positive().optional(),
  description: z.string().optional(),
})).transform((freq) => {
  if (freq.type === "once") {
    const { nTurns, ...rest } = freq;
    return rest;
  }
  return freq;
});
export type MechanicalFrequency = z.infer<typeof mechanicalFrequencySchema>;

export const mechanicalMaintenanceSchema = z.object({
  enabled: z.boolean().default(false),
  resource: z.enum(["ES", "SA"]).or(z.string()).default("ES"),
  amount: z.number().nonnegative().default(1),
});
export type MechanicalMaintenance = z.infer<typeof mechanicalMaintenanceSchema>;

export const mechanicalTemporalitySchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };

    // Clean duration turns if instant
    if (raw.duration?.type === "instant") {
      if (typeof raw.duration === "object") {
        delete raw.duration.turns;
        delete raw.duration.value;
      }
    }

    // Harmonize legacy frequency with periodicity if periodicity is missing
    if (!raw.periodicity && raw.frequency) {
      if (raw.frequency.type === "each_turn") {
        raw.periodicity = { mode: "each_turn", timing: "turn_start" };
      } else if (raw.frequency.type === "turn_start") {
        raw.periodicity = { mode: "each_turn", timing: "turn_start" };
      } else if (raw.frequency.type === "turn_end") {
        raw.periodicity = { mode: "each_turn", timing: "turn_end" };
      } else if (raw.frequency.type === "once") {
        raw.periodicity = { mode: "once" };
      }
    }

    // If duration is instant, enforce periodicity mode "once" and clean timing
    if (raw.duration?.type === "instant") {
      raw.periodicity = { mode: "once" };
    }

    return raw;
  }
  return val;
}, z.object({
  duration: mechanicalDurationSchema.default({ type: "instant" }),
  periodicity: mechanicalPeriodicitySchema.default({ mode: "once" }),
  frequency: mechanicalFrequencySchema.optional(),
  maintenance: mechanicalMaintenanceSchema.optional(),
})).transform((temp) => {
  const result: any = { ...temp };
  if (result.duration?.type !== "turns") {
    delete result.duration.turns;
    delete result.duration.value;
  }
  if (result.duration?.type === "instant") {
    result.periodicity = { mode: "once" };
  } else if (result.periodicity?.mode === "once") {
    delete result.periodicity.timing;
  }
  if (result.frequency?.type === "once") {
    delete result.frequency.nTurns;
  }
  if (result.maintenance && !result.maintenance.enabled) {
    delete result.maintenance;
  }
  return result;
});
export type MechanicalTemporality = z.infer<typeof mechanicalTemporalitySchema>;

export function normalizeMechanicalTemporality(temp: unknown): MechanicalTemporality {
  return mechanicalTemporalitySchema.parse(temp ?? { duration: { type: "instant" }, periodicity: { mode: "once" } });
}

// ==========================================
// 7. MODIFIER OPERATIONS & EFFECTS
// ==========================================
export const modifierOperationSchema = z.enum(["add", "subtract", "multiply", "divide", "set"]);
export type ModifierOperation = z.infer<typeof modifierOperationSchema>;

export const baseMechanicalEffectItemSchema = z.discriminatedUnion("type", [
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
    kind: z.enum(["fixed", "dice"]).optional(),
    amount: z.number().positive().optional(),
    dice: z.string().min(1).optional(),
    formula: z.string().min(1).optional(),
    magnitude: z
      .discriminatedUnion("kind", [
        z.object({ kind: z.literal("fixed"), amount: z.number().positive() }),
        z.object({ kind: z.literal("dice"), formula: z.string().min(1) }),
      ])
      .optional(),
    ruleId: z.string().optional(),
    runtimeKey: z.string().optional(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("barrier"),
    amount: z.number().positive(),
    ruleId: z.string().optional(),
    runtimeKey: z.string().optional(),
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
    type: z.literal("effect_block"),
    scope: z.enum(["all", "support", "damage", "healing", "barrier"]).or(z.string()).optional().default("support"),
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
  z.object({
    id: z.string().min(1),
    type: z.literal("transformation"),
    magnitude: z
      .object({
        type: z.enum(["body", "corporal", "2m", "5m", "10m", "20m"]).or(z.string()).default("corporal"),
        value: z.number().default(1),
      })
      .optional()
      .default({ type: "corporal", value: 1 }),
    ruleId: z.string().optional(),
    runtimeKey: z.string().optional(),
    description: z.string().optional(),
    contextRef: z.string().optional(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("object_manipulation"),
    size: z.enum(["small", "medium", "large", "huge"]).or(z.string()).default("small"),
    ruleId: z.string().optional(),
    runtimeKey: z.string().optional(),
    description: z.string().optional(),
    target: mechanicalTargetSchema.optional(),
    temporality: mechanicalTemporalitySchema.optional(),
  }),
]);
export const mechanicalEffectItemSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    if (!raw.id) {
      raw.id = nanoid(8);
    }
    return raw;
  }
  return val;
}, baseMechanicalEffectItemSchema);
export type MechanicalEffectItem = z.infer<typeof baseMechanicalEffectItemSchema>;

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

export const ATTACK_TYPES = ["physical", "mental"] as const;
export const attackTypeSchema = z.enum(ATTACK_TYPES);
export type AttackType = z.infer<typeof attackTypeSchema>;

/**
 * Pure canonical helper: derives the opposed target defense from the attack classification.
 * Physical -> EVA (Evasión)
 * Mental   -> COR (Coraje)
 * Target defense is strictly derived and NEVER independently persisted.
 */
export function deriveTargetDefense(attackType?: AttackType | string | null): "EVA" | "COR" | undefined {
  if (attackType === "physical") return "EVA";
  if (attackType === "mental") return "COR";
  return undefined;
}

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
  difficulty: z.number().int().optional(), // e.g. 12, 16 for explicit RD
  attribute: z.string().optional(), // e.g. 'FUE', 'DES', 'INT', etc.
  skill: z.string().optional(),
  attackType: attackTypeSchema.optional(), // 'physical' | 'mental'
  description: z.string().optional(),
  outcomes: z.array(differentiatedOutcomeSchema).optional(),
  isExplicit: z.boolean().optional(),
  explicitOverride: z.boolean().optional(),
});
export type MechanicalResolution = z.infer<typeof mechanicalResolutionSchema>;

// ==========================================
// 9. LIMITATIONS
// ==========================================
const baseMechanicalLimitationSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("cooldown"),
    turns: z.number().int().positive().default(1),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("usage_limit"),
    period: z.enum(["turn", "combat", "mission", "day"]).or(z.string()).default("combat"),
    scope: z.enum(["turn", "combat", "mission", "day"]).or(z.string()).optional(),
    max: z.number().int().positive().default(1),
    count: z.number().int().positive().optional(),
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
  z.object({
    id: z.string().min(1),
    type: z.literal("self_damage"),
    amount: z.number().int().positive().default(1),
    frequency: z.enum(["on_activation", "each_active_turn", "on_end"]).default("on_activation"),
    description: z.string().optional(),
  }),
]);

export const mechanicalLimitationSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    if (!raw.id) {
      raw.id = nanoid(6);
    }
    if (raw.type === "cooldown") {
      delete raw.period;
      delete raw.scope;
      delete raw.max;
      delete raw.count;
      raw.turns = Math.max(1, Number(raw.turns ?? 1));
    } else if (raw.type === "usage_limit") {
      delete raw.turns;
      const period = raw.scope ?? raw.period ?? "combat";
      const max = Math.max(1, Number(raw.count ?? raw.max ?? 1));
      raw.period = period;
      raw.scope = period;
      raw.max = max;
      raw.count = max;
    } else if (raw.type === "self_damage") {
      delete raw.costAdjustment;
      raw.amount = Math.max(1, Math.round(Number(raw.amount ?? 1)));
      if (!raw.frequency || !["on_activation", "each_active_turn", "on_end"].includes(raw.frequency)) {
        raw.frequency = "on_activation";
      }
    }
    return raw;
  }
  return val;
}, baseMechanicalLimitationSchema);
export type MechanicalLimitation = z.infer<typeof baseMechanicalLimitationSchema>;

// ==========================================
// 9.1. REQUIREMENTS (for technique / behavior activation)
// ==========================================
export const requirementResolutionSchema = z.enum(["automatic", "manual"]);
export type RequirementResolution = z.infer<typeof requirementResolutionSchema>;

export const requirementTypeSchema = z.enum([
  "physical_contact",
  "visual_contact",
  "auditory_contact",
  "speak_directly",
  "target_conscious",
  "conscious",
  "active_behavior",
  "consume",
  "resource_threshold",
  "item",
  "previous_roll",
  "manual",
  "custom",
]);
export type RequirementType = z.infer<typeof requirementTypeSchema>;

export const mechanicalRequirementSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const raw = { ...(val as Record<string, any>) };
    if (!raw.id) {
      raw.id = nanoid(6);
    }
    return raw;
  }
  return val;
}, z.object({
  id: z.string().min(1),
  type: requirementTypeSchema,
  resolution: requirementResolutionSchema.optional(),
  description: z.string().optional().default(""),
  behaviorId: z.string().optional(),
  elementId: z.string().optional(),
  resourceId: z.enum(["ES", "SA"]).or(z.string()).optional(),
  minAmount: z.number().optional(),
  quantity: z.number().int().positive().optional(),
  target: z.enum(["self", "target"]).optional(),
  parameters: z.record(z.string(), z.any()).optional(),
}));
export type MechanicalRequirement = z.infer<typeof mechanicalRequirementSchema>;

// ==========================================
// 9.2. CONSEQUENCES
// ==========================================
export const mechanicalConsequenceSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  ruleId: z.string().optional(),
  runtimeKey: z.string().optional(),
  when: z.enum(["activation", "each_turn", "end", "after_damage"]).optional().default("activation"),
  amount: z.number().optional(),
  fraction: z.number().optional(),
  attributeId: z.string().optional(),
  resourceId: z.string().optional(),
  statusElementId: z.string().optional(),
  turns: z.number().optional(),
  threshold: z.number().optional(),
  value: z.number().optional(),
  untilEnd: z.boolean().optional(),
  description: z.string().optional(),
  consequence: z.any().optional(),
});
export type MechanicalConsequence = z.infer<typeof mechanicalConsequenceSchema>;

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

  requirements: z.array(mechanicalRequirementSchema).optional(),

  resolution: mechanicalResolutionSchema.optional(),

  effects: z.array(mechanicalEffectItemSchema).default([]),

  target: mechanicalTargetSchema.optional(),

  temporality: mechanicalTemporalitySchema.optional(),

  limitations: z.array(mechanicalLimitationSchema).default([]),

  consequences: z.array(mechanicalConsequenceSchema).optional(),

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
    requirements: [],
    consequences: [],
    resolution: { type: "automatic", outcomes: [] },
    effects: [],
    target: { type: "self" },
    temporality: { duration: { type: "instant" }, periodicity: { mode: "once" } },
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
      return { ...base, type: "damage", dice: "2D6", damageType: "fisico" };
    case "healing":
      return { ...base, type: "healing", resourceId: "SA", amount: 4 };
    case "barrier":
      return { ...base, type: "barrier", amount: 5 };
    case "attribute_modifier":
      return { ...base, type: "attribute_modifier", attributeId: "fue", amount: 1, operation: "add" };
    case "derived_stat_modifier":
      return { ...base, type: "derived_stat_modifier", statId: "SAL", amount: 1, operation: "add" };
    case "skill_modifier":
      return { ...base, type: "skill_modifier", skillId: "acrobacias", amount: 1, operation: "add" };
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
    case "transformation":
      return { ...base, type: "transformation", magnitude: { type: "corporal", value: 1 } };
    case "object_manipulation":
      return { ...base, type: "object_manipulation", size: "small" };
    default:
      return { ...base, type: "damage", dice: "1D6" };
  }
}

export function normalizeMechanicalBehavior(candidate: unknown): MechanicalBehavior {
  const parsed = mechanicalBehaviorSchema.parse(candidate);
  const target = parsed.target ? normalizeMechanicalTarget(parsed.target) : undefined;
  const temporality = parsed.temporality ? normalizeMechanicalTemporality(parsed.temporality) : undefined;

  const effects = (parsed.effects ?? []).map((eff) => {
    const effTarget = eff.target ? normalizeMechanicalTarget(eff.target) : undefined;
    const effTemp = eff.temporality ? normalizeMechanicalTemporality(eff.temporality) : undefined;
    return {
      ...eff,
      ...(effTarget ? { target: effTarget } : {}),
      ...(effTemp ? { temporality: effTemp } : {}),
    } as MechanicalEffectItem;
  });

  const limitations = (parsed.limitations ?? []).filter((lim) => {
    if (lim.type === "cooldown" && (!lim.turns || lim.turns <= 0)) return false;
    if (lim.type === "usage_limit" && (!lim.max || lim.max <= 0)) return false;
    return true;
  });

  // Normalize legacy requirement limitations into requirements if requirements is empty
  let requirements = [...(parsed.requirements ?? [])];
  if (requirements.length === 0 && parsed.limitations) {
    for (const lim of parsed.limitations) {
      if (lim.type === "physical_requirement") {
        requirements.push({
          id: lim.id,
          type: "physical_contact",
          resolution: "manual",
          description: lim.description,
          target: "target",
        });
      } else if (lim.type === "item_requirement") {
        requirements.push({
          id: lim.id,
          type: "item",
          resolution: "automatic",
          elementId: lim.referenceValue,
          quantity: lim.quantity,
          description: `Objeto requerido: ${lim.referenceValue}`,
          target: "target",
        });
      } else if (lim.type === "resource_threshold") {
        requirements.push({
          id: lim.id,
          type: "resource_threshold",
          resolution: "automatic",
          resourceId: lim.resourceId,
          minAmount: lim.minReserve,
          description: lim.description ?? `Reserva de ${lim.resourceId} >= ${lim.minReserve}`,
          target: "target",
        });
      } else if (lim.type === "manual") {
        requirements.push({
          id: lim.id,
          type: "manual",
          resolution: "manual",
          description: lim.description,
          target: "target",
        });
      }
    }
  }

  return {
    ...parsed,
    ...(target ? { target } : {}),
    ...(temporality ? { temporality } : {}),
    effects,
    limitations,
    requirements,
  };
}
