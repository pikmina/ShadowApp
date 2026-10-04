import type { RuleEntityState, RuleWorld } from "./ruleExecution";
export type { RuleEntityState, RuleWorld };
import type {
  MechanicalBehavior,
  MechanicalBehaviorInput,
  MechanicalCondition,
  MechanicalEffectItem,
  MechanicalLimitation,
  MechanicalRequirement,
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

  sourceEntityType?: "character" | "npc" | "status" | "weakness" | "system" | string;
  targetEntityType?: "character" | "npc" | string;

  sourceElementId?: string;
  sourceBehaviorId?: string;

  turn?: number;
  timestamp?: number;

  payload?: Record<string, unknown>;

  behavior?: {
    id?: string;
    sourceType?: string;
    tags?: string[];
  };
  roll?: {
    type?: string;
    dice?: number[];
    total?: number;
    critical?: boolean;
  };
  resource?: {
    resource?: string;
    previous?: number;
    current?: number;
    maximum?: number;
  };
  damage?: {
    amount?: number;
    sourceEntityId?: string;
    sourceEntityType?: string;
    origin?: string;
  };
  status?: {
    statusElementId?: string;
    action?: "applied" | "removed";
  };

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
  sourceEntityId?: string;
  effect: MechanicalEffectItem;
  temporality: MechanicalTemporality;
  remainingTurns?: number;
  initialTurns?: number;
  appliedAtTurn?: number;
  expiresAtTurn?: number;
  targetEntityId: string;
  periodicity?: {
    mode: "once" | "each_turn";
    timing?: "turn_start" | "turn_end";
  };
  activationDelay?: {
    delay: number;
    declaredAtTurn: number;
    sourceEntityId: string;
    targetEntityId?: string;
    behavior: MechanicalBehavior;
    elementId?: string;
    options?: any;
  };
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

  /** Active attribute/stat modifiers currently affecting this participant */
  activeModifiers?: Array<{
    id: string;
    sourceBehaviorId?: string;
    attributeId?: string;
    amount: number;
    turns?: number;
    untilEnd?: boolean;
    appliedAtTurn?: number;
    expiresAtTurn?: number;
  }>;

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
    activeModifiers: [],
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
  ownedBehaviorsByEntity?: Record<string, Array<{ elementId: string; behavior: MechanicalBehavior }>>,
  world?: RuleWorld
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

    // Reset per-turn usage counters
    for (const key of Object.keys(participant.usageCounters)) {
      if (key.startsWith("turn:")) {
        delete participant.usageCounters[key];
      }
    }

    // Remove pending modifiers with duration 'until_turn_end'
    participant.pendingModifiers = participant.pendingModifiers.filter(
      (m) => m.duration !== "until_turn_end" && !m.consumed
    );

    // 1. Process delayed activations declared by this participant
    const retainedTimedEffects: ActiveTimedEffect[] = [];
    for (const timed of participant.activeTimedEffects) {
      if (timed.activationDelay) {
        if (participant.currentTurn >= timed.activationDelay.declaredAtTurn + timed.activationDelay.delay) {
          const res = executeMechanicalBehavior({
            behavior: timed.activationDelay.behavior,
            elementId: timed.activationDelay.elementId ?? timed.sourceElementId ?? "delayed",
            sourceEntityId: timed.activationDelay.sourceEntityId,
            targetEntityId: timed.activationDelay.targetEntityId ?? entityId,
            world: world ?? {},
            encounter: next,
            rollResult: timed.activationDelay.options?.rollResult,
            dice: timed.activationDelay.options?.dice,
            attackTags: timed.activationDelay.options?.attackTags,
            signals: timed.activationDelay.options?.signals,
            isExecutingDelayed: true,
          } as any);
          if (res.success && world) {
            Object.assign(world, res.newWorld);
          }
          continue; // delayed activation completed
        }
      }
      retainedTimedEffects.push(timed);
    }
    participant.activeTimedEffects = retainedTimedEffects;

    // 2. Process periodic effects on this participant (at turn_start)
    for (const timed of participant.activeTimedEffects) {
      if (timed.activationDelay) continue;
      if (timed.periodicity?.mode === "each_turn") {
        const timing = timed.periodicity.timing ?? "turn_start";
        if (timing === "turn_start") {
          // Check that application turn is not counted twice and effect has not expired
          if (timed.appliedAtTurn !== undefined && participant.currentTurn <= timed.appliedAtTurn) {
            continue;
          }
          if (timed.expiresAtTurn !== undefined && participant.currentTurn > timed.expiresAtTurn) {
            continue;
          }
          if (timed.effect.type === "damage") {
            let tickDmg = 4;
            const formula = (timed.effect as any).formula ?? (timed.effect as any).magnitude?.formula ?? (timed.effect as any).dice;
            if (typeof (timed.effect as any).amount === "number") {
              tickDmg = (timed.effect as any).amount;
            } else if (typeof formula === "string") {
              const match = /^(\d+)[dD](\d+)$/.exec(formula.trim());
              if (match) {
                tickDmg = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
              } else {
                tickDmg = parseInt(formula, 10) || 4;
              }
            }
            if (world && world[entityId]) {
              const res = processDamagePipeline({
                baseDamage: tickDmg,
                attackerId: timed.sourceEntityId ?? entityId,
                targetId: entityId,
                world,
                encounter: next,
              });
              if (res.newWorld[entityId]) {
                Object.assign(world[entityId], res.newWorld[entityId]);
              }
            }
          } else if ((timed.effect as any).type === "self_damage_periodic" || (timed.effect as any).type === "consequence_periodic_hp") {
            const tickHp = (timed.effect as any).amount ?? 1;
            if (world && world[entityId]) {
              world[entityId].resources.SA.current = Math.max(0, world[entityId].resources.SA.current - tickHp);
              participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + tickHp;
            }
          } else if (timed.effect.type === "healing") {
            let tickHealing = (timed.effect as any).amount ?? 0;
            const formula = (timed.effect as any).formula ?? (timed.effect as any).magnitude?.formula ?? (timed.effect as any).dice;
            if (typeof formula === "string") {
              const match = /^(\d+)[dD](\d+)$/.exec(formula.trim());
              if (match) {
                tickHealing = parseInt(match[1], 10) * Math.ceil(parseInt(match[2], 10) / 2);
              }
            }
            if (world && world[entityId]) {
              const res = processHealingPipeline({
                baseHealing: tickHealing,
                resourceId: (timed.effect as any).resourceId ?? "SA",
                healerId: timed.sourceEntityId ?? entityId,
                targetId: entityId,
                world,
                encounter: next,
              });
              if (res.newWorld[entityId]) {
                Object.assign(world[entityId], res.newWorld[entityId]);
              }
            }
          }
        }
      }
    }

    // 3. Decrement or expire active timed effects
    participant.activeTimedEffects = participant.activeTimedEffects.filter((effect) => {
      if (effect.activationDelay) return true;
      if (effect.temporality?.duration?.type === "while_condition") return true;
      // The application turn does NOT consume duration: "Una duración de N turnos concede N turnos posteriores completos al portador"
      if (effect.appliedAtTurn !== undefined && participant.currentTurn <= effect.appliedAtTurn) {
        return true;
      }
      if (effect.remainingTurns !== undefined) {
        effect.remainingTurns -= 1;
      }

      let isExpired = false;
      if (effect.expiresAtTurn !== undefined) {
        isExpired = next.turn > effect.expiresAtTurn;
      } else if (effect.remainingTurns !== undefined) {
        isExpired = effect.remainingTurns < 0;
      }

      if (isExpired) {
        if ((effect.effect as any)?.type === 'self_damage_on_end') {
          const endDmg = (effect.effect as any).amount ?? 1;
          if (world && world[entityId]) {
            world[entityId].resources.SA.current = Math.max(0, world[entityId].resources.SA.current - endDmg);
            participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + endDmg;
          }
        }

        // Trigger after-effect if present
        if ((effect.effect as any)?.type === 'after_effect_modifier') {
          if (!participant.activeModifiers) participant.activeModifiers = [];
          const eff = effect.effect as any;
          participant.activeModifiers.push({
            id: `mod_after_${effect.sourceBehaviorId}_${Date.now()}`,
            sourceBehaviorId: effect.sourceBehaviorId,
            attributeId: eff.attributeId ?? 'INT',
            amount: eff.amount ?? -2,
            turns: eff.turns ?? 3,
            appliedAtTurn: next.turn,
            expiresAtTurn: next.turn + (eff.turns ?? 3),
          });
        }
        return false;
      }

      return true;
    });

    // Clean up activeModifiers that have expired
    if (participant.activeModifiers) {
      participant.activeModifiers = participant.activeModifiers.filter((m) => {
        if (m.expiresAtTurn !== undefined) {
          return next.turn < m.expiresAtTurn;
        }
        return true;
      });
    }

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

      if (world) {
        const synced = syncWhileConditionEffects(
          entityId,
          ownedBehaviorsByEntity[entityId],
          world,
          next
        );
        next.participants[entityId] = synced.participants[entityId];
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
      const rawKey = String(condition.resourceId ?? "SA").trim();
      const upper = rawKey.toUpperCase();
      const lower = rawKey.toLowerCase();
      let current = 0;
      if (upper === "SA" || upper === "SALUD" || upper === "HP" || upper === "SAL") {
        current = ctx.entity.resources.SA?.current ?? (ctx.entity as any).salud ?? 0;
      } else if (upper === "ES" || upper === "ESTAMINA" || upper === "STAMINA" || upper === "EST") {
        current = ctx.entity.resources.ES?.current ?? (ctx.entity as any).estamina ?? 0;
      } else if (ctx.entity.attributes[upper] !== undefined) {
        current = ctx.entity.attributes[upper];
      } else if (ctx.entity.attributes[lower] !== undefined) {
        current = ctx.entity.attributes[lower];
      } else if (ctx.entity.attributes[rawKey] !== undefined) {
        current = ctx.entity.attributes[rawKey];
      } else if ((ctx.participant as any)?.combatStats && ((ctx.participant as any).combatStats as any)[lower] !== undefined) {
        current = ((ctx.participant as any).combatStats as any)[lower];
      } else if ((ctx.entity as any).derivedStats?.[lower] !== undefined) {
        current = (ctx.entity as any).derivedStats[lower];
      } else {
        current = (ctx.entity.resources as any)[rawKey]?.current ?? (ctx.entity.resources as any)[upper]?.current ?? 0;
      }
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
      const dice = ctx.dice ?? (ctx.event?.roll?.dice as number[] | undefined) ?? [];
      if (dice.length === 0) {
        result = false;
        break;
      }

      if (condition.dieSelection === "pair") {
        if (condition.pair && condition.pair.length === 2) {
          result = dice.length >= 2 && dice[0] === condition.pair[0] && dice[1] === condition.pair[1];
        } else if (condition.value !== undefined && condition.value > 0) {
          result = dice.length >= 2 && dice[0] === condition.value && dice[1] === condition.value;
        } else {
          result = dice.length >= 2 && dice[0] === dice[1];
        }
        break;
      }

      if (condition.dieSelection === "double") {
        const isDouble = dice.length >= 2 && dice[0] === dice[1];
        if (!isDouble) {
          result = false;
        } else if (condition.value !== undefined && condition.value > 0) {
          result = compareNumbers(dice[0], condition.comparison ?? "=", condition.value);
        } else {
          result = true;
        }
        break;
      }

      if (condition.min !== undefined || condition.max !== undefined) {
        const min = condition.min ?? 1;
        const max = condition.max ?? 10;
        if (condition.dieSelection === "both") {
          result = dice.length >= 2 && dice.every((d) => d >= min && d <= max);
        } else {
          result = dice.some((d) => d >= min && d <= max);
        }
        break;
      }

      const comp = condition.comparison ?? "=";
      const val = condition.value ?? 0;

      switch (condition.dieSelection) {
        case "both":
          result = dice.length >= 2 && dice.every((d) => compareNumbers(d, comp, val));
          break;
        case "first":
          result = dice.length >= 1 && compareNumbers(dice[0], comp, val);
          break;
        case "second":
          result = dice.length >= 2 && compareNumbers(dice[1], comp, val);
          break;
        case "individual":
        case "any":
        default:
          result = dice.some((d) => compareNumbers(d, comp, val));
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
      const rawKey = String(condition.attributeId ?? "").trim();
      const upper = rawKey.toUpperCase();
      const lower = rawKey.toLowerCase();
      let attrVal = 0;
      if (ctx.entity.attributes[upper] !== undefined) {
        attrVal = ctx.entity.attributes[upper];
      } else if (ctx.entity.attributes[lower] !== undefined) {
        attrVal = ctx.entity.attributes[lower];
      } else if (ctx.entity.attributes[rawKey] !== undefined) {
        attrVal = ctx.entity.attributes[rawKey];
      } else if (upper === "SA" || upper === "SALUD" || upper === "HP" || upper === "SAL") {
        attrVal = ctx.entity.resources.SA?.current ?? (ctx.entity as any).salud ?? 0;
      } else if (upper === "ES" || upper === "ESTAMINA" || upper === "STAMINA" || upper === "EST") {
        attrVal = ctx.entity.resources.ES?.current ?? (ctx.entity as any).estamina ?? 0;
      } else if ((ctx.participant as any)?.combatStats && ((ctx.participant as any).combatStats as any)[lower] !== undefined) {
        attrVal = ((ctx.participant as any).combatStats as any)[lower];
      } else if ((ctx.entity as any).derivedStats?.[lower] !== undefined) {
        attrVal = (ctx.entity as any).derivedStats[lower];
      } else {
        attrVal = ctx.entity.attributes[rawKey] ?? ctx.entity.attributes[upper] ?? 0;
      }
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

    case "active_behavior": {
      const part = ctx.participant;
      const hasActive = (part.activeTimedEffects ?? []).some(
        (eff) =>
          (condition.behaviorId && eff.sourceBehaviorId === condition.behaviorId) ||
          (condition.elementId && eff.sourceElementId === condition.elementId)
      );
      result = condition.present !== false ? hasActive : !hasActive;
      break;
    }

    case "conscious": {
      const targetId =
        condition.target === "target"
          ? (ctx.event?.targetEntityId ?? ctx.participant.entityId)
          : ctx.participant.entityId;
      const ent = (ctx.world && ctx.world[targetId]) ? ctx.world[targetId] : ctx.entity;
      const sa = ent?.resources?.SA?.current ?? 0;
      const hasUnconsciousStatus = (ent?.statuses ?? []).some(
        (s: any) =>
          s.statusElementId === "core.status.unconscious" ||
          s.statusElementId === "unconscious" ||
          s.statusElementId === "core.status.defeated"
      );
      const isConscious = sa > 0 && !hasUnconsciousStatus;
      result = condition.conscious !== false ? isConscious : !isConscious;
      break;
    }

    case "group": {
      result = evaluateMechanicalConditions(
        condition.conditions ?? [],
        condition.logic ?? "all",
        ctx
      );
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
// 12.1. EVALUADOR DE REQUISITOS (evaluateRequirements)
// ============================================================================

export interface RequirementEvaluationContext {
  sourceEntityId: string;
  targetEntityId?: string;
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  confirmedManualSignals?: string[];
  rolls?: Record<string, number>;
  inventory?: Record<string, number>;
}

export interface RequirementEvaluationResult {
  satisfied: boolean;
  unresolved: MechanicalRequirement[];
  failed: MechanicalRequirement[];
  reasons: string[];
  requiresManualResolution: boolean;
}

export function evaluateRequirements(
  requirements: MechanicalRequirement[] = [],
  context: RequirementEvaluationContext
): RequirementEvaluationResult {
  const unresolved: MechanicalRequirement[] = [];
  const failed: MechanicalRequirement[] = [];
  const reasons: string[] = [];

  const sourceEntity = context.world[context.sourceEntityId];
  const targetId = context.targetEntityId ?? context.sourceEntityId;
  const targetEntity = context.world[targetId];
  const participant = context.encounter.participants[context.sourceEntityId];
  const confirmedSignals = new Set(context.confirmedManualSignals ?? []);

  for (const req of requirements) {
    if (req.resolution === "manual") {
      // Manual requirements require explicit confirmation in confirmedManualSignals
      const isConfirmed =
        confirmedSignals.has(req.type) ||
        confirmedSignals.has(req.id) ||
        Boolean(req.parameters?.signalId && confirmedSignals.has(req.parameters.signalId));

      if (!isConfirmed) {
        unresolved.push(req);
        reasons.push(`Requiere confirmación manual del Director: ${req.description || req.type}`);
      }
      continue;
    }

    // Automatic requirements
    switch (req.type) {
      case "target_conscious":
      case "conscious": {
        const entity = targetEntity ?? sourceEntity;
        const sa = entity?.resources?.SA?.current ?? 0;
        const hasUnconsciousStatus = (entity?.statuses ?? []).some(
          (s: any) =>
            s.statusElementId === "core.status.unconscious" ||
            s.statusElementId === "unconscious" ||
            s.statusElementId === "core.status.defeated"
        );
        if (sa <= 0 || hasUnconsciousStatus) {
          failed.push(req);
          reasons.push("El objetivo no está consciente");
        }
        break;
      }

      case "active_behavior": {
        const hasActive = (participant?.activeTimedEffects ?? []).some(
          (timed) =>
            (req.behaviorId && timed.sourceBehaviorId === req.behaviorId) ||
            (req.elementId && timed.sourceElementId === req.elementId)
        );
        if (!hasActive) {
          failed.push(req);
          reasons.push(`Requiere técnica o habilidad activa: ${req.behaviorId || req.elementId || ""}`);
        }
        break;
      }

      case "resource_threshold": {
        const resId = (req.resourceId ?? "ES") as "SA" | "ES";
        const currentRes = sourceEntity?.resources?.[resId]?.current ?? 0;
        const minReq = req.minAmount ?? 0;
        if (currentRes < minReq) {
          failed.push(req);
          reasons.push(`Reserva insuficiente de ${resId}: actual ${currentRes} < requerida ${minReq}`);
        }
        break;
      }

      case "item": {
        const itemKey = req.elementId ?? "";
        const currentQty = sourceEntity?.inventory?.[itemKey] ?? 0;
        const reserved = participant?.reservedInventory?.[itemKey] ?? 0;
        const available = currentQty - reserved;
        const requiredQty = req.quantity ?? 1;
        if (available < requiredQty) {
          failed.push(req);
          reasons.push(`Objeto insuficiente (${itemKey}): disponible ${available} < requerido ${requiredQty}`);
        }
        break;
      }

      default: {
        failed.push(req);
        reasons.push(`Requisito automático no satisfecho: ${req.description || req.type}`);
        break;
      }
    }
  }

  const satisfied = failed.length === 0 && unresolved.length === 0;
  const requiresManualResolution = unresolved.length > 0;

  return {
    satisfied,
    unresolved,
    failed,
    reasons,
    requiresManualResolution,
  };
}

// ============================================================================
// 12.2. GESTIÓN DEL CICLO DE VIDA DE WHILE_CONDITION
// ============================================================================

export function syncWhileConditionEffects(
  entityId: string,
  ownedBehaviors: OwnedBehaviorEntry[],
  world: RuleWorld,
  encounter: EncounterRuntimeState,
  signals?: string[]
): EncounterRuntimeState {
  const next = structuredClone(encounter);
  const participant = getOrCreateParticipantState(next, entityId);
  const entity = world[entityId];
  if (!entity) return next;

  for (const { elementId, behavior } of ownedBehaviors) {
    const hasWhileCond =
      behavior.temporality?.duration?.type === "while_condition" ||
      behavior.effects.some((e) => e.temporality?.duration?.type === "while_condition");

    if (!hasWhileCond) continue;

    const ctx: ConditionEvaluationContext = {
      entity,
      participant,
      elementId,
      behaviorId: behavior.id,
      world,
      signals,
    };

    const conditionsMet = evaluateMechanicalConditions(
      behavior.conditions,
      behavior.conditionLogic,
      ctx
    );

    const existingIndex = participant.activeTimedEffects.findIndex(
      (t) => t.sourceBehaviorId === behavior.id
    );

    if (conditionsMet) {
      // false -> true: activate
      // true -> true: maintain, do NOT duplicate
      if (existingIndex === -1) {
        for (const eff of behavior.effects) {
          const effectiveTemp = resolveEffectiveTemporality(eff, behavior);
          participant.activeTimedEffects.push({
            id: `while_${behavior.id}_${eff.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceElementId: elementId,
            sourceEntityId: entityId,
            targetEntityId: entityId,
            effect: eff,
            temporality: effectiveTemp ?? { duration: { type: "while_condition" } },
            appliedAtTurn: next.turn,
          });
        }
      }
    } else {
      // true -> false: deactivate / remove
      if (existingIndex !== -1) {
        participant.activeTimedEffects = participant.activeTimedEffects.filter(
          (t) => t.sourceBehaviorId !== behavior.id
        );
      }
    }
  }

  return next;
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

  // Also collect active modifiers from participant's active timed effects (e.g. +2 FUE for 2 turns)
  if (participant && Array.isArray(participant.activeTimedEffects)) {
    for (const timed of participant.activeTimedEffects) {
      if (timed.activationDelay) continue;
      if (timed.periodicity?.mode === "each_turn") continue;

      const effect = timed.effect;
      result.effects.push(effect as any);

      if (effect.type === "attribute_modifier") {
        result.attributeModifiers.push({
          attributeId: effect.attributeId,
          amount: effect.amount,
          operation: effect.operation ?? "add",
        });
      } else if (effect.type === "derived_stat_modifier") {
        result.derivedStatModifiers.push({
          statId: effect.statId,
          amount: effect.amount,
          operation: effect.operation ?? "add",
        });
      } else if (effect.type === "bonus") {
        const stat = (effect.targetStat || "").toLowerCase();
        if (["fue", "des", "res", "int", "vol", "vel"].includes(stat)) {
          result.attributeModifiers.push({
            attributeId: stat,
            amount: effect.amount,
            operation: effect.operation ?? "add",
          });
        } else {
          result.derivedStatModifiers.push({
            statId: stat,
            amount: effect.amount,
            operation: effect.operation ?? "add",
          });
        }
      } else if (effect.type === "penalty") {
        const stat = (effect.targetStat || "").toLowerCase();
        const amt = -Math.abs(effect.amount);
        if (["fue", "des", "res", "int", "vol", "vel"].includes(stat)) {
          result.attributeModifiers.push({
            attributeId: stat,
            amount: amt,
            operation: "add",
          });
        } else {
          result.derivedStatModifiers.push({
            statId: stat,
            amount: amt,
            operation: "add",
          });
        }
      } else if (effect.type === "skill_modifier") {
        result.skillModifiers.push({
          skillId: effect.skillId,
          amount: effect.amount,
          operation: effect.operation ?? "add",
        });
      } else if (effect.type === "roll_modifier") {
        result.rollModifiers.push({
          rollType: effect.rollType,
          amount: effect.amount,
          operation: effect.operation ?? "add",
        });
      } else if (effect.type === "cost_modifier") {
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
  dice?: number | number[];
  signals?: string[];
  attackTags?: string[];
  useException?: boolean;
  targetOwnedBehaviors?: Array<{ elementId: string; behavior: MechanicalBehavior }>;
  interceptIncomingEffect?: InterceptIncomingEffectFn;
  isExecutingDelayed?: boolean;
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

  // Check delayed activation for active mode (unless already executing the delayed invocation)
  const actDelay = behavior.activation?.delay ?? behavior.activation?.turns ?? 0;
  if (
    behavior.mode === "active" &&
    behavior.activation?.timing === "turns" &&
    actDelay > 0 &&
    !options.isExecutingDelayed
  ) {
    if (!participant.activeTimedEffects) {
      participant.activeTimedEffects = [];
    }
    participant.activeTimedEffects.push({
      id: `delayed_${behavior.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceBehaviorId: behavior.id,
      sourceElementId: elementId,
      sourceEntityId,
      targetEntityId,
      effect: behavior.effects[0] ?? { id: "delayed", type: "manual", message: "delayed activation" },
      temporality: { duration: { type: "turns", turns: actDelay } },
      activationDelay: {
        delay: actDelay,
        declaredAtTurn: newEncounter.turn,
        sourceEntityId,
        targetEntityId,
        behavior,
        elementId,
        options: {
          rollResult,
          dice,
          attackTags,
          signals,
        },
      },
    });
    return {
      success: true,
      newWorld,
      newEncounter,
      appliedEffects: [],
      emittedEvents: [],
    };
  }

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

  // 0. Evaluate activation requirements (if any)
  if (behavior.requirements && behavior.requirements.length > 0) {
    const reqResult = evaluateRequirements(behavior.requirements, {
      sourceEntityId,
      targetEntityId,
      world: newWorld,
      encounter: newEncounter,
      confirmedManualSignals: signals,
    });

    if (!reqResult.satisfied) {
      return {
        success: false,
        reasons: reqResult.reasons,
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
    dice: Array.isArray(dice) ? dice : (typeof dice === "number" ? [dice] : undefined),
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
  let totalFinalDamageDealt = 0;
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

    if (durationType === "while_condition") {
      const targetPart = newEncounter.participants[actualTargetId] ?? participant;
      if (!targetPart.activeTimedEffects) {
        targetPart.activeTimedEffects = [];
      }
      const alreadyActive = targetPart.activeTimedEffects.some(
        (t) => t.sourceBehaviorId === behavior.id && t.effect.id === eff.id
      );
      if (!alreadyActive) {
        targetPart.activeTimedEffects.push({
          id: `while_${behavior.id}_${eff.id}_${Date.now()}`,
          sourceBehaviorId: behavior.id,
          sourceElementId: elementId,
          sourceEntityId,
          targetEntityId: actualTargetId,
          effect: eff,
          temporality: temporality ?? { duration: { type: "while_condition" } },
          appliedAtTurn: newEncounter.turn,
        });
      }
      continue;
    }

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
          totalFinalDamageDealt += res.finalDamage;
        }

        const effectiveTemp = resolveEffectiveTemporality(eff, behavior);
        if (effectiveTemp?.periodicity?.mode === "each_turn" && effectiveTemp.duration?.type === "turns") {
          const turns = effectiveTemp.duration.turns ?? 1;
          const targetPart = newEncounter.participants[actualTargetId] ?? participant;
          if (!targetPart.activeTimedEffects) {
            targetPart.activeTimedEffects = [];
          }
          targetPart.activeTimedEffects.push({
            id: `${eff.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sourceBehaviorId: behavior.id,
            sourceElementId: elementId,
            sourceEntityId,
            effect: eff,
            temporality: effectiveTemp,
            remainingTurns: turns,
            initialTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            targetEntityId: actualTargetId,
            periodicity: effectiveTemp.periodicity,
          });
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
            } else if (typeof dice === "number") {
              baseHealing = dice;
            } else if (Array.isArray(dice) && dice.length > 0) {
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

        const effectiveHealingTemp = resolveEffectiveTemporality(eff, behavior);
        if (effectiveHealingTemp?.periodicity?.mode === "each_turn" && effectiveHealingTemp.duration?.type === "turns") {
          const turns = effectiveHealingTemp.duration.turns ?? 1;
          const targetPart = newEncounter.participants[actualTargetId] ?? participant;
          if (!targetPart.activeTimedEffects) {
            targetPart.activeTimedEffects = [];
          }
          targetPart.activeTimedEffects.push({
            id: `${eff.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sourceBehaviorId: behavior.id,
            sourceElementId: elementId,
            sourceEntityId,
            effect: eff,
            temporality: effectiveHealingTemp,
            remainingTurns: turns,
            initialTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            targetEntityId: actualTargetId,
            periodicity: effectiveHealingTemp.periodicity,
          });
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
          sourceEntityId,
          effect: eff,
          temporality: effectiveTemp ?? { duration: { type: "turns", turns: 1 } },
          remainingTurns: turns,
          initialTurns: turns,
          appliedAtTurn: newEncounter.turn,
          expiresAtTurn,
          targetEntityId: actualTargetId,
          periodicity: effectiveTemp?.periodicity,
        });
        break;
      }

      case "attribute_modifier":
      case "derived_stat_modifier":
      case "bonus":
      case "penalty": {
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
          sourceEntityId,
          effect: eff,
          temporality: effectiveTemp ?? { duration: { type: "turns", turns: 1 } },
          remainingTurns: turns,
          initialTurns: turns,
          appliedAtTurn: newEncounter.turn,
          expiresAtTurn,
          targetEntityId: actualTargetId,
          periodicity: effectiveTemp?.periodicity,
        });
        break;
      }

      default:
        break;
    }
  }

  // 4b. Process Limitations (self_damage) & Consequences
  const currentSourceEntity = newWorld[sourceEntityId];
  if (Array.isArray(behavior.limitations)) {
    for (const lim of behavior.limitations) {
      if (!lim || lim.type !== 'self_damage') continue;
      const amt = lim.amount ?? 1;
      if (lim.frequency === 'on_activation') {
        if (currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - amt);
        }
        participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + amt;
      } else if (lim.frequency === 'each_active_turn') {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'self_damage_periodic'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 1;
          participant.activeTimedEffects.push({
            id: `self_dmg_turn_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_self_dmg_periodic`, type: 'self_damage_periodic', amount: amt } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            periodicity: { mode: 'each_turn' },
          });
        }
      } else if (lim.frequency === 'on_end') {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'self_damage_on_end'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 1;
          participant.activeTimedEffects.push({
            id: `self_dmg_end_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_self_dmg_end`, type: 'self_damage_on_end', amount: amt } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
          });
        }
      }
    }
  }
  if (Array.isArray(behavior.consequences)) {
    for (const cons of behavior.consequences) {
      if (!cons) continue;

      // 1. Fixed self damage (activation)
      if (
        cons.type === 'self_damage_fixed' ||
        cons.type === 'self_damage_fixed_2' ||
        (cons.type === 'resource' && cons.when === 'activation' && cons.amount === 2) ||
        (cons.type === 'hp_cost' && cons.amount === 2)
      ) {
        const amt = cons.amount ?? 2;
        if (currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - amt);
        }
        participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + amt;
      }

      // 2. Periodic self damage (each active turn)
      if (
        cons.type === 'self_damage_turn' ||
        (cons.type === 'resource' && cons.when === 'each_turn' && cons.amount === 1)
      ) {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'consequence_periodic_hp'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 3;
          participant.activeTimedEffects.push({
            id: `cons_hp_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_periodic_hp`, type: 'consequence_periodic_hp', amount: cons.amount ?? 1 } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            periodicity: { mode: 'each_turn' },
          });
        }
      }

      // 3. Recoil (after damage)
      if (
        cons.type === 'recoil_half' ||
        cons.type === 'recoil' ||
        cons.consequence?.kind === 'recoil' ||
        (cons.when === 'after_damage' && cons.consequence?.fraction === 0.5)
      ) {
        const frac = cons.fraction ?? cons.consequence?.fraction ?? 0.5;
        const dmgDealt = totalFinalDamageDealt;
        const recoilDmg = Math.floor(dmgDealt * frac);
        if (recoilDmg > 0 && currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - recoilDmg);
          participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + recoilDmg;
        }
      }

      // 4. After-effect (on effect end)
      if (
        cons.type === 'after_effect' ||
        cons.type === 'after_effect_int2_3t' ||
        (cons.when === 'end' && (cons.attributeId === 'INT' || cons.consequence?.attributeId === 'INT'))
      ) {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'after_effect_modifier'
        );
        if (!alreadyHas) {
          const behaviorTurns = behavior.temporality?.duration?.turns ?? 2;
          participant.activeTimedEffects.push({
            id: `cons_after_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: {
              id: `eff_after_mod`,
              type: 'after_effect_modifier',
              attributeId: cons.attributeId ?? cons.consequence?.attributeId ?? 'INT',
              amount: cons.amount ?? cons.consequence?.amount ?? -2,
              turns: cons.turns ?? cons.consequence?.turns ?? 3,
            } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns: behaviorTurns } },
            remainingTurns: behaviorTurns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + behaviorTurns,
          });
        }
      }

      // 5. While active modifier
      if (
        cons.type === 'while_active_des2' ||
        cons.type === 'while_active_modifier' ||
        (cons.attributeId === 'DES' && cons.untilEnd) ||
        (cons.consequence?.attributeId === 'DES' && cons.consequence?.untilEnd)
      ) {
        if (!participant.activeModifiers) participant.activeModifiers = [];
        const attrId = cons.attributeId ?? cons.consequence?.attributeId ?? 'DES';
        const alreadyHas = participant.activeModifiers.some(
          m => m.sourceBehaviorId === behavior.id && m.attributeId === attrId
        );
        if (!alreadyHas) {
          const behaviorTurns = behavior.temporality?.duration?.turns ?? 1;
          participant.activeModifiers.push({
            id: `mod_while_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            attributeId: attrId,
            amount: cons.amount ?? cons.consequence?.amount ?? -2,
            untilEnd: true,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + behaviorTurns,
          });
        }
      }

      // 6. Threshold status (EST <= 5)
      if (
        cons.type === 'overheated_threshold' ||
        cons.type === 'resource_threshold_status' ||
        (cons.resourceId === 'ES' && (cons.threshold === 5 || cons.value === 5)) ||
        (cons.consequence?.statusElementId === 'core.status.sobrecalentado')
      ) {
        const esVal = currentSourceEntity?.resources.ES?.current ?? 30;
        const thresh = cons.threshold ?? cons.value ?? 5;
        if (esVal <= thresh && currentSourceEntity) {
          if (!currentSourceEntity.statuses) currentSourceEntity.statuses = [];
          if (!currentSourceEntity.statuses.some((s: any) => s.statusElementId === 'core.status.sobrecalentado' || s.id === 'core.status.sobrecalentado')) {
            currentSourceEntity.statuses.push({
              sourceId: sourceEntityId,
              statusElementId: 'core.status.sobrecalentado',
            });
          }
        }
      }
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

