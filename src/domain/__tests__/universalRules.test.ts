import { describe, expect, test } from 'vitest';
import { createCoreCategories, migrateCoreCategories, validateCoreCategories } from '../coreRuleCatalog';
import { resolveAppliedMechanics, systemMechanicsConfigSchema, validatePersistedMechanicalEffects, calculateExecutionStaminaCost } from '../systemMechanics';
import { evaluateRuleGroup, type RuleContext } from '../ruleEngine';
import { ruleComponentSchema } from '../ruleComponents';

const categories = createCoreCategories();
const refs = (...ids: string[]) => ids.map((id, i) => ({ applicationId: `a${i}`, mechanicId: `core.${id.slice(0, id.lastIndexOf('.'))}`, ruleId: `core.${id}` }));
const group = (...ids: string[]) => {
  const result = resolveAppliedMechanics(refs(...ids), categories);
  expect(result.issues).toEqual([]);
  return result.groups[0];
};
const context = (patch: Partial<RuleContext> = {}): RuleContext => ({ event: 'activate', eventId: 'event1', turn: 0, periods: { turn: 't0', combat: 'c1', mission: 'm1', day: 'd1' }, resources: { ES: { current: 10, max: 20 }, SA: { current: 20, max: 20 } }, signals: [], dice: [], activeAbilities: [], inventory: {}, targets: [{ id: 'self', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: [] }], ...patch });
const allies = [1, 2, 3].map(i => ({ id: `ally${i}`, kind: 'character' as const, relationship: 'ally' as const, distance: 10, conscious: true, contacts: [] }));

describe('Core catalog and compatibility', () => {
  test('seeds all core categories with stable IDs, preserves edited options and is idempotent', () => {
    expect(validateCoreCategories(categories)).toBe(true);
    expect(categories).toHaveLength(35);
    const edited = structuredClone(categories); edited[0].name = 'Impacto'; edited[0].rules[0].cost = 0; edited[1].rules = [];
    expect(migrateCoreCategories(edited)).toEqual(edited);
    expect(validateCoreCategories(edited.slice(1))).toBe(false);
    expect(validateCoreCategories(edited.map((c, i) => i === 0 ? { ...c, coreKey: 'wrong' } : c))).toBe(false);
  });
  test('preserves original IDs during migration and fails on invalid existing data', () => {
    const legacy = { ...categories[0], id: 'old-damage', coreKey: undefined, rules: [{ id: 'old-option', name: 'Old', cost: 0, ruleType: 'cost_modifier' as const }] };
    expect(migrateCoreCategories([legacy])[0]).toEqual(legacy);
    expect(() => migrateCoreCategories([{ id: 'invalid' }])).toThrow();
  });
  test('reference save/reload/edit/reload never copies mechanics or changes IDs', () => {
    const original = { name: 'Bono', effects: refs('bonus.fue2', 'duration.2', 'target.allies', 'target_count.3') };
    const stored = JSON.parse(JSON.stringify(original));
    expect(validatePersistedMechanicalEffects(stored.effects).valid).toBe(true);
    stored.name = 'Bono renombrado';
    const reloaded = JSON.parse(JSON.stringify(stored));
    expect(reloaded.effects).toEqual(original.effects);
    expect(reloaded.effects[0]).not.toHaveProperty('amount');
    expect(resolveAppliedMechanics(reloaded.effects, categories).valid).toBe(true);
  });
  test('rejects broken, duplicate and conflicting references without returning executable effects', () => {
    const a = refs('bonus.fue2');
    expect(resolveAppliedMechanics([...a, ...a], categories).effects).toEqual([]);
    expect(resolveAppliedMechanics(refs('duration.2', 'duration.3'), categories).valid).toBe(false);
    expect(resolveAppliedMechanics(refs('bonus.missing'), categories).staminaCost).toBeNull();
    expect(resolveAppliedMechanics(refs('target.self', 'target_count.3'), categories).valid).toBe(false);
  });
  test('allows repeated options in separate groups but unique application IDs', () => {
    const a = refs('bonus.fue2');
    expect(resolveAppliedMechanics([...a, { ...a[0], applicationId: 'b', groupId: 'other' }], categories).groups).toHaveLength(2);
  });
  test('rejects illegal component shapes and malformed intervals', () => {
    expect(ruleComponentSchema.safeParse({ kind: 'cooldown', turns: -1 }).success).toBe(false);
    expect(ruleComponentSchema.safeParse({ kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 5, max: 1 }] }).success).toBe(false);
    expect(systemMechanicsConfigSchema.safeParse([{ ...categories[0], rules: [{ id: 'x', name: 'Bad', cost: 0, ruleType: 'component' }] }]).success).toBe(false);
  });
});

