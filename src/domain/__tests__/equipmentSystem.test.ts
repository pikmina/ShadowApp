import { describe, it, expect } from 'vitest';
import { calculateDerivedStats, calculateEquipmentBonuses } from '../../lib/characterValidation.ts';
import { describeMechanicalBehavior } from '../mechanicalDescription.ts';
import { MechanicalBehavior } from '../mechanicalBehavior.ts';

describe('Equipment System End-to-End Tests', () => {
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

  const bootsElement = {
    id: 'item_combat_boots',
    name: 'Botas de combate',
    kind: 'equipment',
    mechanicalBehaviors: [
      {
        id: 'beh_boots_evasion',
        name: 'Agilidad Mejorada',
        mode: 'continuous',
        conditions: [
          {
            type: 'equipped'
          }
        ],
        effects: [
          {
            id: 'eff_boots_eva',
            type: 'derived_stat_modifier',
            statId: 'EVA',
            amount: 1,
            operation: 'add'
          }
        ]
      }
    ]
  };

  const powerGauntletsElement = {
    id: 'item_power_gauntlets',
    name: 'Guantes de Fuerza',
    kind: 'equipment',
    mechanicalBehaviors: [
      {
        id: 'beh_gauntlets_str',
        name: 'Fuerza Aumentada',
        mode: 'continuous',
        conditions: [
          {
            type: 'equipped'
          }
        ],
        effects: [
          {
            id: 'eff_gauntlets_fue',
            type: 'attribute_modifier',
            attributeId: 'FUE',
            amount: 2,
            operation: 'add'
          }
        ]
      }
    ]
  };

  const armoredVestElement = {
    id: 'item_armored_vest',
    name: 'Chaleco Blindado',
    kind: 'equipment',
    mechanicalBehaviors: [
      {
        id: 'beh_vest_rd',
        name: 'Protección Balística',
        mode: 'continuous',
        conditions: [
          {
            type: 'equipped'
          }
        ],
        effects: [
          {
            id: 'eff_vest_rd',
            type: 'rd_modifier',
            amount: 3,
            operation: 'add'
          }
        ]
      }
    ]
  };

  const allElements = [bootsElement, powerGauntletsElement, armoredVestElement];

  it('B. Valor por defecto: Posesión antigua sin equipped se considera no equipada (equipped: false)', () => {
    const profile = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };
    const possessions = [
      {
        elementId: 'item_combat_boots',
        quantity: 1
        // equipped is omitted
      }
    ];

    const equipBonus = calculateEquipmentBonuses(possessions, allElements);
    expect(equipBonus.byDerived.evasion).toBe(0);

    const stats = calculateDerivedStats(profile, dummyStages, allElements, [], possessions);
    expect(stats.evasion).toBe(13); // 10 base + 3 VEL + 0 equipment
  });

  it('C. Objeto no equipado: Objeto con +1 Evasión y equipped = false aporta +0 Evasión', () => {
    const profile = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };
    const possessions = [
      {
        elementId: 'item_combat_boots',
        quantity: 1,
        equipped: false
      }
    ];

    const equipBonus = calculateEquipmentBonuses(possessions, allElements);
    expect(equipBonus.byDerived.evasion).toBe(0);

    const stats = calculateDerivedStats(profile, dummyStages, allElements, [], possessions);
    expect(stats.evasion).toBe(13); // 10 base + 3 VEL
    expect(stats.equipmentDerivedBonuses.evasion).toBe(0);
  });

  it('D. Objeto equipado: Objeto con +1 Evasión y equipped = true aporta +1 Evasión', () => {
    const profile = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };
    const possessions = [
      {
        elementId: 'item_combat_boots',
        quantity: 1,
        equipped: true
      }
    ];

    const equipBonus = calculateEquipmentBonuses(possessions, allElements);
    expect(equipBonus.byDerived.evasion).toBe(1);

    const stats = calculateDerivedStats(profile, dummyStages, allElements, [], possessions);
    expect(stats.evasion).toBe(14); // 10 base + 3 VEL + 1 equipment
    expect(stats.equipmentDerivedBonuses.evasion).toBe(1);
  });

  it('E. Desequipar: Al desequipar el objeto (+1 -> 0), la estadística vuelve a su valor original', () => {
    const profile = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };

    // 1. Equipped
    const equippedPossessions = [{ elementId: 'item_combat_boots', quantity: 1, equipped: true }];
    const statsEquipped = calculateDerivedStats(profile, dummyStages, allElements, [], equippedPossessions);
    expect(statsEquipped.evasion).toBe(14);

    // 2. Unequipped
    const unequippedPossessions = [{ elementId: 'item_combat_boots', quantity: 1, equipped: false }];
    const statsUnequipped = calculateDerivedStats(profile, dummyStages, allElements, [], unequippedPossessions);
    expect(statsUnequipped.evasion).toBe(13);
  });

  it('F. Aislamiento: Dos personajes poseen el mismo objeto, PJ A equipado y PJ B no equipado', () => {
    const profileA = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };
    const profileB = { stage: 'Novato', FUE: 3, DES: 3, RES: 3, INT: 3, VOL: 3, VEL: 3 };

    const possessionsA = [{ elementId: 'item_combat_boots', quantity: 1, equipped: true }];
    const possessionsB = [{ elementId: 'item_combat_boots', quantity: 1, equipped: false }];

    const statsA = calculateDerivedStats(profileA, dummyStages, allElements, [], possessionsA);
    const statsB = calculateDerivedStats(profileB, dummyStages, allElements, [], possessionsB);

    expect(statsA.evasion).toBe(14);
    expect(statsB.evasion).toBe(13);
  });

  it('G. No regresión: Rasgos, debilidades y mejoras de atributo siguen calculándose sin alteración', () => {
    const traitElement = {
      id: 'trait_athletic',
      name: 'Atlético',
      kind: 'trait',
      mechanicalBehaviors: [
        {
          id: 'beh_trait_athletic',
          name: 'Atlético',
          mode: 'continuous',
          effects: [
            {
              id: 'eff_trait_vel',
              type: 'attribute_modifier',
              attributeId: 'VEL',
              amount: 1,
              operation: 'add'
            }
          ]
        }
      ]
    };

    const attributeUpgradeElement = {
      id: 'upgrade_str_1',
      name: 'Mejora FUE',
      kind: 'attribute_upgrade',
      metadata: { attributeId: 'FUE' }
    };

    const combinedElements = [...allElements, traitElement, attributeUpgradeElement];

    const profile = {
      stage: 'Novato',
      FUE: 3,
      DES: 3,
      RES: 3,
      INT: 3,
      VOL: 3,
      VEL: 3,
      traits: ['trait_athletic']
    };

    const possessions = [
      { elementId: 'upgrade_str_1', quantity: 1, equipped: false }, // attribute upgrades work via quantity, not equipped
      { elementId: 'item_power_gauntlets', quantity: 1, equipped: true },
      { elementId: 'item_combat_boots', quantity: 1, equipped: true },
      { elementId: 'item_armored_vest', quantity: 1, equipped: true }
    ];

    const stats = calculateDerivedStats(profile, dummyStages, combinedElements, [], possessions);

    // Base FUE 3 + Mejora 1 + Equipamiento Guantes 2 = 6
    expect(stats.attributes.FUE).toBe(6);
    expect(stats.purchasedBonuses.FUE).toBe(1);
    expect(stats.equipmentBonuses.FUE).toBe(2);

    // Base VEL 3 + Rasgo Atlético 1 = 4
    expect(stats.attributes.VEL).toBe(4);
    expect(stats.traitBonuses.VEL).toBe(1);

    // Evasión = 10 + VEL (4) + Equipamiento Botas (1) = 15
    expect(stats.evasion).toBe(15);
    expect(stats.equipmentDerivedBonuses.evasion).toBe(1);

    // RED = 3 from Armored Vest
    expect(stats.reduccionDano).toBe(3);
  });

  it('I. Descripción mecánica automática: Genera "Mientras esté equipado, otorga +1 a Evasión."', () => {
    const behavior: MechanicalBehavior = {
      id: 'beh_boots_1',
      name: 'Botas',
      mode: 'continuous',
      conditions: [
        {
          type: 'equipped'
        }
      ],
      effects: [
        {
          id: 'eff_1',
          type: 'derived_stat_modifier',
          statId: 'EVA',
          amount: 1,
          operation: 'add'
        }
      ]
    };

    const result = describeMechanicalBehavior(behavior, { format: 'compact' });
    expect(result.text).toBe('Mientras esté equipado, otorga +1 a Evasión.');
  });
});
