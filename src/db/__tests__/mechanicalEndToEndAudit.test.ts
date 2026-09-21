import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { db } from "../index.ts";
import { characters, users, systemElements, elementPossessions } from "../schema.ts";
import { eq, inArray } from "drizzle-orm";
import { upsertElement } from "../elements.ts";
import { getCharacterPossessions, getCharacterById } from "../characters.ts";
import {
  dispatchMechanicalEvent,
  resolveCharacterMechanicalBehaviors,
  partitionCharacterElements,
  buildCharacterRuleEntityState,
  createEncounterRuntimeState,
  getActiveContinuousModifiers,
  calculateEffectiveCost,
  processDamagePipeline,
  applyRollPendingModifiers,
  shouldUseMechanicalBehaviorRuntime,
} from "../../domain/mechanicalRuntime.ts";
import { resolveAppliedMechanics } from "../../domain/systemMechanics.ts";
import { createCoreCategories } from "../../domain/coreRuleCatalog.ts";
import { nanoid } from "nanoid";

let dbAvailable = false;
try {
  await db.execute("SELECT 1");
  dbAvailable = true;
} catch {
  console.warn("DB not available for E2E integration test.");
}

describe.skipIf(!dbAvailable)("Phase 2.5: MechanicalBehavior End-to-End Real Flow Integration Audit", () => {
  let testUserId: number;
  let testCharacterId: number;
  const createdElementIds: string[] = [];

  beforeAll(async () => {
    // 1. Create real test user in DB
    const [user] = await db
      .insert(users)
      .values({
        uid: "e2e_audit_user_" + nanoid(6),
        email: "e2e_audit@example.com",
        role: "moderator",
      })
      .returning();
    testUserId = user.id;

    // 2. Create real test character in DB with standard initial stats
    const [char] = await db
      .insert(characters)
      .values({
        userId: testUserId,
        name: "E2E Audit Character",
        exp: 100,
        yen: 500,
        profileData: {
          basic_name: "E2E Audit Character",
          FUE: 6,
          DES: 4,
          RES: 5,
          INT: 3,
          VOL: 4,
          VEL: 5,
          salud_actual: 20,
          salud_maxima: 20,
          estamina_actual: 20,
          estamina_maxima: 20,
          barrera: 0,
        },
      })
      .returning();
    testCharacterId = char.id;
  });

  beforeEach(async () => {
    // Clear possessions between tests for clean test isolation
    if (testCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
    }
  });

  afterAll(async () => {
    // Clean up all temporary records created during tests
    if (testCharacterId) {
      await db.delete(elementPossessions).where(eq(elementPossessions.characterId, testCharacterId));
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (createdElementIds.length > 0) {
      await db.delete(elementPossessions).where(inArray(elementPossessions.elementId, createdElementIds));
      await db.delete(systemElements).where(inArray(systemElements.id, createdElementIds));
    }
  });

  // ==========================================================================
  // Test E2E 1 — Debilidad funcional completa
  // ==========================================================================
  it("E2E 1: debilidad reactiva persistida en Catálogo se asigna al personaje, se hidrata y ejecuta al recibir daño", async () => {
    // 1. Crear elemento debilidad en Catálogo (DB) con mechanicalBehaviors
    const weaknessElement = await upsertElement({
      kind: "weakness",
      name: "Debilidad Sensibilidad Neuromuscular",
      description: "Al recibir daño, sufre una pérdida refleja de 2 puntos de Estamina.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_e2e_weakness_recoil",
          name: "Espasmo al impacto",
          mode: "reactive",
          timing: "on_activation",
          trigger: {
            kind: "receive_damage",
            description: "Al recibir daño",
          },
          target: { type: "self" },
          effects: [
            {
              id: "eff_recoil_es",
              type: "resource_modifier",
              resourceId: "ES",
              amount: -2,
              operation: "add",
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(weaknessElement.id);

    // 2. Asignar al personaje vía elementPossessions en DB
    await db.insert(elementPossessions).values({
      id: nanoid(10),
      characterId: testCharacterId,
      elementId: weaknessElement.id,
      quantity: 1,
    });

    // 3. Cargar personaje completo con sus posesiones desde la base de datos
    const loadedPossessions = await getCharacterPossessions(testCharacterId);
    const rawCharacter = await getCharacterById(testCharacterId);
    const characterWithPossessions = {
      ...rawCharacter!,
      possessions: loadedPossessions,
    };

    // Verificar que la debilidad llegó completa desde la DB
    const assignedWeakness = loadedPossessions.find((p) => p.element.id === weaknessElement.id);
    expect(assignedWeakness).toBeDefined();
    expect(assignedWeakness?.element.name).toBe("Debilidad Sensibilidad Neuromuscular");
    expect(shouldUseMechanicalBehaviorRuntime(assignedWeakness!.element)).toBe(true);

    // 4. Crear participante de combate a partir del personaje cargado
    const entityId = `char_${testCharacterId}`;
    const initialWorld = {
      [entityId]: buildCharacterRuleEntityState(characterWithPossessions),
    };
    const encounter = createEncounterRuntimeState();

    // 5. Resolver behaviors del personaje hidratado
    const ownedBehaviors = resolveCharacterMechanicalBehaviors(characterWithPossessions);
    expect(ownedBehaviors).toHaveLength(1);
    expect(ownedBehaviors[0].behavior.id).toBe("bhv_e2e_weakness_recoil");

    // Verificar estado inicial de recursos
    expect(initialWorld[entityId].resources.SA.current).toBe(20);
    expect(initialWorld[entityId].resources.ES.current).toBe(20);

    // 6. Simular acción que genera receive_damage contra el personaje
    // Ejecutamos damage pipeline (5 de daño base directo a SA)
    const damageResult = processDamagePipeline({
      baseDamage: 5,
      targetId: entityId,
      world: initialWorld,
      encounter,
    });
    expect(damageResult.finalDamage).toBe(5);
    expect(damageResult.newWorld[entityId].resources.SA.current).toBe(15);

    // Disparamos el evento mecánico receive_damage con los behaviors resueltos del personaje
    const dispatchResult = dispatchMechanicalEvent({
      event: {
        id: "evt_damage_taken_1",
        type: "receive_damage",
        targetEntityId: entityId,
        payload: { damageAmount: 5 },
      },
      world: damageResult.newWorld,
      encounter,
      ownedBehaviorsByEntity: { [entityId]: ownedBehaviors },
    });

    // 7. Verificar que el runtime ejecutó el behavior de la debilidad
    expect(dispatchResult.executedBehaviors).toHaveLength(1);
    expect(dispatchResult.executedBehaviors[0].behaviorId).toBe("bhv_e2e_weakness_recoil");
    expect(dispatchResult.executedBehaviors[0].success).toBe(true);

    // 8. Verificar que el estado resultante refleja el efecto (-2 ES por la debilidad)
    expect(dispatchResult.newWorld[entityId].resources.SA.current).toBe(15);
    expect(dispatchResult.newWorld[entityId].resources.ES.current).toBe(18); // 20 - 2 = 18
  });

  // ==========================================================================
  // Test E2E 2 — Técnica con coste aumentado
  // ==========================================================================
  it("E2E 2: técnica de Catálogo y debilidad de coste continuo calculan coste efectivo con modificación", async () => {
    // 1. Crear técnica en Catálogo con mechanicalBehaviors
    const techniqueElement = await upsertElement({
      kind: "technique_entitlement",
      name: "Técnica Impacto Sónico",
      description: "Golpe cargado de alta frecuencia.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_tech_sonic_impact",
          name: "Impacto Sónico",
          mode: "active",
          timing: "on_activation",
          target: { type: "enemy" },
          effects: [
            {
              id: "eff_tech_damage",
              type: "damage",
              dice: "6",
              damageType: "physical",
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(techniqueElement.id);

    // 2. Crear debilidad en Catálogo que aumenta el coste de técnicas (+2 ES)
    const costWeakness = await upsertElement({
      kind: "weakness",
      name: "Debilidad Ineficiencia Energética",
      description: "Todas las técnicas requieren 2 puntos adicionales de Estamina.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_cost_penalty",
          name: "Ineficiencia Técnica",
          mode: "continuous",
          timing: "passive",
          target: { type: "self" },
          effects: [
            {
              id: "eff_cost_mod",
              type: "cost_modifier",
              scopeId: "technique",
              amount: 2,
              operation: "add",
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(costWeakness.id);

    // 3. Asignar técnica y debilidad al personaje en DB
    await db.insert(elementPossessions).values([
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: techniqueElement.id,
        quantity: 1,
      },
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: costWeakness.id,
        quantity: 1,
      },
    ]);

    // 4. Cargar personaje desde DB y resolver behaviors
    const loadedPossessions = await getCharacterPossessions(testCharacterId);
    const rawCharacter = await getCharacterById(testCharacterId);
    const character = { ...rawCharacter!, possessions: loadedPossessions };

    const ownedBehaviors = resolveCharacterMechanicalBehaviors(character);
    expect(ownedBehaviors.some((b) => b.behavior.id === "bhv_tech_sonic_impact")).toBe(true);
    expect(ownedBehaviors.some((b) => b.behavior.id === "bhv_cost_penalty")).toBe(true);

    // 5. Evaluar modificadores continuos activos para el participante
    const entityId = `char_${testCharacterId}`;
    const entityState = buildCharacterRuleEntityState(character);
    const encounter = createEncounterRuntimeState();
    const participant = encounter.participants[entityId];

    const continuousMods = getActiveContinuousModifiers(ownedBehaviors, entityState, participant);
    expect(continuousMods.costModifiers).toHaveLength(1);
    expect(continuousMods.costModifiers[0]).toEqual({
      scopeId: "technique",
      amount: 2,
      operation: "add",
    });

    // 6. Calcular coste efectivo de la técnica para este personaje
    const baseCost = 4;
    const effectiveCostResult = calculateEffectiveCost({
      baseCost,
      scope: "technique",
      entityId,
      encounter,
      continuousModifiers: continuousMods.costModifiers,
      minimum: 1,
    });

    // 7. Verificar que el coste refleja la debilidad: 4 base + 2 penalizador = 6 ES
    expect(effectiveCostResult.effectiveCost).toBe(6);
  });

  // ==========================================================================
  // Test E2E 3 — Comportamiento continuo condicional
  // ==========================================================================
  it("E2E 3: debilidad continua condicional (ES < 50%) se activa dinámicamente según el recurso real", async () => {
    // 1. Crear debilidad condicional en Catálogo: mientras ES < 50%, -2 a tiradas de acción
    const conditionalWeakness = await upsertElement({
      kind: "weakness",
      name: "Debilidad Agotamiento Motor",
      description: "Cuando la Estamina cae por debajo del 50%, sufre un penalizador de -2 a tiradas.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_exhaustion_penalty",
          name: "Agotamiento Severo",
          mode: "continuous",
          timing: "passive",
          conditions: [
            {
              type: "percentage",
              resourceId: "ES",
              comparison: "<",
              percent: 50,
            },
          ],
          target: { type: "self" },
          effects: [
            {
              id: "eff_roll_penalty",
              type: "roll_modifier",
              rollType: "action_roll",
              amount: -2,
              operation: "add",
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(conditionalWeakness.id);

    // 2. Asignar debilidad al personaje en DB
    await db.insert(elementPossessions).values({
      id: nanoid(10),
      characterId: testCharacterId,
      elementId: conditionalWeakness.id,
      quantity: 1,
    });

    // 3. Cargar personaje desde DB y resolver behaviors
    const loadedPossessions = await getCharacterPossessions(testCharacterId);
    const rawCharacter = await getCharacterById(testCharacterId);
    const character = { ...rawCharacter!, possessions: loadedPossessions };
    const ownedBehaviors = resolveCharacterMechanicalBehaviors(character);

    const entityId = `char_${testCharacterId}`;
    const encounter = createEncounterRuntimeState();
    const participant = encounter.participants[entityId];

    // Caso A: ES al 100% (20/20 = 100% >= 50%) -> La condición NO se cumple
    const fullState = buildCharacterRuleEntityState(character, {
      resources: {
        SA: { current: 20, max: 20 },
        ES: { current: 20, max: 20 },
      },
    });
    const modsFull = getActiveContinuousModifiers(ownedBehaviors, fullState, participant);
    expect(modsFull.rollModifiers).toHaveLength(0); // Sin penalizador

    // Caso B: Reducir ES al 40% (8/20 = 40% < 50%) -> La condición SE cumple
    const exhaustedState = buildCharacterRuleEntityState(character, {
      resources: {
        SA: { current: 20, max: 20 },
        ES: { current: 8, max: 20 },
      },
    });
    const modsExhausted = getActiveContinuousModifiers(ownedBehaviors, exhaustedState, participant);
    expect(modsExhausted.rollModifiers).toHaveLength(1);
    expect(modsExhausted.rollModifiers[0]).toEqual({
      rollType: "action_roll",
      amount: -2,
      operation: "add",
    });
  });

  // ==========================================================================
  // Test E2E 4 — PendingModifier consumible
  // ==========================================================================
  it("E2E 4: debilidad reactiva genera pendingModifier upon receive_damage que se consume en la siguiente tirada", async () => {
    // 1. Crear debilidad reactiva en Catálogo que genera un modificador pendiente al recibir daño
    const reactiveWeakness = await upsertElement({
      kind: "weakness",
      name: "Debilidad Desconcierto Post-Impacto",
      description: "Al recibir daño, la siguiente tirada de acción sufre un penalizador de -3.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_post_impact_daze",
          name: "Desconcierto al impacto",
          mode: "reactive",
          timing: "on_activation",
          trigger: { kind: "receive_damage" },
          target: { type: "self" },
          effects: [
            {
              id: "eff_daze_pending",
              type: "roll_modifier",
              rollType: "action_roll",
              amount: -3,
              operation: "add",
              temporality: {
                duration: {
                  type: "until_next_roll",
                },
              },
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(reactiveWeakness.id);

    // 2. Asignar debilidad al personaje en DB
    await db.insert(elementPossessions).values({
      id: nanoid(10),
      characterId: testCharacterId,
      elementId: reactiveWeakness.id,
      quantity: 1,
    });

    // 3. Cargar personaje desde DB y resolver behaviors
    const loadedPossessions = await getCharacterPossessions(testCharacterId);
    const rawCharacter = await getCharacterById(testCharacterId);
    const character = { ...rawCharacter!, possessions: loadedPossessions };
    const ownedBehaviors = resolveCharacterMechanicalBehaviors(character);

    const entityId = `char_${testCharacterId}`;
    let world = {
      [entityId]: buildCharacterRuleEntityState(character),
    };
    let encounter = createEncounterRuntimeState();

    // 4. El personaje recibe daño -> emitir evento receive_damage
    const dispatchRes = dispatchMechanicalEvent({
      event: {
        id: "evt_daze_damage",
        type: "receive_damage",
        targetEntityId: entityId,
        payload: { damageAmount: 4 },
      },
      world,
      encounter,
      ownedBehaviorsByEntity: { [entityId]: ownedBehaviors },
    });

    world = dispatchRes.newWorld;
    encounter = dispatchRes.newEncounter;

    // Verificar que se creó el PendingModifier con duration until_next_roll
    const participantState = encounter.participants[entityId];
    expect(participantState.pendingModifiers).toHaveLength(1);
    const pendingMod = participantState.pendingModifiers[0];
    expect(pendingMod.type).toBe("roll");
    expect(pendingMod.amount).toBe(-3);
    expect(pendingMod.duration).toBe("until_next_roll");
    expect(pendingMod.consumed).toBeFalsy();

    // 5. Primera tirada: consume el modificador pendiente y aplica el penalizador
    const baseRoll = 14;
    const roll1Result = applyRollPendingModifiers(baseRoll, participantState, "action_roll");
    expect(roll1Result.finalRoll).toBe(11); // 14 - 3 = 11
    expect(roll1Result.consumedModifiers).toHaveLength(1);
    expect(participantState.pendingModifiers[0].consumed).toBe(true);

    // 6. Segunda tirada: el modificador ya fue consumido y ya no aplica
    const roll2Result = applyRollPendingModifiers(baseRoll, participantState, "action_roll");
    expect(roll2Result.finalRoll).toBe(14); // Sin penalizador
    expect(roll2Result.consumedModifiers).toHaveLength(0);
  });

  // ==========================================================================
  // Test E2E 5 — Coexistencia legacy
  // ==========================================================================
  it("E2E 5: elemento legacy (effects) y elemento nuevo (mechanicalBehaviors) coexisten sin duplicar ni interferir", async () => {
    // 1. Crear elemento legacy en Catálogo con effects tradicionales
    const categories = createCoreCategories();
    const legacyCategory = categories[0];
    const legacyRule = legacyCategory.rules[0];

    const legacyTrait = await upsertElement({
      kind: "trait",
      name: "Rasgo Legacy Furia",
      description: "Rasgo tradicional configurado con referencias de regla legacy.",
      status: "published",
      effects: [
        {
          applicationId: nanoid(),
          groupId: "Principal",
          mechanicId: legacyCategory.id,
          ruleId: legacyRule.id,
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(legacyTrait.id);

    // 2. Crear elemento nuevo en Catálogo con mechanicalBehaviors
    const newWeakness = await upsertElement({
      kind: "weakness",
      name: "Debilidad Nueva Hiperventilación",
      description: "Debilidad configurada con el runtime de MechanicalBehavior.",
      status: "published",
      mechanicalBehaviors: [
        {
          id: "bhv_hyperventilation",
          name: "Hiperventilación",
          mode: "continuous",
          timing: "passive",
          target: { type: "self" },
          effects: [
            {
              id: "eff_es_drain",
              type: "cost_modifier",
              scopeId: "quirk",
              amount: 1,
              operation: "add",
            },
          ],
        },
      ],
      requirements: { operator: "all", requirements: [] },
    });
    createdElementIds.push(newWeakness.id);

    // 3. Asignar ambos al personaje en DB
    await db.insert(elementPossessions).values([
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: legacyTrait.id,
        quantity: 1,
      },
      {
        id: nanoid(10),
        characterId: testCharacterId,
        elementId: newWeakness.id,
        quantity: 1,
      },
    ]);

    // 4. Cargar personaje desde DB
    const loadedPossessions = await getCharacterPossessions(testCharacterId);
    const rawCharacter = await getCharacterById(testCharacterId);
    const character = { ...rawCharacter!, possessions: loadedPossessions };

    // 5. Verificar partición y precedencia
    const { newElements, legacyElements } = partitionCharacterElements(character);
    expect(newElements.some((e) => e.id === newWeakness.id)).toBe(true);
    expect(legacyElements.some((e) => e.id === legacyTrait.id)).toBe(true);

    // Verificar las guardas de precedencia
    expect(shouldUseMechanicalBehaviorRuntime(legacyTrait)).toBe(false);
    expect(shouldUseMechanicalBehaviorRuntime(newWeakness)).toBe(true);

    // 6. El elemento nuevo se resuelve por el runtime nuevo
    const newBehaviors = resolveCharacterMechanicalBehaviors(character);
    expect(newBehaviors).toHaveLength(1);
    expect(newBehaviors[0].behavior.id).toBe("bhv_hyperventilation");
    // El elemento legacy NO fue capturado por el runtime nuevo
    expect(newBehaviors.some((b) => b.elementId === legacyTrait.id)).toBe(false);

    // 7. El elemento legacy se resuelve por el motor legacy
    const legacyRefs = legacyTrait.effects as any[];
    const legacyResolution = resolveAppliedMechanics(legacyRefs, categories);
    expect(legacyResolution.valid).toBe(true);
    expect(legacyResolution.groups).toHaveLength(1);
    expect(legacyResolution.groups[0].references).toHaveLength(1);
    expect(legacyResolution.groups[0].references[0].mechanicId).toBe(legacyCategory.id);

    // 8. Confirmar que no hay colisión ni interferencia mutua
    expect(legacyResolution.breakdown).toHaveLength(1);
    expect(newBehaviors[0].behavior.effects[0].type).toBe("cost_modifier");
  });
});
