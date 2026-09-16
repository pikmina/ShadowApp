import { resolveAppliedMechanics, type AppliedMechanicReference, type CanonicalMechanicalEffect, type ResolvedRuleGroup, type SystemMechanicsConfig } from './systemMechanics';
import type { RuleComponent, RulePredicate } from './ruleComponents';

export type RuleActor = { id: string; kind: 'character' | 'npc'; relationship: 'self' | 'ally' | 'enemy'; distance: number; conscious: boolean; contacts: string[] };
export type RuleContext = {
  event: 'activate' | 'turn' | 'end' | 'passive' | 'after_damage' | 'hit' | 'critical' | 'fumble'; eventId: string; turn: number;
  periods: Record<'turn' | 'combat' | 'mission' | 'day', string>;
  resources: Record<'SA' | 'ES', { current: number; max: number }>;
  signals: string[]; dice: number[]; activeAbilities: string[]; inventory: Record<string, number>;
  targets: RuleActor[]; damageDealt?: number; minimumStamina?: number;
};
export type RuleRuntime = { phase: 'idle' | 'preparing' | 'active'; readyAt?: number; expiresAt?: number; cooldownUntil?: number; uses: Record<string, number>; processed: string[]; lastTurn?: number; awaitingResolution?: boolean };
export const createRuleRuntime = (): RuleRuntime => ({ phase: 'idle', uses: {}, processed: [] });
export type RuleOperation =
  | { kind: 'effect'; targetId: string; effect: CanonicalMechanicalEffect; cap?: { min: number; max: number } }
  | { kind: 'resource'; resourceId: 'ES' | 'SA'; amount: number; unavoidable?: boolean }
  | { kind: 'consume'; elementId: string; quantity: number }
  | { kind: 'attribute'; attributeId: string; amount: number; turns: number; untilEnd?: boolean }
  | { kind: 'status'; statusElementId: string; turns: number }
  | { kind: 'manual'; message: string }
  | { kind: 'cost_adjustment'; scopeId: string; amount: number };
export type RuleEvaluation = { valid: boolean; active: boolean; reasons: string[]; operations: RuleOperation[]; state: RuleRuntime };

export function evaluatePredicate(predicate: RulePredicate, context: RuleContext): boolean {
  switch (predicate.kind) {
    case 'manual': return context.signals.includes(predicate.signalId);
    case 'die': return context.dice.some(d => d >= predicate.min && d <= predicate.max);
    case 'ability_active': return context.activeAbilities.includes(predicate.abilityId);
    case 'item': return (context.inventory[predicate.elementId] ?? 0) >= predicate.quantity;
    case 'consumable': return (context.inventory[predicate.elementId] ?? 0) >= predicate.quantity;
    case 'conscious': return context.targets.length > 0 && context.targets.every(t => t.conscious);
    case 'contact': return context.targets.length > 0 && context.targets.every(t => t.contacts.includes(predicate.sense));
    case 'resource': {
      const resource = context.resources[predicate.resourceId];
      if (!resource || resource.max <= 0) return false;
      return predicate.comparison === 'lte' ? resource.current * 100 <= resource.max * predicate.percent : resource.current * 100 >= resource.max * predicate.percent;
    }
  }
}

/** Pure transaction plan. Callers commit state and operations together, never during hydration.
 * Dice, damage after mitigation, scene IDs and narrative signals are explicit inputs.
 * Passive evaluations are replaceable projections, not repeatable resource mutations. */
