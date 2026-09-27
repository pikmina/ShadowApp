import { evaluateRuleGroup, type RuleContext, type RuleRuntime } from './ruleEngine';
import type { ResolvedRuleGroup } from './systemMechanics';
import type { RuleOperation } from './ruleEngine';

export type RuleEntityState = {
  id?: string;
  name?: string;
  level?: number;
  rank?: string;
  faction?: string;
  resources: Record<'SA' | 'ES', { current: number; max: number }>;
  barrier: number;
  barriers?: Array<{ sourceId: string; amount: number; expiresAt?: number; cap?: { min: number; max: number } }>;
  attributes: Record<string, number>;
  modifiers: Array<{ sourceId: string; statId: string; amount: number; expiresAt?: number; cap?: { min: number; max: number } }>;
  statuses: Array<{ sourceId: string; statusElementId: string; expiresAt?: number }>;
  inventory: Record<string, number>;
  equippedItems?: Record<string, boolean> | string[];
};
export type RuleWorld = Record<string, RuleEntityState>;

/** Applies an evaluated batch to a clone, so failure cannot partially consume resources.
 * The caller supplies verified rolls by application ID; no random or narrative result is invented.
 * Persist the returned world and evaluator runtime in the same transaction. */
export function applyRuleOperations(world: RuleWorld, bearerId: string, sourceId: string, turn: number, operations: RuleOperation[], rolls: Record<string, number[]> = {}) {
  const next = structuredClone(world);
  const manual: string[] = [];
  const adjustments: Array<{ scopeId: string; amount: number }> = [];
  let damageDealt = 0;
  if (!next[bearerId]) throw new Error('Unknown bearer');
  const debit = (entity: RuleEntityState, resourceId: 'SA' | 'ES', amount: number) => {
    if (entity.resources[resourceId].current + amount < 0) throw new Error('Insufficient resource');
    entity.resources[resourceId].current = Math.min(entity.resources[resourceId].max, entity.resources[resourceId].current + amount);
  };
  for (const op of operations) {
    const bearer = next[bearerId];
    if (op.kind === 'resource') {
      if (op.unavoidable) {
        const changed = Math.min(bearer.resources[op.resourceId].max, bearer.resources[op.resourceId].current + op.amount);
        bearer.resources[op.resourceId].current = op.resourceId === "SA" ? changed : Math.max(0, changed);
      }
      else debit(bearer, op.resourceId, op.amount);
    }
    else if (op.kind === 'consume') {
      if ((bearer.inventory[op.elementId] ?? 0) < op.quantity) throw new Error('Insufficient inventory');
      bearer.inventory[op.elementId] -= op.quantity;
    } else if (op.kind === 'manual') manual.push(op.message);
    else if (op.kind === 'cost_adjustment') adjustments.push({ scopeId: op.scopeId, amount: op.amount });
    else if (op.kind === 'attribute') bearer.modifiers.push({ sourceId, statId: op.attributeId, amount: op.amount, expiresAt: op.untilEnd ? undefined : turn + op.turns });
    else if (op.kind === 'status') bearer.statuses.push({ sourceId, statusElementId: op.statusElementId, expiresAt: turn + op.turns });
    else {
      const entity = next[op.targetId];
      if (!entity) throw new Error('Unknown target');
      const effect = op.effect;
      const expiresAt = effect.duration?.unit === 'turn' ? turn + effect.duration.value : undefined;
      switch (effect.type) {
        case 'damage': {
          const match = /^(\d+)[dD](\d+)$/.exec(effect.dice);
          if (!match) throw new Error('Unsupported damage dice');
          const dice = rolls[effect.id];
          if (!dice || dice.length !== Number(match[1]) || dice.some(d => !Number.isInteger(d) || d < 1 || d > Number(match[2]))) throw new Error('Missing or invalid individual damage dice');
          const rolled = dice.reduce((sum, d) => sum + d, 0);
          const total = op.cap ? Math.max(op.cap.min, Math.min(op.cap.max, rolled)) : rolled;
          const absorbed = Math.min(entity.barrier, total);
          let fromLayers = Math.max(0, absorbed - (entity.barrier - (entity.barriers ?? []).reduce((sum, layer) => sum + layer.amount, 0)));
          for (const layer of entity.barriers ?? []) { const used = Math.min(layer.amount, fromLayers); layer.amount -= used; fromLayers -= used; }
          entity.barrier -= absorbed;
          const damage = total - absorbed;
          entity.resources.SA.current -= damage; damageDealt += damage;
          break;
        }
        case 'healing': {
          const isDice = (effect as any).magnitude?.kind === 'dice' || (effect as any).kind === 'dice' || Boolean((effect as any).dice) || Boolean((effect as any).formula);
          if (isDice) {
            const formula = (effect as any).magnitude?.formula ?? (effect as any).formula ?? (effect as any).dice;
            const match = /^(\d+)[dD](\d+)$/.exec(formula);
            if (!match) throw new Error('Unsupported healing dice');
            const dice = rolls[effect.id];
            if (!dice || dice.length !== Number(match[1]) || dice.some(d => !Number.isInteger(d) || d < 1 || d > Number(match[2]))) {
              throw new Error('Missing or invalid individual healing dice');
            }
            const rolled = dice.reduce((sum, d) => sum + d, 0);
            const total = op.cap ? Math.max(op.cap.min, Math.min(op.cap.max, rolled)) : rolled;
            debit(entity, effect.resourceId, total);
          } else {
            const amt = (effect as any).magnitude?.amount ?? effect.amount;
            debit(entity, effect.resourceId, amt);
          }
          break;
        }
        case 'barrier': entity.barrier += effect.amount; (entity.barriers ??= []).push({ sourceId, amount: effect.amount, expiresAt, ...(op.cap ? { cap: op.cap } : {}) }); break;
        case 'attribute_modifier': case 'derived_stat_modifier':
          entity.modifiers.push({ sourceId, statId: effect.type === 'attribute_modifier' ? effect.attributeId : effect.statId, amount: effect.amount, expiresAt, ...(op.cap ? { cap: op.cap } : {}) }); break;
        case 'status': entity.statuses.push({ sourceId, statusElementId: effect.statusElementId, expiresAt }); break;
        case 'manual_resolution': manual.push(effect.message); break;
        case 'cost_adjustment': adjustments.push({ scopeId: effect.scopeId, amount: effect.amount }); break;
        case 'choice': manual.push(`Elección pendiente: ${effect.options.join(', ')}`); break;
        case 'rule_override': manual.push(`Resolución de regla requerida: ${effect.ruleId}`); break;
        case 'currency': throw new Error('Currency requires the economy transaction service');
      }
    }
  }
  return { world: next, manual, adjustments, damageDealt };
}

