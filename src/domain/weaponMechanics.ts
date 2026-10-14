import { getAlteredStatusLabel } from "./mechanicalLabels.ts";
import { getCanonicalStatusDefaultTurns } from "./canonicalAlteredStatuses.ts";

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
