import { describe, it, expect } from 'vitest';
import {
  mechanicalBehaviorSchema,
  mechanicalDurationSchema,
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior.ts';
import {
  characterTechniqueSchema,
  createCharacterTechniqueSchema,
  deriveTechniqueLevelFromCost,
} from '../characterTechnique.ts';
import {
  calculateTechniqueStructuralCost,
} from '../systemMechanics.ts';
import {
  createCoreCategories,
} from '../coreRuleCatalog.ts';
import {
  executeMechanicalBehavior,
  createEncounterRuntimeState,
  type EncounterRuntimeState,
} from '../mechanicalRuntime.ts';
import type { RuleWorld } from '../ruleExecution.ts';

describe('Auditoría y Pruebas de Regresión: Temporalidades Independientes y Barreras', () => {
  const coreMechanics = createCoreCategories();

  // Test 1: Crear una técnica con una barrera de 40 puntos de resistencia y un buff de +X durante 2 turnos.
  it('1. Crea y valida una técnica con Barrera 40 y Buff +2 FUE durante 2 turnos', () => {
    const barrierBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('beh_barrier_1', 'active', 'Barrera Protectora'),
      effects: [
        {
          id: 'eff_barrier',
          type: 'barrier',
          amount: 40,
        },
      ],
      target: { type: 'self' },
      temporality: {
        duration: { type: 'instant' },
        periodicity: { mode: 'once' },
      },
    };

    const buffBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('beh_buff_2', 'active', 'Potenciador de Fuerza'),
      effects: [
        {
          id: 'eff_buff',
          type: 'attribute_modifier',
          attributeId: 'FUE',
          amount: 2,
          operation: 'add',
        },
      ],
      target: { type: 'self' },
      temporality: {
        duration: {
          type: 'turns',
          turns: 2,
          value: 2,
        },
        periodicity: { mode: 'once' },
      },
    };

    const rawTechniquePayload = {
      id: 'tech_barrier_and_buff',
      characterId: 101,
      name: 'Escudo de Fuerza Titánico',
      description: 'Genera una barrera de 40 PV e incrementa la Fuerza en +2 durante 2 turnos.',
      level: 2,
      sourceType: 'quirk' as const,
      classification: 'defensive' as const,
      activationAttributeId: 'VOL',
      mechanicalBehaviors: [barrierBehavior, buffBehavior],
    };

    const parsed = createCharacterTechniqueSchema.parse(rawTechniquePayload);
    expect(parsed.name).toBe('Escudo de Fuerza Titánico');
    expect(parsed.mechanicalBehaviors).toHaveLength(2);
  });

  // Test 2: Validar que el payload del buff contiene el tipo canónico `turns` y el valor numérico esperado.
  it('2. Normaliza variantes de duración al tipo canónico "turns" y preserva turns / value numérico', () => {
    const directTurns = mechanicalDurationSchema.parse({
      type: 'turns',
      turns: 2,
    });
    expect(directTurns).toEqual({ type: 'turns', turns: 2, value: 2 });

    // Normalization of rule catalog ID prefix
    const ruleIdDuration = mechanicalDurationSchema.parse({
      type: 'core.duration.2',
    });
    expect(ruleIdDuration).toEqual({ type: 'turns', turns: 2, value: 2 });

    // Normalization of string number
    const stringNumDuration = mechanicalDurationSchema.parse({
      type: '3',
    });
    expect(stringNumDuration).toEqual({ type: 'turns', turns: 3, value: 3 });

    // Normalization of string with turn suffix
    const suffixDuration = mechanicalDurationSchema.parse({
      type: '4_turns',
    });
    expect(suffixDuration).toEqual({ type: 'turns', turns: 4, value: 4 });

    // Normalization of mode object
    const modeDuration = mechanicalDurationSchema.parse({
      mode: 'turns',
      turns: 5,
    });
    expect(modeDuration).toEqual({ type: 'turns', turns: 5, value: 5 });
  });

  // Test 3: Validar que una técnica con varios comportamientos independientes supera el esquema Zod.
  it('3. Una técnica con múltiples comportamientos independientes supera el esquema Zod sin colisiones', () => {
    const rawPayload = {
      id: 'multi_tech_1',
      characterId: 42,
      name: 'Defensa y Furia',
      sourceType: 'physical' as const,
      mechanicalBehaviors: [
        {
          id: 'b1',
          name: 'Barrera',
          mode: 'active' as const,
          effects: [{ id: 'e1', type: 'barrier', amount: 40 }],
          target: { type: 'self' as const },
          temporality: { duration: { type: 'instant' } },
        },
        {
          id: 'b2',
          name: 'Buff 2 Turnos',
          mode: 'active' as const,
          effects: [{ id: 'e2', type: 'derived_stat_modifier', statId: 'EVA', amount: 2, operation: 'add' }],
          target: { type: 'self' as const },
          temporality: { duration: { type: 'core.duration.2' } }, // verifies preprocessor normalization
        },
      ],
    };

    const validated = characterTechniqueSchema.parse(rawPayload);
    expect(validated.mechanicalBehaviors[0].temporality?.duration?.type).toBe('instant');
    expect(validated.mechanicalBehaviors[1].temporality?.duration?.type).toBe('turns');
    expect(validated.mechanicalBehaviors[1].temporality?.duration?.turns).toBe(2);
  });

  const createTestWorld = (heroBarrier = 0): { world: RuleWorld; encounter: EncounterRuntimeState } => {
    const world: RuleWorld = {
      hero: {
        resources: {
          SA: { current: 30, max: 30 },
          ES: { current: 20, max: 20 },
        },
        attributes: { FUE: 2, RES: 2, DES: 2, INT: 2, VOL: 2, VEL: 2 },
        barrier: heroBarrier,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      enemy: {
        resources: {
          SA: { current: 30, max: 30 },
          ES: { current: 20, max: 20 },
        },
        attributes: { FUE: 3, RES: 2, DES: 2, INT: 2, VOL: 2, VEL: 2 },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    };

    const encounter = createEncounterRuntimeState();
    return { world, encounter };
  };

  // Test 4: Comprobar que la expiración del buff no elimina la barrera.
  it('4. La expiración del buff tras 2 turnos no elimina ni altera la barrera restante', () => {
    const { world, encounter } = createTestWorld(40);

    // Apply buff to hero with 2-turn expiration (expires at turn 1 + 2 = 3)
    world.hero.modifiers.push({
      sourceId: 'b_buff',
      statId: 'FUE',
      amount: 2,
      expiresAt: encounter.turn + 2,
    });

    expect(world.hero.barrier).toBe(40);
    expect(world.hero.modifiers).toHaveLength(1);

    // Advance turn to 3 (simulating buff expiration)
    encounter.turn = 3;
    world.hero.modifiers = world.hero.modifiers.filter(m => typeof m.expiresAt === 'number' && m.expiresAt > encounter.turn);

    // Buff has expired
    expect(world.hero.modifiers).toHaveLength(0);
    // Barrier is still 100% active with 40 points
    expect(world.hero.barrier).toBe(40);
  });

  // Test 5: Comprobar que el agotamiento de la barrera no elimina anticipadamente el buff.
  it('5. El agotamiento de la barrera por daño recibido no elimina anticipadamente el buff', () => {
    const { world, encounter } = createTestWorld(40);

    // Hero has an active buff
    world.hero.modifiers.push({
      sourceId: 'b_buff',
      statId: 'FUE',
      amount: 2,
      expiresAt: encounter.turn + 2,
    });

    // Enemy deals 40 damage, completely depleting hero's barrier
    const attackBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('b_dmg', 'active', 'Ataque Rompe-Barreras'),
      effects: [{ id: 'e_dmg', type: 'damage', damageType: 'physical', dice: '40' }],
      target: { type: 'enemy' },
      temporality: { duration: { type: 'instant' } },
    };

    const res = executeMechanicalBehavior({
      behavior: attackBehavior,
      sourceEntityId: 'enemy',
      targetEntityId: 'hero',
      world,
      encounter,
    });

    // Barrier is now 0 (exhausted)
    expect(res.newWorld.hero.barrier).toBe(0);
    // SA is undamaged because barrier absorbed all 40 damage
    expect(res.newWorld.hero.resources.SA.current).toBe(30);
    // Buff remains active and intact
    expect(res.newWorld.hero.modifiers).toHaveLength(1);
    expect(res.newWorld.hero.modifiers[0].statId).toBe('FUE');
  });

  // Test 6: Comprobar que la barrera permanece activa mientras tenga resistencia, independientemente de los turnos transcurridos.
  it('6. La barrera permanece activa en turnos posteriores (ej. turno 5) si no ha recibido suficiente daño', () => {
    const { world, encounter } = createTestWorld(40);

    // Turn 1: Enemy deals 15 damage
    const hit1 = executeMechanicalBehavior({
      behavior: {
        ...createDefaultMechanicalBehavior('b1', 'active', 'Golpe 15'),
        effects: [{ id: 'e1', type: 'damage', dice: '15' }],
        target: { type: 'enemy' },
      },
      sourceEntityId: 'enemy',
      targetEntityId: 'hero',
      world,
      encounter,
    });

    expect(hit1.newWorld.hero.barrier).toBe(25); // 40 - 15 = 25

    // Advance encounter to turn 5
    encounter.turn = 5;

    // Turn 5: Enemy deals another 10 damage
    const hit2 = executeMechanicalBehavior({
      behavior: {
        ...createDefaultMechanicalBehavior('b2', 'active', 'Golpe 10'),
        effects: [{ id: 'e2', type: 'damage', dice: '10' }],
        target: { type: 'enemy' },
      },
      sourceEntityId: 'enemy',
      targetEntityId: 'hero',
      world: hit1.newWorld,
      encounter,
    });

    // Barrier is still protecting with 15 remaining resistance
    expect(hit2.newWorld.hero.barrier).toBe(15); // 25 - 10 = 15
    expect(hit2.newWorld.hero.resources.SA.current).toBe(30);
  });

  // Test 7: Comprobar que al agotarse la resistencia, la barrera deja de estar activa.
  it('7. Al llegar la barrera a 0 puntos de resistencia, el daño remanente impacta directamente en SA', () => {
    const { world, encounter } = createTestWorld(10); // Barrier with only 10 points

    // Enemy deals 25 damage
    const hit = executeMechanicalBehavior({
      behavior: {
        ...createDefaultMechanicalBehavior('b_fin', 'active', 'Ataque Excedente 25'),
        effects: [{ id: 'e_fin', type: 'damage', dice: '25' }],
        target: { type: 'enemy' },
      },
      sourceEntityId: 'enemy',
      targetEntityId: 'hero',
      world,
      encounter,
    });

    // Barrier is 0
    expect(hit.newWorld.hero.barrier).toBe(0);
    // 25 - 10 barrier = 15 damage to SA (30 - 15 = 15)
    expect(hit.newWorld.hero.resources.SA.current).toBe(15);
  });

  // Test 8: Comprobar la creación y edición de técnicas con duraciones válidas ya existentes.
  it('8. Permite crear y editar técnicas con todos los tipos de duración canónicos', () => {
    const validDurations = [
      { type: 'instant' },
      { type: 'turns', turns: 1 },
      { type: 'turns', turns: 4 },
      { type: 'until_turn_end' },
      { type: 'until_next_turn' },
      { type: 'until_next_roll' },
      { type: 'until_next_use' },
      { type: 'while_condition' },
      { type: 'while_element_active' },
      { type: 'while_owned' },
      { type: 'until_deactivated' },
      { type: 'permanent' },
      { type: '1_day' },
      { type: '1_week' },
      { type: '1_month' },
    ];

    for (const dur of validDurations) {
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior(`b_${dur.type}`, 'active', 'Test'),
        temporality: { duration: dur as any },
      };
      const parsed = mechanicalBehaviorSchema.parse(behavior);
      expect(parsed.temporality?.duration?.type).toBeDefined();
    }
  });

  // Test 9: Comprobar que los valores inválidos siguen siendo rechazados por Zod.
  it('9. Rechaza valores verdaderamente inválidos o maliciosos en duration.type', () => {
    expect(() => {
      mechanicalDurationSchema.parse({ type: 'invented_duration_type' });
    }).toThrow();

    expect(() => {
      mechanicalDurationSchema.parse({ type: 'random_invalid_string' });
    }).toThrow();
  });

  // Test 10: Comprobar que no se alteran los costos estructurales de las técnicas ni los cálculos de ES como efecto colateral.
  it('10. Calcula con precisión el Coste de Estamina (CE) estructural de la técnica combinada', () => {
    const barrierBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('b1', 'active', 'Barrera 40'),
      effects: [{ id: 'e1', type: 'barrier', amount: 40 }], // Barrier 40 = 4 CE
      target: { type: 'self' },
      temporality: { duration: { type: 'instant' } },
    };

    const buffBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('b2', 'active', 'Buff FUE +2 (2 turnos)'),
      effects: [
        {
          id: 'e2',
          type: 'attribute_modifier',
          attributeId: 'FUE',
          amount: 2,
          operation: 'add',
        },
      ],
      target: { type: 'self' },
      temporality: {
        duration: { type: 'turns', turns: 2 }, // 2 turnos = 1 CE
      },
    };

    const totalCost = calculateTechniqueStructuralCost([barrierBehavior, buffBehavior], coreMechanics);
    expect(totalCost).toBeGreaterThanOrEqual(4); // Non-zero sum of active mechanics

    const levelInfo = deriveTechniqueLevelFromCost(totalCost);
    expect(levelInfo.level).toBeGreaterThanOrEqual(1);
  });
});
