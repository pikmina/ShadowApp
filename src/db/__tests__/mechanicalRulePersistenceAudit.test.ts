import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCoreCategories, getCategoryOptions, getVisibleOptions, validateCoreCategories } from '../../domain/coreRuleCatalog.ts';
import { mechanicalBehaviorSchema, type MechanicalBehavior } from '../../domain/mechanicalBehavior.ts';
import { calculateTechniqueStructuralCost, type SystemMechanicsConfig } from '../../domain/systemMechanics.ts';

const memory = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('../index.ts', async () => {
  const { getTableName } = await import('drizzle-orm');
  const copy = (value: any) => JSON.parse(JSON.stringify(value));

  function evaluateSqlFilter(row: any, expr: any): boolean {
    if (!expr) return true;
    if (!expr.queryChunks) return true;
    const chunks = expr.queryChunks;

    if (chunks.length >= 4 && chunks[1] && chunks[1].name !== undefined) {
      const colName = chunks[1].name;
      const targetChunk = chunks[3];
      const targetVal = targetChunk && typeof targetChunk === 'object' && 'value' in targetChunk && !Array.isArray(targetChunk.value)
        ? targetChunk.value
        : targetChunk;
      return row[colName] === targetVal;
    }

    let hasOr = false;
    let hasAnd = false;
    const subExprs: any[] = [];

    for (const chunk of chunks) {
      if (chunk && chunk.value && Array.isArray(chunk.value)) {
        const str = chunk.value.join('');
        if (str.includes(' or ')) hasOr = true;
        if (str.includes(' and ')) hasAnd = true;
      } else if (chunk && typeof chunk === 'object' && chunk.queryChunks) {
        subExprs.push(chunk);
      }
    }

    if (subExprs.length === 1) {
      return evaluateSqlFilter(row, subExprs[0]);
    }

    if (hasOr) {
      return subExprs.some(sub => evaluateSqlFilter(row, sub));
    }
    if (hasAnd) {
      return subExprs.every(sub => evaluateSqlFilter(row, sub));
    }

    return true;
  }

  const db: any = {
    execute: async () => [],
    transaction: async (fn: any) => {
      const previous = copy(memory.tables);
      try {
        return await fn(db);
      } catch (error) {
        memory.tables = previous;
        throw error;
      }
    },
    select: () => ({
      from: (table: any) => {
        const getRows = () => copy(memory.tables[getTableName(table)] ?? []);
        return {
          where: (clause: any) => {
            const filtered = () => {
              const allRows = getRows();
              if (!clause) return allRows;
              return allRows.filter((r: any) => evaluateSqlFilter(r, clause));
            };
            return {
              orderBy: () => filtered(),
              then: (fn: any) => Promise.resolve(filtered()).then(fn),
            };
          },
          orderBy: () => getRows(),
          then: (fn: any) => Promise.resolve(getRows()).then(fn),
        };
      },
    }),
    insert: (table: any) => ({
      values: (payload: any) => {
        const executeInsert = async () => {
          const row = copy(payload);
          const name = getTableName(table);
          const tableRows = (memory.tables[name] ??= []);
          const conflictIdx = tableRows.findIndex(
            (r: any) => (payload.id && r.id === payload.id) || (payload.key && r.key === payload.key)
          );
          if (conflictIdx >= 0) {
            tableRows[conflictIdx] = { ...tableRows[conflictIdx], ...copy(payload) };
            return [copy(tableRows[conflictIdx])];
          }
          tableRows.push(row);
          return [copy(row)];
        };
        return {
          onConflictDoUpdate: () => ({ returning: executeInsert, then: (fn: any) => Promise.resolve(executeInsert()).then(fn) }),
          onConflictDoNothing: () => ({ returning: executeInsert, then: (fn: any) => Promise.resolve(executeInsert()).then(fn) }),
          returning: executeInsert,
          then: (fn: any) => Promise.resolve(executeInsert()).then(fn),
        };
      },
    }),
    update: (table: any) => ({
      set: (payload: any) => ({
        where: () => ({
          returning: async () => {
            const rows = memory.tables[getTableName(table)];
            rows[0] = { ...rows[0], ...copy(payload) };
            return [copy(rows[0])];
          },
        }),
      }),
    }),
    delete: (table: any) => ({
      where: async () => {
        memory.tables[getTableName(table)] = [];
      },
    }),
  };
  return { db };
});

