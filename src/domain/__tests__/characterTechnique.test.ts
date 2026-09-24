import { describe, it, expect } from 'vitest';
import {
  TECHNIQUE_MIN_LEVEL,
  TECHNIQUE_MAX_LEVEL,
  TECHNIQUE_SOURCE_TYPES,
  techniqueLevelSchema,
  techniqueSourceTypeSchema,
  characterTechniqueSchema,
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
} from '../characterTechnique.ts';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../mechanicalBehavior.ts';

describe('Character-Owned Technique Domain Model', () => {
  describe('Constants & Level Bounds', () => {
    it('defines min level as 1 and max level as 5', () => {
      expect(TECHNIQUE_MIN_LEVEL).toBe(1);
      expect(TECHNIQUE_MAX_LEVEL).toBe(5);
    });

    it('accepts valid integer levels from 1 to 5', () => {
      for (let lvl = 1; lvl <= 5; lvl++) {
        expect(techniqueLevelSchema.parse(lvl)).toBe(lvl);
      }
    });

    it('rejects levels outside 1-5 or non-integers', () => {
      expect(() => techniqueLevelSchema.parse(0)).toThrow();
      expect(() => techniqueLevelSchema.parse(6)).toThrow();
      expect(() => techniqueLevelSchema.parse(-1)).toThrow();
      expect(() => techniqueLevelSchema.parse(2.5)).toThrow();
    });
  });

  describe('Source Type Classification', () => {
    it('accepts canonical source types: quirk, physical, weapon', () => {
      expect(TECHNIQUE_SOURCE_TYPES).toEqual(['quirk', 'physical', 'weapon']);

      for (const type of TECHNIQUE_SOURCE_TYPES) {
        expect(techniqueSourceTypeSchema.parse(type)).toBe(type);
      }
    });

    it('rejects unsupported or arbitrary source types', () => {
      expect(() => techniqueSourceTypeSchema.parse('magic')).toThrow();
      expect(() => techniqueSourceTypeSchema.parse('spell')).toThrow();
      expect(() => techniqueSourceTypeSchema.parse('')).toThrow();
    });
  });

  describe('CharacterTechnique Validation & Schemas', () => {
    const validBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('beh_1', 'active', 'Golpe de Poder'),
      effects: [
        {
          id: 'eff_1',
          type: 'damage',
          dice: '3D8',
          damageType: 'physical',
        },
      ],
    };

    it('validates a complete valid CharacterTechnique entity', () => {
      const parsed = characterTechniqueSchema.parse({
        id: 'tech_123',
        characterId: 42,
        name: 'Detroit Smash',
        description: 'Potente golpe concentrado.',
        level: 3,
        sourceType: 'quirk',
        mechanicalBehaviors: [validBehavior],
        revision: 1,
      });

      expect(parsed.id).toBe('tech_123');
      expect(parsed.characterId).toBe(42);
      expect(parsed.name).toBe('Detroit Smash');
      expect(parsed.level).toBe(3);
      expect(parsed.sourceType).toBe('quirk');
      expect(parsed.mechanicalBehaviors).toHaveLength(1);
    });

    it('applies standard defaults on creation input', () => {
      const parsed = createCharacterTechniqueSchema.parse({
        characterId: 10,
        name: 'Barrido Rápido',
        sourceType: 'physical',
      });

      expect(parsed.level).toBe(1);
      expect(parsed.description).toBe('');
      expect(parsed.mechanicalBehaviors).toEqual([]);
    });

    it('requires non-empty name and positive characterId on creation', () => {
      expect(() =>
        createCharacterTechniqueSchema.parse({
          characterId: 10,
          name: '   ',
          sourceType: 'physical',
        })
      ).toThrow();

      expect(() =>
        createCharacterTechniqueSchema.parse({
          characterId: 0,
          name: 'Patada',
          sourceType: 'physical',
        })
      ).toThrow();
    });

    it('enforces characterId immutability in update schema by rejecting unexpected characterId', () => {
      const updateData = {
        name: 'Nuevo Nombre',
        characterId: 999, // Attempt to mutate ownership
        level: 4,
      };

      // Strict schema explicitly rejects characterId in update
      expect(() => updateCharacterTechniqueSchema.parse(updateData)).toThrow();
    });

    it('rejects invalid mechanicalBehaviors in create and update payloads', () => {
      const invalidBehavior: any = {
        id: 'beh_invalid',
        mode: 'unsupported_mode',
        effects: [{ type: 'invalid_effect_type', amount: 'not_a_number' }],
      };

      expect(() =>
        createCharacterTechniqueSchema.parse({
          characterId: 10,
          name: 'Técnica Inválida',
          sourceType: 'physical',
          mechanicalBehaviors: [invalidBehavior],
        })
      ).toThrow();

      expect(() =>
        updateCharacterTechniqueSchema.parse({
          mechanicalBehaviors: [invalidBehavior],
        })
      ).toThrow();
    });

    it('accepts mechanicalBehaviors in update payload', () => {
      const parsed = updateCharacterTechniqueSchema.parse({
        mechanicalBehaviors: [validBehavior],
      });

      expect(parsed.mechanicalBehaviors).toHaveLength(1);
      expect(parsed.mechanicalBehaviors?.[0].effects[0].type).toBe('damage');
    });
  });
});
