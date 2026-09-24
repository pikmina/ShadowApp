import { expect, test } from 'vitest';
import { executeRuleSet } from '../executeRuleSet';
import { createCoreCategories } from '../coreRuleCatalog';
import { resolveAppliedMechanics } from '../systemMechanics';
import { evaluatePredicate, evaluateRuleGroup, createRuleRuntime, type RuleContext } from '../ruleEngine';
import { executeRuleGroup, expireRuleEffects, projectRuleAttributes, type RuleWorld } from '../ruleExecution';

const categories = createCoreCategories();
const actor = () => ({ resources: { ES: { current: 20, max: 20 }, SA: { current: 20, max: 20 } }, attributes: { FUE: 1 }, modifiers: [], statuses: [], barrier: 0, inventory: {} });
const world = (): RuleWorld => ({ self: actor() });
const c: RuleContext = { event: 'activate', eventId: 'event', turn: 0, periods: { turn: 't', combat: 'c', mission: 'm', day: 'd' }, resources: actor().resources, targets: [{ id: 'self', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: ['physical'] }], signals: [], dice: [], inventory: {}, activeAbilities: [] };
const refs = (...ids: string[]) => ids.map((id, i) => ({ applicationId: `a${i}`, mechanicId: `core.${id.slice(0, id.lastIndexOf('.'))}`, ruleId: `core.${id}` }));

test('multiple groups charge contextual minimum only once and replay does not charge again', () => {
  const references = [...refs('barrier.30'), { ...refs('healing.es2')[0], applicationId: 'b', groupId: 'second' }];
  const first = executeRuleSet(references, categories, { ...c, minimumStamina: 5 }, {}, world(), 'self', 'source');
  expect(first.valid).toBe(true);
  expect(first.world.self.resources.ES.current).toBe(17); // 20 - 5 + 2
  const replay = executeRuleSet(references, categories, { ...c, minimumStamina: 5 }, first.states, first.world, 'self', 'source');
  expect(replay.world).toEqual(first.world);
});
test('failed second group rolls back all groups, resource payments and usage', () => {
  const references = [...refs('barrier.30'), { ...refs('damage.4d8')[0], applicationId: 'b', groupId: 'second' }];
  const before = world();
  const result = executeRuleSet(references, categories, { ...c, minimumStamina: 3 }, {}, before, 'self', 'source');
  expect(result.valid).toBe(false); expect(result.world).toBe(before); expect(result.states).toEqual({});
});
test('physical, visual, auditory, conscious, inventory and ability predicates use explicit facts', () => {
  expect(evaluatePredicate({ kind: 'contact', sense: 'physical' }, c)).toBe(true);
  expect(evaluatePredicate({ kind: 'contact', sense: 'visual' }, c)).toBe(false);
  expect(evaluatePredicate({ kind: 'contact', sense: 'auditory' }, c)).toBe(false);
  expect(evaluatePredicate({ kind: 'conscious' }, c)).toBe(true);
  expect(evaluatePredicate({ kind: 'item', elementId: 'medicine', quantity: 1 }, c)).toBe(false);
  expect(evaluatePredicate({ kind: 'ability_active', abilityId: 'a' }, { ...c, activeAbilities: ['a'] })).toBe(true);
});
test('OR conditions pass when one explicit predicate passes', () => {
  const group = resolveAppliedMechanics(refs('barrier.30'), categories).groups[0];
  group.components.push({ kind: 'condition', role: 'requirement', match: 'any', predicates: [{ kind: 'manual', signalId: 'no' }, { kind: 'contact', sense: 'physical' }] });
  expect(evaluateRuleGroup(group, c).valid).toBe(true);
});
test('on-hit effect waits for the hit and cannot resolve twice with a different event ID', () => {
  const config = structuredClone(categories);
  config[0].rules[0].effect!.timing = 'on_hit';
  const group = resolveAppliedMechanics(refs('damage.4d8'), config).groups[0];
  const activation = evaluateRuleGroup(group, c);
  expect(activation.operations.some(o => o.kind === 'effect')).toBe(false);
  const hit = evaluateRuleGroup(group, { ...c, event: 'hit', eventId: 'hit' }, activation.state);
  expect(hit.operations.some(o => o.kind === 'effect')).toBe(true);
  expect(evaluateRuleGroup(group, { ...c, event: 'hit', eventId: 'hit-again' }, hit.state).valid).toBe(false);
});
test('barrier duration removes remaining shield, never restores absorbed damage', () => {
  const group = resolveAppliedMechanics(refs('barrier.30', 'duration.2'), categories).groups[0];
  const applied = executeRuleGroup(group, c, createRuleRuntime(), world(), 'self', 'shield');
  expect(applied.world.self.barrier).toBe(30);
  expect(expireRuleEffects(applied.world, 2).self.barrier).toBe(0);
});
test('modifier caps clamp the combined modifier, not every contribution separately', () => {
  const entity = actor() as RuleWorld[string];
  entity.modifiers = [{ sourceId: 'a', statId: 'FUE', amount: 2, cap: { min: -1, max: 3 } }, { sourceId: 'b', statId: 'FUE', amount: 2 }];
  expect(projectRuleAttributes(entity, 0).FUE).toBe(4); // base 1 + capped modifier 3
  expect(entity.attributes.FUE).toBe(1);
});

test('health cost is a consequence, not an affordability requirement', () => {
  const group = resolveAppliedMechanics(refs('barrier.30', 'health_cost.base'), categories).groups[0];
  const before = world(); before.self.resources.SA.current = 0;
  const result = executeRuleGroup(group, { ...c, resources: before.self.resources }, createRuleRuntime(), before, 'self', 'source');
  expect(result.valid).toBe(true); expect(result.world.self.resources.SA.current).toBe(-1);
});
