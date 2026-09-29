/**
 * Automatic Mechanical Description Renderer
 *
 * Deterministic, presentation-only domain system that converts canonical
 * MechanicalBehavior data into clear, human-readable Spanish mechanical descriptions.
 *
 * MechanicalBehavior remains the source of truth. Generated descriptions are NOT persisted.
 */

import {
  MechanicalBehavior,
  MechanicalEffectItem,
  MechanicalTarget,
  MechanicalCondition,
  MechanicalLimitation,
  MechanicalConsequence,
  MechanicalTrigger,
  MechanicalTemporality,
  MechanicalActivation,
  MechanicalResolution,
  TargetRange,
  TargetArea,
} from "./mechanicalBehavior";

import {
  MECHANICAL_LABELS,
  getMechanicalLabel,
  getAlteredStatusLabel,
  getAttributeLabel,
  getResourceLabel,
  getTagLabel,
  getStatOrSkillLabel,
  getRollTypeLabel,
  getCounterLabel,
} from "./mechanicalLabels";

import { createCoreCategories, getCategoryOptions } from "./coreRuleCatalog";
import { deriveEffectiveBehaviorResolution } from "./characterTechnique";
import { deriveSupportDefenseRD } from "./systemMechanics";

export interface MechanicalDescriptionContext {
  staminaCost?: number;
  parentName?: string;
  sourceName?: string;
}

export interface DescribeBehaviorOptions {
  format?: "compact" | "detailed";
  context?: MechanicalDescriptionContext;
  mechanics?: any[];
  structuralCost?: number;
  supportDifficultyTiers?: any[];
  activationAttributeId?: string | null;
  classification?: any;
}

export interface DescriptionSectionItem {
  key: string;
  label: string;
  text: string;
}

export interface MechanicalDescriptionResult {
  text: string;
  complete: boolean;
  warnings: string[];
  sections?: {
    activation?: string[];
    target?: string[];
    range?: string[];
    area?: string[];
    trigger?: string[];
    conditions?: string[];
    effects?: string[];
    temporality?: string[];
    limitations?: string[];
    resolution?: string[];
    cost?: string[];
  };
}

// ============================================================================
// 1. HELPERS FOR GRAMMAR AND PLURALIZATION
// ============================================================================

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

function ensurePeriod(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
    return trimmed;
  }
  return `${trimmed}.`;
}

function formatSignedNumber(amount: number): string {
  return amount >= 0 ? `+${amount}` : `${amount}`;
}

