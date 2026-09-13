import { describe, expect, test } from 'vitest';
import { createCoreCategories } from '../coreRuleCatalog';
import { resolveAppliedMechanics } from '../systemMechanics';
import { applyRuleOperations, executeRuleGroup, expireRuleEffects, adjustedStaminaCost, type RuleWorld } from '../ruleExecution';
import { createRuleRuntime, type RuleContext } from '../ruleEngine';

const world = (): RuleWorld => ({ self: { resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } }, attributes: { FUE: 2 }, barrier: 0, modifiers: [], statuses: [], inventory: {} }, ally: { resources: { SA: { current: 10, max: 20 }, ES: { current: 5, max: 20 } }, attributes: { FUE: 2 }, barrier: 0, modifiers: [], statuses: [], inventory: {} } });
const context: RuleContext = { event: 'activate', eventId: 'e1', turn: 0, periods: { turn: 't1', combat: 'c1', mission: 'm1', day: 'd1' }, resources: world().self.resources, signals: [], dice: [], activeAbilities: [], inventory: {}, targets: [{ id: 'self', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: [] }] };
const refs = (...ids: string[]) => ids.map((id, i) => ({ applicationId: `a${i}`, mechanicId: `core.${id.slice(0, id.lastIndexOf('.'))}`, ruleId: `core.${id}` }));

describe('Atomic effect execution', () => {
  test('applies healing, barriers and resource payments to a clone', () => {
    const source = world();
    const result = applyRuleOperations(source, 'self', 'source', 0, [
      { kind: 'resource', resourceId: 'ES', amount: -2 },
      { kind: 'effect', targetId: 'ally', effect: { id: 'heal', type: 'healing', resourceId: 'ES', amount: 2, timing: 'on_activation', targeting: { allowedEntityKinds: ['character'], relationship: 'ally', selection: 'direct', minTargets: 1, maxTargets: 1 }, costRules: [] } },
    ]);
    expect(result.world.self.resources.ES.current).toBe(8);
    expect(result.world.ally.resources.ES.current).toBe(7);
    expect(source.self.resources.ES.current).toBe(10);
  });
  test('a missing damage roll rolls back resource payment and usage runtime', () => {
    const group = resolveAppliedMechanics(refs('damage.4d8', 'stamina_cost.base', 'usage.combat'), createCoreCategories()).groups[0];
    const state = createRuleRuntime(); const original = world();
    const result = executeRuleGroup(group, context, state, original, 'self', 'source');
    expect(result.valid).toBe(false); expect(result.world).toBe(original); expect(result.state).toBe(state);
  });
  test('validated individual dice apply damage and caps before barrier absorption', () => {
    const group = resolveAppliedMechanics(refs('damage.4d8'), createCoreCategories()).groups[0];
    group.components.push({ kind: 'cap', subject: 'damage', min: 0, max: 5 });
    const original = world(); original.self.barrier = 2;
    const result = executeRuleGroup(group, context, createRuleRuntime(), original, 'self', 'source', { a0: [8, 8, 8, 8] });
    expect(result.valid).toBe(true); expect(result.world.self.resources.SA.current).toBe(17); expect(result.damageDealt).toBe(3);
  });
  test('modifiers expire at the exact turn without modifying base attributes', () => {
    const group = resolveAppliedMechanics(refs('bonus.fue2', 'duration.2'), createCoreCategories()).groups[0];
    const result = executeRuleGroup(group, context, createRuleRuntime(), world(), 'self', 'source');
    expect(result.world.self.attributes.FUE).toBe(2);
    expect(result.world.self.modifiers[0].amount).toBe(2);
    expect(expireRuleEffects(result.world, 1).self.modifiers).toHaveLength(1);
    expect(expireRuleEffects(result.world, 2).self.modifiers).toHaveLength(0);
  });
  test('re-evaluating a passive replaces its projection rather than stacking', () => {
    const group = resolveAppliedMechanics(refs('bonus.fue2', 'activation.passive'), createCoreCategories()).groups[0];
    const c = { ...context, event: 'passive' as const };
    const first = executeRuleGroup(group, c, createRuleRuntime(), world(), 'self', 'passive');
    const second = executeRuleGroup(group, c, first.state, first.world, 'self', 'passive');
    expect(second.world.self.modifiers).toHaveLength(1);
    expect(second.world.self.resources.ES.current).toBe(10);
  });
  test('quirk adjustment only changes its matching scope and respects minimum', () => {
    expect(adjustedStaminaCost(2, 'quirk', [{ scopeId: 'quirk', amount: 1 }], 1)).toBe(3);
    expect(adjustedStaminaCost(2, 'object', [{ scopeId: 'quirk', amount: 1 }], 1)).toBe(2);
    expect(adjustedStaminaCost(2, 'quirk', [{ scopeId: 'quirk', amount: -5 }], 1)).toBe(1);
  });
});