const CANONICAL_TRIGGER_EQUIVALENTS: Record<string, string[]> = {
  damage_received: ["damage_received", "receive_damage"],
  receive_damage: ["damage_received", "receive_damage"],
  damage_dealt: ["damage_dealt", "deal_damage"],
  deal_damage: ["damage_dealt", "deal_damage"],
  roll_resolved: ["roll_resolved", "roll", "roll_resolution"],
  roll: ["roll_resolved", "roll", "roll_resolution"],
  resource_changed: [
    "resource_changed",
    "spend_resource",
    "recover_resource",
    "lose_resource",
    "resource_threshold_crossed",
  ],
  spend_resource: ["spend_resource", "resource_changed"],
  recover_resource: ["recover_resource", "resource_changed"],
  lose_resource: ["lose_resource", "resource_changed"],
  status_applied: ["status_applied", "status_apply"],
  status_removed: ["status_removed"],
  behavior_resolved: ["behavior_resolved"],
  effect_ended: ["effect_ended", "end_element"],
  end_element: ["effect_ended", "end_element"],
};

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
    sourceEntityType: (event as any).sourceEntityType ?? (event as any).damage?.sourceEntityType ?? (event as any).payload?.sourceEntityType,
    targetEntityType: (event as any).targetEntityType,
    turn: (event as any).turn ?? currentEncounter.turn,
    timestamp: (event as any).timestamp ?? Date.now(),
    payload: event.payload ?? {},
    behavior: (event as any).behavior,
    roll: (event as any).roll ?? (options.rollResult !== undefined || options.dice ? { total: options.rollResult, dice: Array.isArray(options.dice) ? options.dice : (typeof options.dice === "number" ? [options.dice] : undefined) } : undefined),
    resource: (event as any).resource ?? (event.payload?.resourceId ? { resource: event.payload.resourceId as string, amount: event.payload.amount as number } : undefined),
    damage: (event as any).damage ?? (eventKind === "receive_damage" || eventKind === "damage_received" ? { amount: event.payload?.amount as number, sourceEntityId: event.sourceEntityId, sourceEntityType: (event as any).sourceEntityType ?? (event as any).payload?.sourceEntityType } : undefined),
    status: (event as any).status,
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

      // Match trigger kind (canonical aliases supported)
      const trigKind = behavior.trigger.kind;
      const matchesKind =
        trigKind === eventKind ||
        trigKind === (event as any).kind ||
        trigKind === (event as any).type ||
        Boolean(CANONICAL_TRIGGER_EQUIVALENTS[trigKind]?.includes(eventKind));

      if (!matchesKind) {
        continue;
      }

      // Check trigger filters
      if (behavior.trigger.filters) {
        const filters = behavior.trigger.filters;

        if (filters.sourceEntityType && filters.sourceEntityType.length > 0) {
          const rawSourceType =
            eventObj.sourceEntityType ??
            eventObj.damage?.sourceEntityType ??
            (eventObj.payload?.sourceEntityType as string | undefined) ??
            (eventObj.sourceEntityId && currentWorld[eventObj.sourceEntityId]
              ? ((currentWorld[eventObj.sourceEntityId] as any).entityKind ??
                 (currentWorld[eventObj.sourceEntityId] as any).kind ??
                 (eventObj.sourceEntityId === "enemy" ? "npc" : "character"))
              : undefined);

          if (!rawSourceType || !filters.sourceEntityType.includes(rawSourceType)) {
            continue;
          }
        }

        if (filters.origin && filters.origin.length > 0) {
          const rawOrigin = eventObj.damage?.origin ?? (eventObj.payload?.origin as string | undefined);
          if (!rawOrigin || !filters.origin.includes(rawOrigin)) {
            continue;
          }
        }

        if (filters.tags && filters.tags.length > 0) {
          const rawTags =
            (eventObj.payload?.tags as string[] | undefined) ??
            options.attackTags ??
            eventObj.behavior?.tags ??
            [];
          const hasTagMatch = filters.tags.some((t: string) => rawTags.includes(t));
          if (!hasTagMatch) {
            continue;
          }
        }

        if (filters.resourceId && filters.resourceId.length > 0) {
          const rawRes =
            eventObj.resource?.resource ??
            (eventObj.payload?.resourceId as string | undefined);
          if (!rawRes || !filters.resourceId.includes(rawRes)) {
            continue;
          }
        }
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

  // Synchronize while_condition states after reactive events
  for (const entityId of entitiesToCheck) {
    currentEncounter = syncWhileConditionEffects(
      entityId,
      ownedBehaviorsByEntity[entityId] ?? [],
      currentWorld,
      currentEncounter,
      options.signals
    );
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
      const rawP = p as any;
      const elemId = String(rawP.element?.id || rawP.possession?.elementId || rawP.elementId || rawP.id || '');
      const qty = rawP.possession?.quantity ?? rawP.quantity ?? 1;
      const isEquipped = rawP.possession?.equipped ?? rawP.equipped ?? false;
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

export interface TargetCandidateInfo {
  id: string;
  initiativeRoll?: number;
  initiativeStat?: number;
  int?: number;
  vel?: number;
}

export interface ExecuteMultiTargetBehaviorOptions {
  behavior: MechanicalBehavior;
  elementId?: string;
  sourceEntityId: string;
  targetEntityIds?: string[];
  candidateEntityIds?: string[];
  candidateInfo?: Record<string, Partial<TargetCandidateInfo>> | ((id: string) => Partial<TargetCandidateInfo>);
  manualSelectedIds?: string[];
  rng?: () => number;
  world: RuleWorld;
  encounter: EncounterRuntimeState;
  event?: MechanicalEvent;
  rollResult?: number;
  dice?: number | number[];
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
 * Resolves candidate entities down to the selected targets according to the 7-step pipeline:
 * 1. Filter out entities that do not exist or do not meet target relationship
 * 2. Determine capacity from target.quantity (mode "all" -> all, mode "up_to" -> count, default 1)
 * 3. If valid candidates <= capacity -> all valid candidates selected
 * 4. If valid candidates > capacity:
 *    - manual: validate manualSelectedIds (must be subset of valid candidates, no duplicates, count <= capacity)
 *    - random: pick capacity unique candidates using rng
 *    - standard_priority: sort ASC by (1) INI roll, (2) INI stat, (3) INT, (4) VEL, (5) stable ID ASC. Pick first N.
 */
export function resolveTargetCandidates(options: {
  candidateIds: string[];
  sourceEntityId: string;
  targetDef?: MechanicalTarget;
  world: RuleWorld;
  encounter?: EncounterRuntimeState;
  candidateInfo?: Record<string, Partial<TargetCandidateInfo>> | ((id: string) => Partial<TargetCandidateInfo>);
  manualSelectedIds?: string[];
  rng?: () => number;
}): { success: boolean; selectedIds: string[]; reasons?: string[] } {
  const {
    candidateIds,
    sourceEntityId,
    targetDef,
    world,
    encounter,
    candidateInfo,
    manualSelectedIds,
    rng = Math.random,
  } = options;

  // 1. Filter valid candidates by relationship
  const targetType = targetDef?.type ?? "ally";
  if (targetType === "self") {
    return { success: true, selectedIds: [sourceEntityId] };
  }

  const validCandidates: string[] = [];
  const dedupedCandidates = Array.from(new Set(candidateIds));

  for (const tid of dedupedCandidates) {
    const entity = world[tid];
    if (!entity) continue;
    const rel = resolveEntityRelationship(sourceEntityId, tid, world);

    if (targetType === "ally") {
      if (tid !== sourceEntityId && rel === "ally") {
        validCandidates.push(tid);
      }
    } else if (targetType === "enemy") {
      if (tid !== sourceEntityId && rel === "enemy") {
        validCandidates.push(tid);
      }
    } else {
      // character, any, object, etc.
      validCandidates.push(tid);
    }
  }

  // 2. Capacity
  const quantityDef = targetDef?.quantity;
  const isAll = quantityDef?.mode === "all" || targetDef?.type === "allies" || targetDef?.type === "enemies";
  if (isAll) {
    return { success: true, selectedIds: validCandidates };
  }

  const capacity = quantityDef?.count ?? 1;

  // 3. Apply selectionMode
  const selectionMode = targetDef?.selectionMode ?? "standard_priority";

  if (selectionMode === "manual") {
    if (!manualSelectedIds) {
      return {
        success: false,
        selectedIds: [],
        reasons: ["Selección manual requerida pero no se proporcionaron objetivos seleccionados."],
      };
    }
    const dedupedManual = Array.from(new Set(manualSelectedIds));
    if (dedupedManual.length > capacity) {
      return {
        success: false,
        selectedIds: [],
        reasons: [`La selección manual de ${dedupedManual.length} objetivos supera la capacidad máxima de ${capacity}.`],
      };
    }
    for (const id of dedupedManual) {
      if (!validCandidates.includes(id)) {
        return {
          success: false,
          selectedIds: [],
          reasons: [`El objetivo seleccionado '${id}' no pertenece al conjunto de candidatos válidos.`],
        };
      }
    }
    return { success: true, selectedIds: dedupedManual };
  }

  // If validCandidates <= capacity, return all
  if (validCandidates.length <= capacity) {
    return { success: true, selectedIds: validCandidates };
  }

  if (selectionMode === "random") {
    const pool = [...validCandidates];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { success: true, selectedIds: pool.slice(0, capacity) };
  }

  // standard_priority:
  // Sort ASC by:
  // 1. Resultado de INI actual más bajo
  // 2. Estadística derivada INI más baja
  // 3. INT más baja
  // 4. VEL más baja
  // 5. Stable ID ASC (localeCompare)
  const getCandidateData = (id: string): TargetCandidateInfo => {
    const extra = typeof candidateInfo === "function" ? candidateInfo(id) : candidateInfo?.[id];
    const entity = world[id];
    const participant = encounter?.participants[id];

    const iniRoll = extra?.initiativeRoll ?? (participant as any)?.initiativeRoll ?? (participant as any)?.currentInitiative ?? (entity as any)?.initiativeRoll ?? (entity as any)?.currentInitiative ?? 0;
    
    const int = extra?.int ?? entity?.attributes?.INT ?? entity?.attributes?.int ?? 0;
    const vel = extra?.vel ?? entity?.attributes?.VEL ?? entity?.attributes?.vel ?? 0;

    const baseIni = calculateBaseInitiative(int, vel);
    const iniStat = extra?.initiativeStat ?? (entity as any)?.stats?.INI ?? (entity as any)?.stats?.ini ?? (entity as any)?.derivedStats?.INI ?? baseIni;

    return {
      id,
      initiativeRoll: iniRoll,
      initiativeStat: iniStat,
      int,
      vel,
    };
  };

  const candidateDataList = validCandidates.map((id) => getCandidateData(id));

  candidateDataList.sort((a, b) => {
    // 1. INI roll ASC
    if ((a.initiativeRoll ?? 0) !== (b.initiativeRoll ?? 0)) {
      return (a.initiativeRoll ?? 0) - (b.initiativeRoll ?? 0);
    }
    // 2. INI stat ASC
    if ((a.initiativeStat ?? 0) !== (b.initiativeStat ?? 0)) {
      return (a.initiativeStat ?? 0) - (b.initiativeStat ?? 0);
    }
    // 3. INT ASC
    if ((a.int ?? 0) !== (b.int ?? 0)) {
      return (a.int ?? 0) - (b.int ?? 0);
    }
    // 4. VEL ASC
    if ((a.vel ?? 0) !== (b.vel ?? 0)) {
      return (a.vel ?? 0) - (b.vel ?? 0);
    }
    // 5. Stable ID ASC
    return a.id.localeCompare(b.id);
  });

  return {
    success: true,
    selectedIds: candidateDataList.slice(0, capacity).map((c) => c.id),
  };
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
    candidateEntityIds,
    candidateInfo,
    manualSelectedIds,
    rng,
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

  // 1. Resolve candidates or normalize target IDs
  let normalizedTargetIds: string[];
  if (candidateEntityIds !== undefined) {
    const candidateResolution = resolveTargetCandidates({
      candidateIds: candidateEntityIds,
      sourceEntityId,
      targetDef: behavior.target,
      world: newWorld,
      encounter: newEncounter,
      candidateInfo,
      manualSelectedIds,
      rng,
    });
    if (!candidateResolution.success) {
      return {
        success: false,
        reasons: candidateResolution.reasons ?? ["Failed to resolve candidates"],
        normalizedTargetIds: [],
        targetResults: {},
        usageConsumed: false,
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
    normalizedTargetIds = candidateResolution.selectedIds;
  } else {
    const rawTargets = targetEntityIds ?? [];
    normalizedTargetIds = Array.from(new Set(rawTargets));
  }

  if (normalizedTargetIds.length === 0) {
    if (candidateEntityIds !== undefined) {
      // Valid candidates were 0: affects 0 successfully without consuming invalid usage or failing
      return {
        success: true,
        reasons: [],
        normalizedTargetIds: [],
        targetResults: {},
        usageConsumed: true,
        newWorld,
        newEncounter,
        appliedEffects: [],
        emittedEvents: [],
      };
    }
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
    dice: Array.isArray(dice) ? dice : (typeof dice === "number" ? [dice] : undefined),
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
  let totalFinalDamageDealt = 0;
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
            } else if (typeof dice === "number") {
              baseHealing = dice;
            } else if (Array.isArray(dice) && dice.length > 0) {
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
          totalFinalDamageDealt += res.finalDamage;
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

  // 4b. Process Limitations (self_damage) & Consequences (Multi-target context)
  const currentSourceEntity = newWorld[sourceEntityId];
  if (Array.isArray(behavior.limitations)) {
    for (const lim of behavior.limitations) {
      if (!lim || lim.type !== 'self_damage') continue;
      const amt = lim.amount ?? 1;
      if (lim.frequency === 'on_activation') {
        if (currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - amt);
        }
        participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + amt;
      } else if (lim.frequency === 'each_active_turn') {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'self_damage_periodic'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 1;
          participant.activeTimedEffects.push({
            id: `self_dmg_turn_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_self_dmg_periodic`, type: 'self_damage_periodic', amount: amt } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            periodicity: { mode: 'each_turn' },
          });
        }
      } else if (lim.frequency === 'on_end') {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'self_damage_on_end'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 1;
          participant.activeTimedEffects.push({
            id: `self_dmg_end_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_self_dmg_end`, type: 'self_damage_on_end', amount: amt } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
          });
        }
      }
    }
  }
  if (Array.isArray(behavior.consequences)) {
    for (const cons of behavior.consequences) {
      if (!cons) continue;

      // 1. Fixed self damage (activation)
      if (
        cons.type === 'self_damage_fixed' ||
        cons.type === 'self_damage_fixed_2' ||
        (cons.type === 'resource' && cons.when === 'activation' && cons.amount === 2) ||
        (cons.type === 'hp_cost' && cons.amount === 2)
      ) {
        const amt = cons.amount ?? 2;
        if (currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - amt);
        }
        participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + amt;
      }

      // 2. Periodic self damage (each active turn)
      if (
        cons.type === 'self_damage_turn' ||
        (cons.type === 'resource' && cons.when === 'each_turn' && cons.amount === 1)
      ) {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'consequence_periodic_hp'
        );
        if (!alreadyHas) {
          const turns = behavior.temporality?.duration?.turns ?? 3;
          participant.activeTimedEffects.push({
            id: `cons_hp_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: { id: `eff_periodic_hp`, type: 'consequence_periodic_hp', amount: cons.amount ?? 1 } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns } },
            remainingTurns: turns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + turns,
            periodicity: { mode: 'each_turn' },
          });
        }
      }

      // 3. Recoil (after damage) - Multi-target sum
      if (
        cons.type === 'recoil_half' ||
        cons.type === 'recoil' ||
        cons.consequence?.kind === 'recoil' ||
        (cons.when === 'after_damage' && cons.consequence?.fraction === 0.5)
      ) {
        const frac = cons.fraction ?? cons.consequence?.fraction ?? 0.5;
        const dmgDealt = totalFinalDamageDealt;
        const recoilDmg = Math.floor(dmgDealt * frac);
        if (recoilDmg > 0 && currentSourceEntity) {
          currentSourceEntity.resources.SA.current = Math.max(0, currentSourceEntity.resources.SA.current - recoilDmg);
          participant.hpLostThisTurn = (participant.hpLostThisTurn ?? 0) + recoilDmg;
        }
      }

      // 4. After-effect (on effect end)
      if (
        cons.type === 'after_effect' ||
        cons.type === 'after_effect_int2_3t' ||
        (cons.when === 'end' && (cons.attributeId === 'INT' || cons.consequence?.attributeId === 'INT'))
      ) {
        if (!participant.activeTimedEffects) participant.activeTimedEffects = [];
        const alreadyHas = participant.activeTimedEffects.some(
          t => t.sourceBehaviorId === behavior.id && (t.effect as any).type === 'after_effect_modifier'
        );
        if (!alreadyHas) {
          const behaviorTurns = behavior.temporality?.duration?.turns ?? 2;
          participant.activeTimedEffects.push({
            id: `cons_after_${behavior.id}_${Date.now()}`,
            sourceBehaviorId: behavior.id,
            sourceEntityId,
            targetEntityId: sourceEntityId,
            effect: {
              id: `eff_after_mod`,
              type: 'after_effect_modifier',
              attributeId: cons.attributeId ?? cons.consequence?.attributeId ?? 'INT',
              amount: cons.amount ?? cons.consequence?.amount ?? -2,
              turns: cons.turns ?? cons.consequence?.turns ?? 3,
            } as any,
            temporality: behavior.temporality ?? { duration: { type: 'turns', turns: behaviorTurns } },
            remainingTurns: behaviorTurns,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + behaviorTurns,
          });
        }
      }

      // 5. While active modifier (DES -2)
      if (
        cons.type === 'while_active_modifier' ||
        cons.type === 'while_active_des2' ||
        (cons.attributeId === 'DES' && cons.untilEnd) ||
        (cons.consequence?.attributeId === 'DES' && cons.consequence?.untilEnd)
      ) {
        if (!participant.activeModifiers) participant.activeModifiers = [];
        const alreadyHas = participant.activeModifiers.some(
          m => m.sourceBehaviorId === behavior.id && m.attributeId === 'DES'
        );
        if (!alreadyHas) {
          const behaviorTurns = behavior.temporality?.duration?.turns ?? 2;
          participant.activeModifiers.push({
            id: `cons_active_mod_${behavior.id}`,
            sourceBehaviorId: behavior.id,
            attributeId: 'DES',
            amount: cons.amount ?? cons.consequence?.amount ?? -2,
            turns: behaviorTurns,
            untilEnd: true,
            appliedAtTurn: newEncounter.turn,
            expiresAtTurn: newEncounter.turn + behaviorTurns,
          });
        }
      }

      // 6. Threshold status (EST <= 5)
      if (
        cons.type === 'overheated_threshold' ||
        cons.type === 'resource_threshold_status' ||
        (cons.resourceId === 'ES' && (cons.threshold === 5 || cons.value === 5)) ||
        (cons.consequence?.statusElementId === 'core.status.sobrecalentado')
      ) {
        const esVal = currentSourceEntity?.resources.ES?.current ?? 30;
        const thresh = cons.threshold ?? cons.value ?? 5;
        if (esVal <= thresh && currentSourceEntity) {
          if (!currentSourceEntity.statuses) currentSourceEntity.statuses = [];
          if (!currentSourceEntity.statuses.some((s: any) => s.statusElementId === 'core.status.sobrecalentado' || s.id === 'core.status.sobrecalentado')) {
            currentSourceEntity.statuses.push({
              sourceId: behavior.id,
              statusElementId: 'core.status.sobrecalentado',
            });
          }
        }
      }
    }
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



