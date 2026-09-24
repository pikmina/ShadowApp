import { describe, it, expect } from 'vitest';
import {
  deriveTechniqueRollContract,
  getBehaviorDisplayName,
} from '../characterTechnique';
import type { MechanicalBehavior } from '../mechanicalBehavior';

describe('Tarea 33.2.2 — Eliminación de IDs técnicos de mensajes y validaciones', () => {
  // =========================================================================
  // 1. HELPER DE RESOLUCIÓN DE NOMBRE VISIBLE
  // =========================================================================
  describe('1. getBehaviorDisplayName helper', () => {
    it('A. returns behavior.name when valid and non-empty', () => {
      expect(getBehaviorDisplayName({ name: 'Ataque principal' }, 0)).toBe('Ataque principal');
      expect(getBehaviorDisplayName({ name: '  Corte Sombrío  ' }, 2)).toBe('Corte Sombrío');
    });

    it('B. returns "Comportamiento {index + 1}" when name is missing or empty and index is provided', () => {
      expect(getBehaviorDisplayName({ name: '' }, 0)).toBe('Comportamiento 1');
      expect(getBehaviorDisplayName({ name: '   ' }, 1)).toBe('Comportamiento 2');
      expect(getBehaviorDisplayName({ name: undefined }, 4)).toBe('Comportamiento 5');
      expect(getBehaviorDisplayName({}, 0)).toBe('Comportamiento 1');
    });

    it('C. returns "Este comportamiento" when name is missing and index is undefined or negative', () => {
      expect(getBehaviorDisplayName({ name: '' })).toBe('Este comportamiento');
      expect(getBehaviorDisplayName(undefined)).toBe('Este comportamiento');
      expect(getBehaviorDisplayName(null)).toBe('Este comportamiento');
      expect(getBehaviorDisplayName({ name: '' }, -1)).toBe('Este comportamiento');
    });
  });

  // =========================================================================
  // 2. CASO REPRODUCIDO DEL QA: behavior.id = "W8omDIk7"
  // =========================================================================
  describe('2. Caso reproducido de QA (W8omDIk7)', () => {
    it('A. behavior.id = "W8omDIk7" con name = "Comportamiento 1" NO muestra W8omDIk7 y muestra Comportamiento 1', () => {
      const behavior: MechanicalBehavior = {
        id: 'W8omDIk7',
        name: 'Comportamiento 1',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        trigger: { kind: 'none' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies' },
        limitations: [],
        resolution: { type: 'roll', attackType: 'physical' }, // Missing attribute
        effects: [
          {
            id: 'eff_1',
            type: 'damage',
            dice: '2D6',
            damageType: 'fisico',
          },
        ],
      };

      const contract = deriveTechniqueRollContract([behavior]);

      expect(contract.hasRoll).toBe(true);
      expect(contract.complete).toBe(false);
      expect(contract.warnings).toHaveLength(1);

      const warning = contract.warnings[0];
      // MUST contain human visible name
      expect(warning).toContain('Comportamiento 1');
      // MUST NOT contain internal technical ID
      expect(warning).not.toContain('W8omDIk7');
      // Exact expected text
      expect(warning).toBe(
        'El comportamiento "Comportamiento 1" requiere especificar un atributo para la tirada de resolución.'
      );
    });

    it('B. behavior.id = "W8omDIk7" con nombre explícito personalizado "Ráfaga de Viento"', () => {
      const behavior: MechanicalBehavior = {
        id: 'W8omDIk7',
        name: 'Ráfaga de Viento',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        trigger: { kind: 'none' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies' },
        limitations: [],
        resolution: { type: 'roll', attackType: 'physical' },
        effects: [
          {
            id: 'eff_1',
            type: 'damage',
            dice: '2D6',
            damageType: 'fisico',
          },
        ],
      };

      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.warnings).toContain(
        'El comportamiento "Ráfaga de Viento" requiere especificar un atributo para la tirada de resolución.'
      );
      expect(contract.warnings[0]).not.toContain('W8omDIk7');
    });

    it('C. behavior.id = "W8omDIk7" sin nombre (vacío/undefined)', () => {
      const behavior: MechanicalBehavior = {
        id: 'W8omDIk7',
        name: '',
        mode: 'active',
        activation: { actionType: 'action', timing: 'immediate', turns: 0, description: '' },
        trigger: { kind: 'none' },
        conditions: [],
        conditionLogic: 'all',
        target: { type: 'enemies' },
        limitations: [],
        resolution: { type: 'roll', attackType: 'physical' },
        effects: [
          {
            id: 'eff_1',
            type: 'damage',
            dice: '2D6',
            damageType: 'fisico',
          },
        ],
      };

      // In an array at index 0 -> "Comportamiento 1"
      const contract = deriveTechniqueRollContract([behavior]);
      expect(contract.warnings[0]).toBe(
        'El comportamiento "Comportamiento 1" requiere especificar un atributo para la tirada de resolución.'
      );
      expect(contract.warnings[0]).not.toContain('W8omDIk7');
    });
  });

  // =========================================================================
  // 3. AUDITORÍA DE MÚLTIPLES COMPORTAMIENTOS Y TIPOS DE ADVERTENCIA
  // =========================================================================
  describe('3. Auditoría exhaustiva de advertencias con IDs técnicos de fixtures', () => {
    const fixtureIds = [
      'W8omDIk7',
      'uuid_9834_abc_def',
      'GXSHW_BHV_12345',
      'TECHNICAL_ID_RANDOM',
      'eff_secret_id_99',
    ];

    it('A. Ningún ID técnico de fixture aparece en los warnings de missing attribute o missing attackType', () => {
      const b1: MechanicalBehavior = {
        id: fixtureIds[0],
        name: 'Impacto Ígneo',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        resolution: { type: 'roll', attackType: 'physical' }, // Missing attribute
        effects: [{ id: fixtureIds[4], type: 'damage', dice: '2D6', damageType: 'fisico' }],
      };

      const b2: MechanicalBehavior = {
        id: fixtureIds[1],
        name: '', // Unnamed, index 1 -> Comportamiento 2
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        resolution: { type: 'roll', attribute: 'DES' }, // Offensive with damage but missing attackType
        effects: [{ id: 'eff_2', type: 'damage', dice: '3D6' }],
      };

      const b3: MechanicalBehavior = {
        id: fixtureIds[2],
        name: 'Onda Psíquica',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        resolution: { type: 'roll', isExplicit: true }, // Explicit roll missing attribute & attackType
        effects: [{ id: 'eff_3', type: 'damage', dice: '1D6' }],
      };

      const contract = deriveTechniqueRollContract([b1, b2, b3]);
      expect(contract.warnings.length).toBeGreaterThanOrEqual(3);

      // Verify no technical ID leaks in any warning string
      for (const warning of contract.warnings) {
        for (const technicalId of fixtureIds) {
          expect(warning).not.toContain(technicalId);
        }
      }

      // Check the exact friendly messages
      expect(contract.warnings).toContain(
        'El comportamiento "Impacto Ígneo" requiere especificar un atributo para la tirada de resolución.'
      );
      expect(contract.warnings).toContain(
        'El comportamiento "Comportamiento 2" de ataque requiere clasificar el tipo de ataque (Físico o Mental).'
      );
      expect(contract.warnings).toContain(
        'El comportamiento "Onda Psíquica" requiere especificar un atributo para la tirada de resolución.'
      );
      expect(contract.warnings).toContain(
        'El comportamiento "Onda Psíquica" de ataque requiere clasificar el tipo de ataque (Físico o Mental).'
      );
    });
  });

  // =========================================================================
  // 4. VERIFICACIÓN FUNCIONAL DEL WARNING DE ATRIBUTO
  // =========================================================================
  describe('4. Verificación funcional de la advertencia de atributo', () => {
    it('A. Se emite warning cuando la tirada derivada o explícita carece de atributo, y se resuelve al asignarlo', () => {
      const behavior: MechanicalBehavior = {
        id: 'bhv_att_test',
        name: 'Golpe Frontal',
        mode: 'active',
        conditions: [],
        conditionLogic: 'all',
        limitations: [],
        target: { type: 'enemies' },
        resolution: { type: 'automatic', outcomes: [] }, // Default automatic derives ACC vs Evasión
        effects: [{ id: 'eff_1', type: 'damage', dice: '2D6', damageType: 'fisico' }],
      };

      // 1. Without attribute configured -> requiresRoll = true, complete = false, warning present
      const contractIncomplete = deriveTechniqueRollContract([behavior]);
      expect(contractIncomplete.hasRoll).toBe(true);
      expect(contractIncomplete.complete).toBe(false);
      expect(contractIncomplete.warnings).toContain(
        'El comportamiento "Golpe Frontal" requiere especificar un atributo para la tirada de resolución.'
      );

      // 2. User selects attribute 'FUE' -> complete = true, warnings cleared, formula formatted
      behavior.resolution = {
        type: 'roll',
        attribute: 'FUE',
        attackType: 'physical',
      };

      const contractComplete = deriveTechniqueRollContract([behavior]);
      expect(contractComplete.hasRoll).toBe(true);
      expect(contractComplete.complete).toBe(true);
      expect(contractComplete.warnings).toHaveLength(0);
      expect(contractComplete.behaviors[0].rollFormula).toBe('2D10 + FUE vs. Evasión');
    });
  });
});
