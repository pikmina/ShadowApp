import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCoreCategories } from '../../domain/coreRuleCatalog';

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

    return false;
  }

  const db: any = {
    execute: async () => [],
    transaction: async (fn: any) => { const previous = copy(memory.tables); try { return await fn(db); } catch (error) { memory.tables = previous; throw error; } },
    select: () => ({ from: (table: any) => {
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
            then: (fn: any) => Promise.resolve(filtered()).then(fn)
          };
        },
        orderBy: () => getRows(),
        then: (fn: any) => Promise.resolve(getRows()).then(fn)
      };
    } }),
    insert: (table: any) => ({ values: (payload: any) => {
      const executeInsert = async () => {
        const row = copy(payload);
        const name = getTableName(table);
        const tableRows = (memory.tables[name] ??= []);
        const conflictIdx = tableRows.findIndex((r: any) => (payload.id && r.id === payload.id) || (payload.key && r.key === payload.key));
        if (conflictIdx >= 0) {
          tableRows[conflictIdx] = { ...tableRows[conflictIdx], ...copy(payload) };
          return [copy(tableRows[conflictIdx])];
        }
        tableRows.push(row);
        return [copy(row)];
      };
      return {
        onConflictDoUpdate: () => ({ returning: executeInsert, then: (fn: any) => executeInsert().then(fn) }),
        onConflictDoNothing: () => ({ returning: executeInsert, then: (fn: any) => executeInsert().then(fn) }),
        returning: executeInsert,
        then: (fn: any) => executeInsert().then(fn),
      };
    } }),
    update: (table: any) => ({ set: (payload: any) => ({ where: (clause: any) => {
      const executeUpdate = async () => {
        const name = getTableName(table);
        const rows = memory.tables[name] ?? [];
        const matchIdx = rows.findIndex((r: any) => evaluateSqlFilter(r, clause));
        if (matchIdx >= 0) {
          rows[matchIdx] = { ...rows[matchIdx], ...copy(payload) };
          return [copy(rows[matchIdx])];
        }
        return [];
      };
      return {
        returning: executeUpdate,
        then: (fn: any) => executeUpdate().then(fn),
      };
    } }) }),
    delete: (table: any) => ({ where: (clause: any) => {
      const executeDelete = async () => {
        const name = getTableName(table);
        const rows = memory.tables[name] ?? [];
        if (!clause) {
          memory.tables[name] = [];
        } else {
          memory.tables[name] = rows.filter((r: any) => !evaluateSqlFilter(r, clause));
        }
      };
      return {
        then: (fn: any) => executeDelete().then(fn),
      };
    } }),
  };
  return { db };
});

import { getElement, upsertElement, deleteElement, seedCoreWeaknesses } from '../elements';
import { deleteRule, upsertRule } from '../rules';

beforeEach(() => { memory.tables = { system_rules: [{ key: 'system_mechanics', value: createCoreCategories() }], system_elements: [] }; });

describe('Element service persistence contract with transactional storage adapter', () => {
  test('seedCoreWeaknesses inserts initial weaknesses and preserves user modifications on subsequent runs', async () => {
    // 1. Initial run seeds elements
    await seedCoreWeaknesses();
    const initialWeakness = (await getElement('weakness_acumulacion_impacto'))!;
    expect(initialWeakness).toBeDefined();
    expect(initialWeakness.name).toBe('Acumulación de Impacto');

    // 2. User customizes the weakness (description and custom mechanical behavior)
    await upsertElement({
      id: initialWeakness.id,
      name: 'Acumulación de Impacto Personalizada',
      description: 'Descripción modificada por el usuario',
      mechanicalBehaviors: [{ id: 'custom_b1', mode: 'reactive', effects: [] }],
    });

    const modified = await getElement(initialWeakness.id);
    expect(modified.name).toBe('Acumulación de Impacto Personalizada');
    expect(modified.description).toBe('Descripción modificada por el usuario');
    expect(modified.mechanicalBehaviors[0].id).toBe('custom_b1');

    // 3. Subsequent server startup / seedCoreWeaknesses call MUST NOT overwrite user modifications
    await seedCoreWeaknesses();

    const afterSecondSeed = await getElement(initialWeakness.id);
    expect(afterSecondSeed.name).toBe('Acumulación de Impacto Personalizada');
    expect(afterSecondSeed.description).toBe('Descripción modificada por el usuario');
    expect(afterSecondSeed.mechanicalBehaviors[0].id).toBe('custom_b1');
  });
  test('create/save/load/edit/save/reload/delete preserves references and valid falsy values', async () => {
    const effects = [{ applicationId: 'a1', groupId: 'speech', mechanicId: 'core.healing', ruleId: 'core.healing.es2' }];
    const created = await upsertElement({ kind: 'trait', name: 'TEMP lifecycle', description: '', effects, metadata: { amount: 0, enabled: false } });
    expect((await getElement(created.id)).effects).toEqual(effects);
    await upsertElement({ id: created.id, name: 'TEMP renamed' });
    const reloaded = await getElement(created.id);
    expect(reloaded.effects).toEqual(effects);
    expect(reloaded.metadata).toEqual({ amount: 0, enabled: false });
    expect(reloaded.description).toBe('');
    await deleteElement(created.id);
    expect(await getElement(created.id)).toBeUndefined();
  });
  test('publication checks persisted effects when UPDATE omits effects', async () => {
    const created = await upsertElement({ kind: 'trait', name: 'TEMP legacy', description: '', effects: [{ type: 'deal_damage' }] });
    await expect(upsertElement({ id: created.id, status: 'published' })).rejects.toThrow('anteriores');
    expect((await getElement(created.id)).status).toBe('draft');
  });
  test('broken references cannot partially create a record', async () => {
    await expect(upsertElement({ kind: 'trait', name: 'TEMP broken', description: '', effects: [{ applicationId: 'a', mechanicId: 'missing', ruleId: 'missing' }] })).rejects.toThrow('unknown_mechanic_reference');
    expect(memory.tables.system_elements).toEqual([]);
  });
  test('core rule document cannot be deleted through the data service', async () => {
    await expect(deleteRule('system_mechanics')).rejects.toThrow('Core');
    expect(memory.tables.system_rules).toHaveLength(1);
  });
  test('removing an option referenced by elements lists the referencing elements in the error message', async () => {
    const effects = [{ applicationId: 'a1', groupId: 'speech', mechanicId: 'core.healing', ruleId: 'core.healing.es2' }];
    await upsertElement({ kind: 'trait', name: 'Item Curativo Alpha', description: '', effects });
    await upsertElement({ kind: 'trait', name: 'Poción Beta', description: '', effects });

    const updatedMechanics = createCoreCategories().map(cat => {
      if (cat.id === 'core.healing') {
        return { ...cat, rules: cat.rules.filter(r => r.id !== 'core.healing.es2') };
      }
      return cat;
    });

    await expect(upsertRule('system_mechanics', 'json', updatedMechanics, 'Motor universal de reglas')).rejects.toThrowError(
      /No se puede eliminar la opción .* utilizada por los siguientes elementos:\n• "Item Curativo Alpha", "Poción Beta"/
    );
  });
});
