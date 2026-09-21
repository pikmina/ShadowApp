import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { db } from "../index.ts";
import { characters, users, systemElements, elementPossessions } from "../schema.ts";
import { eq, inArray } from "drizzle-orm";
import { upsertElement } from "../elements.ts";
import { getCharacterPossessions, getCharacterById } from "../characters.ts";
import {
  dispatchMechanicalEvent,
  resolveCharacterMechanicalBehaviors,
  buildCharacterRuleEntityState,
  createEncounterRuntimeState,
  createParticipantRuntimeState,
  calculateEffectiveCost,
  getActiveContinuousModifiers,
  executeMechanicalBehavior,
} from "../../domain/mechanicalRuntime.ts";
import { nanoid } from "nanoid";

let dbAvailable = false;
try {
  await db.execute("SELECT 1");
  dbAvailable = true;
} catch {
  console.warn("DB not available for active technique E2E test.");
}

describe.skipIf(!dbAvailable)("Phase 3: Active Technique MechanicalBehavior End-to-End Test", () => {
  let testUserId: number;
  let testCharacterId: number;
  let targetCharacterId: number;
  const createdElementIds: string[] = [];

  beforeAll(async () => {
    // 1. Create real test user
    const [user] = await db
      .insert(users)
      .values({
        uid: "e2e_technique_user_" + nanoid(6),
        email: "e2e_technique@example.com",
        role: "moderator",
      })
      .returning();
    testUserId = user.id;

    // 2. Create active caster character
    const [caster] = await db
      .insert(characters)
      .values({
        userId: testUserId,
        name: "E2E Technique Caster",
        exp: 200,
        yen: 1000,
        profileData: {
          basic_name: "E2E Technique Caster",
          FUE: 8,
          DES: 6,
          RES: 6,
          INT: 4,
          VOL: 5,
          VEL: 6,
          salud_actual: 30,
          salud_maxima: 30,
          estamina_actual: 25,
          estamina_maxima: 25,
          barrera: 0,
        },
      })
      .returning();
    testCharacterId = caster.id;

    // 3. Create target enemy character
    const [target] = await db
      .insert(characters)
      .values({
        userId: testUserId,
        name: "E2E Target Dummy",
        exp: 0,
        yen: 0,
        profileData: {
          basic_name: "E2E Target Dummy",
          FUE: 4,
          DES: 4,
          RES: 4,
          INT: 4,
          VOL: 4,
          VEL: 4,
          salud_actual: 25,
          salud_maxima: 25,
          estamina_actual: 10,
          estamina_maxima: 10,
          barrera: 5,
        },
      })
      .returning();
    targetCharacterId = target.id;
  });

  beforeEach(async () => {
    if (testCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
    }
  });

  afterAll(async () => {
    if (testCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
    if (targetCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, targetCharacterId));
      await db.delete(characters).where(eq(characters.id, targetCharacterId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (createdElementIds.length > 0) {
      await db.delete(elementPossessions).where(inArray(elementPossessions.elementId, createdElementIds));
      await db.delete(systemElements).where(inArray(systemElements.id, createdElementIds));
    }
  });

  it("completes full technique lifecycle: persist -> assign -> hydrate -> cost pipeline -> execute -> state update", async () => {
    // 1. Create an active attack technique in System Elements Catalog
    const techniqueElement = await upsertElement({
      name: "Técnica Relámpago Concentrado",
      description: "Ataque activo que consume 4 ES e inflige 8 de daño directo al objetivo",
      kind: "technique_entitlement",
      isPublished: true,
      mechanicalBehaviors: [
        {
          id: `mb_tech_${nanoid(6)}`,
          mode: "active",
          trigger: {
            kind: "action_activation",
            scope: "technique",
          },
          cost: {
            resourceId: "ES",
            amount: 4,
            period: "instant",
          },
          target: {
            type: "enemy",
            range: { type: "distance", distanceMeters: 10 },
          },
          conditions: [],
          effects: [
            {
              id: `eff_dmg_${nanoid(6)}`,
              type: "damage",
              dice: "8",
              damageType: "energy",
            },
          ],
        },
      ],
    });

    const techniqueElementId = techniqueElement.id;
    createdElementIds.push(techniqueElementId);

    expect(techniqueElement.id).toBeDefined();
    expect(techniqueElement.mechanicalBehaviors?.[0].mode).toBe("active");

    // Also assign a continuous weakness to the caster that adds +1 ES to techniques
    const weaknessElement = await upsertElement({
      name: "Sobrecarga de Conductores",
      description: "Las técnicas activas cuestan +1 ES adicional",
      kind: "weakness",
      isPublished: true,
      mechanicalBehaviors: [
        {
          id: `mb_weak_${nanoid(6)}`,
          mode: "continuous",
          conditions: [],
          effects: [
            {
              id: `eff_cost_${nanoid(6)}`,
              type: "cost_modifier",
              scopeId: "technique",
              operation: "add",
              amount: 1,
            },
          ],
        },
      ],
    });

    const weaknessElementId = weaknessElement.id;
    createdElementIds.push(weaknessElementId);

    // 2. Assign both elements to character
    await db.insert(elementPossessions).values([
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: techniqueElementId,
        quantity: 1,
      },
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: weaknessElementId,
        quantity: 1,
      },
    ]);

    // 3. Hydrate character and possessions from database
    const casterChar = await getCharacterById(testCharacterId);
    const targetChar = await getCharacterById(targetCharacterId);
    expect(casterChar).toBeDefined();
    expect(targetChar).toBeDefined();

    const casterPossessions = await getCharacterPossessions(testCharacterId);
    expect(casterPossessions.length).toBe(2);

    // Resolve behaviors
    const characterWithPossessions = {
      ...casterChar!,
      possessions: casterPossessions,
    };
    const ownedBehaviors = resolveCharacterMechanicalBehaviors(characterWithPossessions);
    expect(ownedBehaviors.length).toBe(2);

    const activeTechBehavior = ownedBehaviors.find(
      (b) => b.elementId === techniqueElementId
    )?.behavior;
    expect(activeTechBehavior).toBeDefined();

    // 4. Build runtime environment
    const casterEntity = buildCharacterRuleEntityState(casterChar!);
    const targetEntity = buildCharacterRuleEntityState(targetChar!);

    const world = {
      caster: casterEntity,
      target: targetEntity,
    };

    const encounter = createEncounterRuntimeState(1);
    encounter.participants.caster = createParticipantRuntimeState("caster", 1);
    encounter.participants.target = createParticipantRuntimeState("target", 1);

    // 5. Cost Pipeline: calculate effective cost of active technique with continuous weakness
    const continuousMods = getActiveContinuousModifiers(
      ownedBehaviors,
      casterEntity,
      encounter.participants.caster,
      world
    );

    const baseCost = (activeTechBehavior as any)?.cost?.amount ?? 4;
    const costResult = calculateEffectiveCost({
      baseCost,
      scope: "technique",
      entityId: "caster",
      encounter,
      continuousModifiers: continuousMods.costModifiers.map((m) => ({
        operation: m.operation,
        amount: m.amount,
      })),
    });

    // Base cost 4 + Weakness 1 = 5 ES
    expect(costResult.effectiveCost).toBe(5);

    // Deduct cost from caster
    world.caster.resources.ES.current -= costResult.effectiveCost;
    encounter.participants.caster.esSpentThisTurn += costResult.effectiveCost;
    expect(world.caster.resources.ES.current).toBe(20); // 25 - 5 = 20

    // 6. Execute Technique Active Behavior against target
    const execResult = executeMechanicalBehavior({
      behavior: activeTechBehavior!,
      elementId: techniqueElementId,
      sourceEntityId: "caster",
      targetEntityId: "target",
      world,
      encounter,
    });

    expect(execResult.success).toBe(true);
    expect(execResult.appliedEffects.length).toBe(1);
    expect(execResult.appliedEffects[0].type).toBe("damage");

    // 7. Verify Target took damage: 8 damage against 5 barrier -> 0 barrier, 3 direct damage to SA (25 - 3 = 22)
    expect(execResult.newWorld.target.barrier).toBe(0);
    expect(execResult.newWorld.target.resources.SA.current).toBe(22);
    expect(execResult.newEncounter.participants.target.damageReceivedThisTurn).toBe(3);
  });
});
