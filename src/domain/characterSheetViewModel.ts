import { HexStat } from '@/components/character/HexagonRadarChart';
import { detectFactionTheme, FactionThemeId } from '@/components/character/themes/FactionSheetTheme';
import { calculateTechniqueStructuralCost } from '@/domain/systemMechanics';
import { generateAutoDescription } from '@/domain/mechanicalDescription';
import { deriveTechniqueLevelFromCost } from '@/domain/characterTechnique';
import { CANONICAL_STAT_ICONS } from '@/domain/canonicalStatIcons';

export const readValue = (obj: any, keys: string[]): any => {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return obj[k];
    }
  }
  return undefined;
};

export const hasValue = (val: any) => val !== undefined && val !== null && val !== '';

export const displayValue = (value: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export const calculateAgeFromBirth = (birthDateStr?: string): number | undefined => {
  if (!birthDateStr) return undefined;
  try {
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return undefined;
    const ref = new Date(2201, 0, 1);
    let a = ref.getFullYear() - birth.getFullYear();
    const m = ref.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) a--;
    return a > 0 ? a : undefined;
  } catch {
    return undefined;
  }
};

export interface CharacterSheetViewModelParams {
  character: any;
  derived?: any;
  elements?: any[];
  mechanicsList?: any[];
  staminaCosts?: any;
  employmentsList?: any[];
  enrollment?: any;
  purchasedBonusData?: { byAttr: Record<string, number>; sourcesByAttr: Record<string, any[]> };
  traitBonusData?: { byAttr: Record<string, number>; sourcesByAttr: Record<string, any[]> };
  equipmentBonusData?: {
    byAttr: Record<string, number>;
    sourcesByAttr: Record<string, any[]>;
    byDerived: Record<string, number>;
    sourcesByDerived: Record<string, any[]>;
  };
}

export interface CharacterSheetViewModel {
  character: any;
  profile: any;
  fullName: string;
  name: string;
  lastName: string;
  alias: string;
  avatar: string | null;
  group: string | null;
  status: string;
  basicStage: string;
  detectedTheme: FactionThemeId;
  quirk: {
    name: string;
    type: string;
    evolution: string;
    description: string;
    levelOne: string;
    levelTwo: string | null;
    levelThree: string | null;
  };
  resources: {
    reputation: any;
    yen: number;
    exp: number;
    plusUltra: number;
    currentHealth: number;
    maxHealth: number;
    currentStamina: number;
    maxStamina: number;
  };
  baseAttributes: HexStat[];
  combatStatus: {
    evasion: number;
    courage: number;
    physicalDamageText: string;
    rangeDamageText: string;
    damageReductionText: string;
    initiativeText: string;
    modFuerza: number;
    modDestreza: number;
  };
  defenseList: any[];
  combatStatusList: any[];
  personalDataList: Array<{ label: string; value: string; icon?: any }>;
  traits: Array<{ id?: string; name: string; description: string }>;
  weaknesses: Array<{ id?: string; name: string; description: string }>;
  skills: any[];
  credentials: any[];
  techniques: Array<{
    id: string;
    name: string;
    level: number;
    cost: number | string;
    type?: string;
    target?: string;
    description: string;
    autoDescription: string;
  }>;
  possessions: Array<{
    name: string;
    description: string;
    quantity: number;
    kind: string;
    equipped: boolean;
  }>;
  biography: string;
  employments: any[];
  enrollment: any;
  academic: {
    className: string;
    courseName: string;
    schoolName: string;
  };
}

