import re

with open('src/lib/characterValidation.ts', 'r') as f:
    content = f.read()

# Modify the signature
content = content.replace(
    'export function calculateDerivedStats(profile: Record<string, any>, stages: any[]) {',
    'export function calculateDerivedStats(profile: Record<string, any>, stages: any[], elements: any[] = []) {'
)

# Extract stats computation and add element modifiers
# First, let's find the stat lines
stat_lines = """  let fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;
  let des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;
  let res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;
  let int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;
  let vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;
  let vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;
"""

content = content.replace(
    "const fue = Number(profile['FUE'] || profile['fue'] || profile['fuerza']) || 0;\n  const des = Number(profile['DES'] || profile['des'] || profile['destreza']) || 0;\n  const res = Number(profile['RES'] || profile['res'] || profile['resistencia']) || 0;\n  const int = Number(profile['INT'] || profile['int'] || profile['inteligencia']) || 0;\n  const vol = Number(profile['VOL'] || profile['vol'] || profile['voluntad']) || 0;\n  const vel = Number(profile['VEL'] || profile['vel'] || profile['velocidad']) || 0;",
    stat_lines
)

# Add logic to apply modifiers
# The modifiers apply to fue, des, res, int, vol, vel. Also to derived stats later.
# We also have INI modifier, evasion modifier etc.
modifier_logic = """
  let extraIni = 0;
  let extraEvasion = 0;
  let extraCoraje = 0;
  let extraSalud = 0;
  let extraEstamina = 0;

  // Process elements if any
  const traitIds = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknessIds = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const activeIds = [...traitIds, ...weaknessIds];

  activeIds.forEach(id => {
    const el = elements.find(e => e.id === id);
    if (!el || !Array.isArray(el.effects)) return;

    el.effects.forEach((eff: any) => {
      // Support multiple schemas (legacy and new)
      const attrId = eff.attributeId || eff.target;
      const amount = eff.amount ?? eff.value ?? 0;

      if ((eff.type === 'attribute_modifier' || eff.type === 'modify_attribute' || eff.type === 'stat_modifier') && (!eff.timing || eff.timing === 'passive')) {
        if (attrId === 'FUE' || attrId === 'fuerza') fue += amount;
        if (attrId === 'DES' || attrId === 'destreza') des += amount;
        if (attrId === 'RES' || attrId === 'resistencia') res += amount;
        if (attrId === 'INT' || attrId === 'inteligencia') int += amount;
        if (attrId === 'VOL' || attrId === 'voluntad') vol += amount;
        if (attrId === 'VEL' || attrId === 'velocidad') vel += amount;
      }
      
      if ((eff.type === 'derived_modifier' || eff.type === 'modify_derived') && (!eff.timing || eff.timing === 'passive')) {
        if (attrId === 'INI' || attrId === 'iniciativa') extraIni += amount;
        if (attrId === 'EVA' || attrId === 'evasion') extraEvasion += amount;
        if (attrId === 'COR' || attrId === 'coraje') extraCoraje += amount;
        if (attrId === 'SAL' || attrId === 'salud') extraSalud += amount;
        if (attrId === 'EST' || attrId === 'estamina') extraEstamina += amount;
      }
    });
  });

  const baseHealth = stage?.baseHealth || 0;
"""

content = content.replace(
    "const baseHealth = stage?.baseHealth || 0;",
    modifier_logic
)

derived_logic = """  const salud = baseHealth + res + extraSalud;
  const estamina = baseStamina + des + extraEstamina;
  const evasion = 10 + vel + extraEvasion;
  const coraje = 10 + vol + extraCoraje;
  const modFue = calculateModifier(fue);
  const modDes = calculateModifier(des);
  const iniciativa = calculateModifier(Math.floor((int + vel) / 2)) + extraIni;"""

content = content.replace(
    "const salud = baseHealth + res;\n  const estamina = baseStamina + des;\n  const evasion = 10 + vel;\n  const coraje = 10 + vol;\n  const modFue = calculateModifier(fue);\n  const modDes = calculateModifier(des);\n  const iniciativa = calculateModifier(Math.floor((int + vel) / 2));",
    derived_logic
)


with open('src/lib/characterValidation.ts', 'w') as f:
    f.write(content)

