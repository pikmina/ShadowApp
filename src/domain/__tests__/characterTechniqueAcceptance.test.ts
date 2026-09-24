import { describe, expect, it } from 'vitest';
import {
  characterTechniqueSchema,
  createCharacterTechniqueSchema,
  updateCharacterTechniqueSchema,
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
  type CharacterTechnique,
} from '../characterTechnique';
import { describeMechanicalBehavior } from '../mechanicalDescription';
import { calculateExecutionStaminaCost, type StaminaExecutionCosts } from '../systemMechanics';
import {
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';
import {
  executeMechanicalBehavior,
  createEncounterRuntimeState,
  checkLimitations,
  processDamagePipeline,
  type RuleWorld,
} from '../mechanicalRuntime';
import { getSourceTypeLabel } from '../mechanicalLabels';

describe('Task 29 — CharacterTechnique Acceptance Cases & Combat Gap Audit', () => {
  // =========================================================================
  // FIXTURES
  // =========================================================================

  // Acceptance Case A — Quirk Technique ("Impacto Cinético")
  const createQuirkFixture = (): CharacterTechnique => ({
    id: 'tech_quirk_1',
    characterId: 101,
    name: 'Impacto Cinético',
    description: 'Concentra la energía cinética acumulada y la proyecta como un disparo a distancia.',
    level: 2,
    sourceType: 'quirk',
    revision: 1,
    mechanicalBehaviors: [
      {
        ...createDefaultMechanicalBehavior('b_quirk_1'),
        name: 'Disparo de Fuerza Cinética',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 0,
          description: '',
        },
        resolution: {
          type: 'roll',
          attribute: 'FUE',
          skill: 'Dominio de Quirk',
          attackType: 'physical',
          outcomes: [],
        },
        target: {
          type: 'enemy',
          quantity: { mode: 'exact', count: 1 },
          range: { type: 'distance', distanceMeters: 10 },
        },
        effects: [
          {
            id: 'eff_q1_dmg',
            type: 'damage',
            dice: '2D8',
            damageType: 'cinético',
          },
        ],
      },
    ],
  });

  // Acceptance Case B — Physical / Martial Technique ("Barrido")
  const createPhysicalFixture = (): CharacterTechnique => ({
    id: 'tech_phys_1',
    characterId: 101,
    name: 'Barrido',
    description: 'Maniobra marcial a ras de suelo para desestabilizar al oponente tras un golpe.',
    level: 1,
    sourceType: 'physical',
    revision: 1,
    mechanicalBehaviors: [
      {
        ...createDefaultMechanicalBehavior('b_phys_1'),
        name: 'Barrido Bajo',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 0,
          description: '',
        },
        resolution: {
          type: 'roll',
          attribute: 'DES',
          skill: 'Combate cuerpo a cuerpo',
          attackType: 'physical',
          outcomes: [],
        },
        target: {
          type: 'enemy',
          quantity: { mode: 'exact', count: 1 },
          range: { type: 'contact' },
        },
        effects: [
          {
            id: 'eff_p1_dmg',
            type: 'damage',
            dice: '1D6',
            damageType: 'físico',
          },
          {
            id: 'eff_p1_status',
            type: 'status_apply',
            statusElementId: 'desbalanceado',
            turns: 1,
          },
        ],
      },
    ],
  });

  // Acceptance Case C — Weapon Technique ("Desarme con Arma")
  const createWeaponFixture = (): CharacterTechnique => ({
    id: 'tech_weap_1',
    characterId: 101,
    name: 'Desarme con Arma',
    description: 'Utiliza el arma empuñada para trabar y bloquear la capacidad de acción del enemigo.',
    level: 3,
    sourceType: 'weapon',
    revision: 1,
    mechanicalBehaviors: [
      {
        ...createDefaultMechanicalBehavior('b_weap_1'),
        name: 'Traba y Desarme',
        mode: 'active',
        activation: {
          actionType: 'action',
          timing: 'immediate',
          turns: 0,
          description: '',
        },
        limitations: [
          {
            id: 'lim_w1_equip',
            type: 'item_requirement',
            referenceType: 'category',
            referenceValue: 'arma',
            quantity: 1,
            mode: 'equip',
          },
        ],
        resolution: {
          type: 'roll',
          attribute: 'DES',
          skill: 'Combate con armas',
          attackType: 'physical',
          outcomes: [],
        },
        target: {
          type: 'enemy',
          quantity: { mode: 'exact', count: 1 },
          range: { type: 'contact' },
        },
        effects: [
          {
            id: 'eff_w1_block',
            type: 'action_block',
            blockedAction: 'movement',
            duration: 1,
          },
        ],
      },
    ],
  });

  // =========================================================================
  // 1. ACCEPTANCE CASES VALIDATION
  // =========================================================================

  describe('Acceptance Cases Schema Validation', () => {
    it('A. Quirk fixture validates against canonical CharacterTechnique schema', () => {
      const quirk = createQuirkFixture();
      const parsed = characterTechniqueSchema.parse(quirk);
      expect(parsed.name).toBe('Impacto Cinético');
      expect(parsed.sourceType).toBe('quirk');
      expect(getSourceTypeLabel(parsed.sourceType)).toBe('Don');
    });

    it('B. Physical fixture validates against canonical CharacterTechnique schema', () => {
      const physical = createPhysicalFixture();
      const parsed = characterTechniqueSchema.parse(physical);
      expect(parsed.name).toBe('Barrido');
      expect(parsed.sourceType).toBe('physical');
      expect(getSourceTypeLabel(parsed.sourceType)).toBe('Física');
    });

    it('C. Weapon fixture validates against canonical CharacterTechnique schema', () => {
      const weapon = createWeaponFixture();
      const parsed = characterTechniqueSchema.parse(weapon);
      expect(parsed.name).toBe('Desarme con Arma');
      expect(parsed.sourceType).toBe('weapon');
      expect(getSourceTypeLabel(parsed.sourceType)).toBe('Arma');
      expect(parsed.mechanicalBehaviors[0].limitations?.[0]).toEqual({
        id: 'lim_w1_equip',
        type: 'item_requirement',
        referenceType: 'category',
        referenceValue: 'arma',
        quantity: 1,
        mode: 'equip',
      });
    });
  });

  // =========================================================================
  // 2. PERSISTENCE ROUND-TRIP
  // =========================================================================

  describe('Persistence Round-Trip & JSONB Hydration', () => {
    it('D. All three fixtures survive JSON serialization, hydration, and re-parsing', () => {
      const fixtures = [createQuirkFixture(), createPhysicalFixture(), createWeaponFixture()];

      for (const original of fixtures) {
        // 1. Simulate DB JSONB serialization
        const jsonbString = JSON.stringify(original);
        const hydratedJson = JSON.parse(jsonbString);

        // 2. Parse back through domain schema
        const restored = characterTechniqueSchema.parse(hydratedJson);

        // 3. Verify semantic equality
        expect(restored.id).toBe(original.id);
        expect(restored.name).toBe(original.name);
        expect(restored.sourceType).toBe(original.sourceType);
        expect(restored.level).toBe(original.level);
        expect(restored.mechanicalBehaviors).toEqual(original.mechanicalBehaviors);
      }
    });

    it('E. Derived categories survive round-trip by pure recomputation', () => {
      const quirk = createQuirkFixture();
      const phys = createPhysicalFixture();
      const weap = createWeaponFixture();

      const quirkRestored = characterTechniqueSchema.parse(JSON.parse(JSON.stringify(quirk)));
      const physRestored = characterTechniqueSchema.parse(JSON.parse(JSON.stringify(phys)));
      const weapRestored = characterTechniqueSchema.parse(JSON.parse(JSON.stringify(weap)));

      expect(deriveTechniqueFunctionalCategories(quirkRestored)).toEqual(['offensive']);
      expect(deriveTechniqueFunctionalCategories(physRestored)).toEqual(['offensive', 'control']);
      expect(deriveTechniqueFunctionalCategories(weapRestored)).toEqual(['control']);
    });

    it('F. Roll contracts survive round-trip by pure recomputation', () => {
      const quirk = createQuirkFixture();
      const phys = createPhysicalFixture();
      const weap = createWeaponFixture();

      const quirkContract = deriveTechniqueRollContract(JSON.parse(JSON.stringify(quirk)));
      const physContract = deriveTechniqueRollContract(JSON.parse(JSON.stringify(phys)));
      const weapContract = deriveTechniqueRollContract(JSON.parse(JSON.stringify(weap)));

      expect(quirkContract.hasRoll).toBe(true);
      expect(quirkContract.complete).toBe(true);
      expect(quirkContract.behaviors[0].attribute).toBe('FUE');
      expect(quirkContract.behaviors[0].skill).toBe('Dominio de Quirk');

      expect(physContract.hasRoll).toBe(true);
      expect(physContract.complete).toBe(true);
      expect(physContract.behaviors[0].attribute).toBe('DES');
      expect(physContract.behaviors[0].skill).toBe('Combate cuerpo a cuerpo');

      expect(weapContract.hasRoll).toBe(true);
      expect(weapContract.complete).toBe(true);
      expect(weapContract.behaviors[0].attribute).toBe('DES');
      expect(weapContract.behaviors[0].skill).toBe('Combate con armas');
    });

    it('M, N, O. Generated category, description, and stamina cost are not persisted in schema', () => {
      const parsed = characterTechniqueSchema.parse(createQuirkFixture());
      const rawKeys = Object.keys(parsed);

      expect(rawKeys).not.toContain('functionalCategory');
      expect(rawKeys).not.toContain('functionalCategories');
      expect(rawKeys).not.toContain('staminaCost');
      expect(rawKeys).not.toContain('cost');
      expect(rawKeys).not.toContain('generatedDescription');
      expect(rawKeys).not.toContain('rollContract');
    });
  });

  // =========================================================================
  // 3. MECHANICAL DESCRIPTIONS
  // =========================================================================

  describe('Mechanical Descriptions Generation', () => {
    it('G. Generates meaningful Spanish descriptions for all behaviors without crashing', () => {
      const quirkDesc = describeMechanicalBehavior(createQuirkFixture().mechanicalBehaviors[0]);
      expect(quirkDesc.complete).toBe(true);
      expect(quirkDesc.text).toContain('Tirada de');
      expect(quirkDesc.text).toContain('2D8');
      expect(quirkDesc.text.toLowerCase()).toContain('cinético');

      const physDesc = describeMechanicalBehavior(createPhysicalFixture().mechanicalBehaviors[0]);
      expect(physDesc.complete).toBe(true);
      expect(physDesc.text).toContain('Tirada de');
      expect(physDesc.text).toContain('1D6');
      expect(physDesc.text).toContain('Desbalanceado');

      const weapDesc = describeMechanicalBehavior(createWeaponFixture().mechanicalBehaviors[0]);
      expect(weapDesc.complete).toBe(true);
      expect(weapDesc.text).toContain('Tirada de');
      expect(weapDesc.text).toContain('Requiere');
      expect(weapDesc.text).toContain('Bloquea Movimiento');
    });
  });

  // =========================================================================
  // 4. STAMINA COST DERIVATION
  // =========================================================================

  describe('Stamina Execution Cost Derivation', () => {
    it('H. Base stamina cost derives dynamically from level without persistence', () => {
      const costsConfig: StaminaExecutionCosts = {
        baseAction: 2,
        objectUse: 2,
        techniqueByLevel: [
          { level: 1, cost: 3 },
          { level: 2, cost: 5 },
          { level: 3, cost: 8 },
          { level: 4, cost: 12 },
          { level: 5, cost: 17 },
        ],
        skillByLevel: [],
      };

      const quirk = createQuirkFixture(); // Level 2
      const phys = createPhysicalFixture(); // Level 1
      const weap = createWeaponFixture(); // Level 3

      const quirkCost = calculateExecutionStaminaCost([], [], costsConfig, 'technique', quirk.level);
      const physCost = calculateExecutionStaminaCost([], [], costsConfig, 'technique', phys.level);
      const weapCost = calculateExecutionStaminaCost([], [], costsConfig, 'technique', weap.level);

      expect(quirkCost).toBe(5);
      expect(physCost).toBe(3);
      expect(weapCost).toBe(8);
    });
  });

  // =========================================================================
  // 5. EDITOR ROUND-TRIP & SOURCE INDEPENDENCE
  // =========================================================================

  describe('Editor Round-Trip & Source Independence', () => {
    it('K. Changing sourceType does NOT mutate mechanics, resolution, or level', () => {
      const quirk = createQuirkFixture();

      // Simulate editor user changing source type from quirk to physical
      const updatedPayload = updateCharacterTechniqueSchema.parse({
        sourceType: 'physical',
      });

      const nextTechnique: CharacterTechnique = {
        ...quirk,
        ...updatedPayload,
        revision: quirk.revision + 1,
      };

      expect(nextTechnique.sourceType).toBe('physical');
      expect(nextTechnique.mechanicalBehaviors[0].resolution).toEqual(
        quirk.mechanicalBehaviors[0].resolution
      );
      expect(nextTechnique.mechanicalBehaviors[0].effects).toEqual(
        quirk.mechanicalBehaviors[0].effects
      );
      expect(nextTechnique.level).toBe(quirk.level);
      expect(nextTechnique.revision).toBe(2);
    });

    it('L. Edit increments revision and preserves all unedited mechanics', () => {
      const original = createPhysicalFixture();
      const updatePayload = updateCharacterTechniqueSchema.parse({
        level: 2,
      });

      const updated = characterTechniqueSchema.parse({
        ...original,
        ...updatePayload,
        revision: original.revision + 1,
      });

      expect(updated.revision).toBe(2);
      expect(updated.level).toBe(2);
      expect(updated.name).toBe('Barrido');
      expect(updated.mechanicalBehaviors).toEqual(original.mechanicalBehaviors);
    });
  });

  // =========================================================================
  // 6. INDEPENDENCE AUDIT & CHARACTERIZATION
  // =========================================================================

  describe('Independence Audit (Defense, Source, Category)', () => {
    it('P. Attribute does not imply or force target defense (Attribute independence)', () => {
      // Physical attacks can use FUE, DES, VEL; Mental can use VOL, INT, DES
      const b1 = {
        ...createDefaultMechanicalBehavior('b1'),
        resolution: { type: 'roll' as const, attribute: 'INT', skill: 'Dominio de Quirk', outcomes: [] },
      };
      const b2 = {
        ...createDefaultMechanicalBehavior('b2'),
        resolution: { type: 'roll' as const, attribute: 'DES', skill: 'Ilusión Mental', outcomes: [] },
      };

      const c1 = deriveTechniqueRollContract([b1]);
      const c2 = deriveTechniqueRollContract([b2]);

      expect(c1.behaviors[0].attribute).toBe('INT');
      expect(c2.behaviors[0].attribute).toBe('DES');
      // Neither roll contract fabricates EVA or COR
      expect((c1.behaviors[0] as any).targetDefense).toBeUndefined();
      expect((c2.behaviors[0] as any).targetDefense).toBeUndefined();
    });

    it('Q. SourceType does not imply or force target defense', () => {
      // Don/Quirk does not mean Mental; Physical does not mean EVA
      const quirk = createQuirkFixture();
      const phys = createPhysicalFixture();

      expect((quirk as any).targetDefense).toBeUndefined();
      expect((phys as any).targetDefense).toBeUndefined();
    });

    it('R. Functional category does not imply or force target defense', () => {
      const categories = deriveTechniqueFunctionalCategories(createPhysicalFixture());
      expect(categories).toEqual(['offensive', 'control']);
      // Categories only describe mechanical action, not defense stat
      expect(categories).not.toContain('eva');
      expect(categories).not.toContain('cor');
    });
  });

  // =========================================================================
  // 7. RUNTIME AUDIT & GAP CHARACTERIZATION
  // =========================================================================

  describe('Runtime Audit & Gap Characterization', () => {
    it('GAP AUDIT: item_requirement mode="equip" is currently NOT checked by checkLimitations', () => {
      const weaponBehavior = createWeaponFixture().mechanicalBehaviors[0];
      const entityState = {
        resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
        barrier: 0,
        attributes: { DES: 3 },
        modifiers: [],
        statuses: [],
        inventory: {}, // 0 weapons in inventory
      };
      const participant = {
        entityId: 'hero',
        currentTurn: 1,
        damageReceivedThisTurn: 0,
        damageDealtThisTurn: 0,
        esSpentThisTurn: 0,
        esRecoveredThisTurn: 0,
        hpLostThisTurn: 0,
        hpRecoveredThisTurn: 0,
        usedQuirkThisTurn: false,
        usedQuirkPreviousTurn: false,
        consecutiveTurnsQuirkUsed: 0,
        activeCounters: {},
        pendingModifiers: [],
        activeTimedEffects: [],
        reservedInventory: {},
        cooldowns: {},
        usageCounters: {},
        executedBehaviorEvents: [],
      };

      // Limitation check passes because mode="equip" is not evaluated by checkLimitations (RUNTIME GAP)
      const limResult = checkLimitations(weaponBehavior, participant, entityState, 1);
      expect(limResult.passed).toBe(true);
    });

    it('GAP AUDIT: Damage pipeline evaluates raw dice without Daño Base or Attribute scaling', () => {
      const world: RuleWorld = {
        hero: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { FUE: 5, DES: 4 }, // High attributes
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        target: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { RES: 3 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const encounter = createEncounterRuntimeState();
      const res = processDamagePipeline({
        baseDamage: 8, // from 1D8
        attackerId: 'hero',
        targetId: 'target',
        world,
        encounter,
      });

      // Exactly 8 damage dealt, no FUE (+5) or Daño Base added automatically
      expect(res.finalDamage).toBe(8);
      expect(res.newWorld.target.resources.SA.current).toBe(12);
    });

    it('Multi-effect atomicity: damage + status_apply both apply on execution', () => {
      const physBehavior = createPhysicalFixture().mechanicalBehaviors[0];
      const world: RuleWorld = {
        hero: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { DES: 3 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        target: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { RES: 2 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const encounter = createEncounterRuntimeState();
      const execResult = executeMechanicalBehavior({
        behavior: physBehavior,
        sourceEntityId: 'hero',
        targetEntityId: 'target',
        world,
        encounter,
        rollResult: 14,
      });

      expect(execResult.success).toBe(true);
      expect(execResult.appliedEffects.map((e) => e.type)).toEqual(['damage', 'status_apply']);
      expect(execResult.newWorld.target.statuses).toHaveLength(1);
      expect(execResult.newWorld.target.statuses[0].statusElementId).toBe('desbalanceado');
    });

    it('Multi-effect interception: intercepting one effect allows other effects to proceed', () => {
      const physBehavior = createPhysicalFixture().mechanicalBehaviors[0];
      const world: RuleWorld = {
        hero: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { DES: 3 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        target: {
          resources: { SA: { current: 20, max: 20 }, ES: { current: 10, max: 20 } },
          barrier: 0,
          attributes: { RES: 2 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const encounter = createEncounterRuntimeState();
      // Intercept only status_apply, not damage
      const execResult = executeMechanicalBehavior({
        behavior: physBehavior,
        sourceEntityId: 'hero',
        targetEntityId: 'target',
        world,
        encounter,
        rollResult: 14,
        interceptIncomingEffect: (ctx) => {
          if (ctx.effect.type === 'status_apply') {
            return { blocked: true, blockedReason: 'Inmune a estados' };
          }
          return { blocked: false };
        },
      });

      expect(execResult.success).toBe(true);
      // Status was blocked, but damage applied
      expect(execResult.newWorld.target.statuses).toHaveLength(0);
      expect(execResult.newWorld.target.resources.SA.current).toBeLessThan(20);
    });
  });
});
