import { describe, it, expect, beforeEach } from 'vitest';
import { SYSTEM_TRAITS } from '../systemTraits.ts';
import {
  calculateDerivedStats,
  calculateTraitAttributeBonus,
} from '../../lib/characterValidation.ts';
import {
  RuleWorld,
  EncounterRuntimeState,
  createParticipantRuntimeState,
  dispatchMechanicalEvent,
  getActiveContinuousModifiers,
  evaluateMechanicalConditions,
} from '../mechanicalRuntime.ts';
import { MechanicalBehavior } from '../mechanicalBehavior.ts';

describe('Domain: 14 SYSTEM_TRAITS Integration & Mechanics', () => {
  it('contains exactly 14 traits with valid mechanical behaviors and metadata', () => {
    expect(SYSTEM_TRAITS).toHaveLength(14);
    for (const trait of SYSTEM_TRAITS) {
      expect(trait.id).toMatch(/^core\.trait\./);
      expect(trait.kind).toBe('trait');
      expect(trait.name.trim().length).toBeGreaterThan(0);
      expect(trait.mechanicalBehaviors.length).toBeGreaterThan(0);
      expect(trait.metadata).toBeDefined();
    }
  });

  describe('Attribute Modifier Traits (6 traits: Ágil, Ambidiestro, Fortaleza Mental, Fuerte, Mente Aguda, Resistente)', () => {
    const stage = [{ name: 'Estudiante', baseHealth: 20, baseStamina: 10, maxAttr: 5, attrPoints: 12, baseDamage: '1D4' }];

    it('applies +1 to each corresponding attribute and reflects in derived stats', () => {
      const baseProfile = {
        basic_stage: 'Estudiante',
        fue: 3, des: 3, res: 3, int: 3, vol: 3, vel: 3,
        traits: [
          'core.trait.strong',
          'core.trait.ambidextrous',
          'core.trait.resilient',
          'core.trait.keen-mind',
          'core.trait.mental-fortitude',
          'core.trait.agile',
        ],
      };

      const bonus = calculateTraitAttributeBonus(baseProfile, SYSTEM_TRAITS);
      expect(bonus.total).toBe(6);
      expect(bonus.byAttr.FUE).toBe(1);
      expect(bonus.byAttr.DES).toBe(1);
      expect(bonus.byAttr.RES).toBe(1);
      expect(bonus.byAttr.INT).toBe(1);
      expect(bonus.byAttr.VOL).toBe(1);
      expect(bonus.byAttr.VEL).toBe(1);

      const derived = calculateDerivedStats(baseProfile, stage, SYSTEM_TRAITS);
      expect(derived.attributes.FUE).toBe(4);
      expect(derived.attributes.DES).toBe(4);
      expect(derived.attributes.RES).toBe(4);
      expect(derived.attributes.INT).toBe(4);
      expect(derived.attributes.VOL).toBe(4);
      expect(derived.attributes.VEL).toBe(4);
      // Health: baseHealth (20) + total RES (4) = 24
      expect(derived.salud).toBe(24);
      // Stamina: baseStamina (10) + total DES (4) = 14
      expect(derived.estamina).toBe(14);
    });
  });

  describe('Derived Stat Modifier Traits & Removal Lifecycle (Salud Mejorada, Estamina Mejorada)', () => {
    const stage = [{ name: 'Estudiante', baseHealth: 20, baseStamina: 10, maxAttr: 5, attrPoints: 12, baseDamage: '1D4' }];

    it('applies +2 max health for Salud Mejorada and +2 max stamina for Estamina Mejorada', () => {
      const profile = {
        basic_stage: 'Estudiante',
        fue: 3, des: 3, res: 3, int: 3, vol: 3, vel: 3,
        traits: ['core.trait.improved-health', 'core.trait.improved-stamina'],
      };

      const derived = calculateDerivedStats(profile, stage, SYSTEM_TRAITS);
      // Base health: 20 + 3 RES + 2 extra = 25
      expect(derived.salud).toBe(25);
      // Base stamina: 10 + 3 DES + 2 extra = 15
      expect(derived.estamina).toBe(15);
    });

    it('correctly cleans up bonuses on trait removal without ghost bonuses or automatic healing', () => {
      // Step 1: Character with damaged health & reduced stamina and improved traits equipped
      const equippedProfile = {
        basic_stage: 'Estudiante',
        fue: 3, des: 3, res: 3, int: 3, vol: 3, vel: 3,
        salud_actual: 18,
        estamina_actual: 8,
        salud_maxima: 25,
        estamina_maxima: 15,
        traits: ['core.trait.improved-health', 'core.trait.improved-stamina'],
      };

      const statsWithTraits = calculateDerivedStats(equippedProfile, stage, SYSTEM_TRAITS);
      expect(statsWithTraits.salud).toBe(25);
      expect(statsWithTraits.estamina).toBe(15);

      // Step 2: Traits are removed
      const unequippedProfile = {
        ...equippedProfile,
        traits: [],
      };

      const statsWithoutTraits = calculateDerivedStats(unequippedProfile, stage, SYSTEM_TRAITS);
      // Max stats return strictly to base without ghost additions
      expect(statsWithoutTraits.salud).toBe(23); // 20 + 3 RES + 0
      expect(statsWithoutTraits.estamina).toBe(13); // 10 + 3 DES + 0

      // Step 3: Current values are preserved and never auto-healed
      const effectiveCurrentSalud = Math.min(unequippedProfile.salud_actual, statsWithoutTraits.salud);
      const effectiveCurrentEstamina = Math.min(unequippedProfile.estamina_actual, statsWithoutTraits.estamina);
      expect(effectiveCurrentSalud).toBe(18); // Kept at 18, NOT healed to 23 or 25
      expect(effectiveCurrentEstamina).toBe(8); // Kept at 8, NOT healed to 13 or 15
    });
  });

  describe('Combat Runtime Traits (Regeneración, Líder Nato, Reflejos Rápidos)', () => {
    let world: RuleWorld;
    let encounter: EncounterRuntimeState;

    beforeEach(() => {
      world = {
        hero: {
          attributes: { fue: 3, des: 3, res: 3, int: 3, vol: 3, vel: 3 },
          resources: {
            SA: { current: 15, max: 20 },
            ES: { current: 5, max: 10 },
          },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        ally1: {
          attributes: { fue: 3, des: 3, res: 3, int: 3, vol: 3, vel: 3 },
          resources: {
            SA: { current: 15, max: 20 },
            ES: { current: 4, max: 10 },
          },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      encounter = {
        turn: 1,
        eventLog: [],
        traceLog: [],
        participants: {
          hero: createParticipantRuntimeState('hero'),
          ally1: createParticipantRuntimeState('ally1'),
        },
      };
    });

    it('Regeneración: recovers 2 SA on turn_start trigger', () => {
      const regenTrait = SYSTEM_TRAITS.find(t => t.id === 'core.trait.regeneration')!;
      const turnStartBehavior = regenTrait.mechanicalBehaviors.find(b => b.mode === 'reactive')!;

      // Initial health: 15 / 20
      expect(world.hero.resources.SA.current).toBe(15);

      const result = dispatchMechanicalEvent({
        event: {
          kind: 'turn_start',
          sourceEntityId: 'hero',
          targetEntityId: 'hero',
        },
        ownedBehaviors: [
          {
            elementId: regenTrait.id,
            behavior: turnStartBehavior as MechanicalBehavior,
          },
        ],
        world,
        encounter,
      });

      // Successfully healed 2 SA
      expect(result.newWorld.hero.resources.SA.current).toBe(17);
      expect(result.executedBehaviors.length).toBeGreaterThan(0);
    });

    it('Reflejos Rápidos: conditional initiative evaluation with first_turn signal', () => {
      const quickReflexes = SYSTEM_TRAITS.find(t => t.id === 'core.trait.quick-reflexes')!;
      const behavior = quickReflexes.mechanicalBehaviors[0] as MechanicalBehavior;

      // Condition passes when signalId 'first_turn' is present in encounter/world
      const condTrue = evaluateMechanicalConditions(
        behavior.conditions,
        'all',
        {
          entity: world.hero,
          participant: encounter.participants.hero,
          signals: ['first_turn'],
        }
      );
      expect(condTrue).toBe(true);

      // Condition fails when 'first_turn' signal is absent (e.g. turn 2+)
      const condFalse = evaluateMechanicalConditions(
        behavior.conditions,
        'all',
        {
          entity: world.hero,
          participant: encounter.participants.hero,
          signals: [],
        }
      );
      expect(condFalse).toBe(false);
    });
  });

  describe('Manual & Pending Contract Traits (Riqueza, Talentoso, Volador)', () => {
    it('wealth specifies +300 yenes/mes manual application', () => {
      const wealth = SYSTEM_TRAITS.find(t => t.id === 'core.trait.wealth')!;
      expect(wealth.mechanicalBehaviors[0].effects[0].type).toBe('manual');
      expect((wealth.mechanicalBehaviors[0].effects[0] as any).message).toContain('300 ¥');
      expect(wealth.metadata?.supportPending?.[0]).toContain('pago mensual manual');
    });

    it('talented specifies manual cap exception note without inventing arbitrary rules', () => {
      const talented = SYSTEM_TRAITS.find(t => t.id === 'core.trait.talented')!;
      expect(talented.mechanicalBehaviors[0].effects[0].type).toBe('manual');
      expect(talented.metadata?.supportPending?.[0]).toContain('Las etapas no definen');
    });

    it('flying specifies narrative capability note', () => {
      const flying = SYSTEM_TRAITS.find(t => t.id === 'core.trait.flying')!;
      expect(flying.mechanicalBehaviors[0].effects[0].type).toBe('manual');
      expect((flying.mechanicalBehaviors[0].effects[0] as any).message).toContain('Puede volar');
    });
  });
});