export function buildCharacterSheetViewModel({
  character,
  derived,
  elements = [],
  mechanicsList = [],
  staminaCosts,
  employmentsList = [],
  enrollment,
  purchasedBonusData = { byAttr: {}, sourcesByAttr: {} },
  traitBonusData = { byAttr: {}, sourcesByAttr: {} },
  equipmentBonusData = { byAttr: {}, sourcesByAttr: {}, byDerived: {}, sourcesByDerived: {} },
}: CharacterSheetViewModelParams): CharacterSheetViewModel {
  const profile = (character?.profileData || character?.profile_data || {}) as Record<string, any>;

  const getElement = (idOrItem: any): { id: string; name: string; description: string } => {
    if (!idOrItem) return { id: '', name: '', description: '' };
    if (typeof idOrItem === 'object') {
      return {
        id: idOrItem.id || idOrItem.elementId || '',
        name: idOrItem.name || idOrItem.title || idOrItem.id || '',
        description: idOrItem.description || idOrItem.desc || '',
      };
    }
    const id = String(idOrItem);
    const found = elements.find((el: any) => el.id === id || el.name?.toLowerCase() === id.toLowerCase());
    if (found) {
      return {
        id: found.id || id,
        name: found.name || id,
        description: found.description || '',
      };
    }
    return { id, name: id, description: '' };
  };

  const name = character ? displayValue(readValue(profile, ['basic_name', 'name', 'nombre']) || character.name, 'Sin nombre') : '';
  const lastName = character ? displayValue(readValue(profile, ['last_name', 'lastName', 'apellido']), '') : '';
  const fullName = `${name} ${lastName}`.trim();
  const alias = character ? displayValue(readValue(profile, ['alias', 'hero_name', 'nombre_heroe']), 'Sin alias') : '';
  const avatar = character ? readValue(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']) : null;
  const group = character
    ? readValue(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción', 'affiliation']) ||
      character.group ||
      character.faction ||
      character.affiliation
    : null;
  const basicStage = character ? displayValue(readValue(profile, ['basic_stage', 'stage', 'nivel', 'etapa']), 'Novato') : '';

  const detectedTheme = detectFactionTheme(group);
  const status = character ? displayValue(readValue(profile, ['status', 'estado']), 'Activo') : '';

  // Quirk Info
  const quirkName = character ? displayValue(readValue(profile, ['quirk_name', 'quirkName', 'don_name', 'don']), 'Sin don registrado') : '';
  const quirkType = character ? displayValue(readValue(profile, ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don']), 'Emisión') : '';
  const quirkEvolution = character ? displayValue(readValue(profile, ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk', 'nivel_quirk']), 'Nivel 1. Despertar') : '';
  const quirkDescription = character ? displayValue(readValue(profile, ['quirk_description', 'quirkDesc', 'quirk_desc', 'don_descripcion']), 'No se ha registrado información sobre este don.') : '';
  const quirkLevelOne = character ? displayValue(readValue(profile, ['quirk_lvl1', 'quirkLvl1', 'quirk_level_1', 'quirk_nivel_1']), 'Sin descripción de nivel.') : '';
  const quirkLevelTwo = character ? readValue(profile, ['quirk_lvl2', 'quirkLvl2', 'quirk_level_2', 'quirk_nivel_2']) : null;
  const quirkLevelThree = character ? readValue(profile, ['quirk_lvl3', 'quirkLvl3', 'quirk_level_3', 'quirk_nivel_3']) : null;

  // Base Attributes
  const baseAttrDefs = [
    { label: 'Fuerza', key: 'FUE', angle: 90 },
    { label: 'Resistencia', key: 'RES', angle: 30 },
    { label: 'Destreza', key: 'DES', angle: 330 },
    { label: 'Inteligencia', key: 'INT', angle: 150 },
    { label: 'Voluntad', key: 'VOL', angle: 270 },
    { label: 'Velocidad', key: 'VEL', angle: 210 },
  ];

  const baseAttributes: HexStat[] = baseAttrDefs.map((attr) => {
    const rawVal = readValue(profile, [attr.key, attr.key.toLowerCase(), attr.label.toLowerCase()]);
    const baseVal = Number(rawVal || 0);
    const purchasedBonus = purchasedBonusData.byAttr[attr.key] || 0;
    const traitBonus = traitBonusData.byAttr[attr.key] || 0;
    const equipmentBonus = equipmentBonusData.byAttr[attr.key] || 0;
    const totalBonus = purchasedBonus + traitBonus + equipmentBonus;
    const finalVal = baseVal + totalBonus;
    const sources = [
      ...(purchasedBonusData.sourcesByAttr[attr.key] || []),
      ...(traitBonusData.sourcesByAttr[attr.key] || []),
      ...(equipmentBonusData.sourcesByAttr[attr.key] || []),
    ];
    return {
      ...attr,
      base: baseVal,
      bonus: totalBonus,
      hasBonus: totalBonus !== 0,
      value: hasValue(rawVal) ? finalVal : 0,
      sources,
    };
  });

  const fueStat = baseAttributes.find((a) => a.key === 'FUE');
  const desStat = baseAttributes.find((a) => a.key === 'DES');
  const modFuerza = Math.floor((fueStat?.value || 0) / 2);
  const modDestreza = Math.floor((desStat?.value || 0) / 2);

  // Health and Stamina
  const maxHealth = derived ? derived.salud : Number(readValue(profile, ['maxHealth', 'max_health', 'salud_maxima']) || 20);
  const maxStamina = derived ? derived.estamina : Number(readValue(profile, ['maxStamina', 'max_stamina', 'estamina_maxima']) || 20);
  const currentHealth = maxHealth;
  const currentStamina = maxStamina;

  // Defenses
  const evasionVal = Number(derived?.evasion ?? readValue(profile, ['evasion', 'evasión', 'eva']) ?? 0);
  const courageVal = Number(derived?.coraje ?? readValue(profile, ['coraje', 'cor', 'courage']) ?? 0);

  const defenseList = [
    {
      label: 'EVASIÓN',
      value: evasionVal,
      icon: CANONICAL_STAT_ICONS.evasion,
      equipmentBonus: equipmentBonusData.byDerived.evasion || 0,
      sources: derived?.derivedSources?.evasion || equipmentBonusData.sourcesByDerived.evasion || [],
    },
    {
      label: 'CORAJE',
      value: courageVal,
      icon: CANONICAL_STAT_ICONS.courage,
      equipmentBonus: equipmentBonusData.byDerived.coraje || 0,
      sources: derived?.derivedSources?.coraje || equipmentBonusData.sourcesByDerived.coraje || [],
    },
  ];

  // Combat Status
  const physicalDamageVal = String(derived?.dañoFisico ?? readValue(profile, ['daño_fisico', 'dano_fisico', 'daño_base', 'baseDamage']) ?? '1D4');
  const rangeDamageVal = String(derived?.dañoRango ?? readValue(profile, ['daño_rango', 'dano_rango', 'rangeDamage']) ?? '1D4');
  const damageReductionVal = String(derived?.reduccionDano ?? readValue(profile, ['reduccion_dano', 'dr']) ?? '0');
  const rawIni = derived?.iniciativa ?? readValue(profile, ['iniciativa', 'initiative']);
  const initiativeVal = (() => {
    if (!hasValue(rawIni)) return '0';
    const num = Number(rawIni);
    return !isNaN(num) && num > 0 ? `+${num}` : String(rawIni);
  })();

  const combatStatusList = [
    { label: 'DAÑO FÍSICO', value: physicalDamageVal, icon: CANONICAL_STAT_ICONS.physicalDamage, sub: 'CQC / Melee', sources: [] },
    { label: 'DAÑO RANGO', value: rangeDamageVal, icon: CANONICAL_STAT_ICONS.rangeDamage, sub: 'Distancia', sources: [] },
    {
      label: 'REDUCCIÓN DAÑO',
      value: damageReductionVal,
      icon: CANONICAL_STAT_ICONS.damageReduction,
      sub: 'Armadura / RD',
      equipmentBonus: equipmentBonusData.byDerived.reduccionDano || 0,
      sources: derived?.derivedSources?.reduccionDano || equipmentBonusData.sourcesByDerived.reduccionDano || [],
    },
    {
      label: 'INICIATIVA',
      value: initiativeVal,
      icon: CANONICAL_STAT_ICONS.initiative,
      sub: 'Velocidad reacción',
      equipmentBonus: equipmentBonusData.byDerived.iniciativa || 0,
      sources: derived?.derivedSources?.iniciativa || equipmentBonusData.sourcesByDerived.iniciativa || [],
    },
  ];

  // Personal Data (Age, Birthday, Gender, Blood Type, Alignment, etc.)
  const rawBirthDate = readValue(profile, [
    'birth_date',
    'basic_birth_date',
    'fecha_nacimiento',
    'nacimiento',
    'fecha_de_nacimiento',
    'birthday',
    'cumpleanos',
    'cumpleaños',
    'date_of_birth',
  ]);

  const rawAgeVal = readValue(profile, ['basic_age', 'age', 'edad']);
  const rawAge = hasValue(rawAgeVal) ? rawAgeVal : calculateAgeFromBirth(rawBirthDate);
  const rawGender = readValue(profile, ['gender', 'genero', 'sexo', 'basic_gender']);
  const rawBloodType = readValue(profile, ['basic_blood_type', 'blood_type', 'bloodType', 'grupo_sanguineo', 'tipo_de_sangre', 'grupo_sanguíneo', 'tipo_sangre']);
  const rawAlignment = readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación', 'alineamiento']);
  const rawNationality = readValue(profile, ['nationality', 'nacionalidad']);

  const classNameResolved =
    enrollment?.classGroup?.name ||
    readValue(profile, ['class_group', 'clase_grupo', 'clase', 'aula', 'seccion', 'sección']) ||
    'Clase 1-A';

  const courseNameResolved =
    enrollment?.academicYear?.name ||
    readValue(profile, ['course', 'curso', 'especialidad', 'carrera', 'formacion', 'formación']) ||
    (basicStage && basicStage !== 'Estudiante Básica' ? basicStage : 'Curso de Héroes');

  const schoolNameResolved =
    enrollment?.school?.name ||
    readValue(profile, ['school', 'escuela', 'academia', 'institucion', 'institución']) ||
    'Academia UA';

  const occupationOrClass = (() => {
    if (employmentsList.length > 0) {
      return employmentsList.map((e: any) => `${e.position?.name || 'Empleado'} (${e.institution?.name || 'Entidad'})`).join(', ');
    }
    if (enrollment?.classGroup?.name || enrollment?.academicYear?.name) {
      return `${enrollment?.classGroup?.name || 'Clase'} · ${enrollment?.academicYear?.name || 'Academia UA'}`;
    }
    const occ = readValue(profile, ['occupation', 'ocupacion', 'ocupación', 'cargo', 'empleo', 'profesion', 'profesión']);
    if (occ) return occ;
    if (detectedTheme === 'student') return `${classNameResolved} (${courseNameResolved})`;
    if (detectedTheme === 'hero') return 'Héroe Profesional';
    if (detectedTheme === 'civilian') return 'Sector Civil / Población';
    return 'Ciudadano';
  })();

  const personalDataList = [
    { label: 'Edad', value: hasValue(rawAge) ? `${rawAge} años` : 'No especificada' },
    { label: 'Cumpleaños', value: rawBirthDate || 'No especificado' },
    { label: 'Género', value: rawGender || 'No especificado' },
    { label: 'Tipo de Sangre', value: rawBloodType || 'No especificado' },
    { label: 'Alineación', value: rawAlignment || 'No especificada' },
    { label: 'Facción / Grupo', value: displayValue(group, 'Sin grupo') },
    { label: 'Ocupación / Clase', value: occupationOrClass },
    { label: 'Nacionalidad', value: rawNationality || 'Japonesa' },
  ];

  const resolvedPlusUltra = Number(
    readValue(profile, ['plus_ultra', 'plusUltra']) ??
    character?.plus_ultra ??
    0
  );

  const rawPossessionRows = Array.isArray(character?.possessions) ? character.possessions : [];

  // Traits
  const relationalTraits = rawPossessionRows.filter((row: any) => row?.element?.kind === 'trait').map((row: any) => row.element?.id || row?.elementId);
  const combinedTraitIds = Array.from(new Set([
    ...(Array.isArray(profile.traits) ? profile.traits : []),
    ...relationalTraits,
  ]));
  const traits = combinedTraitIds.map(id => getElement(id));

  // Weaknesses
  const relationalWeaknesses = rawPossessionRows.filter((row: any) => row?.element?.kind === 'weakness').map((row: any) => row.element?.id || row?.elementId);
  const combinedWeaknessIds = Array.from(new Set([
    ...(Array.isArray(profile.weaknesses) ? profile.weaknesses : []),
    ...relationalWeaknesses,
  ]));
  const weaknesses = combinedWeaknessIds.map(id => getElement(id));

  // Credentials / Licenses / Certifications / Clandestine Assets
  const relationalCredentials = rawPossessionRows
    .filter((row: any) =>
      ['license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset', 'asset', 'credential', 'licencia', 'certificacion', 'activo_clandestino', 'recurso'].includes(
        row?.element?.kind || row?.kind
      )
    )
    .map((row: any) => ({
      id: row?.element?.id || row?.possession?.elementId || row?.elementId || '',
      name: row?.element?.name || row?.name || 'Documento / Activo',
      description: row?.element?.description || row?.description || '',
      kind: row?.element?.kind || row?.kind || 'Licencia / Activo',
      element: row?.element,
    }));

  const rawProfileCredentials = [
    ...(Array.isArray(profile.licenses) ? profile.licenses : []),
    ...(Array.isArray(profile.licencias) ? profile.licencias : []),
    ...(Array.isArray(profile.credentials) ? profile.credentials : []),
    ...(Array.isArray(profile.credenciales) ? profile.credenciales : []),
    ...(Array.isArray(profile.certifications) ? profile.certifications : []),
    ...(Array.isArray(profile.certificaciones) ? profile.certificaciones : []),
    ...(Array.isArray(profile.assets) ? profile.assets : []),
    ...(Array.isArray(profile.activos) ? profile.activos : []),
    ...(Array.isArray(profile.clandestine_assets) ? profile.clandestine_assets : []),
    ...(Array.isArray(profile.activos_clandestinos) ? profile.activos_clandestinos : []),
  ];

  const profileCredentialsMapped = rawProfileCredentials.map((c: any) => {
    if (typeof c === 'string') {
      const el = getElement(c);
      return {
        id: c,
        name: el.name || c,
        description: el.description || '',
        kind: 'Licencia / Activo',
        element: el,
      };
    }
    const el = getElement(c.id || c.elementId || c.name);
    return {
      id: c.id || c.elementId || el.id || '',
      name: c.name || el.name || 'Documento',
      description: c.description || el.description || '',
      kind: c.kind || 'Licencia / Activo',
      element: el,
    };
  });

  const credentialMap = new Map<string, any>();
  for (const cred of relationalCredentials) {
    const key = (cred.id || cred.name).toLowerCase();
    credentialMap.set(key, cred);
  }
  for (const cred of profileCredentialsMapped) {
    const key = (cred.id || cred.name).toLowerCase();
    if (!credentialMap.has(key)) {
      credentialMap.set(key, cred);
    }
  }
  const credentials = Array.from(credentialMap.values());

  // Skills (Habilidades)
  const rawSkillsFromPossessions = rawPossessionRows
    .filter((row: any) => (row?.element?.kind || row?.kind) === 'skill')
    .map((row: any) => ({
      id: row?.element?.id || row?.possession?.elementId || row?.elementId || '',
      name: row?.element?.name || row?.name || 'Habilidad',
      description: row?.element?.description || row?.description || '',
      level: Number(row?.possession?.quantity || row?.quantity || 1),
      element: row?.element,
    }));

  const rawProfileSkills = [
    ...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(profile.habilidades) ? profile.habilidades : []),
  ];

  const rawSkillsFromProfile = rawProfileSkills.map((s: any) => {
    if (typeof s === 'string') {
      const el = getElement(s);
      return {
        id: s,
        name: el.name && el.name !== s ? el.name : s,
        description: el.description || '',
        level: 1,
      };
    }
    const el = getElement(s.id || s.elementId || s.name);
    return {
      id: s.id || s.elementId || el.id || s.name || '',
      name: s.name || el.name || s.id || 'Habilidad',
      description: s.description || el.description || '',
      level: Number(s.level || s.quantity || 1),
    };
  });

  const skillMap = new Map<string, { id: string; name: string; description: string; level: number; element?: any }>();
  for (const s of rawSkillsFromPossessions) {
    const key = (s.id || s.name).toLowerCase();
    skillMap.set(key, s);
  }
  for (const s of rawSkillsFromProfile) {
    const key = (s.id || s.name).toLowerCase();
    if (!skillMap.has(key)) {
      skillMap.set(key, s);
    } else {
      const existing = skillMap.get(key)!;
      skillMap.set(key, {
        ...existing,
        level: Math.max(existing.level, s.level),
        description: existing.description || s.description,
      });
    }
  }
  const skills = Array.from(skillMap.values());

  const rawTechniques = Array.isArray(character?.techniques) ? character.techniques : [];
  const techniques = rawTechniques.map((tech: any) => {
    const isStructural = Array.isArray(tech?.mechanicalBehaviors) && tech.mechanicalBehaviors.length > 0;
    const structuralCost = calculateTechniqueStructuralCost(tech, mechanicsList, staminaCosts);
    const finalCost = isStructural ? structuralCost : (tech.cost ?? structuralCost);
    const derivedLevel = isStructural ? deriveTechniqueLevelFromCost(finalCost).level : (tech.level || 1);
    return {
      id: tech.id,
      name: tech.name,
      level: derivedLevel,
      cost: finalCost,
      type: tech.type || tech.classification || (tech.sourceType === 'quirk' ? 'Don' : tech.sourceType === 'physical' ? 'Física' : tech.sourceType === 'weapon' ? 'Arma' : undefined),
      target: tech.target || (tech.attackType === 'mental' ? 'Coraje' : tech.attackType === 'physical' ? 'Evasión' : undefined),
      description: tech.description || '',
      autoDescription: isStructural
        ? generateAutoDescription({ ...tech, cost: `${finalCost} CE` }, mechanicsList, staminaCosts, finalCost)
        : (tech.autoDescription || generateAutoDescription(tech, mechanicsList, staminaCosts, finalCost)),
    };
  });

  const rawPossessions = Array.isArray(character?.possessions) ? character.possessions : [];
  const possessions = rawPossessions
    .filter((r: any) => {
      const kind = (r?.element?.kind || r?.kind || '').toLowerCase();
      return ['equipment', 'weapon', 'consumable', 'ammunition', 'crafting_material', 'ingredient', 'vehicle', 'real_estate', 'item', 'item_equipment', 'gear', 'objeto', 'consumible', 'arma', 'armadura', 'municion', 'sustancia', 'ingrediente'].includes(kind);
    })
    .map((r: any) => ({
      name: r?.element?.name || r?.name || 'Objeto',
      description: r?.element?.description || r?.description || '',
      quantity: r?.possession?.quantity ?? r?.quantity ?? 1,
      kind: r?.element?.kind || r?.kind || 'item',
      equipped: r?.possession?.equipped ?? r?.equipped ?? false,
    }));

  return {
    character,
    profile,
    fullName,
    name,
    lastName,
    alias,
    avatar,
    group,
    status,
    basicStage,
    detectedTheme,
    quirk: {
      name: quirkName,
      type: quirkType,
      evolution: quirkEvolution,
      description: quirkDescription,
      levelOne: quirkLevelOne,
      levelTwo: quirkLevelTwo,
      levelThree: quirkLevelThree,
    },
    resources: {
      reputation: readValue(profile, ['reputation', 'reputacion', 'amenaza']),
      yen: character?.yen ?? 0,
      exp: character?.exp ?? 0,
      plusUltra: resolvedPlusUltra,
      currentHealth,
      maxHealth,
      currentStamina,
      maxStamina,
    },
    baseAttributes,
    combatStatus: {
      evasion: evasionVal,
      courage: courageVal,
      physicalDamageText: physicalDamageVal,
      rangeDamageText: rangeDamageVal,
      damageReductionText: damageReductionVal,
      initiativeText: initiativeVal,
      modFuerza,
      modDestreza,
    },
    defenseList,
    combatStatusList,
    personalDataList,
    traits,
    weaknesses,
    skills,
    credentials,
    techniques,
    possessions,
    biography: readValue(profile, ['biography', 'bio', 'historia', 'descripcion']),
    employments: employmentsList,
    enrollment,
    academic: {
      className: classNameResolved,
      courseName: courseNameResolved,
      schoolName: schoolNameResolved,
    },
  };
}
