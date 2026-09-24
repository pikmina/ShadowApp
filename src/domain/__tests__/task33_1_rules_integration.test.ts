import { describe, expect, test } from 'vitest';
import {
  createCoreCategories,
  migrateCoreCategories,
  CORE_CATEGORIES,
  getCategoryOptions,
  getBarrierAmount,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findHealingOption,
  getValidHealingOptions,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import { applyRuleOperations, type RuleWorld } from '../ruleExecution';

type SystemMechanicCategory = SystemMechanicsConfig[number];

describe('Tarea 33.1 — Reglas e Integración de Efectos', () => {
  // =========================================================================
  // 14. Tests obligatorios — Curación
  // =========================================================================
  describe('14. Tests obligatorios — Curación gobernada por Reglas', () => {
    // Helper to generate a mock healing category
    const createHealingCategory = (options: { amount: number; cost: number }[]): SystemMechanicCategory => ({
      id: 'core.healing',
      name: 'Curación',
      description: 'Recupera puntos de salud',
      logicalType: 'support',
      category: 'healing',
      appliesTo: ['technique', 'trait', 'item'],
      costPerRank: 0,
      scope: { techniques: true, objects: true, actions: true },
      rules: options.map((opt) => ({
        id: `core.healing.${opt.amount}`,
        name: `Curación ${opt.amount}`,
        description: `Recupera ${opt.amount} SA`,
        cost: opt.cost,
        ruleType: 'effect' as const,
        runtimeKey: `${opt.amount}`,
        effect: {
          timing: 'on_activation' as const,
          type: 'healing' as const,
          resourceId: 'SA' as const,
          amount: opt.amount,
        },
      })),
    });

    test('validates amounts against configured options: 1,4,5 valid; 0,6,20 invalid', () => {
      const config: SystemMechanicsConfig = [
        createHealingCategory([
          { amount: 1, cost: 1 },
          { amount: 2, cost: 1 },
          { amount: 3, cost: 2 },
          { amount: 4, cost: 2 },
          { amount: 5, cost: 3 },
        ]),
      ];

      // 1 -> válido
      const opt1 = findHealingOption(config, 1, 'SA');
      expect(opt1).toBeDefined();
      expect(opt1?.cost).toBe(1);

      // 4 -> válido
      const opt4 = findHealingOption(config, 4, 'SA');
      expect(opt4).toBeDefined();
      expect(opt4?.cost).toBe(2);

      // 5 -> válido
      const opt5 = findHealingOption(config, 5, 'SA');
      expect(opt5).toBeDefined();
      expect(opt5?.cost).toBe(3);

      // 0 -> inválido
      expect(findHealingOption(config, 0, 'SA')).toBeUndefined();

      // 6 -> inválido
      expect(findHealingOption(config, 6, 'SA')).toBeUndefined();

      // 20 -> inválido
      expect(findHealingOption(config, 20, 'SA')).toBeUndefined();
    });

    test('when rules contain 1, 2, 4, 5: 3 is invalid (does not rely only on min/max)', () => {
      const config: SystemMechanicsConfig = [
        createHealingCategory([
          { amount: 1, cost: 1 },
          { amount: 2, cost: 1 },
          { amount: 4, cost: 2 },
          { amount: 5, cost: 3 },
        ]),
      ];

      // 3 is between 1 and 5, but not in options -> must be invalid
      expect(findHealingOption(config, 3, 'SA')).toBeUndefined();

      const validList = getValidHealingOptions(config, 'SA');
      expect(validList.map((o) => o.amount)).toEqual([1, 2, 4, 5]);
    });

    test('adding 6 via configuration makes 6 valid without modifying frontend code', () => {
      const config: SystemMechanicsConfig = [
        createHealingCategory([
          { amount: 1, cost: 1 },
          { amount: 2, cost: 1 },
          { amount: 3, cost: 2 },
          { amount: 4, cost: 2 },
          { amount: 5, cost: 3 },
          { amount: 6, cost: 4 }, // Added by admin configuration
        ]),
      ];

      const opt6 = findHealingOption(config, 6, 'SA');
      expect(opt6).toBeDefined();
      expect(opt6?.cost).toBe(4);
    });

    test('technique structural cost calculation uses configured CE for each amount', () => {
      const config: SystemMechanicsConfig = [
        createHealingCategory([
          { amount: 1, cost: 1 },
          { amount: 2, cost: 1 },
          { amount: 3, cost: 2 },
          { amount: 4, cost: 2 },
          { amount: 5, cost: 3 },
        ]),
      ];

      const makeBehavior = (amount: number): any[] => [
        {
          id: 'b1',
          name: 'Comportamiento Curativo',
          mode: 'active',
          effects: [
            {
              id: 'e1',
              type: 'healing',
              resourceId: 'SA',
              amount,
            },
          ],
        },
      ];

      // Amount 1 uses 1 CE
      const cost1 = calculateTechniqueStructuralCost(makeBehavior(1), config);
      expect(cost1).toBe(1);

      // Amount 4 uses 2 CE
      const cost4 = calculateTechniqueStructuralCost(makeBehavior(4), config);
      expect(cost4).toBe(2);

      // Amount 5 uses 3 CE
      const cost5 = calculateTechniqueStructuralCost(makeBehavior(5), config);
      expect(cost5).toBe(3);
    });
  });

  // =========================================================================
  // 15. Tests obligatorios — Barrera
  // =========================================================================
  describe('15. Tests obligatorios — Barrera como selector discreto', () => {
    const createBarrierCategory = (options: { amount: number; cost: number }[]): SystemMechanicCategory => ({
      id: 'core.barrier',
      name: 'Barrera',
      description: 'Genera escudo o barrera protectora',
      logicalType: 'defensive',
      category: 'barrier',
      appliesTo: ['technique', 'trait', 'item'],
      costPerRank: 0,
      scope: { techniques: true, objects: true, actions: true },
      rules: options.map((opt) => ({
        id: `core.barrier.${opt.amount}`,
        name: `Barrera ${opt.amount}`,
        cost: opt.cost,
        ruleType: 'effect' as const,
        runtimeKey: `${opt.amount}`,
        effect: {
          timing: 'on_activation' as const,
          type: 'barrier' as const,
          amount: opt.amount,
        },
      })),
    });

    test('selector options strictly match configured options: 15, 20, 30 without intermediate numbers', () => {
      const config: SystemMechanicsConfig = [
        createBarrierCategory([
          { amount: 15, cost: 2 },
          { amount: 20, cost: 3 },
          { amount: 30, cost: 5 },
        ]),
      ];

      const options = getCategoryOptions(config, 'barrier');
      const amounts = options.map((opt) => getBarrierAmount(opt));

      expect(amounts).toEqual([15, 20, 30]);
      // Intermediate values do not exist
      expect(amounts).not.toContain(16);
      expect(amounts).not.toContain(17);
      expect(amounts).not.toContain(21);
      expect(amounts).not.toContain(22);
    });

    test('adding 40 to configuration causes 40 to appear automatically', () => {
      const config: SystemMechanicsConfig = [
        createBarrierCategory([
          { amount: 15, cost: 2 },
          { amount: 20, cost: 3 },
          { amount: 30, cost: 5 },
          { amount: 40, cost: 6 },
        ]),
      ];

      const options = getCategoryOptions(config, 'barrier');
      const amounts = options.map((opt) => getBarrierAmount(opt));
      expect(amounts).toEqual([15, 20, 30, 40]);
    });

    test('selection -> correct CE -> save -> reload preserves option identity', () => {
      const config: SystemMechanicsConfig = [
        createBarrierCategory([
          { amount: 15, cost: 2 },
          { amount: 20, cost: 3 },
          { amount: 30, cost: 5 },
        ]),
      ];

      const selectedOption = getCategoryOptions(config, 'barrier').find((o) => getBarrierAmount(o) === 20)!;
      expect(selectedOption).toBeDefined();

      const behavior: any = {
        id: 'b1',
        name: 'Escudo Cinético',
        mode: 'active',
        effects: [
          {
            id: 'e1',
            type: 'barrier',
            amount: 20,
            ruleId: selectedOption.id,
            runtimeKey: selectedOption.runtimeKey,
          },
        ],
      };

      // CE calculation gives 3
      const cost = calculateTechniqueStructuralCost([behavior], config);
      expect(cost).toBe(3);

      // Simulate serialization (save) and deserialization (load/hydration)
      const serialized = JSON.stringify(behavior);
      const reloaded: any = JSON.parse(serialized);

      expect(reloaded.effects[0].type).toBe('barrier');
      expect((reloaded.effects[0] as any).amount).toBe(20);
      expect((reloaded.effects[0] as any).ruleId).toBe(selectedOption.id);
      expect((reloaded.effects[0] as any).runtimeKey).toBe('20');

      // Cost after reload matches original cost
      const costAfterReload = calculateTechniqueStructuralCost([reloaded], config);
      expect(costAfterReload).toBe(3);
    });
  });

  // =========================================================================
  // 16. Tests obligatorios — Categorías Core obsoletas
  // =========================================================================
  describe('16. Tests obligatorios — Categorías Core obsoletas eliminadas', () => {
    test('neither Daño propio nor Recoil exist in CORE_CATEGORIES', () => {
      expect(CORE_CATEGORIES).not.toHaveProperty('self_damage');
      expect(CORE_CATEGORIES).not.toHaveProperty('recoil');
      expect(Object.keys(CORE_CATEGORIES)).not.toContain('self_damage');
      expect(Object.keys(CORE_CATEGORIES)).not.toContain('recoil');
    });

    test('createCoreCategories() does not produce self_damage or recoil categories', () => {
      const coreCats = createCoreCategories();
      const catKeys = coreCats.map((c) => c.category);
      const catIds = coreCats.map((c) => c.id);

      expect(catKeys).not.toContain('self_damage');
      expect(catKeys).not.toContain('recoil');
      expect(catIds).not.toContain('core.self_damage');
      expect(catIds).not.toContain('core.recoil');
    });

    test('migrateCoreCategories() does not recreate self_damage or recoil', () => {
      const coreCats = createCoreCategories();
      const migrated = migrateCoreCategories(coreCats);
      const catKeys = migrated.map((c) => c.category);

      expect(catKeys).not.toContain('self_damage');
      expect(catKeys).not.toContain('recoil');
    });

    test('canonical composition: damage with target: self handles self-damage natively', () => {
      const coreCats = createCoreCategories();
      const behavior: any = {
        id: 'b1',
        name: 'Sobrecarga de Quirk',
        mode: 'active',
        effects: [
          {
            id: 'e1',
            type: 'damage',
            dice: '2D6',
          },
        ],
        target: {
          type: 'self',
        },
      };

      const cost = calculateTechniqueStructuralCost([behavior], coreCats);
      // 2D6 base cost is 2, target self does not add additional positive cost
      expect(cost).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Adenda Tarea 33.1 — Curación fija y mediante dados
  // =========================================================================
  describe('Adenda Tarea 33.1 — Curación fija y mediante dados', () => {
    const createCustomHealingConfig = (
      rules: Array<{
        id: string;
        name: string;
        cost: number;
        kind: 'fixed' | 'dice';
        amount?: number;
        formula?: string;
      }>
    ): SystemMechanicsConfig => [
      {
        id: 'core.healing',
        name: 'Curación',
        description: 'Recupera puntos de salud',
        logicalType: 'support',
        category: 'healing',
        appliesTo: ['technique', 'trait', 'item'],
        costPerRank: 0,
        scope: { techniques: true, objects: true, actions: true },
        rules: rules.map((r) => ({
          id: r.id,
          name: r.name,
          cost: r.cost,
          ruleType: 'effect' as const,
          runtimeKey: r.kind === 'dice' ? r.formula! : String(r.amount!),
          effect: {
            timing: 'on_activation' as const,
            type: 'healing' as const,
            resourceId: 'SA' as const,
            kind: r.kind,
            amount: r.amount,
            formula: r.formula,
            dice: r.formula,
            magnitude:
              r.kind === 'dice'
                ? { kind: 'dice' as const, formula: r.formula! }
                : { kind: 'fixed' as const, amount: r.amount! },
          },
        })),
      },
    ];

    const testWorld = (): RuleWorld => ({
      self: {
        resources: { SA: { current: 10, max: 20 }, ES: { current: 10, max: 20 } },
        attributes: { FUE: 2 },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      ally: {
        resources: { SA: { current: 10, max: 20 }, ES: { current: 10, max: 20 } },
        attributes: { FUE: 2 },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    });

    test('Curación fija 4: válida, CE correcto (2 CE), cura exactamente 4', () => {
      const config = createCustomHealingConfig([
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.4', name: 'Curación 4', cost: 2, kind: 'fixed', amount: 4 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);

      // 1. Válida
      const opt = findHealingOption(config, { kind: 'fixed', amount: 4 }, 'SA');
      expect(opt).toBeDefined();
      expect(opt?.kind).toBe('fixed');
      expect(opt?.amount).toBe(4);
      expect(opt?.cost).toBe(2);

      // 2. CE correcto en técnica
      const behavior: any = {
        id: 'b1',
        name: 'Técnica Sanadora',
        mode: 'active',
        effects: [
          {
            id: 'e1',
            type: 'healing',
            resourceId: 'SA',
            kind: 'fixed',
            amount: 4,
            magnitude: { kind: 'fixed', amount: 4 },
            ruleId: opt!.id,
            runtimeKey: opt!.runtimeKey,
          },
        ],
      };
      const structuralCost = calculateTechniqueStructuralCost([behavior], config);
      expect(structuralCost).toBe(2);

      // 3. Runtime cura exactamente 4
      const world = testWorld();
      const result = applyRuleOperations(world, 'self', 'source', 0, [
        {
          kind: 'effect',
          targetId: 'ally',
          effect: {
            id: 'e1',
            type: 'healing',
            resourceId: 'SA',
            kind: 'fixed',
            amount: 4,
            magnitude: { kind: 'fixed', amount: 4 },
          } as any,
        },
      ]);
      expect(result.world.ally.resources.SA.current).toBe(14); // 10 + 4 = 14
    });

    test('Curación 1D6: válida, CE correspondiente a 1D6 (2 CE), runtime ejecuta 1D6', () => {
      const config = createCustomHealingConfig([
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.4', name: 'Curación 4', cost: 2, kind: 'fixed', amount: 4 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);

      // 1. Válida
      const opt = findHealingOption(config, { kind: 'dice', formula: '1D6' }, 'SA');
      expect(opt).toBeDefined();
      expect(opt?.kind).toBe('dice');
      expect(opt?.formula).toBe('1D6');
      expect(opt?.cost).toBe(2);

      // 2. CE correspondiente a la opción 1D6
      const behavior: any = {
        id: 'b1',
        name: 'Técnica Alivio',
        mode: 'active',
        effects: [
          {
            id: 'e_dice_1',
            type: 'healing',
            resourceId: 'SA',
            kind: 'dice',
            formula: '1D6',
            magnitude: { kind: 'dice', formula: '1D6' },
            ruleId: opt!.id,
            runtimeKey: opt!.runtimeKey,
          },
        ],
      };
      const structuralCost = calculateTechniqueStructuralCost([behavior], config);
      expect(structuralCost).toBe(2);

      // 3. Runtime ejecuta 1D6 utilizando el roll canónico
      const world = testWorld();
      const result = applyRuleOperations(
        world,
        'self',
        'source',
        0,
        [
          {
            kind: 'effect',
            targetId: 'ally',
            effect: {
              id: 'e_dice_1',
              type: 'healing',
              resourceId: 'SA',
              kind: 'dice',
              formula: '1D6',
              magnitude: { kind: 'dice', formula: '1D6' },
            } as any,
          },
        ],
        { e_dice_1: [5] } // Tirada de 1D6 = 5
      );
      expect(result.world.ally.resources.SA.current).toBe(15); // 10 + 5 = 15
    });

    test('1D8 no configurado es inválido', () => {
      const config = createCustomHealingConfig([
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.4', name: 'Curación 4', cost: 2, kind: 'fixed', amount: 4 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);

      const opt1d8 = findHealingOption(config, { kind: 'dice', formula: '1D8' }, 'SA');
      expect(opt1d8).toBeUndefined();

      const byString = findHealingOption(config, '1D8', 'SA');
      expect(byString).toBeUndefined();
    });

    test('Añadir 1D8 en system_mechanics lo hace disponible sin cambios de frontend', () => {
      // Configuración inicial sin 1D8
      let config = createCustomHealingConfig([
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);
      expect(findHealingOption(config, '1D8', 'SA')).toBeUndefined();

      // Admin añade 1D8 con coste 3 CE
      config = createCustomHealingConfig([
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
        { id: 'core.healing.1d8', name: 'Curación 1D8', cost: 3, kind: 'dice', formula: '1D8' },
      ]);

      const opt1d8 = findHealingOption(config, '1D8', 'SA');
      expect(opt1d8).toBeDefined();
      expect(opt1d8?.cost).toBe(3);
      expect(opt1d8?.formula).toBe('1D8');

      // Aparece en el listado de opciones válidas para selectores
      const validOptions = getValidHealingOptions(config, 'SA');
      expect(validOptions.some((o) => o.kind === 'dice' && o.formula === '1D8')).toBe(true);
    });

    test('Guardar 1D6 -> recargar -> continúa siendo 1D6 con stable identity', () => {
      const config = createCustomHealingConfig([
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);

      const opt = findHealingOption(config, '1D6', 'SA')!;
      expect(opt).toBeDefined();

      const originalTechniqueBehavior = {
        id: 'b_save_load',
        name: 'Regeneración',
        mode: 'active',
        effects: [
          {
            id: 'eff_1d6',
            type: 'healing',
            resourceId: 'SA',
            kind: 'dice',
            formula: '1D6',
            dice: '1D6',
            magnitude: { kind: 'dice', formula: '1D6' },
            ruleId: opt.id,
            runtimeKey: opt.runtimeKey,
          },
        ],
      };

      // Persistencia (serialización JSON)
      const savedPayload = JSON.stringify(originalTechniqueBehavior);
      // Carga / Hidratación (deserialización)
      const hydrated = JSON.parse(savedPayload);

      expect(hydrated.effects[0].type).toBe('healing');
      expect(hydrated.effects[0].kind).toBe('dice');
      expect(hydrated.effects[0].formula).toBe('1D6');
      expect(hydrated.effects[0].magnitude).toEqual({ kind: 'dice', formula: '1D6' });
      expect(hydrated.effects[0].ruleId).toBe('core.healing.1d6');
      expect(hydrated.effects[0].runtimeKey).toBe('1D6');

      // Al recargar y calcular coste, sigue dando exactamente 2 CE
      const costAfterHydration = calculateTechniqueStructuralCost([hydrated], config);
      expect(costAfterHydration).toBe(2);
    });

    test('El resultado del dado NO modifica retrospectivamente el CE estructural', () => {
      const config = createCustomHealingConfig([
        { id: 'core.healing.1', name: 'Curación 1', cost: 1, kind: 'fixed', amount: 1 },
        { id: 'core.healing.2', name: 'Curación 2', cost: 1, kind: 'fixed', amount: 2 },
        { id: 'core.healing.3', name: 'Curación 3', cost: 2, kind: 'fixed', amount: 3 },
        { id: 'core.healing.4', name: 'Curación 4', cost: 2, kind: 'fixed', amount: 4 },
        { id: 'core.healing.5', name: 'Curación 5', cost: 3, kind: 'fixed', amount: 5 },
        { id: 'core.healing.6', name: 'Curación 6', cost: 4, kind: 'fixed', amount: 6 },
        { id: 'core.healing.1d6', name: 'Curación 1D6', cost: 2, kind: 'dice', formula: '1D6' },
      ]);

      const techniqueBehavior = {
        id: 'b_dice_ce',
        name: 'Sello Sanador 1D6',
        mode: 'active',
        effects: [
          {
            id: 'e_dice_ce',
            type: 'healing',
            resourceId: 'SA',
            kind: 'dice',
            formula: '1D6',
            magnitude: { kind: 'dice', formula: '1D6' },
            ruleId: 'core.healing.1d6',
            runtimeKey: '1D6',
          },
        ],
      };

      // 1. El coste estructural es 2 CE antes de cualquier tirada
      const initialCE = calculateTechniqueStructuralCost([techniqueBehavior], config);
      expect(initialCE).toBe(2);

      // 2. Ejecutar con tirada máxima de 6 (que numéricamente costaría 4 CE si fuera fija)
      const world = testWorld();
      const executionResult = applyRuleOperations(
        world,
        'self',
        'source',
        0,
        [
          {
            kind: 'effect',
            targetId: 'ally',
            effect: techniqueBehavior.effects[0] as any,
          },
        ],
        { e_dice_ce: [6] } // Tirada = 6
      );

      // Curó 6 puntos en runtime
      expect(executionResult.world.ally.resources.SA.current).toBe(16); // 10 + 6 = 16

      // 3. El CE estructural de la técnica permanece inmutable en 2 CE (procede de la opción de Curación, no de la tirada)
      const structuralCEAfterRoll = calculateTechniqueStructuralCost([techniqueBehavior], config);
      expect(structuralCEAfterRoll).toBe(2);
      expect(structuralCEAfterRoll).not.toBe(4); // NO se convirtió en curación 6
    });
  });
});
