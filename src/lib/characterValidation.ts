import { resolvePassiveEffects } from "../domain/ruleEngine";
import { appliedMechanicReferenceSchema, resolveAppliedMechanics, type SystemMechanicsConfig } from '../domain/systemMechanics';

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
  maxPurchased: number = 5
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

  const totalPoints = fue + des + res + int + vol + vel;
  const maxAttr = stage.maxAttr || 0;
  const attrPoints = stage.attrPoints || 0;
  const allowedTotal = attrPoints + purchasedAttrPoints;

  if (purchasedAttrPoints > maxPurchased) {
    status = 'red';
    messages.push(`Se ha superado el límite de mejoras de atributo permitidas (${purchasedAttrPoints}/${maxPurchased}).`);
  }

  if (totalPoints < allowedTotal) {
    status = status === 'red' ? 'red' : 'orange';
    messages.push(`Faltan puntos por repartir (${totalPoints}/${allowedTotal}).`);
  } else if (totalPoints > allowedTotal) {
    status = 'red';
    messages.push(`Se han excedido los puntos de atributo (${totalPoints}/${allowedTotal}).`);
  }

  const effectiveMaxAttr = maxAttr + purchasedAttrPoints;
  if (fue > effectiveMaxAttr || des > effectiveMaxAttr || res > effectiveMaxAttr || int > effectiveMaxAttr || vol > effectiveMaxAttr || vel > effectiveMaxAttr) {
    status = 'red';
    messages.push(`Uno o más atributos superan el límite de etapa (Máx. ${effectiveMaxAttr}).`);
  }

  return { status, messages };
}

export function calculateDerivedStats(profile: Record<string, any>, stages: any[], elements: any[] = [], mechanics: SystemMechanicsConfig = []) {
  const stageName = String(profile['basic_stage'] || profile['stage'] || profile['etapa'] || '').trim();
  const stage = stages.find((s: any) => s.name.toLowerCase() === stageName.toLowerCase());

    let fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  let des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  let res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  let int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  let vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  let vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;


  
  let extraIni = 0;
  let extraEvasion = 0;
  let extraCoraje = 0;
  let extraSalud = 0;
  let extraEstamina = 0;
  let extraRed = 0;

  // Process elements if any
  const traitIds = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknessIds = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const activeIds = [...traitIds, ...weaknessIds];

  activeIds.forEach(id => {
    const el = elements.find(e => e.id === id);
    if (!el || !Array.isArray(el.effects)) return;

    const references = el.effects.flatMap((effect: unknown) => {
      const parsed = appliedMechanicReferenceSchema.safeParse(effect);
      return parsed.success ? [parsed.data] : [];
    });
    const referencedEffects = references.length > 0 ? resolvePassiveEffects(references, mechanics, {
      event: 'passive', eventId: 'projection', turn: 0,
      periods: { turn: '', combat: '', mission: '', day: '' },
      resources: {
        ES: { current: profile.estamina_actual ?? 0, max: profile.estamina_maxima ?? 0 },
        SA: { current: profile.salud_actual ?? 0, max: profile.salud_maxima ?? 0 },
      },
      signals: [], dice: [], activeAbilities: [], inventory: {},
      targets: [{ id: 'bearer', kind: 'character', relationship: 'self', distance: 0, conscious: true, contacts: [] }],
    }) : [];
    const directEffects = el.effects.filter((effect: unknown) => !appliedMechanicReferenceSchema.safeParse(effect).success);

    [...directEffects, ...referencedEffects].forEach((eff: any) => {
      // Support multiple schemas (legacy and new)
      const attrId = eff.attributeId || eff.statId || eff.target;
      const amount = eff.amount ?? eff.value ?? 0;

      if ((eff.type === 'attribute_modifier' || eff.type === 'modify_attribute' || eff.type === 'stat_modifier') && (!eff.timing || eff.timing === 'passive')) {
        if (attrId === 'FUE' || attrId === 'fuerza') fue += amount;
        if (attrId === 'DES' || attrId === 'destreza') des += amount;
        if (attrId === 'RES' || attrId === 'resistencia') res += amount;
        if (attrId === 'INT' || attrId === 'inteligencia') int += amount;
        if (attrId === 'VOL' || attrId === 'voluntad') vol += amount;
        if (attrId === 'VEL' || attrId === 'velocidad') vel += amount;
      }
      
      if ((eff.type === 'derived_stat_modifier' || eff.type === 'derived_modifier' || eff.type === 'modify_derived') && (!eff.timing || eff.timing === 'passive')) {
        if (attrId === 'INI' || attrId === 'iniciativa') extraIni += amount;
        if (attrId === 'EVA' || attrId === 'evasion') extraEvasion += amount;
        if (attrId === 'COR' || attrId === 'coraje') extraCoraje += amount;
        if (attrId === 'SAL' || attrId === 'salud') extraSalud += amount;
        if (attrId === 'EST' || attrId === 'estamina') extraEstamina += amount;
        if (attrId === 'RED' || attrId === 'reduccion_dano' || attrId === 'damage_reduction' || attrId === 'reduccion') extraRed += amount;
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
  const iniciativa = calculateModifier(Math.floor((int + vel) / 2)) + extraIni;
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
    reduccionDano
  };
}
