import { describe, it, expect } from "vitest";
import {
  validateWeaponSemantics,
  CANONICAL_ATTRIBUTES,
  CANONICAL_DERIVED_STATS,
  CANONICAL_DAMAGE_TYPES,
} from "../weaponValidation.ts";
import { buildWeaponMechanicalDescription } from "../weaponMechanics.ts";
import { createCoreCategories, getCategoryOptions, getVisibleOptions } from "../coreRuleCatalog.ts";
import { mergeElementMetadata } from "../../db/elements.ts";
import { calculateEquipmentBonuses } from "../../lib/characterValidation.ts";
import { createDefaultMechanicalBehavior, type MechanicalBehavior } from "../mechanicalBehavior.ts";

describe("Fase 5: Regresión y Certificación Integral del Formulario de Armas", () => {
  const coreMechanics = createCoreCategories();
  const weaponTypeOptions = getCategoryOptions(coreMechanics, "weapon_type");

  // =========================================================================
  // SUITE A: CREACIÓN DE ARMAS
  // =========================================================================
  describe("A. Creación de Armas", () => {
    it("crea un arma válida con valores canónicos de su tipo (firearm) y efectos mecánicos coherentes", () => {
      const firearmOpt = weaponTypeOptions.find((o: any) => o.runtimeKey === "firearm" || o.id === "firearm");
      expect(firearmOpt).toBeDefined();
      const firearmComp = firearmOpt!.component as any;
      expect(firearmComp.baseDice).toBe("D10");
      expect(firearmComp.damageModifier).toBe("NONE");
      expect(firearmComp.usesAmmo).toBe(true);

      const weaponPayload = {
        name: "Pistola Táctica 9mm",
        description: "Pistola estándar de fuerzas de seguridad.",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: firearmComp.baseDice, // "D10"
          damageModifier: firearmComp.damageModifier, // "NONE"
          usesAmmo: firearmComp.usesAmmo, // true
          magazineCapacity: 15,
          range: "Medio (25m)",
          mechanicalDescription: "",
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_firearm_attack", "active", "Disparo"),
            effects: [
              {
                id: "eff_dmg_1",
                type: "damage",
                dice: "1D10",
                damageType: "cinetico",
              },
            ],
          },
        ],
      };

      // Generar descripción mecánica canónica
      weaponPayload.metadata.mechanicalDescription = buildWeaponMechanicalDescription({
        dice: "1D10",
        damageType: "cinetico",
        damageModifier: weaponPayload.metadata.damageModifier,
        usesAmmo: weaponPayload.metadata.usesAmmo,
        magazineCapacity: weaponPayload.metadata.magazineCapacity,
      });

      const validation = validateWeaponSemantics(weaponPayload, coreMechanics);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(weaponPayload.metadata.baseDice).toBe("D10");
      expect(weaponPayload.metadata.damageModifier).toBe("NONE");
      expect(weaponPayload.metadata.usesAmmo).toBe(true);
      expect(weaponPayload.metadata.mechanicalDescription).toContain("D10");
      expect(weaponPayload.metadata.mechanicalDescription).toContain("cinetico");
    });

    it("crea un arma ligera con modificador de atributo canónico (DES) y dado canónico (D6)", () => {
      const lightOpt = weaponTypeOptions.find((o: any) => o.runtimeKey === "light_weapon" || o.id === "light_weapon");
      expect(lightOpt).toBeDefined();
      const lightComp = lightOpt!.component as any;

      const weaponPayload = {
        name: "Cuchillo de Combate",
        description: "Hoja de acero templado.",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "light_weapon",
          baseDice: lightComp.baseDice, // "D6"
          damageModifier: lightComp.damageModifier, // "DES"
          usesAmmo: lightComp.usesAmmo, // false
          range: "Cuerpo a cuerpo",
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_knife_attack", "active", "Ataque Cortante"),
            effects: [
              {
                id: "eff_dmg_knife",
                type: "damage",
                dice: "1D6",
                damageType: "cortante",
              },
            ],
          },
        ],
      };

      const validation = validateWeaponSemantics(weaponPayload, coreMechanics);
      expect(validation.valid).toBe(true);
      expect(weaponPayload.metadata.damageModifier).toBe("DES");
      expect(weaponPayload.metadata.usesAmmo).toBe(false);
    });

    it("permite configuraciones incompletas en estado Borrador (draft) sin exigir mecánicas definitivas", () => {
      const incompleteDraft = {
        name: "Prototipo en Diseño",
        description: "Boceto conceptual sin mecánicas.",
        kind: "weapon" as const,
        status: "draft" as const,
        metadata: {
          notes: "Pendiente asignación de calibre",
        },
        mechanicalBehaviors: [],
      };

      const validation = validateWeaponSemantics(incompleteDraft, coreMechanics);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("rechaza la publicación (published) de un arma sin tipo ni comportamientos mecánicos", () => {
      const incompletePublished = {
        name: "Arma Incompleta",
        description: "Sin datos mecánicos obligatorios.",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {},
        mechanicalBehaviors: [],
      };

      const validation = validateWeaponSemantics(incompletePublished, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("tipo de arma"))).toBe(true);
    });
  });

  // =========================================================================
  // SUITE B: EDICIÓN Y PRESERVACIÓN DE DATOS
  // =========================================================================
  describe("B. Edición y Preservación de Datos", () => {
    it("modificar un campo en metadata preserva los campos no relacionados", () => {
      const existingWeaponMeta = {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
        usesAmmo: true,
        magazineCapacity: 12,
        range: "Medio",
        mechanicalDescription: "1D10 balistico",
        designerNotes: "Calibre reglamentario",
      };

      const patch = {
        magazineCapacity: 24,
      };

      const merged = mergeElementMetadata(existingWeaponMeta, patch);
      expect(merged.magazineCapacity).toBe(24);
      expect(merged.weaponTypeId).toBe("firearm");
      expect(merged.baseDice).toBe("D10");
      expect(merged.damageModifier).toBe("NONE");
      expect(merged.usesAmmo).toBe(true);
      expect(merged.range).toBe("Medio");
      expect(merged.mechanicalDescription).toBe("1D10 balistico");
      expect(merged.designerNotes).toBe("Calibre reglamentario");
    });

    it("mantiene la distinción estricta entre descripción narrativa y metadata.mechanicalDescription", () => {
      const existing = {
        name: "Subfusil MP-9",
        description: "Arma ligera diseñada para combate en espacios cerrados en el sector bajo.",
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          mechanicalDescription: "Ataque estándar 1D10 balístico. Munición: 30 balas.",
        },
      };

      // Edición de la descripción narrativa
      const updatedDescription = "Arma ligera reacondicionada por bandas del Distrito 4.";
      const updatedElement = {
        ...existing,
        description: updatedDescription,
        metadata: mergeElementMetadata(existing.metadata, {
          // No se toca mechanicalDescription
        }),
      };

      expect(updatedElement.description).toBe(updatedDescription);
      expect(updatedElement.metadata.mechanicalDescription).toBe(
        "Ataque estándar 1D10 balístico. Munición: 30 balas."
      );
      expect(updatedElement.description).not.toBe(updatedElement.metadata.mechanicalDescription);
    });

    it("preserva comportamientos mecánicos adicionales no gestionados por el editor simplificado al editar el ataque primario", () => {
      const primaryAttack: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_primary_atk", "active", "Disparo Estándar"),
        effects: [{ id: "eff_dmg", type: "damage", dice: "1D10", damageType: "balistico" }],
      };

      const equippedBonus: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_equipped_bonus", "continuous", "Mira Láser Integrada"),
        conditions: [{ type: "equipped" }],
        effects: [{ id: "eff_bonus_ini", type: "derived_stat_modifier", statId: "INI", amount: 1, operation: "add" }],
      };

      const customBurstMode: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_burst_mode", "active", "Ráfaga de 3 Disparos"),
        limitations: [{ id: "lim_burst_usage", type: "usage_limit", max: 3, period: "scene" as any }],
        effects: [{ id: "eff_burst_dmg", type: "damage", dice: "2D10", damageType: "cinetico" }],
      };

      const reactiveContragolpe: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("beh_reactive_counter", "reactive", "Reacción Defensiva"),
        trigger: { description: "Al esquivar con éxito a quemarropa" },
        effects: [{ id: "eff_counter_dmg", type: "damage", dice: "1D4", damageType: "fisico" }],
      };

      const existingBehaviors = [primaryAttack, equippedBonus, customBurstMode, reactiveContragolpe];

      // Simulamos la lógica del editor de armas al editar únicamente el daño del primaryAttack:
      const activeAttack = existingBehaviors.find(b => b.mode === "active");
      const equippedBeh = existingBehaviors.find(b => b.mode === "continuous" && b.conditions?.some(c => c.type === "equipped"));

      const unmanagedBehaviors = existingBehaviors.filter(
        b => b !== activeAttack && b !== equippedBeh && b.id !== activeAttack?.id && b.id !== equippedBeh?.id
      );

      // Creamos la versión editada del primary attack (modificando daño a 1D12)
      const editedPrimaryAttack = {
        ...activeAttack!,
        effects: [{ id: "eff_dmg", type: "damage", dice: "1D12", damageType: "balistico" }],
      };

      // Reconstruimos la lista según la regla de compromiso
      const finalCommittedBehaviors = [
        editedPrimaryAttack,
        equippedBeh!,
        ...unmanagedBehaviors,
      ];

      expect(finalCommittedBehaviors).toHaveLength(4);
      expect(finalCommittedBehaviors[0].id).toBe("beh_primary_atk");
      expect((finalCommittedBehaviors[0].effects[0] as any).dice).toBe("1D12");
      expect(finalCommittedBehaviors.find(b => b.id === "beh_burst_mode")).toBeDefined();
      expect(finalCommittedBehaviors.find(b => b.id === "beh_reactive_counter")).toBeDefined();
    });
  });

  // =========================================================================
  // SUITE C: PERSISTENCIA, RECARGA Y VALORES LÍMITE
  // =========================================================================
  describe("C. Persistencia, Recarga y Valores Límite", () => {
    it("respeta y preserva valores válidos 0, false y '' (cadena vacía) sin reemplazarlos por fallbacks", () => {
      const initialMeta = {
        usesAmmo: false,
        magazineCapacity: 0,
        damageBonus: 0,
        emptyNotes: "",
        weaponTypeId: "light_weapon",
      };

      // Simular guardado y recarga serializando / deserializando
      const serialized = JSON.stringify(initialMeta);
      const reloaded = JSON.parse(serialized);

      expect(reloaded.usesAmmo).toBe(false);
      expect(reloaded.magazineCapacity).toBe(0);
      expect(reloaded.damageBonus).toBe(0);
      expect(reloaded.emptyNotes).toBe("");

      // Modificación parcial preservando los valores falsy existentes
      const patch = { customLabel: "Nueva etiqueta" };
      const merged = mergeElementMetadata(reloaded, patch);

      expect(merged.usesAmmo).toBe(false);
      expect(merged.magazineCapacity).toBe(0);
      expect(merged.damageBonus).toBe(0);
      expect(merged.emptyNotes).toBe("");
      expect(merged.customLabel).toBe("Nueva etiqueta");
    });

    it("conserva opciones históricas deshabilitadas (isAvailable: false) sin habilitarlas para nuevas selecciones", () => {
      const damageTypes = [
        { id: "dt_phys", runtimeKey: "fisico", name: "Físico", isAvailable: true },
        { id: "dt_plasma", runtimeKey: "plasma_v1", name: "Plasma Obsoleto", isAvailable: false },
        { id: "dt_energy", runtimeKey: "energetico", name: "Energético", isAvailable: true },
      ];

      // Caso 1: Nueva selección (no hay valor asignado aún) -> la opción obsoleta queda excluida
      const newSelections = getVisibleOptions(damageTypes);
      expect(newSelections.map(o => o.runtimeKey)).toEqual(["fisico", "energetico"]);
      expect(newSelections.some(o => o.runtimeKey === "plasma_v1")).toBe(false);

      // Caso 2: Registro histórico que ya tiene asignado 'plasma_v1' -> la opción se mantiene visible para inspección/edición
      const historicalSelections = getVisibleOptions(damageTypes, "plasma_v1");
      expect(historicalSelections.some(o => o.runtimeKey === "plasma_v1")).toBe(true);
      expect(historicalSelections.map(o => o.runtimeKey)).toEqual(["fisico", "plasma_v1", "energetico"]);
    });
  });

  // =========================================================================
  // SUITE D: INVENTARIO, EQUIPAMIENTO Y PROCESAMIENTO MECÁNICO
  // =========================================================================
  describe("D. Inventario y Equipamiento", () => {
    const weaponElement = {
      id: "weapon_combat_shotgun",
      name: "Escopeta de Trinchera",
      kind: "weapon",
      mechanicalBehaviors: [
        {
          id: "beh_shotgun_attack",
          name: "Disparo de Perdigones",
          mode: "active",
          effects: [{ id: "eff_shotgun_dmg", type: "damage", dice: "1D12", damageType: "balistico" }],
        },
        {
          id: "beh_shotgun_recoil_penalty",
          name: "Peso y Retroceso",
          mode: "continuous",
          conditions: [{ type: "equipped" }],
          effects: [
            {
              id: "eff_eva_penalty",
              type: "derived_stat_modifier",
              statId: "EVA",
              amount: -1,
              operation: "subtract",
            },
            {
              id: "eff_fue_requirement_bonus",
              type: "attribute_modifier",
              attributeId: "FUE",
              amount: 1,
              operation: "add",
            },
          ],
        },
      ],
    };

    it("procesa modificadores continuos al equipar un arma (equipped === true)", () => {
      const possessions = [
        {
          elementId: weaponElement.id,
          element: weaponElement,
          equipped: true,
          quantity: 1,
        },
      ];

      const bonuses = calculateEquipmentBonuses(possessions, [weaponElement]);
      expect(bonuses.byDerived.evasion).toBe(-1);
      expect(bonuses.byAttr.FUE).toBe(1);
      expect(bonuses.sourcesByDerived.evasion).toHaveLength(1);
      expect(bonuses.sourcesByDerived.evasion[0].name).toBe("Escopeta de Trinchera");
      expect(bonuses.sourcesByAttr.FUE).toHaveLength(1);
    });

    it("anula los modificadores al desequipar el arma (equipped === false) sin alterar su configuración", () => {
      const unequippedPossessions = [
        {
          elementId: weaponElement.id,
          element: weaponElement,
          equipped: false,
          quantity: 1,
        },
      ];

      const bonuses = calculateEquipmentBonuses(unequippedPossessions, [weaponElement]);
      expect(bonuses.byDerived.evasion).toBe(0);
      expect(bonuses.byAttr.FUE).toBe(0);
      expect(bonuses.sourcesByDerived.evasion).toHaveLength(0);
      expect(bonuses.sourcesByAttr.FUE).toHaveLength(0);

      // La configuración del elemento sigue intacta:
      expect(weaponElement.mechanicalBehaviors).toHaveLength(2);
      expect(weaponElement.mechanicalBehaviors[1].effects).toHaveLength(2);
    });

    it("no duplica modificadores si el elemento contiene referencias y comportamientos simultáneos", () => {
      const elementWithBehaviorsAndDirectEffects = {
        ...weaponElement,
        effects: [
          // Efecto directo duplicado legacy que debe ser ignorado porque mechanicalBehaviors está presente
          {
            id: "legacy_eff_eva",
            type: "derived_stat_modifier",
            statId: "EVA",
            amount: -1,
          },
        ],
      };

      const possessions = [
        {
          elementId: elementWithBehaviorsAndDirectEffects.id,
          element: elementWithBehaviorsAndDirectEffects,
          equipped: true,
          quantity: 1,
        },
      ];

      const bonuses = calculateEquipmentBonuses(possessions, [elementWithBehaviorsAndDirectEffects]);
      // No debe ser -2 por duplicación
      expect(bonuses.byDerived.evasion).toBe(-1);
    });
  });

  // =========================================================================
  // SUITE E: VALIDACIONES DEL SERVIDOR Y REGRESIÓN DE REGLAS CANÓNICAS
  // =========================================================================
  describe("E. Validaciones del Servidor y Regresión Canónica", () => {
    it("rechaza incompatibilidad de dado base con las reglas canónicas del tipo de arma", () => {
      const invalidWeapon = {
        name: "Rifle Incompatible",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D6", // Canónico de firearm es D10
          damageModifier: "NONE",
          usesAmmo: true,
          range: "Largo",
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_1", "active", "Disparo"),
            effects: [{ id: "eff_1", type: "damage", dice: "1D6", damageType: "balistico" }],
          },
        ],
      };

      const validation = validateWeaponSemantics(invalidWeapon, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("no coincide con el dado base canónico"))).toBe(true);
    });

    it("rechaza tipo de arma desconocido que no pertenece al catálogo canónico", () => {
      const invalidWeaponType = {
        name: "Arma Alienígena",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "antimatter_disruptor",
          baseDice: "D10",
        },
        mechanicalBehaviors: [],
      };

      const validation = validateWeaponSemantics(invalidWeaponType, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("no corresponde a una regla válida"))).toBe(true);
    });

    it("rechaza daño con modificador de atributo no permitido para arma de fuego (debe ser NONE)", () => {
      const invalidModifier = {
        name: "Pistola con Fuerza",
        kind: "weapon" as const,
        status: "published" as const,
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D10",
          damageModifier: "FUE", // Firearm canónico es NONE
          usesAmmo: true,
        },
        mechanicalBehaviors: [
          {
            ...createDefaultMechanicalBehavior("beh_1", "active", "Disparo"),
            effects: [{ id: "eff_1", type: "damage", dice: "1D10", damageType: "cinetico" }],
          },
        ],
      };

      const validation = validateWeaponSemantics(invalidModifier, coreMechanics);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("modificador de daño"))).toBe(true);
    });

    it("certifica que los tipos canónicos de armas en coreRuleCatalog tienen componentes completos", () => {
      const expectedTypes = [
        "firearm",
        "light_weapon",
        "tactical_weapon",
        "heavy_weapon",
        "hybrid_tech",
      ];

      for (const t of expectedTypes) {
        const opt = weaponTypeOptions.find((o: any) => o.runtimeKey === t || o.id === t);
        expect(opt).toBeDefined();
        const comp = opt!.component as any;
        expect(comp).toBeDefined();
        expect(comp.baseDice).toMatch(/^D(4|6|8|10|12)$/);
        expect(["NONE", "FUE", "DES", "AVG_FUE_DES"]).toContain(comp.damageModifier);
        expect(typeof comp.usesAmmo).toBe("boolean");
      }
    });

    it("certifica que los atributos canónicos y estadísticas derivadas están congelados conforme a reglas", () => {
      expect(CANONICAL_ATTRIBUTES).toEqual(["FUE", "DES", "INT", "RES", "VEL", "VOL"]);
      expect(CANONICAL_DERIVED_STATS).toContain("EVA");
      expect(CANONICAL_DERIVED_STATS).toContain("RD");
      expect(CANONICAL_DERIVED_STATS).toContain("INI");
      expect(CANONICAL_DAMAGE_TYPES).toContain("fisico");
      expect(CANONICAL_DAMAGE_TYPES).toContain("cinetico");
    });
  });
});
