import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveTargetCandidates,
  executeMultiTargetBehavior,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  type RuleWorld,
  type EncounterRuntimeState,
} from "../mechanicalRuntime.ts";
import { describeMechanicalTarget } from "../mechanicalDescription.ts";
import {
  findTargetCountOption,
  calculateTechniqueStructuralCost,
} from "../systemMechanics.ts";
import { createCoreCategories } from "../coreRuleCatalog.ts";
import { SYSTEM_TRAITS } from "../systemTraits.ts";
import type { MechanicalBehavior } from "../mechanicalBehavior.ts";

function createTestBehavior(partial: Partial<MechanicalBehavior> & { id: string; name?: string }): MechanicalBehavior {
  return {
    name: partial.id,
    mode: "active",
    conditions: [],
    conditionLogic: "all",
    limitations: [],
    effects: [],
    ...partial,
  };
}

describe("Fase 2 — Coherencia del runtime de objetivos y Contrato Canónico", () => {
  let world: RuleWorld;
  let encounter: EncounterRuntimeState;

  beforeEach(() => {
    world = {
      hero: {
        id: "hero",
        name: "Protagonist",
        level: 1,
        rank: "Novato",
        faction: "heroes",
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 5, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      ally1: {
        id: "ally1",
        name: "Ally One",
        level: 1,
        rank: "Novato",
        faction: "heroes",
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      enemy1: {
        id: "enemy1",
        name: "Enemy One",
        level: 1,
        rank: "Novato",
        faction: "villains",
        attributes: { FUE: 3, AGI: 3, DES: 3, POD: 3, RES: 3, CON: 3, VOL: 3, INT: 3 },
        resources: {
          SA: { current: 10, max: 20 },
          ES: { current: 4, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      neutral1: {
        id: "neutral1",
        name: "Neutral Citizen",
        level: 1,
        rank: "Novato",
        faction: "civilians",
        attributes: { FUE: 2, AGI: 2, DES: 2, POD: 2, RES: 2, CON: 2, VOL: 2, INT: 2 },
        resources: {
          SA: { current: 8, max: 10 },
          ES: { current: 3, max: 5 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    };

    encounter = createEncounterRuntimeState(1);
    encounter.participants.hero = createParticipantRuntimeState("hero", 1);
    encounter.participants.ally1 = createParticipantRuntimeState("ally1", 1);
    encounter.participants.enemy1 = createParticipantRuntimeState("enemy1", 1);
    encounter.participants.neutral1 = createParticipantRuntimeState("neutral1", 1);
  });

  // 1. character + excludeSelf: true excluye al ejecutor de los candidatos automáticos
  it("1. character + excludeSelf: true excluye al ejecutor de los candidatos automáticos", () => {
    const res = resolveTargetCandidates({
      targetDef: {
        type: "character",
        excludeSelf: true,
        quantity: { mode: "all" },
      },
      candidateIds: ["hero", "ally1", "enemy1", "neutral1"],
      sourceEntityId: "hero",
      world,
      encounter,
    });

    expect(res.success).toBe(true);
    expect(res.selectedIds).not.toContain("hero");
    expect(res.selectedIds).toContain("ally1");
    expect(res.selectedIds).toContain("enemy1");
    expect(res.selectedIds).toContain("neutral1");
  });

  // 2. La selección automática no vuelve a introducir al ejecutor al aplicar prioridad u ordenación
  it("2. La selección automática no vuelve a introducir al ejecutor al aplicar prioridad u ordenación", () => {
    const res = resolveTargetCandidates({
      targetDef: {
        type: "character",
        excludeSelf: true,
        quantity: { mode: "exact", count: 2 },
        selectionMode: "standard_priority",
      },
      candidateIds: ["hero", "ally1", "enemy1", "neutral1"],
      sourceEntityId: "hero",
      world,
      encounter,
      candidateInfo: {
        hero: { initiativeRoll: -10 }, // If evaluated, would be picked first by lowest initiative
        neutral1: { initiativeRoll: 1 },
        ally1: { initiativeRoll: 2 },
        enemy1: { initiativeRoll: 3 },
      },
    });

    expect(res.success).toBe(true);
    expect(res.selectedIds).not.toContain("hero");
    expect(res.selectedIds).toHaveLength(2);
    expect(res.selectedIds).toEqual(["neutral1", "ally1"]);
  });

  // 3. character + excludeSelf: true admite aliados, enemigos y neutrales en selección automática y explícita
  it("3. character + excludeSelf: true admite aliados, enemigos y neutrales tanto en selección automática como explícita", () => {
    // Automática
    const autoRes = resolveTargetCandidates({
      targetDef: {
        type: "character",
        excludeSelf: true,
        quantity: { mode: "exact", count: 3 },
      },
      candidateIds: ["ally1", "enemy1", "neutral1"],
      sourceEntityId: "hero",
      world,
      encounter,
    });
    expect(autoRes.success).toBe(true);
    expect(autoRes.selectedIds).toEqual(["ally1", "enemy1", "neutral1"]);

    // Explícita
    const behavior = createTestBehavior({
      id: "test.character.heal",
      target: {
        type: "character",
        excludeSelf: true,
        quantity: { mode: "up_to", count: 3 },
      },
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
    });

    const execRes = executeMultiTargetBehavior({
      behavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1", "enemy1", "neutral1"],
      world,
      encounter,
    });

    expect(execRes.success).toBe(true);
    expect(execRes.newWorld.ally1.resources.ES.current).toBe(6);
    expect(execRes.newWorld.enemy1.resources.ES.current).toBe(6);
    expect(execRes.newWorld.neutral1.resources.ES.current).toBe(5);
  });

  // 4. character + excludeSelf: false o no especificado admite al ejecutor en selección automática y explícita
  it("4. character + excludeSelf: false o no especificado admite al ejecutor en selección automática y explícita", () => {
    // No especificado (omitted)
    const resNoExclude = resolveTargetCandidates({
      targetDef: {
        type: "character",
        quantity: { mode: "all" },
      },
      candidateIds: ["hero", "ally1"],
      sourceEntityId: "hero",
      world,
      encounter,
    });
    expect(resNoExclude.selectedIds).toContain("hero");

    // Con excludeSelf: false
    const resExcludeFalse = resolveTargetCandidates({
      targetDef: {
        type: "character",
        excludeSelf: false,
        quantity: { mode: "all" },
      },
      candidateIds: ["hero", "ally1"],
      sourceEntityId: "hero",
      world,
      encounter,
    });
    expect(resExcludeFalse.selectedIds).toContain("hero");

    // Explícito
    const behaviorSelfAllowed = createTestBehavior({
      id: "test.character.self-allowed",
      target: {
        type: "character",
        excludeSelf: false,
        quantity: { mode: "up_to", count: 2 },
      },
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 1 }],
    });
    const execRes = executeMultiTargetBehavior({
      behavior: behaviorSelfAllowed,
      sourceEntityId: "hero",
      targetEntityIds: ["hero", "ally1"],
      world,
      encounter,
    });
    expect(execRes.success).toBe(true);
    expect(execRes.newWorld.hero.resources.ES.current).toBe(6);
    expect(execRes.newWorld.ally1.resources.ES.current).toBe(5);
  });

  // 5. Los tipos históricos sin normalizar (ally, enemy) siguen rechazando objetivos de facción incorrecta
  it("5. Los tipos históricos sin normalizar (ally, enemy) siguen rechazando objetivos de facción incorrecta", () => {
    // Unnormalized ally targeting enemy
    const legacyAllyBehavior = createTestBehavior({
      id: "legacy.ally.buff",
      target: { type: "ally" as any, quantity: { mode: "exact" as const, count: 1 } },
      effects: [{ id: "eff1", type: "healing" as const, resourceId: "ES" as const, amount: 2 }],
    });
    const allyRes = executeMultiTargetBehavior({
      behavior: legacyAllyBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["enemy1"],
      world,
      encounter,
    });
    expect(allyRes.success).toBe(false);
    expect(allyRes.reasons?.[0]).toContain("is not an ally");

    // Unnormalized enemy targeting ally
    const legacyEnemyBehavior = createTestBehavior({
      id: "legacy.enemy.attack",
      target: { type: "enemy" as any, quantity: { mode: "exact" as const, count: 1 } },
      effects: [{ id: "eff1", type: "damage" as const, dice: "1D6" }],
    });
    const enemyRes = executeMultiTargetBehavior({
      behavior: legacyEnemyBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1"],
      world,
      encounter,
    });
    expect(enemyRes.success).toBe(false);
    expect(enemyRes.reasons?.[0]).toContain("is not an enemy");
  });

  // 6. La validación explícita falla atómicamente si al menos un objetivo no cumple las restricciones
  it("6. La validación explícita falla atómicamente si al menos un objetivo no cumple las restricciones", () => {
    const behaviorExcludeSelf = createTestBehavior({
      id: "test.atomic.excludeSelf",
      target: {
        type: "character",
        excludeSelf: true,
        quantity: { mode: "up_to", count: 3 },
      },
      effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
    });

    // ally1 is valid, but hero is invalid because excludeSelf: true
    const res = executeMultiTargetBehavior({
      behavior: behaviorExcludeSelf,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1", "hero"],
      world,
      encounter,
    });

    expect(res.success).toBe(false);
    expect(res.usageConsumed).toBe(false);
    expect(res.reasons?.[0]).toContain("Cannot target self");
    // ally1 was NOT touched (atomic failure)
    expect(res.newWorld.ally1.resources.ES.current).toBe(4);
    expect(res.newWorld.hero.resources.ES.current).toBe(5);
  });

  // 7. describeMechanicalTarget genera «(excluyendo al usuario)» y no «aliados» para character + excludeSelf: true
  it("7. describeMechanicalTarget genera «(excluyendo al usuario)» y no «aliados» para character + excludeSelf: true", () => {
    const single = describeMechanicalTarget({
      type: "character",
      excludeSelf: true,
      quantity: { mode: "exact", count: 1 },
    });
    expect(single.text).toBe("1 personaje (excluyendo al usuario)");
    expect(single.text).not.toContain("aliado");

    const upTo = describeMechanicalTarget({
      type: "character",
      excludeSelf: true,
      quantity: { mode: "up_to", count: 3 },
    });
    expect(upTo.text).toBe("Hasta 3 personajes (excluyendo al usuario)");
    expect(upTo.text).not.toContain("aliado");

    const all = describeMechanicalTarget({
      type: "character",
      excludeSelf: true,
      quantity: { mode: "all" },
    });
    expect(all.text).toBe("Todos los personajes (excluyendo al usuario)");
    expect(all.text).not.toContain("aliados");
  });

  // 8. describeMechanicalTarget conserva los textos existentes para self, ally, enemy, allies, enemies, any, object, structure y zone
  it("8. describeMechanicalTarget conserva los textos existentes para self, ally, enemy, allies, enemies, any, object, structure y zone", () => {
    expect(describeMechanicalTarget({ type: "self" }).text).toBe("Uno mismo");
    expect(describeMechanicalTarget({ type: "ally", quantity: { mode: "exact", count: 1 } }).text).toBe("1 aliado");
    expect(describeMechanicalTarget({ type: "allies" }).text).toBe("Aliados");
    expect(describeMechanicalTarget({ type: "allies", quantity: { mode: "all" } }).text).toBe("Todos los aliados");
    expect(describeMechanicalTarget({ type: "enemy", quantity: { mode: "up_to", count: 2 } }).text).toBe("Hasta 2 enemigos");
    expect(describeMechanicalTarget({ type: "enemies" }).text).toBe("Enemigos");
    expect(describeMechanicalTarget({ type: "enemies", quantity: { mode: "all" } }).text).toBe("Todos los enemigos");
    expect(describeMechanicalTarget({ type: "any", quantity: { mode: "exact", count: 1 } }).text).toBe("1 personaje");
    expect(describeMechanicalTarget({ type: "object", quantity: { mode: "exact", count: 1 } }).text).toBe("1 objeto");
    expect(describeMechanicalTarget({ type: "structure", quantity: { mode: "all" } }).text).toBe("Todas las estructuras");
    expect(describeMechanicalTarget({ type: "zone" }).text).toBe("En la zona seleccionada");
  });

  // 9. findTargetCountOption sigue resolviendo opciones de recuento para tipos históricos sin romper reglas existentes
  it("9. findTargetCountOption sigue resolviendo opciones de recuento para tipos históricos sin romper reglas existentes", () => {
    const cats = createCoreCategories();

    // Historical enemy_N
    const enemyCount2 = findTargetCountOption(cats, 2, "enemy");
    expect(enemyCount2).toBeDefined();
    expect(enemyCount2?.runtimeKey).toBe("enemy_2");
    expect(enemyCount2?.cost).toBe(2);

    // Historical ally_N
    const allyCount3 = findTargetCountOption(cats, 3, "ally");
    expect(allyCount3).toBeDefined();
    expect(allyCount3?.runtimeKey).toBe("ally_3");
    expect(allyCount3?.cost).toBe(4);

    // Generic 'all'
    const countAll = findTargetCountOption(cats, "all");
    expect(countAll).toBeDefined();
    expect(countAll?.runtimeKey).toBe("all");
  });

  // 10. La resolución de costes CE para técnicas que usen character documenta o aplica la regla general correspondiente
  it("10. La resolución de costes CE para técnicas que usen character aplica la regla general correspondiente sin alterar las tarifas", () => {
    const cats = createCoreCategories();

    // A technique targeting 2 characters resolves using the generic target_count rule (2 -> 2 CE)
    const techWithCharacterTarget = {
      level: 1,
      mechanicalBehaviors: [
        {
          id: "tech.multichar",
          mode: "active",
          activation: { actionType: "action" },
          target: {
            type: "character",
            excludeSelf: true,
            quantity: { mode: "exact", count: 2 },
          },
          effects: [{ id: "eff1", type: "damage", dice: "2D6" }],
        },
      ],
    };

    const cost = calculateTechniqueStructuralCost(techWithCharacterTarget, cats);
    // Action (0) + Target count 2 (2) + Damage 2D6 (3) = 5 CE
    expect(cost).toBeGreaterThanOrEqual(5);
  });

  // 11. Líder nato se comporta de acuerdo con el contrato canónico: admite aliados y enemigos, pero rechaza al ejecutor
  it("11. Líder nato se comporta de acuerdo con el contrato canónico: admite aliados y enemigos, pero rechaza al ejecutor", () => {
    const naturalLeader = SYSTEM_TRAITS.find((t) => t.id === "core.trait.natural-leader");
    expect(naturalLeader).toBeDefined();
    const lnBehavior = naturalLeader!.mechanicalBehaviors[0];

    // Rejects executor
    const selfRes = executeMultiTargetBehavior({
      behavior: lnBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1", "hero"],
      world,
      encounter,
      signals: ["speech"],
    });
    expect(selfRes.success).toBe(false);
    expect(selfRes.reasons?.[0]).toContain("Cannot target self");

    // Accepts ally + enemy
    const mixedRes = executeMultiTargetBehavior({
      behavior: lnBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1", "enemy1"],
      world,
      encounter,
      signals: ["speech"],
    });
    expect(mixedRes.success).toBe(true);
    expect(mixedRes.usageConsumed).toBe(true);
    expect(mixedRes.newWorld.ally1.resources.ES.current).toBe(6);
    expect(mixedRes.newWorld.enemy1.resources.ES.current).toBe(6);
  });

  // 12. Ninguna prueba existente o nueva genera regresiones en el cálculo de costes, consumo de usos o aplicación de efectos
  it("12. Ninguna prueba existente o nueva genera regresiones en consumo de usos o aplicación de efectos", () => {
    const naturalLeader = SYSTEM_TRAITS.find((t) => t.id === "core.trait.natural-leader");
    const lnBehavior = naturalLeader!.mechanicalBehaviors[0];

    // Single ally heal
    const res1 = executeMultiTargetBehavior({
      behavior: lnBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1"],
      world,
      encounter,
      signals: ["speech"],
    });
    expect(res1.success).toBe(true);
    expect(res1.newWorld.ally1.resources.ES.current).toBe(6);
    expect(res1.newEncounter.participants.hero.usageCounters["combat:current:natural-leader.speech"]).toBe(1);

    // Second activation within same encounter is blocked by usage_limit
    const res2 = executeMultiTargetBehavior({
      behavior: lnBehavior,
      sourceEntityId: "hero",
      targetEntityIds: ["ally1"],
      world: res1.newWorld,
      encounter: res1.newEncounter,
      signals: ["speech"],
    });
    expect(res2.success).toBe(false);
    expect(res2.reasons?.[0]).toBe("Limitations violated");
    expect(res2.newWorld.ally1.resources.ES.current).toBe(6); // unchanged
  });
});
