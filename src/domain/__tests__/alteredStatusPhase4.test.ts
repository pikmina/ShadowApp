import { describe, it, expect } from 'vitest';
import {
  advanceTurn,
  executeMechanicalBehavior,
  createEncounterRuntimeState,
  shouldRemoveStatus,
  resolveStatusDoT,
} from '../mechanicalRuntime';
import { describeMechanicalEffect } from '../mechanicalDescription';

describe('Phase 4: Runtime Execution & Combat Resolution for Altered Statuses', () => {
  it('A. shouldRemoveStatus correctly matches tiers, families, and specific status IDs', () => {
    // Tier matching
    expect(shouldRemoveStatus({ statusElementId: 'veneno_leve', tier: 'leve' }, 'leve')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'veneno_grave', tier: 'grave' }, 'leve')).toBe(false);
    expect(shouldRemoveStatus({ statusElementId: 'veneno_grave', tier: 'grave' }, 'grave')).toBe(true);

    // Family matching
    expect(shouldRemoveStatus({ statusElementId: 'core.status.veneno_grave' }, 'veneno')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.quemadura_leve' }, 'quemadura')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.hemorragia_grave' }, 'hemorragia')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.stunned' }, 'aturdido')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.conmocion' }, 'aturdido')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.inmovilizado' }, 'inmovilizado')).toBe(true);
    expect(shouldRemoveStatus({ statusElementId: 'core.status.ralentizado' }, 'inmovilizado')).toBe(true);

    // Universal cure
    expect(shouldRemoveStatus({ statusElementId: 'core.status.stunned' }, 'all')).toBe(true);
  });

  it('B. resolveStatusDoT determines correct tick damage and damage types', () => {
    const venenoLeve = resolveStatusDoT({ statusElementId: 'veneno_leve', tier: 'leve' });
    expect(venenoLeve).toEqual({ tickDamage: 2, damageType: 'acido' });

    const venenoGrave = resolveStatusDoT({ statusElementId: 'core.status.veneno', tier: 'grave' });
    expect(venenoGrave).toEqual({ tickDamage: 7, damageType: 'acido' });

    const quemaduraLeve = resolveStatusDoT({ statusElementId: 'quemadura_leve' });
    expect(quemaduraLeve).toEqual({ tickDamage: 2, damageType: 'fuego' });

    const electrocutado = resolveStatusDoT({ statusElementId: 'electrocutado' });
    expect(electrocutado).toEqual({ tickDamage: 4, damageType: 'electrico' });
  });

  it('C. advanceTurn automatically expires statuses whose duration has ended', () => {
    const encounter = createEncounterRuntimeState(1);
    encounter.participants['hero'] = {
      entityId: 'hero',
      currentTurn: 1,
      usageCounters: {},
      pendingModifiers: [],
      activeTimedEffects: [],
      activeCounters: {},
    } as any;

    const world: Record<string, any> = {
      hero: {
        id: 'hero',
        name: 'Héroe',
        statuses: [
          { statusElementId: 'core.status.stunned', expiresAt: 1 }, // Expires when next turn > 1
          { statusElementId: 'core.status.veneno', expiresAt: 3 },  // Valid until turn 3
        ],
        resources: { SA: { current: 20, max: 20 }, ES: { current: 30, max: 30 } },
      },
    };

    const nextEncounter = advanceTurn(encounter, undefined, world);
    expect(nextEncounter.turn).toBe(2);

    // Turn is now 2: stunned (expiresAt 1) should be dropped; veneno (expiresAt 3) should remain!
    const heroStatuses = world.hero.statuses;
    expect(heroStatuses.some((s: any) => s.statusElementId === 'core.status.stunned')).toBe(false);
    expect(heroStatuses.some((s: any) => s.statusElementId === 'core.status.veneno')).toBe(true);
  });

  it('D. advanceTurn applies DoT damage tick for active status on turn start', () => {
    const encounter = createEncounterRuntimeState(1);
    encounter.participants['target'] = {
      entityId: 'target',
      currentTurn: 1,
      usageCounters: {},
      pendingModifiers: [],
      activeTimedEffects: [],
      activeCounters: {},
    } as any;

    const world: Record<string, any> = {
      target: {
        id: 'target',
        name: 'Objetivo',
        statuses: [
          { statusElementId: 'core.status.veneno', tier: 'grave', appliedAtTurn: 1, expiresAt: 4 },
        ],
        resources: { SA: { current: 20, max: 20 }, ES: { current: 30, max: 30 } },
      },
    };

    // Advancing from turn 1 to turn 2: appliedAtTurn is 1, participant turn becomes 2
    // DoT tick for Veneno Grave (7 damage) should be subtracted from Health (SA)
    advanceTurn(encounter, undefined, world);
    expect(world.target.resources.SA.current).toBe(13); // 20 - 7 = 13
  });

  it('E. status_remove by severity tier cures only matching statuses in combat execution', () => {
    const world: Record<string, any> = {
      healer: {
        id: 'healer',
        statuses: [],
        resources: { SA: { current: 20, max: 20 }, ES: { current: 30, max: 30 } },
      },
      patient: {
        id: 'patient',
        statuses: [
          { statusElementId: 'veneno_leve', tier: 'leve' },
          { statusElementId: 'quemadura_grave', tier: 'grave' },
        ],
        resources: { SA: { current: 15, max: 20 }, ES: { current: 20, max: 30 } },
      },
    };

    const encounter = createEncounterRuntimeState(1);

    // Curing LEVE statuses only
    const result = executeMechanicalBehavior({
      behavior: {
        id: 'cure_light',
        mode: 'active',
        target: { type: 'character' },
        conditions: [],
        effects: [
          {
            id: 'eff_cure_leve',
            type: 'status_remove',
            statusElementId: 'leve',
          },
        ],
      } as any,
      sourceEntityId: 'healer',
      targetEntityId: 'patient',
      world,
      encounter,
    });

    expect(result.success).toBe(true);
    const updatedPatient = result.newWorld.patient;

    // veneno_leve (leve) should be cured, quemadura_grave (grave) should remain!
    expect(updatedPatient.statuses.some((s: any) => s.statusElementId === 'veneno_leve')).toBe(false);
    expect(updatedPatient.statuses.some((s: any) => s.statusElementId === 'quemadura_grave')).toBe(true);
  });

  it('F. describeMechanicalEffect humanizes status_apply and status_remove accurately', () => {
    const applyDesc = describeMechanicalEffect({
      type: 'status_apply',
      statusElementId: 'core.status.stunned',
      turns: 2,
    } as any);
    expect(applyDesc.text).toBe('Aplica Aturdido durante 2 turnos');

    const removeAllDesc = describeMechanicalEffect({
      type: 'status_remove',
      statusElementId: 'all',
    } as any);
    expect(removeAllDesc.text).toBe('Cura o retira todos los estados alterados');

    const removeLeveDesc = describeMechanicalEffect({
      type: 'status_remove',
      statusElementId: 'leve',
    } as any);
    expect(removeLeveDesc.text).toBe('Cura o retira cualquier estado alterado leve');

    const removeAturdidoDesc = describeMechanicalEffect({
      type: 'status_remove',
      statusElementId: 'aturdido',
    } as any);
    expect(removeAturdidoDesc.text).toBe('Retira el estado de aturdido o conmoción');
  });
});
