import type { RuleEntityState, RuleWorld } from "./ruleExecution";
export type { RuleEntityState, RuleWorld };
import type {
  MechanicalBehavior,
  MechanicalBehaviorInput,
  MechanicalCondition,
  MechanicalEffectItem,
  MechanicalLimitation,
  MechanicalTarget,
  MechanicalTemporality,
  MechanicalTrigger,
  OutcomeType,
  DifferentiatedOutcome,
} from "./mechanicalBehavior";
import { resolveEffectiveTemporality } from "./mechanicalBehavior";

// ============================================================================
// 1. EVENTOS MECÁNICOS Y PROVENIENCIA
// ============================================================================

export interface MechanicalEvent {
  id: string;
  type: string;

  sourceEntityId?: string;
  targetEntityId?: string;

  sourceElementId?: string;
  sourceBehaviorId?: string;

  turn?: number;
  timestamp?: number;

  payload?: Record<string, unknown>;

  parentEventId?: string;
  
  /** Depth counter to prevent infinite recursive triggers */
  depth?: number;
}

// ============================================================================
// 2. RUNTIME STATE (Estado temporal por participante del encuentro)
// ============================================================================

export interface PendingModifier {
  id: string;
  sourceBehaviorId: string;
  sourceElementId?: string;
  scope: string; // 'all' | 'quirk' | 'technique' | 'attack' | 'action_roll' | string
  type: "cost" | "damage" | "healing" | "roll";
  amount: number;
  operation: "add" | "subtract" | "multiply" | "divide" | "set";
  duration: "until_next_roll" | "until_next_use" | "until_turn_end";
  tagFilter?: string;
  consumed?: boolean;
}

export interface ActiveTimedEffect {
  id: string;
  sourceBehaviorId: string;
  sourceElementId?: string;
  effect: MechanicalEffectItem;
  temporality: MechanicalTemporality;
  remainingTurns?: number;
  expiresAtTurn?: number;
  targetEntityId: string;
}

export interface ReservedInventoryItem {
  elementId: string;
  quantity: number;
  behaviorId: string;
}

export interface ParticipantRuntimeState {
  entityId: string;
  currentTurn: number;

  damageReceivedThisTurn: number;
  damageDealtThisTurn: number;

  esSpentThisTurn: number;
  esRecoveredThisTurn: number;

  hpLostThisTurn: number;
  hpRecoveredThisTurn: number;

  usedQuirkThisTurn: boolean;
  usedQuirkPreviousTurn: boolean;
  consecutiveTurnsQuirkUsed: number;

  lastTechniqueId?: string;
  lastQuirkUseTurn?: number;

  /** Generic counters keyed by `${entityId}:${elementId}:${behaviorId}:${counterId}` or `${counterId}` */
  activeCounters: Record<string, number>;

  /** Pending modifiers consumed on next roll / next use */
  pendingModifiers: PendingModifier[];

  /** Cooldown expirations: key `${behaviorId}` => turn when ready */
  cooldowns: Record<string, number>;

  /** Usage limit counters: key `${period}:${periodId}:${behaviorId}` => count */
  usageCounters: Record<string, number>;

  /** Temporarily reserved items */
  reservedInventory: Record<string, number>;

  /** Active timed effects being tracked */
  activeTimedEffects: ActiveTimedEffect[];

  /** Set of processed event IDs to prevent duplicate triggers */
  executedBehaviorEvents: string[];

  /** Blocked actions currently active on this participant */
  actionBlocks?: Array<{ blockedAction: string; turnsRemaining: number }>;

  /** Number of turns lost/skipped */
  turnLoss?: number;

  /** Previous resource values to detect threshold crossing transitions */
  previousResources?: Record<string, number>;
}

export interface EncounterRuntimeState {
  turn: number;
  participants: Record<string, ParticipantRuntimeState>;
  eventLog: MechanicalEvent[];
  traceLog: ExecutionTrace[];
}

export interface ExecutionTrace {
  timestamp: number;
  turn: number;
  behaviorId?: string;
  behaviorName?: string;
  mode?: string;
  triggerKind?: string;
  eventId?: string;
  conditionsPassed: boolean;
  limitationsPassed: boolean;
  initialValues?: Record<string, unknown>;
  finalValues?: Record<string, unknown>;
  appliedEffects: string[];
  notes?: string[];
}

// ============================================================================
// 3. FACTORY DE ESTADO DE RUNTIME
// ============================================================================

export function createParticipantRuntimeState(entityId: string, turn: number = 1): ParticipantRuntimeState {
  return {
    entityId,
    currentTurn: turn,
    damageReceivedThisTurn: 0,
    damageDealtThisTurn: 0,
    esSpentThisTurn: 0,
    esRecoveredThisTurn: 0,
    hpLostThisTurn: 0,
    hpRecoveredThisTurn: 0,
    usedQuirkThisTurn: false,
    usedQuirkPreviousTurn: false,
    consecutiveTurnsQuirkUsed: 0,
    activeCounters: {},
    pendingModifiers: [],
    cooldowns: {},
    usageCounters: {},
    reservedInventory: {},
    activeTimedEffects: [],
    executedBehaviorEvents: [],
    actionBlocks: [],
    turnLoss: 0,
  };
}

export function createEncounterRuntimeState(turn: number = 1): EncounterRuntimeState {
  return {
    turn,
    participants: {},
    eventLog: [],
    traceLog: [],
  };
}

export function getOrCreateParticipantState(
  encounter: EncounterRuntimeState,
  entityId: string
): ParticipantRuntimeState {
  if (!encounter.participants[entityId]) {
    encounter.participants[entityId] = createParticipantRuntimeState(entityId, encounter.turn);
  }
  return encounter.participants[entityId];
}

// ============================================================================
// 4. RESET DE TURNO (advanceTurn)
// ============================================================================

export function advanceTurn(
  encounter: EncounterRuntimeState,
  ownedBehaviorsByEntity?: Record<string, Array<{ elementId: string; behavior: MechanicalBehavior }>>
): EncounterRuntimeState {
  const next = structuredClone(encounter);
  next.turn += 1;

  for (const [entityId, participant] of Object.entries(next.participants)) {
    participant.currentTurn = next.turn;

    // Consecutive quirk history tracking
    if (participant.usedQuirkThisTurn) {
      participant.consecutiveTurnsQuirkUsed += 1;
    } else {
      participant.consecutiveTurnsQuirkUsed = 0;
    }

    participant.usedQuirkPreviousTurn = participant.usedQuirkThisTurn;
    participant.usedQuirkThisTurn = false;

    // Reset this-turn accumulators
    participant.damageReceivedThisTurn = 0;
    participant.damageDealtThisTurn = 0;
    participant.esSpentThisTurn = 0;
    participant.esRecoveredThisTurn = 0;
    participant.hpLostThisTurn = 0;
    participant.hpRecoveredThisTurn = 0;

    // Remove pending modifiers with duration 'until_turn_end'
    participant.pendingModifiers = participant.pendingModifiers.filter(
      (m) => m.duration !== "until_turn_end" && !m.consumed
    );

    // Decrement or expire active timed effects
    participant.activeTimedEffects = participant.activeTimedEffects.filter((effect) => {
      if (effect.remainingTurns !== undefined) {
        effect.remainingTurns -= 1;
      }
      if (effect.expiresAtTurn !== undefined) {
        return effect.expiresAtTurn > next.turn;
      }
      if (effect.remainingTurns !== undefined) {
        return effect.remainingTurns > 0;
      }
      return true;
    });

    // Process behaviors with counter reset on turn_end or turn_without_quirk
    if (ownedBehaviorsByEntity?.[entityId]) {
      for (const { elementId, behavior } of ownedBehaviorsByEntity[entityId]) {
        const counterConfig = behavior.control?.counter;
        if (counterConfig) {
          const counterKey = makeCounterKey(entityId, elementId, behavior.id, counterConfig.id);
          if (counterConfig.resetCondition === "turn_end") {
            participant.activeCounters[counterKey] = counterConfig.initialValue ?? 0;
          }
        }

        const resetConfig = behavior.control?.reset;
        if (resetConfig) {
          if (
            resetConfig.event === "turn_end" ||
            (resetConfig.event === "turn_without_quirk" && !participant.usedQuirkPreviousTurn)
          ) {
            if (resetConfig.target === "counter" && counterConfig) {
              const counterKey = makeCounterKey(entityId, elementId, behavior.id, counterConfig.id);
              participant.activeCounters[counterKey] = counterConfig.initialValue ?? 0;
            }
          }
        }
      }
    }
  }

  return next;
}

// ============================================================================
// 5. EVALUADOR DE CONDICIONES Y TRANSICIONES DE UMBRAL
// ============================================================================

export interface ConditionEvaluationContext {
  entity: RuleEntityState;
  participant: ParticipantRuntimeState;
  elementId?: string;
  behaviorId?: string;
  world?: RuleWorld;
  event?: MechanicalEvent;
  signals?: string[];
  dice?: number[];
  rollResult?: number;
  margin?: number;
  attackTags?: string[];
}

function compareNumbers(actual: number, comparison: "<" | "<=" | "=" | ">=" | ">", target: number): boolean {
  switch (comparison) {
    case "<":
      return actual < target;
    case "<=":
      return actual <= target;
    case "=":
      return actual === target;
    case ">=":
      return actual >= target;
    case ">":
      return actual > target;
  }
}

