import { resolveAppliedMechanics, type AppliedMechanicReference, type SystemMechanicsConfig } from './systemMechanics';
import { createRuleRuntime, type RuleContext, type RuleRuntime } from './ruleEngine';
import { applyRuleOperations, executeRuleGroup, type RuleWorld } from './ruleExecution';

/** Executes an entity's groups atomically. The contextual minimum is charged once per
 * action, including when the entity combines several independently timed effects. */
export function executeRuleSet(
  references: AppliedMechanicReference[], categories: SystemMechanicsConfig,
  context: RuleContext, states: Record<string, RuleRuntime>, world: RuleWorld,
  bearerId: string, sourceId: string, rolls: Record<string, number[]> = {},
) {
  const resolution = resolveAppliedMechanics(references, categories);
  const fail = (reasons: string[]) => ({ valid: false, reasons, world, states, manual: [] as string[], adjustments: [] as Array<{scopeId: string; amount: number}>, damageDealt: 0 });
  if (!resolution.valid) return fail(resolution.issues.map(i => i.code));
  let nextWorld = structuredClone(world);
  const nextStates = structuredClone(states);
  const manual: string[] = [];
  const adjustments: Array<{scopeId: string; amount: number}> = [];
  let damageDealt = 0;
  const groups = resolution.groups.filter(g => context.event === 'passive' ? g.effects.some(e => e.timing === 'passive') : !g.effects.length || g.effects.some(e => e.timing !== 'passive'));
  const pending = groups.filter(g => context.event === 'passive' || !(states[g.id]?.processed.includes(context.eventId)));
  if (context.event === 'activate' && pending.length) {
    const total = pending.reduce((sum, g) => {
      const cap = g.components.find(c => c.kind === 'cap' && c.subject === 'stamina_cost');
      return sum + (cap?.kind === 'cap' ? Math.max(cap.min, Math.min(cap.max, g.cost)) : g.cost);
    }, 0);
    try { nextWorld = applyRuleOperations(nextWorld, bearerId, sourceId, context.turn, [{ kind: 'resource', resourceId: 'ES', amount: -Math.max(context.minimumStamina ?? 0, total) }]).world; }
    catch (error) { return fail([error instanceof Error ? error.message : 'Payment failed']); }
  }
  for (const group of pending) {
    // CE has already been reserved once for the whole action. Explicit resource costs remain.
    const localGroup = context.event === 'passive' ? { ...group, effects: group.effects.filter(e => e.timing === 'passive') } : context.event === 'activate' ? { ...group, cost: 0, components: group.components.filter(c => c.kind !== 'cap' || c.subject !== 'stamina_cost') } : group;
    const result = executeRuleGroup(localGroup, { ...context, minimumStamina: 0, resources: nextWorld[bearerId].resources, inventory: nextWorld[bearerId].inventory }, nextStates[group.id] ?? createRuleRuntime(), nextWorld, bearerId, `${sourceId}:${group.id}`, rolls);
    if (!result.valid) return fail(result.reasons);
    nextWorld = result.world; nextStates[group.id] = result.state;
    manual.push(...result.manual); adjustments.push(...result.adjustments); damageDealt += result.damageDealt;
  }
  return { valid: true, reasons: [], world: nextWorld, states: nextStates, manual, adjustments, damageDealt };
}
