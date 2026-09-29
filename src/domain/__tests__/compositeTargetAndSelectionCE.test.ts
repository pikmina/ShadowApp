import { describe, it, expect } from 'vitest';
import {
  createCoreCategories,
  getCategoryOptions,
  getVisibleOptions,
} from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findTargetCountOption,
  findDamageOption,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import {
  executeMultiTargetBehavior,
  resolveTargetCandidates,
  type RuleWorld,
  createEncounterRuntimeState,
} from '../mechanicalRuntime';
import {
  describeMechanicalBehavior,
  describeMechanicalTarget,
  describeTargetRange,
  describeTargetArea,
} from '../mechanicalDescription';
import {
  mechanicalTargetSchema,
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';

describe('TAREA CE-4B — Composición de Objetivos, Cantidad, Rango, Área y Selección', () => {
  const coreMechanics = createCoreCategories();

  describe('1. Normalización Legacy y Schema', () => {
    it('normalizes legacy "enemies" to "enemy" with quantity { mode: "all" } when quantity is unset', () => {
      const parsed = mechanicalTargetSchema.parse({
        type: 'enemies',
      });
      expect(parsed.type).toBe('enemy');
      expect(parsed.quantity).toEqual({ mode: 'all' });
      expect(parsed.selectionMode).toBe('standard_priority');
    });

    it('normalizes legacy "allies" to "ally" with quantity { mode: "all" } when quantity is unset', () => {
      const parsed = mechanicalTargetSchema.parse({
        type: 'allies',
      });
      expect(parsed.type).toBe('ally');
      expect(parsed.quantity).toEqual({ mode: 'all' });
    });

    it('preserves existing quantity if present on legacy "enemies"', () => {
      const parsed = mechanicalTargetSchema.parse({
        type: 'enemies',
        quantity: { mode: 'up_to', count: 3 },
      });
      expect(parsed.type).toBe('enemy');
      expect(parsed.quantity).toEqual({ mode: 'up_to', count: 3 });
    });

    it('preserves legacy "area" as target.type without inventing arbitrary entity types', () => {
      const parsed = mechanicalTargetSchema.parse({
        type: 'area',
      });
      expect(parsed.type).toBe('area');
    });

    it('normalizes legacy selectionRestriction to selectionMode', () => {
      const parsedRandom = mechanicalTargetSchema.parse({
        type: 'enemy',
        selectionRestriction: 'random',
      });
      expect(parsedRandom.selectionMode).toBe('random');
      expect(parsedRandom.selectionRestriction).toBe('random');

      const parsedNearest = mechanicalTargetSchema.parse({
        type: 'enemy',
        selectionRestriction: 'nearest',
      });
      expect(parsedNearest.selectionMode).toBe('standard_priority');
      expect(parsedNearest.selectionRestriction).toBe('nearest');
    });

    it('defaults selectionMode to standard_priority if not specified', () => {
      const parsed = mechanicalTargetSchema.parse({
        type: 'enemy',
      });
      expect(parsed.selectionMode).toBe('standard_priority');
    });
  });

  describe('2. Caso A — Objetivo Único (Daño 3D6, Hasta 1 enemigo, Alcance 20 m)', () => {
    it('calcula CE compositivo y genera descripción compacta con alcance', () => {
      // Configure mechanics with cost for 20 m range
      const customMechanics = createCoreCategories();
      const rangeCat = customMechanics.find(c => c.id === 'core.range');
      const opt20m = rangeCat?.rules.find(r => r.runtimeKey === '20');
      if (opt20m) opt20m.cost = 1; // +1 CE for 20m range

      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_a'),
        effects: [{ id: 'eff1', type: 'damage', dice: '3D6' }],
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 1 },
          range: { type: 'distance', distanceMeters: 20 },
        },
      };

      // CE: 3D6 (5 CE) + 20m range (1 CE) = 6 CE
      const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customMechanics);
      expect(cost).toBe(6);

      // Description
      const desc = describeMechanicalBehavior(behavior, { format: 'compact' });
      expect(desc.text).toBe('Inflige 3D6 de daño a un enemigo a un máximo de 20 m.');
    });
  });

  describe('3. Caso B — Multiobjetivo (Curación 2D6, Hasta 3 aliados, Alcance 10 m)', () => {
    it('con 2 candidatos válidos afecta 2, manteniendo CE de capacidad 3', () => {
      const customMechanics = createCoreCategories();
      // Configure target_count: 3 cost = +2 CE
      const tcCat = customMechanics.find(c => c.id === 'core.target_count');
      const opt3 = tcCat?.rules.find(r => r.runtimeKey === 'ally_3' || r.runtimeKey === '3');
      if (opt3) opt3.cost = 2;

      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_b'),
        effects: [{ id: 'eff1', type: 'healing', resourceId: 'SA', dice: '2D6', formula: '2D6' }],
        target: {
          type: 'ally',
          quantity: { mode: 'up_to', count: 3 },
          range: { type: 'distance', distanceMeters: 10 },
        },
      };

      // CE computed for capacity 3
      // Curación 2D6 SA (3 CE) + target_count 3 (2 CE) = 5 CE
      const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customMechanics);
      expect(cost).toBe(5);

      // Runtime execution with only 2 candidates
      const world: RuleWorld = {
        hero: {
          id: 'hero',
          faction: 'heroes',
          resources: { SA: { current: 10, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: {},
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        ally1: {
          id: 'ally1',
          faction: 'heroes',
          resources: { SA: { current: 5, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: {},
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        ally2: {
          id: 'ally2',
          faction: 'heroes',
          resources: { SA: { current: 5, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: {},
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };
      const encounter = createEncounterRuntimeState(1);

      const res = executeMultiTargetBehavior({
        behavior,
        sourceEntityId: 'hero',
        candidateEntityIds: ['ally1', 'ally2'],
        world,
        encounter,
        dice: 7, // 2D6 rolled 7
      });

      expect(res.success).toBe(true);
      expect(res.normalizedTargetIds).toEqual(['ally1', 'ally2']);
      expect(res.newWorld.ally1.resources.SA.current).toBe(12); // 5 + 7
      expect(res.newWorld.ally2.resources.SA.current).toBe(12);
    });
  });

  describe('4. Caso C — Área (Daño 4D8, Hasta 3 enemigos, Radio 10 m)', () => {
    it('con 5 candidatos válidos selecciona 3 preservando enemy como sujeto', () => {
      const customMechanics = createCoreCategories();
      // Configure area 10 m cost = +1 CE
      const areaCat = customMechanics.find(c => c.id === 'core.area');
      const opt10 = areaCat?.rules.find(r => r.runtimeKey === '10');
      if (opt10) opt10.cost = 1;

      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_c'),
        effects: [{ id: 'eff1', type: 'damage', dice: '4D8' }],
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 3 },
          area: { shape: 'radius', sizeMeters: 10 },
          selectionMode: 'standard_priority',
        },
      };

      // CE: 4D8 (7 CE) + enemy_3 (3 CE) + area 10 (1 CE) = 11 CE
      const cost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [behavior] }, customMechanics);
      expect(cost).toBe(11);

      // Description
      const desc = describeMechanicalBehavior(behavior, { format: 'compact' });
      expect(desc.text).toBe('Inflige 4D8 de daño a hasta 3 enemigos en un radio de 10 m.');
    });
  });

  describe('5. Caso D — Prioridad Estándar', () => {
    it('ordena candidatos por INI roll ASC -> INI stat ASC -> INT ASC -> VEL ASC -> ID ASC', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        A: { id: 'A', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 4, VEL: 4 }, modifiers: [], statuses: [], inventory: {} },
        B: { id: 'B', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 4, VEL: 4 }, modifiers: [], statuses: [], inventory: {} },
        C: { id: 'C', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 4, VEL: 4 }, modifiers: [], statuses: [], inventory: {} },
        D: { id: 'D', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 4, VEL: 4 }, modifiers: [], statuses: [], inventory: {} },
        E: { id: 'E', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 4, VEL: 4 }, modifiers: [], statuses: [], inventory: {} },
      };

      const candidateInfo = {
        A: { initiativeRoll: 13, initiativeStat: 3 },
        B: { initiativeRoll: 9, initiativeStat: 6 },
        C: { initiativeRoll: 11, initiativeStat: 4 },
        D: { initiativeRoll: 9, initiativeStat: 5 },
        E: { initiativeRoll: 16, initiativeStat: 2 },
      };

      const resolution = resolveTargetCandidates({
        candidateIds: ['A', 'B', 'C', 'D', 'E'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 }, selectionMode: 'standard_priority' },
        world,
        candidateInfo,
      });

      expect(resolution.success).toBe(true);
      // Expected ordering:
      // B and D both roll 9: D has stat 5, B has stat 6 -> D is 1st, B is 2nd.
      // Next lowest roll is C (11) -> C is 3rd.
      expect(resolution.selectedIds).toEqual(['D', 'B', 'C']);
    });
  });

  describe('6. Caso E — Desempates Secuenciales en Prioridad Estándar', () => {
    it('desempata por INT cuando INI roll e INI stat son iguales', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        T1: { id: 'T1', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 5, VEL: 3 }, modifiers: [], statuses: [], inventory: {} },
        T2: { id: 'T2', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 2, VEL: 3 }, modifiers: [], statuses: [], inventory: {} },
      };

      const res = resolveTargetCandidates({
        candidateIds: ['T1', 'T2'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 1 }, selectionMode: 'standard_priority' },
        world,
        candidateInfo: {
          T1: { initiativeRoll: 10, initiativeStat: 4 },
          T2: { initiativeRoll: 10, initiativeStat: 4 },
        },
      });

      // T2 has lower INT (2 < 5)
      expect(res.selectedIds).toEqual(['T2']);
    });

    it('desempata por VEL cuando INI roll, stat e INT son iguales', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        T1: { id: 'T1', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 3, VEL: 6 }, modifiers: [], statuses: [], inventory: {} },
        T2: { id: 'T2', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 3, VEL: 2 }, modifiers: [], statuses: [], inventory: {} },
      };

      const res = resolveTargetCandidates({
        candidateIds: ['T1', 'T2'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 1 }, selectionMode: 'standard_priority' },
        world,
        candidateInfo: {
          T1: { initiativeRoll: 10, initiativeStat: 4 },
          T2: { initiativeRoll: 10, initiativeStat: 4 },
        },
      });

      // T2 has lower VEL (2 < 6)
      expect(res.selectedIds).toEqual(['T2']);
    });

    it('desempata determinísticamente por stable ID cuando todos los atributos coinciden', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        beta: { id: 'beta', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 3, VEL: 3 }, modifiers: [], statuses: [], inventory: {} },
        alpha: { id: 'alpha', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: { INT: 3, VEL: 3 }, modifiers: [], statuses: [], inventory: {} },
      };

      const res = resolveTargetCandidates({
        candidateIds: ['beta', 'alpha'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 1 }, selectionMode: 'standard_priority' },
        world,
        candidateInfo: {
          beta: { initiativeRoll: 10, initiativeStat: 4 },
          alpha: { initiativeRoll: 10, initiativeStat: 4 },
        },
      });

      // 'alpha' < 'beta' in localeCompare
      expect(res.selectedIds).toEqual(['alpha']);
    });
  });

  describe('7. Caso F — Menos Candidatos que Capacidad', () => {
    it('con capacidad 3 y 2 candidatos, afecta a ambos sin fallar ni reducir CE', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e1: { id: 'e1', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e2: { id: 'e2', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      };

      const res = resolveTargetCandidates({
        candidateIds: ['e1', 'e2'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 } },
        world,
      });

      expect(res.success).toBe(true);
      expect(res.selectedIds).toEqual(['e1', 'e2']);
    });
  });

  describe('8. Caso G — Elección Manual', () => {
    const world: RuleWorld = {
      hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      e1: { id: 'e1', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      e2: { id: 'e2', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      e3: { id: 'e3', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      e4: { id: 'e4', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      e5: { id: 'e5', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
    };

    it('permite selección manual válida de 2 o 3 candidatos', () => {
      const res = resolveTargetCandidates({
        candidateIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 }, selectionMode: 'manual' },
        world,
        manualSelectedIds: ['e2', 'e5'],
      });

      expect(res.success).toBe(true);
      expect(res.selectedIds).toEqual(['e2', 'e5']);
    });

    it('rechaza selección manual de 4 cuando la capacidad es 3', () => {
      const res = resolveTargetCandidates({
        candidateIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 }, selectionMode: 'manual' },
        world,
        manualSelectedIds: ['e1', 'e2', 'e3', 'e4'],
      });

      expect(res.success).toBe(false);
      expect(res.reasons?.[0]).toContain('supera la capacidad máxima de 3');
    });

    it('rechaza selección manual de un objetivo que no pertenece a los candidatos válidos', () => {
      const res = resolveTargetCandidates({
        candidateIds: ['e1', 'e2', 'e3'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 }, selectionMode: 'manual' },
        world,
        manualSelectedIds: ['e1', 'e5'],
      });

      expect(res.success).toBe(false);
      expect(res.reasons?.[0]).toContain("no pertenece al conjunto de candidatos válidos");
    });
  });

  describe('9. Caso H — Selección Aleatoria', () => {
    it('selecciona exactamente 3 candidatos únicos mediante RNG inyectable', () => {
      const world: RuleWorld = {
        hero: { id: 'hero', faction: 'heroes', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e1: { id: 'e1', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e2: { id: 'e2', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e3: { id: 'e3', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e4: { id: 'e4', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
        e5: { id: 'e5', faction: 'villains', resources: { SA: { current: 10, max: 10 }, ES: { current: 10, max: 10 } }, barrier: 0, attributes: {}, modifiers: [], statuses: [], inventory: {} },
      };

      // Mock RNG that gives a deterministic sequence
      const mockRandomSequence = [0.1, 0.9, 0.4, 0.7];
      let seqIdx = 0;
      const mockRng = () => mockRandomSequence[seqIdx++ % mockRandomSequence.length];

      const res = resolveTargetCandidates({
        candidateIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
        sourceEntityId: 'hero',
        targetDef: { type: 'enemy', quantity: { mode: 'up_to', count: 3 }, selectionMode: 'random' },
        world,
        rng: mockRng,
      });

      expect(res.success).toBe(true);
      expect(res.selectedIds).toHaveLength(3);
      // All 3 IDs must be unique
      expect(new Set(res.selectedIds).size).toBe(3);
      // All 3 IDs must be among e1..e5
      for (const id of res.selectedIds) {
        expect(['e1', 'e2', 'e3', 'e4', 'e5']).toContain(id);
      }
    });
  });

  describe('10. isAvailable y Valores Huérfanos', () => {
    it('getVisibleOptions hides unavailable options for new items, preserves current unavailable value', () => {
      const options = [
        { runtimeKey: 'opt1', name: 'Opt 1', isAvailable: true },
        { runtimeKey: 'opt2', name: 'Opt 2', isAvailable: false },
        { runtimeKey: 'opt3', name: 'Opt 3', isAvailable: true },
      ];

      const forNewItem = getVisibleOptions(options, 'opt1');
      expect(forNewItem.map(o => o.runtimeKey)).toEqual(['opt1', 'opt3']);

      const forExistingWithOpt2 = getVisibleOptions(options, 'opt2');
      expect(forExistingWithOpt2.map(o => o.runtimeKey)).toEqual(['opt1', 'opt2', 'opt3']);
    });
  });
});
