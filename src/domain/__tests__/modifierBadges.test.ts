import { describe, it, expect } from 'vitest';
import {
  BrainCircuit,
  HeartCrack,
  Shirt,
  Crosshair,
  FlaskConical,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import { getModifierIcon, getModifierColor } from '../../components/character/ModifierBadge.tsx';
import { calculateDerivedStats, calculateEquipmentBonuses } from '../../lib/characterValidation.ts';

describe('Modifier Badges & Icon Mapping Tests', () => {
  it('maps category kinds to corresponding icons correctly', () => {
    // Rasgos -> BrainCircuit
    expect(getModifierIcon('trait', 1)).toBe(BrainCircuit);
    expect(getModifierIcon('rasgo', 1)).toBe(BrainCircuit);

    // Debilidades -> HeartCrack
    expect(getModifierIcon('weakness', -1)).toBe(HeartCrack);
    expect(getModifierIcon('debilidad', -1)).toBe(HeartCrack);

    // Equipo -> Shirt
    expect(getModifierIcon('equipment', 1)).toBe(Shirt);
    expect(getModifierIcon('item', 1)).toBe(Shirt);
    expect(getModifierIcon('weapon', 2)).toBe(Shirt);
    expect(getModifierIcon('armor', 3)).toBe(Shirt);

    // Técnica -> Crosshair
    expect(getModifierIcon('technique', 2)).toBe(Crosshair);
    expect(getModifierIcon('tecnica', 1)).toBe(Crosshair);
    expect(getModifierIcon('skill', 1)).toBe(Crosshair);

    // Consumible -> FlaskConical
    expect(getModifierIcon('consumable', 1)).toBe(FlaskConical);
    expect(getModifierIcon('potion', 2)).toBe(FlaskConical);
    expect(getModifierIcon('flask', 1)).toBe(FlaskConical);

    // Default / other:
    // Bonificadores (> 0) -> ChevronsUp
    expect(getModifierIcon('other', 2)).toBe(ChevronsUp);
    expect(getModifierIcon(undefined, 1)).toBe(ChevronsUp);

    // Penalizadores (< 0) -> ChevronsDown
    expect(getModifierIcon('other', -2)).toBe(ChevronsDown);
    expect(getModifierIcon(undefined, -1)).toBe(ChevronsDown);
  });

  it('assigns appropriate styling classes based on kind and sign', () => {
    expect(getModifierColor('trait', 1)).toContain('emerald');
    expect(getModifierColor('weakness', -1)).toContain('rose');
    expect(getModifierColor('equipment', 1)).toContain('purple');
    expect(getModifierColor('equipment', -1)).toContain('rose');
    expect(getModifierColor('technique', 2)).toContain('blue');
    expect(getModifierColor('consumable', 1)).toContain('amber');
    expect(getModifierColor('upgrade', 1)).toContain('cyan');
  });

  it('populates source items correctly for evasion, coraje, ini, red, and attributes', () => {
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

    const beltItem = {
      id: 'item_light_belt',
      name: 'Cinturón Ligero',
      kind: 'equipment',
      mechanicalBehaviors: [
        {
          id: 'beh_eva',
          mode: 'continuous',
          conditions: [{ type: 'equipped' }],
          effects: [
            { id: 'eff_eva', type: 'derived_stat_modifier', statId: 'EVA', amount: 1 }
          ]
        }
      ]
    };

    const helmetItem = {
      id: 'item_tactical_helmet',
      name: 'Casco Táctico',
      kind: 'equipment',
      mechanicalBehaviors: [
        {
          id: 'beh_ini',
          mode: 'continuous',
          conditions: [{ type: 'equipped' }],
          effects: [
            { id: 'eff_ini', type: 'derived_stat_modifier', statId: 'INI', amount: 2 }
          ]
        }
      ]
    };

    const shieldItem = {
      id: 'item_riot_shield',
      name: 'Escudo Antidisturbios',
      kind: 'equipment',
      mechanicalBehaviors: [
        {
          id: 'beh_rd',
          mode: 'continuous',
          conditions: [{ type: 'equipped' }],
          effects: [
            { id: 'eff_rd', type: 'rd_modifier', amount: 3 }
          ]
        },
        {
          id: 'beh_cor',
          mode: 'continuous',
          conditions: [{ type: 'equipped' }],
          effects: [
            { id: 'eff_cor', type: 'derived_stat_modifier', statId: 'COR', amount: 1 }
          ]
        }
      ]
    };

    const elements = [beltItem, helmetItem, shieldItem];
    const possessions = [
      { possession: { elementId: 'item_light_belt', equipped: true } },
      { possession: { elementId: 'item_tactical_helmet', equipped: true } },
      { possession: { elementId: 'item_riot_shield', equipped: true } }
    ];

    const derived = calculateDerivedStats(
      { basic_stage: 'Novato', VEL: 2, INT: 3, VOL: 1 },
      dummyStages,
      elements,
      [],
      possessions
    );

    // Evasión: 10 + 2 (VEL) + 1 (Cinturón Ligero) = 13
    expect(derived.evasion).toBe(13);
    expect(derived.derivedSources.evasion).toEqual([
      { name: 'Cinturón Ligero', amount: 1, kind: 'equipment' }
    ]);

    // Iniciativa: base (INT + VEL) + 2 (Casco Táctico)
    expect(derived.derivedSources.iniciativa).toEqual([
      { name: 'Casco Táctico', amount: 2, kind: 'equipment' }
    ]);

    // Reducción de Daño: 3 (Escudo Antidisturbios)
    expect(derived.reduccionDano).toBe(3);
    expect(derived.derivedSources.reduccionDano).toEqual([
      { name: 'Escudo Antidisturbios', amount: 3, kind: 'equipment' }
    ]);

    // Coraje: 10 + 1 (VOL) + 1 (Escudo Antidisturbios) = 12
    expect(derived.coraje).toBe(12);
    expect(derived.derivedSources.coraje).toEqual([
      { name: 'Escudo Antidisturbios', amount: 1, kind: 'equipment' }
    ]);
  });
});
