import { describe, it, expect } from 'vitest';
import {
  deriveTechniqueRollContract,
  deriveTechniqueFunctionalCategories,
  type CharacterTechnique,
} from '../characterTechnique';
import {
  deriveTargetDefense,
  type MechanicalBehavior,
} from '../mechanicalBehavior';
import {
  deriveSupportDefenseRD,
  calculateTechniqueStructuralCost,
  DEFAULT_SUPPORT_DIFFICULTY_TIERS,
  type SupportDifficultyTier,
} from '../systemMechanics';
import { describeMechanicalResolution } from '../mechanicalDescription';

function createBehavior(partial: Partial<MechanicalBehavior> & { id: string }): MechanicalBehavior {
  return {
    id: partial.id,
    name: partial.name ?? '',
    mode: partial.mode ?? 'active',
    conditions: partial.conditions ?? [],
    conditionLogic: partial.conditionLogic ?? 'all',
    limitations: partial.limitations ?? [],
    effects: partial.effects ?? [],
    resolution: partial.resolution,
    target: partial.target,
    activation: partial.activation,
    trigger: partial.trigger,
    temporality: partial.temporality,
    control: partial.control,
  };
}

describe('Action Roll Resolution & Opposition Architecture Contract', () => {
  // =========================================================================
  // 1. ATTACK TYPE & TARGET DEFENSE DERIVATION
  // =========================================================================
  describe('1. Attack Type & Deterministic Target Defense Derivation', () => {
    it('A. derives EVA (Evasión) for physical attackType', () => {
      expect(deriveTargetDefense('physical')).toBe('EVA');
    });

    it('B. derives COR (Coraje) for mental attackType', () => {
      expect(deriveTargetDefense('mental')).toBe('COR');
    });

    it('C. returns undefined for non-attack or invalid types', () => {
      expect(deriveTargetDefense(undefined)).toBeUndefined();
      expect(deriveTargetDefense(null)).toBeUndefined();
      expect(deriveTargetDefense('')).toBeUndefined();
    });

    it('D. Attribute does NOT determine defense (FUE physical -> EVA, FUE mental -> COR)', () => {
      const b1 = createBehavior({
        id: 'b1',
        resolution: { type: 'roll', attribute: 'FUE', attackType: 'physical' },
      });
      const b2 = createBehavior({
        id: 'b2',
        resolution: { type: 'roll', attribute: 'FUE', attackType: 'mental' },
      });

      const contract1 = deriveTechniqueRollContract([b1]);
      const contract2 = deriveTechniqueRollContract([b2]);

      expect(contract1.behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(contract2.behaviors[0].opposition?.targetDefense).toBe('COR');
    });

    it('E. DES, VEL, RES, INT, VOL all follow attackType, not attribute', () => {
      const physicalTests = ['DES', 'VEL', 'RES', 'INT', 'VOL'];
      for (const attr of physicalTests) {
        const b = createBehavior({
          id: `b_${attr}`,
          resolution: { type: 'roll', attribute: attr, attackType: 'physical' },
        });
        const contract = deriveTechniqueRollContract([b]);
        expect(contract.behaviors[0].opposition?.targetDefense).toBe('EVA');
        expect(contract.behaviors[0].opposition?.label).toBe('Evasión');
      }

      const mentalTests = ['INT', 'VOL', 'DES', 'FUE', 'VEL'];
      for (const attr of mentalTests) {
        const b = createBehavior({
          id: `b_${attr}`,
          resolution: { type: 'roll', attribute: attr, attackType: 'mental' },
        });
        const contract = deriveTechniqueRollContract([b]);
        expect(contract.behaviors[0].opposition?.targetDefense).toBe('COR');
        expect(contract.behaviors[0].opposition?.label).toBe('Coraje');
      }
    });

    it('F. SourceType (quirk, physical, weapon) does NOT determine defense', () => {
      const behavior = createBehavior({
        id: 'b1',
        resolution: { type: 'roll', attribute: 'INT', skill: 'Dominio de Quirk', attackType: 'physical' },
      });

      const techQuirk: CharacterTechnique = {
        id: 't1',
        characterId: 1,
        name: 'Golpe Ígneo',
        description: '',
        level: 1,
        sourceType: 'quirk',
        mechanicalBehaviors: [behavior],
        revision: 1,
      };

      const techWeapon: CharacterTechnique = {
        ...techQuirk,
        sourceType: 'weapon',
      };

      const techPhysical: CharacterTechnique = {
        ...techQuirk,
        sourceType: 'physical',
      };

      expect(deriveTechniqueRollContract(techQuirk).behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(deriveTechniqueRollContract(techWeapon).behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(deriveTechniqueRollContract(techPhysical).behaviors[0].opposition?.targetDefense).toBe('EVA');
    });

    it('G. Functional category does NOT determine defense', () => {
      // Control technique with mental attack
      const controlBehavior = createBehavior({
        id: 'b_ctrl',
        effects: [{ id: 'e1', type: 'status_apply', statusElementId: 'core.status.stunned' }],
        resolution: { type: 'roll', attribute: 'VOL', attackType: 'mental' },
      });

      const contract = deriveTechniqueRollContract([controlBehavior]);
      expect(contract.behaviors[0].opposition?.targetDefense).toBe('COR');
    });
  });

  // =========================================================================
  // 2. SUPPORT & DEFENSE RD SYSTEM RULES
  // =========================================================================
  describe('2. Support & Defense RD System Rule Derivation', () => {
    it('A. applies default RD threshold boundaries correctly', () => {
      // Cost <= 3 -> Normal -> RD 12
      expect(deriveSupportDefenseRD(0)).toBe(12);
      expect(deriveSupportDefenseRD(1)).toBe(12);
      expect(deriveSupportDefenseRD(2)).toBe(12);
      expect(deriveSupportDefenseRD(3)).toBe(12);

      // Cost <= 6 -> Complicado -> RD 16
      expect(deriveSupportDefenseRD(4)).toBe(16);
      expect(deriveSupportDefenseRD(5)).toBe(16);
      expect(deriveSupportDefenseRD(6)).toBe(16);

      // Cost <= 10 -> Difícil -> RD 20
      expect(deriveSupportDefenseRD(7)).toBe(20);
      expect(deriveSupportDefenseRD(8)).toBe(20);
      expect(deriveSupportDefenseRD(9)).toBe(20);
      expect(deriveSupportDefenseRD(10)).toBe(20);

      // Cost > 10 -> Muy Difícil -> RD 24
      expect(deriveSupportDefenseRD(11)).toBe(24);
      expect(deriveSupportDefenseRD(15)).toBe(24);
      expect(deriveSupportDefenseRD(100)).toBe(24);
    });

    it('B. handles custom configured system tiers cleanly', () => {
      const customTiers: SupportDifficultyTier[] = [
        { maxCost: 2, difficultyId: 'easy', difficultyName: 'Fácil', rd: 10 },
        { maxCost: 5, difficultyId: 'medium', difficultyName: 'Medio', rd: 14 },
        { maxCost: 8, difficultyId: 'hard', difficultyName: 'Duro', rd: 18 },
        { maxCost: 9999, difficultyId: 'extreme', difficultyName: 'Extremo', rd: 22 },
      ];

      expect(deriveSupportDefenseRD(1, customTiers)).toBe(10);
      expect(deriveSupportDefenseRD(2, customTiers)).toBe(10);
      expect(deriveSupportDefenseRD(3, customTiers)).toBe(14);
      expect(deriveSupportDefenseRD(5, customTiers)).toBe(14);
      expect(deriveSupportDefenseRD(6, customTiers)).toBe(18);
      expect(deriveSupportDefenseRD(8, customTiers)).toBe(18);
      expect(deriveSupportDefenseRD(9, customTiers)).toBe(22);
    });

    it('C. derives opposition for Support/Defense techniques from structural cost', () => {
      const supportBehavior = createBehavior({
        id: 'b_supp',
        effects: [{ id: 'e1', type: 'healing', resourceId: 'SA', amount: 10 }],
        resolution: { type: 'rd', attribute: 'INT', skill: 'Medicina' },
      });

      // Structural cost 5 -> Complicado (RD 16)
      const contract1 = deriveTechniqueRollContract([supportBehavior], { structuralCost: 5 });
      expect(contract1.behaviors[0].opposition).toEqual({
        kind: 'support_defense_rd',
        derivedDifficulty: 16,
        label: 'RD 16',
      });
      expect(contract1.behaviors[0].rollFormula).toBe('2D10 + INT + Medicina vs. RD 16');

      // Structural cost 8 -> Difícil (RD 20)
      const contract2 = deriveTechniqueRollContract([supportBehavior], { structuralCost: 8 });
      expect(contract2.behaviors[0].opposition?.derivedDifficulty).toBe(20);
      expect(contract2.behaviors[0].rollFormula).toBe('2D10 + INT + Medicina vs. RD 20');
    });

    it('D. Structural cost vs. Effective cost distinction', () => {
      // Intrinsic structural cost is based on level minimum and configured mechanics
      const tech = {
        level: 2,
        mechanicalBehaviors: [
          createBehavior({
            id: 'b1',
            effects: [{ id: 'e1', type: 'healing', resourceId: 'SA', amount: 15 }],
          }),
        ],
      };

      const policy = {
        baseAction: 2,
        objectUse: 1,
        techniqueByLevel: [
          { level: 1, cost: 3 },
          { level: 2, cost: 7 },
        ],
        skillByLevel: [{ level: 1, cost: 2 }],
      };

      // Structural cost is 7
      const structuralCost = calculateTechniqueStructuralCost(tech, [], policy);
      expect(structuralCost).toBe(7);

      // Support RD is derived from structural cost 7 -> RD 20
      const derivedRd = deriveSupportDefenseRD(structuralCost);
      expect(derivedRd).toBe(20);

      // If a character has a trait reducing effective cost by 1 (effective = 6),
      // the Support RD MUST still be derived from the structural cost 7 (RD 20)!
      const characterCostReduction = 1;
      const effectiveStaminaCost = structuralCost - characterCostReduction;
      expect(effectiveStaminaCost).toBe(6);

      // Verifying RD is NOT derived from effectiveStaminaCost
      const derivedFromEffective = deriveSupportDefenseRD(effectiveStaminaCost);
      expect(derivedFromEffective).toBe(16); // That would be a bug if used for opposition!
      expect(derivedRd).toBe(20); // Correct authoritative derived RD
    });
  });

  // =========================================================================
  // 3. COMPLETE OPPOSITION SPECTRUM & ROLL CONTRACTS
  // =========================================================================
  describe('3. Action Roll Contracts & Formula Formatting', () => {
    it('A. Physical Attack roll contract', () => {
      const b = createBehavior({
        id: 'b_phys',
        effects: [{ id: 'e1', type: 'damage', dice: '2d6' }],
        resolution: {
          type: 'roll',
          attribute: 'DES',
          skill: 'Combate cuerpo a cuerpo',
          attackType: 'physical',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.complete).toBe(true);
      expect(contract.warnings).toHaveLength(0);

      const bContract = contract.behaviors[0];
      expect(bContract.opposition).toEqual({
        kind: 'target_evasion',
        targetDefense: 'EVA',
        label: 'Evasión',
      });
      expect(bContract.rollFormula).toBe('2D10 + DES + Combate cuerpo a cuerpo vs. Evasión');
    });

    it('B. Mental Attack roll contract', () => {
      const b = createBehavior({
        id: 'b_ment',
        effects: [{ id: 'e1', type: 'damage', dice: '1d10' }],
        resolution: {
          type: 'roll',
          attribute: 'INT',
          skill: 'Dominio de Quirk',
          attackType: 'mental',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.complete).toBe(true);

      const bContract = contract.behaviors[0];
      expect(bContract.opposition).toEqual({
        kind: 'target_courage',
        targetDefense: 'COR',
        label: 'Coraje',
      });
      expect(bContract.rollFormula).toBe('2D10 + INT + Dominio de Quirk vs. Coraje');
    });

    it('C. Explicit RD roll contract', () => {
      const b = createBehavior({
        id: 'b_rd',
        resolution: {
          type: 'rd',
          attribute: 'INT',
          skill: 'Investigación',
          difficulty: 18,
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.complete).toBe(true);

      const bContract = contract.behaviors[0];
      expect(bContract.opposition).toEqual({
        kind: 'explicit_rd',
        explicitDifficulty: 18,
        label: 'RD 18',
      });
      expect(bContract.rollFormula).toBe('2D10 + INT + Investigación vs. RD 18');
    });

    it('D. Narrator / Contextual RD roll contract', () => {
      const b = createBehavior({
        id: 'b_narrator',
        resolution: {
          type: 'rd',
          attribute: 'INT',
          skill: 'Investigación',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.complete).toBe(true);

      const bContract = contract.behaviors[0];
      expect(bContract.opposition).toEqual({
        kind: 'narrator_rd',
        label: 'RD del Narrador',
      });
      expect(bContract.rollFormula).toBe('2D10 + INT + Investigación vs. RD del Narrador');
    });

    it('E. Attribute-only rolls are valid (Skill is optional)', () => {
      const b = createBehavior({
        id: 'b_attr_only',
        resolution: {
          type: 'roll',
          attribute: 'FUE',
          attackType: 'physical',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.complete).toBe(true);
      expect(contract.behaviors[0].rollFormula).toBe('2D10 + FUE vs. Evasión');
    });

    it('F. Missing attribute on roll reports incomplete with warning', () => {
      const b = createBehavior({
        id: 'b_missing_attr',
        name: 'Ataque Rápido',
        resolution: {
          type: 'roll',
          attackType: 'physical',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.complete).toBe(false);
      expect(contract.warnings).toContain(
        'El comportamiento "Ataque Rápido" requiere especificar un atributo para la tirada de resolución.'
      );
      expect(contract.warnings[0]).not.toContain('b_missing_attr');
    });

    it('G. Offensive roll missing attackType reports incomplete with warning', () => {
      const b = createBehavior({
        id: 'b_missing_type',
        name: 'Impacto Fuerte',
        effects: [{ id: 'e1', type: 'damage', dice: '2d6' }],
        resolution: {
          type: 'roll',
          attribute: 'DES',
        },
      });

      const contract = deriveTechniqueRollContract([b]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.complete).toBe(false);
      expect(contract.warnings).toContain(
        'El comportamiento "Impacto Fuerte" de ataque requiere clasificar el tipo de ataque (Físico o Mental).'
      );
      expect(contract.warnings[0]).not.toContain('b_missing_type');
    });
  });

  // =========================================================================
  // 4. HYBRID & MULTI-BEHAVIOR TECHNIQUES
  // =========================================================================
  describe('4. Multi-behavior Hybrid Techniques', () => {
    it('A. preserves independent resolutions across multiple behaviors', () => {
      const behaviorAttack = createBehavior({
        id: 'b_atk',
        effects: [{ id: 'e1', type: 'damage', dice: '3d6' }],
        resolution: {
          type: 'roll',
          attribute: 'FUE',
          skill: 'Combate cuerpo a cuerpo',
          attackType: 'physical',
        },
      });

      const behaviorControl = createBehavior({
        id: 'b_ctrl',
        effects: [{ id: 'e2', type: 'status_apply', statusElementId: 'core.status.stunned' }],
        resolution: {
          type: 'automatic',
        },
      });

      const contract = deriveTechniqueRollContract([behaviorAttack, behaviorControl]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.complete).toBe(true);
      expect(contract.behaviors).toHaveLength(2);

      // First behavior has physical roll vs EVA
      expect(contract.behaviors[0].requiresRoll).toBe(true);
      expect(contract.behaviors[0].opposition?.targetDefense).toBe('EVA');

      // Second behavior is automatic
      expect(contract.behaviors[1].requiresRoll).toBe(false);
      expect(contract.behaviors[1].resolutionType).toBe('automatic');
    });
  });

  // =========================================================================
  // 5. MECHANICAL DESCRIPTION RENDERING IN SPANISH
  // =========================================================================
  describe('5. Spanish Mechanical Description Rendering', () => {
    it('A. renders physical attack description with vs. Evasión', () => {
      const res = describeMechanicalResolution({
        type: 'roll',
        attribute: 'DES',
        skill: 'Combate cuerpo a cuerpo',
        attackType: 'physical',
      });
      expect(res.text).toBe('Tirada de DES + Combate cuerpo a cuerpo vs. Evasión');
    });

    it('B. renders mental attack description with vs. Coraje', () => {
      const res = describeMechanicalResolution({
        type: 'roll',
        attribute: 'INT',
        skill: 'Dominio de Quirk',
        attackType: 'mental',
      });
      expect(res.text).toBe('Tirada de INT + Dominio de Quirk vs. Coraje');
    });

    it('C. renders explicit RD description', () => {
      const res = describeMechanicalResolution({
        type: 'rd',
        attribute: 'INT',
        skill: 'Medicina',
        difficulty: 16,
      });
      expect(res.text).toBe('Superar RD 16 en INT + Medicina');
    });

    it('D. renders automatic resolution description', () => {
      const res = describeMechanicalResolution({
        type: 'automatic',
      });
      expect(res.text).toBe('Resolución automática');
    });
  });
});