import { getRule, upsertRule, seedCoreRules } from '../rules.ts';

beforeEach(() => {
  memory.tables = {
    system_rules: [],
    system_elements: [],
    audit_logs: [],
  };
});

describe('RULES-DATA-1: Mechanical Rules Persistence & Lifecycle Audit', () => {
  test('1. Initial Bootstrap: empty DB creates initial core categories and options', async () => {
    // Database starts completely empty
    expect(memory.tables.system_rules).toHaveLength(0);

    // Run startup bootstrap
    await seedCoreRules();

    const stored = await getRule('system_mechanics');
    expect(stored).toBeDefined();
    const categories = stored?.value as SystemMechanicsConfig;
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(validateCoreCategories(categories)).toBe(true);

    // Initial damage category has default options
    const damageCat = categories.find((c: any) => c.id === 'core.damage')!;
    expect(damageCat.rules.some((r: any) => r.id === 'core.damage.4d8')).toBe(true);
  });

  test('2. Delete Option: deleted configurable option does NOT reappear after bootstrap/restart', async () => {
    // 1. Initial bootstrap
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // 2. Administrator deletes 'core.damage.4d8' option
    const damageCat = categories.find((c: any) => c.id === 'core.damage')!;
    const originalCount = damageCat.rules.length;
    damageCat.rules = damageCat.rules.filter((r: any) => r.id !== 'core.damage.4d8');
    expect(damageCat.rules.length).toBe(originalCount - 1);

    // 3. Save to database via upsertRule
    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');

    // 4. Verify saved state in database does not contain 'core.damage.4d8'
    const afterSave = await getRule('system_mechanics');
    const afterSaveCategories = afterSave?.value as SystemMechanicsConfig;
    const afterSaveDamage = afterSaveCategories.find((c: any) => c.id === 'core.damage')!;
    expect(afterSaveDamage.rules.some((r: any) => r.id === 'core.damage.4d8')).toBe(false);

    // 5. Simulate server restart / redeploy by running seedCoreRules again
    await seedCoreRules();

    // 6. Verify option DOES NOT REAPPEAR
    const afterRestart = await getRule('system_mechanics');
    const afterRestartCategories = afterRestart?.value as SystemMechanicsConfig;
    const afterRestartDamage = afterRestartCategories.find((c: any) => c.id === 'core.damage')!;
    expect(afterRestartDamage.rules.some((r: any) => r.id === 'core.damage.4d8')).toBe(false);
    expect(afterRestartDamage.rules.length).toBe(originalCount - 1);
  });

  test('3. Edit Option CE: customized CE survives reload, restart and redeploy initialization', async () => {
    // 1. Initial bootstrap
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // 2. Administrator modifies CE of 'core.damage.1d6' from 1 to 5
    const damageCat = categories.find((c: any) => c.id === 'core.damage')!;
    const option1d6 = damageCat.rules.find((r: any) => r.id === 'core.damage.1d6')!;
    expect(option1d6).toBeDefined();
    option1d6.cost = 5;

    // 3. Save to database
    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');

    // 4. Simulate server restart / deploy initialization
    await seedCoreRules();

    // 5. Verify customized CE remains 5
    const reloaded = await getRule('system_mechanics');
    const reloadedCategories = reloaded?.value as SystemMechanicsConfig;
    const reloadedDamage = reloadedCategories.find((c: any) => c.id === 'core.damage')!;
    const reloaded1d6 = reloadedDamage.rules.find((r: any) => r.id === 'core.damage.1d6')!;
    expect(reloaded1d6.cost).toBe(5);
  });

  test('4. isAvailable (Soft-Delete): disabled option remains disabled and respects visibility', async () => {
    // 1. Initial bootstrap
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // 2. Administrator sets isAvailable: false on 'core.duration.3'
    const durationCat = categories.find((c: any) => c.id === 'core.duration')!;
    const option3Turns = durationCat.rules.find((r: any) => r.id === 'core.duration.3')!;
    expect(option3Turns).toBeDefined();
    option3Turns.isAvailable = false;

    // 3. Save to database
    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');

    // 4. Simulate server restart / deploy initialization
    await seedCoreRules();

    // 5. Verify isAvailable: false persists
    const reloaded = await getRule('system_mechanics');
    const reloadedCategories = reloaded?.value as SystemMechanicsConfig;
    const reloadedDuration = reloadedCategories.find((c: any) => c.id === 'core.duration')!;
    const reloadedOption = reloadedDuration.rules.find((r: any) => r.id === 'core.duration.3')!;
    expect(reloadedOption.isAvailable).toBe(false);

    // 6. Verify getVisibleOptions hides it for new selections, but preserves it for existing selections
    const allDurationOptions = getCategoryOptions(reloadedCategories, 'duration');
    const visibleForNew = getVisibleOptions(allDurationOptions);
    expect(visibleForNew.some((o: any) => o.id === 'core.duration.3')).toBe(false);

    const visibleForExisting = getVisibleOptions(allDurationOptions, '3');
    expect(visibleForExisting.some((o: any) => o.id === 'core.duration.3')).toBe(true);
  });

  test('5. Empty Category: deleting all options in a category does NOT resurrect defaults', async () => {
    // 1. Initial bootstrap
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // 2. Administrator deletes ALL options in 'core.barrier'
    const barrierCat = categories.find((c: any) => c.id === 'core.barrier')!;
    expect(barrierCat.rules.length).toBeGreaterThan(0);
    barrierCat.rules = [];

    // 3. Save to database
    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');

    // 4. Simulate server restart
    await seedCoreRules();

    // 5. Query options via getCategoryOptions with database config
    const reloaded = await getRule('system_mechanics');
    const reloadedCategories = reloaded?.value as SystemMechanicsConfig;
    const barrierOptions = getCategoryOptions(reloadedCategories, 'barrier');
    expect(barrierOptions).toEqual([]);
  });

  test('6. Core Schema Preservation: deleting all options in damage does not delete the damage primitive from schema', async () => {
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // Clear all damage rules
    const damageCat = categories.find((c: any) => c.id === 'core.damage')!;
    damageCat.rules = [];

    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');
    await seedCoreRules();

    const reloaded = await getRule('system_mechanics');
    const reloadedCategories = reloaded?.value as SystemMechanicsConfig;
    expect(validateCoreCategories(reloadedCategories)).toBe(true);
    expect(reloadedCategories.some((c: any) => c.id === 'core.damage')).toBe(true);
  });

  test('7. Idempotence: running seedCoreRules() 3 times produces zero drift, no duplicates, no restored options', async () => {
    // Setup customized database state
    await seedCoreRules();
    const initial = await getRule('system_mechanics');
    const categories = initial?.value as SystemMechanicsConfig;

    // Delete one option and modify another
    const damageCat = categories.find((c: any) => c.id === 'core.damage')!;
    damageCat.rules = damageCat.rules.filter((r: any) => r.id !== 'core.damage.4d8');
    const rule1d6 = damageCat.rules.find((r: any) => r.id === 'core.damage.1d6')!;
    rule1d6.cost = 99;

    await upsertRule('system_mechanics', 'json', categories, 'Motor universal de reglas', 'admin_uid');

    // Capture state
    const beforeCalls = await getRule('system_mechanics');

    // Run initialization 3 times sequentially
    await seedCoreRules();
    await seedCoreRules();
    await seedCoreRules();

    const afterCalls = await getRule('system_mechanics');
    expect(JSON.stringify(afterCalls?.value)).toBe(JSON.stringify(beforeCalls?.value));
    
    // Ensure modified cost is still 99 and deleted 4d8 is still absent
    const finalCategories = afterCalls?.value as SystemMechanicsConfig;
    const finalDamage = finalCategories.find((c: any) => c.id === 'core.damage')!;
    expect(finalDamage.rules.some((r: any) => r.id === 'core.damage.4d8')).toBe(false);
    expect(finalDamage.rules.find((r: any) => r.id === 'core.damage.1d6')?.cost).toBe(99);
  });

  test('8. Existing records: MechanicalBehavior with orphaned/deleted option still parses and loads safely', () => {
    // MechanicalBehavior created prior to an option being deleted
    const historicalBehavior: MechanicalBehavior = {
      id: 'bh_historical',
      name: 'Técnica Antigua',
      mode: 'active',
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      conditions: [
        { id: 'c1', type: 'manual', signalId: 'deleted_manual_condition_123', description: 'Condición previa' },
      ],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [
        { id: 'eff_dmg_1', type: 'damage', dice: '5D8', damageType: 'fire' }, // 5D8 might not exist in catalog
      ],
      target: {
        type: 'enemy',
        range: { type: 'contact' },
      },
      temporality: { duration: { type: 'instant' } },
      limitations: [],
    };

    // Validates with schema without errors
    const parsed = mechanicalBehaviorSchema.safeParse(historicalBehavior);
    expect(parsed.success).toBe(true);

    // CE calculation handles missing option gracefully (falls back to 0 cost for unknown option, no crash)
    const customConfig = createCoreCategories();
    // remove all damage options from customConfig
    const dmgCat = customConfig.find(c => c.id === 'core.damage')!;
    dmgCat.rules = [];

    expect(() => calculateTechniqueStructuralCost([historicalBehavior], customConfig)).not.toThrow();
    const cost = calculateTechniqueStructuralCost([historicalBehavior], customConfig);
    expect(typeof cost).toBe('number');
  });

  test('9. migration_rules_data_2_1 idempotence: does not overwrite admin customization on subsequent seedCoreRules', async () => {
    // 1. Initial bootstrap applies migration_rules_data_2_1
    await seedCoreRules();

    const stored1 = await getRule('system_mechanics');
    const categories1 = stored1?.value as SystemMechanicsConfig;
    const attrCat1 = categories1.find((c: any) => c.id === 'core.attribute')!;
    const fueOption1 = attrCat1.rules.find((r: any) => r.id === 'core.attribute.fue')!;
    expect(fueOption1.cost).toBe(1);

    // Verify migration flags exist
    const flag21 = await getRule('migration_rules_data_2_1');
    expect(flag21?.value).toBe(true);

    // 2. Change FUE from CE 1 to CE 9 simulating admin customization
    fueOption1.cost = 9;
    await upsertRule('system_mechanics', 'json', categories1, 'Motor universal de reglas', 'admin_uid');

    // Verify change in DB
    const storedModified = await getRule('system_mechanics');
    const categoriesModified = storedModified?.value as SystemMechanicsConfig;
    const fueModified = categoriesModified.find((c: any) => c.id === 'core.attribute')!.rules.find((r: any) => r.id === 'core.attribute.fue')!;
    expect(fueModified.cost).toBe(9);

    // 3. Execute seedCoreRules() again simulating server restart
    await seedCoreRules();

    // 4. FUE must continue at CE 9 (DB ownership preserved, migration does not re-run)
    const reloaded = await getRule('system_mechanics');
    const reloadedCategories = reloaded?.value as SystemMechanicsConfig;
    const reloadedFue = reloadedCategories.find((c: any) => c.id === 'core.attribute')!.rules.find((r: any) => r.id === 'core.attribute.fue')!;
    expect(reloadedFue.cost).toBe(9);
  });

  test('10. migration_rules_data_3a idempotence: preserves admin changes to Status, Manipulation, Transformation and Long-term Duration across restarts', async () => {
    // 1. Initial bootstrap applies migration_rules_data_3a
    await seedCoreRules();

    const stored1 = await getRule('system_mechanics');
    const categories1 = stored1?.value as SystemMechanicsConfig;

    // Verify initial canonical values
    const statusCat = categories1.find((c: any) => c.id === 'core.status')!;
    const quemaduraLeve = statusCat.rules.find((r: any) => r.runtimeKey === 'quemadura_leve')!;
    expect(quemaduraLeve.cost).toBe(2);

    const transCat = categories1.find((c: any) => c.id === 'core.transformation')!;
    const trans5m = transCat.rules.find((r: any) => r.runtimeKey === '5m')!;
    expect(trans5m.cost).toBe(3);

    const objCat = categories1.find((c: any) => c.id === 'core.object_manipulation')!;
    const objLarge = objCat.rules.find((r: any) => r.runtimeKey === 'large')!;
    expect(objLarge.cost).toBe(4);

    const durCat = categories1.find((c: any) => c.id === 'core.duration')!;
    const durDay = durCat.rules.find((r: any) => r.runtimeKey === '1_day')!;
    expect(durDay.cost).toBe(4);

    // Verify flag
    const flag3a = await getRule('migration_rules_data_3a');
    expect(flag3a?.value).toBe(true);

    // 2. Admin modifies all 4 categories to custom balance values
    quemaduraLeve.cost = 7;
    trans5m.cost = 9;
    objLarge.cost = 12;
    durDay.cost = 15;

    await upsertRule('system_mechanics', 'json', categories1, 'Motor universal de reglas', 'admin_uid');

    // 3. Re-run seedCoreRules() multiple times
    await seedCoreRules();
    await seedCoreRules();

    // 4. Verify all admin customizations are preserved
    const reloaded = await getRule('system_mechanics');
    const reloadedCats = reloaded?.value as SystemMechanicsConfig;

    expect(reloadedCats.find((c: any) => c.id === 'core.status')!.rules.find((r: any) => r.runtimeKey === 'quemadura_leve')?.cost).toBe(7);
    expect(reloadedCats.find((c: any) => c.id === 'core.transformation')!.rules.find((r: any) => r.runtimeKey === '5m')?.cost).toBe(9);
    expect(reloadedCats.find((c: any) => c.id === 'core.object_manipulation')!.rules.find((r: any) => r.runtimeKey === 'large')?.cost).toBe(12);
    expect(reloadedCats.find((c: any) => c.id === 'core.duration')!.rules.find((r: any) => r.runtimeKey === '1_day')?.cost).toBe(15);
  });

  test('11. migration_rules_data_3b idempotence: preserves admin changes to Target, Target Count, Area, Range and Selection across restarts', async () => {
    // 1. Initial bootstrap applies migration_rules_data_3b
    await seedCoreRules();

    const stored1 = await getRule('system_mechanics');
    const categories1 = stored1?.value as SystemMechanicsConfig;

    // Verify initial canonical values
    const targetCat = categories1.find((c: any) => c.id === 'core.target')!;
    const structureRule = targetCat.rules.find((r: any) => r.runtimeKey === 'structure')!;
    expect(structureRule.cost).toBe(3);

    const tcCat = categories1.find((c: any) => c.id === 'core.target_count')!;
    const ally2Rule = tcCat.rules.find((r: any) => r.runtimeKey === 'ally_2')!;
    expect(ally2Rule.cost).toBe(3);

    const areaCat = categories1.find((c: any) => c.id === 'core.area')!;
    const area50Rule = areaCat.rules.find((r: any) => r.runtimeKey === '50')!;
    expect(area50Rule.cost).toBe(4);

    // Verify flag
    const flag3b = await getRule('migration_rules_data_3b');
    expect(flag3b?.value).toBe(true);

    // 2. Admin modifies balance values
    structureRule.cost = 11;
    ally2Rule.cost = 14;
    area50Rule.cost = 25;

    await upsertRule('system_mechanics', 'json', categories1, 'Motor universal de reglas', 'admin_uid');

    // 3. Re-run seedCoreRules() simulating server restart
    await seedCoreRules();
    await seedCoreRules();

    // 4. Verify all admin customizations are preserved
    const reloaded = await getRule('system_mechanics');
    const reloadedCats = reloaded?.value as SystemMechanicsConfig;

    expect(reloadedCats.find((c: any) => c.id === 'core.target')!.rules.find((r: any) => r.runtimeKey === 'structure')?.cost).toBe(11);
    expect(reloadedCats.find((c: any) => c.id === 'core.target_count')!.rules.find((r: any) => r.runtimeKey === 'ally_2')?.cost).toBe(14);
    expect(reloadedCats.find((c: any) => c.id === 'core.area')!.rules.find((r: any) => r.runtimeKey === '50')?.cost).toBe(25);
  });
});