export function expireRuleEffects(world: RuleWorld, turn: number, endedSourceIds: string[] = []): RuleWorld {
  const next = structuredClone(world);
  for (const entity of Object.values(next)) {
    const keep = (effect: { sourceId: string; expiresAt?: number }) => !endedSourceIds.includes(effect.sourceId) && (effect.expiresAt === undefined || effect.expiresAt > turn);
    for (const layer of entity.barriers ?? []) if (!keep(layer)) entity.barrier -= layer.amount;
    entity.barriers = entity.barriers?.filter(keep);
    entity.modifiers = entity.modifiers.filter(keep);
    entity.statuses = entity.statuses.filter(keep);
  }
  return next;
}

export function adjustedStaminaCost(base: number, scopeId: string, adjustments: Array<{ scopeId: string; amount: number }>, minimum = 0): number {
  return Math.max(minimum, base + adjustments.filter(a => a.scopeId === scopeId).reduce((sum, a) => sum + a.amount, 0));
}

/** Single atomic pure entry point for a resolved group and its execution state. */
export function executeRuleGroup(group: ResolvedRuleGroup, context: RuleContext, previous: RuleRuntime, world: RuleWorld, bearerId: string, sourceId: string, rolls: Record<string, number[]> = {}) {
  const result = evaluateRuleGroup(group, context, previous);
  if (!result.valid) return { ...result, world, manual: [], adjustments: [], damageDealt: 0 };
  try {
    // A passive is a fresh projection. Replacing its source prevents stacking on repeated reads.
    const ended = context.event === 'passive' || previous.phase !== 'idle' && result.state.phase === 'idle';
    const base = expireRuleEffects(world, context.turn, ended ? [sourceId] : []);
    const applied = applyRuleOperations(base, bearerId, sourceId, context.turn, result.operations, rolls);
    return { ...result, ...applied };
  } catch (error) {
    return { valid: false, active: previous.phase === 'active', reasons: [error instanceof Error ? error.message : 'Execution failed'], operations: [], state: previous, world, manual: [], adjustments: [], damageDealt: 0 };
  }
}

export function projectRuleAttributes(entity: RuleEntityState, turn: number): Record<string, number> {
  const values = { ...entity.attributes };
  const ids = new Set(entity.modifiers.map(m => m.statId));
  for (const id of ids) {
    const modifiers = entity.modifiers.filter(m => m.statId === id && (m.expiresAt === undefined || m.expiresAt > turn));
    const sum = modifiers.reduce((total, m) => total + m.amount, 0);
    const min = Math.max(-Infinity, ...modifiers.flatMap(m => m.cap ? [m.cap.min] : []));
    const max = Math.min(Infinity, ...modifiers.flatMap(m => m.cap ? [m.cap.max] : []));
    if (min > max) throw new Error('Incompatible modifier caps');
    values[id] = (values[id] ?? 0) + Math.max(min, Math.min(max, sum));
  }
  return values;
}