export function evaluateSingleCondition(
  condition: MechanicalCondition,
  ctx: ConditionEvaluationContext
): boolean {
  let result = false;

  switch (condition.type) {
    case "resource": {
      const resId = (condition.resourceId ?? "SA") as "SA" | "ES";
      const current = ctx.entity.resources[resId]?.current ?? 0;
      result = compareNumbers(current, condition.comparison, condition.value);
      break;
    }

    case "percentage": {
      const resId = (condition.resourceId ?? "SA") as "SA" | "ES";
      const res = ctx.entity.resources[resId];
      if (!res || res.max <= 0) {
        result = false;
      } else {
        const pct = (res.current * 100) / res.max;
        result = compareNumbers(pct, condition.comparison, condition.percent);
      }
      break;
    }

    case "roll": {
      if (condition.rollType === "failure_margin") {
        const marginVal = (ctx.event?.payload?.failureMargin as number) ?? ctx.margin ?? 0;
        result = compareNumbers(marginVal, condition.comparison, condition.target);
      } else if (ctx.rollResult === undefined) {
        result = false;
      } else {
        result = compareNumbers(ctx.rollResult, condition.comparison, condition.target);
      }
      break;
    }

    case "die": {
      const dice = ctx.dice ?? [];
      if (dice.length === 0) {
        result = false;
        break;
      }
      switch (condition.dieSelection) {
        case "both":
          result = dice.length >= 2 && dice.every((d) => compareNumbers(d, condition.comparison, condition.value));
          break;
        case "first":
          result = dice.length >= 1 && compareNumbers(dice[0], condition.comparison, condition.value);
          break;
        case "second":
          result = dice.length >= 2 && compareNumbers(dice[1], condition.comparison, condition.value);
          break;
        case "individual":
        case "any":
        default:
          result = dice.some((d) => compareNumbers(d, condition.comparison, condition.value));
          break;
      }
      break;
    }

    case "status": {
      const hasStatus = ctx.entity.statuses.some((s) => s.statusElementId === condition.statusElementId);
      result = condition.present !== false ? hasStatus : !hasStatus;
      break;
    }

    case "turn_aggregate": {
      let metricValue = 0;
      switch (condition.metric) {
        case "damage_taken":
          metricValue = ctx.participant.damageReceivedThisTurn;
          break;
        case "damage_dealt":
          metricValue = ctx.participant.damageDealtThisTurn;
          break;
        case "es_spent":
          metricValue = ctx.participant.esSpentThisTurn;
          break;
        case "hp_spent":
          metricValue = ctx.participant.hpLostThisTurn;
          break;
        default:
          metricValue = 0;
      }
      result = compareNumbers(metricValue, condition.comparison, condition.value);
      break;
    }

    case "turn_history": {
      if (condition.event === "used_quirk" || condition.event === "used_quirk_previous_turn") {
        const expected = condition.value === undefined ? true : Boolean(condition.value);
        result = ctx.participant.usedQuirkPreviousTurn === expected;
      } else if (condition.event === "used_quirk_this_turn") {
        const expected = condition.value === undefined ? true : Boolean(condition.value);
        result = ctx.participant.usedQuirkThisTurn === expected;
      } else if (condition.event === "consecutive_turns_used") {
        const count = ctx.participant.consecutiveTurnsQuirkUsed;
        const target = typeof condition.value === "number" ? condition.value : 1;
        const comp = condition.comparison ?? ">=";
        result = compareNumbers(count, comp, target);
      } else {
        result = false;
      }
      break;
    }

    case "tag": {
      const tags = ctx.attackTags ?? (ctx.event?.payload?.tags as string[]) ?? [];
      result = tags.includes(condition.tag);
      break;
    }

    case "counter": {
      let countVal = 0;
      const exactKey = `${ctx.participant.entityId}:${ctx.elementId ?? "root"}:${ctx.behaviorId ?? "root"}:${condition.counterId}`;
      if (ctx.participant.activeCounters[exactKey] !== undefined) {
        countVal = ctx.participant.activeCounters[exactKey];
      } else if (ctx.participant.activeCounters[condition.counterId] !== undefined) {
        countVal = ctx.participant.activeCounters[condition.counterId];
      } else {
        for (const [key, val] of Object.entries(ctx.participant.activeCounters)) {
          if (key.endsWith(`:${condition.counterId}`) || key === condition.counterId) {
            countVal = val;
            break;
          }
        }
      }
      const comp = condition.comparison ?? ">=";
      result = compareNumbers(countVal, comp, condition.value);
      break;
    }

    case "item": {
      const qty = ctx.entity.inventory[condition.elementId] ?? 0;
      const comp = condition.comparison ?? ">=";
      result = compareNumbers(qty, comp, condition.quantity);
      break;
    }

    case "attribute": {
      const attrVal = ctx.entity.attributes[condition.attributeId] ?? 0;
      result = compareNumbers(attrVal, condition.comparison, condition.value);
      break;
    }

    case "manual": {
      const signals = ctx.signals ?? [];
      result = signals.includes(condition.signalId);
      break;
    }

    case "equipped": {
      const sourceElementId = ctx.elementId;
      if (!sourceElementId) {
        result = false;
        break;
      }
      const equipped = ctx.entity.equippedItems;
      if (Array.isArray(equipped)) {
        result = equipped.includes(sourceElementId);
      } else if (equipped && typeof equipped === "object") {
        result = Boolean(equipped[sourceElementId]);
      } else {
        result = false;
      }
      break;
    }

    default:
      result = false;
  }

  return condition.negated ? !result : result;
}

export function evaluateMechanicalConditions(
  conditions: MechanicalCondition[],
  logic: "all" | "any",
  ctx: ConditionEvaluationContext
): boolean {
  if (!conditions || conditions.length === 0) return true;

  if (logic === "any") {
    return conditions.some((c) => evaluateSingleCondition(c, ctx));
  }
  return conditions.every((c) => evaluateSingleCondition(c, ctx));
}

/**
 * Checks if a resource threshold was actively crossed.
 * Distinguishes level (e.g. current <= 3) from active transition (previous > 3 && current <= 3).
 */
export function checkResourceThresholdTransition(
  previousValue: number | undefined,
  currentValue: number,
  threshold: number,
  direction: "cross_down" | "cross_up" | "any" = "cross_down"
): boolean {
  if (previousValue === undefined) {
    // If no previous value, it's not a transition
    return false;
  }

  const crossedDown = previousValue > threshold && currentValue <= threshold;
  const crossedUp = previousValue < threshold && currentValue >= threshold;

  switch (direction) {
    case "cross_down":
      return crossedDown;
    case "cross_up":
      return crossedUp;
    case "any":
      return crossedDown || crossedUp;
  }
}

// ============================================================================
// 6. PIPELINES DE MATEMÁTICA Y PRECEDENCIA DE MODIFICADORES
// ============================================================================

/**
 * Applies modifiers following deterministic mathematical precedence:
 * 1. 'set' (overwrites base)
 * 2. 'multiply' and 'divide'
 * 3. 'add' and 'subtract'
 */
export interface ModifierItem {
  operation: "add" | "subtract" | "multiply" | "divide" | "set";
  amount: number;
}

export function applyModifierMath(base: number, modifiers: ModifierItem[], minimum: number = 0): number {
  let val = base;

  // 1. 'set'
  const setMods = modifiers.filter((m) => m.operation === "set");
  if (setMods.length > 0) {
    val = setMods[setMods.length - 1].amount;
  }

  // 2. 'multiply' & 'divide'
  for (const m of modifiers) {
    if (m.operation === "multiply") {
      val *= m.amount;
    } else if (m.operation === "divide") {
      if (m.amount !== 0) val = Math.floor(val / m.amount);
    }
  }

  // 3. 'add' & 'subtract'
  for (const m of modifiers) {
    const op = m.operation ?? "add";
    if (op === "add") {
      val += m.amount;
    } else if (op === "subtract") {
      val -= m.amount;
    }
  }

  return Math.max(minimum, Math.floor(val));
}

// ============================================================================
// 7. PIPELINE DE DAÑO
// ============================================================================

export interface DamagePipelineInput {
  baseDamage: number;
  attackerId?: string;
  targetId: string;
  tags?: string[];
  dice?: number[];
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  attackerContinuousModifiers?: ModifierItem[];
  targetContinuousModifiers?: Array<ModifierItem & { tagFilter?: string }>;
}

export interface DamagePipelineResult {
  baseDamage: number;
  outgoingModifiers: number;
  incomingModifiers: number;
  absorbedByBarrier: number;
  finalDamage: number;
  newWorld: RuleWorld;
}

export function processDamagePipeline(input: DamagePipelineInput): DamagePipelineResult {
  const { baseDamage, targetId, tags = [], world, encounter } = input;
  const target = world[targetId];
  if (!target) throw new Error(`Unknown target ${targetId}`);

  const effectiveTags = [...tags];
  if (input.dice && input.dice.length >= 2 && input.dice[0] === input.dice[1] && input.dice[0] >= 9) {
    if (!effectiveTags.includes("critical")) {
      effectiveTags.push("critical");
    }
  }

  const newWorld = structuredClone(world);
  const targetEntity = newWorld[targetId];

  // 1. Outgoing damage modifiers
  const outgoingMods = input.attackerContinuousModifiers ?? [];
  let modifiedDamage = applyModifierMath(baseDamage, outgoingMods, 0);

  // 2. Incoming damage modifiers (including tag filters)
  const incomingMods = input.targetContinuousModifiers ?? [];
  const applicableIncoming: ModifierItem[] = [];

  for (const mod of incomingMods) {
    if (!mod.tagFilter || effectiveTags.includes(mod.tagFilter)) {
      applicableIncoming.push(mod);
    }
  }

  // Also include pending modifiers for incoming damage
  const participant = encounter.participants[targetId];
  if (participant) {
    for (const pending of participant.pendingModifiers) {
      if (!pending.consumed && pending.type === "damage") {
        if (!pending.tagFilter || effectiveTags.includes(pending.tagFilter)) {
          applicableIncoming.push({
            operation: pending.operation,
            amount: pending.amount,
          });
          pending.consumed = true;
        }
      }
    }
  }

  const damageAfterModifiers = applyModifierMath(modifiedDamage, applicableIncoming, 0);

  // 3. Barrier / Mitigation
  const absorbedByBarrier = Math.min(targetEntity.barrier, damageAfterModifiers);
  targetEntity.barrier -= absorbedByBarrier;

  // Absorb from layers if present
  let fromLayers = absorbedByBarrier;
  for (const layer of targetEntity.barriers ?? []) {
    const used = Math.min(layer.amount, fromLayers);
    layer.amount -= used;
    fromLayers -= used;
  }
  if (targetEntity.barriers) {
    targetEntity.barriers = targetEntity.barriers.filter((l) => l.amount > 0);
  }

  // 4. Final Damage applied to SA
  const finalDamage = Math.max(0, damageAfterModifiers - absorbedByBarrier);
  targetEntity.resources.SA.current -= finalDamage;

  // Track in participant runtime state
  if (participant) {
    participant.damageReceivedThisTurn += finalDamage;
    participant.hpLostThisTurn += finalDamage;
  }
  if (input.attackerId && encounter.participants[input.attackerId]) {
    encounter.participants[input.attackerId].damageDealtThisTurn += finalDamage;
  }

  return {
    baseDamage,
    outgoingModifiers: modifiedDamage - baseDamage,
    incomingModifiers: damageAfterModifiers - modifiedDamage,
    absorbedByBarrier,
    finalDamage,
    newWorld,
  };
}

// ============================================================================
// 8. PIPELINE DE CURACIÓN
// ============================================================================

export interface HealingPipelineInput {
  baseHealing: number;
  resourceId?: "SA" | "ES";
  healerId?: string;
  targetId: string;
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  healerModifiers?: ModifierItem[];
  targetModifiers?: ModifierItem[];
}

export interface HealingPipelineResult {
  baseHealing: number;
  finalHealing: number;
  actualAmountCredited: number;
  newWorld: RuleWorld;
}

export function processHealingPipeline(input: HealingPipelineInput): HealingPipelineResult {
  const { baseHealing, resourceId = "SA", targetId, world, encounter } = input;
  const target = world[targetId];
  if (!target) throw new Error(`Unknown target ${targetId}`);

  const newWorld = structuredClone(world);
  const targetEntity = newWorld[targetId];

  // 1. Outgoing healing modifiers
  const outgoingMods = input.healerModifiers ?? [];
  let modifiedHealing = applyModifierMath(baseHealing, outgoingMods, 0);

  // 2. Incoming healing modifiers
  const incomingMods = input.targetModifiers ?? [];
  const finalHealing = applyModifierMath(modifiedHealing, incomingMods, 0);

  // 3. Credit to resource (capped at max)
  const resource = targetEntity.resources[resourceId];
  const previousCurrent = resource.current;
  resource.current = Math.min(resource.max, resource.current + finalHealing);
  const actualAmountCredited = resource.current - previousCurrent;

  // Track in participant state
  const participant = encounter.participants[targetId];
  if (participant) {
    if (resourceId === "SA") {
      participant.hpRecoveredThisTurn += actualAmountCredited;
    } else {
      participant.esRecoveredThisTurn += actualAmountCredited;
    }
  }

  return {
    baseHealing,
    finalHealing,
    actualAmountCredited,
    newWorld,
  };
}

