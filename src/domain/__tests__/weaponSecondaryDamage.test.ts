import { describe, it, expect } from "vitest";
import { validateWeaponSemantics } from "../weaponValidation.ts";
import { buildWeaponMechanicalDescription } from "../weaponMechanics.ts";
import { createCoreCategories, getCategoryOptions, getVisibleOptions } from "../coreRuleCatalog.ts";
import { applyRuleOperations, type RuleWorld } from "../ruleExecution.ts";
import type { RuleOperation } from "../ruleEngine.ts";
import { createDefaultMechanicalBehavior, type MechanicalBehavior, type MechanicalEffectItem } from "../mechanicalBehavior.ts";

describe("Soporte Completo para Daño Secundario en Armas", () => {
  const coreMechanics = createCoreCategories();
  const allDamageOptions = getCategoryOptions(coreMechanics, "damage");

  // =========================================================================
  // 1. DADOS INCOMPATIBLES CON DADO BASE Y DAÑO FIJO EN DAÑO SECUNDARIO
  // =========================================================================
  describe("1. Selección de daño secundario y daño fijo", () => {
    it("permite daño secundario con dado (1D6) incompatible con el dado base del arma de fuego (D10)", () => {
      // Un arma de fuego exige dado primario D10 (1D10).
      // Su daño secundario puede ser 1D6 (por ejemplo daño por fuego) sin que el servidor lo rechace.
      const weaponPayload = {
        name: "Rifle Incendiario",
        description: "Rifle de asalto con munición térmica.",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "NONE",
          usesAmmo: true,
          magazineCapacity: 30,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_firearm_attack", "active", "Disparo Térmico"),
            effects: [
              // Daño primario: 1D10 (obligatorio según firearm baseDice D10)
              {
                id: "eff_primary_dmg",
                type: "damage",
                dice: "1D10",
                damageType: "cinetico",
                target: { type: "enemy" },
              },
              // Daño secundario: 1D6 de fuego (incompatible con D10 primario, pero válido en daño secundario)
              {
                id: "eff_secondary_dmg",
                type: "damage",
                dice: "1D6",
                damageType: "fuego",
                target: { type: "enemy" },
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(weaponPayload, coreMechanics);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("permite daño secundario con valor fijo ('2', '4', etc.) definido en las reglas", () => {
      const weaponPayload = {
        name: "Pistola Taser",
        description: "Pistola con descarga eléctrica fija.",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "NONE",
          usesAmmo: true,
          magazineCapacity: 10,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_taser_attack", "active", "Disparo Eléctrico"),
            effects: [
              {
                id: "eff_primary_dmg",
                type: "damage",
                dice: "1D10",
                damageType: "cinetico",
                target: { type: "enemy" },
              },
              // Daño secundario fijo de 4 eléctrico
              {
                id: "eff_fixed_electric",
                type: "damage",
                dice: "4",
                damageType: "electrico",
                target: { type: "enemy" },
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(weaponPayload, coreMechanics);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("el selector de daño secundario dispone de todas las opciones de daño respetando getVisibleOptions", () => {
      // getCategoryOptions(coreMechanics, "damage") contiene dados y daño fijo
      const visibleDamage = getVisibleOptions(allDamageOptions);

      // Contiene dados
      expect(visibleDamage.some((o: any) => o.runtimeKey === "1D4" || o.name === "1D4")).toBe(true);
      expect(visibleDamage.some((o: any) => o.runtimeKey === "1D6" || o.name === "1D6")).toBe(true);
      expect(visibleDamage.some((o: any) => o.runtimeKey === "1D12" || o.name === "1D12")).toBe(true);

      // Contiene daño fijo
      expect(visibleDamage.some((o: any) => o.runtimeKey === "2" || o.name === "2")).toBe(true);
      expect(visibleDamage.some((o: any) => o.runtimeKey === "4" || o.name === "4")).toBe(true);
      expect(visibleDamage.some((o: any) => o.runtimeKey === "6" || o.name === "6")).toBe(true);
      expect(visibleDamage.some((o: any) => o.runtimeKey === "8" || o.name === "8")).toBe(true);
    });
  });

  // =========================================================================
  // 2. VALIDACIÓN DEL SERVIDOR PARA DAÑO PRIMARIO Y SECUNDARIO
  // =========================================================================
  describe("2. Validación del servidor", () => {
    it("continúa rechazando un daño primario incompatible con baseDice", () => {
      const invalidPrimary = {
        name: "Rifle Fallido",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "NONE",
          usesAmmo: true,
          magazineCapacity: 30,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_atk", "active", "Disparo"),
            effects: [
              {
                id: "eff_primary",
                type: "damage",
                dice: "1D6", // Incompatible con baseDice D10 en primario
                damageType: "cinetico",
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(invalidPrimary, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("no coincide con el dado base"))).toBe(true);
    });

    it("rechaza un daño secundario con fórmula de dados inválida o desconocida", () => {
      const invalidSecondary = {
        name: "Rifle con Daño Imposible",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "NONE",
          usesAmmo: true,
          magazineCapacity: 30,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_atk", "active", "Disparo"),
            effects: [
              {
                id: "eff_primary",
                type: "damage",
                dice: "1D10",
                damageType: "cinetico",
              },
              {
                id: "eff_sec_inv",
                type: "damage",
                dice: "999ZAPATOS", // Fórmula inválida
                damageType: "fuego",
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(invalidSecondary, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("daño secundario"))).toBe(true);
    });

    it("rechaza un daño secundario con tipo de daño no canónico", () => {
      const invalidDamageType = {
        name: "Rifle con Tipo Inválido",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "NONE",
          usesAmmo: true,
          magazineCapacity: 30,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_atk", "active", "Disparo"),
            effects: [
              {
                id: "eff_primary",
                type: "damage",
                dice: "1D10",
                damageType: "cinetico",
              },
              {
                id: "eff_sec_inv_type",
                type: "damage",
                dice: "1D6",
                damageType: "tipo_alienigena_desconocido",
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(invalidDamageType, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("tipo de daño secundario"))).toBe(true);
    });
  });

  // =========================================================================
  // 3. DESCRIPCIÓN MECÁNICA DE DAÑO SECUNDARIO
  // =========================================================================
  describe("3. Descripción mecánica", () => {
    it("incluye claramente el daño secundario indicando su fórmula y tipo de daño", () => {
      const description = buildWeaponMechanicalDescription({
        name: "Escopeta Térmica",
        usesAmmo: true,
        magazineCapacity: 8,
        dice: "1D12",
        damageType: "cinetico",
        damageModifier: "NONE",
        secondaryEffects: [
          {
            id: "sec_dmg_fire",
            type: "damage",
            dice: "1D6",
            damageType: "fuego",
          },
          {
            id: "sec_status_burn",
            type: "status_apply",
            statusElementId: "core.status.burn",
            turns: 2,
          },
        ],
        statusOptions: [{ id: "core.status.burn", name: "Quemadura" }],
      });

      expect(description).toContain("Ataque: Inflige 1D12 de daño cinetico contra un enemigo.");
      expect(description).toContain("Al impactar:");
      expect(description).toContain("inflige adicionalmente 1D6 de daño fuego");
      expect(description).toContain("produce Quemadura durante 2 turnos");
    });

    it("describe adecuadamente el daño secundario fijo sin distorsionar el daño principal", () => {
      const description = buildWeaponMechanicalDescription({
        dice: "1D10",
        damageType: "cinetico",
        damageModifier: "NONE",
        secondaryEffects: [
          {
            id: "sec_dmg_fixed",
            type: "damage",
            dice: "4",
            damageType: "electrico",
          },
        ],
      });

      expect(description).toContain("Ataque: Inflige 1D10 de daño cinetico contra un enemigo.");
      expect(description).toContain("inflige adicionalmente 4 de daño electrico");
    });
  });

  // =========================================================================
  // 4. RESOLUCIÓN DE COMBATE EN ruleExecution.ts
  // =========================================================================
  describe("4. Resolución de combate y daño fijo", () => {
    const makeWorld = (targetBarrier = 0, targetHp = 50): RuleWorld => ({
      bearer: {
        id: "bearer",
        resources: { SA: { current: 30, max: 30 }, ES: { current: 30, max: 30 } },
        barrier: 0,
        barriers: [],
        modifiers: [],
        statuses: [],
        attributes: { FUE: 10, DES: 10, RES: 10, INT: 10, VOL: 10, VEL: 10 },
        inventory: {},
      },
      target: {
        id: "target",
        resources: { SA: { current: targetHp, max: targetHp }, ES: { current: 20, max: 20 } },
        barrier: targetBarrier,
        barriers: targetBarrier > 0 ? [{ amount: targetBarrier, sourceId: "armor" }] : [],
        modifiers: [],
        statuses: [],
        attributes: { FUE: 10, DES: 10, RES: 10, INT: 10, VOL: 10, VEL: 10 },
        inventory: {},
      },
    });

    it("aplica daño fijo (ej. 4 de daño) directamente a la Salud sin exigir tiradas de dados en rolls", () => {
      const initialWorld = makeWorld(0, 50);

      const operations: RuleOperation[] = [
        {
          kind: "effect",
          targetId: "target",
          effect: {
            id: "eff_fixed_dmg",
            type: "damage",
            dice: "4", // Daño fijo
          } as any,
        },
      ];

      // Sin pasar ninguna tirada en rolls (objeto vacío {})
      const result = applyRuleOperations(initialWorld, "bearer", "weapon_test", 1, operations, {});

      expect(result.damageDealt).toBe(4);
      expect(result.world.target.resources.SA.current).toBe(46); // 50 - 4 = 46
    });

    it("aplica daño primario por dados y daño secundario fijo en secuencia exacta con mitigación de barrera", () => {
      // Objetivo tiene 5 de barrera y 40 de salud
      const initialWorld = makeWorld(5, 40);

      const operations: RuleOperation[] = [
        // 1. Daño primario (1D10 tirado como 8)
        {
          kind: "effect",
          targetId: "target",
          effect: {
            id: "eff_prim_d10",
            type: "damage",
            dice: "1D10",
          } as any,
        },
        // 2. Daño secundario fijo (4)
        {
          kind: "effect",
          targetId: "target",
          effect: {
            id: "eff_sec_fixed_4",
            type: "damage",
            dice: "4",
          } as any,
        },
      ];

      const rolls = {
        eff_prim_d10: [8], // 8 de daño tirado
      };

      const result = applyRuleOperations(initialWorld, "bearer", "weapon_test", 1, operations, rolls);

      // Daño primario: 8. Absorbe 5 de barrera, pasan 3 a SA. Barrera queda en 0.
      // Daño secundario: 4. Barrera es 0, pasan 4 a SA.
      // Total daño infligido = 3 + 4 = 7.
      // Salud final = 40 - 7 = 33.
      expect(result.world.target.barrier).toBe(0);
      expect(result.damageDealt).toBe(7);
      expect(result.world.target.resources.SA.current).toBe(33);
    });

    it("aplica daño primario y daño secundario por dados aplicando cada efecto una sola vez al objetivo", () => {
      const initialWorld = makeWorld(0, 60);

      const operations: RuleOperation[] = [
        {
          kind: "effect",
          targetId: "target",
          effect: { id: "eff_dmg_1", type: "damage", dice: "1D10" } as any,
        },
        {
          kind: "effect",
          targetId: "target",
          effect: { id: "eff_dmg_2", type: "damage", dice: "1D6" } as any,
        },
      ];

      const rolls = {
        eff_dmg_1: [7],
        eff_dmg_2: [5],
      };

      const result = applyRuleOperations(initialWorld, "bearer", "weapon_test", 1, operations, rolls);
      expect(result.damageDealt).toBe(12); // 7 + 5
      expect(result.world.target.resources.SA.current).toBe(48); // 60 - 12
    });
  });

  // =========================================================================
  // 5. PRESERVACIÓN DE EFECTOS EXISTENTES AL EDITAR
  // =========================================================================
  describe("5. Preservación y coexistencia de efectos", () => {
    it("conserva intactos efectos secundarios de daño, estados y penalizadores preexistentes al modificar el daño primario", () => {
      const primaryAttack: MechanicalEffectItem = {
        id: "eff_primary",
        type: "damage",
        dice: "1D10",
        damageType: "cinetico",
      };

      const secondaryDmg: MechanicalEffectItem = {
        id: "eff_sec_dmg",
        type: "damage",
        dice: "1D6",
        damageType: "fuego",
      };

      const secondaryStatus: MechanicalEffectItem = {
        id: "eff_sec_status",
        type: "status_apply",
        statusElementId: "core.status.burn",
        turns: 2,
      };

      const secondaryPenalty: MechanicalEffectItem = {
        id: "eff_sec_pen",
        type: "penalty",
        targetStat: "EVA",
        amount: 1,
        operation: "subtract",
      };

      const allEffects = [primaryAttack, secondaryDmg, secondaryStatus, secondaryPenalty];

      // Simulamos la separación en WeaponMechanicalEffectsEditor:
      const primaryDamage = allEffects.find(e => e.type === "damage") || null;
      expect(primaryDamage?.id).toBe("eff_primary");

      const secondaryEffects = allEffects.filter(e => e !== primaryDamage && e.id !== primaryDamage?.id);

      // Debe contener 3 efectos secundarios (incluido el daño secundario)
      expect(secondaryEffects).toHaveLength(3);
      expect(secondaryEffects.find(e => e.id === "eff_sec_dmg")).toBeDefined();
      expect(secondaryEffects.find(e => e.id === "eff_sec_status")).toBeDefined();
      expect(secondaryEffects.find(e => e.id === "eff_sec_pen")).toBeDefined();

      // Al actualizar el daño primario (ej. a 2D10) y recomponer los efectos:
      const updatedPrimary: MechanicalEffectItem = {
        ...primaryDamage!,
        dice: "2D10",
      };

      const finalEffects = [updatedPrimary, ...secondaryEffects];
      expect(finalEffects).toHaveLength(4);
      expect((finalEffects[0] as any).dice).toBe("2D10");
      expect((finalEffects[1] as any).dice).toBe("1D6");
      expect((finalEffects[1] as any).damageType).toBe("fuego");
      expect(finalEffects[2].type).toBe("status_apply");
      expect(finalEffects[3].type).toBe("penalty");
    });
  });
});
