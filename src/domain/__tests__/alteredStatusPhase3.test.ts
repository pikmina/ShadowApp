import { describe, it, expect } from 'vitest';
import { CORE_ALTERED_STATUSES } from '../systemWeaknesses';
import {
  createCoreCategories,
  getCategoryOptions,
} from '../coreRuleCatalog';
import {
  findStatusOption,
  findStatusRemoveOption,
  calculateTechniqueStructuralCost,
} from '../systemMechanics';
import { getMechanicalLabel } from '../mechanicalLabels';

describe('Phase 3: Catalog Altered Statuses & System Integration', () => {
  it('A. verifies canonical altered statuses are properly structured in the Catalog', () => {
    expect(CORE_ALTERED_STATUSES.length).toBe(21);

    const stunned = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.stunned');
    expect(stunned).toBeDefined();
    expect(stunned?.metadata?.damageTypeId).toBe('sensorial');
    expect(stunned?.metadata?.effectType).toBe('control');
    expect(stunned?.metadata?.resistanceDifficulty).toBe('Fácil (12)');
    expect(stunned?.metadata?.resistanceDC).toBe(12);
    expect(stunned?.mechanicalBehaviors.length).toBeGreaterThan(0);

    const berserker = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.berserker');
    expect(berserker).toBeDefined();
    expect(berserker?.metadata?.hasTiers).toBe(true);
    expect(berserker?.metadata?.tiers?.grave?.resistanceDifficulty).toBe('Extremo (28) Voluntad');
    expect(berserker?.metadata?.tiers?.grave?.resistanceDC).toBe(28);

    const asfixia = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.asfixia');
    expect(asfixia).toBeDefined();
    expect(asfixia?.metadata?.damageTypeId).toBe('motor');
    expect(asfixia?.metadata?.dotDamageFormula).toBe('1d6');
    expect(asfixia?.metadata?.resistanceDifficulty).toBe('Muy Difícil (24)');

    const veneno = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.veneno');
    expect(veneno).toBeDefined();
    expect(veneno?.metadata?.damageTypeId).toBe('acido');
    expect(veneno?.metadata?.hasTiers).toBe(true);
    expect(veneno?.metadata?.tiers?.grave?.damageFormula).toBe('2d6');
    expect(veneno?.metadata?.tiers?.leve?.damageFormula).toBe('1d6');

    const quemadura = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.quemadura');
    expect(quemadura).toBeDefined();
    expect(quemadura?.metadata?.hasTiers).toBe(true);
    expect(quemadura?.metadata?.tiers?.grave?.damageFormula).toBe('2d6');
    expect(quemadura?.metadata?.tiers?.leve?.damageFormula).toBe('1d6');

    const hemorragia = CORE_ALTERED_STATUSES.find((s) => s.id === 'core.status.hemorragia');
    expect(hemorragia).toBeDefined();
    expect(hemorragia?.metadata?.hasTiers).toBe(true);
    expect(hemorragia?.metadata?.tiers?.grave?.damageFormula).toBe('2d8');
    expect(hemorragia?.metadata?.tiers?.leve?.damageFormula).toBe('1d8');
  });

  it('B. validates that damage types in metadata correspond to canonical labels', () => {
    const uniqueDamageTypes = new Set(
      CORE_ALTERED_STATUSES.map((s) => s.metadata?.damageTypeId).filter(Boolean)
    );

    for (const dt of uniqueDamageTypes) {
      const label = getMechanicalLabel('damageTypes', dt);
      expect(label).toBeTruthy();
      expect(label).not.toBe(dt); // Must have a localized human label, not raw key
    }
  });

  it('C. resolves System Rules CE cost for applying catalog status elements', () => {
    const cats = createCoreCategories();

    // Matching by full ID
    const optStunned = findStatusOption(cats, 'core.status.stunned');
    expect(optStunned).toBeDefined();
    expect(optStunned?.cost).toBe(3);

    // Matching by normalized key
    const optVenenoGrave = findStatusOption(cats, 'veneno_grave');
    expect(optVenenoGrave).toBeDefined();
    expect(optVenenoGrave?.cost).toBe(5);

    const optQuemaduraLeve = findStatusOption(cats, 'quemadura_leve');
    expect(optQuemaduraLeve).toBeDefined();
    expect(optQuemaduraLeve?.cost).toBe(2);
  });

  it('D. resolves System Rules CE cost for curing catalog status elements', () => {
    const cats = createCoreCategories();

    const cureAll = findStatusRemoveOption(cats, 'all');
    expect(cureAll).toBeDefined();
    expect(cureAll?.cost).toBe(4);

    const cureVeneno = findStatusRemoveOption(cats, 'veneno');
    expect(cureVeneno).toBeDefined();
    expect(cureVeneno?.cost).toBe(2);

    const cureAturdido = findStatusRemoveOption(cats, 'aturdido');
    expect(cureAturdido).toBeDefined();
    expect(cureAturdido?.cost).toBe(2);

    const cureGrave = findStatusRemoveOption(cats, 'grave');
    expect(cureGrave).toBeDefined();
    expect(cureGrave?.cost).toBe(4);
  });

  it('E. computes total CE cost when combining status application and curing in behaviors', () => {
    const cats = createCoreCategories();

    const debuffAndCureBehavior: any = {
      id: 'purify_and_stun',
      mode: 'active',
      conditions: [],
      effects: [
        {
          id: 'eff_cure',
          type: 'status_remove',
          statusElementId: 'veneno',
        },
        {
          id: 'eff_stun',
          type: 'status_apply',
          statusElementId: 'core.status.stunned',
          turns: 1,
        },
      ],
    };

    // Stun = 3 CE, Cure Veneno = 2 CE => Total = 5 CE
    const cost = calculateTechniqueStructuralCost([debuffAndCureBehavior], cats);
    expect(cost).toBe(5);
  });
});
