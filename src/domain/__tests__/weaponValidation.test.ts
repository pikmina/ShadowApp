import { describe, it, expect } from "vitest";
import {
  validateWeaponSemantics,
  assertWeaponSemantics,
  isCanonicalStatusId,
  CANONICAL_ATTRIBUTES,
  CANONICAL_DERIVED_STATS,
} from "../weaponValidation.ts";
import { createCoreCategories } from "../coreRuleCatalog.ts";
import { enrichElement } from "../../db/elements.ts";

describe("Fase 3, Etapa B: Validación Semántica del Servidor para Armas", () => {
  const coreMechanics = createCoreCategories();

  const validFirearmPayload = {
    kind: "weapon",
    name: "Pistola Táctica 9mm",
    description: "Arma semiautomática estándar.",
    status: "published",
    metadata: {
      weaponTypeId: "firearm",
      baseDice: "D10",
      damageModifier: "NONE",
      usesAmmo: true,
      magazineCapacity: 12,
      ammoElementId: "ammo_9mm_parabellum",
    },
    mechanicalBehaviors: [
      {
        id: "beh_attack",
        name: "Disparo",
        mode: "active",
        activation: { actionType: "action", timing: "immediate" },
        target: { type: "enemy" },
        effects: [
          {
            type: "damage",
            dice: "1D10",
            damageType: "fisico",
          },
        ],
      },
    ],
  };

  const validMeleeWeaponPayload = {
    kind: "weapon",
    name: "Katana Tradicional",
    description: "Espada afilada de precisión.",
    status: "published",
    metadata: {
      weaponTypeId: "tactical_weapon",
      baseDice: "D8",
      damageModifier: "DES",
      usesAmmo: false,
    },
    mechanicalBehaviors: [
      {
        id: "beh_attack",
        name: "Corte Preciso",
        mode: "active",
        target: { type: "enemy" },
        effects: [
          {
            type: "damage",
            dice: "1D8",
            damageType: "cortante",
          },
        ],
      },
    ],
  };

  it("1. Creación válida de un arma con daño, tipo y munición coherentes", () => {
    const resultFirearm = validateWeaponSemantics(validFirearmPayload, coreMechanics, [], [
      { id: "ammo_9mm_parabellum", kind: "ammunition" },
    ]);
    expect(resultFirearm.valid).toBe(true);
    expect(resultFirearm.errors).toHaveLength(0);

    const resultMelee = validateWeaponSemantics(validMeleeWeaponPayload, coreMechanics);
    expect(resultMelee.valid).toBe(true);
    expect(resultMelee.errors).toHaveLength(0);

    expect(() => assertWeaponSemantics(validFirearmPayload, coreMechanics)).not.toThrow();
  });

  it("2. Rechazo de arma sin nombre o con nombre compuesto únicamente por espacios en blanco", () => {
    // Nombre vacío
    const emptyName = { ...validFirearmPayload, name: "" };
    const resEmpty = validateWeaponSemantics(emptyName, coreMechanics);
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.errors.some((e) => e.includes("nombre"))).toBe(true);

    // Nombre con solo espacios
    const spacesName = { ...validFirearmPayload, name: "     " };
    const resSpaces = validateWeaponSemantics(spacesName, coreMechanics);
    expect(resSpaces.valid).toBe(false);
    expect(resSpaces.errors.some((e) => e.includes("nombre"))).toBe(true);

    // Nombre no-string o undefined
    const undefName = { ...validFirearmPayload, name: undefined };
    const resUndef = validateWeaponSemantics(undefName, coreMechanics);
    expect(resUndef.valid).toBe(false);

    // No se altera silenciosamente el nombre original
    expect(spacesName.name).toBe("     ");
  });

  it("3. Rechazo de arma con tipo inexistente o no disponible", () => {
    const invalidType = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        weaponTypeId: "super_laser_cannon_unknown",
      },
    };
    const res = validateWeaponSemantics(invalidType, coreMechanics);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("no corresponde a una regla válida"))).toBe(true);

    expect(() => assertWeaponSemantics(invalidType, coreMechanics)).toThrow(/regla válida/);
  });

  it("4. Rechazo de discrepancia entre dado base y tipo de arma", () => {
    // firearm requiere D10 canónicamente; le ponemos D6
    const mismatchDice = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        baseDice: "D6",
      },
    };
    const res = validateWeaponSemantics(mismatchDice, coreMechanics);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("dado base") && e.includes("no coincide"))).toBe(true);
  });

  it("5. Rechazo de modificador de daño arbitrario que contradiga la regla del tipo de arma", () => {
    // firearm requiere NONE; le ponemos FUE
    const wrongMod = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        damageModifier: "FUE",
      },
    };
    const res = validateWeaponSemantics(wrongMod, coreMechanics);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("modificador de daño") && e.includes("no coincide"))).toBe(true);

    // light_weapon requiere DES; le ponemos INT
    const wrongMeleeMod = {
      ...validMeleeWeaponPayload,
      metadata: {
        ...validMeleeWeaponPayload.metadata,
        damageModifier: "INT",
      },
    };
    const resMelee = validateWeaponSemantics(wrongMeleeMod, coreMechanics);
    expect(resMelee.valid).toBe(false);
    expect(resMelee.errors.some((e) => e.includes("modificador de daño"))).toBe(true);
  });

  it("6. Rechazo de daño principal ausente o incompatible con el dado base", () => {
    // Sin comportamiento activo
    const noActive = {
      ...validFirearmPayload,
      mechanicalBehaviors: [],
    };
    const resNoActive = validateWeaponSemantics(noActive, coreMechanics);
    expect(resNoActive.valid).toBe(false);
    expect(resNoActive.errors.some((e) => e.includes("comportamiento activo"))).toBe(true);

    // Activo sin efecto de daño
    const noDamage = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          id: "beh_1",
          mode: "active",
          effects: [{ type: "status_apply", statusElementId: "core.status.stunned" }],
        },
      ],
    };
    const resNoDamage = validateWeaponSemantics(noDamage, coreMechanics);
    expect(resNoDamage.valid).toBe(false);
    expect(resNoDamage.errors.some((e) => e.includes("daño principal"))).toBe(true);

    // Daño con caras de dado incompatibles (arma D10 con daño 2D6)
    const incompatibleDice = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          id: "beh_1",
          mode: "active",
          effects: [{ type: "damage", dice: "2D6" }],
        },
      ],
    };
    const resIncompatible = validateWeaponSemantics(incompatibleDice, coreMechanics);
    expect(resIncompatible.valid).toBe(false);
    expect(resIncompatible.errors.some((e) => e.includes("no coincide") || e.includes("no es compatible"))).toBe(true);

    // Daño plano fijo incompatible (ej: "4")
    const flatDamage = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          id: "beh_1",
          mode: "active",
          effects: [{ type: "damage", dice: "4" }],
        },
      ],
    };
    const resFlat = validateWeaponSemantics(flatDamage, coreMechanics);
    expect(resFlat.valid).toBe(false);

    // Fórmula no catalogada o sintética no permitida (ej: "9D10")
    const syntheticFormula = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          id: "beh_1",
          mode: "active",
          effects: [{ type: "damage", dice: "9D10" }],
        },
      ],
    };
    const resSynthetic = validateWeaponSemantics(syntheticFormula, coreMechanics);
    expect(resSynthetic.valid).toBe(false);
  });

  it("7. Rechazo de inconsistencias en munición (usesAmmo sin cargador, o melee con usesAmmo)", () => {
    // Arma de fuego con cargador 0
    const zeroCapacity = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        magazineCapacity: 0,
      },
    };
    const resZero = validateWeaponSemantics(zeroCapacity, coreMechanics);
    expect(resZero.valid).toBe(false);
    expect(resZero.errors.some((e) => e.includes("capacidad de cargador"))).toBe(true);

    // Arma de fuego con cargador negativo
    const negativeCapacity = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        magazineCapacity: -5,
      },
    };
    const resNeg = validateWeaponSemantics(negativeCapacity, coreMechanics);
    expect(resNeg.valid).toBe(false);

    // Arma de fuego con usesAmmo: false
    const falseUsesAmmo = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        usesAmmo: false,
      },
    };
    const resFalse = validateWeaponSemantics(falseUsesAmmo, coreMechanics);
    expect(resFalse.valid).toBe(false);
    expect(resFalse.errors.some((e) => e.includes("requiere munición"))).toBe(true);

    // Arma melee con usesAmmo: true
    const meleeWithAmmo = {
      ...validMeleeWeaponPayload,
      metadata: {
        ...validMeleeWeaponPayload.metadata,
        usesAmmo: true,
      },
    };
    const resMeleeWithAmmo = validateWeaponSemantics(meleeWithAmmo, coreMechanics);
    expect(resMeleeWithAmmo.valid).toBe(false);
    expect(resMeleeWithAmmo.errors.some((e) => e.includes("no utiliza munición"))).toBe(true);

    // Munición referenciada que no existe en el catálogo
    const missingAmmo = {
      ...validFirearmPayload,
      metadata: {
        ...validFirearmPayload.metadata,
        ammoElementId: "nonexistent_bullet_id_123",
      },
    };
    const resMissingAmmo = validateWeaponSemantics(missingAmmo, coreMechanics, [], [
      { id: "ammo_9mm_parabellum", kind: "ammunition" },
    ]);
    expect(resMissingAmmo.valid).toBe(false);
    expect(resMissingAmmo.errors.some((e) => e.includes("munición referenciado"))).toBe(true);
  });

  it("8. Rechazo de estado alterado con ID inexistente o no canónico", () => {
    // Estado canónico válido
    expect(isCanonicalStatusId("core.status.stunned")).toBe(true);
    expect(isCanonicalStatusId("stunned")).toBe(true);
    expect(isCanonicalStatusId("core.status.quemadura_grave")).toBe(true);
    expect(isCanonicalStatusId("invented_magic_status")).toBe(false);

    const weaponWithBadStatus = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          id: "beh_1",
          mode: "active",
          effects: [
            { type: "damage", dice: "1D10", damageType: "fisico" },
            { type: "status_apply", statusElementId: "invented_magic_status", turns: 2 },
          ],
        },
      ],
    };

    const res = validateWeaponSemantics(weaponWithBadStatus, coreMechanics);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("estado alterado referenciado"))).toBe(true);
  });

  it("9. Rechazo de bono o penalizador con atributo o estadística inválida", () => {
    // Modificador con estadística falsa
    const weaponWithBadStat = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        validFirearmPayload.mechanicalBehaviors[0],
        {
          id: "beh_equipped",
          mode: "continuous",
          conditions: [{ type: "equipped" }],
          target: { type: "self" },
          effects: [
            { type: "penalty", targetStat: "MAGIC_POWER", amount: 2 },
          ],
        },
      ],
    };
    const resStat = validateWeaponSemantics(weaponWithBadStat, coreMechanics);
    expect(resStat.valid).toBe(false);
    expect(resStat.errors.some((e) => e.includes("estadística") && e.includes("no es válida"))).toBe(true);

    // Modificador con atributo falso
    const weaponWithBadAttr = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        validFirearmPayload.mechanicalBehaviors[0],
        {
          id: "beh_equipped",
          mode: "continuous",
          conditions: [{ type: "equipped" }],
          target: { type: "self" },
          effects: [
            { type: "bonus", attributeId: "CHAKRA", amount: 1 },
          ],
        },
      ],
    };
    const resAttr = validateWeaponSemantics(weaponWithBadAttr, coreMechanics);
    expect(resAttr.valid).toBe(false);
    expect(resAttr.errors.some((e) => e.includes("atributo") && e.includes("no es válido"))).toBe(true);

    // Modificador canónico válido
    const weaponWithValidMods = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        validFirearmPayload.mechanicalBehaviors[0],
        {
          id: "beh_equipped",
          mode: "continuous",
          conditions: [{ type: "equipped" }],
          target: { type: "self" },
          effects: [
            { type: "penalty", targetStat: "EVA", amount: 1 },
            { type: "bonus", attributeId: "FUE", amount: 1 },
          ],
        },
      ],
    };
    const resValid = validateWeaponSemantics(weaponWithValidMods, coreMechanics);
    expect(resValid.valid).toBe(true);
  });

  it("10. Rechazo de limitación con valores negativos o ilógicos", () => {
    // Cooldown 0 o negativo
    const weaponZeroCooldown = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          ...validFirearmPayload.mechanicalBehaviors[0],
          limitations: [{ type: "cooldown", turns: 0 }],
        },
      ],
    };
    const resZeroCd = validateWeaponSemantics(weaponZeroCooldown, coreMechanics);
    expect(resZeroCd.valid).toBe(false);
    expect(resZeroCd.errors.some((e) => e.includes("cooldown") || e.includes("enfriamiento"))).toBe(true);

    const weaponNegCooldown = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          ...validFirearmPayload.mechanicalBehaviors[0],
          limitations: [{ type: "cooldown", turns: -2 }],
        },
      ],
    };
    const resNegCd = validateWeaponSemantics(weaponNegCooldown, coreMechanics);
    expect(resNegCd.valid).toBe(false);
    expect(resNegCd.errors.some((e) => e.includes("negativo"))).toBe(true);

    // Usage limit con max 0 o periodo inválido
    const weaponBadUsage = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          ...validFirearmPayload.mechanicalBehaviors[0],
          limitations: [{ type: "usage_limit", max: 0, period: "forever_and_ever" }],
        },
      ],
    };
    const resBadUsage = validateWeaponSemantics(weaponBadUsage, coreMechanics);
    expect(resBadUsage.valid).toBe(false);
    expect(resBadUsage.errors.some((e) => e.includes("límite de uso"))).toBe(true);

    // Limitación válida
    const weaponValidLimits = {
      ...validFirearmPayload,
      mechanicalBehaviors: [
        {
          ...validFirearmPayload.mechanicalBehaviors[0],
          limitations: [
            { type: "cooldown", turns: 2 },
            { type: "usage_limit", max: 3, period: "combat" },
          ],
        },
      ],
    };
    const resValidLim = validateWeaponSemantics(weaponValidLimits, coreMechanics);
    expect(resValidLim.valid).toBe(true);
  });

  it("11. Preservación y lectura pasiva de armas heredadas sin romper carga ni hidratación", () => {
    // Arma antigua creada bajo esquema anterior (sin mechanicalBehaviors ni nuevos metadatos)
    const legacyWeapon = {
      id: "legacy_weapon_001",
      kind: "weapon",
      name: "Escopeta Antigua",
      description: "Un arma de otra época sin comportamientos nuevos.",
      status: "published",
      metadata: {},
      effects: [],
      mechanicalBehaviors: [],
      requirements: { operator: "all", requirements: [] },
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };

    // La función de lectura/enriquecimiento del servidor NO falla
    const enriched = enrichElement(legacyWeapon);
    expect(enriched).toBeDefined();
    expect(enriched.id).toBe("legacy_weapon_001");
    expect(enriched.name).toBe("Escopeta Antigua");
    expect(enriched.usesAmmo).toBe(true); // safe fallback para UI

    // Si el elemento no es de tipo arma, la validación se omite completamente
    const traitElement = {
      kind: "trait",
      name: "Poder Oculto",
      description: "Rasgo innato",
      metadata: {},
    };
    const traitResult = validateWeaponSemantics(traitElement, coreMechanics);
    expect(traitResult.valid).toBe(true);
    expect(traitResult.errors).toHaveLength(0);
  });

  describe("Fase 3, Etapa C: Borradores Flexibles y Requisitos de Publicación", () => {
    it("1. Borrador mínimo válido sin tipo ni daño configurados", () => {
      const minimalDraft = {
        kind: "weapon",
        name: "Prototipo en Diseño",
        description: "Boceto preliminar de un arma experimental.",
        status: "draft",
        metadata: {},
        mechanicalBehaviors: [],
      };
      const res = validateWeaponSemantics(minimalDraft, coreMechanics);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(() => assertWeaponSemantics(minimalDraft, coreMechanics)).not.toThrow();
    });

    it("2. Borrador con configuración parcial válida (tipo y dado pero sin daño ni comportamientos)", () => {
      const partialDraft = {
        kind: "weapon",
        name: "Arma Ligera en Construcción",
        description: "Borrador con tipo asignado pero sin comportamientos mecánicos aún.",
        status: "draft",
        metadata: {
          weaponTypeId: "light_weapon",
          baseDice: "D6",
          damageModifier: "DES",
        },
        mechanicalBehaviors: [],
      };
      const res = validateWeaponSemantics(partialDraft, coreMechanics);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("3. Borrador con una referencia inválida (rechazado por integridad estructural)", () => {
      const draftBadStatus = {
        kind: "weapon",
        name: "Borrador con Estado Falso",
        description: "Intento de guardar un estado alterado inexistente en un borrador.",
        status: "draft",
        metadata: {},
        mechanicalBehaviors: [
          {
            id: "b1",
            mode: "active",
            effects: [
              { type: "status_apply", statusElementId: "fake_nonexistent_status" },
            ],
          },
        ],
      };
      const res = validateWeaponSemantics(draftBadStatus, coreMechanics);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("estado alterado referenciado"))).toBe(true);
    });

    it("4. Borrador con datos mecánicos contradictorios (rechazado por integridad estructural)", () => {
      // Arma de fuego pero con dado base D6
      const contradictoryDraft = {
        kind: "weapon",
        name: "Borrador Contradictorio",
        description: "Arma de fuego con dado base D6 en vez de D10.",
        status: "draft",
        metadata: {
          weaponTypeId: "firearm",
          baseDice: "D6",
        },
      };
      const res = validateWeaponSemantics(contradictoryDraft, coreMechanics);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("no coincide"))).toBe(true);
    });

    it("5. Arma publicada sin tipo de arma (rechazada por requisitos de publicación)", () => {
      const publishedNoType = {
        kind: "weapon",
        name: "Arma Publicada Sin Tipo",
        description: "Intento de publicación sin tipo de arma.",
        status: "published",
        metadata: {},
      };
      const res = validateWeaponSemantics(publishedNoType, coreMechanics);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("tipo de arma") && e.includes("publicada"))).toBe(true);
    });

    it("6. Arma publicada sin daño principal válido (rechazada por requisitos de publicación)", () => {
      const publishedNoDamage = {
        kind: "weapon",
        name: "Arma Sin Daño",
        description: "Arma con tipo pero sin daño activo.",
        status: "published",
        metadata: {
          weaponTypeId: "heavy_weapon",
          baseDice: "D10",
          damageModifier: "FUE",
          usesAmmo: false,
        },
        mechanicalBehaviors: [],
      };
      const res = validateWeaponSemantics(publishedNoDamage, coreMechanics);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("comportamiento activo") || e.includes("daño principal"))).toBe(true);
    });

    it("7. Arma publicada con dado incompatible (rechazada)", () => {
      const publishedBadDice = {
        ...validFirearmPayload,
        status: "published",
        mechanicalBehaviors: [
          {
            id: "b1",
            mode: "active",
            effects: [{ type: "damage", dice: "2D8" }], // D10 requiere D10, no D8
          },
        ],
      };
      const res = validateWeaponSemantics(publishedBadDice, coreMechanics);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("no coincide") || e.includes("no es compatible"))).toBe(true);
    });

    it("8. Transición de borrador incompleto a publicado: rechazada mientras falten requisitos", () => {
      const initialDraft = {
        id: "draft_weapon_1",
        kind: "weapon",
        name: "Pistola Experimental",
        description: "En desarrollo",
        status: "draft",
        metadata: {},
        mechanicalBehaviors: [],
      };
      expect(validateWeaponSemantics(initialDraft, coreMechanics).valid).toBe(true);

      // Intento de publicación sin completar campos mecánicos
      const publishingAttempt = {
        ...initialDraft,
        status: "published",
      };
      const resPublish = validateWeaponSemantics(publishingAttempt, coreMechanics);
      expect(resPublish.valid).toBe(false);
      expect(resPublish.errors.length).toBeGreaterThanOrEqual(2);
      expect(() => assertWeaponSemantics(publishingAttempt, coreMechanics)).toThrow();
    });

    it("9. Transición de borrador completo a publicado: aceptada al cumplir todas las reglas", () => {
      const completeDraft = {
        ...validFirearmPayload,
        status: "draft",
      };
      expect(validateWeaponSemantics(completeDraft, coreMechanics).valid).toBe(true);

      const published = {
        ...completeDraft,
        status: "published",
      };
      const res = validateWeaponSemantics(published, coreMechanics);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(() => assertWeaponSemantics(published, coreMechanics)).not.toThrow();
    });

    it("10. Edición parcial que preserve los datos anteriores no informados (fusión mergedPayload)", () => {
      const existingWeaponInDB = {
        id: "w_existing_1",
        kind: "weapon",
        name: "Rifle de Precisión",
        description: "Rifle táctico existente.",
        status: "published",
        metadata: {
          weaponTypeId: "tactical_weapon",
          baseDice: "D8",
          damageModifier: "DES",
          usesAmmo: false,
          customCustomField: "preserved_val",
        },
        mechanicalBehaviors: [
          {
            id: "beh_snipe",
            mode: "active",
            effects: [{ type: "damage", dice: "1D8", damageType: "perforante" }],
          },
        ],
      };

      // Petición de edición que solo actualiza el nombre y la descripción narrativa
      const partialUpdate: Record<string, any> = {
        id: "w_existing_1",
        name: "Rifle de Precisión Modificado",
        description: "Nueva descripción narrativa sin alterar mecánicas.",
      };

      // Fusión conforme a elements.ts
      const mergedPayload = {
        ...existingWeaponInDB,
        ...partialUpdate,
        kind: "weapon",
        status: partialUpdate.status ?? existingWeaponInDB.status,
        metadata: {
          ...existingWeaponInDB.metadata,
          ...(partialUpdate.metadata || {}),
        },
        mechanicalBehaviors: partialUpdate.mechanicalBehaviors ?? existingWeaponInDB.mechanicalBehaviors,
      };

      const res = validateWeaponSemantics(mergedPayload, coreMechanics);
      expect(res.valid).toBe(true);
      expect(mergedPayload.name).toBe("Rifle de Precisión Modificado");
      expect(mergedPayload.description).toBe("Nueva descripción narrativa sin alterar mecánicas.");
      expect(mergedPayload.metadata.weaponTypeId).toBe("tactical_weapon");
      expect(mergedPayload.metadata.customCustomField).toBe("preserved_val");
      expect(mergedPayload.mechanicalBehaviors[0].effects[0].dice).toBe("1D8");
    });
  });
});
