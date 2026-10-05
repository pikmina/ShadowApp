import { describe, it, expect } from 'vitest';
import { CORE_ALTERED_STATUSES } from '../systemWeaknesses';
import { createCoreCategories } from '../coreRuleCatalog';
import { findStatusOption, findStatusRemoveOption } from '../systemMechanics';
import { getStatusDamageTypeColor } from '../../components/character/ModifierBadge';
import { advanceTurn, shouldRemoveStatus } from '../mechanicalRuntime';

describe('Phase 5: End-to-End System Manual, UI Badges & Full Lifecycle Verification', () => {
  it('A. verifies status damage type color mapping helper for UI badges', () => {
    expect(getStatusDamageTypeColor('quemadura')).toContain('orange');
    expect(getStatusDamageTypeColor('congelado')).toContain('cyan');
    expect(getStatusDamageTypeColor('electrocutado')).toContain('yellow');
    expect(getStatusDamageTypeColor('veneno')).toContain('lime');
    expect(getStatusDamageTypeColor('berserker')).toContain('purple');
    expect(getStatusDamageTypeColor('stunned')).toContain('amber');
    expect(getStatusDamageTypeColor('paralyzed')).toContain('blue');
    expect(getStatusDamageTypeColor('unstable')).toContain('pink');
    expect(getStatusDamageTypeColor('hemorragia')).toContain('rose');
  });

  it('B. validates full lifecycle from catalog element definition to combat runtime tick and cure', () => {
    // 1. Catalog element exists
    const venenoElement = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.veneno');
    expect(venenoElement).toBeDefined();
    expect(venenoElement?.metadata?.damageTypeId).toBe('acido');

    // 2. System rule exists for applying and curing
    const cats = createCoreCategories();
    const applyOpt = findStatusOption(cats, 'veneno_grave');
    expect(applyOpt).toBeDefined();

    const cureOpt = findStatusRemoveOption(cats, 'veneno');
    expect(cureOpt).toBeDefined();
    expect(cureOpt?.cost).toBe(2);

    // 3. Combat runtime execution: status is applied, ticks DoT damage on turn advance, and is cured
    const world: Record<string, any> = {
      hero: {
        id: 'hero',
        statuses: [{ statusElementId: 'core.status.veneno', tier: 'grave', appliedAtTurn: 1, expiresAt: 5 }],
        resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
      },
    };

    const encounter = {
      turn: 1,
      participants: {
        hero: { entityId: 'hero', currentTurn: 1, usageCounters: {}, pendingModifiers: [], activeTimedEffects: [], activeCounters: {} } as any,
      },
      eventLog: [],
      traceLog: [],
    };

    // Turn 1 -> Turn 2: DoT tick applies 7 damage (Veneno Grave)
    advanceTurn(encounter, undefined, world);
    expect(world.hero.resources.SA.current).toBe(23); // 30 - 7 = 23

    // Apply status_remove with 'veneno'
    world.hero.statuses = world.hero.statuses.filter((st: any) => !shouldRemoveStatus(st, 'veneno'));
    expect(world.hero.statuses.length).toBe(0);
  });
});
