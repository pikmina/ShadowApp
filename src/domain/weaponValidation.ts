import { extractDieSides, filterDamageOptionsByBaseDice } from "./weaponMechanics.ts";
import { createCoreCategories, getCategoryOptions } from "./coreRuleCatalog.ts";
import type { SystemMechanicsConfig } from "./systemMechanics.ts";
import { CANONICAL_SINGLE_STATUSES, CANONICAL_STATUS_FAMILIES } from "./canonicalAlteredStatuses.ts";
import { CORE_ALTERED_STATUSES } from "./systemWeaknesses.ts";

export const CANONICAL_ATTRIBUTES = ["FUE", "DES", "INT", "RES", "VEL", "VOL"] as const;
export type CanonicalAttribute = typeof CANONICAL_ATTRIBUTES[number];

export const CANONICAL_DERIVED_STATS = ["EVA", "RD", "INI", "DB", "COR", "SAL", "EST", "SA", "ES"] as const;
export type CanonicalDerivedStat = typeof CANONICAL_DERIVED_STATS[number];

export const CANONICAL_DAMAGE_TYPES = [
  "fisico",
  "cinetico",
  "fuego",
  "hielo",
  "electrico",
  "acido",
  "psiquico",
  "sensorial",
  "motor",
  "anomalia_don",
  "cortante",
  "perforante",
  "contundente",
] as const;

export interface WeaponValidationResult {
  valid: boolean;
  errors: string[];
}

export function isCanonicalStatusId(
  statusId: string,
  mechanics?: SystemMechanicsConfig,
  catalogStatuses?: Array<{ id: string; kind?: string }>
): boolean {
  if (!statusId || typeof statusId !== "string") return false;
  const cleanId = statusId.trim();

  // 1. Single statuses
  if (CANONICAL_SINGLE_STATUSES.some((s) => s.id === cleanId || s.key === cleanId)) {
    return true;
  }

  // 2. Family statuses and tiers
  for (const family of CANONICAL_STATUS_FAMILIES) {
    if (family.id === cleanId || family.key === cleanId) return true;
    if (family.tiers.some((t) => t.statusId === cleanId || t.id === cleanId)) return true;
  }

  // 3. Core Altered Statuses
  if (CORE_ALTERED_STATUSES.some((s) => s.id === cleanId)) {
    return true;
  }

  // 4. System mechanics status category options
  if (mechanics && Array.isArray(mechanics)) {
    const statusOpts = getCategoryOptions(mechanics, "status");
    if (
      statusOpts.some(
        (o) =>
          o.id === cleanId ||
          o.runtimeKey === cleanId ||
          o.effect?.statusElementId === cleanId
      )
    ) {
      return true;
    }
  }

  // 5. Catalog statuses
  if (catalogStatuses && Array.isArray(catalogStatuses)) {
    if (catalogStatuses.some((s) => s.id === cleanId && (s.kind === "altered_status" || !s.kind))) {
      return true;
    }
  }

  return false;
}

function getAvailableWeaponTypes(mechanics?: SystemMechanicsConfig) {
  if (mechanics && Array.isArray(mechanics) && mechanics.length > 0) {
    const opts = getCategoryOptions(mechanics, "weapon_type");
    if (opts.length > 0) return opts;
  }
  const defaultCats = createCoreCategories();
  return getCategoryOptions(defaultCats, "weapon_type");
}

function getAllDamageOptions(mechanics?: SystemMechanicsConfig) {
  if (mechanics && Array.isArray(mechanics) && mechanics.length > 0) {
    const opts = getCategoryOptions(mechanics, "damage");
    if (opts.length > 0) return opts;
  }
  const defaultCats = createCoreCategories();
  return getCategoryOptions(defaultCats, "damage");
}

function getAllDamageTypeOptions(mechanics?: SystemMechanicsConfig) {
  if (mechanics && Array.isArray(mechanics) && mechanics.length > 0) {
    const opts = getCategoryOptions(mechanics, "damage_type");
    if (opts.length > 0) return opts;
  }
  const defaultCats = createCoreCategories();
  return getCategoryOptions(defaultCats, "damage_type");
}

/**
 * Validates the semantic integrity of a weapon element on the server.
 * Pure and deterministic: does not mutate inputs or silently alter stored data.
 */
