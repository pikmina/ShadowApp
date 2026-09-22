import { resolvePassiveEffects } from "../domain/ruleEngine";
import { appliedMechanicReferenceSchema, resolveAppliedMechanics, type SystemMechanicsConfig } from '../domain/systemMechanics';
import { calculateBaseInitiative } from '../domain/mechanicalRuntime';

export interface ValidationResult {
  status: 'green' | 'orange' | 'red';
  messages: string[];
}

export function calculateModifier(value: number): number {
  return Math.floor((value || 0) / 2);
}

export function validateCharacter(
  profile: Record<string, any>,
  stages: any[],
  purchasedAttrPoints: number = 0,
  maxPurchased: number = 5,
  traitAttrPoints: number = 0
): ValidationResult {
  const messages: string[] = [];
  let status: 'green' | 'orange' | 'red' = 'green' as 'green' | 'orange' | 'red';

  // Read Stage
  const stageName = String(profile['basic_stage'] || profile['stage'] || profile['etapa'] || '').trim();
  const stage = stages.find((s: any) => s.name.toLowerCase() === stageName.toLowerCase());

  if (!stageName) {
    return { status: 'orange', messages: ['Falta seleccionar la etapa del personaje.'] };
  }
  
  if (!stage) {
    return { status: 'red', messages: [`La etapa '${stageName}' no existe en el sistema.`] };
  }

  // Read Base Stats
  let fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  let des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  let res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  let int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  let vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  let vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;

  const baseSum = fue + des + res + int + vol + vel;
  const maxAttr = stage.maxAttr || 0;
  const attrPoints = stage.attrPoints || 0;
  const allowedBaseBudget = attrPoints;

  if (purchasedAttrPoints > maxPurchased) {
    status = 'red';
    messages.push(`Se ha superado el límite de mejoras de atributo permitidas (${purchasedAttrPoints}/${maxPurchased}).`);
  }

  if (baseSum < allowedBaseBudget) {
    status = status === 'red' ? 'red' : 'orange';
    const missing = allowedBaseBudget - baseSum;
    const msg = missing === 1
      ? `Falta 1 punto de atributo por repartir (${baseSum}/${allowedBaseBudget} puntos base distribuidos).`
      : `Faltan ${missing} puntos de atributo por repartir (${baseSum}/${allowedBaseBudget} puntos base distribuidos).`;
    messages.push(msg);
  } else if (baseSum > allowedBaseBudget) {
    status = 'red';
    const excess = baseSum - allowedBaseBudget;
    const msg = excess === 1
      ? `Se ha excedido 1 punto de atributo base (${baseSum}/${allowedBaseBudget}).`
      : `Se han excedido ${excess} puntos de atributo base (${baseSum}/${allowedBaseBudget}).`;
    messages.push(msg);
  }

  if (fue > maxAttr || des > maxAttr || res > maxAttr || int > maxAttr || vol > maxAttr || vel > maxAttr) {
    status = 'red';
    messages.push(`Uno o más atributos superan el límite de etapa (Máx. ${maxAttr}).`);
  }

  // Validate number of base attributes at the maximum cap
  const configuredMaxAtCap = typeof stage.maxAttributesAtCap === 'number' && Number.isFinite(stage.maxAttributesAtCap)
    ? stage.maxAttributesAtCap
    : null;

  if (configuredMaxAtCap !== null && maxAttr > 0) {
    const traitList = Array.isArray(profile.traits) ? profile.traits : [];
    const hasTalentoso = traitList.some((t: any) => {
      const id = typeof t === 'string' ? t : (t?.id || t?.elementId || '');
      return id === 'core.trait.talented';
    });

    const allowedAtCap = configuredMaxAtCap + (hasTalentoso ? 1 : 0);
    const baseAttrs = [fue, des, res, int, vol, vel];
    const countAtCap = baseAttrs.filter(val => val === maxAttr).length;

    if (countAtCap > allowedAtCap) {
      status = 'red';
      messages.push(`Se ha superado el límite de atributos al máximo (${countAtCap}/${allowedAtCap}).`);
    }
  }

  return { status, messages };
}

