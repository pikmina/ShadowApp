import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  BatteryCharging,
  BatteryPlus,
  Bookmark,
  Brain,
  BrainCircuit,
  Briefcase,
  Cake,
  CircleUserRound,
  Coins,
  Cpu,
  Crosshair,
  Diff,
  Droplet,
  Earth,
  Feather,
  Flame,
  GraduationCap,
  HandFist,
  HeartCrack,
  HeartPlus,
  HeartPulse,
  Mars,
  NonBinary,
  Package,
  PackageOpen,
  PersonStanding,
  Scale,
  Scroll,
  Shield,
  ShieldHalf,
  ShieldUser,
  Shuffle,
  Sparkles,
  SportShoe,
  Swords,
  Target,
  User,
  UserStar,
  UserShield,
  Venus,
  Wind,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CyberFillerPanel } from '@/components/ui/cyber-filler-panel';
import { CyberModule } from '@/components/ui/cyber-module';
import { EntityPanel } from '@/components/ui/entity-panel';
import { calculateDerivedStats, calculateTraitAttributeBonus, calculatePurchasedAttributeBonuses, calculateEquipmentBonuses } from '@/lib/characterValidation';
import { ModifierBadgeGroup, ModifierNotesLegend } from '@/components/character/ModifierBadge';
import { calculateTechniqueStructuralCost } from '@/domain/systemMechanics';
import { describeMechanicalBehavior, generateAutoDescription } from '@/domain/mechanicalDescription';
import { cn } from '@/lib/utils';

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
  const { id } = useParams();
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [elements, setElements] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCharacter = async () => {
      try {
        const [response, elemResponse, rulesResponse] = await Promise.all([
          fetch(`/api/public/character/${encodeURIComponent(id || '')}`, { signal: controller.signal }),
          fetch('/api/elements', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] })),
          fetch('/api/rules', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] }))
        ]);
        if (!response.ok) throw new Error('Character not found');
        setCharacter(await response.json());
        if ((elemResponse as any).ok) setElements(await (elemResponse as any).json());
        if ((rulesResponse as any).ok) setRules(await (rulesResponse as any).json());
      } catch (requestError: any) {
        if (requestError.name !== 'AbortError') {
          console.error("PublicSheet fetch error:", requestError);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadCharacter();
    return () => controller.abort();
  }, [id]);

  const stagesList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [], [rules]);
  const mechanicsList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_mechanics')?.value || [] : [], [rules]);

  const storedProfile = character?.profileData || {};
  const possessionRows = Array.isArray(character?.possessions) ? character.possessions : [];
  const relationalTraits = possessionRows.filter((row: any) => row?.element?.kind === 'trait').map((row: any) => row.element.id);
  const relationalWeaknesses = possessionRows.filter((row: any) => row?.element?.kind === 'weakness').map((row: any) => row.element.id);
  const credentials = possessionRows.filter((row: any) => ['license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset'].includes(row?.element?.kind));

  // Merge traits and weaknesses from both profile and relational possessions so none are lost
  const combinedTraits = Array.from(new Set([
    ...(Array.isArray(storedProfile.traits) ? storedProfile.traits : []),
    ...relationalTraits
  ]));
  const combinedWeaknesses = Array.from(new Set([
    ...(Array.isArray(storedProfile.weaknesses) ? storedProfile.weaknesses : []),
    ...relationalWeaknesses
  ]));
  const profile = { ...storedProfile, traits: combinedTraits, weaknesses: combinedWeaknesses };

  // Combine elements from /api/elements with any element entities already attached in possessions
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
  const hasEmploymentData = employmentsList.length > 0 || Boolean(enrollment) || Boolean(manualOccupation) || Boolean(manualRank) || Boolean(manualSchoolYear);

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

  const getElement = (idOrItem: any) => {
    if (!idOrItem) return { name: '', description: '' };
    if (typeof idOrItem === 'object') {
      return {
        name: idOrItem.name || idOrItem.title || idOrItem.id || '',
        description: idOrItem.description || idOrItem.desc || ''
      };
    }
    const id = String(idOrItem);
    const found = elements.find(el => el.id === id || el.name?.toLowerCase() === id.toLowerCase());
    if (found) {
      return {
        name: found.name || id,
        description: found.description || ''
      };
    }
    const fromPossessions = possessionRows.find((row: any) => row?.element?.id === id || row?.element?.name?.toLowerCase() === id.toLowerCase())?.element;
    if (fromPossessions) {
      return {
        name: fromPossessions.name || id,
        description: fromPossessions.description || ''
      };
    }
    return { name: id, description: '' };
  };

  const traits = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknesses = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const name = character ? displayValue(readValue(profile, ['basic_name', 'name', 'nombre']) || character.name, 'Sin nombre') : '';
  const lastName = character ? displayValue(readValue(profile, ['last_name', 'lastName', 'apellido']), '') : '';
  const fullName = `${name} ${lastName}`.trim();
  const alias = character ? displayValue(readValue(profile, ['alias', 'hero_name', 'nombre_heroe']), 'Sin alias') : '';
  const avatar = character ? readValue(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']) : null;
  const group = character ? readValue(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']) : null;
  const status = character ? displayValue(readValue(profile, ['status', 'estado']), 'Activo') : '';
  const quirkName = character ? displayValue(readValue(profile, ['quirk_name', 'quirkName', 'don_name', 'don']), 'Sin don registrado') : '';
  const quirkType = character ? displayValue(readValue(profile, ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don']), 'Sin clasificación') : '';
  const quirkEvolution = character ? displayValue(readValue(profile, ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk', 'nivel_quirk']), 'Nivel 1. Despertar') : '';
  const quirkDescription = character ? displayValue(readValue(profile, ['quirk_description', 'quirkDesc', 'quirk_desc', 'don_descripcion']), 'No se ha registrado información sobre este don.') : '';
  const quirkLevelOne = character ? displayValue(readValue(profile, ['quirk_lvl1', 'quirkLvl1', 'quirk_level_1', 'quirk_nivel_1']), 'Sin descripción de nivel.') : '';
  const quirkLevelTwo = character ? readValue(profile, ['quirk_lvl2', 'quirkLvl2', 'quirk_level_2', 'quirk_nivel_2']) : null;
  const quirkLevelThree = character ? readValue(profile, ['quirk_lvl3', 'quirkLvl3', 'quirk_level_3', 'quirk_nivel_3']) : null;

  const baseAttributes = [
    { label: 'Fuerza', key: 'FUE', icon: HandFist },
    { label: 'Resistencia', key: 'RES', icon: HeartPulse },
    { label: 'Destreza', key: 'DES', icon: Zap },
    { label: 'Inteligencia', key: 'INT', icon: Brain },
    { label: 'Velocidad', key: 'VEL', icon: Wind },
    { label: 'Voluntad', key: 'VOL', icon: Flame }
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
      label: attr.label,
      key: attr.key,
      icon: attr.icon,
      base: baseVal,
      purchasedBonus,
      traitBonus,
      equipmentBonus,
      bonus: totalBonus,
      hasBonus: totalBonus !== 0,
      value: hasValue(rawVal) ? finalVal : undefined,
      sources,
    };
  });

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

  const derivedGrid = [
    { label: 'DAÑO FÍSICO', value: derived?.dañoFisico ?? readValue(profile, ['daño_fisico', 'dano_fisico', 'daño_base', 'dano_base', 'baseDamage', 'base_damage']), icon: Swords, sources: [] },
    { label: 'DAÑO DE RANGO', value: derived?.dañoRango ?? readValue(profile, ['daño_rango', 'dano_rango', 'rangeDamage', 'range_damage']), icon: Target, sources: [] },
    {
      label: 'REDUCCIÓN DAÑO',
      value: derived?.reduccionDano ?? readValue(profile, ['reduccion_dano', 'reduccionDano', 'dr', 'damageReduction', 'damage_reduction']) ?? 0,
      icon: ShieldUser,
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
      equipmentBonus: equipmentBonusData.byDerived.iniciativa || 0,
      sources: derived?.derivedSources?.iniciativa || equipmentBonusData.sourcesByDerived.iniciativa || [],
    },
    {
      label: 'MOD FUE',
      value: (() => {
        const val = derived?.modFue ?? readValue(profile, ['mod_fue', 'modFUE']);
        if (!hasValue(val)) return '0';
        const num = Number(val);
        return !isNaN(num) && num > 0 ? `+${num}` : String(val);
      })(),
      icon: Diff,
      sources: []
    },
    {
      label: 'MOD DES',
      value: (() => {
        const val = derived?.modDes ?? readValue(profile, ['mod_des', 'modDES']);
        if (!hasValue(val)) return '0';
        const num = Number(val);
        return !isNaN(num) && num > 0 ? `+${num}` : String(val);
      })(),
      icon: Diff,
      sources: []
    }
  ];

  const birthDate = readValue(profile, ['birth_date', 'basic_birth_date', 'fecha_nacimiento', 'date_of_birth', 'nacimiento', 'cumpleanos', 'cumpleaños']);
  const age = readValue(profile, ['basic_age', 'age', 'edad']);
  const bloodType = readValue(profile, ['basic_blood_type', 'bloodType', 'blood_type', 'sangre', 'grupo_sanguineo']);
  const faceclaim = readValue(profile, ['faceclaim', 'faceclaim_pb', 'pb']);
  const genderRaw = readValue(profile, ['gender', 'genero', 'género', 'sexo']);

  const genderIcon = useMemo(() => {
    const str = String(genderRaw ?? '').toLowerCase().trim();
    if (str.includes('fem') || str.includes('mujer') || str === 'f') return Venus;
    if (str.includes('masc') || str.includes('hombre') || str === 'm') return Mars;
    return NonBinary;
  }, [genderRaw]);

  const identityData = [
    { label: 'SANGRE', tag: 'RH', value: bloodType, icon: Droplet },
    { label: 'EDAD', tag: 'AÑOS', value: age, icon: PersonStanding },
    { label: 'NACIMIENTO', tag: 'DOB', value: birthDate, icon: Cake },
    { label: 'ALINEACIÓN', tag: 'ALGN', value: readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación']), icon: Scale },
    { label: 'GÉNERO', tag: 'GND', value: genderRaw, icon: genderIcon },
    { label: 'NACIONALIDAD', tag: 'NAT', value: readValue(profile, ['nationality', 'nacionalidad']), icon: Earth }
  ];

  // Skills
  const skillsList = useMemo(() => {
    const fromPossessions = possessionRows
      .filter((r: any) => r?.element?.kind === 'skill')
      .map((r: any) => ({
        id: r.element.id,
        name: r.element.name,
        level: r.possession?.quantity || r.element.metadata?.level || 1,
      }));
    if (fromPossessions.length > 0) return fromPossessions;
    if (Array.isArray(profile.skills)) return profile.skills;
    if (Array.isArray(profile.habilidades)) return profile.habilidades;
    return [];
  }, [possessionRows, profile]);

  // Inventory items
  const inventoryItems = useMemo(() => {
    const fromPossessions = possessionRows
      .filter((r: any) => ['equipment', 'weapon', 'consumable', 'ammunition', 'crafting_material', 'ingredient', 'vehicle', 'real_estate', 'item'].includes(r?.element?.kind || r?.kind))
      .map((r: any) => ({
        id: r.element?.id || r.elementId,
        name: r.element?.name || r.name,
        subtext: r.element?.description || (r.element?.kind === 'equipment' ? 'Equipamiento' : 'Objeto'),
        equipped: r.possession?.equipped ?? r.equipped ?? false,
      }));
    if (fromPossessions.length > 0) return fromPossessions;
    if (Array.isArray(profile.inventory)) return profile.inventory;
    if (Array.isArray(profile.inventario)) return profile.inventario;
    return [];
  }, [possessionRows, profile]);

  const inventorySlots = useMemo(() => {
    const totalSlots = Math.max(5, Math.ceil(inventoryItems.length / 5) * 5);
    return Array.from({ length: totalSlots }).map((_, i) => ({
      item: inventoryItems[i] || null
    }));
  }, [inventoryItems]);

  // Techniques
  const techniquesList = useMemo(() => {
    // 1. From character_techniques table
    const fromCharacterTechniques = Array.isArray(character?.techniques)
      ? character.techniques.map((t: any) => {
          let costStr = '';
          let costNum: number | undefined = undefined;
          try {
            const staminaCostsRule = Array.isArray(rules) ? rules.find((r: any) => r.key === 'stamina_execution_costs')?.value : undefined;
            costNum = calculateTechniqueStructuralCost(t, mechanicsList, staminaCostsRule);
            if (costNum > 0) costStr = `${costNum} CE`;
          } catch {
            costStr = '';
          }
          if (!costStr) {
            costStr = t.cost || (t.level ? `${t.level * 2} CE` : '2 CE');
          }

          const numVal = costNum ?? (parseInt(costStr) || 2);
          let autoDesc = '';
          if (Array.isArray(t.mechanicalBehaviors) && t.mechanicalBehaviors.length > 0) {
            autoDesc = t.mechanicalBehaviors.map((b: any) => {
              const res = describeMechanicalBehavior(b, { format: 'compact', context: { staminaCost: numVal } });
              return res.text;
            }).filter(Boolean).join(' ');
          }
          if (!autoDesc) {
            autoDesc = `Coste: ${costStr}`;
          } else if (!autoDesc.toLowerCase().includes('coste') && !autoDesc.toLowerCase().includes('ce') && !autoDesc.toLowerCase().includes('estamina')) {
            autoDesc = `${autoDesc} Coste: ${costStr}.`;
          }

          return {
            id: t.id,
            name: t.name,
            description: t.description,
            autoDescription: autoDesc,
            cost: costStr,
            type: t.sourceType === 'quirk' ? 'DON / QUIRK' : (t.sourceType?.toUpperCase() || 'QUIRK'),
            target: t.activationAttributeId ? `ATR: ${t.activationAttributeId}` : 'VS EVA',
            level: String(t.level || '1'),
            activationAttributeId: t.activationAttributeId,
            sourceType: t.sourceType,
            mechanicalBehaviors: t.mechanicalBehaviors || []
          };
        })
      : [];

    // 2. From entitlement possessions
    const fromPossessions = possessionRows
      .filter((r: any) => r?.element?.kind === 'technique_entitlement')
      .map((r: any) => {
        const costStr = r.element.metadata?.cost || r.element.metadata?.ce || '3 CE';
        let autoDesc = '';
        if (Array.isArray(r.element.mechanicalBehaviors) && r.element.mechanicalBehaviors.length > 0) {
          autoDesc = r.element.mechanicalBehaviors.map((b: any) => {
            const res = describeMechanicalBehavior(b, { format: 'compact', context: { staminaCost: parseInt(costStr) || 3 } });
            return res.text;
          }).filter(Boolean).join(' ');
        }
        if (!autoDesc) {
          autoDesc = `Coste: ${costStr}`;
        } else if (!autoDesc.toLowerCase().includes('coste') && !autoDesc.toLowerCase().includes('ce') && !autoDesc.toLowerCase().includes('estamina')) {
          autoDesc = `${autoDesc} Coste: ${costStr}.`;
        }

        return {
          id: r.element.id,
          name: r.element.name,
          description: r.element.description,
          autoDescription: autoDesc,
          cost: costStr,
          type: r.element.metadata?.type || 'OFENSIVA',
          target: r.element.metadata?.target || 'VS EVA',
          level: r.element.metadata?.level || '1',
          mechanicalBehaviors: r.element.mechanicalBehaviors || []
        };
      });

    // 3. From profile data
    const fromProfile = Array.isArray(profile.techniques)
      ? profile.techniques
      : Array.isArray(profile.tecnicas)
      ? profile.tecnicas
      : [];

    const combined = [...fromCharacterTechniques, ...fromPossessions];
    fromProfile.forEach((pTech: any) => {
      if (typeof pTech === 'string') {
        if (!combined.some(c => c.id === pTech || c.name === pTech)) {
          const el = getElement(pTech);
          combined.push({
            id: pTech,
            name: el.name || pTech,
            description: el.description || '',
            autoDescription: 'Coste: 3 CE',
            cost: '3 CE',
            type: 'OFENSIVA',
            target: 'VS EVA',
            level: '1',
            mechanicalBehaviors: (el as any).mechanicalBehaviors || []
          });
        }
      } else if (pTech && !combined.some(c => c.id === pTech.id || c.name === pTech.name)) {
        const pCost = pTech.cost || '3 CE';
        combined.push({
          id: pTech.id,
          name: pTech.name,
          description: pTech.description || pTech.desc || '',
          autoDescription: pTech.autoDescription || `Coste: ${pCost}`,
          cost: pCost,
          type: pTech.type || 'OFENSIVA',
          target: pTech.target || 'VS EVA',
          level: String(pTech.level || '1'),
          mechanicalBehaviors: pTech.mechanicalBehaviors || []
        });
      }
    });

    return combined;
  }, [character?.techniques, possessionRows, profile, rules, mechanicsList, elements]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-oxanium text-sm text-muted-foreground">Cargando expediente...</div>;
  if (error || !character) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center font-oxanium text-sm text-destructive">Ficha no encontrada o no disponible (Revisa la consola).</div>;

  return (
    <div className="public-view min-h-screen bg-background pb-12 font-oxanium text-text1 selection:bg-primary/20 selection:text-primary">
      {/* Top OS Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 px-3 py-2 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-xs font-black tracking-widest text-foreground">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">S</span>
              SHADOWMORE OS <span className="text-[10px] font-normal text-primary">4.1.2</span>
            </p>
            <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Expediente público de personaje
            </p>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            <Link to={`/supersheet/${encodeURIComponent(character?.name || id || '')}`} className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition-colors hover:bg-amber-500/20 hover:text-amber-300">
              ⚡ Vista Heroica
            </Link>
            <Link to="/character-editor" className="rounded border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Registros
            </Link>
            <Link to="/login" className="hidden rounded border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block">
              Acceso
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-6xl space-y-3 sm:space-y-3.5 px-3 sm:px-5">
        {/* Name Header */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-yanone text-3xl font-black uppercase leading-none tracking-wider text-text1 sm:text-4xl">
              {fullName}
            </h1>
            <span className="text-sm sm:text-base font-bold uppercase tracking-widest text-primary">
              • {alias}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {[
              ['Reputación', readValue(profile, ['reputation', 'reputacion', 'amenaza'])],
              ['Yenes', character.yen],
              ['EXP', character.exp]
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-18 rounded border border-bg4/50 bg-bg2/80 px-2.5 py-1.5 text-center">
                <strong className="block text-base leading-none text-text1">{displayValue(value, '0')}</strong>
                <span className="mt-0.5 flex items-center justify-center gap-1 text-[8px] uppercase tracking-widest text-text2">
                  {(label === 'Yenes' || label === 'Yens') && <Coins className="size-2.5 text-amber-400 shrink-0" />}
                  {label === 'EXP' && <Sparkles className="size-2.5 text-amber-400 shrink-0" />}
                  {String(label)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Identity Details Strip */}
        <EntityPanel
          compact
          title="SYS.INFO // DATOS BÁSICOS"
          badge={displayValue(group, 'Sin grupo')}
          icon={<Cpu className="size-3.5 text-primary" />}
          pattern="dots"
          accent="accent1"
          cornerTicks
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono">
            {identityData.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded border border-border/50 bg-bg1/85 px-2.5 py-2 text-center flex flex-col items-center justify-center transition-colors hover:border-primary/50 hover:bg-bg1/95 group min-w-0"
                >
                  {IconComponent && (
                    <IconComponent className="size-3.5 mb-1 text-accent2 group-hover:text-primary transition-colors" />
                  )}
                  <div className="flex items-center justify-center gap-1 text-[8.5px] uppercase tracking-wider text-text2/70 font-mono">
                    <span>{item.label}</span>
                    <span className="text-primary/70 font-bold">//</span>
                    <span className="text-text2/50 text-[7.5px]">{item.tag}</span>
                  </div>
                  <strong
                    className="block font-mono text-xs sm:text-[13px] font-bold text-text1 truncate mt-0.5 tracking-tight w-full"
                    title={String(item.value ?? '')}
                  >
                    {displayValue(item.value)}
                  </strong>
                </div>
              );
            })}
          </div>
        </EntityPanel>

        {/* Hero Row: Left (Avatar + Base Stats + CyberFillerPanel) (col-7), Right (Atributos Derivados) (col-5) */}
        <section className="grid grid-cols-1 gap-3 sm:gap-3.5 lg:grid-cols-12">
          {/* Left Block: Avatar & Atributos Base with Cyber Filler Panel underneath */}
          <div className="flex flex-col gap-3 lg:col-span-7 justify-between">
            <div className="grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-7">
              {/* Column 1: Avatar + Status + Faceclaim (3 of 7) */}
              <div className="flex flex-col gap-2.5 sm:col-span-3">
                <div className="relative overflow-hidden rounded border border-bg4/60 bg-bg2 flex items-center justify-center">
                  {avatar ? (
                    <img
                      src={String(avatar)}
                      alt={fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[580px] object-contain block"
                    />
                  ) : (
                    <div className="flex min-h-[260px] size-full flex-col items-center justify-center gap-2 text-text2/40 py-12">
                      <User className="size-12" />
                      <span className="text-[10px] uppercase tracking-widest">Sin imagen</span>
                    </div>
                  )}
                  <Badge variant="outline" className="absolute bottom-2 left-2 bg-background/85 font-oxanium text-[9px] uppercase tracking-wider backdrop-blur border-border/60">
                    {status}
                  </Badge>
                </div>

                {/* Faceclaim under avatar */}
                <div className="rounded border border-border/50 bg-bg1/85 px-2.5 py-1.5 text-center font-mono transition-colors hover:border-primary/50">
                  <div className="flex items-center justify-center gap-1 text-[8.5px] uppercase tracking-wider text-text2/70 font-mono">
                    <span>FACECLAIM</span>
                    <span className="text-primary/70 font-bold">//</span>
                    <span className="text-text2/50 text-[7.5px]">PB</span>
                  </div>
                  <strong
                    className="block font-mono text-xs sm:text-[13px] font-bold text-text1 truncate mt-0.5 tracking-tight"
                    title={displayValue(faceclaim, 'Sin asignar')}
                  >
                    {displayValue(faceclaim, 'Sin asignar')}
                  </strong>
                </div>
              </div>

              {/* Column 2: Estatus & Atributos Base (4 of 7) */}
              <div className="flex flex-col gap-3 sm:col-span-4">
                {/* Estatus */}
                <div className="rounded border border-bg4/50 bg-bg2/80 p-3 pb-5">
                  <h2 className="flex items-center justify-center mt-3 mb-4 gap-2 font-oxanium text-xs font-bold uppercase tracking-widest text-text1">
                    <CircleUserRound className="size-3.5 text-accent2" /> Estatus
                  </h2>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center rounded border border-accent1/40 bg-gradient-to-r from-bg1 via-accent1/10 to-bg1 px-3 py-2 sm:px-3.5 sm:py-2.5">
                      <div className="text-text2/50 shrink-0 flex items-center justify-center w-6">
                        <BatteryPlus className="size-5.5 sm:size-6" strokeWidth={1.5} />
                      </div>
                      <div className="text-center min-w-0">
                        <span className="block font-oxanium text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-primary">Salud</span>
                        <div className="mt-0.5 flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                          <strong className="font-oxanium text-lg sm:text-xl font-bold leading-tight text-text1">{currentHealth}</strong>
                          <span className="font-oxanium text-xs font-bold text-text2/60">/ {maxHealth}</span>
                        </div>
                      </div>
                      <div className="w-6 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center rounded border border-accent1/40 bg-gradient-to-r from-bg1 via-accent1/10 to-bg1 px-3 py-2 sm:px-3.5 sm:py-2.5">
                      <div className="text-text2/50 shrink-0 flex items-center justify-center w-6">
                        <BatteryCharging className="size-5.5 sm:size-6" strokeWidth={1.5} />
                      </div>
                      <div className="text-center min-w-0">
                        <span className="block font-oxanium text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-primary">Estamina</span>
                        <div className="mt-0.5 flex items-baseline justify-center gap-1.5 whitespace-nowrap">
                          <strong className="font-oxanium text-lg sm:text-xl font-bold leading-tight text-text1">{currentStamina}</strong>
                          <span className="font-oxanium text-xs font-bold text-text2/60">/ {maxStamina}</span>
                        </div>
                      </div>
                      <div className="w-6 shrink-0" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                {/* Atributos Base */}
                <div className="rounded border border-bg4/50 bg-bg2/80 p-3 flex flex-col flex-1">
                  <h2 className="flex items-center justify-center mt-3 mb-4 gap-2 font-oxanium text-xs font-bold uppercase tracking-widest text-text1">
                    <HeartPulse className="size-3.5 text-accent2" /> Atributos Base
                  </h2>
                  <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                    {baseAttributes.map(({ label, base, purchasedBonus, traitBonus, equipmentBonus, hasBonus, value, sources, icon: Icon }) => (
                      <div key={label} className="flex items-center justify-between rounded border border-bg4/50 bg-bg1/90 px-3 py-2 text-right">
                        <div className="text-text2/50 shrink-0 flex items-center justify-center">
                          <Icon className="size-5" strokeWidth={1.5} />
                        </div>
                        <div className="text-right min-w-0">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <span className="block font-oxanium text-[9.5px] font-bold uppercase tracking-wider text-primary">{label}</span>
                            <ModifierBadgeGroup sources={sources} />
                          </div>
                          <div className="mt-0.5 flex items-baseline justify-end gap-1.5">
                            <strong className="block font-oxanium text-base sm:text-lg font-bold leading-tight text-text1">
                              {displayValue(value, '—')}
                            </strong>
                            {hasBonus && hasValue(value) && (
                              <span className="text-[10px] text-text2/60 font-oxanium" title={`Base: ${base}${purchasedBonus ? `, Mejora: +${purchasedBonus}` : ''}${traitBonus ? `, Rasgo: ${traitBonus > 0 ? `+${traitBonus}` : traitBonus}` : ''}${equipmentBonus ? `, Equipamiento: ${equipmentBonus > 0 ? `+${equipmentBonus}` : equipmentBonus}` : ''}`}>
                                (Base: {base})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cyber Filler Panel spanning both columns (Avatar & Atributos Base) */}
            <CyberFillerPanel
              variant="default"
              pattern="dots"
              className="flex-1 min-h-[60px] py-2.5 px-4 rounded border-bg4/50 bg-bg2/80"
              icon={Cpu}
              title="SYS.DIAGNOSTIC // PROTOCOLO ACTIVO"
              subtitle={`ID: CHAR_${character.id}`}
            />
          </div>

          {/* Column 3: Defensas & Atributos Derivados */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {/* Defensas */}
            <div className="rounded border border-bg4/50 bg-bg2/80 p-3 pb-5">
              <h2 className="flex items-center justify-center mt-3 mb-4 gap-2 font-oxanium text-xs font-bold uppercase tracking-widest text-text1">
                <Shield className="size-3.5 text-accent2" /> Defensas
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {defenseList.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="grid grid-cols-[auto_1fr_auto] items-center rounded border border-accent1/40 bg-gradient-to-r from-bg1 via-accent1/10 to-bg1 px-3 py-2 sm:px-3.5 sm:py-2.5 transition-colors"
                    >
                      <div className="text-text2/50 shrink-0 flex items-center justify-center w-6">
                        <Icon className="size-5.5 sm:size-6" strokeWidth={1.5} />
                      </div>
                      <div className="text-center min-w-0">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="block font-oxanium text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-primary">
                            {item.label}
                          </span>
                          <ModifierBadgeGroup sources={item.sources} />
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-center">
                          <strong className="block font-oxanium text-lg sm:text-xl font-bold leading-tight text-text1">
                            {displayValue(item.value, '0')}
                          </strong>
                        </div>
                      </div>
                      <div className="w-6 shrink-0" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Atributos Derivados */}
            <div className="rounded border border-bg4/50 bg-bg2/80 p-3 flex flex-col flex-1">
              <h2 className="mt-3 mb-4 flex items-center justify-center gap-2 font-oxanium text-xs font-bold uppercase tracking-widest text-text1">
                <HeartPulse className="size-3.5 text-primary" /> Atributos Derivados
              </h2>
              <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                {derivedGrid.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded border border-bg4/50 bg-bg1/90 px-3 py-2 text-right transition-colors"
                    >
                      <div className="text-text2/50 shrink-0 flex items-center justify-center">
                        <Icon className="size-5" strokeWidth={1.5} />
                      </div>
                      <div className="text-right min-w-0">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <span className="block font-oxanium text-[9.5px] font-bold uppercase tracking-wider text-primary">
                            {item.label}
                          </span>
                          <ModifierBadgeGroup sources={item.sources} />
                        </div>
                        <div className="mt-0.5 flex items-baseline justify-end">
                          <strong className="block font-oxanium text-base sm:text-lg font-bold leading-tight text-text1">
                            {displayValue(item.value, '0')}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="col-span-2 rounded border border-accent2/40 bg-gradient-to-r from-bg1 via-accent2/10 to-bg1 p-2.5 sm:p-3 text-center mt-2">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <Sparkles className="size-3.5 text-accent2" />
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-accent2">Plus Ultra</span>
                    <Sparkles className="size-3.5 text-accent2" />
                  </div>
                  <strong className="block text-2xl font-mono font-bold leading-none text-accent2 tracking-wider">
                    {Number(readValue(profile, ['plus_ultra', 'plusUltra']) ?? 0)}
                  </strong>
                  <span className="block text-[8px] uppercase tracking-wider text-muted-foreground mt-1">
                    Recurso Extraordinario
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modifier Notes Legend */}
        <ModifierNotesLegend className="px-1" />

        {/* Quirk & Ocupación Row */}
        <section className="grid grid-cols-1 gap-3 sm:gap-3.5 lg:grid-cols-12">
          {/* Quirk Panel */}
          <div className="lg:col-span-7">
            <EntityPanel compact pattern="radial" accent="accent1" cornerTicks glow className="h-full p-3.5 sm:p-4">
              <div className="flex h-full flex-col">
                <div className="mb-3 flex items-start justify-between gap-3 border-b border-border/50 pb-2.5">
                  <div className="rounded border border-border bg-bg3 p-2 shrink-0">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div className="text-right min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black tracking-wider text-text1 uppercase leading-tight">{quirkName}</h2>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-accent1">{quirkEvolution}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <span className="text-[8px] uppercase text-text2">Tipo:</span> {quirkType}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text2">{quirkDescription}</p>
                
                {/* Quirk Levels Accordion */}
                <Accordion type="single" collapsible defaultValue="level-1" className="mt-3 space-y-1.5">
                  <AccordionItem value="level-1" className="border border-border/40 bg-bg1/70 rounded overflow-hidden">
                    <AccordionTrigger className="py-2 px-3 font-oxanium text-xs font-bold uppercase tracking-wider text-primary hover:no-underline hover:bg-bg3/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-primary">✦</span>
                        <span>Nivel 1</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-text2 leading-relaxed px-3 pb-3 pt-1 border-t border-border/20 bg-bg2/40 text-left">
                      {quirkLevelOne}
                    </AccordionContent>
                  </AccordionItem>
                  {quirkLevelTwo && (
                    <AccordionItem value="level-2" className="border border-border/40 bg-bg1/70 rounded overflow-hidden">
                      <AccordionTrigger className="py-2 px-3 font-oxanium text-xs font-bold uppercase tracking-wider text-primary hover:no-underline hover:bg-bg3/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-primary">✦</span>
                          <span>Nivel 2</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-text2 leading-relaxed px-3 pb-3 pt-1 border-t border-border/20 bg-bg2/40 text-left">
                        {quirkLevelTwo}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {quirkLevelThree && (
                    <AccordionItem value="level-3" className="border border-border/40 bg-bg1/70 rounded overflow-hidden">
                      <AccordionTrigger className="py-2 px-3 font-oxanium text-xs font-bold uppercase tracking-wider text-primary hover:no-underline hover:bg-bg3/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-primary">✦</span>
                          <span>Nivel 3</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-text2 leading-relaxed px-3 pb-3 pt-1 border-t border-border/20 bg-bg2/40 text-left">
                        {quirkLevelThree}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            </EntityPanel>
          </div>

          {/* Ocupación & Formación y Certificaciones */}
          <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-3.5">
            <EntityPanel compact title="Ocupación & Formación" icon={<Briefcase className="size-3.5 text-accent2" />} cornerTicks>
              {hasEmploymentData ? (
                <div className="space-y-2">
                  {employmentsList.map((emp: any, idx: number) => (
                    <div key={emp.employment?.id || idx} className="rounded border border-border/40 bg-bg3/40 p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-accent2 flex items-center gap-1">
                            <Briefcase className="size-2.5 text-accent2 shrink-0" />
                            Puesto / Empleo {employmentsList.length > 1 ? `#${idx + 1}` : ''}
                          </span>
                          <h4 className="text-xs font-bold text-text1 uppercase tracking-wide">
                            {emp.position?.name || 'Puesto activo'}
                          </h4>
                        </div>
                        {emp.position?.levelId && (
                          <Badge variant="outline" className="text-[8px] uppercase border-border/60 bg-bg1 font-oxanium py-0 px-1">
                            Nivel {emp.position.levelId}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text2 border-t border-border/30 pt-1">
                        <span><strong className="text-foreground/80">Institución:</strong> {emp.institution?.name || '—'}</span>
                        {emp.department?.name && <span>• <strong className="text-foreground/80">Depto:</strong> {emp.department.name}</span>}
                      </div>
                    </div>
                  ))}

                  {enrollment && (
                    <div className="rounded border border-primary/30 bg-primary/5 p-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-2">
                            <GraduationCap className="size-4 text-primary shrink-0" />
                            Escuela
                          </span>
                          <h4 className="text-xs font-bold text-text1 uppercase tracking-wide">
                            {enrollment.academicYear?.name || 'Estudiante'}
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[8px] uppercase border-primary/40 text-primary bg-primary/10 font-oxanium py-0 px-1">
                          {enrollment.classGroup?.name || 'Matriculado'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-text2 border-t border-primary/20 pt-1">
                        <strong className="text-foreground/80">Clase:</strong> {enrollment.classGroup?.name}
                      </div>
                    </div>
                  )}

                  {employmentsList.length === 0 && !enrollment && (
                    <div className="rounded border border-border/40 bg-bg3/30 p-2.5 divide-y divide-border/30 text-xs">
                      {hasValue(manualOccupation) && (
                        <div className="flex items-center justify-between pb-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-text2 flex items-center gap-1">
                            <Briefcase className="size-2.5 text-accent2 shrink-0" /> Ocupación
                          </span>
                          <strong className="text-text1 font-bold">{displayValue(manualOccupation)}</strong>
                        </div>
                      )}
                      {hasValue(manualRank) && (
                        <div className="flex items-center justify-between py-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-text2">Rango / Rol</span>
                          <strong className="text-text1 font-bold">{displayValue(manualRank)}</strong>
                        </div>
                      )}
                      {hasValue(manualSchoolYear) && (
                        <div className="flex items-center justify-between pt-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-text2 flex items-center gap-1">
                            <GraduationCap className="size-2.5 text-primary shrink-0" /> Educación
                          </span>
                          <strong className="text-text1 font-bold">{displayValue(manualSchoolYear)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {(employmentsList.length > 0 || enrollment) && hasValue(manualRank) && (
                    <div className="rounded border border-border/40 bg-bg3/20 p-2 flex items-center justify-between text-xs">
                      <span className="text-[9px] uppercase tracking-widest text-text2">Rango / Rol registrado</span>
                      <strong className="text-text1">{displayValue(manualRank)}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                  Sin ocupación ni matrícula académica registrada
                </div>
              )}
            </EntityPanel>

            {/* Certificaciones */}
            <EntityPanel compact title="Certificaciones" icon={<Award className="size-3.5 text-accent2" />} cornerTicks>
              {credentials.length > 0 ? (
                <div className="space-y-2">
                  {credentials.map((row: any) => {
                    const kindLabels: Record<string, { label: string; color: string; border: string; bg: string }> = {
                      license: { label: 'Licencia', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
                      permission: { label: 'Permiso', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
                      certification: { label: 'Certificación', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
                      character_resource: { label: 'Recurso', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
                      background: { label: 'Trasfondo', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
                      clandestine_asset: { label: 'Activo Clandestino', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
                    };
                    const meta = kindLabels[row.element.kind] ?? { label: row.element.kind, color: 'text-text1', border: 'border-border/40', bg: 'bg-bg3/30' };
                    return (
                      <div key={row.possession.id} className="rounded border border-bg4/40 bg-bg1/80 p-2 text-xs">
                        <div className="flex items-start gap-2">
                          <Scroll className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-text1 truncate text-xs">{row.element.name}</span>
                              <span className={`rounded border px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider ${meta.bg} ${meta.border} ${meta.color} shrink-0`}>
                                {meta.label}
                              </span>
                            </div>
                            {row.element.description && (
                              <p className="mt-0.5 text-[11px] leading-relaxed text-text2 line-clamp-2">
                                {row.element.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                  Sin certificaciones registradas
                </div>
              )}
            </EntityPanel>

            {/* Cyber Filler Panel under Certificaciones */}
            <CyberFillerPanel
              variant="default"
              pattern="grid"
              className="py-3 px-3.5 rounded border-bg4/50 bg-bg2/80"
              icon={Cpu}
              title="SYS.ARCHIVE // BIO-TELEMETRÍA"
              subtitle={`REGISTRO CLASIFICADO • SERIAL: 0x${String(character.id).padStart(6, '0')}`}
            >
              <div className="w-full pt-2.5 mt-1 border-t border-border/30 space-y-2">
                <div className="flex items-center justify-between text-[9px] font-mono text-text2/60 px-1 pt-0.5">
                  <span className="tracking-widest">SEC.NODE // 77-B</span>
                  <span className="tracking-wider">SYNC // {((Number(character.id) * 17 + 83) % 15 + 85).toFixed(1)}%</span>
                  <span className="tracking-widest flex items-center gap-1">
                    <Sparkles className="size-2.5 text-amber-400 shrink-0" />
                    EXP: {character.exp ?? 0}
                  </span>
                </div>
              </div>
            </CyberFillerPanel>
          </div>
        </section>

        {/* 3-Column Section: Habilidades | Rasgos | Debilidades */}
        <section className="grid grid-cols-1 gap-3 sm:gap-3.5 md:grid-cols-3">
          {/* 1. HABILIDADES */}
          <EntityPanel compact title="Habilidades" icon={<UserStar className="size-3.5 text-primary" />} cornerTicks className="flex-1">
            {skillsList.length > 0 ? (
              <div className="space-y-1.5">
                {skillsList.map((skill: any, idx: number) => {
                  const skillName = typeof skill === 'string' ? skill : skill.name || `Habilidad ${idx + 1}`;
                  const skillLevel = typeof skill === 'object' && Number.isInteger(skill.level) ? skill.level : 1;
                  return (
                    <div key={skill.id || idx} className="flex items-center justify-between gap-2 rounded border border-bg4/40 bg-bg1/80 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-primary text-[10px]">✦</span>
                        <span className="font-bold text-text1 uppercase tracking-wide truncate text-[11px]">{skillName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "size-2 rounded-xs transition-colors",
                              i < skillLevel
                                ? "bg-primary shadow-[0_0_5px_rgba(48,149,111,0.5)]"
                                : "bg-bg4/80 border border-border/30"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                Sin habilidades registradas
              </div>
            )}
          </EntityPanel>

          {/* 2. RASGOS */}
          <EntityPanel compact title="Rasgos" icon={<BrainCircuit className="size-3.5 text-accent2" />} cornerTicks className="flex-1">
            {traits.length > 0 ? (
              <div className="space-y-1.5">
                {traits.map(id => {
                  const trait = getElement(id);
                  return (
                    <div key={typeof id === 'string' ? id : trait.name} className="rounded border border-bg4/40 bg-bg1/80 p-2 text-xs">
                      <div className="leading-snug">
                        <span className="text-primary font-bold mr-1 text-[11px]">✦</span>
                        <strong className="text-primary font-bold text-[11px]">{trait.name}</strong>
                        {trait.description && (
                          <span className="text-text2 ml-1 text-[11px]">: {trait.description}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                Sin rasgos registrados
              </div>
            )}
          </EntityPanel>

          {/* 3. DEBILIDADES */}
          <EntityPanel compact title="Debilidades" icon={<HeartCrack className="size-3.5 text-rose-400" />} cornerTicks className="flex-1">
            {weaknesses.length > 0 ? (
              <div className="space-y-1.5">
                {weaknesses.map(id => {
                  const weakness = getElement(id);
                  return (
                    <div key={typeof id === 'string' ? id : weakness.name} className="rounded border border-bg4/40 bg-bg1/80 p-2 text-xs">
                      <div className="leading-snug">
                        <span className="text-rose-400 font-bold mr-1 text-[11px]">✦</span>
                        <strong className="text-rose-400 font-bold text-[11px]">{weakness.name}</strong>
                        {weakness.description && (
                          <span className="text-text2 ml-1 text-[11px]">: {weakness.description}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                Sin debilidades registradas
              </div>
            )}
          </EntityPanel>
        </section>

        {/* 2-Column Lower Section: Técnicas & Inventario (Image 1 style) */}
        <section className="grid grid-cols-1 gap-3 sm:gap-3.5 md:grid-cols-2">
          {/* Técnicas */}
          <EntityPanel
            compact
            title="Técnicas"
            icon={<Crosshair className="size-3.5 text-primary" />}
            badge={String(techniquesList.length)}
            cornerTicks
            className="flex-1"
          >
            {techniquesList.length > 0 ? (
              <div className="space-y-2">
                {techniquesList.map((tech: any, idx: number) => (
                  <div key={tech.id || idx} className="rounded border border-bg4/50 bg-bg1/90 p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-primary text-xs">✦</span>
                        <h4 className="text-xs font-bold font-oxanium text-text1 uppercase tracking-wide truncate">
                          {tech.name}
                        </h4>
                      </div>
                      {tech.level && (
                        <Badge variant="outline" className="text-[8px] uppercase border-border/60 bg-bg2 font-oxanium text-text2 py-0 px-1 shrink-0">
                          Nivel {tech.level}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                      {tech.cost && (
                        <span className="rounded bg-bg3 border border-border/40 px-1.5 py-0.2 font-mono font-bold text-text1">
                          {tech.cost}
                        </span>
                      )}
                      {tech.type && (
                        <span className="rounded bg-primary/10 border border-primary/30 px-1.5 py-0.2 font-bold uppercase tracking-wider text-primary">
                          {tech.type}
                        </span>
                      )}
                      {tech.target && (
                        <span className="rounded bg-accent2/10 border border-accent2/30 px-1.5 py-0.2 font-bold uppercase tracking-wider text-accent2">
                          {tech.target}
                        </span>
                      )}
                    </div>
                    {tech.description && (
                      <p className="text-[11px] leading-relaxed text-text2 border-t border-border/20 pt-1">
                        {tech.description}
                      </p>
                    )}
                    <div className="mt-1.5 rounded bg-bg2/80 p-2.5 border border-border/30 text-[10px] text-text1/90 space-y-1">
                      <div className="flex items-center gap-1 text-primary text-[9px] font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Descripción Mecánica:</span>
                      </div>
                      <p className="leading-normal font-mono text-text1">
                        {tech.autoDescription || generateAutoDescription(tech)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-bg4/30 bg-bg1/40 p-3 text-center text-xs text-text2/60">
                Sin técnicas registradas
              </div>
            )}
          </EntityPanel>

          {/* Inventario */}
          <EntityPanel compact title="Inventario" icon={<PackageOpen className="size-3.5 text-primary" />} cornerTicks className="flex-1">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {inventorySlots.map((slot, index) => (
                <div
                  key={index}
                  className={cn(
                    "aspect-square rounded border flex flex-col items-center justify-center p-1.5 text-center transition-colors",
                    slot.item
                      ? "border-bg4/80 bg-bg1/90 hover:border-primary/50"
                      : "border-bg4/30 bg-bg1/30"
                  )}
                >
                  {slot.item ? (
                    <>
                      <div className="text-primary mb-0.5 flex items-center justify-center gap-1">
                        <Package className="size-4 sm:size-5" />
                        {slot.item.equipped && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[7px] px-1 py-0 h-3.5 font-bold uppercase tracking-wider font-mono">
                            EQUIPADO
                          </Badge>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-text1 truncate max-w-full leading-tight">
                        {slot.item.name}
                      </span>
                      {slot.item.subtext && (
                        <span className="block text-[8px] text-text2/60 truncate max-w-full mt-0.5">
                          {slot.item.subtext}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[9px] font-bold text-text2/35 uppercase tracking-wider">
                      Vacío
                    </span>
                  )}
                </div>
              ))}
            </div>
          </EntityPanel>
        </section>

        <p className="pt-2 text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Ficha pública de sólo lectura · Shadowmore OS
        </p>
      </main>
    </div>
  );
}

