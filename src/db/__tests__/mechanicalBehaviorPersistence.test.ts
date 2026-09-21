import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCoreCategories } from '../../domain/coreRuleCatalog.ts';
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from '../../domain/mechanicalBehavior.ts';

const memory = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));
vi.mock('../index.ts', async () => {
  const { getTableName } = await import('drizzle-orm');
  const copy = (value: any) => JSON.parse(JSON.stringify(value));
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
        const rows = () => copy(memory.tables[getTableName(table)] ?? []);
        return {
          where: async () => rows(),
          orderBy: async () => rows(),
          then: (fn: any) => Promise.resolve(rows()).then(fn),
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
          onConflictDoUpdate: () => ({ returning: executeInsert }),
          onConflictDoNothing: () => ({ returning: executeInsert }),
          returning: executeInsert,
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

import { getElement, upsertElement, deleteElement } from '../elements.ts';

beforeEach(() => {
  memory.tables = {
    system_rules: [{ key: 'system_mechanics', value: createCoreCategories() }],
    system_elements: [],
  };
});

describe('MechanicalBehavior Element Persistence and Lifecycle', () => {
  test('guarda y recupera MechanicalBehavior sin pérdida', async () => {
    const behavior1: MechanicalBehavior = {
      id: 'bh_active_punch',
      name: 'Golpe Ígneo',
      mode: 'active',
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      conditions: [],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [
        { id: 'eff_dmg_1', type: 'damage', dice: '2D6', damageType: 'fire' },
      ],
      target: {
        type: 'enemy',
        range: { type: 'contact' },
      },
      temporality: { duration: { type: 'instant' } },
      limitations: [],
    };

    const created = await upsertElement({
      kind: 'technique_entitlement',
      name: 'Puño de Fuego',
      description: 'Ataque imbuido en llamas',
      mechanicalBehaviors: [behavior1],
      effects: [],
    });

    const loaded = await getElement(created.id);
    expect(loaded.mechanicalBehaviors).toHaveLength(1);
    expect(loaded.mechanicalBehaviors[0].id).toBe('bh_active_punch');
    expect(loaded.mechanicalBehaviors[0].mode).toBe('active');
    expect(loaded.mechanicalBehaviors[0].effects[0].dice).toBe('2D6');
  });

  test('actualiza MechanicalBehavior y preserva múltiples comportamientos', async () => {
    const b1 = createDefaultMechanicalBehavior('b1', 'active', 'Modo Asalto');
    const b2 = createDefaultMechanicalBehavior('b2', 'reactive', 'Guardia de Acero');

    const created = await upsertElement({
      kind: 'equipment',
      name: 'Armadura Táctica',
      description: 'Equipamiento avanzado',
      mechanicalBehaviors: [b1, b2],
      effects: [],
    });

    const loaded1 = await getElement(created.id);
    expect(loaded1.mechanicalBehaviors).toHaveLength(2);

    // Update b2 with new effect and add b3
    const b2Updated: MechanicalBehavior = {
      ...b2,
      effects: [{ id: 'eff_barrier', type: 'barrier', amount: 10 }],
    };
    const b3 = createDefaultMechanicalBehavior('b3', 'continuous', 'Soporte Vital');

    await upsertElement({
      id: created.id,
      name: 'Armadura Táctica Mk II',
      mechanicalBehaviors: [b1, b2Updated, b3],
    });

    const reloaded = await getElement(created.id);
    expect(reloaded.mechanicalBehaviors).toHaveLength(3);
    expect(reloaded.mechanicalBehaviors[1].effects[0].amount).toBe(10);
    expect(reloaded.name).toBe('Armadura Táctica Mk II');
  });

  test('elimina un comportamiento de la lista sin perder los demás', async () => {
    const b1 = createDefaultMechanicalBehavior('b1', 'active', 'Comportamiento 1');
    const b2 = createDefaultMechanicalBehavior('b2', 'reactive', 'Comportamiento 2');

    const created = await upsertElement({
      kind: 'trait',
      name: 'Rasgo Complejo',
      description: 'Prueba de eliminación de comportamiento',
      mechanicalBehaviors: [b1, b2],
      effects: [],
    });

    // Remove b1, keeping only b2
    await upsertElement({
      id: created.id,
      mechanicalBehaviors: [b2],
    });

    const reloaded = await getElement(created.id);
    expect(reloaded.mechanicalBehaviors).toHaveLength(1);
    expect(reloaded.mechanicalBehaviors[0].id).toBe('b2');
  });

  test('elemento legacy sigue cargando y actualizar otro campo no elimina sus mecánicas', async () => {
    const legacyEffects = [
      { applicationId: 'legacy_1', groupId: 'principal', mechanicId: 'core.healing', ruleId: 'core.healing.es2' },
    ];

    const createdLegacy = await upsertElement({
      kind: 'trait',
      name: 'Sanador Nato',
      description: 'Recupera ES',
      effects: legacyEffects,
    });

    const loaded = await getElement(createdLegacy.id);
    expect(loaded.effects).toEqual(legacyEffects);
    expect(loaded.mechanicalBehaviors).toEqual([]);

    // Save another field (e.g. description) without passing effects or mechanicalBehaviors
    await upsertElement({
      id: createdLegacy.id,
      description: 'Descripción actualizada preservando mecánicas legacy',
    });

    const reloaded = await getElement(createdLegacy.id);
    expect(reloaded.description).toBe('Descripción actualizada preservando mecánicas legacy');
    expect(reloaded.effects).toEqual(legacyEffects);
  });

  test('nuevo elemento puede utilizar MechanicalBehavior sin groupId', async () => {
    const modernBehavior: MechanicalBehavior = {
      id: 'bh_nogroup',
      name: 'Comportamiento Autónomo',
      mode: 'continuous',
      conditions: [],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [
        { id: 'eff_mod', type: 'attribute_modifier', attributeId: 'FUE', amount: 2, operation: 'add' },
      ],
      target: { type: 'self' },
      temporality: { duration: { type: 'while_owned' } },
      limitations: [],
    };

    const created = await upsertElement({
      kind: 'trait',
      name: 'Fuerza Natural',
      description: 'Incrementa FUE',
      mechanicalBehaviors: [modernBehavior],
      effects: [],
    });

    const loaded = await getElement(created.id);
    expect(loaded.mechanicalBehaviors[0].id).toBe('bh_nogroup');
    expect(loaded.mechanicalBehaviors[0]).not.toHaveProperty('groupId');
  });

  test('persiste y recupera los 4 casos de aceptación (Trauma, Sobrecarga Total, Sobrecarga Progresiva, Dependencia) sin pérdida', async () => {
    const trauma: MechanicalBehavior = {
      id: 'bh_trauma',
      name: 'Trauma Psíquico',
      mode: 'active',
      activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
      conditions: [],
      conditionLogic: 'all',
      resolution: {
        type: 'rd',
        difficulty: 16,
        attribute: 'VOL',
        outcomes: [
          { id: 'out_1', outcome: 'failure', description: 'Paralizado 1 turno', effects: [{ id: 'e1', type: 'status_apply', statusElementId: 'status_paralizado', turns: 1 }] },
          { id: 'out_2', outcome: 'failure_margin', marginThreshold: 5, description: 'Paralizado 2 turnos', effects: [{ id: 'e2', type: 'status_apply', statusElementId: 'status_paralizado', turns: 2 }] },
        ],
      },
      effects: [],
      target: { type: 'enemy' },
      temporality: { duration: { type: 'instant' } },
      limitations: [],
    };

    const sobrecargaTotal: MechanicalBehavior = {
      id: 'bh_sobrecarga_total',
      name: 'Sobrecarga Total',
      mode: 'reactive',
      trigger: { kind: 'roll', description: 'Tirada de Quirk' },
      conditions: [{ type: 'die', dieSelection: 'both', comparison: '=', value: 10 }],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [
        { id: 'eff_dmg', type: 'damage', dice: '4', damageType: 'overcharge', target: { type: 'self' }, temporality: { duration: { type: 'instant' } } },
        { id: 'eff_cost', type: 'cost_modifier', scopeId: 'quirk', amount: 2, operation: 'multiply', temporality: { duration: { type: 'until_next_use' } } },
      ],
      target: { type: 'self' },
      temporality: { duration: { type: 'instant' } },
      limitations: [],
    };

    const sobrecargaProgresiva: MechanicalBehavior = {
      id: 'bh_sobrecarga_prog',
      name: 'Sobrecarga Progresiva',
      mode: 'reactive',
      trigger: { kind: 'use_quirk' },
      conditions: [],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [{ id: 'eff_turn', type: 'turn_loss', turns: 1 }],
      target: { type: 'self' },
      temporality: { duration: { type: 'instant' } },
      limitations: [],
      control: {
        counter: {
          id: 'cnt_heat',
          name: 'Calor',
          initialValue: 0,
          incrementOnTrigger: 1,
          cap: 3,
          resetCondition: 'condition',
          resetConditionRule: { id: 'c_rest', type: 'manual', signalId: 'descanso_completo' },
        },
        accumulation: { accumulateBy: 'trigger_count', threshold: 3, resetOnThreshold: true },
      },
    };

    const dependencia: MechanicalBehavior = {
      id: 'bh_dependencia',
      name: 'Dependencia Química',
      mode: 'continuous',
      conditions: [{ id: 'c_dosis', type: 'status', statusElementId: 'dosis_activa', present: true }],
      conditionLogic: 'all',
      resolution: { type: 'automatic', outcomes: [] },
      effects: [{ id: 'eff_fue', type: 'bonus', targetStat: 'FUE', amount: 2, operation: 'add' }],
      target: { type: 'self' },
      temporality: { duration: { type: 'while_condition' } },
      limitations: [],
      control: {
        exception: {
          id: 'exc_1',
          targetBehaviorId: 'bh_dependencia',
          failedConditionId: 'c_dosis',
          allowWhenRequirementFailed: true,
          costResource: 'ES',
          costAmount: 4,
          action: 'allow',
        },
      },
    };

    const created = await upsertElement({
      kind: 'quirk',
      name: 'Quirk Complejo Experimental',
      description: 'Elemento con los 4 casos de aceptación serializados',
      mechanicalBehaviors: [trauma, sobrecargaTotal, sobrecargaProgresiva, dependencia],
      effects: [],
    });

    const loaded = await getElement(created.id);
    const behaviors = (loaded.mechanicalBehaviors ?? []) as MechanicalBehavior[];
    expect(behaviors).toHaveLength(4);

    // Verify Trauma
    const loadedTrauma = behaviors.find((b: MechanicalBehavior) => b.id === 'bh_trauma')!;
    expect(loadedTrauma.resolution?.type).toBe('rd');
    expect(loadedTrauma.resolution?.difficulty).toBe(16);
    expect(loadedTrauma.resolution?.outcomes).toHaveLength(2);
    expect(loadedTrauma.resolution?.outcomes?.[1]?.effects[0].type).toBe('status_apply');

    // Verify Sobrecarga Total overrides
    const loadedTotal = behaviors.find((b: MechanicalBehavior) => b.id === 'bh_sobrecarga_total')!;
    expect(loadedTotal.effects[0].target?.type).toBe('self');
    expect(loadedTotal.effects[1].temporality?.duration.type).toBe('until_next_use');

    // Verify Sobrecarga Progresiva counter
    const loadedProg = behaviors.find((b: MechanicalBehavior) => b.id === 'bh_sobrecarga_prog')!;
    expect(loadedProg.control?.counter?.cap).toBe(3);
    expect(loadedProg.control?.counter?.resetConditionRule?.type).toBe('manual');

    // Verify Dependencia exception
    const loadedDep = behaviors.find((b: MechanicalBehavior) => b.id === 'bh_dependencia')!;
    expect(loadedDep.control?.exception?.costAmount).toBe(4);
    expect(loadedDep.control?.exception?.targetBehaviorId).toBe('bh_dependencia');
    expect(loadedDep.control?.exception?.failedConditionId).toBe('c_dosis');
  });
});
