import { describe, it, expect } from 'vitest';
import {
  createCoreCategories,
  getCategoryOptions,
  CORE_CATEGORIES,
  CORE_CATEGORY_CONTRACTS,
} from '../coreRuleCatalog';
import { getMechanicalLabel } from '../mechanicalLabels';
import {
  findStatusRemoveOption,
  calculateTechniqueStructuralCost,
} from '../systemMechanics';
import { createDefaultMechanicalEffect, type MechanicalBehavior } from '../mechanicalBehavior';
import { deriveTechniqueFunctionalCategories } from '../characterTechnique';
import { executeMechanicalBehavior, createEncounterRuntimeState } from '../mechanicalRuntime';

describe('Phase 1: Damage Types Foundation (sensorial, motor, anomalia_don, psiquico)', () => {
  it('A. includes sensorial (replacing sonoro), motor, and anomalia_don in core damage_type rules', () => {
    const cats = createCoreCategories();
    const dtCat = cats.find((c) => c.coreKey === 'damage_type');
    expect(dtCat).toBeDefined();

    const options = getCategoryOptions(cats, 'damage_type');
    const keys = options.map((o) => o.runtimeKey);

    expect(keys).toContain('sensorial');
    expect(keys).toContain('motor');
    expect(keys).toContain('anomalia_don');
    expect(keys).toContain('psiquico');
    expect(keys).not.toContain('sonoro');
  });

  it('B. resolves Spanish labels accurately and provides backwards compatibility for sonoro', () => {
    expect(getMechanicalLabel('damageTypes', 'sensorial')).toBe('Sensorial');
    expect(getMechanicalLabel('damageTypes', 'motor')).toBe('Motor');
    expect(getMechanicalLabel('damageTypes', 'anomalia_don')).toBe('Anomalía de Don');
    expect(getMechanicalLabel('damageTypes', 'psiquico')).toBe('Psíquico / Mental');
    // Legacy fallback
    expect(getMechanicalLabel('damageTypes', 'sonoro')).toBe('Sensorial');
  });
});

describe('Phase 2: Status Removal & Curing Contract (status_remove)', () => {
  it('A. registers status_remove in CORE_CATEGORIES and CORE_CATEGORY_CONTRACTS', () => {
    expect(CORE_CATEGORIES.status_remove).toBe('Retirar / Curar Estado Alterado');
    expect(CORE_CATEGORY_CONTRACTS.status_remove).toBeDefined();
    expect(CORE_CATEGORY_CONTRACTS.status_remove.kind).toBe('effect');
    expect(CORE_CATEGORY_CONTRACTS.status_remove.effectType).toBe('status_remove');
  });

  it('B. provides canonical status_remove options with CE costs in System Rules', () => {
    const cats = createCoreCategories();
    const removeOptions = getCategoryOptions(cats, 'status_remove');
    expect(removeOptions.length).toBeGreaterThan(0);

    const allCure = removeOptions.find((o) => o.runtimeKey === 'all');
    expect(allCure).toBeDefined();
    expect(allCure?.name).toBe('Curar Cualquier Estado Alterado');
    expect(allCure?.cost).toBe(4);

    const poisonCure = removeOptions.find((o) => o.runtimeKey === 'veneno');
    expect(poisonCure).toBeDefined();
    expect(poisonCure?.cost).toBe(2);

    const stunCure = removeOptions.find((o) => o.runtimeKey === 'aturdido');
    expect(stunCure).toBeDefined();
    expect(stunCure?.cost).toBe(2);
  });

  it('C. findStatusRemoveOption locates rules by id, runtimeKey, or name', () => {
    const cats = createCoreCategories();
    const optAll = findStatusRemoveOption(cats, 'all');
    expect(optAll).toBeDefined();
    expect(optAll?.cost).toBe(4);

    const optVeneno = findStatusRemoveOption(cats, 'veneno');
    expect(optVeneno).toBeDefined();
    expect(optVeneno?.cost).toBe(2);
  });

  it('D. calculates execution CE cost correctly for status_remove effects', () => {
    const cats = createCoreCategories();
    const behavior: any = {
      id: 'cure_veneno_behavior',
      mode: 'active',
      conditions: [],
      effects: [
        {
          id: 'eff_cure',
          type: 'status_remove',
          statusElementId: 'veneno',
        },
      ],
    };

    const cost = calculateTechniqueStructuralCost([behavior], cats);
    expect(cost).toBe(2);
  });

  it('E. classifies techniques with status_remove as support', () => {
    const behaviors: any[] = [
      {
        id: 'cure_behavior',
        mode: 'active',
        conditions: [],
        effects: [
          {
            id: 'eff_1',
            type: 'status_remove',
            statusElementId: 'veneno',
          },
        ],
      },
    ];

    const categories = deriveTechniqueFunctionalCategories(behaviors);
    expect(categories).toContain('support');
    expect(categories).not.toContain('offensive');
  });

  it('F. removes the target status during combat runtime execution', () => {
    const world: Record<string, any> = {
      medic: {
        id: 'medic',
        name: 'Médico',
        statuses: [],
        resources: { SA: { current: 20, max: 20 }, ES: { current: 30, max: 30 } },
      },
      patient: {
        id: 'patient',
        name: 'Paciente',
        statuses: [
          { sourceId: 'src_poison', statusElementId: 'veneno_grave' },
          { sourceId: 'src_stun', statusElementId: 'aturdido' },
        ],
        resources: { SA: { current: 15, max: 20 }, ES: { current: 20, max: 30 } },
      },
    };

    const encounter = createEncounterRuntimeState();

    const result = executeMechanicalBehavior({
      behavior: {
        id: 'remedy_poison',
        mode: 'active',
        target: { type: 'character' },
        conditions: [],
        effects: [
          {
            id: 'eff_cure_poison',
            type: 'status_remove',
            statusElementId: 'veneno',
          },
        ],
      } as any,
      sourceEntityId: 'medic',
      targetEntityId: 'patient',
      world,
      encounter,
    });

    expect(result.success).toBe(true);
    const updatedPatient = result.newWorld.patient;

    // veneno_grave should have been removed, but aturdido remains!
    expect(updatedPatient.statuses.some((s: any) => s.statusElementId.includes('veneno'))).toBe(false);
    expect(updatedPatient.statuses.some((s: any) => s.statusElementId === 'aturdido')).toBe(true);
  });

  it('G. creates default status_remove effect correctly', () => {
    const defaultEff = createDefaultMechanicalEffect('status_remove');
    expect(defaultEff.type).toBe('status_remove');
    expect((defaultEff as any).statusElementId).toBeDefined();
  });
});
