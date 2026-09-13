import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCoreCategories } from '../../domain/coreRuleCatalog';

const memory = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));
vi.mock('../index.ts', async () => {
  const { getTableName } = await import('drizzle-orm');
  const copy = (value: any) => JSON.parse(JSON.stringify(value));
  const db: any = {
    execute: async () => [],
    transaction: async (fn: any) => { const previous = copy(memory.tables); try { return await fn(db); } catch (error) { memory.tables = previous; throw error; } },
    select: () => ({ from: (table: any) => {
      const rows = () => copy(memory.tables[getTableName(table)] ?? []);
      return { where: async () => rows(), orderBy: async () => rows(), then: (fn: any) => Promise.resolve(rows()).then(fn) };
    } }),
    insert: (table: any) => ({ values: (payload: any) => ({ returning: async () => { const row = copy(payload); (memory.tables[getTableName(table)] ??= []).push(row); return [copy(row)]; } }) }),
    update: (table: any) => ({ set: (payload: any) => ({ where: () => ({ returning: async () => { const rows = memory.tables[getTableName(table)]; rows[0] = { ...rows[0], ...copy(payload) }; return [copy(rows[0])]; } }) }) }),
    delete: (table: any) => ({ where: async () => { memory.tables[getTableName(table)] = []; } }),
  };
  return { db };
});

import { getElement, upsertElement, deleteElement } from '../elements';
import { deleteRule } from '../rules';

beforeEach(() => { memory.tables = { system_rules: [{ key: 'system_mechanics', value: createCoreCategories() }], system_elements: [] }; });

describe('Element service persistence contract with transactional storage adapter', () => {
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
});