export function evaluateRuleGroup(group: ResolvedRuleGroup, context: RuleContext, previous: RuleRuntime = createRuleRuntime()): RuleEvaluation {
  const state = structuredClone(previous);
  const operations: RuleOperation[] = [];
  const reject = (...reasons: string[]): RuleEvaluation => ({ valid: false, active: false, reasons, operations: [], state: previous });
  if (context.event !== 'passive' && state.processed.includes(context.eventId)) return { valid: true, active: state.phase === 'active', reasons: ['Evento ya procesado'], operations: [], state: previous };
  const components = group.components;
  const activation = components.find(c => c.kind === 'activation');
  const duration = components.find(c => c.kind === 'duration')?.duration;
  const conditions = components.filter(c => c.kind === 'condition');
  const checkPredicate = (p: RulePredicate): boolean => {
    if (p.kind === 'consumable' && (state.phase === 'preparing' || state.phase === 'active')) {
      return true;
    }
    return evaluatePredicate(p, context);
  };
  const passed = conditions.every(c => c.match === 'all' ? c.predicates.every(p => checkPredicate(p)) : c.predicates.some(p => checkPredicate(p)));
  const isPassive = activation?.passive || group.effects.length > 0 && group.effects.every(e => e.timing === 'passive');
  const resource = (resourceId: 'SA' | 'ES', amount: number, unavoidable = false) => operations.push({ kind: 'resource', resourceId, amount, ...(unavoidable ? { unavoidable: true } : {}) });
  const consequences = (when: 'activation' | 'each_turn' | 'end' | 'after_damage') => {
    for (const c of components) if (c.kind === 'consequence' && c.when === when) {
      const value = c.consequence;
      if (value.kind === 'resource') resource(value.resourceId, -value.amount, c.role === 'consequence');
      else if (value.kind === 'recoil') resource('SA', -Math.floor((context.damageDealt ?? 0) * value.fraction), true);
      else operations.push(value);
    }
  };
  const targetsValid = () => {
    const selection = components.find(c => c.kind === 'target');
    const count = components.find(c => c.kind === 'target_count');
    const range = components.find(c => c.kind === 'range');
    const area = components.find(c => c.kind === 'area');
    if (new Set(context.targets.map(t => t.id)).size !== context.targets.length) return false;
    return group.effects.every(effect => {
      const targeting = effect.targeting;
      if (context.targets.length < (count?.min ?? targeting.minTargets) || context.targets.length > (count?.max ?? targeting.maxTargets ?? Infinity)) return false;
      return context.targets.every(t => targeting.allowedEntityKinds.includes(t.kind) && (selection ? t.relationship === 'self' ? selection.self : t.relationship === 'ally' ? selection.allies : selection.enemies : targeting.relationship === 'any' || t.relationship === targeting.relationship) && (!range || t.distance <= range.meters) && (!area || t.distance <= area.radius));
    });
  };
  const emitEffects = (moment: CanonicalMechanicalEffect['timing'] = 'on_activation') => {
    for (const original of group.effects) {
      if (original.timing !== moment && !(moment === 'each_turn' && original.timing === 'turn_start')) continue;
      const effect = structuredClone(original);
      for (const c of components) if (c.kind === 'cap' && c.subject !== 'attribute_modifier' && c.subject === effect.type && 'amount' in effect) effect.amount = Math.max(c.min, Math.min(c.max, effect.amount));
      if (effect.type === 'manual_resolution') operations.push({ kind: 'manual', message: effect.message });
      else if (effect.type === 'cost_adjustment') operations.push({ kind: 'cost_adjustment', scopeId: effect.scopeId, amount: effect.amount });
      else for (const target of context.targets) { const cap = components.find(c => c.kind === 'cap' && c.subject === effect.type); operations.push({ kind: 'effect', targetId: target.id, effect, ...(cap?.kind === 'cap' ? { cap: { min: cap.min, max: cap.max } } : {}) }); }
    }
  };
  const finish = () => { emitEffects('after_effect'); consequences('end'); state.phase = 'idle'; state.awaitingResolution = false; delete state.expiresAt; delete state.readyAt; };
  if (context.event === 'passive') {
    if (!isPassive) return reject('El grupo no es pasivo');
    if (group.effects.some(e => ['damage', 'healing', 'barrier', 'currency'].includes(e.type))) return reject('Los pasivos no ejecutan cambios instantáneos de recursos');
    if (passed && targetsValid()) emitEffects('passive');
    return { valid: true, active: passed && targetsValid(), reasons: passed ? [] : ['Condición inactiva'], operations, state: previous };
  }
  if (isPassive) return reject('Los pasivos solo se evalúan como proyección');
  if (context.event === 'activate') {
    if (state.phase !== 'idle') return reject('Ya está activo o preparando');
    if (!passed) return reject('No se cumplen las condiciones/requisitos');
    if (!targetsValid()) return reject('Selección de objetivos inválida');
    if (context.turn < (state.cooldownUntil ?? -Infinity)) return reject('Cooldown activo');
    if (activation?.signalId && !context.signals.includes(activation.signalId)) return reject('Falta la acción manual');
    for (const c of components) if (c.kind === 'usage') {
      if (!context.periods[c.period]) return reject(`Falta el identificador de ${c.period}`);
      const key = `${c.period}:${context.periods[c.period]}`;
      if ((state.uses[key] ?? 0) >= c.max) return reject('Límite de uso alcanzado');
      state.uses[key] = (state.uses[key] ?? 0) + 1;
    }
    let ce = Math.max(context.minimumStamina ?? 0, group.cost);
    for (const c of components) if (c.kind === 'cap' && c.subject === 'stamina_cost') ce = Math.max(context.minimumStamina ?? 0, c.min, Math.min(c.max, ce));
    resource('ES', -ce);
    for (const c of conditions) {
      if (c.match === 'all') {
        for (const p of c.predicates) {
          if (p.kind === 'consumable') operations.push({ kind: 'consume', elementId: p.elementId, quantity: p.quantity });
        }
      } else {
        const passedPred = c.predicates.find(p => evaluatePredicate(p, context));
        if (passedPred && passedPred.kind === 'consumable') {
          operations.push({ kind: 'consume', elementId: passedPred.elementId, quantity: passedPred.quantity });
        }
      }
    }
    consequences('activation');
    state.readyAt = context.turn + (activation?.turns ?? 0);
    const cooldown = components.find(c => c.kind === 'cooldown');
    state.cooldownUntil = context.turn + (cooldown ? cooldown.turns + 1 : 0);
    state.awaitingResolution = group.effects.some(e => ['on_hit', 'on_critical', 'on_fumble'].includes(e.timing));
    state.phase = state.readyAt > context.turn ? 'preparing' : 'active';
    if (state.phase === 'active') {
      emitEffects();
      state.lastTurn = context.turn;
      if (duration?.mode === 'turns') state.expiresAt = context.turn + duration.turns;
      if ((!duration || duration.mode === 'instant') && !state.awaitingResolution) finish();
    }
  } else if (context.event === 'end') {
    if (state.phase === 'idle') return reject('No hay efecto activo');
    finish();
  } else if (context.event === 'hit' || context.event === 'critical' || context.event === 'fumble') {
    if (state.phase !== 'active' || !state.awaitingResolution || !passed || !targetsValid()) return reject('No hay activación válida para el disparador');
    if (context.event === 'critical') emitEffects('on_hit');
    emitEffects(context.event === 'hit' ? 'on_hit' : context.event === 'critical' ? 'on_critical' : 'on_fumble');
    state.awaitingResolution = false;
    if (!duration || duration.mode === 'instant') finish();
  } else if (context.event === 'after_damage') {
    if (context.damageDealt === undefined || context.damageDealt < 0) return reject('Falta el daño provocado tras mitigación');
    if (!state.processed.length) return reject('No hay activación previa');
    consequences('after_damage');
  } else {
    if (state.phase === 'idle') return reject('No hay efecto activo');
    if (state.lastTurn !== undefined && context.turn <= state.lastTurn) return reject('Turno ya procesado');
    if (state.expiresAt !== undefined && context.turn >= state.expiresAt || duration?.mode === 'while_condition' && !passed) finish();
    else if (state.phase === 'preparing') {
      if (context.turn >= (state.readyAt ?? Infinity)) {
        if (!passed || !targetsValid()) return reject('Requisitos u objetivos inválidos al resolver');
        state.phase = 'active'; emitEffects();
        if (duration?.mode === 'turns') state.expiresAt = context.turn + duration.turns;
        if ((!duration || duration.mode === 'instant') && !state.awaitingResolution) finish();
      }
    } else {
      if (!targetsValid()) return reject('Objetivos inválidos');
      for (const c of components) if (c.kind === 'maintenance') resource(c.resourceId, -c.amount);
      consequences('each_turn'); emitEffects('each_turn');
    }
    state.lastTurn = context.turn;
  }
  for (const resourceId of ['ES', 'SA'] as const) {
    const payment = -operations.filter((o): o is Extract<RuleOperation, {kind: 'resource'}> => o.kind === 'resource' && o.resourceId === resourceId && !o.unavoidable).reduce((sum, o) => sum + o.amount, 0);
    if (payment > context.resources[resourceId].current) return reject(`Recurso insuficiente: ${resourceId}`);
  }
  const consumed = new Map<string, number>();
  for (const o of operations) if (o.kind === 'consume') consumed.set(o.elementId, (consumed.get(o.elementId) ?? 0) + o.quantity);
  for (const [id, quantity] of consumed) if ((context.inventory[id] ?? 0) < quantity) return reject(`No se puede consumir: ${id}`);
  state.processed.push(context.eventId);
  return { valid: true, active: state.phase === 'active', reasons: [], operations, state };
}

export function resolvePassiveEffects(references: AppliedMechanicReference[], categories: SystemMechanicsConfig, context: RuleContext): CanonicalMechanicalEffect[] {
  const resolution = resolveAppliedMechanics(references, categories);
  if (!resolution.valid) return [];
  return resolution.groups.flatMap(group => evaluateRuleGroup({ ...group, effects: group.effects.filter(e => e.timing === 'passive') }, { ...context, event: 'passive' }).operations.flatMap(op => op.kind === 'effect' ? [op.effect] : []));
}
