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
  Eye,
  Feather,
  Flame,
  GraduationCap,
  HandFist,
  Heart,
  HeartCrack,
  HeartPlus,
  HeartPulse,
  Info,
  Layers,
  Mars,
  NonBinary,
  Package,
  PackageOpen,
  PersonStanding,
  Scale,
  Scroll,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  ShieldUser,
  Shuffle,
  Sparkles,
  SportShoe,
  Star,
  Swords,
  Target,
  Trophy,
  User,
  UserCheck,
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
import { calculateDerivedStats, calculateTraitAttributeBonus, calculatePurchasedAttributeBonuses, calculateEquipmentBonuses } from '@/lib/characterValidation';
import { ModifierBadgeGroup, ModifierNotesLegend, ModifierSource } from '@/components/character/ModifierBadge';
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

// Convert attribute value to Hero Grade letter (like MHA Ultra Archive)
const getHeroGrade = (val: number): { grade: string; color: string; bg: string } => {
  if (val >= 6) return { grade: 'S', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-400/60' };
  if (val === 5) return { grade: 'A', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-400/60' };
  if (val === 4) return { grade: 'B', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-400/60' };
  if (val === 3) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-400/60' };
  if (val === 2) return { grade: 'D', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-400/60' };
  return { grade: 'E', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-400/60' };
};

// Radar Hexagon Component
interface HexStat {
  key: string;
  label: string;
  value: number;
  base: number;
  bonus: number;
  hasBonus: boolean;
  icon: any;
  angle: number; // in degrees
  sources?: ModifierSource[];
}

function HexagonRadarChart({ stats }: { stats: HexStat[] }) {
  const size = 360;
  const center = size / 2;
  const radius = 115;
  const levels = 5;

  // Max value scale (at least 5, or highest stat)
  const maxVal = Math.max(5, ...stats.map(s => s.value || 0));

  // Compute vertices for a regular hexagon at radius r
  const getHexPolygon = (r: number) => {
    return stats.map((_, i) => {
      const angleDeg = -90 + i * 60;
      const angleRad = (angleDeg * Math.PI) / 180;
      const x = center + r * Math.cos(angleRad);
      const y = center + r * Math.sin(angleRad);
      return `${x},${y}`;
    }).join(' ');
  };

  // Compute data polygon vertices
  const dataPoints = stats.map((stat, i) => {
    const angleDeg = -90 + i * 60;
    const angleRad = (angleDeg * Math.PI) / 180;
    const clampedVal = Math.max(0.5, stat.value || 0);
    const r = (clampedVal / maxVal) * radius;
    const x = center + r * Math.cos(angleRad);
    const y = center + r * Math.sin(angleRad);
    return { x, y, stat, angleDeg };
  });

  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* Techno Grid Corner Marks */}
      <div className="absolute top-1 left-1 text-[9px] font-mono text-cyan-500/40 select-none">┌ HUD.RADAR // SYS</div>
      <div className="absolute top-1 right-1 text-[9px] font-mono text-amber-500/40 select-none">SCAN.ACTIVE ┐</div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[340px] h-auto overflow-visible drop-shadow-[0_0_15px_rgba(225,29,72,0.15)]"
      >
        <defs>
          <radialGradient id="heroRadarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.65" />
            <stop offset="45%" stopColor="#e11d48" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.30" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular Telemetry Rings (Cyber HUD) */}
        <circle
          cx={center}
          cy={center}
          r={radius + 18}
          fill="none"
          stroke="rgba(6, 182, 212, 0.2)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <circle
          cx={center}
          cy={center}
          r={radius + 28}
          fill="none"
          stroke="rgba(245, 158, 11, 0.15)"
          strokeWidth="0.8"
          strokeDasharray="2 12"
        />

        {/* Center Cyber Crosshairs */}
        <circle cx={center} cy={center} r={3} fill="#06b6d4" />
        <line x1={center - 10} y1={center} x2={center + 10} y2={center} stroke="rgba(6, 182, 212, 0.6)" strokeWidth="1" />
        <line x1={center} y1={center - 10} x2={center} y2={center + 10} stroke="rgba(6, 182, 212, 0.6)" strokeWidth="1" />

        {/* Outer and Inner Hexagonal Grid Lines */}
        {Array.from({ length: levels }).map((_, i) => {
          const levelRadius = ((i + 1) / levels) * radius;
          const isOuter = i === levels - 1;
          return (
            <polygon
              key={`level-${i}`}
              points={getHexPolygon(levelRadius)}
              fill={i % 2 === 0 ? 'rgba(6, 182, 212, 0.02)' : 'rgba(0, 0, 0, 0.35)'}
              stroke={isOuter ? '#06b6d4' : 'rgba(255, 255, 255, 0.12)'}
              strokeWidth={isOuter ? 1.5 : 1}
              strokeDasharray={isOuter ? 'none' : '2 3'}
            />
          );
        })}

        {/* Spoke Axis Lines from Center */}
        {stats.map((_, i) => {
          const angleDeg = -90 + i * 60;
          const angleRad = (angleDeg * Math.PI) / 180;
          const x2 = center + radius * Math.cos(angleRad);
          const y2 = center + radius * Math.sin(angleRad);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(6, 182, 212, 0.3)"
              strokeWidth={1.2}
            />
          );
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={dataPolygon}
          fill="url(#heroRadarGradient)"
          stroke="#06b6d4"
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter="url(#radarGlow)"
        />

        {/* Vertex Data Points */}
        {dataPoints.map((pt, i) => (
          <g key={`point-${i}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={5}
              fill="#06b6d4"
              stroke="#0a0a0a"
              strokeWidth={2}
            />
            <circle
              cx={pt.x}
              cy={pt.y}
              r={8}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={1.5}
              opacity={0.9}
            />
          </g>
        ))}

        {/* Vertex Stat Labels positioned around the hexagon */}
        {stats.map((stat, i) => {
          const angleDeg = -90 + i * 60;
          const angleRad = (angleDeg * Math.PI) / 180;
          const labelDist = radius + 32;
          const lx = center + labelDist * Math.cos(angleRad);
          const ly = center + labelDist * Math.sin(angleRad);
          const grade = getHeroGrade(stat.value);

          return (
            <g key={`label-${i}`} transform={`translate(${lx}, ${ly})`}>
              {/* Outer cyber pill/box for stat name */}
              <rect
                x="-36"
                y="-18"
                width="72"
                height="36"
                rx="4"
                fill="#0d0d12"
                stroke={stat.hasBonus ? '#06b6d4' : '#3f3f46'}
                strokeWidth={1.5}
              />
              <text
                x="0"
                y="-3"
                textAnchor="middle"
                className="font-oxanium text-[11px] font-bold fill-white tracking-wider"
              >
                {stat.key}
              </text>
              <text
                x="0"
                y="11"
                textAnchor="middle"
                className={cn(
                  "font-oxanium text-[12px] font-black",
                  stat.hasBonus ? "fill-cyan-400" : "fill-amber-400"
                )}
              >
                {stat.value}
                <tspan className="text-[9px] font-normal fill-slate-400 ml-0.5">
                  ({grade.grade})
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hero Attribute Summary Cards Below Radar with Techno styling */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full mt-4">
        {stats.map((stat, idx) => {
          const grade = getHeroGrade(stat.value);
          const Icon = stat.icon;
          const codes = ['PWR.01', 'DEX.02', 'RES.03', 'VOL.04', 'INT.05', 'SPD.06'];
          return (
            <div
              key={stat.key}
              className={cn(
                "flex flex-col items-center p-2 rounded border text-center transition-all relative overflow-hidden",
                stat.hasBonus
                  ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  : "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[9px] font-mono text-zinc-400">{codes[idx]}</span>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded border font-mono", grade.bg, grade.color)}>
                  {grade.grade}
                </span>
              </div>
              <div className="flex items-center gap-1 my-1">
                <Icon className={cn("size-3.5", stat.hasBonus ? "text-cyan-400" : "text-amber-400")} />
                <span className="text-base font-black font-oxanium text-white">{stat.value}</span>
              </div>
              <span className="text-[10px] text-zinc-400 truncate w-full font-oxanium font-bold uppercase">{stat.label}</span>
              {stat.sources && stat.sources.length > 0 ? (
                <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                  <ModifierBadgeGroup sources={stat.sources} />
                </div>
              ) : stat.hasBonus ? (
                <span className="text-[9px] text-cyan-400/90 font-mono mt-0.5">
                  ({stat.base}+{stat.bonus})
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperSheet() {
  const { identifier, id: rawId } = useParams();
  const searchId = identifier || rawId;
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
          fetch(`/api/public/character/${encodeURIComponent(searchId || '')}`, { signal: controller.signal }),
          fetch('/api/elements', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] })),
          fetch('/api/rules', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] }))
        ]);
        if (!response.ok) throw new Error('Character not found');
        setCharacter(await response.json());
        if ((elemResponse as any).ok) setElements(await (elemResponse as any).json());
        if ((rulesResponse as any).ok) setRules(await (rulesResponse as any).json());
      } catch (requestError: any) {
        if (requestError.name !== 'AbortError') {
          console.error("SuperSheet fetch error:", requestError);
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

  const storedProfile = character?.profileData || {};
  const possessionRows = Array.isArray(character?.possessions) ? character.possessions : [];
  const relationalTraits = possessionRows.filter((row: any) => row?.element?.kind === 'trait').map((row: any) => row.element.id);
  const relationalWeaknesses = possessionRows.filter((row: any) => row?.element?.kind === 'weakness').map((row: any) => row.element.id);
  const credentials = possessionRows.filter((row: any) => ['license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset'].includes(row?.element?.kind));

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
  
  // Quirk Info
  const quirkName = character ? displayValue(readValue(profile, ['quirk_name', 'quirkName', 'don_name', 'don']), 'Sin don registrado') : '';
  const quirkType = character ? displayValue(readValue(profile, ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don']), 'Emisión') : '';
  const quirkEvolution = character ? displayValue(readValue(profile, ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk', 'nivel_quirk']), 'Nivel 1. Despertar') : '';
  const quirkDescription = character ? displayValue(readValue(profile, ['quirk_description', 'quirkDesc', 'quirk_desc', 'don_descripcion']), 'No se ha registrado información sobre este don.') : '';
  const quirkLevelOne = character ? displayValue(readValue(profile, ['quirk_lvl1', 'quirkLvl1', 'quirk_level_1', 'quirk_nivel_1']), 'Sin descripción de nivel.') : '';
  const quirkLevelTwo = character ? readValue(profile, ['quirk_lvl2', 'quirkLvl2', 'quirk_level_2', 'quirk_nivel_2']) : null;
  const quirkLevelThree = character ? readValue(profile, ['quirk_lvl3', 'quirkLvl3', 'quirk_level_3', 'quirk_nivel_3']) : null;

  // Base attributes in hexagonal radar order (top, top-right, bottom-right, bottom, bottom-left, top-left)
  const baseAttributes: HexStat[] = [
    { label: 'Fuerza', key: 'FUE', icon: HandFist, angle: -90, value: 0, base: 0, bonus: 0, hasBonus: false },
    { label: 'Destreza', key: 'DES', icon: Zap, angle: -30, value: 0, base: 0, bonus: 0, hasBonus: false },
    { label: 'Resistencia', key: 'RES', icon: HeartPulse, angle: 30, value: 0, base: 0, bonus: 0, hasBonus: false },
    { label: 'Voluntad', key: 'VOL', icon: Flame, angle: 90, value: 0, base: 0, bonus: 0, hasBonus: false },
    { label: 'Inteligencia', key: 'INT', icon: Brain, angle: 150, value: 0, base: 0, bonus: 0, hasBonus: false },
    { label: 'Velocidad', key: 'VEL', icon: Wind, angle: 210, value: 0, base: 0, bonus: 0, hasBonus: false }
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
      sub: 'Turn Order',
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
      sub: 'Bono Fuerza',
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
      sub: 'Bono Destreza',
      sources: []
    }
  ];

  const birthDate = readValue(profile, ['birth_date', 'basic_birth_date', 'fecha_nacimiento', 'date_of_birth', 'nacimiento', 'cumpleanos', 'cumpleaños']);
  const age = readValue(profile, ['basic_age', 'age', 'edad']);
  const bloodType = readValue(profile, ['basic_blood_type', 'bloodType', 'blood_type', 'sangre', 'grupo_sanguineo']);
  const faceclaim = readValue(profile, ['faceclaim', 'faceclaim_pb', 'pb']);
  const genderRaw = readValue(profile, ['gender', 'genero', 'género', 'sexo']);
  const height = readValue(profile, ['height', 'altura', 'estatura']);
  const weight = readValue(profile, ['weight', 'peso']);
  const affiliation = group || readValue(profile, ['affiliation', 'afiliacion', 'afiliación']) || (enrollment ? `${enrollment.classGroup?.name || ''} · ${enrollment.academicYear?.name || ''}` : null);

  const genderIcon = useMemo(() => {
    const str = String(genderRaw ?? '').toLowerCase().trim();
    if (str.includes('fem') || str.includes('mujer') || str === 'f') return Venus;
    if (str.includes('masc') || str.includes('hombre') || str === 'm') return Mars;
    return NonBinary;
  }, [genderRaw]);

  const personalDataList = [
    { label: 'NOMBRE HÉROE / ALIAS', value: alias !== 'Sin alias' ? alias : null, icon: Star },
    { label: 'AFILIACIÓN / CLASE', value: affiliation, icon: GraduationCap },
    { label: 'TIPO DE SANGRE', value: bloodType, icon: Droplet },
    { label: 'EDAD', value: age ? `${age} años` : null, icon: PersonStanding },
    { label: 'CUMPLEAÑOS', value: birthDate, icon: Cake },
    { label: 'ESTATURA', value: height, icon: Activity },
    { label: 'PESO', value: weight, icon: Activity },
    { label: 'ALINEACIÓN', value: readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación']), icon: Scale },
    { label: 'GÉNERO', value: genderRaw, icon: genderIcon },
    { label: 'NACIONALIDAD', value: readValue(profile, ['nationality', 'nacionalidad', 'origen']), icon: Earth },
    { label: 'PB / FACECLAIM', value: faceclaim, icon: CircleUserRound },
  ].filter(item => item.value);

  // Skills
  const skillsList = useMemo(() => {
    const fromPossessions = possessionRows
      .filter((r: any) => r?.element?.kind === 'skill')
      .map((r: any) => ({
        id: r.element.id,
        name: r.element.name,
        description: r.element.description,
        level: r.possession?.quantity || r.element.metadata?.level || 1,
      }));
    if (fromPossessions.length > 0) return fromPossessions;

    const rawSkills = Array.isArray(profile.skills) ? profile.skills : Array.isArray(profile.habilidades) ? profile.habilidades : [];
    if (rawSkills.length > 0) {
      return rawSkills.map((s: any, idx: number) => {
        if (typeof s === 'string') {
          const el = getElement(s);
          return { id: s, name: el.name || s, description: el.description, level: 1 };
        }
        const el = s.id ? getElement(s.id) : null;
        return {
          id: s.id || `skill-${idx}`,
          name: s.name || s.title || el?.name || `Habilidad ${idx + 1}`,
          description: s.description || s.desc || el?.description || '',
          level: Number(s.level || s.quantity || 1),
        };
      });
    }
    return [];
  }, [possessionRows, profile, elements]);

  // Inventory items
  const inventoryItems = useMemo(() => {
    const fromPossessions = possessionRows
      .filter((r: any) => ['equipment', 'weapon', 'consumable', 'ammunition', 'crafting_material', 'ingredient', 'vehicle', 'real_estate'].includes(r?.element?.kind))
      .map((r: any) => ({
        id: r.element.id,
        name: r.element.name,
        quantity: r.possession?.quantity || 1,
        kind: r.element.kind,
        description: r.element.description || (r.element.kind === 'equipment' ? 'Equipamiento de Héroe' : 'Objeto')
      }));
    if (fromPossessions.length > 0) return fromPossessions;
    if (Array.isArray(profile.inventory)) return profile.inventory;
    if (Array.isArray(profile.inventario)) return profile.inventario;
    return [];
  }, [possessionRows, profile]);

  // Techniques
  const techniquesList = useMemo(() => {
    // 1. Direct character techniques from character_techniques table
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
            level: t.level || 1,
            sourceType: t.sourceType,
            activationAttributeId: t.activationAttributeId,
            cost: costStr,
            mechanicalBehaviors: t.mechanicalBehaviors || []
          };
        })
      : [];

    // 2. Entitlement possessions from system elements
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
          actionType: r.element.metadata?.actionType || 'Activa',
          range: r.element.metadata?.range || 'CQC',
          target: r.element.metadata?.target || 'Objetivo único'
        };
      });

    // 3. Profile techniques fallback
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
            cost: '3 CE'
          });
        }
      } else if (pTech && !combined.some(c => c.id === pTech.id || c.name === pTech.name)) {
        const pCost = pTech.cost || '3 CE';
        combined.push({
          id: pTech.id,
          name: pTech.name,
          description: pTech.description || pTech.desc || '',
          autoDescription: pTech.autoDescription || `Coste: ${pCost}`,
          cost: pCost
        });
      }
    });

    return combined;
  }, [character?.techniques, possessionRows, profile, rules, mechanicsList, elements]);

  // Narrative fields
  const background = readValue(profile, ['history', 'historia', 'background', 'biography', 'biografia', 'trasfondo']);
  const personality = readValue(profile, ['personality', 'personalidad', 'caracter']);
  const physicalAppearance = readValue(profile, ['appearance', 'apariencia', 'fisico', 'aspecto_fisico']);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-rose-600 border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-amber-400 border-b-transparent animate-spin" />
        </div>
        <p className="font-oxanium text-lg tracking-widest text-amber-400 font-bold uppercase">
          Accediendo al Archivo de Héroes...
        </p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen bg-[#08080a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-950/50 border border-rose-600 flex items-center justify-center mb-4 text-rose-500">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="font-oxanium text-2xl font-bold tracking-wide uppercase text-rose-500 mb-2">
          Expediente no encontrado
        </h1>
        <p className="text-zinc-400 max-w-md text-sm mb-6">
          No se ha podido localizar el expediente heroico para el identificador solicitado ({searchId}).
        </p>
        <Link
          to="/registry"
          className="px-5 py-2.5 rounded-md bg-rose-600 hover:bg-rose-500 font-oxanium text-sm font-bold uppercase tracking-wider text-white transition-all shadow-lg shadow-rose-600/30"
        >
          Volver al Registro Público
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] bg-[radial-gradient(rgba(6,182,212,0.06)_1px,transparent_1px)] [background-size:24px_24px] text-zinc-100 selection:bg-cyan-500 selection:text-black pb-16 relative">
      {/* Top Banner Navigation & Quick Switch Bar with Cyber HUD look */}
      <div className="border-b border-zinc-800/90 bg-[#0a0a0e]/95 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs font-oxanium">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#06b6d4]" />
            <span className="font-bold tracking-widest text-zinc-400 uppercase font-mono text-[11px]">
              TERMINAL // HERO-NET PROTOCOL v4.2
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-cyan-400 font-mono text-[11px] hidden sm:inline">[SYNC: ACTIVE]</span>
            <span className="text-zinc-600">/</span>
            <span className="text-amber-400 font-bold uppercase">{fullName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/sheet/${character.id}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-zinc-700 bg-zinc-900/60 hover:border-cyan-500 text-zinc-300 hover:text-cyan-400 transition-colors font-mono text-[11px]"
              title="Ver en formato estándar"
            >
              <Layers className="size-3.5" />
              <span>Vista Clásica</span>
            </Link>
            <Link
              to="/registry"
              className="text-zinc-400 hover:text-white transition-colors font-mono text-[11px]"
            >
              Registro
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* =========================================================================
            HEADER: MANGA HERO DOSSIER BANNER (Cyber-Hero Techno Edition)
            ========================================================================= */}
        <div className="relative rounded-xl border border-zinc-800 bg-gradient-to-b from-[#121217] via-[#0d0d12] to-[#08080b] overflow-hidden shadow-2xl p-6 sm:p-8">
          {/* Cyberpunk corner bracket ticks */}
          <div className="absolute top-2 left-2.5 font-mono text-xs text-cyan-400/60 select-none">┌ [SYS.REC]</div>
          <div className="absolute top-2 right-2.5 font-mono text-xs text-amber-400/60 select-none">[PRO-HERO] ┐</div>
          <div className="absolute bottom-2 left-2.5 font-mono text-xs text-rose-500/60 select-none">└ [AUTH]</div>
          <div className="absolute bottom-2 right-2.5 font-mono text-xs text-cyan-400/60 select-none">[NET.SEC] ┘</div>

          {/* Techno Scanlines & Neon Edge Gradients */}
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-600 shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-rose-500/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] pointer-events-none" />
          
          {/* Watermark / Authorized Cyber Hologram Stamp */}
          <div className="absolute top-6 right-6 hidden md:flex flex-col items-center justify-center border border-cyan-500/40 rounded p-2.5 rotate-[-4deg] select-none pointer-events-none bg-cyan-950/20 backdrop-blur-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className="text-[10px] font-oxanium font-black tracking-widest text-cyan-400">AUTHORIZED PRO-HERO</span>
            <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">CIPHER-ID // VALIDATED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            {/* Character Portrait with Cyber Reticle Frame */}
            <div className="md:col-span-4 flex flex-col items-center sm:items-start">
              <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-lg border-2 border-cyan-500/60 bg-black overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)] group">
                {/* Crosshair targeting reticles on portrait corners */}
                <div className="absolute top-1.5 left-1.5 size-3 border-t-2 border-l-2 border-cyan-400 z-20 pointer-events-none" />
                <div className="absolute top-1.5 right-1.5 size-3 border-t-2 border-r-2 border-cyan-400 z-20 pointer-events-none" />
                <div className="absolute bottom-7 left-1.5 size-3 border-b-2 border-l-2 border-cyan-400 z-20 pointer-events-none" />
                <div className="absolute bottom-7 right-1.5 size-3 border-b-2 border-r-2 border-cyan-400 z-20 pointer-events-none" />

                {avatar ? (
                  <img
                    src={avatar}
                    alt={fullName}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-4 text-center">
                    <User className="size-16 mb-2 text-zinc-700" />
                    <span className="text-xs font-oxanium uppercase font-bold tracking-wider">Sin Fotografía</span>
                  </div>
                )}
                {/* Hero Badge Tag with Cyber Scanlines */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent p-2 text-center border-t border-cyan-500/30">
                  <span className="text-[10px] font-oxanium font-black uppercase tracking-widest text-cyan-400 flex items-center justify-center gap-1.5">
                    <Cpu className="size-3 text-cyan-400 animate-pulse" />
                    {group || 'HÉROE AUTORIZADO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Header Data & Typography */}
            <div className="md:col-span-8 space-y-4">
              {/* Category / ID kicker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-oxanium font-black text-xs uppercase tracking-wider shadow-sm">
                  FILE 0{character.id || 1}
                </span>
                {alias && alias !== 'Sin alias' && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-oxanium font-bold text-xs uppercase tracking-wider">
                    HERO NAME: {alias}
                  </span>
                )}
                <span className="text-xs text-zinc-400 font-mono">
                  ESTADO: <span className="text-emerald-400 font-bold">{status}</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400/70 border border-cyan-500/30 px-2 py-0.5 rounded">
                  SYS.ID #{character.id}
                </span>
              </div>

              {/* Character Name in Bold Hero Styling */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-oxanium tracking-tight text-white uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  {fullName}
                </h1>
                {alias && alias !== 'Sin alias' && (
                  <p className="text-lg sm:text-xl font-bold font-oxanium text-amber-400 uppercase tracking-wide mt-0.5 flex items-center gap-2">
                    <span>"{alias}"</span>
                    <span className="text-xs font-mono font-normal text-zinc-500">// HERO CODENAME</span>
                  </p>
                )}
              </div>

              {/* Quirk Tagline & Essential Summary with Cyber frame */}
              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between text-xs font-oxanium">
                  <span className="font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    DON / QUIRK BIOSIGNATURE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-[10px] font-mono">
                    {quirkType} · {quirkEvolution}
                  </span>
                </div>
                <p className="text-base font-black font-oxanium text-amber-300 tracking-wide">
                  {quirkName}
                </p>
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {quirkDescription}
                </p>
              </div>

              {/* Currency & Progression Pills */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-oxanium pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800">
                  <Trophy className="size-4 text-amber-400" />
                  <span className="text-zinc-400 font-mono text-[11px]">EXP:</span>
                  <span className="font-black text-amber-400">{character.exp ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800">
                  <Coins className="size-4 text-emerald-400" />
                  <span className="text-zinc-400 font-mono text-[11px]">FONDOS:</span>
                  <span className="font-black text-emerald-400">¥{(character.yen ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-cyan-900/40 text-cyan-400">
                  <Activity className="size-3.5" />
                  <span className="font-mono text-[10px] uppercase">BIO-MONITOR: OK</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: HERO METRICS & HEXAGON RADAR STATS
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Lg 7): Vitality & Hexagonal Radar Base Attributes */}
          <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
            {/* Header with Cyberpunk styling */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                  <Activity className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-2">
                    PARÁMETROS DE CAPACIDAD
                    <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/40 bg-cyan-950/40">
                      SYS.RADAR
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    EVALUACIÓN HEXAGONAL DE PARÁMETROS BASE
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                ACTIVE SCAN
              </span>
            </div>

            {/* Vitality Gauges: Health (HP) & Stamina (ES) with Segmented Cyber Meter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Health Pool */}
              <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-oxanium font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                    <Heart className="size-4 text-rose-500 fill-rose-500" />
                    HP // VITAL CORE
                  </span>
                  <span className="text-lg font-black font-oxanium text-white">
                    {currentHealth} <span className="text-xs text-rose-400 font-normal">/ {maxHealth}</span>
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-3 rounded overflow-hidden border border-rose-950 p-0.5">
                  <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 h-full rounded w-full shadow-[0_0_10px_rgba(225,29,72,0.5)]" />
                </div>
                {/* Segmented meter ticks */}
                <div className="flex justify-between mt-1 text-[8px] font-mono text-zinc-400 px-0.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>MAX</span>
                </div>
              </div>

              {/* Stamina Pool */}
              <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/40 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-oxanium font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                    <Zap className="size-4 text-amber-400 fill-amber-400" />
                    ES // STAMINA BUFFER
                  </span>
                  <span className="text-lg font-black font-oxanium text-white">
                    {currentStamina} <span className="text-xs text-amber-400 font-normal">/ {maxStamina}</span>
                  </span>
                </div>
                <div className="w-full bg-zinc-950 h-3 rounded overflow-hidden border border-amber-950 p-0.5">
                  <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400 h-full rounded w-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                </div>
                {/* Segmented meter ticks */}
                <div className="flex justify-between mt-1 text-[8px] font-mono text-zinc-400 px-0.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>MAX</span>
                </div>
              </div>
            </div>

            {/* THE HEXAGON RADAR CHART (FUE, DES, RES, VOL, INT, VEL) */}
            <div className="rounded-lg bg-zinc-950/90 border border-zinc-800/80 p-3 sm:p-4 relative">
              <HexagonRadarChart stats={baseAttributes} />
            </div>
          </div>

          {/* Right Column (Lg 5): Combat Status, Defenses & Personal Data */}
          <div className="lg:col-span-5 space-y-6">
            {/* Combat Parameters Box */}
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                    ESTADO DE COMBATE
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    PARÁMETROS DERIVADOS & DEFENSA
                  </p>
                </div>
              </div>

              {/* Defenses Grid */}
              <div className="grid grid-cols-2 gap-3">
                {defenseList.map(def => {
                  const Icon = def.icon;
                  return (
                    <div key={def.label} className="p-3 rounded-lg bg-zinc-950/90 border border-zinc-800 flex items-center justify-between hover:border-cyan-500/40 transition-colors">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Icon className="size-4 text-cyan-400 shrink-0" />
                        <span className="text-xs font-oxanium font-bold text-zinc-300">{def.label}</span>
                        <ModifierBadgeGroup sources={def.sources} />
                      </div>
                      <span className="text-base font-black font-oxanium text-white shrink-0 ml-2">{displayValue(def.value, '0')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Derived Status List */}
              <div className="grid grid-cols-2 gap-2.5">
                {combatStatusList.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1 hover:border-zinc-700 transition-colors">
                      <div className="flex items-center justify-between text-[11px] font-oxanium gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-zinc-400 font-semibold truncate">{item.label}</span>
                          <ModifierBadgeGroup sources={item.sources} />
                        </div>
                        <Icon className="size-3 text-cyan-400 shrink-0" />
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-black font-oxanium text-white">{displayValue(item.value, '0')}</span>
                        <span className="text-[9px] text-zinc-400 font-mono uppercase">{item.sub}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modifier Notes Legend */}
              <ModifierNotesLegend className="mt-2 border-zinc-800 bg-zinc-950/40 text-zinc-400" />
            </div>

            {/* Personal Dossier / Data Grid */}
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                    DATOS PERSONALES & EXPEDIENTE
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    REGISTRO CÍVICO Y ACADÉMICO
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {personalDataList.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="p-2.5 rounded bg-zinc-950/60 border border-zinc-800/70 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-oxanium text-zinc-400 uppercase font-bold">
                        <Icon className="size-3 text-cyan-400" />
                        <span>{item.label}</span>
                      </div>
                      <p className="font-semibold text-white truncate pl-4.5">
                        {String(item.value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: QUIRK / DON SPECIFICATION & EVOLUTION LEVELS
            ========================================================================= */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-6 space-y-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Zap className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-2">
                  FICHA TÉCNICA DEL DON: {quirkName}
                  <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/40 bg-amber-950/40">
                    BIOSIGNATURE
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  CLASIFICACIÓN, MECÁNICA Y EVOLUCIÓN DE SINGULARIDAD
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-950/40 text-amber-400 border-amber-500/50 font-oxanium text-xs uppercase px-2.5 py-1">
                {quirkType}
              </Badge>
              <Badge variant="outline" className="bg-cyan-950/40 text-cyan-400 border-cyan-500/50 font-oxanium text-xs uppercase px-2.5 py-1">
                {quirkEvolution}
              </Badge>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800 space-y-2">
            <span className="text-xs font-oxanium font-bold uppercase text-amber-400 tracking-wider block font-mono">
              // DESCRIPCIÓN GENERAL DEL DON
            </span>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {quirkDescription}
            </p>
          </div>

          {/* Quirk Evolution Progression Levels with Cyber Module headers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Level 1 */}
            <div className="p-4 rounded-lg bg-zinc-950/80 border border-zinc-800 flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs">
              <div className="flex items-center justify-between shrink-0 border-b border-zinc-900 pb-2">
                <span className="text-xs font-oxanium font-black uppercase text-amber-400">
                  NIVEL 1 · DESPERTAR
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 shrink-0">
                  ACTIVO // ONLINE
                </span>
              </div>
              <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                  {quirkLevelOne}
                </p>
              </div>
            </div>

            {/* Level 2 */}
            <div className={cn(
              "p-4 rounded-lg border flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs",
              quirkLevelTwo ? "bg-zinc-950/80 border-zinc-800" : "bg-zinc-950/30 border-dashed border-zinc-800/60 opacity-60"
            )}>
              <div className="flex items-center justify-between shrink-0 border-b border-zinc-900 pb-2">
                <span className="text-xs font-oxanium font-black uppercase text-amber-400">
                  NIVEL 2 · DOMINIO
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                  {quirkLevelTwo ? 'STANDBY // UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                  {displayValue(quirkLevelTwo, 'Aún no se ha desarrollado el segundo nivel de dominio para este don.')}
                </p>
              </div>
            </div>

            {/* Level 3 */}
            <div className={cn(
              "p-4 rounded-lg border flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs",
              quirkLevelThree ? "bg-zinc-950/80 border-zinc-800" : "bg-zinc-950/30 border-dashed border-zinc-800/60 opacity-60"
            )}>
              <div className="flex items-center justify-between shrink-0 border-b border-zinc-900 pb-2">
                <span className="text-xs font-oxanium font-black uppercase text-amber-400">
                  NIVEL 3 · SINGULARIDAD
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                  {quirkLevelThree ? 'STANDBY // UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                  {displayValue(quirkLevelThree, 'Nivel máximo de singularidad aún no alcanzado.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: SKILLS, LICENSES & TRAITS (Techno Cyber Edition)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Habilidades de Héroe (Skills) */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <UserStar className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-1.5">
                    HABILIDADES
                    <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/30 bg-cyan-950/40">SYS.SKL</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    COMPETENCIAS & DESTREZAS
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-400">
                {skillsList.length} REGISTRADAS
              </span>
            </div>

            {skillsList.length > 0 ? (
              <div className="space-y-2.5">
                {skillsList.map((skill: any, idx: number) => {
                  const skillName = skill.name || `Habilidad ${idx + 1}`;
                  const skillLevel = Math.max(1, Math.min(5, Number(skill.level) || 1));
                  return (
                    <div
                      key={skill.id || idx}
                      className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 hover:border-cyan-500/40 transition-colors relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-oxanium font-bold text-xs text-white uppercase tracking-wide truncate">
                          {skillName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono font-bold text-cyan-400">
                            NV. {skillLevel}
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "size-2 rounded-xs transition-colors",
                                  i < skillLevel
                                    ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                                    : "bg-zinc-800 border border-zinc-700/50"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {skill.description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {skill.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                Sin habilidades especiales registradas.
              </div>
            )}
          </div>

          {/* 2. Licencias & Certificaciones Oficiales */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Award className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-1.5">
                    LICENCIAS
                    <span className="text-[9px] font-mono text-amber-400 px-1 py-0.2 rounded border border-amber-500/30 bg-amber-950/40">AUTH.ID</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    CERTIFICACIONES OFICIALES
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400">
                {credentials.length} EXPEDIDAS
              </span>
            </div>

            {credentials.length > 0 ? (
              <div className="space-y-2.5">
                {credentials.map((cred: any, idx: number) => {
                  const el = cred.element;
                  const kindLabels: Record<string, { label: string; color: string; border: string; bg: string }> = {
                    license: { label: 'Licencia', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/40' },
                    permission: { label: 'Permiso', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/40' },
                    certification: { label: 'Certificación', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/40' },
                    character_resource: { label: 'Recurso', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-950/40' },
                    background: { label: 'Trasfondo', color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-950/40' },
                    clandestine_asset: { label: 'Activo Clandestino', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-950/40' },
                  };
                  const meta = kindLabels[el?.kind] ?? { label: 'Credencial', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/40' };
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-gradient-to-r from-amber-950/30 via-zinc-950 to-zinc-950 border border-amber-500/30 flex items-start gap-3 hover:border-amber-400/50 transition-colors">
                      <ShieldCheck className="size-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-oxanium font-bold text-amber-300 uppercase tracking-wide">
                            {el?.name || 'Credencial Oficial'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold font-mono uppercase ${meta.bg} ${meta.border} ${meta.color} border`}>
                              {meta.label}
                            </span>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">#AUTH-{idx + 1}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {el?.description || 'Acreditación válida para el ejercicio heroico.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                No constan licencias provisionales o definitivas registradas.
              </div>
            )}
          </div>

          {/* 3. Traits & Weaknesses (Rasgos y Defectos) */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Bookmark className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-1.5">
                    RASGOS & DEFECTOS
                    <span className="text-[9px] font-mono text-rose-400 px-1 py-0.2 rounded border border-rose-500/30 bg-rose-950/40">BIO.MOD</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    VENTAJAS INNATAS Y LIMITACIONES
                  </p>
                </div>
              </div>
            </div>

            {/* Traits list */}
            <div className="space-y-2">
              <span className="text-xs font-oxanium font-bold uppercase text-emerald-400 tracking-wider block font-mono text-[10px]">
                // RASGOS HEROICOS ({traits.length})
              </span>
              {traits.length > 0 ? (
                <div className="space-y-2">
                  {traits.map((t: any, idx: number) => {
                    const el = getElement(t);
                    return (
                      <div key={idx} className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/40 space-y-0.5 hover:border-emerald-500/40 transition-colors">
                        <span className="text-xs font-oxanium font-bold text-emerald-300">{el.name || String(t)}</span>
                        {el.description && <p className="text-[11px] text-zinc-400">{el.description}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Ningún rasgo especial registrado.</p>
              )}
            </div>

            {/* Weaknesses list */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-xs font-oxanium font-bold uppercase text-rose-400 tracking-wider block font-mono text-[10px]">
                // DEFECTOS & LIMITACIONES ({weaknesses.length})
              </span>
              {weaknesses.length > 0 ? (
                <div className="space-y-2">
                  {weaknesses.map((w: any, idx: number) => {
                    const el = getElement(w);
                    return (
                      <div key={idx} className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 space-y-0.5 hover:border-rose-500/40 transition-colors">
                        <span className="text-xs font-oxanium font-bold text-rose-300">{el.name || String(w)}</span>
                        {el.description && <p className="text-[11px] text-zinc-400">{el.description}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Ningún defecto registrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: INVENTORY / EQUIPMENT & TECHNIQUES (Techno Cyber Edition)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Equipment & Support Gear */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Package className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-1.5">
                    EQUIPAMIENTO & HARDWARE
                    <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/30 bg-cyan-950/40">GEAR</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    TRAJE DE HÉROE, DISPOSITIVOS Y PERTRECHOS
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-400">
                {inventoryItems.length} ÍTEMS
              </span>
            </div>

            {inventoryItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventoryItems.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-oxanium font-bold text-white truncate">{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-cyan-400">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                Sin equipamiento o pertrechos asignados actualmente.
              </div>
            )}
          </div>

          {/* 2. Techniques (Técnicas Especiales) */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-rose-600/20 text-rose-500 border border-rose-500/30">
                  <Swords className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-1.5">
                    TÉCNICAS ESPECIALES
                    <span className="text-[9px] font-mono text-rose-400 px-1 py-0.2 rounded border border-rose-500/30 bg-rose-950/40">COMBAT.EXE</span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    SUPER MOVIMIENTOS Y HABILIDADES DE COMBATE
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-rose-400">
                {techniquesList.length} REGISTRADAS
              </span>
            </div>

            {techniquesList.length > 0 ? (
              <div className="space-y-3.5">
                {techniquesList.map((tech: any, idx: number) => {
                  const elem = getElement(tech);
                  return (
                    <div key={idx} className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800/90 space-y-2 hover:border-cyan-500/50 transition-colors shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-oxanium font-bold text-sm text-amber-400 uppercase tracking-wide block">
                            {elem.name || tech.name || `Técnica ${idx + 1}`}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-oxanium">
                            {tech.level && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 font-mono border border-zinc-800">
                                NV. {tech.level}
                              </span>
                            )}
                            {tech.activationAttributeId && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-bold font-mono">
                                ATR: {tech.activationAttributeId}
                              </span>
                            )}
                            {tech.sourceType && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 uppercase font-mono border border-zinc-800">
                                {tech.sourceType === 'quirk' ? 'DON / QUIRK' : tech.sourceType}
                              </span>
                            )}
                          </div>
                        </div>
                        {tech.cost && (
                          <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-oxanium text-xs font-bold shrink-0 font-mono shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                            {tech.cost}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                        {elem.description || tech.description || 'Sin descripción detallada.'}
                      </p>
                      <div className="p-2.5 rounded bg-zinc-900/90 border border-cyan-500/30 text-xs text-cyan-200/90 font-mono space-y-1 mt-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                          <Sparkles className="size-3 text-cyan-400 shrink-0" />
                          <span>MECH.EXE // DESCRIPCIÓN TÉCNICA & COSTE CE</span>
                        </div>
                        <p className="leading-relaxed">
                          {generateAutoDescription(tech)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 text-xs font-mono">
                No hay técnicas especiales registradas para este personaje.
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECTION 5: BACKGROUND, PERSONALITY & NARRATIVE ARCHIVE (Techno Cyber Edition)
            ========================================================================= */}
        {(background || personality || physicalAppearance) && (
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-6 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <div className="p-1.5 rounded bg-rose-600/20 text-rose-500 border border-rose-500/30">
                <Scroll className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-black font-oxanium uppercase text-white tracking-wide flex items-center gap-2">
                  ARCHIVO NARRATIVO DEL HÉROE
                  <span className="text-[9px] font-mono text-cyan-400 px-1 py-0.2 rounded border border-cyan-500/30 bg-cyan-950/40">
                    BIO.LOG
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  BIOGRAFÍA, PERFIL PSICOLÓGICO Y DESCRIPCIÓN FÍSICA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {background && (
                <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs">
                  <span className="text-xs font-oxanium font-black uppercase text-amber-400 tracking-wide flex items-center gap-1.5 font-mono shrink-0 border-b border-zinc-900 pb-2">
                    <Scroll className="size-4 text-cyan-400" />
                    // HISTORIA & ANTECEDENTES
                  </span>
                  <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                      {background}
                    </p>
                  </div>
                </div>
              )}

              {personality && (
                <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs">
                  <span className="text-xs font-oxanium font-black uppercase text-rose-400 tracking-wide flex items-center gap-1.5 font-mono shrink-0 border-b border-zinc-900 pb-2">
                    <Brain className="size-4 text-rose-400" />
                    // PERFIL PSICOLÓGICO
                  </span>
                  <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                      {personality}
                    </p>
                  </div>
                </div>
              )}

              {physicalAppearance && (
                <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-2 max-h-72 sm:max-h-80 shadow-xs">
                  <span className="text-xs font-oxanium font-black uppercase text-cyan-400 tracking-wide flex items-center gap-1.5 font-mono shrink-0 border-b border-zinc-900 pb-2">
                    <Eye className="size-4 text-cyan-400" />
                    // ASPECTO & INDUMENTARIA
                  </span>
                  <div className="overflow-y-auto pr-1.5 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                      {physicalAppearance}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-xs font-mono text-zinc-500 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PUBLIC HERO ARCHIVE SYSTEM · SHADOWMORE BNHA</span>
          <Link
            to={`/sheet/${character.id}`}
            className="text-amber-400/80 hover:text-amber-300 hover:underline flex items-center gap-1"
          >
            <span>Ver Ficha en Formato Clásico (/sheet/{character.id})</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
