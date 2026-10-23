import { createCoreCategories, getCategoryOptions } from "./coreRuleCatalog.ts";
import type { SystemMechanicsConfig } from "./systemMechanics.ts";

export interface AmmunitionMetadata {
  caliberName?: string;
  weaponTypeId?: string;
  boxQuantity?: number;
  damageBonus?: number;
  mechanicalDescription?: string;
  [key: string]: unknown;
}

export interface AmmunitionStock {
  elementId: string;
  characterId?: number;
  name: string;
  caliberName: string;
  weaponTypeId: string;
  boxQuantity: number;
  totalBoxes: number;
  remainingBullets: number;
  maxBullets: number;
  damageBonus: number;
  isExhausted: boolean;
  displayStock: string;
}

export interface AmmunitionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the semantic data of an ammunition element.
 * Distinguishes between draft and published status.
 */
export function validateAmmunitionSemantics(
  data: any,
  mechanics?: SystemMechanicsConfig,
  _catalogWeapons?: Array<{ id: string; kind?: string }>
): AmmunitionValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["El payload de munición es inválido."] };
  }

  // 1. Basic properties
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    errors.push("El nombre de la munición es obligatorio.");
  }

  const isPublished = data.status === "published";
  const metadata: AmmunitionMetadata = (data.metadata && typeof data.metadata === "object") ? data.metadata : {};

  // Available weapon types from mechanics or canonical defaults
  let validWeaponTypeIds: string[] = [];
  if (mechanics && Array.isArray(mechanics) && mechanics.length > 0) {
    const opts = getCategoryOptions(mechanics, "weapon_type");
    if (opts.length > 0) {
      validWeaponTypeIds = opts.map((o: any) => o.runtimeKey || o.id);
    }
  } else if ((mechanics as any)?.categories && Array.isArray((mechanics as any).categories)) {
    const wtCat = (mechanics as any).categories.find((c: any) => c.id === "weapon_type");
    if (wtCat && Array.isArray(wtCat.options)) {
      validWeaponTypeIds = wtCat.options.map((o: any) => o.runtimeKey || o.id);
    }
  }
  if (validWeaponTypeIds.length === 0) {
    const defaultCats = createCoreCategories();
    validWeaponTypeIds = getCategoryOptions(defaultCats, "weapon_type").map((o: any) => o.runtimeKey || o.id);
  }

  // 2. Caliber Name
  if (metadata.caliberName !== undefined && metadata.caliberName !== null) {
    if (typeof metadata.caliberName !== "string" || !metadata.caliberName.trim()) {
      errors.push("El calibre de la munición debe ser una cadena de texto no vacía.");
    }
  } else if (isPublished) {
    errors.push("La munición publicada requiere especificar un calibre.");
  }

  // 3. Compatible Weapon Type
  if (metadata.weaponTypeId !== undefined && metadata.weaponTypeId !== null) {
    if (typeof metadata.weaponTypeId !== "string" || !validWeaponTypeIds.includes(metadata.weaponTypeId)) {
      errors.push(
        `El tipo de arma compatible '${metadata.weaponTypeId}' no corresponde a una regla válida de tipo de arma.`
      );
    }
  } else if (isPublished) {
    errors.push("La munición publicada requiere seleccionar un tipo de arma compatible.");
  }

  // 4. Bullets per Box (boxQuantity)
  if (metadata.boxQuantity !== undefined && metadata.boxQuantity !== null) {
    if (!Number.isInteger(metadata.boxQuantity) || metadata.boxQuantity <= 0) {
      errors.push("Las balas por caja deben ser un número entero estrictamente positivo.");
    }
  } else if (isPublished) {
    errors.push("La munición publicada requiere especificar la cantidad de balas por caja.");
  }

  // 5. Damage Bonus (damageBonus)
  if (metadata.damageBonus !== undefined && metadata.damageBonus !== null) {
    if (!Number.isInteger(metadata.damageBonus) || metadata.damageBonus < 0) {
      errors.push("El bono de daño de la munición debe ser un número entero mayor o igual a 0.");
    } else if (metadata.damageBonus > 20) {
      errors.push("El bono de daño de la munición excede el límite máximo permitido (+20).");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts semantic validity of ammunition data, throwing status 400 error on failure.
 */
export function assertAmmunitionSemantics(
  data: any,
  mechanics?: SystemMechanicsConfig,
  catalogWeapons?: Array<{ id: string; kind?: string }>
): void {
  const result = validateAmmunitionSemantics(data, mechanics, catalogWeapons);
  if (!result.valid) {
    const error: any = new Error(`Error de validación semántica en munición: ${result.errors.join("; ")}`);
    error.status = 400;
    error.details = result.errors;
    throw error;
  }
}

/**
 * Builds the canonical mechanical description for ammunition.
 */
export function buildAmmunitionMechanicalDescription(
  metadata: AmmunitionMetadata,
  weaponTypeName?: string
): string {
  const parts: string[] = [];

  const caliber = metadata.caliberName?.trim();
  if (caliber) {
    parts.push(`Calibre ${caliber}.`);
  }

  const weaponType = weaponTypeName || metadata.weaponTypeId;
  if (weaponType) {
    parts.push(`Compatible con ${weaponType}.`);
  }

  const boxQty = typeof metadata.boxQuantity === "number" && metadata.boxQuantity > 0 ? metadata.boxQuantity : 30;
  parts.push(`${boxQty} balas por caja.`);

  const bonus = typeof metadata.damageBonus === "number" ? metadata.damageBonus : 0;
  if (bonus > 0) {
    parts.push(`Bono de daño: +${bonus}.`);
  } else {
    parts.push("Bono de daño: +0.");
  }

  return parts.join(" ");
}

/**
 * Calculates current ammunition stock for an element possession.
 * Distinguishes between catalog box capacity and character's remaining bullets.
 */
export function resolveAmmunitionStock(
  possession: { quantity?: number; selectedChoices?: any },
  element: { id?: string; name?: string; metadata?: any }
): AmmunitionStock {
  const elementId = element?.id || "";
  const name = element?.name || "Munición";
  const metadata = (element?.metadata && typeof element.metadata === "object") ? element.metadata : {};

  const caliberName = typeof metadata.caliberName === "string" ? metadata.caliberName : "";
  const weaponTypeId = typeof metadata.weaponTypeId === "string" ? metadata.weaponTypeId : "";
  const boxQuantity = typeof metadata.boxQuantity === "number" && metadata.boxQuantity > 0 ? metadata.boxQuantity : 30;
  const totalBoxes = typeof possession?.quantity === "number" && possession.quantity > 0 ? possession.quantity : 1;
  const maxBullets = boxQuantity * totalBoxes;
  const damageBonus = typeof metadata.damageBonus === "number" && metadata.damageBonus >= 0 ? metadata.damageBonus : 0;

  const choices = (possession?.selectedChoices && typeof possession.selectedChoices === "object")
    ? possession.selectedChoices
    : {};

  let remainingBullets = maxBullets;
  if (typeof choices.remainingBullets === "number" && Number.isInteger(choices.remainingBullets)) {
    remainingBullets = Math.max(0, Math.min(maxBullets, choices.remainingBullets));
  }

  const isExhausted = remainingBullets <= 0;
  const displayStock = `${remainingBullets}/${boxQuantity} balas`;

  return {
    elementId,
    name,
    caliberName,
    weaponTypeId,
    boxQuantity,
    totalBoxes,
    remainingBullets,
    maxBullets,
    damageBonus,
    isExhausted,
    displayStock,
  };
}

/**
 * Pure function to consume bullets from a character's ammunition stock.
 * Validates count and prevents negative stock.
 */
export function consumeBullets(
  currentStock: AmmunitionStock,
  bulletsToConsume = 1
): { remainingBullets: number; isExhausted: boolean; consumed: number } {
  if (!Number.isInteger(bulletsToConsume) || bulletsToConsume <= 0) {
    throw new Error(`Cantidad a consumir inválida: ${bulletsToConsume}. Debe ser un entero positivo.`);
  }

  if (currentStock.remainingBullets < bulletsToConsume) {
    throw new Error(
      `Munición insuficiente: existencias actuales (${currentStock.remainingBullets} balas) inferiores a las solicitadas (${bulletsToConsume}).`
    );
  }

  const nextBullets = currentStock.remainingBullets - bulletsToConsume;
  return {
    remainingBullets: nextBullets,
    isExhausted: nextBullets === 0,
    consumed: bulletsToConsume,
  };
}

/**
 * Applies ammunition damage bonus to base damage exactly once.
 */
export function applyAmmunitionDamageBonus(baseDamage: number, damageBonus = 0): number {
  return Math.max(0, baseDamage) + Math.max(0, damageBonus);
}