// ============================================================================
// 9. PIPELINE DE COSTES (Cost Pipeline)
// ============================================================================

export interface CostCalculationInput {
  baseCost: number;
  scope: string; // e.g. 'quirk', 'technique', 'all'
  entityId: string;
  encounter: EncounterRuntimeState;
  continuousModifiers?: ModifierItem[];
  minimum?: number;
}

export function calculateEffectiveCost(input: CostCalculationInput): {
  effectiveCost: number;
  consumedPendingModifiers: PendingModifier[];
} {
  const { baseCost, scope, entityId, encounter, continuousModifiers = [], minimum = 0 } = input;
  const participant = encounter.participants[entityId];

  const allMods: ModifierItem[] = [...continuousModifiers];
  const consumedPendingModifiers: PendingModifier[] = [];

  if (participant) {
    for (const pending of participant.pendingModifiers) {
      if (!pending.consumed && pending.type === "cost" && (pending.scope === "all" || pending.scope === scope)) {
        allMods.push({
          operation: pending.operation,
          amount: pending.amount,
        });
        pending.consumed = true;
        consumedPendingModifiers.push(pending);
      }
    }
  }

  const effectiveCost = applyModifierMath(baseCost, allMods, minimum);
  return { effectiveCost, consumedPendingModifiers };
}

export function applyRollPendingModifiers(
  baseRoll: number,
  participant: ParticipantRuntimeState,
  rollType: string = "action_roll"
): {
  finalRoll: number;
  consumedModifiers: PendingModifier[];
} {
  const applicableMods: ModifierItem[] = [];
  const consumedModifiers: PendingModifier[] = [];

  for (const pending of participant.pendingModifiers) {
    if (!pending.consumed && pending.type === "roll" && (pending.scope === "all" || pending.scope === rollType)) {
      applicableMods.push({
        operation: pending.operation,
        amount: pending.amount,
      });
      pending.consumed = true;
      consumedModifiers.push(pending);
    }
  }

  const finalRoll = applyModifierMath(baseRoll, applicableMods);
  return { finalRoll, consumedModifiers };
}

// ============================================================================
// 10. RESOLUCIÓN DE OUTCOMES Y MÁRGENES (RD)
// ============================================================================

export interface ResolutionResult {
  outcome: OutcomeType;
  margin?: number;
  selectedBranch?: DifferentiatedOutcome;
  effectsToApply: MechanicalEffectItem[];
  pendingManual?: boolean;
}

/**
 * Deterministic resolution outcome matcher for RD:
 * Prioritizes more specific margin branches over generic failure/success.
 */
export function resolveOutcomesForRoll(
  rollResult: number,
  difficulty: number,
  outcomes: DifferentiatedOutcome[] = []
): ResolutionResult {
  const margin = rollResult - difficulty;
  const isSuccess = margin >= 0;

  // Filter candidates
  let selectedBranch: DifferentiatedOutcome | undefined;

  if (isSuccess) {
    // 1. Critical if roll indicates critical
    const criticalBranch = outcomes.find((o) => o.outcome === "critical");
    // 2. success_margin with highest satisfied threshold
    const marginBranches = outcomes
      .filter((o) => o.outcome === "success_margin" && (o.marginThreshold ?? 0) <= margin)
      .sort((a, b) => (b.marginThreshold ?? 0) - (a.marginThreshold ?? 0));

    if (marginBranches.length > 0) {
      selectedBranch = marginBranches[0];
    } else if (criticalBranch && rollResult >= 20) {
      selectedBranch = criticalBranch;
    } else {
      selectedBranch = outcomes.find((o) => o.outcome === "success");
    }
  } else {
    // Failure: failure margin is distance below difficulty, e.g. difficulty 16, roll 10 => margin is -6, distance is 6
    const failureDistance = Math.abs(margin);
    const failureMarginBranches = outcomes
      .filter((o) => o.outcome === "failure_margin" && (o.marginThreshold ?? 0) <= failureDistance)
      .sort((a, b) => (b.marginThreshold ?? 0) - (a.marginThreshold ?? 0));

    if (failureMarginBranches.length > 0) {
      selectedBranch = failureMarginBranches[0];
    } else {
      selectedBranch = outcomes.find((o) => o.outcome === "failure");
    }
  }

  return {
    outcome: isSuccess ? (selectedBranch?.outcome ?? "success") : (selectedBranch?.outcome ?? "failure"),
    margin,
    selectedBranch,
    effectsToApply: selectedBranch?.effects ?? [],
  };
}

// ============================================================================
// 11. GESTIÓN DE CONTADORES Y ACUMULACIÓN (Counters)
// ============================================================================

export function makeCounterKey(
  entityId: string,
  elementId: string | undefined,
  behaviorId: string,
  counterId: string
): string {
  return `${entityId}:${elementId ?? "root"}:${behaviorId}:${counterId}`;
}

export function getCounterValue(
  participant: ParticipantRuntimeState,
  counterKey: string,
  defaultValue: number = 0
): number {
  return participant.activeCounters[counterKey] ?? defaultValue;
}

export function mutateCounter(
  participant: ParticipantRuntimeState,
  counterKey: string,
  operation: "increment" | "decrement" | "set" | "reset",
  value: number = 1,
  cap?: number,
  initialValue: number = 0
): number {
  let current = participant.activeCounters[counterKey] ?? initialValue;

  switch (operation) {
    case "increment":
      current += value;
      break;
    case "decrement":
      current -= value;
      break;
    case "set":
      current = value;
      break;
    case "reset":
      current = initialValue;
      break;
  }

  if (cap !== undefined && current > cap) {
    current = cap;
  }

  participant.activeCounters[counterKey] = current;
  return current;
}

// ============================================================================
// 12. LIMITACIONES Y EXCEPCIONES
// ============================================================================

export interface LimitationCheckResult {
  passed: boolean;
  failedLimitation?: MechanicalLimitation;
  failedConditionId?: string;
  exceptionAvailable?: boolean;
  exceptionCost?: { resource: "ES" | "SA"; amount: number };
}

