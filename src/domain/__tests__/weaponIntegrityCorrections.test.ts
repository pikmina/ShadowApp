import { describe, expect, it } from "vitest";
import { mergeElementMetadata } from "../../db/elements";
import { getVisibleOptions } from "../coreRuleCatalog";
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from "../mechanicalBehavior";

describe("Fase 4, Etapa B: Correcciones de Integridad de Datos de Armas", () => {
  describe("1. Semántica de Fusión de Metadata (mergeElementMetadata)", () => {
    it("preserva los metadatos existentes intactos si el patch es undefined", () => {
      const existing = {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
        usesAmmo: true,
        magazineCapacity: 12,
        mechanicalDescription: "Descripción mecánica generada",
      };

      const result = mergeElementMetadata(existing, undefined);
      expect(result).toEqual(existing);
      // Debe ser una copia nueva, no la misma referencia mutable
      expect(result).not.toBe(existing);
    });

    it("conserva propiedades anteriores no modificadas ante una actualización parcial", () => {
      const existing = {
        weaponTypeId: "heavy_weapon",
        baseDice: "D12",
        damageModifier: "FUE",
        usesAmmo: false,
        mechanicalDescription: "Ataque pesado",
        customMod: "militar",
      };

      const patch = {
        magazineCapacity: 30,
        author: "Técnico de Armería",
      };

      const result = mergeElementMetadata(existing, patch);
      expect(result).toEqual({
        weaponTypeId: "heavy_weapon",
        baseDice: "D12",
        damageModifier: "FUE",
        usesAmmo: false,
        mechanicalDescription: "Ataque pesado",
        customMod: "militar",
        magazineCapacity: 30,
        author: "Técnico de Armería",
      });
    });

    it("permite eliminar una propiedad cuando se envía expresamente con valor null", () => {
      const existing = {
        weaponTypeId: "firearm",
        baseDice: "D10",
        temporaryTag: "experimental-tag",
        deprecatedField: "obsoleto",
        keepMe: "permanente",
      };

      const patch = {
        temporaryTag: null,
        deprecatedField: null,
      };

      const result = mergeElementMetadata(existing, patch);
      expect(result).toEqual({
        weaponTypeId: "firearm",
        baseDice: "D10",
        keepMe: "permanente",
      });
      expect(result).not.toHaveProperty("temporaryTag");
      expect(result).not.toHaveProperty("deprecatedField");
    });

    it("no sobrescribe valores existentes con undefined (AGENTS.md)", () => {
      const existing = {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
      };

      const patch = {
        baseDice: undefined,
        damageModifier: "DES",
      };

      const result = mergeElementMetadata(existing, patch);
      expect(result.baseDice).toBe("D10");
      expect(result.damageModifier).toBe("DES");
    });

    it("preserva valores falsy válidos (0, false, '') sin tratarlos como missing (AGENTS.md Phase 6)", () => {
      const existing = {
        usesAmmo: true,
        magazineCapacity: 12,
        customLabel: "Texto",
      };

      const patch = {
        usesAmmo: false,
        magazineCapacity: 0,
        customLabel: "",
      };

      const result = mergeElementMetadata(existing, patch);
      expect(result.usesAmmo).toBe(false);
      expect(result.magazineCapacity).toBe(0);
      expect(result.customLabel).toBe("");
    });

    it("maneja creación desde cero cuando existingMeta es undefined", () => {
      const patch = {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
        usesAmmo: true,
        magazineCapacity: 15,
      };

      const result = mergeElementMetadata(undefined, patch);
      expect(result).toEqual(patch);
    });

    it("retorna objeto vacío si ambos parámetros son undefined o inválidos", () => {
      expect(mergeElementMetadata(undefined, undefined)).toEqual({});
      expect(mergeElementMetadata(null, undefined)).toEqual({});
    });
  });

  describe("2. Preservación de Comportamientos No Gestionados (unmanagedBehaviors)", () => {
    it("conserva comportamientos pasivos, triggers o especiales al actualizar ataque primario", () => {
      const activeAttack: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_active_1", "active", "Disparo"),
        effects: [{ id: "eff_1", type: "damage", dice: "1D10" }],
      };

      const passiveEquipped: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_equipped_1", "continuous", "Modificadores al Equipar"),
        conditions: [{ type: "equipped" }],
        effects: [{ id: "eff_2", type: "penalty", targetStat: "EVA", amount: 1, operation: "subtract" }],
      };

      const specialTriggerBehavior: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_special_trigger", "reactive", "Contragolpe Táctico"),
        trigger: { description: "Al esquivar un ataque enemigo" },
        effects: [{ id: "eff_3", type: "damage", dice: "1D6" }],
      };

      const allBehaviors = [activeAttack, passiveEquipped, specialTriggerBehavior];

      // Simulamos la lógica de aislamiento y preservación de WeaponMechanicalEffectsEditor:
      const primaryBehavior = allBehaviors.find(b => b.mode === "active") || null;
      const equippedBehavior = allBehaviors.find(b => b.mode === "continuous" && b.conditions?.some(c => c.type === "equipped")) || null;

      expect(primaryBehavior?.id).toBe("beh_active_1");
      expect(equippedBehavior?.id).toBe("beh_equipped_1");

      const activeId = primaryBehavior!.id;
      const unmanagedBehaviors = allBehaviors.filter(
        b => b !== primaryBehavior && b !== equippedBehavior && b.id !== activeId && b.id !== equippedBehavior?.id
      );

      expect(unmanagedBehaviors).toHaveLength(1);
      expect(unmanagedBehaviors[0].id).toBe("beh_special_trigger");
      expect(unmanagedBehaviors[0].name).toBe("Contragolpe Táctico");
    });

    it("no confunde un comportamiento continuo con el ataque activo si no hay comportamiento activo", () => {
      const passiveOnly: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_passive_only", "continuous", "Aura Táctica"),
        effects: [{ id: "eff_aura", type: "bonus", targetStat: "INI", amount: 1, operation: "add" }],
      };

      const behaviors = [passiveOnly];
      const primaryBehavior = behaviors.find(b => b.mode === "active") || null;
      expect(primaryBehavior).toBeNull();
    });
  });

  describe("3. Filtrado de Disponibilidad (isAvailable) y Referencias Históricas", () => {
    const sampleOptions = [
      { id: "opt_1", runtimeKey: "fisico", name: "Físico", isAvailable: true },
      { id: "opt_2", runtimeKey: "balistico", name: "Balístico", isAvailable: false },
      { id: "opt_3", runtimeKey: "energetico", name: "Energético" }, // undefined es considerado disponible
      { id: "opt_4", runtimeKey: "plasma", name: "Plasma Obsoleto", isAvailable: false },
    ];

    it("excluye opciones deshabilitadas (isAvailable === false) para selecciones nuevas", () => {
      const visible = getVisibleOptions(sampleOptions);
      expect(visible.map(o => o.runtimeKey)).toEqual(["fisico", "energetico"]);
    });

    it("preserva la opción histórica deshabilitada si coincide con el valor actual", () => {
      const visible = getVisibleOptions(sampleOptions, "balistico");
      expect(visible.map(o => o.runtimeKey)).toEqual(["fisico", "balistico", "energetico"]);
    });

    it("preserva la opción histórica deshabilitada por ID si coincide con currentValue", () => {
      const visible = getVisibleOptions(sampleOptions, "opt_4");
      expect(visible.map(o => o.runtimeKey)).toEqual(["fisico", "energetico", "plasma"]);
    });
  });
});
