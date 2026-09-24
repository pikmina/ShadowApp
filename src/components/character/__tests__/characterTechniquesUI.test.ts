import { describe, it, expect } from 'vitest';
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_BADGES,
  FUNCTIONAL_CATEGORY_CONFIG,
} from '../CharacterTechniquesEditor';
import {
  TECHNIQUE_MIN_LEVEL,
  TECHNIQUE_MAX_LEVEL,
  TECHNIQUE_SOURCE_TYPES,
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  type CharacterTechnique,
} from '@/domain/characterTechnique';
import { createDefaultMechanicalBehavior } from '@/domain/mechanicalBehavior';

describe('Task 28 — Character-Owned Technique Editor UI & Presentation Contracts', () => {
  // 1. CANONICAL SPANISH LABELS
  describe('Canonical Spanish Labeling', () => {
    it('maps all TechniqueSourceTypes to their exact required Spanish labels', () => {
      expect(SOURCE_TYPE_LABELS.quirk).toBe('Don');
      expect(SOURCE_TYPE_LABELS.physical).toBe('Física');
      expect(SOURCE_TYPE_LABELS.weapon).toBe('Arma');

      expect(SOURCE_TYPE_BADGES.quirk.label).toBe('Don');
      expect(SOURCE_TYPE_BADGES.physical.label).toBe('Física');
      expect(SOURCE_TYPE_BADGES.weapon.label).toBe('Arma');
    });

    it('maps all Functional Categories to their exact required Spanish labels and configs', () => {
      expect(FUNCTIONAL_CATEGORY_CONFIG.offensive.label).toBe('Ofensiva');
      expect(FUNCTIONAL_CATEGORY_CONFIG.support.label).toBe('Soporte');
      expect(FUNCTIONAL_CATEGORY_CONFIG.defensive.label).toBe('Defensiva');
      expect(FUNCTIONAL_CATEGORY_CONFIG.control.label).toBe('Control');

      expect(FUNCTIONAL_CATEGORY_CONFIG.offensive.icon).toBeDefined();
      expect(FUNCTIONAL_CATEGORY_CONFIG.support.icon).toBeDefined();
      expect(FUNCTIONAL_CATEGORY_CONFIG.defensive.icon).toBeDefined();
      expect(FUNCTIONAL_CATEGORY_CONFIG.control.icon).toBeDefined();
    });
  });

  // 2. REAL-TIME DERIVED PREVIEWS (NON-PERSISTED)
  describe('Live In-Editor Semantic Derivations', () => {
    it('dynamically derives multiple functional categories from mechanical behaviors', () => {
      // Offense + Control
      const behaviors = [
        {
          ...createDefaultMechanicalBehavior('b1'),
          effects: [{ id: 'e1', type: 'damage' as const, dice: '3D6' }],
        },
        {
          ...createDefaultMechanicalBehavior('b2'),
          effects: [{ id: 'e2', type: 'status_apply' as const, statusElementId: 'status_stun' }],
        },
      ];

      const categories = deriveTechniqueFunctionalCategories(behaviors);
      expect(categories).toEqual(['offensive', 'control']);
    });

    it('dynamically updates roll contract and warnings when mechanics change in form state', () => {
      const defaultBehavior = createDefaultMechanicalBehavior('b1');

      // Incomplete roll (missing attribute)
      const behaviorsIncomplete = [
        {
          ...defaultBehavior,
          resolution: {
            ...defaultBehavior.resolution,
            type: 'roll' as const,
            skill: 'artes_marciales',
          },
        },
      ];

      const contract1 = deriveTechniqueRollContract(behaviorsIncomplete);
      expect(contract1.hasRoll).toBe(true);
      expect(contract1.complete).toBe(false);
      expect(contract1.warnings.length).toBeGreaterThan(0);

      // Completed roll
      const behaviorsComplete = [
        {
          ...defaultBehavior,
          resolution: {
            ...defaultBehavior.resolution,
            type: 'roll' as const,
            attribute: 'FUE',
            skill: 'artes_marciales',
            difficulty: 14,
          },
        },
      ];

      const contract2 = deriveTechniqueRollContract(behaviorsComplete);
      expect(contract2.hasRoll).toBe(true);
      expect(contract2.complete).toBe(true);
      expect(contract2.warnings).toHaveLength(0);
      expect(contract2.behaviors[0].attribute).toBe('FUE');
    });

    it('sourceType changes do NOT alter mechanics or derived categories', () => {
      const behaviors = [
        {
          ...createDefaultMechanicalBehavior('b1'),
          effects: [{ id: 'e1', type: 'barrier' as const, amount: 20 }],
        },
      ];

      // Regardless of sourceType being quirk, physical, or weapon, derived category is defensive
      for (const src of TECHNIQUE_SOURCE_TYPES) {
        const tech: Partial<CharacterTechnique> = {
          sourceType: src,
          mechanicalBehaviors: behaviors,
        };
        const categories = deriveTechniqueFunctionalCategories(tech.mechanicalBehaviors!);
        expect(categories).toEqual(['defensive']);
      }
    });
  });

  // 3. LEVEL & INPUT VALIDATION
  describe('Technique Input & Level Boundary Constraints', () => {
    it('enforces levels between TECHNIQUE_MIN_LEVEL (1) and TECHNIQUE_MAX_LEVEL (5)', () => {
      expect(TECHNIQUE_MIN_LEVEL).toBe(1);
      expect(TECHNIQUE_MAX_LEVEL).toBe(5);

      const validPayload = {
        characterId: 10,
        name: 'Golpe Ígneo',
        sourceType: 'quirk' as const,
        level: 3,
        mechanicalBehaviors: [],
      };

      expect(() => createCharacterTechniqueSchema.parse(validPayload)).not.toThrow();

      // Invalid level 0
      expect(() =>
        createCharacterTechniqueSchema.parse({ ...validPayload, level: 0 })
      ).toThrow();

      // Invalid level 6
      expect(() =>
        createCharacterTechniqueSchema.parse({ ...validPayload, level: 6 })
      ).toThrow();
    });

    it('rejects empty or whitespace-only technique names', () => {
      expect(() =>
        createCharacterTechniqueSchema.parse({
          characterId: 10,
          name: '   ',
          sourceType: 'physical',
        })
      ).toThrow();
    });

    it('strictly forbids persisting derived category or stamina cost fields in payload', () => {
      const payloadWithExtraneous = {
        characterId: 10,
        name: 'Técnica Prohibida',
        sourceType: 'physical' as const,
        categories: ['offensive'],
        cost: 5,
      };

      // Zod schema is strict() and will reject unexpected persisted fields
      expect(() =>
        createCharacterTechniqueSchema.parse(payloadWithExtraneous as any)
      ).toThrow();
    });
  });
});
