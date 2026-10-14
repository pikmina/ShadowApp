import { getAlteredStatusLabel } from "./mechanicalLabels.ts";
import { getCanonicalStatusDefaultTurns } from "./canonicalAlteredStatuses.ts";
import type { CategoryOptionView } from "./coreRuleCatalog.ts";

export interface BuildWeaponDescriptionParams {
  name?: string;
  usesAmmo?: boolean;
  caliberName?: string;
  magazineCapacity?: number;
  dice?: string;
  damageType?: string;
  damageModifier?: string;
  equippedModifiers?: any[];
  limitations?: any[];
  secondaryEffects?: any[];
  statusOptions?: any[];
}

export function buildWeaponMechanicalDescription(params: BuildWeaponDescriptionParams): string {
  const parts: string[] = [];

  // 1. Name
  const trimmedName = params.name?.trim();
  if (trimmedName) {
    parts.push(`${trimmedName}.`);
  }

  // 2. Ammo sentence (if weapon uses ammo)
  if (params.usesAmmo === true) {
    const caliber = params.caliberName?.trim();
    const capacity = typeof params.magazineCapacity === "number" && params.magazineCapacity > 0
      ? params.magazineCapacity
      : 12;

    if (caliber) {
      if (/^calibre/i.test(caliber)) {
        parts.push(`Arma ${caliber} (${capacity} balas).`);
      } else {
        parts.push(`Arma calibre ${caliber} (${capacity} balas).`);
      }
    } else {
      parts.push(`Arma con munición (${capacity} balas).`);
    }
  }

  // 3. Attack line
  const dice = params.dice || "1D10";
  const rawDamageType = params.damageType || "físico";
  const damageType = rawDamageType.toLowerCase();

  let modText = "";
  switch (params.damageModifier) {
    case "DES":
    case "des":
      modText = " + Mod. Destreza";
      break;
    case "FUE":
    case "fue":
      modText = " + Mod. Fuerza";
      break;
    case "AVG_FUE_DES":
    case "avg_fue_des":
      modText = " + Promedio FUE y DES";
      break;
    default:
      modText = "";
      break;
  }

  parts.push(`Ataque: Inflige ${dice} de daño ${damageType}${modText} contra un enemigo.`);

  // 4. Equipped modifiers
  if (Array.isArray(params.equippedModifiers) && params.equippedModifiers.length > 0) {
    const modsStr = params.equippedModifiers.map((m: any) => {
      const isAttr = m.type === "attribute_modifier";
      const targetName = isAttr ? (m.attributeId || "Atributo") : (m.targetStat || "EVA");
      const isBonus = m.type === "bonus" || (isAttr && (m.amount || 0) > 0);
      const sign = isBonus ? "+" : "-";
      const val = Math.abs(m.amount || 1);
      return `${sign}${val} a ${targetName}`;
    }).join(", ");

    parts.push(`Mientras esté equipada: ${modsStr} al portador.`);
  }

  // 5. Limitations
  if (Array.isArray(params.limitations) && params.limitations.length > 0) {
    const limitsStr = params.limitations.map((l: any) => {
      if (l.type === "cooldown") {
        const turns = l.turns || 1;
        return `${turns} ${turns === 1 ? "turno" : "turnos"} de enfriamiento`;
      }
      if (l.type === "usage_limit") {
        const p = l.period === "turn" ? "turno" : l.period === "combat" ? "combate" : l.period === "mission" ? "misión" : l.period || "combate";
        return `Máx. ${l.max || 1} por ${p}`;
      }
      if (l.type === "self_damage") {
        return `${l.amount || 1} HP daño al usuario`;
      }
      return l.description || l.type;
    }).join(", ");

    parts.push(`Limitaciones: ${limitsStr}.`);
  }

  // 6. Secondary Effects on hit
  if (Array.isArray(params.secondaryEffects) && params.secondaryEffects.length > 0) {
    const secondaryStr = params.secondaryEffects.map((s: any) => {
      if (s.type === "status_apply" || s.type === "status") {
        const statusId = s.statusElementId || "core.status.stunned";
        const matchedOpt = Array.isArray(params.statusOptions)
          ? params.statusOptions.find((st: any) => st.id === statusId || st.runtimeKey === statusId)
          : null;

        let name = matchedOpt?.name || getAlteredStatusLabel(statusId) || statusId;
        // Clean any raw 'core.status.' prefix if getAlteredStatusLabel didn't catch it
        name = name.replace(/^core\.status\./, "");

        const defaultTurns = getCanonicalStatusDefaultTurns(statusId) || s.turns || 3;
        const turns = defaultTurns;

        return `produce ${name} durante ${turns} ${turns === 1 ? "turno" : "turnos"}`;
      }

      const turns = s.temporality?.duration?.turns || s.turns || 2;
      const targetStat = s.targetStat || s.attributeId || "EVA";
      const val = Math.abs(s.amount || 1);
      return `aplica -${val} a ${targetStat} (${turns}t)`;
    }).join(", ");

    parts.push(`Al impactar: ${secondaryStr}.`);
  }

  return parts.join(" ");
}

/**
 * Extrae el número de caras (sides) de una especificación de dado (ej. "D10" -> 10, "1D12" -> 12, "2d6" -> 6).
 * Devuelve null si la cadena no representa dados con caras (por ejemplo valores fijos como "4").
 */
export function extractDieSides(diceStr?: string | null): number | null {
  if (!diceStr || typeof diceStr !== "string") return null;
  const trimmed = diceStr.trim();
  // 1. Caso de tipo de dado como "D10", "d12", "D6"
  const singleDieMatch = /^[dD](\d+)$/.exec(trimmed);
  if (singleDieMatch && singleDieMatch[1]) {
    const sides = parseInt(singleDieMatch[1], 10);
    return Number.isNaN(sides) || sides <= 0 ? null : sides;
  }
  // 2. Caso de fórmula con cantidad como "1D10", "2d12", "3D6"
  const countDieMatch = /^\d+[dD](\d+)$/.exec(trimmed);
  if (countDieMatch && countDieMatch[1]) {
    const sides = parseInt(countDieMatch[1], 10);
    return Number.isNaN(sides) || sides <= 0 ? null : sides;
  }
  return null;
}

/**
 * Filtra las opciones de daño del catálogo de reglas basándose estrictamente en propiedades
 * estructuradas (effect.dice y formula) comparando las caras del dado con baseDice del tipo de arma.
 * No evalúa nombres de presentación, no usa regex heurísticas sobre runtimeKey y jamás fabrica opciones sintéticas.
 */
export function filterDamageOptionsByBaseDice(
  options: CategoryOptionView[],
  baseDice?: string | null
): CategoryOptionView[] {
  const targetSides = extractDieSides(baseDice || "D10");
  if (targetSides === null) return [];

  return (options || []).filter((opt) => {
    // Inspeccionar la propiedad estructurada canónica: opt.effect.dice
    const effectDice = opt.effect?.dice;
    const formula = typeof effectDice === "string" && effectDice.trim() ? effectDice : opt.formula;
    if (!formula || typeof formula !== "string") return false;

    const optSides = extractDieSides(formula);
    return optSides !== null && optSides === targetSides;
  });
}