export function checkLimitations(
  behavior: MechanicalBehavior,
  participant: ParticipantRuntimeState,
  entity: RuleEntityState,
  encounterTurn: number,
  periodId: string = "current"
): LimitationCheckResult {
  for (const lim of behavior.limitations ?? []) {
    switch (lim.type) {
      case "cooldown": {
        const readyTurn = participant.cooldowns[behavior.id] ?? 0;
        if (encounterTurn < readyTurn) {
          return { passed: false, failedLimitation: lim };
        }
        break;
      }
      case "usage_limit": {
        const key = `${lim.period}:${periodId}:${behavior.id}`;
        const used = participant.usageCounters[key] ?? 0;
        if (used >= lim.max) {
          return { passed: false, failedLimitation: lim };
        }
        break;
      }
      case "resource_threshold": {
        const res = entity.resources[lim.resourceId as "SA" | "ES"];
        if (!res || res.current < lim.minReserve) {
          return { passed: false, failedLimitation: lim };
        }
        break;
      }
      case "item_requirement": {
        if (lim.mode === "require" || lim.mode === "consume") {
          const qty = entity.inventory[lim.referenceValue] ?? 0;
          const reserved = participant.reservedInventory[lim.referenceValue] ?? 0;
          const available = qty - reserved;
          if (available < lim.quantity) {
            return { passed: false, failedLimitation: lim };
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return { passed: true };
}

// ============================================================================
// 13. CONTINUOUS MODIFIERS (getActiveContinuousModifiers)
// ============================================================================

export interface OwnedBehaviorEntry {
  elementId: string;
  behavior: MechanicalBehavior;
}

export function getActiveContinuousModifiers(
  ownedBehaviors: OwnedBehaviorEntry[],
  entity: RuleEntityState,
  participant: ParticipantRuntimeState,
  world?: RuleWorld,
  signals?: string[],
  attackTags?: string[]
): {
  effects: MechanicalEffectItem[];
  costModifiers: Array<ModifierItem & { scopeId: string }>;
  incomingDamageModifiers: Array<ModifierItem & { tagFilter?: string }>;
  incomingHealingModifiers: ModifierItem[];
  attributeModifiers: Array<{ attributeId: string; amount: number; operation: string }>;
  derivedStatModifiers: Array<{ statId: string; amount: number; operation: string }>;
  skillModifiers: Array<{ skillId: string; amount: number; operation: string }>;
  rdModifiers: Array<{ skillId?: string; amount: number; operation: string }>;
  rollModifiers: Array<{ rollType?: string; amount: number; operation: string }>;
} {
  const result = {
    effects: [] as MechanicalEffectItem[],
    costModifiers: [] as Array<ModifierItem & { scopeId: string }>,
    incomingDamageModifiers: [] as Array<ModifierItem & { tagFilter?: string }>,
    incomingHealingModifiers: [] as ModifierItem[],
    attributeModifiers: [] as Array<{ attributeId: string; amount: number; operation: string }>,
    derivedStatModifiers: [] as Array<{ statId: string; amount: number; operation: string }>,
    skillModifiers: [] as Array<{ skillId: string; amount: number; operation: string }>,
    rdModifiers: [] as Array<{ skillId?: string; amount: number; operation: string }>,
    rollModifiers: [] as Array<{ rollType?: string; amount: number; operation: string }>,
  };

  const evalCtx: ConditionEvaluationContext = {
    entity,
    participant,
    world,
    signals,
    attackTags,
  };

  for (const { elementId, behavior } of ownedBehaviors) {
    if (behavior.mode !== "continuous") continue;

    // Check conditions
    const conditionsPassed = evaluateMechanicalConditions(
      behavior.conditions,
      behavior.conditionLogic,
      { ...evalCtx, elementId, behaviorId: behavior.id }
    );
    if (!conditionsPassed) continue;

    // Collect continuous effects
    for (const effect of behavior.effects) {
      result.effects.push(effect as any);

      if (effect.type === "cost_modifier") {
        result.costModifiers.push({
          scopeId: effect.scopeId ?? "all",
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "incoming_damage_modifier") {
        result.incomingDamageModifiers.push({
          tagFilter: effect.tagFilter,
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "incoming_healing_modifier") {
        result.incomingHealingModifiers.push({
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "attribute_modifier") {
        result.attributeModifiers.push({
          attributeId: effect.attributeId,
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "derived_stat_modifier") {
        result.derivedStatModifiers.push({
          statId: effect.statId,
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "skill_modifier") {
        result.skillModifiers.push({
          skillId: effect.skillId,
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "rd_modifier") {
        result.rdModifiers.push({
          skillId: effect.skillId,
          amount: effect.amount,
          operation: effect.operation,
        });
      } else if (effect.type === "roll_modifier") {
        result.rollModifiers.push({
          rollType: effect.rollType,
          amount: effect.amount,
          operation: effect.operation,
        });
      }
    }
  }

  return result;
}

// ============================================================================
// 14. EJECUCIÓN GENÉRICA DE COMPORTAMIENTOS ACTIVOS Y REACTIVOS
// ============================================================================

export interface IncomingEffectContext {
  effect: MechanicalEffectItem;
  sourceEntityId: string;
  targetEntityId: string;
  relationship: "self" | "ally" | "enemy";
  isSupport: boolean;
  blocked?: boolean;
  blockedReason?: string;
}

export type InterceptIncomingEffectFn = (
  ctx: IncomingEffectContext,
  world: RuleWorld,
  encounter: EncounterRuntimeState
) => { blocked: boolean; blockedReason?: string; newWorld?: RuleWorld; newEncounter?: EncounterRuntimeState };

export interface ExecuteBehaviorOptions {
  behavior: MechanicalBehavior;
  elementId?: string;
  sourceEntityId: string;
  targetEntityId?: string;
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  event?: MechanicalEvent;
  rollResult?: number;
  dice?: number[];
  signals?: string[];
  attackTags?: string[];
  useException?: boolean;
  targetOwnedBehaviors?: Array<{ elementId: string; behavior: MechanicalBehavior }>;
  interceptIncomingEffect?: InterceptIncomingEffectFn;
}

export interface ExecuteBehaviorResult {
  success: boolean;
  reasons?: string[];
  newWorld: RuleWorld;
  newEncounter: EncounterRuntimeState;
  appliedEffects: MechanicalEffectItem[];
  resolution?: ResolutionResult;
  emittedEvents: MechanicalEvent[];
}

export function executeMechanicalBehavior(options: ExecuteBehaviorOptions): ExecuteBehaviorResult {
  const {
    behavior,
    elementId,
    sourceEntityId,
    targetEntityId = sourceEntityId,
    world,
    encounter,
    event,
    rollResult,
    dice,
    signals,
    attackTags,
    useException = false,
    targetOwnedBehaviors,
    interceptIncomingEffect,
  } = options;

  let newWorld = structuredClone(world);
  let newEncounter = structuredClone(encounter);

  const sourceEntity = newWorld[sourceEntityId];
  if (!sourceEntity) {
    return {
      success: false,
      reasons: [`Source entity not found: ${sourceEntityId}`],
      newWorld,
      newEncounter,
      appliedEffects: [],
      emittedEvents: [],
    };
  }

  const participant = getOrCreateParticipantState(newEncounter, sourceEntityId);

  // Anti-loop / duplicate execution check on same event
  if (event) {
    const execKey = `${behavior.id}:${event.id}`;
    if (participant.executedBehaviorEvents.includes(execKey)) {
      return {
        success: false,
        reasons: ["Behavior already executed for this event"],
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
  }

  const evalCtx: ConditionEvaluationContext = {
    entity: sourceEntity,
    participant,
    world: newWorld,
    event,
    rollResult,
    dice,
    signals,
    attackTags,
  };

  // 1. Evaluate conditions
  let conditionsPassed = evaluateMechanicalConditions(
    behavior.conditions,
    behavior.conditionLogic,
    evalCtx
  );

  // 2. Evaluate limitations
  let limitationResult = checkLimitations(
    behavior,
    participant,
    sourceEntity,
    newEncounter.turn
  );

  // Check exception if condition or limitation failed
  if (!conditionsPassed || !limitationResult.passed) {
    const exception = behavior.control?.exception;
    if (useException && exception && exception.allowWhenRequirementFailed) {
      const costRes = (exception.costResource ?? "ES") as "SA" | "ES";
      const costAmt = exception.costAmount ?? 0;
      if (sourceEntity.resources[costRes].current >= costAmt) {
        sourceEntity.resources[costRes].current -= costAmt;
        if (costRes === "ES") participant.esSpentThisTurn += costAmt;
        else participant.hpLostThisTurn += costAmt;
        conditionsPassed = true;
        limitationResult = { passed: true };
      } else {
        return {
          success: false,
          reasons: [`Insufficient resource for exception: ${costRes} < ${costAmt}`],
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else {
      return {
        success: false,
        reasons: !conditionsPassed ? ["Conditions not met"] : ["Limitations violated"],
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
  }

  // 3. Resolution (automatic, roll, rd, manual)
  let resolutionResult: ResolutionResult | undefined;
  let effectsToExecute: MechanicalEffectItem[] = [...behavior.effects];

  if (behavior.resolution) {
    if (behavior.resolution.type === "rd") {
      const diff = behavior.resolution.difficulty ?? 12;
      const roll = rollResult ?? 10;
      resolutionResult = resolveOutcomesForRoll(roll, diff, behavior.resolution.outcomes);
      // Append branch effects
      effectsToExecute.push(...resolutionResult.effectsToApply);
    } else if (behavior.resolution.type === "roll") {
      const diff = behavior.resolution.difficulty ?? 10;
      const roll = rollResult ?? 10;
      resolutionResult = resolveOutcomesForRoll(roll, diff, behavior.resolution.outcomes);
      effectsToExecute.push(...resolutionResult.effectsToApply);
    }
  }

  // 4. Apply Effects
  const appliedEffects: MechanicalEffectItem[] = [];
  const emittedEvents: MechanicalEvent[] = [];

  for (const eff of effectsToExecute) {
    appliedEffects.push(eff);

    // Resolve target: if effect specifies target: 'self', apply to sourceEntityId
    const targetKind = eff.target?.type ?? behavior.target?.type ?? "self";
    const actualTargetId = targetKind === "self" ? sourceEntityId : targetEntityId;
    const actualTarget = newWorld[actualTargetId];

    // Check temporality: if duration is pending (until_next_use, until_next_roll, until_turn_end)
    const temporality = eff.temporality ?? behavior.temporality;
    const durationType = temporality?.duration?.type ?? "instant";

    if (durationType === "until_next_use" || durationType === "until_next_roll" || durationType === "until_turn_end") {
      if (eff.type === "cost_modifier") {
        participant.pendingModifiers.push({
          id: `${eff.id}_${Date.now()}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          scope: eff.scopeId ?? "all",
          type: "cost",
          amount: eff.amount,
          operation: eff.operation,
          duration: durationType,
        });
        continue;
      }
      if (eff.type === "roll_modifier" || eff.type === "penalty" || eff.type === "bonus") {
        participant.pendingModifiers.push({
          id: `${eff.id}_${Date.now()}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          scope: eff.type === "roll_modifier" ? (eff.rollType ?? "action_roll") : "all",
          type: "roll",
          amount: eff.type === "penalty" ? -Math.abs(eff.amount) : eff.amount,
          operation: eff.operation,
          duration: durationType,
        });
        continue;
      }
      if (eff.type === "incoming_damage_modifier" || eff.type === "outgoing_damage_modifier") {
        participant.pendingModifiers.push({
          id: `${eff.id}_${Date.now()}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          scope: "damage",
          type: "damage",
          tagFilter: (eff as any).tagFilter,
          amount: eff.amount,
          operation: eff.operation,
          duration: durationType,
        });
        continue;
      }
    }

    // Helper for incoming effect interception on target
    const evaluateTargetInterception = (
      targetId: string,
      effectToApply: MechanicalEffectItem
    ): { blocked: boolean; blockedReason?: string } => {
      const isSelf = sourceEntityId === targetId;
      const rel: "self" | "ally" | "enemy" = isSelf
        ? "self"
        : sourceEntity?.faction && newWorld[targetId]?.faction && sourceEntity.faction === newWorld[targetId].faction
        ? "ally"
        : "ally";

      const tags = attackTags ?? (event?.payload?.tags as string[] | undefined) ?? [];
      const isSupport =
        tags.includes("support") ||
        effectToApply.type === "healing" ||
        effectToApply.type === "barrier" ||
        (effectToApply.type === "status_apply" && tags.includes("support"));

      const incomingCtx: IncomingEffectContext = {
        effect: effectToApply,
        sourceEntityId,
        targetEntityId: targetId,
        relationship: rel,
        isSupport,
        blocked: false,
      };

      if (interceptIncomingEffect) {
        const customRes = interceptIncomingEffect(incomingCtx, newWorld, newEncounter);
        if (customRes.newWorld) newWorld = customRes.newWorld;
        if (customRes.newEncounter) newEncounter = customRes.newEncounter;
        if (customRes.blocked) {
          return { blocked: true, blockedReason: customRes.blockedReason };
        }
      }

      if (targetOwnedBehaviors && targetOwnedBehaviors.length > 0 && isSupport && !isSelf) {
        const targetParticipant = getOrCreateParticipantState(newEncounter, targetId);
        const actionKey = event?.id ?? `action_${sourceEntityId}_turn_${newEncounter.turn}`;

        for (const { behavior: targetB } of targetOwnedBehaviors) {
          if (targetB.mode !== "reactive") continue;
          const matchesKind =
            targetB.trigger?.kind === "receive_healing" ||
            targetB.trigger?.kind === "receive_barrier" ||
            targetB.trigger?.kind === "receive_support";
          if (!matchesKind) continue;

          const hasSupportTagCond = (targetB.conditions ?? []).some(
            (c) => c.type === "tag" && c.tag === "support"
          );
          if (hasSupportTagCond && !isSupport) continue;

          if (targetB.resolution?.type === "rd") {
            const actionExecKey = `${targetB.id}:${actionKey}`;
            const actionExecResultKey = `${actionExecKey}:blocked`;
            if (!targetParticipant.executedBehaviorEvents.includes(actionExecKey)) {
              const diff = targetB.resolution.difficulty ?? 12;
              const roll = rollResult ?? 10;
              const resOutcomes = resolveOutcomesForRoll(roll, diff, targetB.resolution.outcomes);
              targetParticipant.executedBehaviorEvents.push(actionExecKey);

              const hasBlock = resOutcomes.effectsToApply.some(
                (e: any) =>
                  e.type === "effect_block" ||
                  e.type === "action_block" ||
                  (e.type === "incoming_healing_modifier" && e.amount < 0)
              );
              if (hasBlock) {
                targetParticipant.executedBehaviorEvents.push(actionExecResultKey);
                return { blocked: true, blockedReason: `${targetB.name ?? targetB.id} rejected support` };
              }
            } else {
              if (targetParticipant.executedBehaviorEvents.includes(actionExecResultKey)) {
                return { blocked: true, blockedReason: `${targetB.name ?? targetB.id} rejected support` };
              }
            }
          }
        }
      }

      return { blocked: false };
    };

    // Pre-application interception check on actualTargetId
    const interception = evaluateTargetInterception(actualTargetId, eff);
    if (interception.blocked) {
      newEncounter.traceLog.push({
        timestamp: Date.now(),
        turn: newEncounter.turn,
        behaviorId: behavior.id,
        behaviorName: behavior.name,
        mode: behavior.mode,
        eventId: event?.id,
        conditionsPassed: true,
        limitationsPassed: true,
        appliedEffects: [`blocked:${eff.type}`],
      });
      continue;
    }

    switch (eff.type) {
      case "damage": {
        let baseDmg = 4;
        const formula = (eff as any).formula ?? (eff as any).magnitude?.formula ?? eff.dice;
        if (event?.payload?.rolls && eff.id && event.payload.rolls[eff.id]) {
          const r = event.payload.rolls[eff.id];
          baseDmg = Array.isArray(r) ? r.reduce((s: number, d: number) => s + d, 0) : Number(r);
        } else if (typeof (eff as any).amount === "number") {
          baseDmg = (eff as any).amount;
        } else if (typeof formula === "string") {
          const match = /^(\d+)[dD](\d+)$/.exec(formula.trim());
          if (match) {
            baseDmg = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
          } else {
            baseDmg = parseInt(formula, 10) || 4;
          }
        } else if (rollResult !== undefined) {
          baseDmg = rollResult;
        }

        if (actualTarget) {
          const res = processDamagePipeline({
            baseDamage: baseDmg,
            attackerId: sourceEntityId,
            targetId: actualTargetId,
            tags: attackTags,
            world: newWorld,
            encounter: newEncounter,
          });
          newWorld = res.newWorld;
        }
        break;
      }

      case "healing": {
        if (actualTarget) {
          let baseHealing = eff.amount ?? 0;
          const isDice = (eff as any).magnitude?.kind === "dice" || (eff as any).kind === "dice" || Boolean((eff as any).dice) || Boolean((eff as any).formula);
          if (isDice) {
            const formula = (eff as any).magnitude?.formula ?? (eff as any).formula ?? (eff as any).dice;
            if (rollResult !== undefined) {
              baseHealing = rollResult;
            } else if (dice && dice.length > 0) {
              baseHealing = dice.reduce((s, d) => s + d, 0);
            } else if (event?.payload?.rolls && eff.id && event.payload.rolls[eff.id]) {
              const r = event.payload.rolls[eff.id];
              baseHealing = Array.isArray(r) ? r.reduce((s: number, d: number) => s + d, 0) : Number(r);
            } else {
              const match = /^(\d+)[dD](\d+)$/.exec(formula);
              if (match) {
                baseHealing = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
              }
            }
          } else {
            baseHealing = (eff as any).magnitude?.amount ?? eff.amount ?? 0;
          }
          const res = processHealingPipeline({
            baseHealing,
            resourceId: eff.resourceId,
            healerId: sourceEntityId,
            targetId: actualTargetId,
            world: newWorld,
            encounter: newEncounter,
          });
          newWorld = res.newWorld;
        }
        break;
      }

      case "barrier": {
        if (actualTarget) {
          actualTarget.barrier += eff.amount;
        }
        break;
      }

      case "status_apply": {
        if (actualTarget) {
          actualTarget.statuses.push({
            sourceId: behavior.id,
            statusElementId: eff.statusElementId,
            expiresAt: eff.turns ? newEncounter.turn + eff.turns : undefined,
          });
        }
        break;
      }

      case "status_remove": {
        if (actualTarget) {
          actualTarget.statuses = actualTarget.statuses.filter(
            (s) => s.statusElementId !== eff.statusElementId
          );
        }
        break;
      }

      case "resource_modifier": {
        if (actualTarget) {
          const res = actualTarget.resources[eff.resourceId as "SA" | "ES"];
          if (res) {
            const op = eff.operation ?? "add";
            res.current = applyModifierMath(res.current, [{ operation: op, amount: eff.amount }]);
          }
        }
        break;
      }

      case "counter_modifier": {
        const cKey = makeCounterKey(sourceEntityId, elementId, behavior.id, eff.counterId);
        const val = eff.value ?? 1;
        const op = eff.operation ?? "increment";
        const newVal = mutateCounter(participant, cKey, op, val);
        participant.activeCounters[cKey] = newVal;
        participant.activeCounters[eff.counterId] = newVal;
        break;
      }

      case "inventory_consume": {
        const qty = sourceEntity.inventory[eff.elementId] ?? 0;
        sourceEntity.inventory[eff.elementId] = Math.max(0, qty - eff.quantity);
        break;
      }

      case "action_block": {
        if (!participant.actionBlocks) participant.actionBlocks = [];
        participant.actionBlocks.push({
          blockedAction: eff.blockedAction ?? "all",
          turnsRemaining: eff.duration ?? 1,
        });
        break;
      }

      case "turn_loss": {
        participant.turnLoss = (participant.turnLoss ?? 0) + (eff.turns ?? 1);
        participant.activeTimedEffects.push({
          id: `${eff.id}_${Date.now()}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          effect: eff,
          temporality: { duration: { type: "turns", turns: eff.turns } },
          remainingTurns: eff.turns,
          targetEntityId: actualTargetId,
        });
        break;
      }

      case "transformation": {
        const effectiveTemp = resolveEffectiveTemporality(eff, behavior);
        const durationType = effectiveTemp?.duration?.type;
        const turns = effectiveTemp?.duration?.turns ?? (durationType === "turns" ? 1 : undefined);
        const expiresAtTurn = turns !== undefined ? newEncounter.turn + turns : undefined;

        const targetPart = newEncounter.participants[actualTargetId] ?? participant;
        if (!targetPart.activeTimedEffects) {
          targetPart.activeTimedEffects = [];
        }

        targetPart.activeTimedEffects.push({
          id: `${eff.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          effect: eff,
          temporality: effectiveTemp ?? { duration: { type: "turns", turns: 1 } },
          remainingTurns: turns,
          expiresAtTurn,
          targetEntityId: actualTargetId,
        });
        break;
      }

      default:
        break;
    }
  }

  // 5. Update Limitations & Cooldowns
  for (const lim of behavior.limitations ?? []) {
    if (lim.type === "cooldown") {
      participant.cooldowns[behavior.id] = newEncounter.turn + lim.turns + 1;
    } else if (lim.type === "usage_limit") {
      const key = `${lim.period}:current:${behavior.id}`;
      participant.usageCounters[key] = (participant.usageCounters[key] ?? 0) + 1;
    }
  }

  // 6. Update Control Counters (counter configuration)
  if (behavior.control?.counter) {
    const cConf = behavior.control.counter;
    const cKey = makeCounterKey(sourceEntityId, elementId, behavior.id, cConf.id);
    const inc = cConf.incrementOnTrigger ?? 1;
    const newVal = mutateCounter(participant, cKey, "increment", inc, cConf.cap, cConf.initialValue ?? 0);

    // Check accumulation threshold
    if (behavior.control.accumulation) {
      const accum = behavior.control.accumulation;
      if (newVal >= accum.threshold) {
        if (accum.resetOnThreshold) {
          participant.activeCounters[cKey] = cConf.initialValue ?? 0;
        }
      }
    }
  }

  // Mark event as executed
  if (event) {
    participant.executedBehaviorEvents.push(`${behavior.id}:${event.id}`);
  }

  // Record trace
  newEncounter.traceLog.push({
    timestamp: Date.now(),
    turn: newEncounter.turn,
    behaviorId: behavior.id,
    behaviorName: behavior.name,
    mode: behavior.mode,
    eventId: event?.id,
    conditionsPassed: true,
    limitationsPassed: true,
    appliedEffects: appliedEffects.map((e) => e.type),
  });

  return {
    success: true,
    newWorld,
    newEncounter,
    appliedEffects,
    resolution: resolutionResult,
    emittedEvents,
  };
}

// ============================================================================
// 15. DESPACHO DE EVENTOS REACTIVOS (dispatchMechanicalEvent)
// ============================================================================

export interface DispatchEventOptions {
  event: MechanicalEvent | { kind?: string; type?: string; sourceEntityId?: string; targetEntityId?: string; payload?: Record<string, unknown> };
  ownedBehaviorsByEntity?: Record<string, OwnedBehaviorEntry[]>;
  ownedBehaviors?: OwnedBehaviorEntry[];
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  rollResult?: number;
  dice?: [number, number] | number[];
  signals?: string[];
  attackTags?: string[];
}

export interface DispatchEventResult {
  event: MechanicalEvent;
  executedBehaviors: Array<{ behaviorId: string; success: boolean }>;
  appliedEffects: any[];
  newWorld: RuleWorld;
  newEncounter: EncounterRuntimeState;
}

export function dispatchMechanicalEvent(options: DispatchEventOptions): DispatchEventResult {
  const { event, world, encounter } = options;

  let currentWorld = structuredClone(world);
  let currentEncounter = structuredClone(encounter);
  const executedBehaviors: Array<{ behaviorId: string; success: boolean }> = [];
  const appliedEffects: any[] = [];

  const eventKind = (event as any).kind ?? (event as any).type ?? 'custom';
  const eventObj: MechanicalEvent = {
    id: (event as any).id ?? `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: eventKind,
    sourceEntityId: event.sourceEntityId,
    targetEntityId: event.targetEntityId,
    timestamp: (event as any).timestamp ?? Date.now(),
    payload: event.payload ?? {},
  };

  const ownedBehaviorsByEntity: Record<string, OwnedBehaviorEntry[]> =
    options.ownedBehaviorsByEntity ??
    (options.ownedBehaviors
      ? {
          ...(event.sourceEntityId ? { [event.sourceEntityId]: options.ownedBehaviors } : {}),
          ...(event.targetEntityId ? { [event.targetEntityId]: options.ownedBehaviors } : {}),
          hero: options.ownedBehaviors,
        }
      : {});

  // Log event
  if (!currentEncounter.eventLog) currentEncounter.eventLog = [];
  if (!currentEncounter.traceLog) currentEncounter.traceLog = [];
  currentEncounter.eventLog.push(eventObj);

  // Entities to inspect: target first, then source
  const entitiesToCheck = new Set<string>();
  if (event.targetEntityId) entitiesToCheck.add(event.targetEntityId);
  if (event.sourceEntityId) entitiesToCheck.add(event.sourceEntityId);
  if (entitiesToCheck.size === 0) entitiesToCheck.add('hero');

  for (const entityId of entitiesToCheck) {
    const list = ownedBehaviorsByEntity[entityId] ?? [];

    for (const { elementId, behavior } of list) {
      if (behavior.mode !== "reactive" || !behavior.trigger) continue;

      // Match trigger kind
      if (behavior.trigger.kind !== eventKind && behavior.trigger.kind !== (event as any).kind && behavior.trigger.kind !== (event as any).type) {
        continue;
      }

      // Execute behavior against event
      const res = executeMechanicalBehavior({
        behavior: behavior as any,
        elementId,
        sourceEntityId: entityId,
        targetEntityId: event.targetEntityId ?? entityId,
        world: currentWorld,
        encounter: currentEncounter,
        event: eventObj,
        rollResult: options.rollResult ?? (event.payload?.rollResult as number | undefined),
        dice: options.dice ?? (event.payload?.dice as number[] | undefined),
        attackTags: options.attackTags ?? (event.payload?.tags as string[] | undefined) ?? (event.payload?.tag ? [event.payload.tag as string] : undefined),
        signals: options.signals,
        targetOwnedBehaviors: event.targetEntityId ? (ownedBehaviorsByEntity[event.targetEntityId] ?? []) : undefined,
      });

      if (res.success) {
        currentWorld = res.newWorld;
        currentEncounter = res.newEncounter;
        appliedEffects.push(...res.appliedEffects);
        executedBehaviors.push({ behaviorId: behavior.id, success: true });
      }
    }
  }

  return {
    event: eventObj,
    executedBehaviors,
    appliedEffects,
    newWorld: currentWorld,
    newEncounter: currentEncounter,
  };
}

// ============================================================================
// 12. ESTRATEGIA DE COEXISTENCIA Y PRECEDENCIA LEGACY
// ============================================================================

/**
 * Determina si un elemento del sistema debe evaluarse con el nuevo runtime
 * de MechanicalBehavior o delegarse al motor legacy (AppliedMechanicReference / executeRuleSet).
 * 
 * Regla de Precedencia:
 * Si el elemento contiene `mechanicalBehaviors` con al menos una entrada, el runtime
 * nuevo toma precedencia absoluta y procesa la mecánica, ignorando effects legacy
 * para evitar la duplicación de efectos. Si no posee `mechanicalBehaviors`, el motor
 * legacy continúa operando sin alteraciones.
 */
export function shouldUseMechanicalBehaviorRuntime(element: {
  mechanicalBehaviors?: unknown;
  effects?: unknown;
}): boolean {
  return Array.isArray(element.mechanicalBehaviors) && element.mechanicalBehaviors.length > 0;
}

// ============================================================================
// 13. CONECTORES DE HIDRATACIÓN Y PARTICIPANTES
// ============================================================================

/**
 * Resuelve y extrae todos los MechanicalBehaviors de un personaje a partir de sus
 * elementos asignados (posesiones hidratadas) o de un catálogo de elementos provisto.
 * 
 * Cumple con la regla de coexistencia: solo extrae behaviors si el elemento contiene
 * `mechanicalBehaviors` con al menos una entrada (shouldUseMechanicalBehaviorRuntime).
 */
export function resolveCharacterMechanicalBehaviors(
  character: {
    id?: string | number;
    profileData?: Record<string, any>;
    possessions?: Array<{
      possession?: { elementId?: string; quantity?: number };
      element?: { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown };
      [key: string]: unknown;
    }>;
  },
  catalogElements: Array<{ id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }> = []
): OwnedBehaviorEntry[] {
  const catalogMap = new Map<string, { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }>();
  for (const el of catalogElements) {
    if (el?.id) catalogMap.set(el.id, el);
  }

  const resolvedElementsMap = new Map<string, { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }>();

  // 1. Elementos directos de possessions (relational ORM load)
  if (Array.isArray(character.possessions)) {
    for (const p of character.possessions) {
      if (p.element?.id) {
        resolvedElementsMap.set(p.element.id, p.element);
      } else if (p.possession?.elementId && catalogMap.has(p.possession.elementId)) {
        resolvedElementsMap.set(p.possession.elementId, catalogMap.get(p.possession.elementId)!);
      }
    }
  }

  // 2. Elementos referenciados en profileData
  const profile = character.profileData ?? {};
  const refIds: string[] = [];

  const addIds = (list: unknown) => {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && item.trim()) refIds.push(item.trim());
        else if (item && typeof item === "object" && "id" in item && typeof (item as any).id === "string") {
          refIds.push((item as any).id);
        }
      }
    }
  };

  addIds(profile.traits);
  addIds(profile.weaknesses);
  addIds(profile.techniques);
  addIds(profile.tecnicas);
  addIds(profile.skills);
  addIds(profile.habilidades);
  addIds(profile.inventory);
  addIds(profile.inventario);

  for (const id of refIds) {
    if (!resolvedElementsMap.has(id) && catalogMap.has(id)) {
      resolvedElementsMap.set(id, catalogMap.get(id)!);
    }
  }

  // 3. Extraer behaviors de elementos que usan el nuevo runtime
  const ownedBehaviors: OwnedBehaviorEntry[] = [];

  for (const element of resolvedElementsMap.values()) {
    if (!shouldUseMechanicalBehaviorRuntime(element)) continue;

    const behaviors = element.mechanicalBehaviors as MechanicalBehavior[];
    for (const behavior of behaviors) {
      if (behavior && typeof behavior === "object" && "id" in behavior) {
        ownedBehaviors.push({
          elementId: element.id,
          behavior,
        });
      }
    }
  }

  return ownedBehaviors;
}

/**
 * Separa los elementos asignados a un personaje entre los que deben evaluarse
 * mediante el nuevo runtime de MechanicalBehavior y los que permanecen en el motor legacy.
 */
export function partitionCharacterElements(
  character: {
    id?: string | number;
    profileData?: Record<string, any>;
    possessions?: Array<{
      possession?: { elementId?: string; quantity?: number };
      element?: { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown };
      [key: string]: unknown;
    }>;
  },
  catalogElements: Array<{ id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }> = []
): {
  newElements: Array<{ id: string; mechanicalBehaviors: MechanicalBehavior[]; [key: string]: unknown }>;
  legacyElements: Array<{ id: string; effects: unknown[]; [key: string]: unknown }>;
} {
  const catalogMap = new Map<string, { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }>();
  for (const el of catalogElements) {
    if (el?.id) catalogMap.set(el.id, el);
  }

  const resolvedMap = new Map<string, { id: string; mechanicalBehaviors?: unknown; effects?: unknown; [key: string]: unknown }>();

  if (Array.isArray(character.possessions)) {
    for (const p of character.possessions) {
      if (p.element?.id) {
        resolvedMap.set(p.element.id, p.element);
      } else if (p.possession?.elementId && catalogMap.has(p.possession.elementId)) {
        resolvedMap.set(p.possession.elementId, catalogMap.get(p.possession.elementId)!);
      }
    }
  }

  const profile = character.profileData ?? {};
  const refIds: string[] = [];
  const addIds = (list: unknown) => {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === "string" && item.trim()) refIds.push(item.trim());
        else if (item && typeof item === "object" && "id" in item && typeof (item as any).id === "string") {
          refIds.push((item as any).id);
        }
      }
    }
  };
  addIds(profile.traits);
  addIds(profile.weaknesses);
  addIds(profile.techniques);
  addIds(profile.tecnicas);
  addIds(profile.skills);
  addIds(profile.habilidades);
  addIds(profile.inventory);
  addIds(profile.inventario);

  for (const id of refIds) {
    if (!resolvedMap.has(id) && catalogMap.has(id)) {
      resolvedMap.set(id, catalogMap.get(id)!);
    }
  }

  const newElements: Array<{ id: string; mechanicalBehaviors: MechanicalBehavior[]; [key: string]: unknown }> = [];
  const legacyElements: Array<{ id: string; effects: unknown[]; [key: string]: unknown }> = [];

  for (const el of resolvedMap.values()) {
    if (shouldUseMechanicalBehaviorRuntime(el)) {
      newElements.push(el as { id: string; mechanicalBehaviors: MechanicalBehavior[]; [key: string]: unknown });
    } else {
      legacyElements.push(el as { id: string; effects: unknown[]; [key: string]: unknown });
    }
  }

  return { newElements, legacyElements };
}

/**
 * Construye el estado canónico `RuleEntityState` para un participante de combate
 * a partir de los datos hidratados de un personaje (perfil, atributos, SA, ES e inventario).
 */
export function buildCharacterRuleEntityState(
  character: {
    id?: string | number;
    profileData?: Record<string, any>;
    possessions?: Array<{
      possession?: { elementId?: string; quantity?: number };
      element?: { id: string; [key: string]: unknown };
      [key: string]: unknown;
    }>;
  },
  initialOverrides?: Partial<RuleEntityState>
): RuleEntityState {
  const profile = character.profileData ?? {};

  const attributes: Record<string, number> = {
    FUE: Number(profile.FUE || profile.fue || profile.fuerza || 0),
    DES: Number(profile.DES || profile.des || profile.destreza || 0),
    RES: Number(profile.RES || profile.res || profile.resistencia || 0),
    INT: Number(profile.INT || profile.int || profile.inteligencia || 0),
    VOL: Number(profile.VOL || profile.vol || profile.voluntad || 0),
    VEL: Number(profile.VEL || profile.vel || profile.velocidad || 0),
  };

  const saCurrent = Number(profile.salud_actual ?? profile.SA?.current ?? 20);
  const saMax = Number(profile.salud_maxima ?? profile.SA?.max ?? saCurrent);
  const esCurrent = Number(profile.estamina_actual ?? profile.ES?.current ?? 20);
  const esMax = Number(profile.estamina_maxima ?? profile.ES?.max ?? esCurrent);

  const inventory: Record<string, number> = {};
  const equippedItems: Record<string, boolean> = {};
  if (Array.isArray(character.possessions)) {
    for (const p of character.possessions) {
      const elemId = p.element?.id || p.possession?.elementId || p.elementId || p.id;
      const qty = p.possession?.quantity ?? p.quantity ?? 1;
      const isEquipped = p.possession?.equipped ?? p.equipped ?? false;
      if (elemId) {
        inventory[elemId] = (inventory[elemId] || 0) + qty;
        if (isEquipped) {
          equippedItems[elemId] = true;
        }
      }
    }
  }

  const baseState: RuleEntityState = {
    resources: {
      SA: { current: saCurrent, max: saMax },
      ES: { current: esCurrent, max: esMax },
    },
    attributes,
    barrier: Number(profile.barrera ?? 0),
    modifiers: [],
    statuses: [],
    inventory,
    equippedItems,
  };

  if (initialOverrides) {
    return {
      ...baseState,
      ...initialOverrides,
      resources: {
        SA: { ...baseState.resources.SA, ...(initialOverrides.resources?.SA || {}) },
        ES: { ...baseState.resources.ES, ...(initialOverrides.resources?.ES || {}) },
      },
      attributes: {
        ...baseState.attributes,
        ...(initialOverrides.attributes || {}),
      },
      inventory: {
        ...baseState.inventory,
        ...(initialOverrides.inventory || {}),
      },
      equippedItems: {
        ...baseState.equippedItems,
        ...(initialOverrides.equippedItems || {}),
      },
    };
  }

  return baseState;
}

// ============================================================================
// 19. INITIATIVE RESOLUTION (calculateBaseInitiative & calculateCombatInitiative)
// ============================================================================

/**
 * Calculates the canonical base initiative from INT and VEL attributes.
 * Formula: Math.floor(Math.floor((INT + VEL) / 2) / 2)
 */
export function calculateBaseInitiative(int: number = 0, vel: number = 0): number {
  return Math.floor(Math.floor(((int || 0) + (vel || 0)) / 2) / 2);
}

export interface CalculateCombatInitiativeOptions {
  entity: RuleEntityState;
  participant?: ParticipantRuntimeState;
  ownedBehaviors?: OwnedBehaviorEntry[];
  encounter?: EncounterRuntimeState;
  world?: RuleWorld;
  signals?: string[];
  diceRoll?: number;
  baseIni?: number;
}

export interface CombatInitiativeResult {
  baseIni: number;
  contextualModifier: number;
  diceRoll: number;
  total: number;
}

/**
 * Resolves combat initiative for an entity within an encounter.
 * 
 * Rules:
 * - baseIni comes from options.baseIni or calculateBaseInitiative(INT, VEL)
 * - If encounter.turn === 1, the contextual signal 'first_turn' is supplied to evaluate
 *   first-turn-specific modifiers (e.g. Reflejos Rápidos)
 * - At encounter.turn >= 2, 'first_turn' is not supplied
 * - All active derived_stat_modifier effects targeting 'ini' are summed
 * - Total = baseIni + contextualModifier + diceRoll
 */
export function calculateCombatInitiative(
  options: CalculateCombatInitiativeOptions
): CombatInitiativeResult {
  const { entity, encounter, world } = options;

  // 1. Base initiative from explicit option or derived from entity attributes
  const int = entity.attributes?.INT ?? entity.attributes?.int ?? 0;
  const vel = entity.attributes?.VEL ?? entity.attributes?.vel ?? 0;
  const baseIni = options.baseIni ?? calculateBaseInitiative(int, vel);

  // 2. Prepare contextual signals specifically for initiative resolution
  // At encounter.turn === 1, inject 'first_turn'. At encounter.turn >= 2, exclude 'first_turn'.
  const rawSignals = options.signals ?? [];
  const effectiveSignals = rawSignals.filter((s) =>
    encounter && encounter.turn >= 2 ? s !== "first_turn" : true
  );
  if (encounter && encounter.turn === 1) {
    if (!effectiveSignals.includes("first_turn")) {
      effectiveSignals.push("first_turn");
    }
  }

  // 3. Resolve participant state
  const participant =
    options.participant ??
    (entity.id && encounter?.participants[entity.id]
      ? encounter.participants[entity.id]
      : createParticipantRuntimeState(entity.id ?? "entity"));

  // 4. Evaluate continuous modifiers with the contextual signals
  const continuousMods = getActiveContinuousModifiers(
    options.ownedBehaviors ?? [],
    entity,
    participant,
    world,
    effectiveSignals
  );

  // 5. Sum all active derived_stat_modifier targeting 'ini'
  let contextualModifier = 0;
  for (const mod of continuousMods.derivedStatModifiers) {
    const stat = (mod.statId || "").trim().toLowerCase();
    if (stat === "ini" || stat === "iniciativa" || stat === "initiative") {
      if (mod.operation === "subtract") {
        contextualModifier -= mod.amount;
      } else {
        contextualModifier += mod.amount;
      }
    }
  }

  // 6. Final sum with dice contribution
  const diceRoll = options.diceRoll ?? 0;
  const total = baseIni + contextualModifier + diceRoll;

  return {
    baseIni,
    contextualModifier,
    diceRoll,
    total,
  };
}

// ============================================================================
// 19. EJECUCIÓN MULTI-OBJETIVO (executeMultiTargetBehavior)
// ============================================================================

/**
 * Resolves the relationship of a target entity relative to a source entity.
 * Uses explicit faction tags from RuleEntityState.
 * Returns 'self' if IDs match.
 * Returns 'ally' if both have matching factions.
 * Returns 'enemy' if both have differing factions.
 * Returns 'unknown' if either entity is missing or lacks a faction.
 */
export function resolveEntityRelationship(
  sourceEntityId: string,
  targetEntityId: string,
  world: RuleWorld
): "self" | "ally" | "enemy" | "unknown" {
  if (sourceEntityId === targetEntityId) {
    return "self";
  }
  const source = world[sourceEntityId];
  const target = world[targetEntityId];
  if (!source || !target) {
    return "unknown";
  }
  if (source.faction && target.faction) {
    return source.faction === target.faction ? "ally" : "enemy";
  }
  return "unknown";
}

export interface ExecuteMultiTargetBehaviorOptions {
  behavior: MechanicalBehavior;
  elementId?: string;
  sourceEntityId: string;
  targetEntityIds: string[];
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  event?: MechanicalEvent;
  rollResult?: number;
  dice?: number[];
  signals?: string[];
  attackTags?: string[];
  useException?: boolean;
  targetOwnedBehaviors?:
    | Record<string, Array<{ elementId: string; behavior: MechanicalBehavior }>>
    | Array<{ elementId: string; behavior: MechanicalBehavior }>;
  interceptIncomingEffect?: InterceptIncomingEffectFn;
}

export interface TargetExecutionResult {
  targetEntityId: string;
  appliedEffects: MechanicalEffectItem[];
  blockedEffects: string[];
  actualAmountCredited?: number;
}

export interface ExecuteMultiTargetBehaviorResult {
  success: boolean;
  reasons?: string[];
  normalizedTargetIds: string[];
  targetResults: Record<string, TargetExecutionResult>;
  usageConsumed: boolean;
  newWorld: RuleWorld;
  newEncounter: EncounterRuntimeState;
  appliedEffects: MechanicalEffectItem[];
  resolution?: ResolutionResult;
  emittedEvents: MechanicalEvent[];
}

/**
 * Executes a mechanical behavior across multiple targets as a single action.
 * Evaluates conditions and usage limitations once at the action level.
 * Validates target quantity and relationship constraints atomically before applying effects.
 * Consumes usage counters exactly once upon successful execution.
 */
export function executeMultiTargetBehavior(
  options: ExecuteMultiTargetBehaviorOptions
): ExecuteMultiTargetBehaviorResult {
  const {
    behavior,
    elementId,
    sourceEntityId,
    targetEntityIds,
    world,
    encounter,
    event,
    rollResult,
    dice,
    signals,
    attackTags,
    useException = false,
    targetOwnedBehaviors,
    interceptIncomingEffect,
  } = options;

  let newWorld = structuredClone(world);
  let newEncounter = structuredClone(encounter);

  const sourceEntity = newWorld[sourceEntityId];
  if (!sourceEntity) {
    return {
      success: false,
      reasons: [`Source entity not found: ${sourceEntityId}`],
      normalizedTargetIds: [],
      targetResults: {},
      usageConsumed: false,
      newWorld,
      newEncounter,
      appliedEffects: [],
      emittedEvents: [],
    };
  }

  const participant = getOrCreateParticipantState(newEncounter, sourceEntityId);

  // 1. Normalize target IDs (deduplicate while preserving order)
  const rawTargets = targetEntityIds ?? [];
  const normalizedTargetIds = Array.from(new Set(rawTargets));

  if (normalizedTargetIds.length === 0) {
    return {
      success: false,
      reasons: ["No targets provided"],
      normalizedTargetIds: [],
      targetResults: {},
      usageConsumed: false,
      newWorld,
      newEncounter,
      appliedEffects: [],
      emittedEvents: [],
    };
  }

  // 2. Validate quantity contract
  const targetDef = behavior.target;
  const quantityDef = targetDef?.quantity;
  if (quantityDef) {
    if (quantityDef.mode === "up_to") {
      const maxCount = quantityDef.count ?? 1;
      if (normalizedTargetIds.length > maxCount) {
        return {
          success: false,
          reasons: [
            `Target count ${normalizedTargetIds.length} exceeds maximum allowed of ${maxCount}`,
          ],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else if (quantityDef.mode === "exact") {
      const exactCount = quantityDef.count ?? 1;
      if (normalizedTargetIds.length !== exactCount) {
        return {
          success: false,
          reasons: [
            `Target count ${normalizedTargetIds.length} does not match exact required count of ${exactCount}`,
          ],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else if (quantityDef.mode === "all") {
      // Automatic discovery not implemented; operates on explicit list provided
    }
  }

  // 3. Atomic Target Relationship & Existence Validation
  // If ANY target violates the contract, fail the entire action before applying any effects or consuming usage.
  const targetType = targetDef?.type ?? "ally";
  for (const tid of normalizedTargetIds) {
    const targetEntity = newWorld[tid];
    if (!targetEntity) {
      return {
        success: false,
        reasons: [`Target entity not found: ${tid}`],
        normalizedTargetIds,
        targetResults: {},
        usageConsumed: false,
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }

    const rel = resolveEntityRelationship(sourceEntityId, tid, newWorld);

    if (targetType === "ally") {
      if (tid === sourceEntityId || rel === "self") {
        return {
          success: false,
          reasons: [`Cannot target self when target type is ally: ${tid}`],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
      if (rel !== "ally") {
        return {
          success: false,
          reasons: [
            `Target ${tid} is not an ally of ${sourceEntityId} (resolved as ${rel})`,
          ],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else if (targetType === "enemy") {
      if (rel !== "enemy") {
        return {
          success: false,
          reasons: [
            `Target ${tid} is not an enemy of ${sourceEntityId} (resolved as ${rel})`,
          ],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else if (targetType === "self") {
      if (tid !== sourceEntityId) {
        return {
          success: false,
          reasons: [`Target ${tid} must be self`],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    }
  }

  // 4. Anti-loop / duplicate execution check on event
  if (event) {
    const execKey = `${behavior.id}:${event.id}`;
    if (participant.executedBehaviorEvents.includes(execKey)) {
      return {
        success: false,
        reasons: ["Behavior already executed for this event"],
        normalizedTargetIds,
        targetResults: {},
        usageConsumed: false,
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
  }

  // 5. Action-level Conditions evaluation (once)
  const evalCtx: ConditionEvaluationContext = {
    entity: sourceEntity,
    participant,
    world: newWorld,
    event,
    rollResult,
    dice,
    signals,
    attackTags,
  };

  let conditionsPassed = evaluateMechanicalConditions(
    behavior.conditions,
    behavior.conditionLogic,
    evalCtx
  );

  // 6. Action-level Limitations check (once)
  let limitationResult = checkLimitations(
    behavior,
    participant,
    sourceEntity,
    newEncounter.turn
  );

  if (!conditionsPassed || !limitationResult.passed) {
    const exception = behavior.control?.exception;
    if (useException && exception && exception.allowWhenRequirementFailed) {
      const costRes = (exception.costResource ?? "ES") as "SA" | "ES";
      const costAmt = exception.costAmount ?? 0;
      if (sourceEntity.resources[costRes].current >= costAmt) {
        sourceEntity.resources[costRes].current -= costAmt;
        if (costRes === "ES") participant.esSpentThisTurn += costAmt;
        else participant.hpLostThisTurn += costAmt;
        conditionsPassed = true;
        limitationResult = { passed: true };
      } else {
        return {
          success: false,
          reasons: [`Insufficient resource for exception: ${costRes} < ${costAmt}`],
          normalizedTargetIds,
          targetResults: {},
          usageConsumed: false,
          newWorld,
          newEncounter,
          appliedEffects: [],
          emittedEvents: [],
        };
      }
    } else {
      return {
        success: false,
        reasons: !conditionsPassed ? ["Conditions not met"] : ["Limitations violated"],
        normalizedTargetIds,
        targetResults: {},
        usageConsumed: false,
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
  }

  // 7. Resolution (if any)
  let resolutionResult: ResolutionResult | undefined;
  const effectsToExecute: MechanicalEffectItem[] = [...behavior.effects];

  if (behavior.resolution) {
    if (behavior.resolution.type === "rd") {
      const diff = behavior.resolution.difficulty ?? 12;
      const roll = rollResult ?? 10;
      resolutionResult = resolveOutcomesForRoll(roll, diff, behavior.resolution.outcomes);
      effectsToExecute.push(...resolutionResult.effectsToApply);
    } else if (behavior.resolution.type === "roll") {
      const diff = behavior.resolution.difficulty ?? 10;
      const roll = rollResult ?? 10;
      resolutionResult = resolveOutcomesForRoll(roll, diff, behavior.resolution.outcomes);
      effectsToExecute.push(...resolutionResult.effectsToApply);
    }
  }

  // 8. Apply effects per target
  const targetResults: Record<string, TargetExecutionResult> = {};
  const allAppliedEffects: MechanicalEffectItem[] = [];
  const emittedEvents: MechanicalEvent[] = [];

  // Action identity shared across targets for Task 17 interception deduplication
  const actionKey = event?.id ?? `action_${sourceEntityId}_turn_${newEncounter.turn}_${behavior.id}`;

  const helperGetTargetBehaviors = (tid: string) => {
    if (!targetOwnedBehaviors) return undefined;
    if (Array.isArray(targetOwnedBehaviors)) return targetOwnedBehaviors;
    return targetOwnedBehaviors[tid];
  };

  for (const tid of normalizedTargetIds) {
    const targetEntity = newWorld[tid];
    const targetParticipant = getOrCreateParticipantState(newEncounter, tid);
    const specificOwnedBehaviors = helperGetTargetBehaviors(tid);

    const appliedForTarget: MechanicalEffectItem[] = [];
    const blockedForTarget: string[] = [];
    let creditedAmountForTarget = 0;

    for (const eff of effectsToExecute) {
      // Temporality check
      const temporality = eff.temporality ?? behavior.temporality;
      const durationType = temporality?.duration?.type ?? "instant";

      if (
        durationType === "until_next_use" ||
        durationType === "until_next_roll" ||
        durationType === "until_turn_end"
      ) {
        if (eff.type === "cost_modifier") {
          targetParticipant.pendingModifiers.push({
            id: `${eff.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceElementId: elementId,
            scope: eff.scopeId ?? "all",
            type: "cost",
            amount: eff.amount,
            operation: eff.operation,
            duration: durationType,
          });
          appliedForTarget.push(eff);
          continue;
        }
        if (eff.type === "roll_modifier" || eff.type === "penalty" || eff.type === "bonus") {
          targetParticipant.pendingModifiers.push({
            id: `${eff.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceElementId: elementId,
            scope: eff.type === "roll_modifier" ? (eff.rollType ?? "action_roll") : "all",
            type: "roll",
            amount: eff.type === "penalty" ? -Math.abs(eff.amount) : eff.amount,
            operation: eff.operation,
            duration: durationType,
          });
          appliedForTarget.push(eff);
          continue;
        }
      }

      // Incoming effect interception check (Mala Cara / custom interception)
      const tags = attackTags ?? (event?.payload?.tags as string[] | undefined) ?? [];
      const isSupport =
        tags.includes("support") ||
        eff.type === "healing" ||
        eff.type === "barrier" ||
        (eff.type === "status_apply" && tags.includes("support"));

      const rel = resolveEntityRelationship(sourceEntityId, tid, newWorld);
      const incomingCtx: IncomingEffectContext = {
        effect: eff,
        sourceEntityId,
        targetEntityId: tid,
        relationship: rel === "unknown" ? "ally" : rel,
        isSupport,
        blocked: false,
      };

      let isBlocked = false;
      let blockReason: string | undefined;

      if (interceptIncomingEffect) {
        const customRes = interceptIncomingEffect(incomingCtx, newWorld, newEncounter);
        if (customRes.newWorld) newWorld = customRes.newWorld;
        if (customRes.newEncounter) newEncounter = customRes.newEncounter;
        if (customRes.blocked) {
          isBlocked = true;
          blockReason = customRes.blockedReason;
        }
      }

      if (!isBlocked && specificOwnedBehaviors && specificOwnedBehaviors.length > 0 && isSupport && tid !== sourceEntityId) {
        for (const { behavior: targetB } of specificOwnedBehaviors) {
          if (targetB.mode !== "reactive") continue;
          const matchesKind =
            targetB.trigger?.kind === "receive_healing" ||
            targetB.trigger?.kind === "receive_barrier" ||
            targetB.trigger?.kind === "receive_support";
          if (!matchesKind) continue;

          const hasSupportTagCond = (targetB.conditions ?? []).some(
            (c) => c.type === "tag" && c.tag === "support"
          );
          if (hasSupportTagCond && !isSupport) continue;

          if (targetB.resolution?.type === "rd") {
            const actionExecKey = `${targetB.id}:${actionKey}`;
            const actionExecResultKey = `${actionExecKey}:blocked`;
            if (!targetParticipant.executedBehaviorEvents.includes(actionExecKey)) {
              const diff = targetB.resolution.difficulty ?? 12;
              const roll = rollResult ?? 10;
              const resOutcomes = resolveOutcomesForRoll(roll, diff, targetB.resolution.outcomes);
              targetParticipant.executedBehaviorEvents.push(actionExecKey);

              const hasBlock = resOutcomes.effectsToApply.some(
                (e: any) =>
                  e.type === "effect_block" ||
                  e.type === "action_block" ||
                  (e.type === "incoming_healing_modifier" && e.amount < 0)
              );
              if (hasBlock) {
                targetParticipant.executedBehaviorEvents.push(actionExecResultKey);
                isBlocked = true;
                blockReason = `${targetB.name ?? targetB.id} rejected support`;
                break;
              }
            } else {
              if (targetParticipant.executedBehaviorEvents.includes(actionExecResultKey)) {
                isBlocked = true;
                blockReason = `${targetB.name ?? targetB.id} rejected support`;
                break;
              }
            }
          }
        }
      }

      if (isBlocked) {
        blockedForTarget.push(eff.type);
        newEncounter.traceLog.push({
          timestamp: Date.now(),
          turn: newEncounter.turn,
          behaviorId: behavior.id,
          behaviorName: behavior.name,
          mode: behavior.mode,
          eventId: event?.id,
          conditionsPassed: true,
          limitationsPassed: true,
          appliedEffects: [`blocked:${eff.type}:${tid}`],
        });
        continue;
      }

      appliedForTarget.push(eff);
      if (!allAppliedEffects.includes(eff)) {
        allAppliedEffects.push(eff);
      }

      const currentTargetEntity = newWorld[tid];

      switch (eff.type) {
        case "healing": {
          let baseHealing = eff.amount ?? 0;
          const isDice = (eff as any).magnitude?.kind === "dice" || (eff as any).kind === "dice" || Boolean((eff as any).dice) || Boolean((eff as any).formula);
          if (isDice) {
            const formula = (eff as any).magnitude?.formula ?? (eff as any).formula ?? (eff as any).dice;
            if (rollResult !== undefined) {
              baseHealing = rollResult;
            } else if (dice && dice.length > 0) {
              baseHealing = dice.reduce((s, d) => s + d, 0);
            } else if (event?.payload?.rolls && eff.id && event.payload.rolls[eff.id]) {
              const r = event.payload.rolls[eff.id];
              baseHealing = Array.isArray(r) ? r.reduce((s: number, d: number) => s + d, 0) : Number(r);
            } else {
              const match = /^(\d+)[dD](\d+)$/.exec(formula);
              if (match) {
                baseHealing = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
              }
            }
          } else {
            baseHealing = (eff as any).magnitude?.amount ?? eff.amount ?? 0;
          }
          const res = processHealingPipeline({
            baseHealing,
            resourceId: eff.resourceId,
            healerId: sourceEntityId,
            targetId: tid,
            world: newWorld,
            encounter: newEncounter,
          });
          newWorld = res.newWorld;
          creditedAmountForTarget += res.actualAmountCredited;
          break;
        }

        case "damage": {
          let baseDmg = 4;
          const formula = (eff as any).formula ?? (eff as any).magnitude?.formula ?? eff.dice;
          if (typeof formula === "string") {
            const match = /^(\d+)[dD](\d+)$/.exec(formula.trim());
            if (match) {
              baseDmg = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
            } else {
              baseDmg = parseInt(formula, 10) || 4;
            }
          } else if (typeof (eff as any).amount === "number") {
            baseDmg = (eff as any).amount;
          }
          const res = processDamagePipeline({
            baseDamage: baseDmg,
            attackerId: sourceEntityId,
            targetId: tid,
            tags: attackTags,
            world: newWorld,
            encounter: newEncounter,
          });
          newWorld = res.newWorld;
          break;
        }

        case "barrier": {
          currentTargetEntity.barrier += eff.amount;
          break;
        }

        case "status_apply": {
          currentTargetEntity.statuses.push({
            sourceId: behavior.id,
            statusElementId: eff.statusElementId,
            expiresAt: eff.turns ? newEncounter.turn + eff.turns : undefined,
          });
          break;
        }

        case "status_remove": {
          currentTargetEntity.statuses = currentTargetEntity.statuses.filter(
            (s) => s.statusElementId !== eff.statusElementId
          );
          break;
        }

        case "resource_modifier": {
          const res = currentTargetEntity.resources[eff.resourceId as "SA" | "ES"];
          if (res) {
            const op = eff.operation ?? "add";
            res.current = applyModifierMath(res.current, [{ operation: op, amount: eff.amount }]);
          }
          break;
        }

        default:
          break;
      }
    }

    targetResults[tid] = {
      targetEntityId: tid,
      appliedEffects: appliedForTarget,
      blockedEffects: blockedForTarget,
      actualAmountCredited: creditedAmountForTarget,
    };
  }

  // 9. Update limitations & cooldowns EXACTLY ONCE on source participant
  for (const lim of behavior.limitations ?? []) {
    if (lim.type === "cooldown") {
      participant.cooldowns[behavior.id] = newEncounter.turn + lim.turns + 1;
    } else if (lim.type === "usage_limit") {
      const key = `${lim.period}:current:${behavior.id}`;
      participant.usageCounters[key] = (participant.usageCounters[key] ?? 0) + 1;
    }
  }

  // 10. Update control counters on source (if configured)
  if (behavior.control?.counter) {
    const cConf = behavior.control.counter;
    const cKey = makeCounterKey(sourceEntityId, elementId, behavior.id, cConf.id);
    const inc = cConf.incrementOnTrigger ?? 1;
    const newVal = mutateCounter(participant, cKey, "increment", inc, cConf.cap, cConf.initialValue ?? 0);
    if (behavior.control.accumulation) {
      const accum = behavior.control.accumulation;
      if (newVal >= accum.threshold && accum.resetOnThreshold) {
        participant.activeCounters[cKey] = cConf.initialValue ?? 0;
      }
    }
  }

  if (event) {
    participant.executedBehaviorEvents.push(`${behavior.id}:${event.id}`);
  }

  newEncounter.traceLog.push({
    timestamp: Date.now(),
    turn: newEncounter.turn,
    behaviorId: behavior.id,
    behaviorName: behavior.name,
    mode: behavior.mode,
    eventId: event?.id,
    conditionsPassed: true,
    limitationsPassed: true,
    appliedEffects: allAppliedEffects.map((e) => e.type),
  });

  return {
    success: true,
    normalizedTargetIds,
    targetResults,
    usageConsumed: true,
    newWorld,
    newEncounter,
    appliedEffects: allAppliedEffects,
    resolution: resolutionResult,
    emittedEvents,
  };
}

/**
 * Checks if a participant currently has an active transformation effect.
 */
export function hasActiveTransformation(
  participant: ParticipantRuntimeState,
  filter?: { sourceBehaviorId?: string; sourceElementId?: string }
): boolean {
  if (!participant.activeTimedEffects) return false;
  return participant.activeTimedEffects.some(
    (e) =>
      e.effect.type === "transformation" &&
      (!filter?.sourceBehaviorId || e.sourceBehaviorId === filter.sourceBehaviorId) &&
      (!filter?.sourceElementId || e.sourceElementId === filter.sourceElementId)
  );
}

/**
 * Returns all active transformation timed effects currently on a participant.
 */
export function getActiveTransformations(
  participant: ParticipantRuntimeState
): ActiveTimedEffect[] {
  if (!participant.activeTimedEffects) return [];
  return participant.activeTimedEffects.filter((e) => e.effect.type === "transformation");
}