export function calculateTraitAttributeBonus(
  profile: Record<string, any>,
  elements: any[] = [],
  mechanics: SystemMechanicsConfig = []
): { total: number; byAttr: Record<string, number> } {
  const byAttr: Record<string, number> = { FUE: 0, DES: 0, RES: 0, INT: 0, VOL: 0, VEL: 0 };
  let total = 0;

  const traitIds = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknessIds = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const activeIds = [...traitIds, ...weaknessIds];

  activeIds.forEach(id => {
    const el = elements.find(e => e.id === id || String(e.name || '').trim().toLowerCase() === String(id || '').trim().toLowerCase());
    if (!el) return;

    const references = Array.isArray(el.effects) ? el.effects.flatMap((effect: unknown) => {
      const parsed = appliedMechanicReferenceSchema.safeParse(effect);
      return parsed.success ? [parsed.data] : [];
    }) : [];
    let referencedEffects: any[] = references.length > 0 ? resolvePassiveEffects(references, mechanics, {
      event: 'passive', eventId: 'projection', turn: 0,
      periods: { turn: '', combat: '', mission: '', day: '' },
      resources: {
        ES: { current: profile.estamina_actual ?? 0, max: profile.estamina_maxima ?? 0 },
        SA: { current: profile.salud_actual ?? 0, max: profile.salud_maxima ?? 0 },
      },
      signals: [], dice: [], activeAbilities: [], inventory: {},
      targets: [{ id: 'bearer', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: [] }],
    }) : [];

    // Fallback: If rule in SystemRules was defined with default timing ('on_activation') instead of 'passive',
    // or group lacks explicit passive activation, resolve via resolveAppliedMechanics because trait and weakness
    // effects are intrinsically passive by game contract.
    if (referencedEffects.length === 0 && references.length > 0) {
      const resolution = resolveAppliedMechanics(references, mechanics);
      referencedEffects = [...resolution.effects];
      resolution.groups.forEach(g => {
        g.components.forEach(c => {
          if (c.kind === 'consequence' && c.consequence.kind === 'attribute') {
            referencedEffects.push({
              type: 'attribute_modifier',
              attributeId: c.consequence.attributeId,
              amount: c.consequence.amount,
              timing: 'passive'
            });
          }
        });
      });
    }

    const behaviorEffects: any[] = [];
    if (Array.isArray(el.mechanicalBehaviors)) {
      for (const b of el.mechanicalBehaviors) {
        if (b && b.mode === 'continuous' && Array.isArray(b.effects)) {
          if (!b.conditions || b.conditions.length === 0) {
            behaviorEffects.push(...b.effects);
          }
        }
      }
    }

    const directEffects = Array.isArray(el.effects)
      ? el.effects.filter((effect: unknown) => !appliedMechanicReferenceSchema.safeParse(effect).success)
      : [];

    // Precedence rule:
    // If usable MechanicalBehavior effects exist, use mechanicalBehaviors and ignore legacy directEffects.
    // If no usable MechanicalBehavior effects exist, fallback to legacy directEffects.
    // Legitimate referencedEffects (from appliedMechanicReferenceSchema) are preserved.
    const activeDirectEffects = behaviorEffects.length > 0 ? [] : directEffects;

    [...behaviorEffects, ...activeDirectEffects, ...referencedEffects].forEach((eff: any) => {
      const rawAttr = String(eff.attributeId || eff.statId || eff.target || '').trim().toUpperCase();
      const amount = Number(eff.amount ?? eff.value ?? 0);

      if ((eff.type === 'attribute_modifier' || eff.type === 'modify_attribute' || eff.type === 'stat_modifier')) {
        if (['FUE', 'FUERZA'].includes(rawAttr)) { byAttr.FUE += amount; total += amount; }
        if (['DES', 'DESTREZA'].includes(rawAttr)) { byAttr.DES += amount; total += amount; }
        if (['RES', 'RESISTENCIA'].includes(rawAttr)) { byAttr.RES += amount; total += amount; }
        if (['INT', 'INTELIGENCIA'].includes(rawAttr)) { byAttr.INT += amount; total += amount; }
        if (['VOL', 'VOLUNTAD'].includes(rawAttr)) { byAttr.VOL += amount; total += amount; }
        if (['VEL', 'VELOCIDAD'].includes(rawAttr)) { byAttr.VEL += amount; total += amount; }
      }
    });
  });

  return { total, byAttr };
}

