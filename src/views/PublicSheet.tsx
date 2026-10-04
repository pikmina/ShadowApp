import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  Bookmark,
  Coins,
  Cpu,
  Feather,
  HandFist,
  Heart,
  HeartPulse,
  Scale,
  Scroll,
  Shield,
  ShieldAlert,
  ShieldUser,
  Sparkles,
  SportShoe,
  Swords,
  Target,
  Trophy,
  User,
  UserShield,
  Wind,
  Zap,
} from 'lucide-react';
import { calculateDerivedStats, calculateTraitAttributeBonus, calculatePurchasedAttributeBonuses, calculateEquipmentBonuses } from '@/lib/characterValidation';
import { ModifierBadgeGroup, ModifierNotesLegend, ModifierSource } from '@/components/character/ModifierBadge';
import { generateAutoDescription } from '@/domain/mechanicalDescription';
import { cn } from '@/lib/utils';
import {
  detectFactionTheme,
} from '@/components/character/themes/FactionSheetTheme';
import { StudentSheetView } from '@/components/character/themes/StudentSheetView';
import { HeroSheetView } from '@/components/character/themes/HeroSheetView';
import { CivilianSheetView } from '@/components/character/themes/CivilianSheetView';
import { VillainSheetView } from '@/components/character/themes/VillainSheetView';
import { VigilanteSheetView } from '@/components/character/themes/VigilanteSheetView';
import { BaseSheetView } from '@/components/character/themes/BaseSheetView';
import { calculateTechniqueStructuralCost } from '@/domain/systemMechanics';
import { deriveTechniqueLevelFromCost } from '@/domain/characterTechnique';
import { CANONICAL_STAT_ICONS, resolveCanonicalGroupColor } from '@/domain/canonicalStatIcons';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const readValue = (profile: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (hasValue(profile[key])) return profile[key];
  }
  return undefined;
};

const displayValue = (value: unknown, fallback = 'N/A') => {
  if (!hasValue(value)) return fallback;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return fallback;
  return String(value);
};