describe('Composed universal rules', () => {
  test('+2 FUE for 2 turns to up to 3 allies', () => {
    const g = group('bonus.fue2', 'duration.2', 'target.allies', 'target_count.3');
    const result = evaluateRuleGroup(g, context({ targets: allies }));
    expect(result.valid).toBe(true);
    expect(result.operations.filter(o => o.kind === 'effect')).toHaveLength(3);
    expect(g.effects[0]).toMatchObject({ amount: 2, duration: { value: 2, unit: 'turn' }, targeting: { relationship: 'ally', maxTargets: 3 } });
    expect(evaluateRuleGroup(g, context({ event: 'turn', eventId: 't2', turn: 2, targets: allies }), result.state).active).toBe(false);
    expect(evaluateRuleGroup(g, context({ targets: [...allies, { ...allies[0], id: 'fourth' }] })).valid).toBe(false);
  });
  test('Líder nato requires speech, heals 3 allies and resets use with combat identity', () => {
    const g = group('healing.es2', 'activation.speech', 'target.allies', 'target_count.3', 'usage.combat');
    expect(evaluateRuleGroup(g, context({ targets: allies })).valid).toBe(false);
    const c = context({ signals: ['speech'], targets: allies });
    const first = evaluateRuleGroup(g, c);
    expect(first.valid).toBe(true);
    expect(first.operations.filter(o => o.kind === 'effect')).toHaveLength(3);
    expect(evaluateRuleGroup(g, { ...c, eventId: 'again', turn: 1 }, first.state).valid).toBe(false);
    expect(evaluateRuleGroup(g, { ...c, eventId: 'nextCombat', turn: 3, periods: { ...c.periods, combat: 'c2' } }, first.state).valid).toBe(true);
  });
  test('Canalización Exigente projects +1 quirk cost at exactly 50% and deactivates above', () => {
    const g = group('cost_adjustment.quirk1', 'activation.passive', 'duration.while_condition', 'resource_threshold.es50');
    const c = context({ event: 'passive' });
    expect(evaluateRuleGroup(g, c).operations).toEqual([{ kind: 'cost_adjustment', scopeId: 'quirk', amount: 1 }]);
    expect(evaluateRuleGroup(g, { ...c, resources: { ...c.resources, ES: { current: 11, max: 20 } } }).active).toBe(false);
    expect(evaluateRuleGroup(g, c).state.phase).toBe('idle');
    expect(g.cost).toBe(0);
  });
  test('Emocionalidad Frágil uses individual dice AND emotion; manual result is never invented', () => {
    const g = group('manual_resolution.unstable', 'manual_condition.emotion', 'die_condition.1to5');
    expect(evaluateRuleGroup(g, context({ signals: ['intense_emotion'], dice: [20, 3] })).operations).toContainEqual({ kind: 'manual', message: 'El quirk se activa de forma inestable. El Master determina el efecto.' });
    expect(evaluateRuleGroup(g, context({ signals: [], dice: [3] })).valid).toBe(false);
    expect(evaluateRuleGroup(g, context({ signals: ['intense_emotion'], dice: [6, 7] })).valid).toBe(false);
  });
  test('delayed 4D8 and Aturdido in 50m resolve once after one turn', () => {
    const g = group('damage.4d8', 'status.stunned', 'activation.delay1', 'area.50', 'target.any', 'usage.combat');
    const c = context({ targets: allies });
    const first = evaluateRuleGroup(g, c);
    expect(first.state.phase).toBe('preparing');
    expect(first.operations.some(o => o.kind === 'effect')).toBe(false);
    const resolved = evaluateRuleGroup(g, { ...c, event: 'turn', eventId: 'turn1', turn: 1 }, first.state);
    expect(resolved.operations.filter(o => o.kind === 'effect')).toHaveLength(6);
    expect(evaluateRuleGroup(g, { ...c, event: 'turn', eventId: 'turn1', turn: 1 }, resolved.state).operations).toEqual([]);
    expect(evaluateRuleGroup(g, { ...c, targets: [{ ...allies[0], distance: 51 }] }).valid).toBe(false);
  });
  test('barrier cooldown is independent from duration: wait two full turns', () => {
    const g = group('barrier.30', 'cooldown.2'); const c = context();
    const first = evaluateRuleGroup(g, c);
    expect(first.state.phase).toBe('idle');
    expect(evaluateRuleGroup(g, { ...c, eventId: 't2', turn: 2 }, first.state).valid).toBe(false);
    expect(evaluateRuleGroup(g, { ...c, eventId: 't3', turn: 3 }, first.state).valid).toBe(true);
  });
  test('end penalty, per-turn damage and maintenance run at their distinct events', () => {
    const g = group('bonus.fue2', 'duration.2', 'maintenance.es1', 'per_turn_effect.hp1', 'end_effect.int2');
    const first = evaluateRuleGroup(g, context());
    const tick = evaluateRuleGroup(g, context({ event: 'turn', turn: 1, eventId: 't1' }), first.state);
    expect(tick.operations).toContainEqual({ kind: 'resource', resourceId: 'SA', amount: -1, unavoidable: true });
    expect(tick.operations).toContainEqual({ kind: 'resource', resourceId: 'ES', amount: -1 });
    const end = evaluateRuleGroup(g, context({ event: 'turn', turn: 2, eventId: 't2' }), tick.state);
    expect(end.operations).toContainEqual({ kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3 });
    expect(end.operations.some(o => o.kind === 'resource')).toBe(false);
  });
  test('insufficient resource or consumable rolls back usage and all operations', () => {
    const g = group('barrier.30', 'stamina_cost.base', 'usage.combat');
    const c = context(); c.resources.ES.current = 0;
    const result = evaluateRuleGroup(g, c);
    expect(result.valid).toBe(false); expect(result.state.uses).toEqual({}); expect(result.operations).toEqual([]);
    expect(evaluateRuleGroup(group('barrier.30', 'consumption.one'), context()).valid).toBe(false);
  });
  test('recoil uses damage after mitigation and floor rounding', () => {
    const g = group('damage.4d8', 'recoil.half');
    const first = evaluateRuleGroup(g, context());
    const hit = evaluateRuleGroup(g, context({ event: 'after_damage', eventId: 'hit1', damageDealt: 9 }), first.state);
    expect(hit.operations).toContainEqual({ kind: 'resource', resourceId: 'SA', amount: -4, unavoidable: true });
  });
});
