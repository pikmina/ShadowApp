import { describe, it, expect } from "vitest";
import {
  mechanicalLimitationSchema,
  mechanicalEffectItemSchema,
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from "../mechanicalBehavior";
import { describeMechanicalLimitation, describeMechanicalBehavior } from "../mechanicalDescription";
import { calculateTechniqueStructuralCost, validateBehaviorMechanicalValues } from "../systemMechanics";
import { createCoreCategories, CORE_CATEGORIES, CORE_CATEGORY_CONTRACTS, getCategoryOptions } from "../coreRuleCatalog";
import {
  executeMechanicalBehavior,
  advanceTurn,
  createParticipantRuntimeState,
  createEncounterRuntimeState,
  type EncounterRuntimeState,
  type RuleWorld,
} from "../mechanicalRuntime";

describe("Canonical Mechanical Limitation: self_damage (Daño autoinfligido)", () => {
  describe("0. Core Category Integration & Administrative Availability", () => {
    it("includes core.self_damage in CORE_CATEGORIES and CORE_CATEGORY_CONTRACTS with parameter editorMode", () => {
      expect((CORE_CATEGORIES as any).self_damage).toBe("Daño autoinfligido");
      const contract = (CORE_CATEGORY_CONTRACTS as any).self_damage;
      expect(contract).toBeDefined();
      expect(contract.coreKey).toBe("self_damage");
      expect(contract.kind).toBe("ce_adjustment");
      expect(contract.editorMode).toBe("parameter");
      expect(contract.ruleClass).toBe("cost_modifier");
    });

    it("seeds exposure options 1 through 10 in core.self_damage category with default cost = 0", () => {
      const cats = createCoreCategories();
      const selfDmgCat = cats.find((c) => c.coreKey === "self_damage" || c.id === "core.self_damage");
      expect(selfDmgCat).toBeDefined();
      expect(selfDmgCat?.rules.length).toBeGreaterThanOrEqual(10);

      const options = getCategoryOptions(cats, "self_damage");
      expect(options.length).toBeGreaterThanOrEqual(10);
      for (let n = 1; n <= 10; n++) {
        const opt = options.find((o) => o.runtimeKey === String(n));
        expect(opt).toBeDefined();
        expect(opt?.name).toBe(`${n} HP`);
        expect(opt?.cost).toBe(0);
      }
    });

    it("allows creating higher exposure options (e.g. 15 HP -> -4 CE) which calculate CE automatically", () => {
      const cats = createCoreCategories();
      const selfDmgCat = cats.find((c) => c.coreKey === "self_damage");
      if (selfDmgCat) {
        selfDmgCat.rules.push({
          id: "core.self_damage.15",
          runtimeKey: "15",
          name: "15 HP",
          cost: -4,
          ruleType: "cost_modifier",
          isAvailable: true,
        } as any);
      }

      const tech15 = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b15"),
            effects: [{ id: "eff1", type: "damage", dice: "4D8" }], // 5 CE
            limitations: [{ id: "sd15", type: "self_damage" as const, amount: 15, frequency: "on_activation" as const }],
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost(tech15, cats);
      expect(cost).toBe(3); // 7 (4D8) - 4 (exposure 15) = 3 CE
    });

    it("marks obsolete consequence options as not available (isAvailable: false)", () => {
      const cats = createCoreCategories();
      const consCat = cats.find((c) => c.coreKey === "consequence");
      const sdTurn = consCat?.rules.find((r) => r.id === "core.consequence.self_damage_turn");
      const sdFixed2 = consCat?.rules.find((r) => r.id === "core.consequence.self_damage_fixed_2");
      const int2PerTurn = consCat?.rules.find((r) => r.id === "core.consequence.int2_per_active_turn");

      expect(sdTurn?.isAvailable).toBe(false);
      expect(sdFixed2?.isAvailable).toBe(false);
      expect(int2PerTurn?.isAvailable).toBe(false);

      // Migrable rules remain available
      const recoilRule = consCat?.rules.find((r) => r.id === "core.consequence.recoil_half");
      expect(recoilRule?.isAvailable).not.toBe(false);
    });

    it("allows administrative options to be consumed and rendered by UniversalRulesCatalog / RulesAdmin data", () => {
      const cats = createCoreCategories();
      const options = getCategoryOptions(cats, "self_damage");
      expect(options.some((o) => o.name === "1 HP")).toBe(true);
      expect(options.some((o) => o.name === "10 HP")).toBe(true);
    });
  });
  describe("1. Schema & Validation", () => {
    it("parses valid self_damage limitation with on_activation frequency without persisting costAdjustment", () => {
      const parsed = mechanicalLimitationSchema.parse({
        id: "sd1",
        type: "self_damage",
        amount: 3,
        frequency: "on_activation",
        costAdjustment: -1,
      });

      expect(parsed.type).toBe("self_damage");
      if (parsed.type === "self_damage") {
        expect(parsed.amount).toBe(3);
        expect(parsed.frequency).toBe("on_activation");
        expect((parsed as any).costAdjustment).toBeUndefined();
      }
    });

    it("parses each_active_turn and on_end frequencies", () => {
      const p1 = mechanicalLimitationSchema.parse({
        id: "sd2",
        type: "self_damage",
        amount: 1,
        frequency: "each_active_turn",
      });
      if (p1.type === "self_damage") {
        expect(p1.frequency).toBe("each_active_turn");
      }

      const p2 = mechanicalLimitationSchema.parse({
        id: "sd3",
        type: "self_damage",
        amount: 4,
        frequency: "on_end",
      });
      if (p2.type === "self_damage") {
        expect(p2.frequency).toBe("on_end");
      }
    });

    it("enforces positive integer for amount (min 1)", () => {
      const parsed = mechanicalLimitationSchema.parse({
        id: "sd4",
        type: "self_damage",
        amount: 0,
      });
      if (parsed.type === "self_damage") {
        expect(parsed.amount).toBe(1);
      }
    });
  });

  describe("2. Canonical Descriptions", () => {
    it("generates description for on_activation with plural points", () => {
      const desc = describeMechanicalLimitation({
        id: "sd1",
        type: "self_damage",
        amount: 3,
        frequency: "on_activation",
      });
      expect(desc.text).toBe("Recibe 3 puntos de daño al activar la técnica.");
      expect(desc.complete).toBe(true);
    });

    it("generates description for each_active_turn with singular point", () => {
      const desc = describeMechanicalLimitation({
        id: "sd2",
        type: "self_damage",
        amount: 1,
        frequency: "each_active_turn",
      });
      expect(desc.text).toBe("Recibe 1 punto de daño por cada turno que la técnica permanezca activa.");
      expect(desc.complete).toBe(true);
    });

    it("generates description for on_end with plural points", () => {
      const desc = describeMechanicalLimitation({
        id: "sd3",
        type: "self_damage",
        amount: 4,
        frequency: "on_end",
      });
      expect(desc.text).toBe("Recibe 4 puntos de daño al finalizar la técnica.");
      expect(desc.complete).toBe(true);
    });

    it("integrates properly into describeMechanicalBehavior", () => {
      const mb: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("test_sd"),
        limitations: [
          {
            id: "sd1",
            type: "self_damage",
            amount: 2,
            frequency: "on_activation",
          },
        ],
      };
      const result = describeMechanicalBehavior(mb);
      expect(result.text).toContain("Recibe 2 puntos de daño al activar la técnica.");
    });
  });

  describe("3. CE Cost Calculation & Global Balance", () => {
    it("calculates CE reduction globally based on damage exposure on_activation (amount 2 -> 1 CE reduction)", () => {
      const customCats = createCoreCategories();
      const sdCat = customCats.find((c) => c.coreKey === "self_damage");
      const r2 = sdCat?.rules.find((r) => r.runtimeKey === "2");
      if (r2) r2.cost = -1;

      const technique = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }],
            limitations: [
              {
                id: "sd1",
                type: "self_damage" as const,
                amount: 2,
                frequency: "on_activation" as const,
              },
            ],
          },
        ],
      };

      const baseTech = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }],
            limitations: [],
          },
        ],
      };

      const costWithLimitation = calculateTechniqueStructuralCost(technique, customCats);
      const costWithoutLimitation = calculateTechniqueStructuralCost(baseTech, customCats);

      expect(costWithLimitation).toBe(costWithoutLimitation - 1);
    });

    it("calculates CE reduction based on duration exposure for each_active_turn (1 dmg x 5 turns = 5 exposure)", () => {
      const customCats = createCoreCategories();
      const sdCat = customCats.find((c) => c.coreKey === "self_damage");
      const r5 = sdCat?.rules.find((r) => r.runtimeKey === "5");
      if (r5) r5.cost = -2;

      const technique = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "4D8" }], // 5 CE
            temporality: {
              duration: { type: "turns" as const, turns: 5 },
            },
            limitations: [
              {
                id: "sd2",
                type: "self_damage" as const,
                amount: 1,
                frequency: "each_active_turn" as const,
              },
            ],
          },
        ],
      };

      const baseTech = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "4D8" }],
            temporality: {
              duration: { type: "turns" as const, turns: 5 },
            },
            limitations: [],
          },
        ],
      };

      const costWithLimitation = calculateTechniqueStructuralCost(technique, customCats);
      const costWithoutLimitation = calculateTechniqueStructuralCost(baseTech, customCats);

      expect(costWithLimitation).toBe(costWithoutLimitation - 2);
    });

    it("prevents duplicated adjustments across health_cost, self_damage, and consequence for a single self_damage instance", () => {
      const customCats = createCoreCategories();
      // Remove self_damage core rules to test legacy fallback deduplication
      const sdCat = customCats.find((c: any) => c.coreKey === "self_damage");
      if (sdCat) sdCat.rules = [];

      // Configure rules in both consequence and health_cost
      const hpCat = customCats.find((c: any) => c.coreKey === "health_cost");
      const rule2hp = hpCat?.rules.find((r: any) => r.runtimeKey === "2");
      if (rule2hp) {
        rule2hp.cost = -2;
      }
      const consCat = customCats.find((c: any) => c.coreKey === "consequence");
      const fixedDmgRule = consCat?.rules.find((r: any) => r.id === "core.consequence.self_damage_fixed_2");
      if (fixedDmgRule) {
        fixedDmgRule.cost = -5; // if both were applied, penalty would be -7
      }

      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }], // base 2D6 = 3 CE
            limitations: [
              {
                id: "sd1",
                type: "self_damage" as const,
                amount: 2,
                frequency: "on_activation" as const,
              },
            ],
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost(tech, customCats);
      // Base damage 2D6 is 3 CE. health_cost option (2 HP) has -2 CE.
      // Expected cost: 3 + (-2) = 1 CE (NOT 3 + (-2) + (-5) = 0).
      expect(cost).toBe(1);
    });

    it("persisted technique recalculates structural CE automatically when global system rules are modified without touching the technique record", () => {
      // 1. Technique is created/saved once with self_damage
      const savedTechnique = Object.freeze({
        id: "tech_frozen_1",
        characterId: 101,
        name: "Impacto Temerario",
        level: 1,
        sourceType: "physical" as const,
        mechanicalBehaviors: [
          {
            id: "b_saved",
            name: "Golpe",
            mode: "active" as const,
            effects: [{ id: "eff_dmg", type: "damage" as const, dice: "2D6" }],
            limitations: [
              {
                id: "sd_saved",
                type: "self_damage" as const,
                amount: 2,
                frequency: "on_activation" as const,
              },
            ],
          },
        ],
      });

      // 2. Initial global rules: baseline 2D6 (3 CE) + core.self_damage 2 HP (0 CE) = 3 CE
      const globalRulesV1 = createCoreCategories();
      const initialCE = calculateTechniqueStructuralCost(savedTechnique as any, globalRulesV1);
      expect(initialCE).toBe(3);

      // 3. Global balance is updated: admin increases self_damage option 2 cost reduction to -3 CE
      const globalRulesV2 = createCoreCategories();
      const sdCat = globalRulesV2.find((c: any) => c.coreKey === "self_damage");
      const rule = sdCat?.rules.find((r: any) => r.runtimeKey === "2");
      if (rule) rule.cost = -3;

      // 4. Without modifying or re-saving savedTechnique, calculate its structural CE with new rules
      const recalculatedCE = calculateTechniqueStructuralCost(savedTechnique as any, globalRulesV2);
      expect(recalculatedCE).toBe(0); // 3 (2D6) - 3 (self_damage) = 0 CE
    });

    it("self_damage with globally configured zero CE preserves zero and does not fall through", () => {
      const customCats = createCoreCategories();
      // Configure consequence rule self_damage_fixed_2 to explicitly have 0 CE
      const consCat = customCats.find((c: any) => c.coreKey === "consequence");
      const fixedDmgRule = consCat?.rules.find((r: any) => r.id === "core.consequence.self_damage_fixed_2");
      if (fixedDmgRule) {
        fixedDmgRule.cost = 0;
      }
      // Configure lower-precedence cost_adjustment rule hp2 to have -10 CE (which would apply if falling through)
      const costAdjCat = customCats.find((c: any) => c.coreKey === "cost_adjustment");
      if (costAdjCat) {
        costAdjCat.rules.push({ id: "core.cost_adjustment.hp2", runtimeKey: "hp2", name: "HP 2", cost: -10 } as any);
      }

      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }], // base 2D6 = 3 CE
            limitations: [
              {
                id: "sd1",
                type: "self_damage" as const,
                amount: 2,
                frequency: "on_activation" as const,
              },
            ],
          },
        ],
      };

      const cost = calculateTechniqueStructuralCost(tech, customCats);
      // Base damage 2D6 = 3 CE.
      // Matching rule self_damage_fixed_2 in consequence has cost = 0.
      // Expected cost = 3 + 0 = 3 CE. (It must NOT fall through to cost_adjustment -10).
      expect(cost).toBe(3);
    });

    it("self_damage with no matching global balance rule does not invent a CE adjustment", () => {
      const emptyCategories: any[] = [
        { id: "core.health_cost", coreKey: "health_cost", rules: [] },
        { id: "core.consequence", coreKey: "consequence", rules: [] },
      ];

      const tech = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }], // base 2D6 = 3 CE in standard, but 0 in emptyCategories
            limitations: [
              {
                id: "sd1",
                type: "self_damage" as const,
                amount: 12, // exposure 12 has no rule in emptyCategories
                frequency: "on_activation" as const,
              },
            ],
          },
        ],
      };

      const baseTechWithoutSd = {
        level: 1,
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("b1"),
            effects: [{ id: "eff1", type: "damage", dice: "2D6" }],
            limitations: [],
          },
        ],
      };

      const costWithSd = calculateTechniqueStructuralCost(tech, emptyCategories);
      const costWithoutSd = calculateTechniqueStructuralCost(baseTechWithoutSd, emptyCategories);

      // No matching global balance rule exists for exposure 12 in emptyCategories.
      // No implicit mathematical fallback (-Math.floor(12/2) = -6) should be invented.
      expect(costWithSd).toBe(costWithoutSd);
    });

    it("fails validation when self_damage with each_active_turn has no finite duration in turns", () => {
      const behaviorWithoutDuration = {
        ...createDefaultMechanicalBehavior("b_inf"),
        limitations: [
          {
            id: "sd_inf",
            type: "self_damage" as const,
            amount: 1,
            frequency: "each_active_turn" as const,
          },
        ],
      };

      const res = validateBehaviorMechanicalValues(behaviorWithoutDuration, createCoreCategories());
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Cada turno activo"))).toBe(true);
    });

    it("validates attribute_modifier requires non-empty attributeId", () => {
      const behaviorWithInvalidAttr = {
        ...createDefaultMechanicalBehavior("b_attr"),
        effects: [
          {
            id: "eff_attr_1",
            type: "attribute_modifier" as const,
            attributeId: "",
            amount: 1,
          },
        ],
      };

      const res = validateBehaviorMechanicalValues(behaviorWithInvalidAttr, createCoreCategories());
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Modificador de atributo"))).toBe(true);
    });
  });

  describe("4. Runtime Execution", () => {
    function setupWorldAndEncounter(): { world: RuleWorld; encounter: EncounterRuntimeState } {
      const world: RuleWorld = {
        hero: {
          id: "hero",
          name: "Hero",
          resources: {
            SA: { current: 30, max: 30 },
            ES: { current: 20, max: 20 },
          },
          barrier: 0,
          attributes: { FUE: 5, DES: 5, INT: 5 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
        villain: {
          id: "villain",
          name: "Villain",
          resources: {
            SA: { current: 30, max: 30 },
            ES: { current: 20, max: 20 },
          },
          barrier: 0,
          attributes: { FUE: 5, DES: 5, INT: 5 },
          modifiers: [],
          statuses: [],
          inventory: {},
        },
      };

      const encounter: EncounterRuntimeState = createEncounterRuntimeState(1);
      encounter.participants.hero = createParticipantRuntimeState("hero", 1);
      encounter.participants.villain = createParticipantRuntimeState("villain", 1);

      return { world, encounter };
    }

    it("executes on_activation self_damage immediately upon behavior execution", () => {
      const { world, encounter } = setupWorldAndEncounter();
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("sd_act"),
        target: { type: "enemy" },
        effects: [{ id: "eff1", type: "damage", dice: "2D6" }],
        limitations: [
          {
            id: "sd1",
            type: "self_damage",
            amount: 3,
            frequency: "on_activation",
          },
        ],
      };

      const result = executeMechanicalBehavior({
        behavior,
        elementId: "tech1",
        sourceEntityId: "hero",
        targetEntityId: "villain",
        world,
        encounter,
      });

      expect(result.success).toBe(true);
      expect(result.newWorld.hero.resources.SA.current).toBe(27);
      expect(result.newEncounter.participants.hero.hpLostThisTurn).toBe(3);
    });

    it("executes each_active_turn self_damage at the start of the user's turn", () => {
      const { world, encounter } = setupWorldAndEncounter();
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("sd_turn"),
        temporality: {
          duration: { mode: "turns", turns: 2 },
        },
        limitations: [
          {
            id: "sd2",
            type: "self_damage",
            amount: 2,
            frequency: "each_active_turn",
          },
        ],
      };

      // Turn 1: Hero executes technique
      const res1 = executeMechanicalBehavior({
        behavior,
        elementId: "tech2",
        sourceEntityId: "hero",
        targetEntityId: "hero",
        world,
        encounter,
      });

      expect(res1.success).toBe(true);
      // On activation, each_active_turn does NOT deal damage immediately
      expect(res1.newWorld.hero.resources.SA.current).toBe(30);
      expect(res1.newEncounter.participants.hero.activeTimedEffects.length).toBe(1);

      // Turn 2: Advance turn -> advanceTurn
      const worldTurn2 = res1.newWorld;
      const encAfterTurnStart = advanceTurn(res1.newEncounter, undefined, worldTurn2);

      // Hero receives 2 damage on turn 2
      expect(worldTurn2.hero.resources.SA.current).toBe(28);
      expect(encAfterTurnStart.participants.hero.hpLostThisTurn).toBe(2);
    });

    it("executes on_end self_damage when the technique expires", () => {
      const { world, encounter } = setupWorldAndEncounter();
      const behavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("sd_end"),
        temporality: {
          duration: { mode: "turns", turns: 1 },
        },
        limitations: [
          {
            id: "sd3",
            type: "self_damage",
            amount: 4,
            frequency: "on_end",
          },
        ],
      };

      // Turn 1: Hero executes technique (1 turn duration)
      const res1 = executeMechanicalBehavior({
        behavior,
        elementId: "tech3",
        sourceEntityId: "hero",
        targetEntityId: "hero",
        world,
        encounter,
      });

      expect(res1.success).toBe(true);
      expect(res1.newWorld.hero.resources.SA.current).toBe(30);

      // Turn 2: Duration 1 expires on next turn
      const worldTurn2 = res1.newWorld;
      const encAfterTurn2 = advanceTurn(res1.newEncounter, undefined, worldTurn2);

      // Turn 3: Expiration resolution
      const encAfterTurn3 = advanceTurn(encAfterTurn2, undefined, worldTurn2);

      // Hero receives 4 damage on end
      expect(worldTurn2.hero.resources.SA.current).toBe(26);
      expect(encAfterTurn3.participants.hero.hpLostThisTurn).toBe(4);
    });
  });
});
