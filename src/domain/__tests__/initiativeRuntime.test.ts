import { describe, it, expect } from 'vitest';
import {
  calculateBaseInitiative,
  calculateCombatInitiative,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  getActiveContinuousModifiers,
  type OwnedBehaviorEntry,
} from '../mechanicalRuntime';
import { SYSTEM_TRAITS } from '../systemTraits';
import { calculateDerivedStats } from '../../lib/characterValidation';
import type { RuleEntityState } from '../ruleExecution';
import { mechanicalBehaviorSchema } from '../mechanicalBehavior';

describe('Task 19 — Initiative Runtime & Reflejos Rápidos', () => {
  const quickReflexesTrait = SYSTEM_TRAITS.find((t) => t.id === 'core.trait.quick-reflexes')!;
  const quickReflexesBehavior = quickReflexesTrait.mechanicalBehaviors[0];

  const quickReflexesOwned: OwnedBehaviorEntry[] = [
    {
      elementId: 'core.trait.quick-reflexes',
      behavior: quickReflexesBehavior,
    },
  ];

  function createTestEntity(int: number = 4, vel: number = 4): RuleEntityState {
    return {
      id: 'hero',
      name: 'Hero',
      attributes: { INT: int, VEL: vel },
      resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } },
      barrier: 0,
      modifiers: [],
      statuses: [],
      inventory: {},
    };
  }

  // A — First turn
  it('A — First turn: applies +2 contextualModifier when encounter.turn is 1', () => {
    // INT 4, VEL 4 => baseIni = Floor(Floor((4+4)/2)/2) = 2
    const entity = createTestEntity(4, 4);
    const encounter = createEncounterRuntimeState(1);

    const result = calculateCombatInitiative({
      entity,
      ownedBehaviors: quickReflexesOwned,
      encounter,
      diceRoll: 0,
    });

    expect(result.baseIni).toBe(2);
    expect(result.contextualModifier).toBe(2);
    expect(result.total).toBe(4);
  });

  // B — Later turn
  it('B — Later turn: Reflejos Rápidos modifier is 0 when encounter.turn is 2+', () => {
    const entity = createTestEntity(4, 4);
    const encounter = createEncounterRuntimeState(2);

    const result = calculateCombatInitiative({
      entity,
      ownedBehaviors: quickReflexesOwned,
      encounter,
      diceRoll: 0,
    });

    expect(result.baseIni).toBe(2);
    expect(result.contextualModifier).toBe(0);
    expect(result.total).toBe(2);
  });

  // C — No Trait
  it('C — No Trait: modifier is 0 on turn 1 when Reflejos Rápidos is not equipped', () => {
    const entity = createTestEntity(4, 4);
    const encounter = createEncounterRuntimeState(1);

    const result = calculateCombatInitiative({
      entity,
      ownedBehaviors: [],
      encounter,
      diceRoll: 0,
    });

    expect(result.baseIni).toBe(2);
    expect(result.contextualModifier).toBe(0);
    expect(result.total).toBe(2);
  });

  // D — Static derived stats
  it('D — Static derived stats: Reflejos Rápidos does NOT permanently modify static sheet', () => {
    const profile = {
      INT: 4,
      VEL: 4,
      traits: ['quick-reflexes'],
    };

    const elements = [
      {
        id: 'quick-reflexes',
        name: 'Reflejos Rápidos',
        mechanicalBehaviors: [quickReflexesBehavior],
      },
    ];

    const stages = [{ name: 'Estudiante', baseHealth: 10, baseStamina: 10, baseDamage: '1D4' }];

    const derived = calculateDerivedStats(profile, stages, elements);

    // INT 4, VEL 4 => Floor(Floor((4+4)/2)/2) = 2
    // Static sheet MUST NOT include the +2 conditional bonus
    expect(derived.iniciativa).toBe(2);
  });

  // E — Generic behavior
  it('E — Generic behavior: arbitrary behavior with first_turn condition applies +1 on turn 1 and 0 on turn 2', () => {
    const genericOwned: OwnedBehaviorEntry[] = [
      {
        elementId: 'custom-element',
        behavior: mechanicalBehaviorSchema.parse({
          id: 'custom.tactical_read',
          mode: 'continuous',
          conditions: [{ type: 'manual', signalId: 'first_turn', description: 'Primer turno' }],
          effects: [{ id: 'custom.eff.ini', type: 'derived_stat_modifier', statId: 'ini', amount: 1, operation: 'add' }],
        }),
      },
    ];

    const entity = createTestEntity(4, 4);

    const resultTurn1 = calculateCombatInitiative({
      entity,
      ownedBehaviors: genericOwned,
      encounter: createEncounterRuntimeState(1),
    });
    expect(resultTurn1.contextualModifier).toBe(1);
    expect(resultTurn1.total).toBe(3);

    const resultTurn2 = calculateCombatInitiative({
      entity,
      ownedBehaviors: genericOwned,
      encounter: createEncounterRuntimeState(2),
    });
    expect(resultTurn2.contextualModifier).toBe(0);
    expect(resultTurn2.total).toBe(2);
  });

  // F — Multiple modifiers
  it('F — Multiple modifiers: Reflejos Rápidos (+2) and another active INI modifier (+1) stack to +3', () => {
    const multipleOwned: OwnedBehaviorEntry[] = [
      {
        elementId: 'core.trait.quick-reflexes',
        behavior: quickReflexesBehavior,
      },
      {
        elementId: 'gear.accelerator',
        behavior: mechanicalBehaviorSchema.parse({
          id: 'gear.accelerator.ini',
          mode: 'continuous',
          effects: [{ id: 'gear.eff.ini', type: 'derived_stat_modifier', statId: 'ini', amount: 1, operation: 'add' }],
        }),
      },
    ];

    const entity = createTestEntity(4, 4);
    const encounter = createEncounterRuntimeState(1);

    const result = calculateCombatInitiative({
      entity,
      ownedBehaviors: multipleOwned,
      encounter,
    });

    // baseIni = 2, contextualModifier = 2 (Reflejos Rápidos) + 1 (gear) = 3
    expect(result.baseIni).toBe(2);
    expect(result.contextualModifier).toBe(3);
    expect(result.total).toBe(5);
  });

  // G — Dice contribution
  it('G — Dice contribution: baseIni (2) + contextual (+2) + diceRoll (7) = total (11)', () => {
    const entity = createTestEntity(4, 4); // baseIni = 2
    const encounter = createEncounterRuntimeState(1);

    const result = calculateCombatInitiative({
      entity,
      ownedBehaviors: quickReflexesOwned,
      encounter,
      diceRoll: 7,
    });

    expect(result.baseIni).toBe(2);
    expect(result.contextualModifier).toBe(2);
    expect(result.diceRoll).toBe(7);
    expect(result.total).toBe(11);
  });

  // H — Explicit signal isolation
  it('H — Explicit signal isolation: encounter.turn === 1 does NOT globally inject first_turn into generic continuous modifier evaluation', () => {
    const entity = createTestEntity(4, 4);
    const participant = createParticipantRuntimeState('hero');

    // Calling generic getActiveContinuousModifiers directly without signals during encounter.turn === 1
    const genericEvaluation = getActiveContinuousModifiers(
      quickReflexesOwned,
      entity,
      participant,
      undefined,
      [] // Caller passes no signals
    );

    // Reflejos Rápidos requires 'first_turn'. Because signals is [], it must NOT be active
    const iniMods = genericEvaluation.derivedStatModifiers.filter(
      (m) => m.statId.toLowerCase() === 'ini'
    );
    expect(iniMods).toHaveLength(0);
  });
});
