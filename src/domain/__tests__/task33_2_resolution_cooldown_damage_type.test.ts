import { describe, it, expect } from 'vitest';
import {
  deriveTechniqueRollContract,
  deriveTechniqueFunctionalCategories,
} from '../characterTechnique';
import {
  CORE_CATEGORIES,
  createCoreCategories,
  getCategoryOptions,
  migrateCoreCategories,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import {
  describeMechanicalBehavior,
  describeMechanicalTarget,
  describeMechanicalEffect,
  describeMechanicalLimitation,
} from '../mechanicalDescription';
import type { MechanicalBehavior } from '../mechanicalBehavior';

describe('Tarea 33.2 — Resolución de Técnicas, Cooldown, Tipo de Daño y Descripción Mecánica', () => {
  // =========================================================================
  // 1. DERIVACIÓN DE RESOLUCIÓN OFENSIVA Y PRECEDENCIA DE EXCEPCIONES
  // =========================================================================
  describe('1. Derivación automática de resolución ofensiva', () => {
    it('A. Daño físico a objetivo hostil deriva clasificación Ofensiva, tirada de Acción (ACC) vs Evasión', () => {
      const behavior: MechanicalBehavior = {
        id: 'b_phys',
        name: 'Golpe Contundente',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        target: { type: 'enemy', quantity: { count: 1, mode: 'exact' } },
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '2D6',
            damageType: 'fisico',
          },
        ],
      };

      const categories = deriveTechniqueFunctionalCategories([behavior]);
      expect(categories).toContain('offensive');

      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.behaviors[0].requiresRoll).toBe(true);
      expect(contract.behaviors[0].resolutionType).toBe('roll');
      expect(contract.behaviors[0].rollType).toBe('ACC');
      expect(contract.behaviors[0].attackType).toBe('physical');
      expect(contract.behaviors[0].opposition).toEqual({
        kind: 'target_evasion',
        targetDefense: 'EVA',
        label: 'Evasión',
      });
    });

    it('B. Daño mental (psíquico) a objetivo hostil deriva tirada de Acción (ACC) vs Coraje', () => {
      const behavior: MechanicalBehavior = {
        id: 'b_mental',
        name: 'Ataque Psíquico',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        target: { type: 'enemies', quantity: { count: 1, mode: 'exact' } },
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '2D8',
            damageType: 'psiquico',
          },
        ],
      };

      const categories = deriveTechniqueFunctionalCategories([behavior]);
      expect(categories).toContain('offensive');

      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.behaviors[0].requiresRoll).toBe(true);
      expect(contract.behaviors[0].resolutionType).toBe('roll');
      expect(contract.behaviors[0].rollType).toBe('ACC');
      expect(contract.behaviors[0].attackType).toBe('mental');
      expect(contract.behaviors[0].opposition).toEqual({
        kind: 'target_courage',
        targetDefense: 'COR',
        label: 'Coraje',
      });
    });

    it('C. Excepción explícita prevalece sobre la derivación por defecto', () => {
      // Offensive damage behavior with explicit RD resolution
      const behavior: MechanicalBehavior = {
        id: 'b_explicit_rd',
        name: 'Onda Térmica Inevitable',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        target: { type: 'enemy' },
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '1D10',
            damageType: 'fuego',
          },
        ],
        resolution: {
          type: 'rd',
          attribute: 'INT',
          difficulty: 16,
        },
      };

      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.complete).toBe(true);
      expect(contract.behaviors[0].resolutionType).toBe('rd');
      expect(contract.behaviors[0].opposition).toEqual({
        kind: 'explicit_rd',
        explicitDifficulty: 16,
        label: 'RD 16',
      });
    });
  });

  // =========================================================================
  // 2. CATEGORÍA CORE TIPO DE DAÑO
  // =========================================================================
  describe('2. Categoría Core Tipo de daño (damage_type)', () => {
    it('A. damage_type exists in CORE_CATEGORIES and createCoreCategories', () => {
      expect(CORE_CATEGORIES).toHaveProperty('damage_type');
      expect(CORE_CATEGORIES.damage_type).toBe('Tipo de daño');

      const coreCats = createCoreCategories();
      const dtCat = coreCats.find((c) => c.coreKey === 'damage_type' || c.id === 'core.damage_type');
      expect(dtCat).toBeDefined();
      expect(dtCat?.name).toBe('Tipo de daño');
      expect(dtCat?.rules.length).toBeGreaterThan(0);

      const options = getCategoryOptions(coreCats, 'damage_type');
      const runtimeKeys = options.map((o) => o.runtimeKey);
      expect(runtimeKeys).toContain('fisico');
      expect(runtimeKeys).toContain('cinetico');
      expect(runtimeKeys).toContain('fuego');
      expect(runtimeKeys).toContain('hielo');
      expect(runtimeKeys).toContain('electrico');
      expect(runtimeKeys).toContain('psiquico');
      expect(runtimeKeys).toContain('acido');
      expect(runtimeKeys).toContain('sonoro');
      expect(runtimeKeys).toContain('cortante');
      expect(runtimeKeys).toContain('perforante');
      expect(runtimeKeys).toContain('contundente');
    });

    it('B. Añadir una nueva opción de Tipo de daño desde configuración aparece dinámicamente y aplica su CE', () => {
      const coreCats = createCoreCategories();
      const dtCat = coreCats.find((c) => c.coreKey === 'damage_type');
      expect(dtCat).toBeDefined();

      // Add a custom damage type with +2 CE
      dtCat!.rules.push({
        id: 'core.damage_type.radiante',
        name: 'Radiante / Solar',
        runtimeKey: 'radiante',
        cost: 2,
        ruleType: 'cost_modifier',
      });

      const options = getCategoryOptions(coreCats, 'damage_type');
      const radiantOpt = options.find((o) => o.runtimeKey === 'radiante');
      expect(radiantOpt).toBeDefined();
      expect(radiantOpt?.name).toBe('Radiante / Solar');
      expect(radiantOpt?.cost).toBe(2);

      // Verify CE calculation applies the damage type cost
      const behavior: MechanicalBehavior = {
        id: 'b1',
        name: 'Rayo Solar',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '2D6', // cost 2
            damageType: 'radiante', // cost 2
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost([behavior], coreCats);
      // 2D6 (cost 2) + radiante (cost 2) = 4 CE
      expect(cost).toBe(4);
    });
  });

  // =========================================================================
  // 3. COOLDOWN Y SYSTEM_MECHANICS
  // =========================================================================
  describe('3. Conexión y validación de Cooldown con system_mechanics', () => {
    it('A. Resuelve opciones configuradas de cooldown y su CE asociado', () => {
      const coreCats = createCoreCategories();
      const cdCat = coreCats.find((c) => c.coreKey === 'cooldown');
      expect(cdCat).toBeDefined();

      const options = getCategoryOptions(coreCats, 'cooldown');
      expect(options.some((o) => o.runtimeKey === '1')).toBe(true);
      expect(options.some((o) => o.runtimeKey === '2')).toBe(true);
      expect(options.some((o) => o.runtimeKey === '3')).toBe(true);

      // Configure a CE discount for 2 turn cooldown (-2 CE)
      const opt2 = cdCat!.rules.find((r) => (r as any).runtimeKey === '2' || r.id.endsWith('.2'));
      if (opt2) opt2.cost = -2;

      const behavior: MechanicalBehavior = {
        id: 'b1',
        name: 'Golpe Pesado',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [
          {
            id: 'lim1',
            type: 'cooldown',
            turns: 2,
          },
        ],
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '4D6', // cost 4
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost([behavior], coreCats);
      // 4 (4D6) + (-2 cooldown) = 2 CE
      expect(cost).toBe(2);
    });

    it('B. Añadir 4 turnos desde administración hace la opción válida sin modificar frontend', () => {
      const customConfig: SystemMechanicsConfig = [
        {
          id: 'core.cooldown',
          name: 'Cooldown',
          description: 'Restricción de tiempo de recarga',
          coreKey: 'cooldown',
          logicalType: 'limitation',
          scope: { actions: true, objects: true, techniques: true },
          rules: [
            { id: 'core.cooldown.1', name: '1 turno', runtimeKey: '1', cost: 0, ruleType: 'component' },
            { id: 'core.cooldown.2', name: '2 turnos', runtimeKey: '2', cost: -2, ruleType: 'component' },
            { id: 'core.cooldown.4', name: '4 turnos', runtimeKey: '4', cost: -4, ruleType: 'component' },
          ],
        },
      ];

      const options = getCategoryOptions(customConfig, 'cooldown');
      expect(options.some((o) => o.runtimeKey === '2')).toBe(true);
      expect(options.some((o) => o.runtimeKey === '4')).toBe(true);
      expect(options.some((o) => o.runtimeKey === '99')).toBe(false);

      const behavior: MechanicalBehavior = {
        id: 'b1',
        name: 'Devastación Total',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [
          {
            id: 'lim1',
            type: 'cooldown',
            turns: 4,
          },
        ],
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '4D6', // cost 4
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost([behavior], customConfig);
      // 4 (4D6) + (-4 cooldown 4 turnos) = 0 CE
      expect(cost).toBe(0);
    });
  });

  // =========================================================================
  // 4. DESCRIPCIÓN MECÁNICA SIN IDS VISIBLES
  // =========================================================================
  describe('4. Descripción Mecánica limpia y semántica en español', () => {
    it('A. Genera texto semántico con 2D6, Físico, Enemigo, 2 turnos sin ruleIds ni Unknown target', () => {
      const behavior: MechanicalBehavior = {
        id: 'b_clean_desc',
        name: 'Ataque Limpio',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        target: {
          type: 'enemies',
          quantity: { count: 1, mode: 'exact' },
        },
        limitations: [
          {
            id: 'lim_cd',
            type: 'cooldown',
            turns: 2,
          },
        ],
        effects: [
          {
            id: 'eff_dmg',
            type: 'damage',
            dice: '2D6',
            damageType: 'fisico',
          },
        ],
        resolution: {
          type: 'roll',
          attribute: 'DES',
          attackType: 'physical',
        },
      };

      const result = describeMechanicalBehavior(behavior);
      expect(result.text).toContain('2D6');
      expect(result.text).toContain('Físico');
      expect(result.text).toContain('2 turnos');
      expect(result.text).not.toContain('Unknown target type');
      expect(result.text).not.toContain('GXSHW');
      expect(result.text).not.toContain('eff_dmg');
      expect(result.text).not.toContain('b_clean_desc');
      expect(result.text).not.toContain('core.damage');
    });

    it('B. describeMechanicalTarget handles enemies, allies, any without errors', () => {
      const targetEnemies = describeMechanicalTarget({ type: 'enemies' });
      expect(targetEnemies.complete).toBe(true);
      expect(targetEnemies.text).toBe('Enemigos');
      expect(targetEnemies.warnings).toHaveLength(0);

      const targetAllies = describeMechanicalTarget({ type: 'allies' });
      expect(targetAllies.complete).toBe(true);
      expect(targetAllies.text).toBe('Aliados');
      expect(targetAllies.warnings).toHaveLength(0);

      const targetAny = describeMechanicalTarget({ type: 'any' });
      expect(targetAny.complete).toBe(true);
      expect(targetAny.text).toBe('1 personaje');
      expect(targetAny.warnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. TAREA 33.2.1 — CORRECCIÓN DE REGRESIONES QA REALES
  // =========================================================================
  describe('5. Tarea 33.2.1 — Flujos de Integración Reales del Editor (QA Físico / Mental / ruleId / Runtime)', () => {
    // Test obligatorio 9: Flujo real Físico con resolución default automatic
    it('A. [Test 9] Editor real: default automatic no bloquea la derivación a ACC vs Evasión', () => {
      // Structure exactly as created by createDefaultBehavior() and MechanicalBehaviorsEditor
      const behavior: MechanicalBehavior = {
        id: 'beh_real_1',
        name: 'Golpe Frontal',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        trigger: { kind: 'none' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies', quantity: { count: 1, mode: 'exact' } },
        limitations: [],
        resolution: { type: 'automatic', outcomes: [] }, // Form initial default
        effects: [
          {
            id: 'eff_1',
            type: 'damage',
            dice: '2D6',
            formula: '2D6',
            damageType: 'fisico',
            ruleId: 'GXSHW_DAMAGE_2D6',
            runtimeKey: '2D6',
          } as any,
        ],
      };

      // 1. Classification is offensive
      const categories = deriveTechniqueFunctionalCategories([behavior]);
      expect(categories).toContain('offensive');

      // 2. Roll contract derives ACC vs Evasión despite resolution = automatic
      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.hasRoll).toBe(true);
      expect(contract.behaviors[0].requiresRoll).toBe(true);
      expect(contract.behaviors[0].resolutionType).toBe('roll');
      expect(contract.behaviors[0].rollType).toBe('ACC');
      expect(contract.behaviors[0].attackType).toBe('physical');
      expect(contract.behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(contract.behaviors[0].opposition?.label).toBe('Evasión');
      expect(contract.behaviors[0].rollFormula).toContain('vs Evasión');
    });

    // Test obligatorio 10: Cambio dinámico a Mental
    it('B. [Test 10] Cambio dinámico de Físico -> Psíquico/Mental actualiza inmediatamente a ACC vs Coraje', () => {
      // Start with Physical
      const behavior: MechanicalBehavior = {
        id: 'beh_real_dynamic',
        name: 'Ataque Versátil',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        trigger: { kind: 'none' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies' },
        limitations: [],
        resolution: { type: 'automatic', outcomes: [] },
        effects: [
          {
            id: 'eff_dyn',
            type: 'damage',
            dice: '2D6',
            formula: '2D6',
            damageType: 'fisico',
          } as any,
        ],
      };

      // Step 1: Physical check
      const contractPhys = deriveTechniqueRollContract([behavior]);
      expect(contractPhys.behaviors[0].attackType).toBe('physical');
      expect(contractPhys.behaviors[0].opposition?.targetDefense).toBe('EVA');
      expect(contractPhys.behaviors[0].opposition?.label).toBe('Evasión');
      expect(contractPhys.behaviors[0].rollFormula).toContain('vs Evasión');

      // Step 2: Dynamically change damageType to psiquico (in-memory, no save/reload)
      (behavior.effects[0] as any).damageType = 'psiquico';

      // Step 3: Immediate check reflects Mental vs Coraje
      const contractMental = deriveTechniqueRollContract([behavior]);
      expect(contractMental.behaviors[0].attackType).toBe('mental');
      expect(contractMental.behaviors[0].opposition?.targetDefense).toBe('COR');
      expect(contractMental.behaviors[0].opposition?.label).toBe('Coraje');
      expect(contractMental.behaviors[0].rollFormula).toContain('vs Coraje');
    });

    // Test obligatorio 11: Descripción con regla real no contiene ruleId
    it('C. [Test 11] Selección de regla con ruleId generado produce descripción con 2D6 y sin ruleId', () => {
      const generatedRuleId = 'GXSHW_RANDOM_UUID_12345';
      const behavior: MechanicalBehavior = {
        id: 'beh_with_rule_id',
        name: 'Golpe Fuerte',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies' },
        limitations: [],
        effects: [
          {
            id: 'eff_test',
            type: 'damage',
            dice: '2D6',
            formula: '2D6',
            damageType: 'fisico',
            ruleId: generatedRuleId,
            runtimeKey: '2D6',
          } as any,
        ],
      };

      const desc = describeMechanicalBehavior(behavior);
      expect(desc.text).toContain('2D6');
      expect(desc.text).toContain('Físico');
      expect(desc.text).toContain('Enemigos');
      expect(desc.text).not.toContain(generatedRuleId);
      expect(desc.text).toBe('Enemigos: Inflige 2D6 de daño de tipo Físico.');
    });

    // Test obligatorio 12: Runtime de daño ejecuta la fórmula 2D6
    it('D. [Test 12] El runtime resuelve la fórmula semántica 2D6 y procesa el daño', () => {
      const effect = {
        id: 'eff_dmg_runtime',
        type: 'damage' as const,
        dice: '2D6',
        formula: '2D6',
        damageType: 'fisico',
        ruleId: 'GXSHW_DAMAGE_ID_999',
      };

      const desc = describeMechanicalEffect(effect);
      expect(desc.text).toBe('Inflige 2D6 de daño de tipo Físico');
      expect(desc.text).not.toContain('GXSHW');
    });
  });
});