export default function PublicSheet() {
  const { id, identifier } = useParams();
  const searchId = id || identifier;
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [elements, setElements] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadCharacter = async () => {
      try {
        const [response, elemResponse, rulesResponse, settingsResponse] = await Promise.all([
          fetch(`/api/public/character/${encodeURIComponent(searchId || '')}`, { signal: controller.signal }),
          fetch('/api/elements', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] })),
          fetch('/api/rules', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] })),
          fetch('/api/settings', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => null }))
        ]);
        if (!response.ok) throw new Error('Character not found');
        setCharacter(await response.json());
        if ((elemResponse as any).ok) setElements(await (elemResponse as any).json());
        if ((rulesResponse as any).ok) setRules(await (rulesResponse as any).json());
        if ((settingsResponse as any).ok) setSettings(await (settingsResponse as any).json());
      } catch (requestError: any) {
        if (requestError.name !== 'AbortError') {
          console.error("PublicSheet fetch error:", requestError);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    if (searchId) {
      void loadCharacter();
    }
    return () => controller.abort();
  }, [searchId]);

  const stagesList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [], [rules]);
  const mechanicsList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_mechanics')?.value || [] : [], [rules]);
  const staminaCosts = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'stamina_execution_costs')?.value : undefined, [rules]);

  const storedProfile = character?.profileData || {};
  const possessionRows = Array.isArray(character?.possessions) ? character.possessions : [];

  const getElement = (idOrItem: any): { id: string; name: string; description: string; kind?: string; element?: any } => {
    if (!idOrItem) return { id: '', name: '', description: '' };
    if (typeof idOrItem === 'object') {
      return {
        id: idOrItem.id || idOrItem.elementId || '',
        name: idOrItem.name || idOrItem.title || idOrItem.id || '',
        description: idOrItem.description || idOrItem.desc || '',
        kind: idOrItem.kind || 'Licencia / Activo',
        element: idOrItem
      };
    }
    const id = String(idOrItem);
    const found = elements.find(el => el.id === id || el.name?.toLowerCase() === id.toLowerCase());
    if (found) {
      return {
        id: found.id || id,
        name: found.name || id,
        description: found.description || '',
        kind: found.kind || 'Licencia / Activo',
        element: found
      };
    }
    const fromPossessions = possessionRows.find((row: any) => row?.element?.id === id || row?.element?.name?.toLowerCase() === id.toLowerCase())?.element;
    if (fromPossessions) {
      return {
        id: fromPossessions.id || id,
        name: fromPossessions.name || id,
        description: fromPossessions.description || '',
        kind: fromPossessions.kind || 'Licencia / Activo',
        element: fromPossessions
      };
    }
    return { id, name: id, description: '', kind: 'Licencia / Activo' };
  };

  const relationalTraits = possessionRows.filter((row: any) => row?.element?.kind === 'trait').map((row: any) => row.element.id);
  const relationalWeaknesses = possessionRows.filter((row: any) => row?.element?.kind === 'weakness').map((row: any) => row.element.id);
  const relationalCredentials = possessionRows
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
    ...(Array.isArray(storedProfile.licenses) ? storedProfile.licenses : []),
    ...(Array.isArray(storedProfile.licencias) ? storedProfile.licencias : []),
    ...(Array.isArray(storedProfile.credentials) ? storedProfile.credentials : []),
    ...(Array.isArray(storedProfile.credenciales) ? storedProfile.credenciales : []),
    ...(Array.isArray(storedProfile.certifications) ? storedProfile.certifications : []),
    ...(Array.isArray(storedProfile.certificaciones) ? storedProfile.certificaciones : []),
    ...(Array.isArray(storedProfile.assets) ? storedProfile.assets : []),
    ...(Array.isArray(storedProfile.activos) ? storedProfile.activos : []),
    ...(Array.isArray(storedProfile.clandestine_assets) ? storedProfile.clandestine_assets : []),
    ...(Array.isArray(storedProfile.activos_clandestinos) ? storedProfile.activos_clandestinos : []),
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

  // Merge traits and weaknesses
  const combinedTraits = Array.from(new Set([
    ...(Array.isArray(storedProfile.traits) ? storedProfile.traits : []),
    ...relationalTraits
  ]));
  const combinedWeaknesses = Array.from(new Set([
    ...(Array.isArray(storedProfile.weaknesses) ? storedProfile.weaknesses : []),
    ...relationalWeaknesses
  ]));
  const profile = { ...storedProfile, traits: combinedTraits, weaknesses: combinedWeaknesses };

  const combinedElements = useMemo(() => {
    const list = [...elements];
    possessionRows.forEach((row: any) => {
      if (row?.element && !list.some(el => el.id === row.element.id)) {
        list.push(row.element);
      }
    });
    return list;
  }, [elements, possessionRows]);

  const employmentsList = Array.isArray(character?.employments) ? character.employments : [];
  const enrollment = character?.enrollment || null;
  const manualOccupation = readValue(profile, ['occupation', 'ocupacion', 'ocupación']);
  const manualRank = readValue(profile, ['rank', 'rango', 'role', 'rol']);
  const manualSchoolYear = readValue(profile, ['schoolYear', 'school_year', 'ano_escolar', 'año_escolar']);

  let derived = null;
  try {
    derived = (character && stagesList.length > 0) ? calculateDerivedStats(profile, stagesList, combinedElements, mechanicsList, character?.possessions || []) : null;
  } catch (err) {
    console.error("Error calculating derived stats:", err);
  }

  const purchasedBonusData = useMemo(() => {
    return calculatePurchasedAttributeBonuses(character?.possessions || [], combinedElements);
  }, [character?.possessions, combinedElements]);

  const traitBonusData = useMemo(() => {
    return calculateTraitAttributeBonus(profile, combinedElements, mechanicsList);
  }, [profile, combinedElements, mechanicsList]);

  const equipmentBonusData = useMemo(() => {
    return calculateEquipmentBonuses(character?.possessions || [], combinedElements, mechanicsList);
  }, [character?.possessions, combinedElements, mechanicsList]);

  const maxHealth = derived ? derived.salud : Number(readValue(profile, ['maxHealth', 'max_health', 'salud_maxima']) || 20);
  const maxStamina = derived ? derived.estamina : Number(readValue(profile, ['maxStamina', 'max_stamina', 'estamina_maxima']) || 20);
  const currentHealth = maxHealth;
  const currentStamina = maxStamina;

  const traits = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknesses = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const name = character ? displayValue(readValue(profile, ['basic_name', 'name', 'nombre']) || character.name, 'Sin nombre') : '';
  const lastName = character ? displayValue(readValue(profile, ['last_name', 'lastName', 'apellido']), '') : '';
  const fullName = `${name} ${lastName}`.trim();
  const alias = character ? displayValue(readValue(profile, ['alias', 'hero_name', 'nombre_heroe']), 'Sin alias') : '';
  const avatar = character ? readValue(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']) : null;
  const group = character ? (
    readValue(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción', 'affiliation']) ||
    character.group ||
    character.faction ||
    character.affiliation
  ) : null;
  const basicStage = character ? displayValue(readValue(profile, ['basic_stage', 'stage', 'nivel', 'etapa']), 'Novato') : '';

  const detectedTheme = useMemo(() => detectFactionTheme(group), [group]);
  const resolvedGroupColor = useMemo(() => {
    return resolveCanonicalGroupColor(group, settings?.groups, detectedTheme);
  }, [group, settings, detectedTheme]);
  const status = character ? displayValue(readValue(profile, ['status', 'estado']), 'Activo') : '';
  
  // Quirk Info
  const quirkName = character ? displayValue(readValue(profile, ['quirk_name', 'quirkName', 'don_name', 'don']), 'Sin don registrado') : '';
  const quirkType = character ? displayValue(readValue(profile, ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don']), 'Emisión') : '';
  const quirkEvolution = character ? displayValue(readValue(profile, ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk', 'nivel_quirk']), 'Nivel 1. Despertar') : '';
  const quirkDescription = character ? displayValue(readValue(profile, ['quirk_description', 'quirkDesc', 'quirk_desc', 'don_descripcion']), 'No se ha registrado información sobre este don.') : '';
  const quirkLevelOne = character ? displayValue(readValue(profile, ['quirk_lvl1', 'quirkLvl1', 'quirk_level_1', 'quirk_nivel_1']), 'Sin descripción de nivel.') : '';
  const quirkLevelTwo = character ? readValue(profile, ['quirk_lvl2', 'quirkLvl2', 'quirk_level_2', 'quirk_nivel_2']) : null;
  const quirkLevelThree = character ? readValue(profile, ['quirk_lvl3', 'quirkLvl3', 'quirk_level_3', 'quirk_nivel_3']) : null;

  const baseAttributes = [
    { label: 'Fuerza', key: 'FUE', icon: HandFist, angle: 90 },
    { label: 'Resistencia', key: 'RES', icon: HeartPulse, angle: 30 },
    { label: 'Destreza', key: 'DES', icon: Target, angle: 330 },
    { label: 'Inteligencia', key: 'INT', icon: Scale, angle: 150 },
    { label: 'Voluntad', key: 'VOL', icon: UserShield, angle: 270 },
    { label: 'Velocidad', key: 'VEL', icon: Wind, angle: 210 }
  ].map(attr => {
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
      ...(equipmentBonusData.sourcesByAttr[attr.key] || [])
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

  const fueStat = baseAttributes.find(a => a.key === 'FUE');
  const desStat = baseAttributes.find(a => a.key === 'DES');
  const modFuerzaVal = Math.floor(Number(fueStat?.value || 0) / 2);
  const modDestrezaVal = Math.floor(Number(desStat?.value || 0) / 2);

  const defenseList = [
    {
      label: 'EVASIÓN',
      value: derived?.evasion ?? readValue(profile, ['evasion', 'evasión', 'eva']),
      icon: SportShoe,
      equipmentBonus: equipmentBonusData.byDerived.evasion || 0,
      sources: derived?.derivedSources?.evasion || equipmentBonusData.sourcesByDerived.evasion || [],
    },
    {
      label: 'CORAJE',
      value: derived?.coraje ?? readValue(profile, ['coraje', 'cor', 'courage']),
      icon: UserShield,
      equipmentBonus: equipmentBonusData.byDerived.coraje || 0,
      sources: derived?.derivedSources?.coraje || equipmentBonusData.sourcesByDerived.coraje || [],
    }
  ];

  const combatStatusList = [
    { label: 'DAÑO FÍSICO', value: derived?.dañoFisico ?? readValue(profile, ['daño_fisico', 'dano_fisico', 'daño_base', 'baseDamage']), icon: Swords, sub: 'CQC / Melee', sources: [] },
    { label: 'DAÑO RANGO', value: derived?.dañoRango ?? readValue(profile, ['daño_rango', 'dano_rango', 'rangeDamage']), icon: Target, sub: 'Distancia', sources: [] },
    {
      label: 'REDUCCIÓN DAÑO',
      value: derived?.reduccionDano ?? readValue(profile, ['reduccion_dano', 'dr']) ?? 0,
      icon: ShieldUser,
      sub: 'Armadura / RD',
      equipmentBonus: equipmentBonusData.byDerived.reduccionDano || 0,
      sources: derived?.derivedSources?.reduccionDano || equipmentBonusData.sourcesByDerived.reduccionDano || [],
    },
    {
      label: 'INICIATIVA',
      value: (() => {
        const val = derived?.iniciativa ?? readValue(profile, ['iniciativa', 'initiative']);
        if (!hasValue(val)) return '0';
        const num = Number(val);
        return !isNaN(num) && num > 0 ? `+${num}` : String(val);
      })(),
      icon: Feather,
      sub: 'Velocidad reacción',
      equipmentBonus: equipmentBonusData.byDerived.iniciativa || 0,
      sources: derived?.derivedSources?.iniciativa || equipmentBonusData.sourcesByDerived.iniciativa || [],
    }
  ];

  const rawBirthDate = readValue(profile, [
    'birth_date',
    'basic_birth_date',
    'fecha_nacimiento',
    'nacimiento',
    'fecha_de_nacimiento',
    'birthday',
    'cumpleanos',
    'cumpleaños',
    'date_of_birth'
  ]);

  const calculateAgeFromBirth = (birthDateStr?: string) => {
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

  const rawAgeVal = readValue(profile, ['basic_age', 'age', 'edad']);
  const rawAge = hasValue(rawAgeVal) ? rawAgeVal : calculateAgeFromBirth(rawBirthDate);
  const rawGender = readValue(profile, ['gender', 'genero', 'sexo', 'basic_gender']);
  const rawBloodType = readValue(profile, ['basic_blood_type', 'blood_type', 'bloodType', 'grupo_sanguineo', 'tipo_de_sangre', 'grupo_sanguíneo', 'tipo_sangre']);
  const rawAlignment = readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación', 'alineamiento']);
  const rawNationality = readValue(profile, ['nationality', 'nacionalidad']);

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
    { label: 'Edad', value: hasValue(rawAge) ? `${rawAge} años` : 'No especificada', icon: Activity },
    { label: 'Cumpleaños', value: rawBirthDate || 'No especificado', icon: Trophy },
    { label: 'Género', value: rawGender || 'No especificado', icon: User },
    { label: 'Tipo de Sangre', value: rawBloodType || 'No especificado', icon: Heart },
    { label: 'Alineación', value: rawAlignment || 'No especificada', icon: Award },
    { label: 'Facción / Grupo', value: displayValue(group, 'Sin grupo'), icon: Shield },
    { label: 'Ocupación / Clase', value: occupationOrClass, icon: Award },
    { label: 'Nacionalidad', value: rawNationality || 'Japonesa', icon: Trophy },
  ];

  const resolvedPlusUltra = Number(
    readValue(profile, ['plus_ultra', 'plusUltra']) ??
    character?.plus_ultra ??
    0
  );

  const rawSkillsFromPossessions = possessionRows
    .filter((row: any) => (row?.element?.kind || row?.kind) === 'skill')
    .map((row: any) => ({
      id: row?.element?.id || row?.possession?.elementId || row?.elementId || '',
      name: row?.element?.name || row?.name || 'Habilidad',
      description: row?.element?.description || row?.description || '',
      level: Number(row?.possession?.quantity || row?.quantity || 1),
      element: row?.element,
    }));

  const rawProfileSkills = [
    ...(Array.isArray(storedProfile.skills) ? storedProfile.skills : []),
    ...(Array.isArray(storedProfile.habilidades) ? storedProfile.habilidades : []),
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
  const skillsList = Array.from(skillMap.values());

  const techniquesList = Array.isArray(character?.techniques) ? character.techniques : [];

  const resolvedTraits = traits.map(id => getElement(id));
  const resolvedWeaknesses = weaknesses.map(id => getElement(id));

  const resolvedTechniques = techniquesList.map((tech: any) => {
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

  const classNameResolved = enrollment?.classGroup?.name 
    || readValue(profile, ['class_group', 'clase_grupo', 'clase', 'aula', 'seccion', 'sección']) 
    || 'Clase 1-A';

  const courseNameResolved = enrollment?.academicYear?.name 
    || readValue(profile, ['course', 'curso', 'especialidad', 'carrera', 'formacion', 'formación']) 
    || (basicStage && basicStage !== 'Estudiante Básica' ? basicStage : 'Curso de Héroes');

  const schoolNameResolved = enrollment?.school?.name 
    || readValue(profile, ['school', 'escuela', 'academia', 'institucion', 'institución']) 
    || 'Academia UA';

  const inventoryItemsOnly = possessionRows
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
      element: r?.element,
      iconType: r?.element?.iconType ?? null,
      iconValue: r?.element?.iconValue ?? null,
    }));

  useEffect(() => {
    if (character) {
      const charName = fullName || character.name;
      const title = charName && charName !== 'Sin nombre' && charName !== 'Personaje sin nombre'
        ? `${charName} ✦ MHA:OFA`
        : 'Ficha de Personaje ✦ MHA:OFA';
      document.title = title;
    }
    return () => {
      document.title = 'Shadowmore';
    };
  }, [character, fullName]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080a] font-oxanium text-sm text-zinc-400">
        Cargando expediente...
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080a] p-6 text-center font-oxanium text-sm text-rose-500">
        Ficha no encontrada o no disponible.
      </div>
    );
  }

  return (
    <div className="public-view min-h-screen bg-[#070709] bg-[radial-gradient(rgba(6,182,212,0.06)_1px,transparent_1px)] [background-size:24px_24px] text-zinc-100 selection:bg-cyan-500 selection:text-black pb-16 relative">
      {/* Top OS Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#0a0a0e]/95 px-3 py-2.5 backdrop-blur-md sm:px-6 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-xs font-black tracking-widest text-zinc-100">
              <span className="rounded bg-cyan-600 px-1.5 py-0.5 text-[9px] text-white font-mono">FICHA</span>
              <span className="text-white font-bold truncate">{fullName || 'Personaje'}</span>
              <span className="text-cyan-400 font-normal">✦</span>
              <span className="text-[11px] font-mono font-bold text-cyan-400">MHA:OFA</span>
            </p>
            <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              Expediente público de personaje • SHADOWMORE OS
            </p>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            <Link to="/character-editor" className="rounded border border-zinc-850 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200">
              Registros
            </Link>
          </nav>
        </div>
      </header>

      {detectedTheme === 'student' ? (
        <StudentSheetView
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Estudiantes')}
          groupColor={resolvedGroupColor}
          className={classNameResolved}
          courseName={courseNameResolved}
          schoolName={schoolNameResolved}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
        />
      ) : detectedTheme === 'civilian' ? (
        <CivilianSheetView
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Civiles')}
          groupColor={resolvedGroupColor}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
          employments={employmentsList}
        />
      ) : detectedTheme === 'hero' ? (
        <HeroSheetView
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Héroes')}
          groupColor={resolvedGroupColor}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
        />
      ) : detectedTheme === 'villain' ? (
        <VillainSheetView
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Villanos')}
          groupColor={resolvedGroupColor}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          modFuerza={modFuerzaVal}
          modDestreza={modDestrezaVal}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
          employments={employmentsList}
        />
      ) : detectedTheme === 'vigilante' ? (
        <VigilanteSheetView
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Vigilantes')}
          groupColor={resolvedGroupColor}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          modFuerza={modFuerzaVal}
          modDestreza={modDestrezaVal}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
          employments={employmentsList}
        />
      ) : (
        <BaseSheetView
          theme={detectedTheme}
          fullName={fullName}
          alias={alias}
          avatar={avatar}
          group={displayValue(group, 'Sin grupo')}
          groupColor={resolvedGroupColor}
          status={status}
          basicStage={basicStage}
          quirkName={quirkName}
          quirkType={quirkType}
          quirkEvolution={quirkEvolution}
          quirkDescription={quirkDescription}
          quirkLevelOne={quirkLevelOne}
          quirkLevelTwo={quirkLevelTwo}
          quirkLevelThree={quirkLevelThree}
          reputation={readValue(profile, ['reputation', 'reputacion', 'amenaza'])}
          yen={character.yen}
          exp={character.exp}
          plusUltra={resolvedPlusUltra}
          currentHealth={currentHealth}
          maxHealth={maxHealth}
          currentStamina={currentStamina}
          maxStamina={maxStamina}
          evasion={Number(defenseList[0]?.value || 0)}
          courage={Number(defenseList[1]?.value || 0)}
          physicalDamageText={String(combatStatusList[0]?.value || '1D4')}
          rangeDamageText={String(combatStatusList[1]?.value || '1D4')}
          damageReductionText={String(combatStatusList[2]?.value || '0')}
          initiativeText={String(combatStatusList[3]?.value || '0')}
          modFuerza={modFuerzaVal}
          modDestreza={modDestrezaVal}
          classNameResolved={classNameResolved}
          courseNameResolved={courseNameResolved}
          schoolNameResolved={schoolNameResolved}
          enrollment={enrollment}
          baseAttributes={baseAttributes}
          defenseList={defenseList}
          combatStatusList={combatStatusList}
          personalDataList={personalDataList}
          traits={resolvedTraits}
          weaknesses={resolvedWeaknesses}
          skills={skillsList}
          credentials={credentials}
          techniques={resolvedTechniques}
          possessions={inventoryItemsOnly}
          biography={readValue(profile, ['biography', 'bio', 'historia', 'descripcion'])}
          character={character}
          profile={profile}
          employments={employmentsList}
        />
      )}
    </div>
  );
}