export function validateWeaponSemantics(
  data: any,
  mechanics?: SystemMechanicsConfig,
  catalogStatuses?: Array<{ id: string; kind?: string }>,
  catalogAmmunitions?: Array<{ id: string; kind?: string }>
): WeaponValidationResult {
  const errors: string[] = [];

  // Only apply to weapons
  if (data?.kind && data.kind !== "weapon") {
    return { valid: true, errors: [] };
  }

  // 1. Nombre (Obligatorio tanto para borrador como para publicado)
  if (
    data.name === undefined ||
    data.name === null ||
    typeof data.name !== "string" ||
    data.name.trim().length === 0
  ) {
    errors.push("El nombre del arma no puede estar vacío ni contener únicamente espacios en blanco.");
  }

  const status = data.status || "draft";
  const isPublished = status === "published";

  // 2. Tipo de arma (weaponTypeId)
  const metadata = data.metadata || {};
  const weaponTypeId = metadata.weaponTypeId;

  if (isPublished) {
    if (!weaponTypeId || typeof weaponTypeId !== "string" || !weaponTypeId.trim()) {
      errors.push("El arma debe especificar un tipo de arma (weaponTypeId) válido para ser publicada.");
    }
  }

  let matchedWeaponType: any = null;
  if (weaponTypeId && typeof weaponTypeId === "string" && weaponTypeId.trim()) {
    const availableWeaponTypes = getAvailableWeaponTypes(mechanics);
    matchedWeaponType = availableWeaponTypes.find(
      (o) => o.id === weaponTypeId || o.runtimeKey === weaponTypeId
    );

    if (!matchedWeaponType) {
      errors.push(`El tipo de arma '${weaponTypeId}' no corresponde a una regla válida del sistema.`);
    } else if (matchedWeaponType.isAvailable === false) {
      errors.push(`El tipo de arma '${matchedWeaponType.name || weaponTypeId}' no está disponible para su uso.`);
    }
  }

  const comp = (matchedWeaponType?.component as any) || {};
  const expectedBaseDice: string | undefined = comp.baseDice;
  const expectedDamageModifier: string | undefined = comp.damageModifier;
  const expectedUsesAmmo: boolean | undefined = comp.usesAmmo;
  const weaponTypeName: string = matchedWeaponType?.name || weaponTypeId || "Tipo desconocido";

  // 3. Dado base (baseDice)
  if (isPublished) {
    if (metadata.baseDice === undefined || metadata.baseDice === null || typeof metadata.baseDice !== "string") {
      errors.push(`El arma debe especificar el dado base canónico ('${expectedBaseDice || "D10"}') para ${weaponTypeName}.`);
    }
  }

  if (metadata.baseDice !== undefined && metadata.baseDice !== null) {
    if (typeof metadata.baseDice !== "string" || !metadata.baseDice.trim()) {
      errors.push("El dado base (baseDice) debe ser una cadena válida (ej. 'D10', 'D6').");
    } else {
      const userSides = extractDieSides(metadata.baseDice);
      if (userSides === null) {
        errors.push(`El dado base '${metadata.baseDice}' no tiene un formato de dado válido.`);
      } else if (expectedBaseDice) {
        const expSides = extractDieSides(expectedBaseDice);
        if (userSides !== expSides) {
          errors.push(
            `El dado base '${metadata.baseDice}' no coincide con el dado base canónico '${expectedBaseDice}' del tipo de arma '${weaponTypeName}'.`
          );
        }
      }
    }
  }

  // 4. Modificador de daño (damageModifier)
  if (isPublished) {
    if (
      metadata.damageModifier === undefined ||
      metadata.damageModifier === null ||
      typeof metadata.damageModifier !== "string"
    ) {
      errors.push(
        `El arma debe especificar el modificador de daño canónico ('${expectedDamageModifier || "NONE"}') para ${weaponTypeName}.`
      );
    }
  }

  if (metadata.damageModifier !== undefined && metadata.damageModifier !== null) {
    if (typeof metadata.damageModifier !== "string") {
      errors.push("El modificador de daño debe ser una cadena válida.");
    } else if (expectedDamageModifier) {
      const userMod = metadata.damageModifier.trim().toUpperCase();
      const expMod = expectedDamageModifier.trim().toUpperCase();
      if (userMod !== expMod) {
        errors.push(
          `El modificador de daño '${metadata.damageModifier}' no coincide con la regla canónica '${expectedDamageModifier}' del tipo de arma '${weaponTypeName}'.`
        );
      }
    }
  }

  // 5. Munición (usesAmmo, magazineCapacity, ammoElementId)
  if (expectedUsesAmmo !== undefined) {
    if (expectedUsesAmmo) {
      if (isPublished && metadata.usesAmmo === false) {
        errors.push(`El tipo de arma '${weaponTypeName}' requiere munición, pero el arma tiene usesAmmo desactivado.`);
      }

      if (isPublished) {
        const magCapacity = metadata.magazineCapacity;
        if (
          typeof magCapacity !== "number" ||
          Number.isNaN(magCapacity) ||
          magCapacity <= 0 ||
          !Number.isInteger(magCapacity)
        ) {
          errors.push("Las armas que requieren munición deben especificar una capacidad de cargador numérica entera mayor a cero para ser publicadas.");
        }
      } else if (metadata.magazineCapacity !== undefined && metadata.magazineCapacity !== null) {
        const magCapacity = metadata.magazineCapacity;
        if (
          typeof magCapacity !== "number" ||
          Number.isNaN(magCapacity) ||
          magCapacity <= 0 ||
          !Number.isInteger(magCapacity)
        ) {
          errors.push("La capacidad de cargador debe ser un número entero mayor a cero.");
        }
      }

      if (metadata.ammoElementId && typeof metadata.ammoElementId === "string" && metadata.ammoElementId.trim()) {
        const ammoId = metadata.ammoElementId.trim();
        if (catalogAmmunitions && Array.isArray(catalogAmmunitions)) {
          const ammoExists = catalogAmmunitions.some(
            (a) => a.id === ammoId && (a.kind === "ammunition" || !a.kind)
          );
          if (!ammoExists) {
            errors.push(`El elemento de munición referenciado '${ammoId}' no existe o no es de tipo munición.`);
          }
        }
      }
    } else {
      if (metadata.usesAmmo === true) {
        errors.push(`El tipo de arma '${weaponTypeName}' no utiliza munición, pero el arma tiene usesAmmo activado.`);
      }
    }
  }

  // 6. Comportamientos mecánicos y daño principal
  const behaviors: any[] = Array.isArray(data.mechanicalBehaviors) ? data.mechanicalBehaviors : [];
  const activeAttackBeh = behaviors.find((b) => b.mode === "active");

  if (isPublished && !activeAttackBeh) {
    errors.push("El arma debe incluir un comportamiento activo de ataque para ser publicada.");
  }

  if (activeAttackBeh) {
    const effects: any[] = Array.isArray(activeAttackBeh.effects) ? activeAttackBeh.effects : [];
    const damageEffects = effects.filter((e) => e.type === "damage");

    if (isPublished && damageEffects.length === 0) {
      errors.push("El comportamiento activo del arma debe incluir un efecto de daño principal para ser publicada.");
    }

    if (damageEffects.length > 0) {
      const primaryDmg = damageEffects[0];
      if (
        !primaryDmg.dice ||
        typeof primaryDmg.dice !== "string" ||
        !primaryDmg.dice.trim()
      ) {
        errors.push("El efecto de daño principal debe especificar la fórmula de dados (dice).");
      } else {
        const dmgSides = extractDieSides(primaryDmg.dice);
        const targetBaseDice = metadata.baseDice || expectedBaseDice;
        const expSides = targetBaseDice ? extractDieSides(targetBaseDice) : null;

        if (dmgSides === null) {
          errors.push(`La fórmula de daño '${primaryDmg.dice}' no representa un dado válido.`);
        } else if (expSides !== null && dmgSides !== expSides) {
          errors.push(
            `El dado de daño '${primaryDmg.dice}' no coincide con el dado base '${targetBaseDice}' del arma.`
          );
        } else if (targetBaseDice) {
          // Reutilizar la lógica canónica de compatibilidad de dados
          const allDamageOptions = getAllDamageOptions(mechanics);
          const compatibleOptions = filterDamageOptionsByBaseDice(allDamageOptions, targetBaseDice);
          const validFormulas = compatibleOptions
            .map((o) => (o.effect?.dice || o.formula || "").trim().toUpperCase())
            .filter(Boolean);

          if (
            validFormulas.length > 0 &&
            !validFormulas.includes(primaryDmg.dice.trim().toUpperCase())
          ) {
            errors.push(
              `El dado de daño '${primaryDmg.dice}' no es compatible con el dado base '${targetBaseDice}' del tipo de arma o no existe en las opciones válidas del catálogo (${validFormulas.join(", ")}).`
            );
          }
        }
      }

      // Validar tipo de daño si se proporciona
      if (primaryDmg.damageType && typeof primaryDmg.damageType === "string") {
        const allDamageTypes = getAllDamageTypeOptions(mechanics);
        const validTypes =
          allDamageTypes.length > 0
            ? allDamageTypes.map((o) => (o.runtimeKey || o.id || "").toLowerCase()).filter(Boolean)
            : CANONICAL_DAMAGE_TYPES.map((t) => t.toLowerCase());

        const lowerDmgType = primaryDmg.damageType.trim().toLowerCase();
        if (!validTypes.includes(lowerDmgType)) {
          errors.push(`El tipo de daño '${primaryDmg.damageType}' no es válido en el sistema.`);
        }
      }

      // Validar efectos de daño secundario en el ataque activo (sin exigir coincidencia con baseDice)
      if (damageEffects.length > 1) {
        const secondaryDamageEffects = damageEffects.slice(1);
        const allDamageOptions = getAllDamageOptions(mechanics);
        const allDamageFormulas = allDamageOptions
          .map((o) => (o.effect?.dice || o.formula || o.runtimeKey || "").trim().toUpperCase())
          .filter(Boolean);
        const allDamageTypes = getAllDamageTypeOptions(mechanics);
        const validDamageTypes = allDamageTypes.length > 0
          ? allDamageTypes.map((o) => (o.runtimeKey || o.id || "").toLowerCase()).filter(Boolean)
          : CANONICAL_DAMAGE_TYPES.map((t) => t.toLowerCase());

        for (const secDmg of secondaryDamageEffects) {
          if (!secDmg.dice || typeof secDmg.dice !== "string" || !secDmg.dice.trim()) {
            errors.push("El efecto de daño secundario debe especificar una fórmula de dados o valor numérico (dice).");
          } else {
            const rawDice = secDmg.dice.trim().toUpperCase();
            const isStandardDice = /^(\d+)D(\d+)$/.test(rawDice);
            const isFixedNumber = /^\d+$/.test(rawDice);
            const existsInCatalog = allDamageFormulas.includes(rawDice);

            if (!isStandardDice && !isFixedNumber && !existsInCatalog) {
              errors.push(`El daño secundario '${secDmg.dice}' no representa una opción de daño válida en el sistema.`);
            }
          }

          if (secDmg.damageType && typeof secDmg.damageType === "string") {
            const lowerDmgType = secDmg.damageType.trim().toLowerCase();
            if (!validDamageTypes.includes(lowerDmgType)) {
              errors.push(`El tipo de daño secundario '${secDmg.damageType}' no es válido en el sistema.`);
            }
          }
        }
      }
    }
  }

  // 7. Bonos, penalizadores y estados alterados en todos los comportamientos
  for (const beh of behaviors) {
    const behEffects: any[] = Array.isArray(beh.effects) ? beh.effects : [];
    for (const eff of behEffects) {
      // Daño en comportamientos no primarios
      if (eff.type === "damage" && beh !== activeAttackBeh) {
        if (!eff.dice || typeof eff.dice !== "string" || !eff.dice.trim()) {
          errors.push("El efecto de daño debe especificar la fórmula de dados o valor numérico (dice).");
        }
        if (eff.damageType && typeof eff.damageType === "string") {
          const allDamageTypes = getAllDamageTypeOptions(mechanics);
          const validTypes = allDamageTypes.length > 0
            ? allDamageTypes.map((o) => (o.runtimeKey || o.id || "").toLowerCase()).filter(Boolean)
            : CANONICAL_DAMAGE_TYPES.map((t) => t.toLowerCase());
          if (!validTypes.includes(eff.damageType.trim().toLowerCase())) {
            errors.push(`El tipo de daño '${eff.damageType}' no es válido en el sistema.`);
          }
        }
      }
      // Estados alterados
      if (eff.type === "status_apply" || eff.type === "status") {
        const statusId = eff.statusElementId;
        if (!statusId || typeof statusId !== "string" || !isCanonicalStatusId(statusId, mechanics, catalogStatuses)) {
          errors.push(
            `El estado alterado referenciado '${statusId || "desconocido"}' no es válido ni pertenece a los estados canónicos del sistema.`
          );
        }
        if (eff.turns !== undefined && eff.turns !== null) {
          if (typeof eff.turns !== "number" || eff.turns < 1 || !Number.isInteger(eff.turns)) {
            errors.push("La duración en turnos del estado alterado debe ser un número entero mayor o igual a 1.");
          }
        }
      }

      // Bonos y penalizadores
      if (
        eff.type === "bonus" ||
        eff.type === "penalty" ||
        eff.type === "attribute_modifier" ||
        eff.type === "stat_modifier"
      ) {
        const attr = eff.attributeId ? String(eff.attributeId).trim().toUpperCase() : null;
        const stat = eff.targetStat ? String(eff.targetStat).trim().toUpperCase() : null;

        if (!attr && !stat) {
          errors.push("Los bonos y penalizadores deben especificar un atributo o estadística derivada válida.");
        } else {
          if (attr && !CANONICAL_ATTRIBUTES.includes(attr as any)) {
            errors.push(
              `El atributo '${eff.attributeId}' en el modificador no es válido. Debe ser uno de: ${CANONICAL_ATTRIBUTES.join(", ")}.`
            );
          }
          if (
            stat &&
            !CANONICAL_DERIVED_STATS.includes(stat as any) &&
            !CANONICAL_ATTRIBUTES.includes(stat as any)
          ) {
            errors.push(
              `La estadística '${eff.targetStat}' en el modificador no es válida. Debe pertenecer a: ${CANONICAL_DERIVED_STATS.join(", ")}.`
            );
          }
        }

        if (eff.amount !== undefined && eff.amount !== null) {
          if (typeof eff.amount !== "number" || Number.isNaN(eff.amount) || eff.amount === 0) {
            errors.push("El valor numérico de un bono o penalizador debe ser distinto de cero.");
          }
        }

        const dur = eff.temporality?.duration?.turns ?? eff.turns;
        if (dur !== undefined && dur !== null) {
          if (typeof dur !== "number" || dur < 1 || !Number.isInteger(dur)) {
            errors.push("La duración de un penalizador al impacto debe ser un número entero mayor o igual a 1 turno.");
          }
        }
      }
    }

    // 8. Limitaciones
    const limitations: any[] = Array.isArray(beh.limitations) ? beh.limitations : [];
    for (const lim of limitations) {
      // Chequeo universal de valores negativos
      for (const [key, val] of Object.entries(lim)) {
        if (typeof val === "number" && val < 0) {
          errors.push(`La limitación de tipo '${lim.type || "desconocido"}' contiene un valor negativo en '${key}': ${val}.`);
        }
      }

      if (lim.type === "cooldown") {
        if (typeof lim.turns !== "number" || lim.turns < 1 || !Number.isInteger(lim.turns)) {
          errors.push("El enfriamiento (cooldown) debe ser un número entero mayor o igual a 1 turno.");
        }
      } else if (lim.type === "usage_limit" || lim.type === "usage") {
        if (typeof lim.max !== "number" || lim.max < 1 || !Number.isInteger(lim.max)) {
          errors.push("El límite de uso debe ser un número entero mayor o igual a 1.");
        }
        if (lim.period) {
          const validPeriods = [
            "turn",
            "combat",
            "mission",
            "day",
            "turno",
            "combate",
            "misión",
            "mision",
            "dia",
            "día",
          ];
          if (!validPeriods.includes(String(lim.period).toLowerCase())) {
            errors.push(`El periodo del límite de uso '${lim.period}' no es válido.`);
          }
        }
      } else if (lim.type === "self_damage" || lim.type === "health_cost") {
        if (typeof lim.amount !== "number" || lim.amount < 1) {
          errors.push("El daño autoinfligido o coste de vida debe ser un número mayor o igual a 1.");
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts semantic validity of weapon data, throwing an error with status 400 if invalid.
 */
export function assertWeaponSemantics(
  data: any,
  mechanics?: SystemMechanicsConfig,
  catalogStatuses?: Array<{ id: string; kind?: string }>,
  catalogAmmunitions?: Array<{ id: string; kind?: string }>
): void {
  const result = validateWeaponSemantics(data, mechanics, catalogStatuses, catalogAmmunitions);
  if (!result.valid) {
    const error: any = new Error(`Error de validación semántica en arma: ${result.errors.join("; ")}`);
    error.status = 400;
    error.details = result.errors;
    throw error;
  }
}