export function calculatePurchasedAttributeBonuses(
  possessions: any[] = [],
  elements: any[] = []
): { total: number; byAttr: Record<string, number> } {
  const byAttr: Record<string, number> = { FUE: 0, DES: 0, RES: 0, INT: 0, VOL: 0, VEL: 0 };
  let total = 0;

  if (!Array.isArray(possessions)) return { total, byAttr };

  possessions.forEach((p: any) => {
    const el = p.element || elements.find((e: any) => e.id === p.elementId || e.id === p.id);
    const kind = el?.kind || p.kind;
    if (kind === 'attribute_upgrade') {
      const metadata = el?.metadata || p.metadata || {};
      const rawAttr = String(metadata.attributeId || 'FUE').trim().toUpperCase();
      const qty = Number(p.possession?.quantity ?? p.quantity ?? 1) || 0;

      if (['FUE', 'FUERZA'].includes(rawAttr)) { byAttr.FUE += qty; total += qty; }
      else if (['DES', 'DESTREZA'].includes(rawAttr)) { byAttr.DES += qty; total += qty; }
      else if (['RES', 'RESISTENCIA'].includes(rawAttr)) { byAttr.RES += qty; total += qty; }
      else if (['INT', 'INTELIGENCIA'].includes(rawAttr)) { byAttr.INT += qty; total += qty; }
      else if (['VOL', 'VOLUNTAD'].includes(rawAttr)) { byAttr.VOL += qty; total += qty; }
      else if (['VEL', 'VELOCIDAD'].includes(rawAttr)) { byAttr.VEL += qty; total += qty; }
    }
  });

  return { total, byAttr };
}