function lowerFirstIfAppropriate(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return "";
  const firstWord = trimmed.split(/[\s,.:;]/)[0];
  const properNouns = [
    "Quirk",
    "Salud",
    "Estamina",
    "Yenes",
    "Experiencia",
    "Iniciativa",
    "Evasión",
    "Coraje",
    "Aturdido",
    "Paralizado",
    "Vulnerable",
    "Berserker",
    "RD",
    "FUE",
    "DES",
    "RES",
    "INT",
    "VOL",
    "VEL",
    "Condición",
  ];
  if (properNouns.includes(firstWord) || /^[+\-0-9]/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function combineConditions(conditionTexts: string[], logic: "all" | "any" = "all"): string[] {
  if (conditionTexts.length <= 1) return conditionTexts;

  const conjunction = logic === "any" ? " o " : " y ";

  const cleaned = conditionTexts.map((c, idx) => {
    let text = c.trim().replace(/\.$/, "");
    if (idx > 0) {
      if (text.startsWith("Si ")) {
        text = text.slice(3).trim();
      } else if (text.startsWith("si ")) {
        text = text.slice(3).trim();
      } else if (text.startsWith("Cuando ")) {
        text = text.slice(7).trim();
      } else if (text.startsWith("cuando ")) {
        text = text.slice(7).trim();
      }
    }
    return text;
  });

  return [cleaned.join(conjunction)];
}

// ============================================================================
// 2. TARGET, RANGE & AREA RENDERERS
// ============================================================================

export interface DescribeTargetResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalTarget(
  target?: MechanicalTarget
): DescribeTargetResult {
  if (!target) {
    return { text: "", complete: true, warnings: [] };
  }

  const warnings: string[] = [];
  let complete = true;
  let text = "";

  const q = target.quantity;
  const count = q?.count ?? 1;
  const mode = q?.mode ?? "exact";

  switch (target.type) {
    case "self":
      text = "Uno mismo";
      break;

    case "ally":
    case "allies":
      if (mode === "all" || target.type === "allies") {
        text = mode === "up_to" ? `Hasta ${pluralize(count, "aliado", "aliados")}` : (count > 1 ? `${count} aliados` : "Aliados");
        if (mode === "all") text = "Todos los aliados";
      } else if (mode === "up_to") {
        text = `Hasta ${pluralize(count, "aliado", "aliados")}`;
      } else {
        text = pluralize(count, "aliado", "aliados");
      }
      break;

    case "enemy":
    case "enemies":
      if (mode === "all" || target.type === "enemies") {
        text = mode === "up_to" ? `Hasta ${pluralize(count, "enemigo", "enemigos")}` : (count > 1 ? `${count} enemigos` : "Enemigos");
        if (mode === "all") text = "Todos los enemigos";
      } else if (mode === "up_to") {
        text = `Hasta ${pluralize(count, "enemigo", "enemigos")}`;
      } else {
        text = pluralize(count, "enemigo", "enemigos");
      }
      break;

    case "character":
    case "any":
      if (mode === "all") {
        text = "Todos los personajes";
      } else if (mode === "up_to") {
        text = `Hasta ${pluralize(count, "personaje", "personajes")}`;
      } else {
        text = pluralize(count, "personaje", "personajes");
      }
      break;

    case "object":
      if (mode === "all") {
        text = "Todos los objetos";
      } else if (mode === "up_to") {
        text = `Hasta ${pluralize(count, "objeto", "objetos")}`;
      } else {
        text = pluralize(count, "objeto", "objetos");
      }
      break;

    case "structure":
      if (mode === "all") {
        text = "Todas las estructuras";
      } else if (mode === "up_to") {
        text = `Hasta ${pluralize(count, "estructura de hasta 2 pisos", "estructuras de hasta 2 pisos")}`;
      } else {
        text = pluralize(count, "estructura de hasta 2 pisos", "estructuras de hasta 2 pisos");
      }
      break;

    case "area":
      text = "En el área de efecto";
      break;

    case "roll":
      text = "A la tirada objetivo";
      break;

    case "resource":
      text = "Al recurso seleccionado";
      break;

    case "active_element":
      text = "Al elemento activo";
      break;

    case "manual":
      if (target.description && target.description.trim()) {
        text = target.description.trim();
      } else {
        text = "Objetivo a determinar";
        complete = false;
        warnings.push("Manual target lacks explicit description");
      }
      break;

    default:
      text = `Objetivo (${target.type})`;
      complete = false;
      warnings.push(`Unknown target type: ${target.type}`);
      break;
  }

  if (target.type !== "self") {
    if (target.selectionMode && target.selectionMode !== "standard_priority") {
      if (target.selectionMode === "manual") {
        text += " (Elección manual)";
      } else if (target.selectionMode === "random") {
        text += " (Aleatoria)";
      }
    } else if (target.selectionRestriction && target.selectionRestriction !== "none") {
      const resLabel = getMechanicalLabel("selectionRestrictions", target.selectionRestriction);
      text += ` (${resLabel || target.selectionRestriction})`;
    }
  }

  return { text, complete, warnings };
}

export function describeTargetRange(range?: TargetRange): DescribeTargetResult {
  if (!range) return { text: "", complete: true, warnings: [] };

  switch (range.type) {
    case "self":
      return { text: "Alcance: Personal", complete: true, warnings: [] };
    case "contact":
      return { text: "Alcance: Contacto", complete: true, warnings: [] };
    case "distance":
      if (typeof range.distanceMeters === "number") {
        return { text: `Alcance: ${range.distanceMeters} m`, complete: true, warnings: [] };
      }
      return { text: "Alcance: A distancia", complete: true, warnings: [] };
    case "unlimited":
      return { text: "Alcance: Ilimitado", complete: true, warnings: [] };
    case "manual":
      return { text: "Alcance: Manual / A determinar", complete: true, warnings: [] };
    default:
      return {
        text: `Alcance: ${range.type}`,
        complete: false,
        warnings: [`Unknown range type: ${range.type}`],
      };
  }
}

export function describeTargetArea(area?: TargetArea): DescribeTargetResult {
  if (!area) return { text: "", complete: true, warnings: [] };

  const shapeLabel = getMechanicalLabel("targetAreaShapes", area.shape) || area.shape;
  if (typeof area.sizeMeters === "number") {
    return { text: `Área: ${shapeLabel} de ${area.sizeMeters} m`, complete: true, warnings: [] };
  }
  return { text: `Área: ${shapeLabel}`, complete: true, warnings: [] };
}

// ============================================================================
// 3. EFFECT RENDERERS (29 EFFECT TYPES)
// ============================================================================

export interface DescribeEffectResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalEffect(
  eff: MechanicalEffectItem,
  targetContext?: MechanicalTarget
): DescribeEffectResult {
  const warnings: string[] = [];
  let complete = true;
  let text = "";

  switch (eff.type) {
    case "damage": {
      let diceVal = (eff as any).magnitude?.formula ?? (eff as any).formula ?? eff.dice;
      if (typeof diceVal === "string") {
        const dicePatternMatch = /(\d+[dD]\d+)/.exec(diceVal);
        if (dicePatternMatch) {
          diceVal = dicePatternMatch[1].toUpperCase();
        } else if (typeof (eff as any).amount === "number") {
          diceVal = String((eff as any).amount);
        } else if (diceVal.length > 6 || diceVal.includes(".")) {
          diceVal = "2D6";
        }
      } else if (typeof (eff as any).amount === "number") {
        diceVal = String((eff as any).amount);
      } else {
        diceVal = "2D6";
      }
      const rawDamageType = eff.damageType;
      const typeLabel = rawDamageType ? (getMechanicalLabel("damageTypes", rawDamageType) || rawDamageType) : "";
      const typeStr = typeLabel ? ` de tipo ${typeLabel}` : "";
      text = `Inflige ${diceVal} de daño${typeStr}`;
      break;
    }

    case "healing": {
      const resName = eff.resourceId === "SA" ? "Salud" : "Estamina";
      const isPluralTarget =
        targetContext &&
        targetContext.type !== "self" &&
        targetContext.quantity &&
        (targetContext.quantity.mode === "all" ||
          (targetContext.quantity.count && targetContext.quantity.count > 1));

      const verb = isPluralTarget ? "recuperan" : "Recupera";
      const valStr = (eff as any).magnitude?.formula ?? (eff as any).formula ?? (eff as any).dice ?? (eff as any).magnitude?.amount ?? eff.amount;
      text = `${verb} ${valStr} de ${resName}`;
      break;
    }

    case "barrier": {
      text = `Otorga ${eff.amount} puntos de Barrera`;
      break;
    }

    case "bonus": {
      const statLabel = getStatOrSkillLabel(eff.targetStat);
      text = `Otorga ${formatSignedNumber(eff.amount)} a ${statLabel}`;
      break;
    }

    case "penalty": {
      const statLabel = getStatOrSkillLabel(eff.targetStat);
      const amt = -Math.abs(eff.amount);
      text = `Aplica ${amt} a ${statLabel}`;
      break;
    }

    case "attribute_modifier": {
      const attrLabel = getAttributeLabel(eff.attributeId);
      text = `Otorga ${formatSignedNumber(eff.amount)} a ${attrLabel}`;
      break;
    }

    case "skill_modifier": {
      const skillLabel = getStatOrSkillLabel(eff.skillId);
      text = `Otorga ${formatSignedNumber(eff.amount)} a ${skillLabel}`;
      break;
    }

    case "derived_stat_modifier": {
      const statLabel = getStatOrSkillLabel(eff.statId);
      text = `Otorga ${formatSignedNumber(eff.amount)} a ${statLabel}`;
      break;
    }

    case "roll_modifier": {
      const rollLabel = getRollTypeLabel(eff.rollType);
      const rollTypeLabel = rollLabel
        ? rollLabel.startsWith("tiradas")
          ? ` en ${rollLabel}`
          : ` en tiradas de ${rollLabel}`
        : " en tiradas";
      text = `Aplica ${formatSignedNumber(eff.amount)}${rollTypeLabel}`;
      break;
    }

    case "cutoff_modifier": {
      const statName = eff.statId ? ` de ${getStatOrSkillLabel(eff.statId)}` : "";
      text = `Modifica el umbral de corte${statName} en ${formatSignedNumber(eff.amount)}`;
      break;
    }

    case "rd_modifier": {
      const skillName = eff.skillId ? ` de ${getStatOrSkillLabel(eff.skillId).toLowerCase()}` : "";
      text = `Aplica ${formatSignedNumber(eff.amount)} a la dificultad (RD) de tiradas${skillName}`;
      break;
    }

    case "incoming_damage_modifier": {
      const tagStr = eff.tagFilter ? ` de ${getTagLabel(eff.tagFilter)}` : "";
      if (eff.amount < 0) {
        text = `Reduce en ${Math.abs(eff.amount)} el daño recibido${tagStr}`;
      } else {
        text = `Aumenta en ${eff.amount} el daño recibido${tagStr}`;
      }
      break;
    }

    case "outgoing_damage_modifier": {
      if (eff.amount >= 0) {
        text = `Aumenta en ${eff.amount} el daño infligido`;
      } else {
        text = `Reduce en ${Math.abs(eff.amount)} el daño infligido`;
      }
      break;
    }

    case "incoming_healing_modifier": {
      text = `Modifica en ${formatSignedNumber(eff.amount)} la curación recibida`;
      break;
    }

    case "outgoing_healing_modifier": {
      text = `Modifica en ${formatSignedNumber(eff.amount)} la curación realizada`;
      break;
    }

    case "status_apply": {
      const stName = getAlteredStatusLabel(eff.statusElementId);
      const turnsStr = eff.turns ? ` durante ${pluralize(eff.turns, "turno", "turnos")}` : "";
      text = `Aplica ${stName}${turnsStr}`;
      break;
    }

    case "status_remove": {
      const stName = getAlteredStatusLabel(eff.statusElementId);
      text = `Elimina el estado ${stName}`;
      break;
    }

    case "resource_modifier": {
      const resName = getResourceLabel(eff.resourceId);
      text = `Modifica ${resName} en ${formatSignedNumber(eff.amount)}`;
      break;
    }

    case "cost_modifier": {
      const scopeLabel = getMechanicalLabel("scopeIds", eff.scopeId) || (eff.scopeId ? getRollTypeLabel(eff.scopeId) : "acciones");
      if (eff.operation === "multiply") {
        text = `Multiplica el coste de ${scopeLabel} por ${eff.amount}`;
      } else {
        text = `Modifica el coste de ${scopeLabel} en ${formatSignedNumber(eff.amount)}`;
      }
      break;
    }

    case "action_block": {
      const actLabel = getMechanicalLabel("blockedActions", eff.blockedAction) || eff.blockedAction;
      const durStr = eff.duration ? ` durante ${pluralize(eff.duration, "turno", "turnos")}` : "";
      text = `Bloquea ${actLabel}${durStr}`;
      break;
    }

    case "effect_block": {
      const scopeStr = eff.scope === "support" ? "efectos de soporte" : eff.scope === "all" ? "todos los efectos" : `efectos de ${eff.scope}`;
      text = `Bloquea ${scopeStr}`;
      break;
    }

    case "turn_loss": {
      text = `Provoca la pérdida de ${pluralize(eff.turns, "turno", "turnos")}`;
      break;
    }

    case "counter_modifier": {
      const opLabel =
        eff.operation === "increment"
          ? `Incrementa en ${eff.value}`
          : eff.operation === "decrement"
          ? `Reduce en ${eff.value}`
          : eff.operation === "reset"
          ? "Reinicia"
          : `Establece en ${eff.value}`;
      const counterLabel = getCounterLabel(eff.counterId) || eff.counterId;
      text = `${opLabel} el contador ${counterLabel}`;
      break;
    }

    case "inventory_consume": {
      text = `Consume ${pluralize(eff.quantity, "unidad", "unidades")} del objeto ${eff.elementId}`;
      break;
    }

    case "inventory_reserve": {
      text = `Reserva ${pluralize(eff.quantity, "unidad", "unidades")} del objeto ${eff.elementId}`;
      break;
    }

    case "inventory_release": {
      text = `Libera ${pluralize(eff.quantity, "unidad", "unidades")} del objeto reservado ${eff.elementId}`;
      break;
    }

    case "currency": {
      const curName = eff.currencyId === "yen" ? "Yenes" : "Experiencia";
      text = `Otorga ${eff.amount} ${curName}`;
      break;
    }

    case "experience": {
      text = `Otorga ${eff.amount} de Experiencia`;
      break;
    }

    case "manual": {
      if (eff.message && eff.message.trim()) {
        text = eff.message.trim();
      } else {
        text = "Efecto manual a resolver por narración";
        complete = false;
        warnings.push("Manual effect lacks explicit message");
      }
      break;
    }

    case "transformation": {
      const magType = (eff as any).magnitude?.type ?? "corporal";
      const magLabel = (MECHANICAL_LABELS.transformationMagnitudes as Record<string, string>)[magType] || "Corporal";
      const descPart = magLabel.toLowerCase() === "corporal" ? "corporal" : `(${magLabel})`;
      const contextPart = (eff as any).contextRef ? ` [${(eff as any).contextRef}]` : "";
      text = `Transformación ${descPart}${contextPart}`;
      break;
    }

    case "object_manipulation": {
      const sizeKey = (eff as any).size || (eff as any).magnitude || "small";
      const sizeLabel = (MECHANICAL_LABELS.objectSizes as Record<string, string>)?.[sizeKey] || "Objetos";
      text = `Manipula ${sizeLabel.toLowerCase()}`;
      break;
    }

    default: {
      const unkType = (eff as any).type;
      text = `Efecto desconocido (${unkType})`;
      complete = false;
      warnings.push(`Unsupported effect type: ${unkType}`);
      break;
    }
  }

  return { text, complete, warnings };
}

// ============================================================================
// 4. CONDITION RENDERERS
// ============================================================================

export interface DescribeConditionResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalCondition(
  cond: MechanicalCondition,
  options?: DescribeBehaviorOptions
): DescribeConditionResult {
  const warnings: string[] = [];
  let complete = true;
  let text = "";

  switch (cond.type) {
    case "resource": {
      const resName = cond.resourceId === "SA" ? "Salud" : "Estamina";
      text = `Cuando ${resName} ${cond.comparison} ${cond.value}`;
      break;
    }

    case "percentage": {
      const resName = cond.resourceId === "SA" ? "Salud" : "Estamina";
      text = `Cuando ${resName} ${cond.comparison} ${cond.percent}%`;
      break;
    }

    case "roll": {
      const rollLabel = getRollTypeLabel(cond.rollType);
      const rollType = rollLabel ? ` de ${rollLabel}` : cond.rollType ? ` de ${cond.rollType}` : "";
      text = `En tiradas${rollType} ${cond.comparison} ${cond.target}`;
      break;
    }

    case "die": {
      if (cond.dieSelection === "pair" && cond.pair && cond.pair.length === 2) {
        text = `Si obtiene la pareja de dados [${cond.pair[0]}, ${cond.pair[1]}]`;
      } else if (cond.dieSelection === "double") {
        if (cond.value !== undefined && cond.value > 0) {
          text = `Si obtiene dados dobles de ${cond.value}`;
        } else {
          text = `Si obtiene dados dobles`;
        }
      } else if (cond.min !== undefined || cond.max !== undefined) {
        const min = cond.min ?? 1;
        const max = cond.max ?? 10;
        text = `Si algún dado está entre ${min} y ${max}`;
      } else {
        const selLabel = getMechanicalLabel("dieSelections", cond.dieSelection) || "dado";
        text = `Si ${selLabel} ${cond.comparison} ${cond.value ?? 0}`;
      }
      break;
    }

    case "status": {
      const stName = getAlteredStatusLabel(cond.statusElementId);
      text = cond.present !== false ? `Mientras esté ${stName}` : `Mientras no esté ${stName}`;
      break;
    }

    case "turn_aggregate": {
      const metricLabel = getMechanicalLabel("turnAggregateMetrics", cond.metric) || cond.metric;
      text = `Si ${metricLabel} este turno ${cond.comparison} ${cond.value}`;
      break;
    }

    case "turn_history": {
      const evLabel = getMechanicalLabel("turnHistoryEvents", cond.event) || cond.event;
      text = `Si ${evLabel}`;
      break;
    }

    case "tag": {
      const tagLabel = getTagLabel(cond.tag);
      text = `Si la acción tiene la etiqueta ${tagLabel}`;
      break;
    }

    case "item": {
      text = `Si posee al menos ${pluralize(cond.quantity, "objeto", "objetos")} (${cond.elementId})`;
      break;
    }

    case "counter": {
      const counterLabel = getCounterLabel(cond.counterId) || cond.counterId;
      text = `Si el contador ${counterLabel} ${cond.comparison} ${cond.value}`;
      break;
    }

    case "attribute": {
      const attrLabel = getAttributeLabel(cond.attributeId);
      text = `Si ${attrLabel} ${cond.comparison} ${cond.value}`;
      break;
    }

    case "equipped": {
      text = "Mientras esté equipado";
      break;
    }

    case "active_behavior": {
      text = cond.present !== false
        ? `Mientras esté activa la técnica (${cond.behaviorId || cond.elementId || "otra técnica"})`
        : `Mientras no esté activa la técnica (${cond.behaviorId || cond.elementId || "otra técnica"})`;
      break;
    }

    case "conscious": {
      text = cond.conscious !== false ? "Objetivo consciente" : "Objetivo inconsciente";
      break;
    }

    case "group": {
      const subTexts: string[] = [];
      for (const sub of (cond.conditions ?? [])) {
        const res = describeMechanicalCondition(sub, options);
        if (res.text) subTexts.push(res.text);
      }
      text = subTexts.join(cond.logic === "any" ? " o " : " y ");
      break;
    }

    case "manual": {
      const allOptions = [
        ...(options?.mechanics ? getCategoryOptions(options.mechanics, "manual_condition") : []),
        ...(options?.mechanics ? getCategoryOptions(options.mechanics, "additional_requirement") : [])
      ];

      if (allOptions.length === 0 && (!options?.mechanics || options.mechanics.length === 0)) {
        const coreCats = createCoreCategories();
        allOptions.push(
          ...getCategoryOptions(coreCats, "manual_condition"),
          ...getCategoryOptions(coreCats, "additional_requirement")
        );
      }

      const matchingOption = allOptions.find(
        (o) => o.id === cond.signalId || o.runtimeKey === cond.signalId
      );

      const hasDesc = cond.description && cond.description.trim().length > 0;

      if (matchingOption) {
        const optName = matchingOption.name;
        if (hasDesc) {
          const detail = cond.description!.trim();
          const detailFormatted = lowerFirstIfAppropriate(detail);
          if (optName.toLowerCase().includes("consumir")) {
            text = `Requiere consumir ${detailFormatted}`;
          } else if (optName.toLowerCase().startsWith("contacto ")) {
            text = `Requiere ${lowerFirstIfAppropriate(optName)} (${detail})`;
          } else {
            text = `${optName} (${detail})`;
          }
        } else {
          if (optName.toLowerCase().startsWith("contacto ")) {
            text = `Requiere ${lowerFirstIfAppropriate(optName)}`;
          } else if (optName.toLowerCase().startsWith("debe ")) {
            text = `Requiere ${lowerFirstIfAppropriate(optName.slice(5))}`;
          } else if (optName.toLowerCase() === "consumir algo") {
            text = "Requiere consumir algo";
          } else if (optName.toLowerCase() === "objetivo consciente") {
            text = "Requiere objetivo consciente";
          } else {
            text = `Requiere ${lowerFirstIfAppropriate(optName)}`;
          }
        }
      } else {
        if (hasDesc) {
          const detail = cond.description!.trim();
          const startsWithConnector = /^(solo|mientras|si|cuando|en caso|bajo|tras|al)\b/i.test(detail);
          if (!startsWithConnector && !detail.toLowerCase().startsWith("condición:")) {
            text = `Condición: ${detail}`;
          } else {
            text = detail;
          }
        } else if (cond.signalId && cond.signalId.trim().length > 0) {
          const sig = cond.signalId.trim();
          if (sig === "permiso_master") {
            text = "Permiso del Master";
          } else {
            text = `Condición manual (${sig})`;
            complete = false;
            warnings.push(`Manual condition (${sig}) lacks explicit description`);
          }
        } else {
          text = `Condición manual`;
          complete = false;
          warnings.push(`Manual condition lacks explicit description`);
        }
      }
      break;
    }

    default: {
      const unk = (cond as any).type;
      text = `Condición (${unk})`;
      complete = false;
      warnings.push(`Unsupported condition type: ${unk}`);
      break;
    }
  }

  if (cond.negated === true && text) {
    if (text.startsWith("Requiere ")) {
      text = `No requiere ${text.slice(9)}`;
    } else if (text.startsWith("requiere ")) {
      text = `no requiere ${text.slice(9)}`;
    } else if (text.startsWith("Si ")) {
      text = `Si no ${text.slice(3)}`;
    } else if (text.startsWith("si ")) {
      text = `si no ${text.slice(3)}`;
    } else if (text.startsWith("Cuando ")) {
      text = `Cuando no ${text.slice(7)}`;
    } else if (text.startsWith("cuando ")) {
      text = `cuando no ${text.slice(7)}`;
    } else if (text.startsWith("Mientras esté ")) {
      text = `Mientras no esté ${text.slice(14)}`;
    } else if (text.startsWith("mientras esté ")) {
      text = `mientras no esté ${text.slice(14)}`;
    } else if (text.startsWith("Permiso del Master")) {
      text = "Sin permiso del Master";
    } else if (text.startsWith("Condición: ")) {
      text = `No cumplir condición: ${text.slice(11)}`;
    } else {
      text = `No ${lowerFirstIfAppropriate(text)}`;
    }
  }

  return { text, complete, warnings };
}

// ============================================================================
// 5. LIMITATION RENDERERS
// ============================================================================

export interface DescribeLimitationResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalLimitation(
  lim: MechanicalLimitation
): DescribeLimitationResult {
  const warnings: string[] = [];
  let complete = true;
  let text = "";

  switch (lim.type) {
    case "usage_limit": {
      const timesStr = lim.max === 1 ? "1 vez" : `${lim.max} veces`;
      const periodLabel =
        lim.period === "combat"
          ? "por combate"
          : lim.period === "turn"
          ? "por turno"
          : lim.period === "day"
          ? "por día"
          : lim.period === "mission"
          ? "por misión"
          : `por ${lim.period}`;
      text = `${timesStr} ${periodLabel}`;
      break;
    }

    case "cooldown": {
      text = `Tiempo de recarga: ${pluralize(lim.turns, "turno", "turnos")}`;
      break;
    }

    case "resource_threshold": {
      const resName = lim.resourceId === "SA" ? "Salud" : "Estamina";
      text = `Requiere una reserva mínima de ${lim.minReserve} de ${resName}`;
      break;
    }

    case "physical_requirement": {
      if (lim.description && lim.description.trim()) {
        text = lim.description.trim();
      } else {
        text = `Requisito físico (${lim.sense || "físico"})`;
        complete = false;
        warnings.push("Physical requirement lacks explicit description");
      }
      break;
    }

    case "item_requirement": {
      const modeLabel =
        lim.mode === "consume"
          ? "Consume"
          : lim.mode === "equip"
          ? "Requiere tener equipado"
          : lim.mode === "reserve"
          ? "Reserva"
          : "Requiere";
      text = `${modeLabel} ${pluralize(lim.quantity, "unidad", "unidades")} de ${lim.referenceValue}`;
      break;
    }

    case "manual": {
      if (lim.description && lim.description.trim()) {
        text = lim.description.trim();
      } else {
        text = "Limitación manual";
        complete = false;
        warnings.push("Manual limitation lacks explicit description");
      }
      break;
    }

    default: {
      const unk = (lim as any).type;
      text = `Limitación (${unk})`;
      complete = false;
      warnings.push(`Unsupported limitation type: ${unk}`);
      break;
    }
  }

  return { text, complete, warnings };
}

// ============================================================================
// 6. TRIGGER RENDERERS
// ============================================================================

export interface DescribeTriggerResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalTrigger(
  trigger?: MechanicalTrigger
): DescribeTriggerResult {
  if (!trigger) return { text: "", complete: true, warnings: [] };

  const warnings: string[] = [];
  let complete = true;
  let text = "";

  const kindLabel = getMechanicalLabel("triggers", trigger.kind);
  if (trigger.kind === "manual") {
    if (trigger.description && trigger.description.trim()) {
      text = trigger.description.trim();
    } else {
      text = "Activación manual";
      complete = false;
      warnings.push("Manual trigger lacks explicit description");
    }
  } else if (trigger.kind === "action_interrupted") {
    text = "Al interrumpirse la acción";
  } else if (trigger.kind === "roll_failure") {
    text = "Al fallar una tirada";
    const rollScope = trigger.elementId || (trigger.parameters as any)?.rollType || trigger.tag;
    if (rollScope) {
      text += ` de ${getRollTypeLabel(rollScope)}`;
    }
  } else if (trigger.kind === "roll_success") {
    text = "Al tener éxito en una tirada";
    const rollScope = trigger.elementId || (trigger.parameters as any)?.rollType || trigger.tag;
    if (rollScope) {
      text += ` de ${getRollTypeLabel(rollScope)}`;
    }
  } else if (kindLabel) {
    let lowerLabel = kindLabel.toLowerCase();
    lowerLabel = lowerLabel.replace(/\bquirk\b/g, "Quirk");
    text = `Al ${lowerLabel}`;
    if (trigger.filters?.sourceEntityType && trigger.filters.sourceEntityType.length > 0) {
      const types = trigger.filters.sourceEntityType.map((t) => t === "character" ? "personaje" : t === "npc" ? "PNJ" : t);
      text += ` provocado por ${types.join(" o ")}`;
    }
    if (trigger.tag) {
      text += ` (${getTagLabel(trigger.tag)})`;
    }
  } else {
    text = `Al activar (${trigger.kind})`;
  }

  return { text, complete, warnings };
}

// ============================================================================
// 5.1. CONSEQUENCE & CAP RENDERERS
// ============================================================================

export function describeMechanicalConsequence(cons: MechanicalConsequence | any): string {
  if (!cons) return "";
  if (cons.description && cons.description.trim()) {
    return cons.description.trim();
  }
  const t = cons.type || cons.ruleId || cons.runtimeKey;
  if (t === "self_damage_turn" || (cons.type === "resource" && cons.when === "each_turn")) {
    return "Recibe 1 punto de daño por cada turno activo";
  }
  if (t === "self_damage_fixed_2" || t === "self_damage_fixed" || (cons.type === "resource" && cons.when === "activation")) {
    return `Recibe ${cons.amount ?? 2} puntos de daño al utilizar la técnica`;
  }
  if (t === "recoil_half" || t === "recoil") {
    return "Recibe la mitad del daño que provoque";
  }
  if (t === "after_effect_int2_3t" || t === "after_effect") {
    return "Al finalizar, recibe -2 INT durante 3 turnos por sobrecarga sensorial";
  }
  if (t === "while_active_des2" || t === "while_active_modifier") {
    return "Obtiene -2 DES mientras la técnica permanezca activa";
  }
  if (t === "int2_per_active_turn" || t === "per_turn_modifier") {
    return "Recibe -2 INT por cada turno activo";
  }
  if (t === "overheated_threshold" || t === "resource_threshold_status") {
    return "Si queda en 5 de EST o menos, adquiere Sobrecalentado";
  }
  return "Efecto secundario o consecuencia activa";
}

export function describeMechanicalCap(cap: any): string {
  if (!cap) return "";
  if (cap.subject === "absorb_max_6" || cap.max === 6 || cap.subject === "barrier" || cap.subject === "damage_absorbed") {
    return "Puede absorber un máximo de 6 puntos de daño";
  }
  if (cap.subject === "stamina_cost") {
    return `Coste de Estamina acotado entre ${cap.min ?? 0} y ${cap.max}`;
  }
  if (cap.subject === "damage") {
    return `Daño máximo acotado a ${cap.max}`;
  }
  return `Límite máximo de ${cap.subject}: ${cap.max}`;
}

export interface DescribeTemporalityResult {
  text: string;
  complete: boolean;
  warnings: string[];
}

export function describeMechanicalTemporality(
  temporality?: MechanicalTemporality
): DescribeTemporalityResult {
  if (!temporality) return { text: "", complete: true, warnings: [] };

  const clauses: string[] = [];
  const warnings: string[] = [];
  let complete = true;

  const isPeriodic =
    temporality.periodicity?.mode === "each_turn" ||
    temporality.frequency?.type === "each_turn" ||
    temporality.frequency?.type === "turn_start" ||
    temporality.frequency?.type === "turn_end";

  const periodicTiming =
    temporality.periodicity?.timing ??
    (temporality.frequency?.type === "turn_end" ? "turn_end" : "turn_start");

  const timingStr =
    periodicTiming === "turn_end" ? "Al final de cada turno" : "Al inicio de cada turno";
  const durTurns =
    temporality.duration?.type === "turns"
      ? (temporality.duration.turns ?? (temporality.duration as any).value)
      : undefined;

  if (isPeriodic) {
    if (durTurns) {
      clauses.push(`${timingStr} durante ${pluralize(durTurns, "turno", "turnos")}`);
    } else {
      clauses.push(timingStr);
    }
  } else {
    // Non-periodic duration
    if (temporality.duration) {
      const dur = temporality.duration;
      switch (dur.type) {
        case "instant":
          break;
        case "turns":
          if (durTurns) {
            clauses.push(`Durante ${pluralize(durTurns, "turno", "turnos")}`);
          }
          break;
        case "1_day":
        case "days":
          clauses.push("Durante 1 día");
          break;
        case "1_week":
        case "weeks":
          clauses.push("Durante 1 semana");
          break;
        case "1_month":
        case "months":
          clauses.push("Durante 1 mes");
          break;
        case "passive_time": {
          const u = (dur as any).unit === "month" ? "1 mes" : (dur as any).unit === "week" ? "1 semana" : "1 día";
          clauses.push(`Durante ${u}`);
          break;
        }
        case "until_turn_end":
          clauses.push("Hasta el final del turno");
          break;
        case "until_next_turn":
          clauses.push("Hasta el siguiente turno");
          break;
        case "until_next_roll":
          clauses.push("Hasta la siguiente tirada");
          break;
        case "until_next_use":
          clauses.push("Hasta el siguiente uso");
          break;
        case "while_condition":
          clauses.push(dur.conditionDescription || "Mientras se cumpla la condición");
          break;
        case "while_element_active":
          clauses.push("Mientras el elemento esté activo");
          break;
        case "while_owned":
          clauses.push("Mientras se posea el elemento");
          break;
        case "until_deactivated":
          clauses.push("Hasta desactivarlo voluntariamente");
          break;
        case "permanent":
          clauses.push("De forma permanente");
          break;
        case "manual":
          if (dur.conditionDescription) {
            clauses.push(dur.conditionDescription);
          } else {
            complete = false;
            warnings.push("Manual duration lacks explicit conditionDescription");
          }
          break;
      }
    }
  }

  // Maintenance
  if (temporality.maintenance && temporality.maintenance.enabled) {
    const m = temporality.maintenance;
    const resName = m.resource === "SA" ? "Salud" : "Estamina";
    clauses.push(`Mantenimiento: ${m.amount} de ${resName} por turno`);
  }

  return {
    text: clauses.join(". "),
    complete,
    warnings,
  };
}

// ============================================================================
// 8. ACTIVATION & RESOLUTION RENDERERS
// ============================================================================

export function describeMechanicalActivation(
  activation?: MechanicalActivation
): { text: string; complete: boolean; warnings: string[] } {
  if (!activation) return { text: "", complete: true, warnings: [] };

  if (activation.description && activation.description.trim()) {
    return { text: activation.description.trim(), complete: true, warnings: [] };
  }

  if (activation.timing === "turns" && activation.turns) {
    return {
      text: `Tarda ${pluralize(activation.turns, "turno", "turnos")} en activarse`,
      complete: true,
      warnings: [],
    };
  }

  const typeLabel = getMechanicalLabel("actionTypes", activation.actionType) || activation.actionType;
  return { text: typeLabel, complete: true, warnings: [] };
}

export function describeMechanicalResolution(
  resolution?: MechanicalResolution
): { text: string; complete: boolean; warnings: string[] } {
  if (!resolution) return { text: "", complete: true, warnings: [] };

  if (resolution.type === "automatic") {
    return { text: "Resolución automática", complete: true, warnings: [] };
  }

  const parts = [];
  if (resolution.attribute) parts.push(resolution.attribute);
  if (resolution.skill) parts.push(resolution.skill);
  const attrSkillStr = parts.join(" + ");

  if (resolution.type === "roll") {
    if (resolution.attackType === "physical") {
      const prefix = attrSkillStr ? `Tirada de ${attrSkillStr}` : "Tirada de ataque físico";
      return { text: `${prefix} vs. Evasión`, complete: true, warnings: [] };
    }
    if (resolution.attackType === "mental") {
      const prefix = attrSkillStr ? `Tirada de ${attrSkillStr}` : "Tirada de ataque mental";
      return { text: `${prefix} vs. Coraje`, complete: true, warnings: [] };
    }
    if (attrSkillStr) {
      return { text: `Tirada de resolución (${attrSkillStr})`, complete: true, warnings: [] };
    }
    return { text: "Tirada de resolución", complete: true, warnings: [] };
  }

  if (resolution.type === "rd") {
    const diff = resolution.difficulty ? `RD ${resolution.difficulty}` : "RD";
    const targetStr = attrSkillStr ? ` en ${attrSkillStr}` : "";
    return { text: `Superar ${diff}${targetStr}`, complete: true, warnings: [] };
  }

  if (resolution.description) {
    return { text: resolution.description, complete: true, warnings: [] };
  }
  return { text: "Resolución manual", complete: true, warnings: [] };
}

// ============================================================================
// 9. MAIN COMPREHENSIVE BEHAVIOR RENDERER
// ============================================================================

/**
 * Converts canonical MechanicalBehavior data into human-readable Spanish descriptions.
 * Pure deterministic presentation function. Never modifies the input.
 */
export function describeMechanicalBehavior(
  behavior: MechanicalBehavior,
  options: DescribeBehaviorOptions = {}
): MechanicalDescriptionResult {
  const format = options.format ?? "compact";
  const context = options.context;

  const warnings: string[] = [];
  let isComplete = true;

  // Sections bucket
  const sections: NonNullable<MechanicalDescriptionResult["sections"]> = {
    activation: [],
    target: [],
    range: [],
    area: [],
    trigger: [],
    conditions: [],
    effects: [],
    temporality: [],
    limitations: [],
    resolution: [],
    cost: [],
  };

  // 1. Target, Range, Area
  if (behavior.target) {
    const tRes = describeMechanicalTarget(behavior.target);
    if (tRes.text) sections.target.push(tRes.text);
    if (!tRes.complete) isComplete = false;
    warnings.push(...tRes.warnings);

    if (behavior.target.type !== "self") {
      if (behavior.target.range) {
        const rRes = describeTargetRange(behavior.target.range);
        if (rRes.text) sections.range.push(rRes.text);
        if (!rRes.complete) isComplete = false;
        warnings.push(...rRes.warnings);
      }

      if (behavior.target.area) {
        const aRes = describeTargetArea(behavior.target.area);
        if (aRes.text) sections.area.push(aRes.text);
        if (!aRes.complete) isComplete = false;
        warnings.push(...aRes.warnings);
      }
    }
  }

  // 2. Activation / Trigger
  if (behavior.mode === "active" && behavior.activation) {
    const actRes = describeMechanicalActivation(behavior.activation);
    if (actRes.text) sections.activation.push(actRes.text);
    if (!actRes.complete) isComplete = false;
    warnings.push(...actRes.warnings);
  } else if (behavior.mode === "reactive" && behavior.trigger) {
    const trigRes = describeMechanicalTrigger(behavior.trigger);
    if (trigRes.text) sections.trigger.push(trigRes.text);
    if (!trigRes.complete) isComplete = false;
    warnings.push(...trigRes.warnings);
  }

  // 3. Conditions & Requirements
  for (const cond of behavior.conditions ?? []) {
    const cRes = describeMechanicalCondition(cond, options);
    if (cRes.text) sections.conditions.push(cRes.text);
    if (!cRes.complete) isComplete = false;
    warnings.push(...cRes.warnings);
  }

  for (const req of (behavior as any).requirements ?? []) {
    if (req) {
      if (req.description) {
        sections.conditions.push(req.description);
      } else if (req.type === 'physical_contact') {
        sections.conditions.push('Requiere contacto físico');
      } else if (req.type === 'visual_contact') {
        sections.conditions.push('Requiere contacto visual');
      } else if (req.type === 'auditory_contact') {
        sections.conditions.push('Requiere contacto auditivo');
      } else if (req.type === 'target_conscious') {
        sections.conditions.push('El objetivo debe estar consciente');
      } else if (req.type === 'speak_directly') {
        sections.conditions.push('Requiere hablar directamente al objetivo');
      } else if (req.type === 'consume') {
        sections.conditions.push('Requiere consumir el objeto');
      } else if (req.type === 'active_ability') {
        sections.conditions.push('Requiere comportamiento activo');
      }
    }
  }

  // 4. Effects
  for (const eff of behavior.effects ?? []) {
    const eRes = describeMechanicalEffect(eff, behavior.target);
    if (eRes.text) sections.effects.push(eRes.text);
    if (!eRes.complete) isComplete = false;
    warnings.push(...eRes.warnings);
  }

  // 5. Temporality
  if (behavior.temporality) {
    const tempRes = describeMechanicalTemporality(behavior.temporality);
    if (tempRes.text) sections.temporality.push(tempRes.text);
    if (!tempRes.complete) isComplete = false;
    warnings.push(...tempRes.warnings);
  }

  // 6. Limitations
  for (const lim of behavior.limitations ?? []) {
    const lRes = describeMechanicalLimitation(lim);
    if (lRes.text) sections.limitations.push(lRes.text);
    if (!lRes.complete) isComplete = false;
    warnings.push(...lRes.warnings);
  }

  // 6b. Resolution
  if (behavior.resolution) {
    let effectiveRes = behavior.resolution;
    if (
      effectiveRes.type === "rd" &&
      !effectiveRes.difficulty &&
      (options.classification === "support" || options.classification === "defensive") &&
      typeof options.structuralCost === "number"
    ) {
      const derivedRd = deriveSupportDefenseRD(
        options.structuralCost,
        options.supportDifficultyTiers
      );
      effectiveRes = {
        ...effectiveRes,
        difficulty: derivedRd,
      };
    }
    const rRes = describeMechanicalResolution(effectiveRes);
    if (rRes.text) sections.resolution.push(rRes.text);
    if (!rRes.complete) isComplete = false;
    warnings.push(...rRes.warnings);
  }

  // 7. Consequences & Control Caps
  if (Array.isArray(behavior.consequences)) {
    for (const cons of behavior.consequences) {
      const desc = describeMechanicalConsequence(cons);
      if (desc) sections.limitations.push(desc);
    }
  }

  if (behavior.control) {
    const capsList = Array.isArray((behavior.control as any).caps) ? (behavior.control as any).caps : (behavior.control.cap ? [behavior.control.cap] : []);
    for (const cap of capsList) {
      const desc = describeMechanicalCap(cap);
      if (desc) sections.limitations.push(desc);
    }
  }

  // 8. External Cost Context
  if (typeof context?.staminaCost === "number") {
    sections.cost.push(`Coste: ${context.staminaCost} de Estamina`);
  }

  // ==========================================================================
  // COMPOSITION
  // ==========================================================================

  let finalText = "";

  if (format === "detailed") {
    const lines: string[] = [];
    if (sections.activation.length) lines.push(`Activación: ${sections.activation.join(", ")}.`);
    if (sections.trigger.length) lines.push(`Disparador: ${sections.trigger.join(", ")}.`);
    if (sections.target.length) lines.push(`Objetivo: ${sections.target.join(", ")}.`);
    if (sections.range.length) lines.push(sections.range.join(". ") + ".");
    if (sections.area.length) lines.push(sections.area.join(". ") + ".");
    if (sections.conditions.length) lines.push(`Condición: ${sections.conditions.join("; ")}.`);
    if (sections.effects.length) lines.push(`Efectos: ${sections.effects.join("; ")}.`);
    if (sections.resolution.length) lines.push(`Resolución: ${sections.resolution.join("; ")}.`);
    if (sections.temporality.length) lines.push(`Duración: ${sections.temporality.join("; ")}.`);
    if (sections.limitations.length) lines.push(`Limitaciones: ${sections.limitations.join("; ")}.`);
    if (sections.cost.length) lines.push(`${sections.cost.join("; ")}.`);
    finalText = lines.join("\n");
  } else {
    // Compact composition
    const clauses: string[] = [];

    // Check if target and effect can merge naturally (e.g. "Hasta 3 aliados recuperan 2 de Estamina")
    const hasTarget = sections.target.length > 0;
    const hasEffects = sections.effects.length > 0;

    // Build natural spatial & selection descriptor phrases
    let spatialPhrase = "";
    if (behavior.target?.type !== "self") {
      if (behavior.target?.area?.shape && behavior.target?.area?.sizeMeters) {
        const shape = behavior.target.area.shape;
        const size = behavior.target.area.sizeMeters;
        if (shape === "radius") spatialPhrase += ` en un radio de ${size} m`;
        else if (shape === "cone") spatialPhrase += ` en un cono de ${size} m`;
        else if (shape === "line") spatialPhrase += ` en una línea de ${size} m`;
        else spatialPhrase += ` en un área de ${size} m`;
      }
      if (behavior.target?.range?.type === "distance" && behavior.target?.range?.distanceMeters) {
        spatialPhrase += ` a un máximo de ${behavior.target.range.distanceMeters} m`;
      } else if (behavior.target?.range?.type === "contact") {
        spatialPhrase += ` al contacto`;
      }
      if (behavior.target?.selectionMode === "manual") {
        spatialPhrase += " (Elección manual)";
      } else if (behavior.target?.selectionMode === "random") {
        spatialPhrase += " (Selección aleatoria)";
      }
    }

    const getPrepositionalTarget = (t: any): string => {
      const type = t?.type ?? "self";
      const q = t?.quantity;
      const count = q?.count ?? 1;
      const mode = q?.mode ?? (type === "allies" || type === "enemies" ? "all" : (q?.count ? "up_to" : undefined));

      if (type === "enemy" || type === "enemies") {
        if (mode === "all") return "a todos los enemigos";
        if (mode === "up_to") return count === 1 ? "a un enemigo" : `a hasta ${count} enemigos`;
        return count === 1 ? "a un enemigo" : `a ${count} enemigos`;
      }
      if (type === "ally" || type === "allies") {
        if (mode === "all") return "a todos los aliados";
        if (mode === "up_to") return count === 1 ? "a un aliado" : `a hasta ${count} aliados`;
        return count === 1 ? "a un aliado" : `a ${count} aliados`;
      }
      if (type === "character" || type === "any") {
        if (mode === "all") return "a todos los personajes";
        if (mode === "up_to") return count === 1 ? "a un personaje" : `a hasta ${count} personajes`;
        return count === 1 ? "a un personaje" : `a ${count} personajes`;
      }
      if (type === "object") {
        if (mode === "all") return "a todos los objetos";
        if (mode === "up_to") return count === 1 ? "a un objeto" : `a hasta ${count} objetos`;
        return count === 1 ? "a un objeto" : `a ${count} objetos`;
      }
      return "";
    };

    let mainActionClause = "";
    if (hasTarget && hasEffects) {
      const targetStr = sections.target[0];
      const effectStr = sections.effects[0];

      if (targetStr !== "Uno mismo" && effectStr.startsWith("recuperan")) {
        mainActionClause = `${targetStr} ${effectStr}${spatialPhrase}`;
      } else if (
        targetStr !== "Uno mismo" &&
        (effectStr.startsWith("Inflige") ||
          effectStr.startsWith("Recupera") ||
          effectStr.startsWith("Otorga") ||
          effectStr.startsWith("Aplica"))
      ) {
        const prep = getPrepositionalTarget(behavior.target);
        if (prep) {
          mainActionClause = `${effectStr} ${prep}${spatialPhrase}`.trim();
        } else {
          mainActionClause = `${targetStr}: ${effectStr}${spatialPhrase}`;
        }
      } else if (targetStr !== "Uno mismo") {
        mainActionClause = `${targetStr}: ${effectStr}${spatialPhrase}`;
      } else {
        mainActionClause = `${effectStr}${spatialPhrase}`.trim();
      }
    } else if (hasEffects) {
      mainActionClause = `${sections.effects[0]}${spatialPhrase}`.trim();
    } else if (hasTarget) {
      mainActionClause = `${sections.target.join(", ")}${spatialPhrase}`.trim();
    }

    // Activation delay clause if applicable
    if (behavior.mode === "active" && behavior.activation) {
      const actTurns = behavior.activation.delay ?? behavior.activation.turns;
      if (actTurns && actTurns > 0) {
        clauses.push(`Tarda ${pluralize(actTurns, "turno", "turnos")} en activarse`);
      }
    }

    // Handle Trigger + Action merge if reactive (or trigger present)
    const hasTrigger = sections.trigger.length > 0;
    if ((behavior.mode === "reactive" || behavior.mode === "active") && hasTrigger) {
      const trigStr = sections.trigger[0].trim().replace(/\.$/, "");
      if (mainActionClause) {
        const effectLower = lowerFirstIfAppropriate(mainActionClause);
        clauses.push(`${trigStr}: ${effectLower}`);
      } else {
        clauses.push(trigStr);
      }
      // Append any additional triggers
      for (let i = 1; i < sections.trigger.length; i++) {
        clauses.push(sections.trigger[i]);
      }
      // Append remaining effects if any
      if (hasEffects && sections.effects.length > 1) {
        for (let i = 1; i < sections.effects.length; i++) {
          clauses.push(sections.effects[i]);
        }
      }
    } else {
      // Check if continuous with "Mientras esté equipado" condition
      const equippedIdx = sections.conditions.indexOf("Mientras esté equipado");
      if (behavior.mode === "continuous" && equippedIdx !== -1 && mainActionClause) {
        sections.conditions.splice(equippedIdx, 1);
        const effectLower = lowerFirstIfAppropriate(mainActionClause);
        clauses.push(`Mientras esté equipado, ${effectLower}`);
      } else if (mainActionClause) {
        clauses.push(mainActionClause);
      }
      // Append remaining effects if any
      if (hasEffects && sections.effects.length > 1) {
        for (let i = 1; i < sections.effects.length; i++) {
          clauses.push(sections.effects[i]);
        }
      }
    }

    // Append Conditions (combined logically)
    if (sections.conditions.length > 0) {
      const combined = combineConditions(sections.conditions, behavior.conditionLogic || "all");
      for (const condStr of combined) {
        const cleaned = condStr.trim().replace(/\.$/, "");
        if (cleaned) {
          clauses.push(cleaned);
        }
      }
    }

    // Append Resolution (omit default automatic resolution in compact mode)
    if (sections.resolution.length > 0) {
      for (const resStr of sections.resolution) {
        const cleaned = resStr.trim().replace(/\.$/, "");
        if (cleaned && cleaned !== "Resolución automática") {
          clauses.push(cleaned);
        }
      }
    }

    // Append Temporality
    if (sections.temporality.length > 0) {
      for (const tempStr of sections.temporality) {
        const cleaned = tempStr.trim().replace(/\.$/, "");
        if (cleaned) {
          clauses.push(cleaned);
        }
      }
    }

    // Append Limitations
    if (sections.limitations.length > 0) {
      for (const limStr of sections.limitations) {
        const cleaned = limStr.trim().replace(/\.$/, "");
        if (cleaned) {
          clauses.push(cleaned);
        }
      }
    }

    // Append Cost
    if (sections.cost.length > 0) {
      for (const costStr of sections.cost) {
        const cleaned = costStr.trim().replace(/\.$/, "");
        if (cleaned) {
          clauses.push(cleaned);
        }
      }
    }

    // Form cleanly punctuated sentences
    if (clauses.length > 0) {
      const sentences: string[] = [];
      for (const rawClause of clauses) {
        const trimmed = rawClause.trim();
        if (!trimmed) continue;
        const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        sentences.push(ensurePeriod(capitalized));
      }
      finalText = sentences.join(" ");
    }
  }

  return {
    text: finalText.trim(),
    complete: isComplete,
    warnings,
    sections,
  };
}

/**
 * Helper to generate a complete auto-description for a technique object.
 * Always includes the CE stamina cost and mechanical behavior details.
 */
export function generateAutoDescription(tech: any): string {
  if (!tech) return "";
  const costStr = tech.cost || (tech.level ? `${tech.level * 2} CE` : '2 CE');
  const costNum = parseInt(costStr) || undefined;

  // 1. Try mechanicalBehaviors array
  const behaviors = Array.isArray(tech.mechanicalBehaviors) ? tech.mechanicalBehaviors : [];
  if (behaviors.length > 0) {
    const parts = behaviors.map((b: any) => {
      try {
        const res = describeMechanicalBehavior(b, { format: 'compact', context: { staminaCost: costNum } });
        return res.text;
      } catch {
        return '';
      }
    }).filter(Boolean);

    if (parts.length > 0) {
      let full = parts.join(' ');
      if (!full.toLowerCase().includes('coste') && !full.toLowerCase().includes('ce') && !full.toLowerCase().includes('estamina')) {
        full = `${full} Coste: ${costStr}.`;
      }
      return full;
    }
  }

  // 2. Try metadata or attributes if present
  const metadata = tech.metadata || {};
  const metaParts: string[] = [];
  if (tech.activationAttributeId) metaParts.push(`Atributo: ${tech.activationAttributeId}`);
  if (tech.target || metadata.target) metaParts.push(`Objetivo: ${tech.target || metadata.target}`);
  if (tech.actionType || metadata.actionType) metaParts.push(`Acción: ${tech.actionType || metadata.actionType}`);
  if (tech.range || metadata.range) metaParts.push(`Rango: ${tech.range || metadata.range}`);

  if (metaParts.length > 0) {
    return `${metaParts.join(' · ')}. Coste: ${costStr}.`;
  }

  // 3. Fallback description with cost CE
  return `Efecto general de combate. Coste: ${costStr}.`;
}
