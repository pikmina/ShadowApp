import { describe, it, expect } from 'vitest';
import { describeMechanicalBehavior, describeMechanicalCondition, describeMechanicalResolution } from '../mechanicalDescription';
import { type MechanicalBehavior, createDefaultMechanicalBehavior, type MechanicalCondition } from '../mechanicalBehavior';
import { createCoreCategories } from '../coreRuleCatalog';
import { MECHANICAL_BEHAVIOR_GROUPS, getCategoryGroupKey } from '../../components/mechanics/UniversalRulesCatalog';

describe('Task: Natural Mechanical Description & Visual Catalog Grouping', () => {
  const coreMechanics = createCoreCategories();

  describe('Bloque A: Natural Mechanical Descriptions', () => {
    it('A.1 & A.3: Positiva con detalle: "Debe consumir algo" + "Sangre del objetivo" -> "Requiere consumir sangre del objetivo"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'consumption',
        description: 'Sangre del objetivo',
        negated: false,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('Requiere consumir sangre del objetivo');
      expect(res.warnings.length).toBe(0);
    });

    it('A.3: Positiva sin detalle: "Contacto visual" -> "Requiere contacto visual"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'visual_contact',
        negated: false,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('Requiere contacto visual');
    });

    it('A.3: Positiva sin detalle: "Contacto físico" -> "Requiere contacto físico"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'physical_contact',
        negated: false,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('Requiere contacto físico');
    });

    it('A.3: Positiva sin detalle: "Contacto auditivo" -> "Requiere contacto auditivo"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'auditory_contact',
        negated: false,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('Requiere contacto auditivo');
    });

    it('A.3: Positiva: "Debe hablar directamente al objetivo" -> "Requiere hablar directamente al objetivo"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'speak_directly',
        negated: false,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('Requiere hablar directamente al objetivo');
    });

    it('A.6: Negada: "Contacto visual" + negated: true -> "No requiere contacto visual"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'visual_contact',
        negated: true,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('No requiere contacto visual');
      expect(res.text).not.toContain('No (');
    });

    it('A.6: Negada con detalle: "Debe consumir algo" + "Sangre fresca" + negated: true -> "No requiere consumir sangre fresca"', () => {
      const cond: MechanicalCondition = {
        type: 'manual',
        signalId: 'consumption',
        description: 'Sangre fresca',
        negated: true,
      };

      const res = describeMechanicalCondition(cond, { mechanics: coreMechanics });
      expect(res.complete).toBe(true);
      expect(res.text).toBe('No requiere consumir sangre fresca');
    });

    it('A.7: RD derivado en la descripción para técnica de Soporte/Defensa', () => {
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('test_support'),
        effects: [
          {
            id: 'eff_trans',
            type: 'transformation',
            magnitude: { type: 'corporal', value: 1 },
          },
        ],
        conditions: [
          {
            type: 'manual',
            signalId: 'consumption',
            description: 'Sangre del objetivo',
            negated: false,
          },
        ],
        resolution: {
          type: 'rd',
          attribute: 'RES',
        },
        temporality: {
          duration: {
            type: 'turns',
            turns: 5,
          },
        },
        limitations: [
          {
            id: 'lim_cd',
            type: 'cooldown',
            turns: 2,
          },
        ],
      };

      // When rendered with classification: support and structuralCost: 2 (<= 3 -> RD 12 Normal)
      const descRes = describeMechanicalBehavior(behavior, {
        mechanics: coreMechanics,
        classification: 'support',
        structuralCost: 2,
      });

      expect(descRes.complete).toBe(true);
      expect(descRes.text).toContain('Transformación corporal.');
      expect(descRes.text).toContain('Requiere consumir sangre del objetivo.');
      expect(descRes.text).toContain('Superar RD 12 en RES.');
      expect(descRes.text).toContain('Durante 5 turnos.');
      expect(descRes.text).toContain('Tiempo de recarga: 2 turnos.');
    });

    it('A.7: RD derivado calcula correctamente según diferentes costes estructurales', () => {
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior('test_defensive'),
        resolution: {
          type: 'rd',
          attribute: 'AGI',
        },
      };

      // Cost 5 -> RD 16 (Complicado)
      const res5 = describeMechanicalBehavior(behavior, {
        mechanics: coreMechanics,
        classification: 'defensive',
        structuralCost: 5,
      });
      expect(res5.text).toContain('Superar RD 16 en AGI');

      // Cost 9 -> RD 20 (Difícil)
      const res9 = describeMechanicalBehavior(behavior, {
        mechanics: coreMechanics,
        classification: 'defensive',
        structuralCost: 9,
      });
      expect(res9.text).toContain('Superar RD 20 en AGI');
    });
  });

  describe('Bloque B: Visual Rules Catalog Grouping', () => {
    it('B.1: Clasifica adecuadamente las categorías Core en los 6 grupos de MechanicalBehavior', () => {
      const damageCat = coreMechanics.find(c => c.coreKey === 'damage')!;
      const triggerCat = coreMechanics.find(c => c.coreKey === 'trigger')!;
      const targetCat = coreMechanics.find(c => c.coreKey === 'target')!;
      const conditionCat = coreMechanics.find(c => c.coreKey === 'manual_condition')!;
      const cooldownCat = coreMechanics.find(c => c.coreKey === 'cooldown')!;
      const resolutionCat = coreMechanics.find(c => c.coreKey === 'resolution')!;

      expect(getCategoryGroupKey(damageCat)).toBe('effects');
      expect(getCategoryGroupKey(triggerCat)).toBe('activation');
      expect(getCategoryGroupKey(targetCat)).toBe('targeting');
      expect(getCategoryGroupKey(conditionCat)).toBe('conditions');
      expect(getCategoryGroupKey(cooldownCat)).toBe('temporality');
      expect(getCategoryGroupKey(resolutionCat)).toBe('resolution');
    });

    it('B.2: Clasifica categorías sin coreKey como "custom"', () => {
      const customCat = {
        id: 'cat_custom_123',
        name: 'Reglas de Clima',
        description: 'Efectos ambientales',
        logicalType: 'utility' as const,
        scope: { actions: true, objects: true, techniques: true },
        rules: [],
      };
      expect(getCategoryGroupKey(customCat)).toBe('custom');
    });

    it('B.3: Define los grupos con títulos e iconos semánticos', () => {
      expect(MECHANICAL_BEHAVIOR_GROUPS.length).toBe(9);
      const keys = MECHANICAL_BEHAVIOR_GROUPS.map(g => g.key);
      expect(keys).toEqual(['effects', 'consequences', 'caps', 'activation', 'targeting', 'conditions', 'temporality', 'resolution', 'custom']);
    });
  });
});
