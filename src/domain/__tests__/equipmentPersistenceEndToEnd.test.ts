import { describe, it, expect } from 'vitest';
import { calculateDerivedStats, calculateEquipmentBonuses } from '../../lib/characterValidation.ts';

describe('Equipped Persistence and Mechanical Behavior Regression Suite', () => {
  const dummyStages = [
    {
      id: 'novice',
      name: 'Novato',
      baseHealth: 15,
      baseStamina: 20,
      baseDamage: '1D4',
      maxAttr: 10,
    }
  ];

  const bootsOfAgility = {
    id: 'item_boots_agility',
    name: 'Botas de Agilidad',
    kind: 'equipment',
    status: 'published',
    mechanicalBehaviors: [
      {
        id: 'beh_boots_eva',
        name: 'Bono de Evasión',
        mode: 'continuous',
        conditions: [
          {
            type: 'equipped'
          }
        ],
        effects: [
          {
            id: 'eff_boots_eva_1',
            type: 'derived_stat_modifier',
            statId: 'EVA',
            amount: 1,
            operation: 'add'
          }
        ]
      }
    ]
  };

  const allElements = [bootsOfAgility];

  describe('Circuit 1 & 2: Mechanical Behavior Activation with Equipped State', () => {
    const baseProfile = {
      basic_name: 'Hero Test',
      stage: 'Novato',
      FUE: 3,
      DES: 3,
      RES: 3,
      INT: 3,
      VOL: 3,
      VEL: 3, // Base VEL = 3, Base Evasión = 10 + VEL = 13
    };

    it('equipped: false -> +0 Evasión (Evasión remains 13)', () => {
      const possessions = [
        {
          elementId: 'item_boots_agility',
          quantity: 1,
          equipped: false,
          element: bootsOfAgility
        }
      ];

      const bonuses = calculateEquipmentBonuses(possessions, allElements);
      expect(bonuses.byDerived.evasion).toBe(0);

      const derivedStats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], possessions);
      expect(derivedStats.evasion).toBe(13);
      expect(derivedStats.equipmentDerivedBonuses.evasion).toBe(0);
    });

    it('equipped: true -> +1 Evasión (Evasión becomes 14)', () => {
      const possessions = [
        {
          elementId: 'item_boots_agility',
          quantity: 1,
          equipped: true,
          element: bootsOfAgility
        }
      ];

      const bonuses = calculateEquipmentBonuses(possessions, allElements);
      expect(bonuses.byDerived.evasion).toBe(1);

      const derivedStats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], possessions);
      expect(derivedStats.evasion).toBe(14);
      expect(derivedStats.equipmentDerivedBonuses.evasion).toBe(1);
    });

    it('equipar -> +1 Evasión, desequipar -> +0 Evasión', () => {
      // Step 1: Initial unequipped state
      let currentPossessions = [
        {
          elementId: 'item_boots_agility',
          quantity: 1,
          equipped: false,
          element: bootsOfAgility
        }
      ];
      let stats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], currentPossessions);
      expect(stats.evasion).toBe(13);

      // Step 2: Equip
      currentPossessions = currentPossessions.map(p => ({ ...p, equipped: true }));
      stats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], currentPossessions);
      expect(stats.evasion).toBe(14);

      // Step 3: Unequip
      currentPossessions = currentPossessions.map(p => ({ ...p, equipped: false }));
      stats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], currentPossessions);
      expect(stats.evasion).toBe(13);
    });

    it('handles relational database hydration format { possession: {...}, element: {...} }', () => {
      // Relational database format returned by getPublicCharacterById or getCharactersWithPossessions
      const relationalPossessionsEquipped = [
        {
          possession: {
            id: 'pos_1',
            characterId: 10,
            elementId: 'item_boots_agility',
            quantity: 1,
            equipped: true,
            notes: null
          },
          element: bootsOfAgility
        }
      ];

      const bonuses = calculateEquipmentBonuses(relationalPossessionsEquipped, allElements);
      expect(bonuses.byDerived.evasion).toBe(1);

      const derivedStats = calculateDerivedStats(baseProfile, dummyStages, allElements, [], relationalPossessionsEquipped);
      expect(derivedStats.evasion).toBe(14);
      expect(derivedStats.equipmentDerivedBonuses.evasion).toBe(1);

      const relationalPossessionsUnequipped = [
        {
          possession: {
            id: 'pos_1',
            characterId: 10,
            elementId: 'item_boots_agility',
            quantity: 1,
            equipped: false,
            notes: null
          },
          element: bootsOfAgility
        }
      ];

      const bonusesUnequipped = calculateEquipmentBonuses(relationalPossessionsUnequipped, allElements);
      expect(bonusesUnequipped.byDerived.evasion).toBe(0);

      const derivedStatsUnequipped = calculateDerivedStats(baseProfile, dummyStages, allElements, [], relationalPossessionsUnequipped);
      expect(derivedStatsUnequipped.evasion).toBe(13);
      expect(derivedStatsUnequipped.equipmentDerivedBonuses.evasion).toBe(0);
    });
  });
});
