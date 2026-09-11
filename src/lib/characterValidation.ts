export interface ValidationResult {
  status: 'green' | 'orange' | 'red';
  messages: string[];
}

export function calculateModifier(value: number): number {
  return Math.floor((value || 0) / 2);
}

export function validateCharacter(
  profile: Record<string, any>,
  stages: any[]
): ValidationResult {
  const messages: string[] = [];
  let status: 'green' | 'orange' | 'red' = 'green';

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
  const fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  const des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  const res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  const int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  const vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  const vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;

  const totalPoints = fue + des + res + int + vol + vel;
  const maxAttr = stage.maxAttr || 0;
  const attrPoints = stage.attrPoints || 0;

  if (totalPoints < attrPoints) {
    status = status === 'red' ? 'red' : 'orange';
    messages.push(`Faltan puntos por repartir (${totalPoints}/${attrPoints}).`);
  } else if (totalPoints > attrPoints) {
    status = 'red';
    messages.push(`Se han excedido los puntos de atributo (${totalPoints}/${attrPoints}).`);
  }

  if (fue > maxAttr || des > maxAttr || res > maxAttr || int > maxAttr || vol > maxAttr || vel > maxAttr) {
    status = 'red';
    messages.push(`Uno o más atributos superan el límite de etapa (Máx. ${maxAttr}).`);
  }

  return { status, messages };
}

export function calculateDerivedStats(profile: Record<string, any>, stages: any[]) {
  const stageName = String(profile['basic_stage'] || profile['stage'] || profile['etapa'] || '').trim();
  const stage = stages.find((s: any) => s.name.toLowerCase() === stageName.toLowerCase());

  const fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  const des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  const res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  const int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  const vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  const vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;

  const baseHealth = stage?.baseHealth || 0;
  const baseStamina = stage?.baseStamina || 0;
  const baseDamage = stage?.baseDamage || '1D4';

  const salud = baseHealth + res;
  const estamina = baseStamina + des;
  const evasion = 10 + vel;
  const coraje = 10 + vol;
  const modFue = calculateModifier(fue);
  const modDes = calculateModifier(des);
  const iniciativa = calculateModifier(Math.floor((int + vel) / 2));
  
  // Daño base format: "1D8 + 2" (or just "1D8" if mod is 0, or "1D8 - 1" if negative)
  let dbStr = baseDamage;
  if (modFue > 0) dbStr += ` + ${modFue}`;
  else if (modFue < 0) dbStr += ` - ${Math.abs(modFue)}`;

  return {
    salud,
    estamina,
    evasion,
    coraje,
    modFue,
    modDes,
    iniciativa,
    dañoBase: dbStr
  };
}
