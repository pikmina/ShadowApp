import { describe, it, expect } from 'vitest';
import {
  mechanicalTargetSchema,
  normalizeMechanicalTarget,
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';
import {
  calculateTechniqueStructuralCost,
} from '../systemMechanics';
import {
  createCoreCategories,
} from '../coreRuleCatalog';
import {
  describeMechanicalBehavior,
  describeMechanicalTarget,
} from '../mechanicalDescription';
import {
  resolveTargetCandidates,
  executeMultiTargetBehavior,
  createEncounterRuntimeState,
  type RuleWorld,
} from '../mechanicalRuntime';

describe('TAREA CE-4B.1 — INVARIANTE DE OBJETIVO «UNO MISMO»', () => {
  const coreMechanics = createCoreCategories();

  describe('A. Normalización de Target «self»', () => {
    it('canonicaliza un target self contaminado a { type: "self" } eliminando residuales', () => {
      const contaminated = {
        type: 'self',
        quantity: { mode: 'up_to', count: 3 },
        range: { type: 'distance', distanceMeters: 20 },
        area: { shape: 'radius', sizeMeters: 10 },
        selectionMode: 'manual',
        selectionRestriction: 'random',
      };

      const parsed = mechanicalTargetSchema.parse(contaminated);
      expect(parsed).toEqual({ type: 'self' });

      const normalized = normalizeMechanicalTarget(contaminated);
      expect(normalized).toEqual({ type: 'self' });
    });
  });

  describe('B. Idempotencia de Normalización', () => {
    it('normalizeMechanicalTarget es estrictamente idempotente', () => {
      const contaminated = {
        type: 'self',
        quantity: { mode: 'up_to', count: 5 },
        range: { type: 'contact' },
        area: { shape: 'radius', sizeMeters: 5 },
        selectionMode: 'random',
      };

      const norm1 = normalizeMechanicalTarget(contaminated);
      const norm2 = normalizeMechanicalTarget(norm1);

      expect(norm1).toEqual({ type: 'self' });
      expect(norm2).toEqual(norm1);
    });
  });

  describe('C. Cálculo de CE para «self»', () => {
    it('produce el mismo CE para self limpio y self contaminado con valores residuales', () => {
      const customMechanics = createCoreCategories();
      // Configure costs for range (10m = 1 CE) and target_count (3 = 2 CE)
      const tcCat = customMechanics.find(c => c.id === 'core.target_count');
      const opt3 = tcCat?.rules.find(r => r.runtimeKey === '3');
      if (opt3) opt3.cost = 2;

      const rangeCat = customMechanics.find(c => c.id === 'core.range');
      const opt10m = rangeCat?.rules.find(r => r.runtimeKey === '10');
      if (opt10m) opt10m.cost = 1;

      const cleanBehavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_clean'),
        effects: [{ id: 'eff1', type: 'healing', resourceId: 'SA', amount: 5 }],
        target: { type: 'self' },
      };

      const contaminatedBehavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_contaminated'),
        effects: [{ id: 'eff1', type: 'healing', resourceId: 'SA', amount: 5 }],
        target: {
          type: 'self',
          quantity: { mode: 'up_to', count: 3 },
          range: { type: 'distance', distanceMeters: 10 },
          area: { shape: 'radius', sizeMeters: 10 },
          selectionMode: 'manual',
        } as any,
      };

      const cleanCost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [cleanBehavior] }, customMechanics);
      const contaminatedCost = calculateTechniqueStructuralCost({ level: 1, mechanicalBehaviors: [contaminatedBehavior] }, customMechanics);

      expect(cleanCost).toBe(contaminatedCost);
    });
  });

  describe('D. Descripción Automática para «self»', () => {
    it('genera descripciones limpias sin referencias a cantidad, rango, área o selección', () => {
      const targetDesc = describeMechanicalTarget({
        type: 'self',
        quantity: { mode: 'up_to', count: 3 },
        range: { type: 'distance', distanceMeters: 10 },
        selectionMode: 'manual',
      } as any);

      expect(targetDesc.text).toBe('Uno mismo');

      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_self_desc'),
        effects: [{ id: 'eff1', type: 'barrier', amount: 5 }],
        target: {
          type: 'self',
          quantity: { mode: 'up_to', count: 3 },
          range: { type: 'distance', distanceMeters: 10 },
          area: { shape: 'radius', sizeMeters: 5 },
          selectionMode: 'manual',
        } as any,
      };

      const desc = describeMechanicalBehavior(behavior, { format: 'compact' });
      expect(desc.text).toBe('Otorga 5 puntos de Barrera.');
      expect(desc.text).not.toContain('Hasta');
      expect(desc.text).not.toContain('m');
      expect(desc.text).not.toContain('manual');
    });
  });

  describe('E. Runtime y Resolución de Objetivos para «self»', () => {
    it('devuelve exclusivamente al actor sin depender del conjunto de candidatos ni filtros', () => {
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
        enemy1: {
          id: 'enemy1',
          faction: 'villains',
          resources: { SA: { current: 10, max: 20 }, ES: { current: 10, max: 10 } },
          barrier: 0,
          attributes: {},
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const res = resolveTargetCandidates({
        candidateIds: ['enemy1', 'hero', 'unknown'],
        sourceEntityId: 'hero',
        targetDef: {
          type: 'self',
          quantity: { mode: 'up_to', count: 5 },
          selectionMode: 'random',
        } as any,
        world,
      });

      expect(res.success).toBe(true);
      expect(res.selectedIds).toEqual(['hero']);
    });
  });

  describe('F. Transición de Estado y Limpieza', () => {
    it('limpia residuales al pasar a self y no los resucita al volver a enemy', () => {
      // 1. Configured enemy target
      let target: any = {
        type: 'enemy',
        quantity: { mode: 'up_to', count: 3 },
        range: { type: 'distance', distanceMeters: 15 },
        area: { shape: 'radius', sizeMeters: 10 },
        selectionMode: 'manual',
      };

      // 2. User changes to self -> clean target
      target = normalizeMechanicalTarget({ type: 'self' });
      expect(target).toEqual({ type: 'self' });

      // 3. User changes back to enemy -> new clean target without old hidden values
      target = normalizeMechanicalTarget({ type: 'enemy' });
      expect(target.type).toBe('enemy');
      expect(target.quantity).toBeUndefined();
      expect(target.range).toBeUndefined();
      expect(target.area).toBeUndefined();
    });
  });

  describe('G. Regresión de Target Normal', () => {
    it('mantiene el funcionamiento completo de target multiobjetivo para enemy', () => {
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('tech_enemy'),
        effects: [{ id: 'eff1', type: 'damage', dice: '2D6' }],
        target: {
          type: 'enemy',
          quantity: { mode: 'up_to', count: 3 },
          range: { type: 'distance', distanceMeters: 10 },
          selectionMode: 'standard_priority',
        },
      };

      const parsed = mechanicalTargetSchema.parse(behavior.target);
      expect(parsed.type).toBe('enemy');
      expect(parsed.quantity).toEqual({ mode: 'up_to', count: 3 });
      expect(parsed.range).toEqual({ type: 'distance', distanceMeters: 10 });
      expect(parsed.selectionMode).toBe('standard_priority');

      const desc = describeMechanicalBehavior(behavior, { format: 'compact' });
      expect(desc.text).toContain('a hasta 3 enemigos');
      expect(desc.text).toContain('10 m');
    });
  });
});
