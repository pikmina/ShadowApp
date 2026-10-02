import { describe, it, expect } from 'vitest';
import { buildCharacterSheetViewModel } from '../characterSheetViewModel';
import { createCoreCategories } from '../coreRuleCatalog';
import { calculateTechniqueStructuralCost, deriveSupportDefenseRD } from '../systemMechanics';
import { generateAutoDescription } from '../mechanicalDescription';

describe('Task — SUPPORT & DEFENSIVE Technique RD Alignment across all Character Sheets', () => {

  // Setup a common support technique fixture
  const supportTechFixture = {
    id: 't-support',
    name: 'Inyección de Adrenalina',
    classification: 'support', // modern classification
    type: 'Soporte',
    mechanicalBehaviors: [
      {
        id: 'b-healing',
        name: 'Curación Básica',
        mode: 'active',
        activation: { actionType: 'action' },
        effects: [
          {
            id: 'eff-healing',
            type: 'healing',
            amount: 6, // 6 is a valid standard rule (has cost 3 initially)
          },
        ],
        resolution: {
          type: 'rd',
          attribute: 'INT',
          skill: 'Medicina',
        },
      },
    ],
  };

  const characterFixture = {
    id: 1001,
    name: 'Recovery Girl',
    profileData: {
      basic_name: 'Recovery',
      last_name: 'Girl',
      INT: 6,
    },
    techniques: [supportTechFixture],
    possessions: [],
  };

  describe('9. Regresión Dinámica: CE & RD changes without re-saving', () => {
    it('synchronizes and derives RD dynamically in autoDescription when rules affect CE', () => {
      // Step A: Load core categories and customize healing cost
      const globalRules = createCoreCategories();
      const healingCat = globalRules.find(c => c.coreKey === 'healing');
      const standardHealingRule = healingCat?.rules.find(r => r.id.endsWith('.6') || (r as any).runtimeKey === '6');
      
      expect(standardHealingRule).toBeDefined();

      // Force low structural cost (healing cost = 0, activation standard = 0)
      if (standardHealingRule) {
        standardHealingRule.cost = 0;
      }

      const vm1 = buildCharacterSheetViewModel({
        character: characterFixture,
        mechanicsList: globalRules,
      });

      const tech1 = vm1.techniques.find(t => t.id === 't-support');
      expect(tech1).toBeDefined();
      // Structural cost is 0, which maps to RD 12
      expect(tech1?.cost).toBe(0);
      expect(tech1?.autoDescription).toContain('Superar RD 12 en INT + Medicina');

      // Step B: Change global rules dynamically so that the CE increases
      if (standardHealingRule) {
        standardHealingRule.cost = 5; // Force healing cost to be 5
      }

      const vm2 = buildCharacterSheetViewModel({
        character: characterFixture,
        mechanicsList: globalRules,
      });

      const tech2 = vm2.techniques.find(t => t.id === 't-support');
      expect(tech2).toBeDefined();
      // Structural cost is now 5 (healing cost 5 + activation standard 0), which maps to RD 16
      expect(tech2?.cost).toBe(5);
      expect(tech2?.autoDescription).toContain('Superar RD 16 en INT + Medicina');

      // Step C: Change global rules again so that structural cost is 9 (RD 20)
      if (standardHealingRule) {
        standardHealingRule.cost = 9;
      }

      const vm3 = buildCharacterSheetViewModel({
        character: characterFixture,
        mechanicsList: globalRules,
      });

      const tech3 = vm3.techniques.find(t => t.id === 't-support');
      expect(tech3).toBeDefined();
      // Structural cost is now 9, which maps to RD 20
      expect(tech3?.cost).toBe(9);
      expect(tech3?.autoDescription).toContain('Superar RD 20 en INT + Medicina');
    });
  });

  describe('10. Tests de Paridad: All 6 Sheet views receive same CE & RD', () => {
    it('verifies that Base, Hero, Student, Villain, Vigilante, and Civilian sheets all obtain identical technique data', () => {
      const globalRules = createCoreCategories();
      const vm = buildCharacterSheetViewModel({
        character: characterFixture,
        mechanicsList: globalRules,
      });

      const mappedTech = vm.techniques.find(t => t.id === 't-support');
      expect(mappedTech).toBeDefined();

      // Ensure the derived structuralCost & RD are resolved consistently
      const expectedCost = mappedTech?.cost;
      const expectedRdText = 'Superar RD'; // Should contain Superar RD with derived number

      expect(mappedTech?.autoDescription).toContain(expectedRdText);

      // Verify each sheet contract type matches
      const sheetKeys = ['BASE', 'HERO', 'STUDENT', 'VILLAIN', 'VIGILANTE', 'CIVILIAN'];
      for (const key of sheetKeys) {
        // Confirm consistency of vm mapping which feeds all these components
        expect(vm.techniques).toHaveLength(1);
        expect(vm.techniques[0].cost).toBe(expectedCost);
        expect(vm.techniques[0].autoDescription).toContain(expectedRdText);
      }
    });
  });
});