export function calculateDerivedStats(
  profile: Record<string, any>,
  stages: any[],
  elements: any[] = [],
  mechanics: SystemMechanicsConfig = [],
  possessions: any[] = []
) {
  const stageName = String(profile['basic_stage'] || profile['stage'] || profile['etapa'] || '').trim();
  const stage = stages.find((s: any) => s.name.toLowerCase() === stageName.toLowerCase());

  const activePossessions = (possessions && possessions.length > 0)
    ? possessions
    : (Array.isArray(profile.possessions) ? profile.possessions : []);

  const purchasedBonuses = calculatePurchasedAttributeBonuses(activePossessions, elements);
  const traitBonuses = calculateTraitAttributeBonus(profile, elements, mechanics);

  const baseFue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  const baseDes = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  const baseRes = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  const baseInt = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  const baseVol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  const baseVel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;

  let fue = baseFue + (purchasedBonuses.byAttr.FUE || 0) + (traitBonuses.byAttr.FUE || 0);
  let des = baseDes + (purchasedBonuses.byAttr.DES || 0) + (traitBonuses.byAttr.DES || 0);
  let res = baseRes + (purchasedBonuses.byAttr.RES || 0) + (traitBonuses.byAttr.RES || 0);
  let int = baseInt + (purchasedBonuses.byAttr.INT || 0) + (traitBonuses.byAttr.INT || 0);
  let vol = baseVol + (purchasedBonuses.byAttr.VOL || 0) + (traitBonuses.byAttr.VOL || 0);
  let vel = baseVel + (purchasedBonuses.byAttr.VEL || 0) + (traitBonuses.byAttr.VEL || 0);

  let extraIni = 0;
  let extraEvasion = 0;
  let extraCoraje = 0;
  let extraSalud = 0;
  let extraEstamina = 0;
  let extraRed = 0;

  // Process derived stat modifiers from elements
  const traitIds = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknessIds = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const activeIds = [...traitIds, ...weaknessIds];

  activeIds.forEach(id => {
    const el = elements.find(e => e.id === id || String(e.name || '').trim().toLowerCase() === String(id || '').trim().toLowerCase());
    if (!el) return;

    const references = Array.isArray(el.effects) ? el.effects.flatMap((effect: unknown) => {
      const parsed = appliedMechanicReferenceSchema.safeParse(effect);
      return parsed.success ? [parsed.data] : [];
    }) : [];
    let referencedEffects: any[] = references.length > 0 ? resolvePassiveEffects(references, mechanics, {
      event: 'passive', eventId: 'projection', turn: 0,
      periods: { turn: '', combat: '', mission: '', day: '' },
      resources: {
        ES: { current: profile.estamina_actual ?? 0, max: profile.estamina_maxima ?? 0 },
        SA: { current: profile.salud_actual ?? 0, max: profile.salud_maxima ?? 0 },
      },
      signals: [], dice: [], activeAbilities: [], inventory: {},
      targets: [{ id: 'bearer', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: [] }],
    }) : [];

    if (referencedEffects.length === 0 && references.length > 0) {
      const resolution = resolveAppliedMechanics(references, mechanics);
      referencedEffects = [...resolution.effects];
    }

    const behaviorEffects: any[] = [];
    if (Array.isArray(el.mechanicalBehaviors)) {
      for (const b of el.mechanicalBehaviors) {
        if (b && b.mode === 'continuous' && Array.isArray(b.effects)) {
          if (!b.conditions || b.conditions.length === 0) {
            behaviorEffects.push(...b.effects);
          }
        }
      }
    }

    const directEffects = Array.isArray(el.effects)
      ? el.effects.filter((effect: unknown) => !appliedMechanicReferenceSchema.safeParse(effect).success)
      : [];

    // Precedence rule:
    // If usable MechanicalBehavior effects exist, use mechanicalBehaviors and ignore legacy directEffects.
    // If no usable MechanicalBehavior effects exist, fallback to legacy directEffects.
    // Legitimate referencedEffects (from appliedMechanicReferenceSchema) are preserved.
    const activeDirectEffects = behaviorEffects.length > 0 ? [] : directEffects;

    [...behaviorEffects, ...activeDirectEffects, ...referencedEffects].forEach((eff: any) => {
      const attrId = String(eff.attributeId || eff.statId || eff.target || '').trim().toUpperCase();
      const amount = Number(eff.amount ?? eff.value ?? 0);

      if (eff.type === 'derived_stat_modifier' || eff.type === 'derived_modifier' || eff.type === 'modify_derived') {
        if (['INI', 'INICIATIVA', 'INITIATIVE'].includes(attrId)) extraIni += amount;
        if (['EVA', 'EVASION', 'EVASIÓN'].includes(attrId)) extraEvasion += amount;
        if (['COR', 'CORAJE', 'COURAGE'].includes(attrId)) extraCoraje += amount;
        if (['SAL', 'SALUD', 'HEALTH', 'HP'].includes(attrId)) extraSalud += amount;
        if (['EST', 'ESTAMINA', 'STAMINA', 'ES'].includes(attrId)) extraEstamina += amount;
        if (['RED', 'REDUCCION_DANO', 'REDUCCIÓN_DAÑO', 'DAMAGE_REDUCTION', 'REDUCCION'].includes(attrId)) extraRed += amount;
      }
    });
  });

  const baseHealth = stage?.baseHealth || 0;
  const baseStamina = stage?.baseStamina || 0;
  const baseDamage = stage?.baseDamage || '1D4';

  const salud = baseHealth + res + extraSalud;
  const estamina = baseStamina + des + extraEstamina;
  const evasion = 10 + vel + extraEvasion;
  const coraje = 10 + vol + extraCoraje;
  const modFue = calculateModifier(fue);
  const modDes = calculateModifier(des);
  const iniciativa = calculateBaseInitiative(int, vel) + extraIni;
  const reduccionDano = extraRed;
  
  // Daño Físico format: "1D8 + 2" (or just "1D8" if mod is 0, or "1D8 - 1" if negative)
  let dfStr = baseDamage;
  if (modFue > 0) dfStr += ` + ${modFue}`;
  else if (modFue < 0) dfStr += ` - ${Math.abs(modFue)}`;

  let drStr = baseDamage;
  if (modDes > 0) drStr += ` + ${modDes}`;
  else if (modDes < 0) drStr += ` - ${Math.abs(modDes)}`;

  return {
    salud,
    estamina,
    evasion,
    coraje,
    modFue,
    modDes,
    iniciativa,
    dañoFisico: dfStr,
    dañoRango: drStr,
    reduccionDano,
    attributes: {
      FUE: fue,
      DES: des,
      RES: res,
      INT: int,
      VOL: vol,
      VEL: vel
    },
    baseAttributes: {
      FUE: baseFue,
      DES: baseDes,
      RES: baseRes,
      INT: baseInt,
      VOL: baseVol,
      VEL: baseVel
    },
    purchasedBonuses: purchasedBonuses.byAttr,
    traitBonuses: traitBonuses.byAttr,
    attributeBonuses: {
      FUE: (purchasedBonuses.byAttr.FUE || 0) + (traitBonuses.byAttr.FUE || 0),
      DES: (purchasedBonuses.byAttr.DES || 0) + (traitBonuses.byAttr.DES || 0),
      RES: (purchasedBonuses.byAttr.RES || 0) + (traitBonuses.byAttr.RES || 0),
      INT: (purchasedBonuses.byAttr.INT || 0) + (traitBonuses.byAttr.INT || 0),
      VOL: (purchasedBonuses.byAttr.VOL || 0) + (traitBonuses.byAttr.VOL || 0),
      VEL: (purchasedBonuses.byAttr.VEL || 0) + (traitBonuses.byAttr.VEL || 0)
    }
  };
}
