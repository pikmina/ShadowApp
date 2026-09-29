import { describe, test, expect } from 'vitest';
import {
  createCoreCategories,
  getCategoryOptions,
  migrateCanonicalCatalogRulesData4B,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findConsequenceOption,
  findCapOption,
} from '../systemMechanics';
import {
  processDamagePipeline,
  processHealingPipeline,
  executeMechanicalBehavior,
  executeMultiTargetBehavior,
  advanceTurn,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  type RuleWorld,
} from '../mechanicalRuntime';
import { describeMechanicalBehavior } from '../mechanicalDescription';
import { type MechanicalBehavior } from '../mechanicalBehavior';

describe('RULES-DATA-4B — Consecuencias, Efectos Secundarios y Caps', () => {
  const categories = createCoreCategories();

  // =========================================================================
  // 1. CATALOG COSTS AND VISIBILITY (8 CANONICAL RULES)
  // =========================================================================
  describe('1. Catálogo Canónico y Costes de Consecuencias y Caps', () => {
    test('1. Recibe 1 punto de daño cada turno activo => -1 CE', () => {
      const opt = findConsequenceOption(categories, 'self_damage_turn');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);
    });

    test('2. Recibe 2 puntos de daño al utilizarla => -1 CE', () => {
      const opt = findConsequenceOption(categories, 'self_damage_fixed_2');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);
    });

    test('3. Recibe la mitad del daño provocado (recoil 50%) => -4 CE', () => {
      const opt = findConsequenceOption(categories, 'recoil_half');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-4);
    });

    test('4. Al finalizar: -2 INT durante 3 turnos => -3 CE', () => {
      const opt = findConsequenceOption(categories, 'after_effect_int2_3t');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-3);
    });

    test('5. -2 DES mientras el efecto está activo => -2 CE', () => {
      const opt = findConsequenceOption(categories, 'while_active_des2');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-2);
    });

    test('6. -2 INT cada turno activo => -1 CE (Marcado pending/isAvailable=false por ambigüedad)', () => {
      const opt = findConsequenceOption(categories, 'int2_per_active_turn');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-1);

      const options = getCategoryOptions(categories, 'consequence');
      const rule = options.find((r) => r.runtimeKey === 'int2_per_active_turn');
      expect(rule).toBeDefined();
      expect(rule?.isAvailable).toBe(false);
    });

    test('7. Si queda en 5 de EST o menos, adquiere Sobrecalentado => -3 CE', () => {
      const opt = findConsequenceOption(categories, 'overheated_threshold');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-3);
    });

    test('8. Absorbe un máximo de 6 de daño recibido => -3 CE', () => {
      const opt = findCapOption(categories, 'absorb_max_6');
      expect(opt).toBeDefined();
      expect(opt?.cost).toBe(-3);
    });
  });

  // =========================================================================
  // 2. RUNTIME EXECUTION TESTS
  // =========================================================================
  describe('2. Pruebas de Runtime de Consecuencias y Caps', () => {
    test('Rule 2. Fixed Self Damage 2 HP: Daño 3D6 (5 CE) + Daño propio 2 HP (-1 CE) = 4 CE', () => {
      const b: MechanicalBehavior = {
        id: 'b_self_dmg_2',
        name: 'Ataque con Recarga Cruel',
        mode: 'active',
        target: { type: 'enemy' },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'self_damage_fixed_2', amount: 2, when: 'activation' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // +5 CE
        ],
      };

      // 5 (3D6) + (-1 daño propio 2 HP) = 4 CE
      const cost = calculateTechniqueStructuralCost([b], categories);
      expect(cost).toBe(4);

      const world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      const encounter = createEncounterRuntimeState(1);

      const res = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(res.success).toBe(true);
      // Hero suffers 2 HP self damage upon activation (30 -> 28 HP)
      expect(res.newWorld.hero.resources.SA.current).toBe(28);
    });

    test('Rule 2. Fixed Self Damage with Activation Delay: No se aplica al declarar, se aplica al resolver', () => {
      const b: MechanicalBehavior = {
        id: 'b_self_dmg_delay',
        name: 'Disparo Retardado Doloroso',
        mode: 'active',
        target: { type: 'enemy' },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        activation: { actionType: 'action', timing: 'turns', turns: 2 }, // Delay de 2 turnos
        consequences: [
          { type: 'self_damage_fixed_2', amount: 2, when: 'activation' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '2D6' },
        ],
      };

      let world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Declarar en Turno 1 (con delay de 2 turnos)
      const resDecl = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(resDecl.success).toBe(true);
      // Hero NO debe sufrir daño todavía en la declaración
      expect(resDecl.newWorld.hero.resources.SA.current).toBe(30);

      world = resDecl.newWorld;
      encounter = resDecl.newEncounter;

      // Avanzar a Turno 2 -> Sigue sin activarse
      encounter = advanceTurn(encounter, {}, world);
      expect(world.hero.resources.SA.current).toBe(30);

      // Avanzar a Turno 3 -> Se resuelve la técnica (declaredAtTurn=1 + delay=2 => Turno 3)
      encounter = advanceTurn(encounter, {}, world);
      // Hero ahora sí sufre el daño de activación de 2 HP (30 -> 28 HP)
      expect(world.hero.resources.SA.current).toBe(28);
    });

    test('Rule 1. Periodic Self Damage (1 HP per active turn): Exactamente 1 tick por turno, no dobla al activar', () => {
      const b: MechanicalBehavior = {
        id: 'b_self_dmg_per_turn',
        name: 'Aura Abrasadora',
        mode: 'active',
        target: { type: 'enemy' },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'self_damage_turn', amount: 1, when: 'each_turn' },
        ],
        temporality: {
          duration: { type: 'turns', turns: 3 }, // +2 CE
        },
        effects: [
          { id: 'e1', type: 'damage', dice: '2D6' }, // +3 CE
        ],
      };

      // 3 (2D6) + 2 (duración 3 turnos) + (-1 daño propio por turno) = 4 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(4);

      let world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Activar en Turno 1
      const res = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(res.success).toBe(true);
      world = res.newWorld;
      encounter = res.newEncounter;

      // Turno 1: No pierde daño por turno inmediatamente doble
      expect(world.hero.resources.SA.current).toBe(30);

      // Avanzar a Turno 2 -> Tick 1 (30 -> 29 HP)
      encounter = advanceTurn(encounter, {}, world);
      expect(world.hero.resources.SA.current).toBe(29);

      // Avanzar a Turno 3 -> Tick 2 (29 -> 28 HP)
      encounter = advanceTurn(encounter, {}, world);
      expect(world.hero.resources.SA.current).toBe(28);

      // Avanzar a Turno 4 -> Tick 3 (28 -> 27 HP)
      encounter = advanceTurn(encounter, {}, world);
      expect(world.hero.resources.SA.current).toBe(27);

      // Avanzar a Turno 5 -> Efecto expira, no recibe más daño (permanece 27 HP)
      encounter = advanceTurn(encounter, {}, world);
      expect(world.hero.resources.SA.current).toBe(27);
    });

    test('Rule 3. Recoil 50% Canonical - Dealt Damage, Mitigations, Barriers, Multi-target and Recursion Safety', () => {
      const bRecoil: MechanicalBehavior = {
        id: 'b_recoil_canonical',
        name: 'Embiste Impactante Canónico',
        mode: 'active',
        target: { type: 'enemy' },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'recoil_half', fraction: 0.5, when: 'after_damage' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '10' }, // 10 daño raw/fijo
        ],
      };

      const worldTemplate: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      const encounter = createEncounterRuntimeState(1);

      // A. Raw 10, no mitigation -> final 10 -> recoil 5
      const resA = executeMechanicalBehavior({
        behavior: bRecoil,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: structuredClone(worldTemplate),
        encounter,
      });
      expect(resA.success).toBe(true);
      expect(resA.newWorld.dummy.resources.SA.current).toBe(20); // 30 - 10 = 20
      expect(resA.newWorld.hero.resources.SA.current).toBe(25); // 30 - 5 = 25 (Recoil 5)

      // B. Raw 10, barrier absorbs 6 -> final 4 -> recoil 2
      const worldWithBarrier = structuredClone(worldTemplate);
      worldWithBarrier.dummy.barrier = 6;
      const resB = executeMechanicalBehavior({
        behavior: bRecoil,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: worldWithBarrier,
        encounter,
      });
      expect(resB.success).toBe(true);
      expect(resB.newWorld.dummy.barrier).toBe(0); // barrier drops 6 -> 0
      expect(resB.newWorld.dummy.resources.SA.current).toBe(26); // 30 - (10 - 6) = 26
      expect(resB.newWorld.hero.resources.SA.current).toBe(28); // 30 - 2 = 28 (Recoil 2)

      // C. Raw 10, RD/mitigation 4 (via target modifier) -> final 6 -> recoil 3
      const worldWithRD = structuredClone(worldTemplate);
      const encounterWithRD = structuredClone(encounter);
      encounterWithRD.participants.dummy = createParticipantRuntimeState('dummy', 1);
      // Pending modifier of -4 damage as mitigation
      encounterWithRD.participants.dummy.pendingModifiers.push({
        id: 'rd_4',
        sourceBehaviorId: 'test_rd',
        scope: 'all',
        type: 'damage',
        amount: -4,
        operation: 'add',
        duration: 'until_turn_end',
      });
      const resC = executeMechanicalBehavior({
        behavior: bRecoil,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: worldWithRD,
        encounter: encounterWithRD,
      });
      expect(resC.success).toBe(true);
      expect(resC.newWorld.dummy.resources.SA.current).toBe(24); // 30 - (10 - 4) = 24
      expect(resC.newWorld.hero.resources.SA.current).toBe(27); // 30 - 3 = 27 (Recoil 3)

      // D. Raw 10, fully mitigated (barrier 10) -> final 0 -> recoil 0
      const worldFullyMitigated = structuredClone(worldTemplate);
      worldFullyMitigated.dummy.barrier = 10;
      const resD = executeMechanicalBehavior({
        behavior: bRecoil,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: worldFullyMitigated,
        encounter,
      });
      expect(resD.success).toBe(true);
      expect(resD.newWorld.dummy.barrier).toBe(0);
      expect(resD.newWorld.dummy.resources.SA.current).toBe(30); // 30 - 0 = 30
      expect(resD.newWorld.hero.resources.SA.current).toBe(30); // 30 - 0 = 30 (Recoil 0)

      // E. final damage 7 -> recoil 3 (using custom dice '7')
      const b7: MechanicalBehavior = { ...bRecoil, id: 'b_recoil_7', effects: [{ id: 'e1', type: 'damage', dice: '7' }] };
      const resE = executeMechanicalBehavior({
        behavior: b7,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: structuredClone(worldTemplate),
        encounter,
      });
      expect(resE.success).toBe(true);
      expect(resE.newWorld.dummy.resources.SA.current).toBe(23); // 30 - 7 = 23
      expect(resE.newWorld.hero.resources.SA.current).toBe(27); // 30 - Math.floor(7 * 0.5) = 27 (Recoil 3)

      // F. final damage 1 -> recoil 0 (using custom dice '1')
      const b1: MechanicalBehavior = { ...bRecoil, id: 'b_recoil_1', effects: [{ id: 'e1', type: 'damage', dice: '1' }] };
      const resF = executeMechanicalBehavior({
        behavior: b1,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: structuredClone(worldTemplate),
        encounter,
      });
      expect(resF.success).toBe(true);
      expect(resF.newWorld.dummy.resources.SA.current).toBe(29); // 30 - 1 = 29
      expect(resF.newWorld.hero.resources.SA.current).toBe(30); // 30 - Math.floor(1 * 0.5) = 30 (Recoil 0)

      // G. Recoil does not recursively generate recoil (verified because hero only takes the recoilDmg once and is not looped)
      expect(resA.newWorld.hero.resources.SA.current).toBe(25); // exactly 25, no double hit.

      // H. Multi-target sum support: target A final 6, target B final 4 -> total final 10 -> recoil 5
      const bMulti: MechanicalBehavior = {
        id: 'b_multi_recoil',
        name: 'Ataque Multi Recoil',
        mode: 'active',
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 2 },
        },
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'recoil_half', fraction: 0.5, when: 'after_damage' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '10' }, // raw damage 10 to each
        ],
      };

      const worldMulti = structuredClone(worldTemplate);
      // target A (dummy) gets barrier 4 -> final 6
      worldMulti.dummy.barrier = 4;
      // target B (dummy2) gets barrier 6 -> final 4
      worldMulti.dummy2 = {
        id: 'dummy2',
        name: 'Dummy 2',
        faction: 'villains',
        resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
        attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
        barrier: 6,
        modifiers: [],
        statuses: [],
        inventory: {},
        equippedItems: {},
      };

      const resH = executeMultiTargetBehavior({
        behavior: bMulti,
        sourceEntityId: 'hero',
        targetEntityIds: ['dummy', 'dummy2'],
        world: worldMulti,
        encounter,
      });

      expect(resH.success).toBe(true);
      expect(resH.newWorld.dummy.barrier).toBe(0);
      expect(resH.newWorld.dummy.resources.SA.current).toBe(24); // 30 - 6 = 24
      expect(resH.newWorld.dummy2.barrier).toBe(0);
      expect(resH.newWorld.dummy2.resources.SA.current).toBe(26); // 30 - 4 = 26

      // Total final damage = 6 (dummy) + 4 (dummy2) = 10
      // Recoil = Math.floor(10 * 0.5) = 5
      // Hero final SA = 30 - 5 = 25
      expect(resH.newWorld.hero.resources.SA.current).toBe(25);
    });

    test('Rule 4. After-Effect (-2 INT por 3 turnos al finalizar): Aparece al finalizar y dura 3 turnos', () => {
      const b: MechanicalBehavior = {
        id: 'b_after_effect',
        name: 'Sobrecarga Sensorial',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'after_effect_int2_3t', attributeId: 'INT', amount: -2, turns: 3, when: 'end' },
        ],
        temporality: {
          duration: { type: 'turns', turns: 2 }, // +1 CE
        },
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // +5 CE
        ],
      };

      // 5 (3D6) + 1 (duración 2 turnos) + (-3 after effect) = 3 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(3);

      let world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Turno 1: Activar -> NO tiene penalización de INT mientras está activo
      const res = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(res.success).toBe(true);
      world = res.newWorld;
      encounter = res.newEncounter;

      expect(encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'INT')).toHaveLength(0);

      // Turno 2: Aún activo
      encounter = advanceTurn(encounter, {}, world);
      expect(encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'INT')).toHaveLength(0);

      // Turno 3: Aún activo
      encounter = advanceTurn(encounter, {}, world);
      expect(encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'INT')).toHaveLength(0);

      // Turno 4: Efecto expira -> Aparece penalización -2 INT durante 3 turnos
      encounter = advanceTurn(encounter, {}, world);
      const intMod = encounter.participants.hero.activeModifiers.find((m) => m.attributeId === 'INT');
      expect(intMod).toBeDefined();
      expect(intMod?.amount).toBe(-2);
      expect(intMod?.turns).toBe(3);
    });

    test('Rule 5. -2 DES Mientras esté activo: Mantiene -2 constante sin acumular en cada turno', () => {
      const b: MechanicalBehavior = {
        id: 'b_while_des',
        name: 'Modo Peso Pesado',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'while_active_des2', attributeId: 'DES', amount: -2, when: 'activation', untilEnd: true },
        ],
        temporality: {
          duration: { type: 'turns', turns: 3 }, // +2 CE
        },
        effects: [
          { id: 'e1', type: 'damage', dice: '4D6' }, // +5 CE
        ],
      };

      // 5 (4D6) + 2 (duración 3 turnos) + (-2 DES mientras activo) = 5 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(5);

      let world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);

      // Activar en Turno 1 -> DES -2
      const res = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(res.success).toBe(true);
      world = res.newWorld;
      encounter = res.newEncounter;

      const desModsTurn1 = encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'DES');
      expect(desModsTurn1).toHaveLength(1);
      expect(desModsTurn1[0].amount).toBe(-2);

      // Turno 2 -> Sigue siendo -2 (NO acumula a -4)
      encounter = advanceTurn(encounter, {}, world);
      const desModsTurn2 = encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'DES');
      expect(desModsTurn2).toHaveLength(1);
      expect(desModsTurn2[0].amount).toBe(-2);

      // Turno 4 -> Al finalizar, el modificador desaparece
      encounter = advanceTurn(encounter, {}, world);
      encounter = advanceTurn(encounter, {}, world);
      const desModsEnded = encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'DES');
      expect(desModsEnded).toHaveLength(0);
    });

    test('Rule 5. Stacking Independence of while_active_des2: No interfiere con otros modificadores de DES ni los elimina al expirar', () => {
      const b: MechanicalBehavior = {
        id: 'b_while_des_stack',
        name: 'Modo Peso Pesado Con Stacking',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'while_active_des2', attributeId: 'DES', amount: -2, when: 'activation', untilEnd: true },
        ],
        temporality: {
          duration: { type: 'turns', turns: 2 },
        },
        effects: [
          { id: 'e1', type: 'damage', dice: '2D6' },
        ],
      };

      let world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 6, RES: 5, INT: 5, VOL: 5, VEL: 5 }, // Base DES = 6
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      let encounter = createEncounterRuntimeState(1);
      encounter.participants.hero = createParticipantRuntimeState('hero', 1);
      encounter.participants.dummy = createParticipantRuntimeState('dummy', 1);

      // Agregamos un modificador independiente externo de DES +1 de duración indefinida (por ejemplo)
      encounter.participants.hero.activeModifiers = [{
        id: 'independent_des_plus_1',
        attributeId: 'DES',
        amount: 1,
      }];

      // Activar la técnica: -2 DES (Base 6 + ModExterno 1 + ModTecnica -2 = 5 DES)
      const res = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world,
        encounter,
      });

      expect(res.success).toBe(true);
      world = res.newWorld;
      encounter = res.newEncounter;

      // Debe haber 2 modificadores de DES activos
      const desMods = encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'DES');
      expect(desMods).toHaveLength(2);
      
      const totalAmount = desMods.reduce((sum, m) => sum + m.amount, 0);
      expect(totalAmount).toBe(-1); // -2 + 1 = -1

      // Avanzamos 3 turnos para que expire el modificador de la técnica (2 turnos de duración)
      encounter = advanceTurn(encounter, {}, world);
      encounter = advanceTurn(encounter, {}, world);
      encounter = advanceTurn(encounter, {}, world);

      // El modificador de la técnica debe haber expirado, pero el modificador externo de +1 de DES debe persistir
      const desModsAfter = encounter.participants.hero.activeModifiers.filter((m) => m.attributeId === 'DES');
      expect(desModsAfter).toHaveLength(1);
      expect(desModsAfter[0].id).toBe('independent_des_plus_1');
      expect(desModsAfter[0].amount).toBe(1);
    });

    test('Rule 7. Sobrecalentado al quedar EST <= 5: EST 6 => NO, EST 5 => Sobrecalentado, EST 4 => Sobrecalentado', () => {
      const b: MechanicalBehavior = {
        id: 'b_overheated',
        name: 'Ataque Sobrecalentado',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'overheated_threshold', resourceId: 'ES', threshold: 5, when: 'activation' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '3D6' }, // +5 CE
        ],
      };

      // 5 (3D6) + (-3 sobrecalentado) = 2 CE
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(2);

      const makeWorldWithES = (esVal: number): RuleWorld => ({
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: esVal, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
        dummy: {
          id: 'dummy',
          name: 'Dummy',
          faction: 'villains',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 0,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      });

      const encounter = createEncounterRuntimeState(1);

      // Caso A: EST = 6 -> NO Sobrecalentado
      const res6 = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: makeWorldWithES(6),
        encounter,
      });
      expect(res6.success).toBe(true);
      expect(res6.newWorld.hero.statuses.some((s: any) => s.statusElementId.includes('sobrecalentado'))).toBe(false);

      // Caso B: EST = 5 -> Aplica Sobrecalentado
      const res5 = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: makeWorldWithES(5),
        encounter,
      });
      expect(res5.success).toBe(true);
      expect(res5.newWorld.hero.statuses.some((s: any) => s.statusElementId.includes('sobrecalentado'))).toBe(true);

      // Caso C: EST = 4 -> Aplica Sobrecalentado
      const res4 = executeMechanicalBehavior({
        behavior: b,
        sourceEntityId: 'hero',
        targetEntityId: 'dummy',
        world: makeWorldWithES(4),
        encounter,
      });
      expect(res4.success).toBe(true);
      expect(res4.newWorld.hero.statuses.some((s: any) => s.statusElementId.includes('sobrecalentado'))).toBe(true);
    });

    test('Rule 8. Cap Absorbe máximo 6: Daño 4 => absorbe 4, Daño 10 => absorbe 6 máximo', () => {
      const bCap: MechanicalBehavior = {
        id: 'b_cap_absorb',
        name: 'Escudo Limitado',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        control: {
          cap: { subject: 'barrier', max: 6 }, // -3 CE
        },
        effects: [
          { id: 'e1', type: 'barrier', amount: 10 }, // 10 barrera
        ],
      };

      // 10 barrera (+1 CE de barrera 10 / base) + (-3 cap max 6) = 0 CE clamped
      expect(calculateTechniqueStructuralCost([bCap], categories)).toBe(0);

      const world: RuleWorld = {
        hero: {
          id: 'hero',
          name: 'Hero',
          faction: 'heroes',
          resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
          attributes: { FUE: 5, DES: 5, RES: 5, INT: 5, VOL: 5, VEL: 5 },
          barrier: 10,
          modifiers: [],
          statuses: [],
          inventory: {},
          equippedItems: {},
        },
      };

      const encounter = createEncounterRuntimeState(1);

      // Caso 1: Daño entrante 4 con cap max 6 -> Absorbe 4 completos (30 SA intacto)
      const res4 = processDamagePipeline({
        baseDamage: 4,
        targetId: 'hero',
        world,
        encounter,
      });
      expect(res4.absorbedByBarrier).toBe(4);
      expect(res4.finalDamage).toBe(0);
      expect(res4.newWorld.hero.resources.SA.current).toBe(30);

      // Caso 2: Daño entrante 10 con cap max 6 -> Absorbe 6 máximo, 4 de daño penetran a SA (30 -> 26)
      const capBarrierWorld: RuleWorld = {
        ...world,
        hero: { ...world.hero, barrier: 6 },
      };
      const res10 = processDamagePipeline({
        baseDamage: 10,
        targetId: 'hero',
        world: capBarrierWorld,
        encounter,
      });
      expect(res10.absorbedByBarrier).toBe(6);
      expect(res10.finalDamage).toBe(4);
      expect(res10.newWorld.hero.resources.SA.current).toBe(26);
    });
  });

  // =========================================================================
  // 3. NO DOUBLE CHARGE & FULL COMPOSITION (SECTION 25 & 26)
  // =========================================================================
  describe('3. Verificación No Double Charge y Composición Completa (5 CE)', () => {
    test('No Double Charge: Los componentes internos de una consecuencia NO se cobran como efectos positivos', () => {
      const b: MechanicalBehavior = {
        id: 'b_no_double',
        name: 'Sobrecarga Sensorial',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [],
        consequences: [
          { type: 'overheated_threshold', resourceId: 'ES', threshold: 5, when: 'activation' }, // -3 CE
        ],
      };

      // -3 consecuencia => clamped a 0 CE (NO -3 + 3 status_apply = 0)
      expect(calculateTechniqueStructuralCost([b], categories)).toBe(0);
    });

    test('Composición Completa Canónica = 5 CE', () => {
      const bFull: MechanicalBehavior = {
        id: 'b_full_composite',
        name: 'Ataque Pesado con Limitaciones',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        requirements: [
          { id: 'req1', type: 'physical_contact', description: 'Contacto físico' }, // -1 CE
        ],
        temporality: {
          duration: { type: 'turns', turns: 3 }, // +2 CE
        },
        limitations: [
          { id: 'lim1', type: 'cooldown', turns: 2 }, // -2 CE
        ],
        consequences: [
          { type: 'self_damage_turn', amount: 1, when: 'each_turn' }, // -1 CE
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // +7 CE
        ],
      };

      // 7 (4D8) + 2 (duración 3 turnos) - 1 (contacto) - 2 (cooldown 2) - 1 (daño propio por turno) = 5 CE
      const cost = calculateTechniqueStructuralCost([bFull], categories);
      expect(cost).toBe(5);

      const desc = describeMechanicalBehavior(bFull);
      expect(desc.text.toLowerCase()).toContain('4d8');
      expect(desc.text.toLowerCase()).toContain('contacto');
    });
  });

  // =========================================================================
  // 4. DATABASE MIGRATION & SENTINEL (RULES-DATA-4B)
  // =========================================================================
  describe('4. Migración Canónica RULES-DATA-4B y Sentinel de Persistencia', () => {
    test('migrateCanonicalCatalogRulesData4B reconciles consequence and caps categories and preserves custom rules', () => {
      const initial = createCoreCategories();

      const modifiedInitial = initial.map((cat) => {
        if (cat.id === 'core.consequence') {
          return {
            ...cat,
            rules: [
              ...cat.rules.map((r) => ({ ...r, cost: 0 })),
              {
                id: 'custom.consequence.blindness',
                name: 'Ceguera temporal al activar',
                cost: -5,
                runtimeKey: 'blindness',
                ruleType: 'component' as const,
                component: {
                  kind: 'consequence' as const,
                  role: 'consequence' as const,
                  when: 'activation' as const,
                  consequence: { kind: 'status' as const, statusElementId: 'core.status.ceguera', turns: 1 },
                },
              },
            ],
          };
        }
        return cat;
      });

      const migrated = migrateCanonicalCatalogRulesData4B(modifiedInitial);

      // 1. Verify custom rules preserved
      const customRule = migrated.find((c) => c.id === 'core.consequence')?.rules.find((r) => r.id === 'custom.consequence.blindness');
      expect(customRule).toBeDefined();
      expect(customRule?.cost).toBe(-5);

      // 2. Verify canonical rules received canonical values
      const consCat = migrated.find((c) => c.id === 'core.consequence');
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.self_damage_turn')?.cost).toBe(-1);
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.self_damage_fixed_2')?.cost).toBe(-1);
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.recoil_half')?.cost).toBe(-4);
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.after_effect_int2_3t')?.cost).toBe(-3);
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.while_active_des2')?.cost).toBe(-2);
      expect(consCat?.rules.find((r) => r.id === 'core.consequence.overheated_threshold')?.cost).toBe(-3);

      const capsCat = migrated.find((c) => c.id === 'core.caps');
      expect(capsCat?.rules.find((r) => r.id === 'core.caps.absorb_max_6')?.cost).toBe(-3);
    });

    test('DATABASE = SOURCE OF TRUTH: Admin override to consequence rule cost affects calculation dynamically', () => {
      const customCategories = createCoreCategories().map((cat) => {
        if (cat.id === 'core.consequence') {
          return {
            ...cat,
            rules: cat.rules.map((r) => {
              if (r.id === 'core.consequence.self_damage_fixed_2') {
                return { ...r, cost: -7 }; // Admin changed fixed self damage to -7 CE
              }
              return r;
            }),
          };
        }
        return cat;
      });

      const behavior: MechanicalBehavior = {
        id: 'b_custom_admin_cons',
        name: 'Daño Fijo Admin',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        consequences: [
          { type: 'self_damage_fixed_2', amount: 2, when: 'activation' },
        ],
        effects: [
          { id: 'e1', type: 'damage', dice: '4D8' }, // +7 CE
        ],
      };

      // 7 (4D8) + (-7 admin override) = 0 CE
      expect(calculateTechniqueStructuralCost([behavior], customCategories)).toBe(0);
    });
  });
});
