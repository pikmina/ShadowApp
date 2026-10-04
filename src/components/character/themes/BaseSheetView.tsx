import React, { useState } from 'react';
import { ItemIcon } from '@/components/common/ItemIcon';
import {
  Heart,
  Zap,
  Shield,
  Award,
  Sparkles,
  User,
  Coins,
  Scroll,
  Trophy,
  Activity,
  Briefcase,
  Crosshair,
  Package,
  Droplets,
  Calendar,
  Scale,
  UserCheck,
  Globe,
  Cpu,
  ChevronDown,
  ChevronUp,
  HeartCrack,
  Wine,
  Feather,
  ShieldAlert,
  Swords,
  Target,
  GraduationCap
} from 'lucide-react';
import { HexStat } from '../HexagonRadarChart';
import { CANONICAL_STAT_ICONS } from '@/domain/canonicalStatIcons';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface BaseSheetViewProps {
  fullName: string;
  alias?: string;
  avatar?: string | null;
  group?: string;
  groupColor?: string;
  status?: string;
  basicStage?: string;
  quirkName?: string;
  quirkType?: string;
  quirkEvolution?: string;
  quirkDescription?: string;
  quirkLevelOne?: string;
  quirkLevelTwo?: string | null;
  quirkLevelThree?: string | null;
  reputation?: any;
  yen?: any;
  exp?: any;
  plusUltra?: number;
  currentHealth: number;
  maxHealth: number;
  currentStamina: number;
  maxStamina: number;
  evasion: number;
  courage: number;
  physicalDamageText: string;
  rangeDamageText: string;
  damageReductionText: string;
  initiativeText: string;
  modFuerza?: number;
  modDestreza?: number;
  classNameResolved?: string;
  courseNameResolved?: string;
  schoolNameResolved?: string;
  academic?: { className?: string; courseName?: string; schoolName?: string };
  enrollment?: any;
  combatStatus?: any;
  baseAttributes: HexStat[];
  defenseList: any[];
  combatStatusList: any[];
  personalDataList: any[];
  traits: any[];
  weaknesses: any[];
  skills?: any[];
  credentials?: any[];
  techniques: any[];
  possessions: any[];
  biography?: string;
  character: any;
  profile: any;
  employments?: any[];
  theme?: string;
}

function CyberCorners({ color = 'border-emerald-500/60' }: { color?: string }) {
  return (
    <>
      <div className={cn("absolute top-1.5 left-1.5 size-2 border-t-2 border-l-2 pointer-events-none z-10", color)} />
      <div className={cn("absolute top-1.5 right-1.5 size-2 border-t-2 border-r-2 pointer-events-none z-10", color)} />
      <div className={cn("absolute bottom-1.5 left-1.5 size-2 border-b-2 border-l-2 pointer-events-none z-10", color)} />
      <div className={cn("absolute bottom-1.5 right-1.5 size-2 border-b-2 border-r-2 pointer-events-none z-10", color)} />
    </>
  );
}

export function BaseSheetView({
  fullName,
  alias,
  avatar,
  group,
  groupColor,
  status = 'Activo',
  basicStage,
  quirkName,
  quirkType = 'Emisión',
  quirkEvolution = 'Nivel 1. Despertar',
  quirkDescription,
  quirkLevelOne,
  quirkLevelTwo,
  quirkLevelThree,
  reputation,
  yen,
  exp,
  plusUltra,
  currentHealth,
  maxHealth,
  currentStamina,
  maxStamina,
  evasion,
  courage,
  physicalDamageText,
  rangeDamageText,
  damageReductionText,
  initiativeText,
  modFuerza: modFuerzaProp,
  modDestreza: modDestrezaProp,
  classNameResolved,
  courseNameResolved,
  schoolNameResolved,
  academic,
  enrollment,
  combatStatus,
  baseAttributes = [],
  defenseList = [],
  combatStatusList = [],
  personalDataList = [],
  traits = [],
  weaknesses = [],
  skills = [],
  credentials = [],
  techniques = [],
  possessions = [],
  biography,
  character,
  profile,
  employments = [],
}: BaseSheetViewProps) {
  // Quirk level accordion open state (level 1 open by default)
  const [openLevels, setOpenLevels] = useState<number[]>([1, 2, 3]);

  const toggleLevel = (lvl: number) => {
    setOpenLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]
    );
  };

  const resolvedPlusUltra = Number(
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

  const resolvedYen = Number(
    yen ??
    character?.yen ??
    profile?.yen ??
    0
  );

  const resolvedExp = Number(
    exp ??
    character?.exp ??
    profile?.exp ??
    0
  );

  const resolvedReputation =
    reputation ??
    character?.reputation ??
    profile?.reputation ??
    profile?.reputacion ??
    0;

  // Defensive calculations & fallbacks
  const resolvedEvasion = combatStatus?.evasion ?? evasion ?? Number(defenseList[0]?.value || 0);
  const resolvedCourage = combatStatus?.courage ?? courage ?? Number(defenseList[1]?.value || 0);

  const resolvedPhysicalDamage = combatStatus?.physicalDamageText ?? physicalDamageText ?? String(combatStatusList[0]?.value || '1D4');
  const resolvedRangeDamage = combatStatus?.rangeDamageText ?? rangeDamageText ?? String(combatStatusList[1]?.value || '1D4');
  const resolvedDamageReduction = combatStatus?.damageReductionText ?? damageReductionText ?? String(combatStatusList[2]?.value || '0');
  const resolvedInitiative = combatStatus?.initiativeText ?? initiativeText ?? String(combatStatusList[3]?.value || '0');

  // Modifiers
  const fueStat = baseAttributes.find((a) => a.key === 'FUE' || a.label?.toLowerCase().includes('fuerza'));
  const desStat = baseAttributes.find((a) => a.key === 'DES' || a.label?.toLowerCase().includes('destreza'));
  const rawFue = profile?.FUE ?? character?.profileData?.FUE ?? character?.FUE;
  const rawDes = profile?.DES ?? character?.profileData?.DES ?? character?.DES;

  const resolvedModFuerza =
    modFuerzaProp ??
    combatStatus?.modFuerza ??
    (fueStat ? Math.floor(Number(fueStat.value ?? fueStat.base ?? 0) / 2) : (rawFue !== undefined && rawFue !== null && rawFue !== '' ? Math.floor(Number(rawFue || 0) / 2) : 0));

  const resolvedModDestreza =
    modDestrezaProp ??
    combatStatus?.modDestreza ??
    (desStat ? Math.floor(Number(desStat.value ?? desStat.base ?? 0) / 2) : (rawDes !== undefined && rawDes !== null && rawDes !== '' ? Math.floor(Number(rawDes || 0) / 2) : 0));

  // Personal data helper
  const getPersonalValue = (pattern: string, fallback = '—') => {
    const item = personalDataList.find((p) => p.label?.toLowerCase().includes(pattern.toLowerCase()));
    if (item && item.value && item.value !== 'No especificada' && item.value !== 'No especificado' && item.value !== '—') {
      return item.value;
    }
    return fallback;
  };

  const bloodType = getPersonalValue('sangre', 'O-');
  const age = getPersonalValue('edad', character?.profileData?.basic_age ? `${character.profileData.basic_age}` : '15');
  const birthDate = getPersonalValue('cumpleaños', getPersonalValue('nacimiento', character?.profileData?.birth_date || '2185-10-16'));
  const alignment = getPersonalValue('alineación', character?.profileData?.basic_alignment || 'Heróica');
  const gender = getPersonalValue('género', character?.profileData?.basic_gender || 'Masculino');
  const nationality = getPersonalValue('nacionalidad', character?.profileData?.nationality || 'Japonesa');

  // Academic / Employment resolution
  const resolvedSchool =
    schoolNameResolved ??
    academic?.schoolName ??
    enrollment?.school?.name ??
    profile?.school ??
    'Academia UA';

  const resolvedAcademicYear =
    courseNameResolved ??
    academic?.courseName ??
    enrollment?.academicYear?.name ??
    profile?.course ??
    'PRIMER AÑO';

  const resolvedClassGroup =
    classNameResolved ??
    academic?.className ??
    enrollment?.classGroup?.name ??
    profile?.class_group ??
    '1A';

  // Base attributes normalized
  const baseAttrOrder = ['FUE', 'RES', 'DES', 'INT', 'VEL', 'VOL'];
  const baseStatMap: Record<string, HexStat> = {};
  baseAttributes.forEach((stat) => {
    baseStatMap[stat.key] = stat;
  });

  const getAttrIcon = (key: string) => {
    switch (key) {
      case 'FUE':
        return Swords;
      case 'RES':
        return Heart;
      case 'DES':
        return Target;
      case 'INT':
        return Activity;
      case 'VEL':
        return Feather;
      case 'VOL':
        return Shield;
      default:
        return Activity;
    }
  };

  // Faceclaim resolution
  const faceclaim =
    profile?.faceclaim ||
    profile?.face_claim ||
    profile?.pb ||
    (alias && alias !== 'Sin alias' ? `${fullName} - ${alias}` : `${fullName} - MHA`);

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-4 font-oxanium text-zinc-100 selection:bg-emerald-500 selection:text-black">
      {/* =========================================================================
          SCREENSHOT 3: HEADER & TOP STATS BAR
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Name and Hero Name */}
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white flex flex-wrap items-baseline gap-2">
            <span>{fullName}</span>
            {alias && alias !== 'Sin alias' && (
              <span className="text-emerald-400 font-bold tracking-wide">
                · {alias.toUpperCase()}
              </span>
            )}
          </h1>
        </div>

        {/* 3 Top Resource Pill Counters (Reputación, Yenes, EXP) */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-oxanium">
          <div className="bg-[#0e1013] border border-zinc-800/80 px-4 py-1.5 rounded-lg text-center min-w-[85px] shadow-sm">
            <div className="text-base font-black text-white leading-tight font-oxanium">
              {resolvedReputation}
            </div>
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
              REPUTACIÓN
            </div>
          </div>

          <div className="bg-[#0e1013] border border-zinc-800/80 px-4 py-1.5 rounded-lg text-center min-w-[95px] shadow-sm">
            <div className="text-base font-black text-white leading-tight flex items-center justify-center gap-1 font-oxanium">
              <span className="text-zinc-400 text-xs">¥</span>
              <span>{resolvedYen.toLocaleString()}</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Coins className="size-2.5 text-amber-400" />
              <span>YENES</span>
            </div>
          </div>

          <div className="bg-[#0e1013] border border-zinc-800/80 px-4 py-1.5 rounded-lg text-center min-w-[85px] shadow-sm">
            <div className="text-base font-black text-white leading-tight font-oxanium">
              {resolvedExp}
            </div>
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Trophy className="size-2.5 text-amber-400" />
              <span>EXP</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SYS.INFO // DATOS BÁSICOS CONTAINER
          ========================================================================= */}
      <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3 sm:p-4 shadow-lg overflow-hidden">
        <CyberCorners color="border-emerald-500/50" />

        {/* Top Header of SYS.INFO */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="size-3.5 text-emerald-400" />
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-200">
              SYS.INFO // DATOS BÁSICOS
            </span>
          </div>

          {/* Group / Faction Badge on Right */}
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
            {group || 'Sin grupo'}
          </span>
        </div>

        {/* 6 Basic Info Cards in Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3 text-center font-mono">
          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <Droplets className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              SANGRE // RH
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {bloodType}
            </span>
          </div>

          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <User className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              EDAD // AÑOS
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {age}
            </span>
          </div>

          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <Calendar className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              NACIMIENTO // DOB
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {birthDate}
            </span>
          </div>

          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <Scale className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              ALINEACIÓN // ALGN
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {alignment}
            </span>
          </div>

          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <UserCheck className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              GÉNERO // GND
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {gender}
            </span>
          </div>

          <div className="bg-[#08090b] border border-zinc-800/70 p-2.5 rounded-lg flex flex-col items-center justify-center">
            <Globe className="size-3.5 text-zinc-500 mb-1" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest block">
              NACIONALIDAD // NAT
            </span>
            <span className="text-xs font-bold text-zinc-100 font-oxanium mt-0.5">
              {nationality}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN TOP GRID: LEFT PORTRAIT & DIAGNOSTIC / RIGHT 2X2 STAT BLOCKS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Portrait, Faceclaim & Diagnostic Box */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Portrait Photo */}
          <div className="relative rounded-xl border border-zinc-800 bg-black overflow-hidden shadow-lg aspect-[3/4] group">
            {avatar ? (
              <img
                src={avatar}
                alt={fullName}
                className="w-full h-full object-cover object-top filter contrast-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-4 text-center">
                <User className="size-16 mb-2 text-zinc-700" />
                <span className="text-xs uppercase font-bold tracking-wider font-mono">
                  Sin Fotografía
                </span>
              </div>
            )}

            {/* Activo badge at bottom left */}
            <div className="absolute bottom-3 left-3 bg-black/85 border border-zinc-700/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest text-zinc-200 uppercase shadow-md">
              {status}
            </div>
          </div>

          {/* Faceclaim Box */}
          <div className="rounded-lg bg-[#0e1013] border border-zinc-800/80 p-2.5 text-center">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
              FACECLAIM // PB
            </span>
            <span className="text-xs font-mono font-bold text-zinc-200 block truncate mt-0.5">
              {faceclaim}
            </span>
          </div>

          {/* Cyber Diagnostic Footer Box */}
          <div className="relative rounded-lg bg-[#0e1013] border border-zinc-800/80 p-3 text-center overflow-hidden">
            <CyberCorners color="border-emerald-500/30" />
            <Cpu className="size-5 text-emerald-500/40 mx-auto mb-1.5" />
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block">
              SYS.DIAGNOSTIC // PROTOCOLO ACTIVO
            </span>
            <span className="text-[9px] font-mono text-zinc-600 block mt-0.5">
              ID: .CHAR_{character?.id || 1}
            </span>
          </div>
        </div>

        {/* Right Column: 4 Stat Panels in 2x2 Grid */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Top Row: ESTATUS & DEFENSAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ESTATUS Panel */}
            <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2.5 shadow-md">
              <CyberCorners color="border-emerald-500/50" />
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
                <User className="size-3.5 text-emerald-400" />
                <span>ESTATUS</span>
              </div>

              {/* Salud Card */}
              <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                    SALUD
                  </span>
                  <div className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {currentHealth}{' '}
                    <span className="text-sm font-normal text-zinc-500 font-mono">
                      / {maxHealth}
                    </span>
                  </div>
                </div>
                <div className="text-zinc-500 font-mono text-xs px-2 py-1 rounded border border-zinc-800 bg-[#0e1013]">
                  [+]'
                </div>
              </div>

              {/* Estamina Card */}
              <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                    ESTAMINA
                  </span>
                  <div className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {currentStamina}{' '}
                    <span className="text-sm font-normal text-zinc-500 font-mono">
                      / {maxStamina}
                    </span>
                  </div>
                </div>
                <div className="text-zinc-500 font-mono text-xs px-2 py-1 rounded border border-zinc-800 bg-[#0e1013]">
                  [4]'
                </div>
              </div>
            </div>

            {/* DEFENSAS Panel */}
            <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2.5 shadow-md">
              <CyberCorners color="border-emerald-500/50" />
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
                <Shield className="size-3.5 text-emerald-400" />
                <span>DEFENSAS</span>
              </div>

              {/* Evasión Card */}
              <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                    EVASIÓN
                  </span>
                  <div className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedEvasion}
                  </div>
                </div>
                <CANONICAL_STAT_ICONS.evasion className="size-5 text-zinc-400" />
              </div>

              {/* Coraje Card */}
              <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                    CORAJE
                  </span>
                  <div className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedCourage}
                  </div>
                </div>
                <CANONICAL_STAT_ICONS.courage className="size-5 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Bottom Row: ATRIBUTOS BASE & ATRIBUTOS DERIVADOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ATRIBUTOS BASE Panel */}
            <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2 shadow-md">
              <CyberCorners color="border-emerald-500/50" />
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
                <Activity className="size-3.5 text-emerald-400" />
                <span>ATRIBUTOS BASE</span>
              </div>

              {/* 6 Stats Grid: 2 Cols x 3 Rows */}
              <div className="grid grid-cols-2 gap-2">
                {baseAttrOrder.map((key) => {
                  const stat = baseStatMap[key];
                  const Icon = getAttrIcon(key);
                  const val = stat?.value ?? 0;
                  const base = stat?.base ?? val;
                  const bonus = stat?.bonus ?? 0;
                  const labelMap: Record<string, string> = {
                    FUE: 'FUERZA',
                    RES: 'RESISTENCIA',
                    DES: 'DESTREZA',
                    INT: 'INTELIGENCIA',
                    VEL: 'VELOCIDAD',
                    VOL: 'VOLUNTAD',
                  };
                  const label = stat?.label ? stat.label.toUpperCase() : labelMap[key] || key;

                  return (
                    <div
                      key={key}
                      className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2"
                    >
                      <Icon className="size-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase truncate">
                            {label}
                          </span>
                          {bonus > 0 && (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1 rounded shrink-0">
                              +{bonus}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base font-black font-oxanium text-white">
                            {val}
                          </span>
                          {bonus > 0 && (
                            <span className="text-[9px] font-mono text-zinc-500">
                              (Base: {base})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ATRIBUTOS DERIVADOS Panel */}
            <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2 shadow-md">
              <CyberCorners color="border-emerald-500/50" />
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
                <Activity className="size-3.5 text-emerald-400" />
                <span>ATRIBUTOS DERIVADOS</span>
              </div>

              {/* 6 Derived Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Daño Físico */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.physicalDamage className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block truncate">
                      DAÑO FÍSICO
                    </span>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5 truncate">
                      {resolvedPhysicalDamage}
                    </span>
                  </div>
                </div>

                {/* 2. Daño de Rango */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.rangeDamage className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block truncate">
                      DAÑO DE RANGO
                    </span>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5 truncate">
                      {resolvedRangeDamage}
                    </span>
                  </div>
                </div>

                {/* 3. Reducción Daño */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.damageReduction className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block truncate">
                      REDUCCIÓN DAÑO
                    </span>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5">
                      {resolvedDamageReduction}
                    </span>
                  </div>
                </div>

                {/* 4. Iniciativa */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.initiative className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block truncate">
                      INICIATIVA
                    </span>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5">
                      {resolvedInitiative}
                    </span>
                  </div>
                </div>

                {/* 5. Mod Fue */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.modFuerza className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        MOD FUE
                      </span>
                      <span className="sr-only">Modificador de Fuerza</span>
                    </div>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5">
                      {resolvedModFuerza > 0 ? `+${resolvedModFuerza}` : String(resolvedModFuerza)}
                    </span>
                  </div>
                </div>

                {/* 6. Mod Des */}
                <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2 flex items-center gap-2">
                  <CANONICAL_STAT_ICONS.modDestreza className="size-4 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        MOD DES
                      </span>
                      <span className="sr-only">Modificador de Destreza</span>
                    </div>
                    <span className="text-base font-black font-oxanium text-white block mt-0.5">
                      {resolvedModDestreza > 0 ? `+${resolvedModDestreza}` : String(resolvedModDestreza)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plus Ultra Banner inside Derived Panel */}
              <div className="rounded-lg bg-[#08090b] border border-amber-900/30 p-2 text-center mt-2 shadow-inner">
                <div className="text-[10px] font-oxanium font-bold text-amber-400 flex items-center justify-center gap-1">
                  <Sparkles className="size-3 text-amber-400" />
                  <span>PLUS ULTRA</span>
                  <Sparkles className="size-3 text-amber-400" />
                </div>
                <div className="text-xl font-black font-oxanium text-white my-0.5">
                  {resolvedPlusUltra}
                </div>
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  RECURSO EXTRAORDINARIO
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREENSHOT 2: ICON LEGEND STRIP
          ========================================================================= */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-mono text-zinc-400 pt-3 pb-1 border-t border-zinc-800/70">
        <span className="text-emerald-400 font-bold">// LEYENDA DE ICONOS:</span>
        <span className="flex items-center gap-1">
          <Sparkles className="size-3 text-emerald-400" /> Rasgos
        </span>
        <span className="flex items-center gap-1">
          <HeartCrack className="size-3 text-rose-400" /> Debilidades
        </span>
        <span className="flex items-center gap-1">
          <Shield className="size-3 text-blue-400" /> Equipo
        </span>
        <span className="flex items-center gap-1">
          <Crosshair className="size-3 text-cyan-400" /> Técnica
        </span>
        <span className="flex items-center gap-1">
          <Wine className="size-3 text-amber-400" /> Consumible
        </span>
        <span className="flex items-center gap-1">
          <ChevronUp className="size-3 text-emerald-400" /> Bonificadores
        </span>
        <span className="flex items-center gap-1">
          <ChevronDown className="size-3 text-rose-400" /> Penalizadores
        </span>
      </div>

      {/* =========================================================================
          SCREENSHOT 2: QUIRK CARD & RIGHT COLUMN (OCUPACIÓN, CERTIFICACIONES, ARCHIVE)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Quirk Panel */}
        <div className="lg:col-span-7 relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-4 sm:p-5 shadow-lg overflow-hidden">
          <CyberCorners color="border-emerald-500/50" />

          {/* Top Quirk Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="size-10 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="size-5" />
            </div>

            <div className="text-right">
              <h2 className="text-2xl sm:text-3xl font-black font-oxanium text-white uppercase tracking-wider">
                {quirkName || 'Sin don registrado'}
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block mt-0.5">
                {quirkEvolution || 'NIVEL 1. DESPERTAR'}
              </span>
            </div>
          </div>

          {/* Quirk Type Badge */}
          <div className="mt-2.5">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block">
              TIPO: {quirkType || 'Transformación'}
            </span>
          </div>

          {/* Quirk Description */}
          <p className="text-xs text-zinc-300 font-poppins leading-relaxed mt-2.5">
            {quirkDescription || 'No se ha registrado información sobre este don.'}
          </p>

          {/* Quirk Levels Accordions (Level 1, Level 2, Level 3) */}
          <div className="space-y-2 mt-4 relative z-10">
            {/* Level 1 */}
            {quirkLevelOne && (
              <div className="rounded-lg border border-zinc-800/80 bg-[#08090b] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLevel(1)}
                  className="w-full p-2.5 flex items-center justify-between text-left text-xs font-oxanium font-bold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    ✦ <span>NIVEL 1 · DESPERTAR</span>
                  </span>
                  {openLevels.includes(1) ? (
                    <ChevronUp className="size-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="size-3.5 text-zinc-400" />
                  )}
                </button>
                <div
                  className={cn(
                    "px-3 pb-3 text-xs font-poppins text-zinc-300 leading-relaxed border-t border-zinc-800/40 pt-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar",
                    !openLevels.includes(1) && "hidden"
                  )}
                >
                  {quirkLevelOne}
                </div>
              </div>
            )}

            {/* Level 2 */}
            {quirkLevelTwo && (
              <div className="rounded-lg border border-zinc-800/80 bg-[#08090b] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLevel(2)}
                  className="w-full p-2.5 flex items-center justify-between text-left text-xs font-oxanium font-bold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    ✦ <span>NIVEL 2 · DOMINIO</span>
                  </span>
                  {openLevels.includes(2) ? (
                    <ChevronUp className="size-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="size-3.5 text-zinc-400" />
                  )}
                </button>
                <div
                  className={cn(
                    "px-3 pb-3 text-xs font-poppins text-zinc-300 leading-relaxed border-t border-zinc-800/40 pt-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar",
                    !openLevels.includes(2) && "hidden"
                  )}
                >
                  {quirkLevelTwo}
                </div>
              </div>
            )}

            {/* Level 3 */}
            {quirkLevelThree && (
              <div className="rounded-lg border border-zinc-800/80 bg-[#08090b] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLevel(3)}
                  className="w-full p-2.5 flex items-center justify-between text-left text-xs font-oxanium font-bold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    ✦ <span>NIVEL 3 · TRASCENDENCIA</span>
                  </span>
                  {openLevels.includes(3) ? (
                    <ChevronUp className="size-3.5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="size-3.5 text-zinc-400" />
                  )}
                </button>
                <div
                  className={cn(
                    "px-3 pb-3 text-xs font-poppins text-zinc-300 leading-relaxed border-t border-zinc-800/40 pt-2 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar",
                    !openLevels.includes(3) && "hidden"
                  )}
                >
                  {quirkLevelThree}
                </div>
              </div>
            )}
          </div>

          {/* Decorative Cybernetic Watermark concentric circles in bottom right corner */}
          <div className="absolute -bottom-10 -right-10 size-48 rounded-full border border-emerald-500/10 pointer-events-none flex items-center justify-center">
            <div className="size-36 rounded-full border border-emerald-500/10 flex items-center justify-center">
              <div className="size-24 rounded-full border border-emerald-500/10" />
            </div>
          </div>
        </div>

        {/* Right Column: Ocupación, Certificaciones, Bio-Telemetría Archive */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Box 1: OCUPACIÓN & FORMACIÓN */}
          <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 shadow-md">
            <CyberCorners color="border-emerald-500/50" />
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider mb-2.5">
              <Briefcase className="size-3.5 text-amber-400" />
              <span>OCUPACIÓN & FORMACIÓN</span>
            </div>

            <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-3">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-1">
                <span className="flex items-center gap-1 uppercase font-bold">
                  <GraduationCap className="size-3" /> ESCUELA
                </span>
                <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.2 rounded text-[9px] font-bold">
                  {resolvedClassGroup}
                </span>
              </div>
              <div className="text-base font-black font-oxanium text-white uppercase">
                {resolvedAcademicYear}
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                Clase: {resolvedClassGroup} · {resolvedSchool}
              </div>
            </div>
          </div>

          {/* Box 2: CERTIFICACIONES */}
          <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 shadow-md">
            <CyberCorners color="border-emerald-500/50" />
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider mb-2.5">
              <Award className="size-3.5 text-amber-400" />
              <span>CERTIFICACIONES</span>
            </div>

            {credentials.length > 0 ? (
              <div className="space-y-2">
                {credentials.map((cred: any, idx: number) => (
                  <div
                    key={cred.id || idx}
                    className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-oxanium">
                        <Scroll className="size-3 text-amber-400 shrink-0" />
                        <span>{cred.name}</span>
                      </span>
                      <span className="text-[9px] font-mono bg-amber-950/60 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                        {cred.kind || 'LICENCIA'}
                      </span>
                    </div>
                    {cred.description && (
                      <p className="text-[11px] font-poppins text-zinc-400 line-clamp-2 leading-relaxed">
                        {cred.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-3 text-center text-xs font-mono text-zinc-500">
                Sin certificaciones registradas.
              </div>
            )}
          </div>

          {/* Box 3: SYS.ARCHIVE // BIO-TELEMETRÍA */}
          <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-4 text-center overflow-hidden shadow-md">
            <CyberCorners color="border-emerald-500/50" />
            <Cpu className="size-5 text-emerald-500/40 mx-auto mb-1.5" />
            <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-widest block">
              SYS.ARCHIVE // BIO-TELEMETRÍA
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mt-0.5">
              REGISTRO CLASIFICADO • SERIAL: 0X00000{character?.id || 2}
            </span>

            {/* Bottom telemetry status bar */}
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-3 border-t border-zinc-800/70 mt-3">
              <span>SEC.NODE // 77-B</span>
              <span>SYNC // 97.0%</span>
              <span className="text-amber-400 font-bold">EXP: {resolvedExp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREENSHOT 2: 3-COLUMN BOTTOM ROW (HABILIDADES, RASGOS, DEBILIDADES)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HABILIDADES Panel */}
        <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2.5 shadow-md">
          <CyberCorners color="border-emerald-500/50" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider mb-2">
            <Activity className="size-3.5 text-emerald-400" />
            <span>HABILIDADES</span>
          </div>

          {skills.length > 0 ? (
            <div className="space-y-2">
              {skills.map((skill: any, idx: number) => {
                const lvl = Number(skill.level || 1);
                return (
                  <div
                    key={skill.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#08090b] border border-zinc-800/70"
                  >
                    <span className="text-xs font-bold text-zinc-200 uppercase font-oxanium flex items-center gap-1.5 truncate">
                      <span className="text-emerald-400">✦</span>
                      <span>{skill.name}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">
                        Nivel {lvl}
                      </span>
                      <div className="flex gap-1" title={`Nivel ${lvl}`}>
                        {[1, 2, 3, 4, 5].map((pip) => (
                          <div
                            key={pip}
                            className={cn(
                              "size-2 rounded-sm",
                              pip <= lvl
                                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                : "bg-zinc-800"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-3 text-center text-xs font-mono text-zinc-500">
              Sin habilidades registradas.
            </div>
          )}
        </div>

        {/* RASGOS Panel */}
        <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2.5 shadow-md">
          <CyberCorners color="border-emerald-500/50" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider mb-2">
            <Scroll className="size-3.5 text-emerald-400" />
            <span>RASGOS</span>
          </div>

          {traits.length > 0 ? (
            <div className="space-y-2">
              {traits.map((trait: any, idx: number) => (
                <div
                  key={trait.id || idx}
                  className="p-2.5 rounded-lg bg-[#08090b] border border-zinc-800/70 text-xs font-poppins text-zinc-300 leading-relaxed"
                >
                  <span className="text-emerald-400 font-bold mr-1.5 font-oxanium">
                    ✦ {trait.name} :
                  </span>
                  <span>{trait.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-3 text-center text-xs font-mono text-zinc-500">
              Sin rasgos registrados.
            </div>
          )}
        </div>

        {/* DEBILIDADES Panel */}
        <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-3.5 space-y-2.5 shadow-md">
          <CyberCorners color="border-rose-500/50" />
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider mb-2">
            <HeartCrack className="size-3.5 text-rose-400" />
            <span>DEBILIDADES</span>
          </div>

          {weaknesses.length > 0 ? (
            <div className="space-y-2">
              {weaknesses.map((weakness: any, idx: number) => (
                <div
                  key={weakness.id || idx}
                  className="p-2.5 rounded-lg bg-[#08090b] border border-zinc-800/70 text-xs font-poppins text-zinc-300 leading-relaxed"
                >
                  <span className="text-rose-400 font-bold mr-1.5 font-oxanium">
                    ✦ {weakness.name} :
                  </span>
                  <span>{weakness.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-3 text-center text-xs font-mono text-zinc-500">
              Sin debilidades registradas.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SCREENSHOT 1: BOTTOM 2-COLUMN SECTION (TÉCNICAS & INVENTARIO)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: TÉCNICAS */}
        <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-4 shadow-lg space-y-3">
          <CyberCorners color="border-emerald-500/50" />
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
              <Crosshair className="size-3.5 text-emerald-400" />
              <span>TÉCNICAS</span>
            </div>
            <span className="size-5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center justify-center">
              {techniques.length}
            </span>
          </div>

          {techniques.length > 0 ? (
            <div className="space-y-3">
              {techniques.map((tech: any, idx: number) => (
                <div
                  key={tech.id || idx}
                  className="rounded-lg bg-[#08090b] border border-zinc-800/80 p-3.5 space-y-2 shadow-sm"
                >
                  {/* Top: Name & Level Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black font-oxanium text-white uppercase flex items-center gap-1.5">
                      <span className="text-emerald-400">✦</span>
                      <span>{tech.name}</span>
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-bold uppercase">
                      NIVEL {tech.level || 1}
                    </span>
                  </div>

                  {/* Badges: CE, Type, Target Attribute */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-amber-950/40 border border-amber-500/40 text-amber-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                      {tech.cost} CE
                    </span>
                    <span className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                      {tech.type || 'DON / QUIRK'}
                    </span>
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                      ATR: {tech.target || 'FUE'}
                    </span>
                  </div>

                  {/* Description */}
                  {tech.description && (
                    <p className="text-xs text-zinc-400 font-poppins leading-relaxed">
                      {tech.description}
                    </p>
                  )}

                  {/* Mechanical Description Box */}
                  {(tech.autoDescription || tech.mechanicalDescription) && (
                    <div className="bg-[#0c0d10] border border-emerald-900/30 rounded p-2.5 space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        <Sparkles className="size-3 text-emerald-400" />
                        <span>DESCRIPCIÓN MECÁNICA:</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-poppins leading-relaxed">
                        {tech.autoDescription || tech.mechanicalDescription}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#08090b] border border-zinc-800/70 p-4 text-center text-xs font-mono text-zinc-500">
              Sin técnicas registradas.
            </div>
          )}
        </div>

        {/* Right Column: INVENTARIO */}
        <div className="relative rounded-xl border border-zinc-800/80 bg-[#0e1013] p-4 shadow-lg space-y-3 min-h-[300px]">
          <CyberCorners color="border-emerald-500/50" />
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-200 uppercase tracking-wider">
              <Package className="size-3.5 text-emerald-400" />
              <span>INVENTARIO</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {possessions.length} OBJETO{possessions.length === 1 ? '' : 'S'}
            </span>
          </div>

          {/* 5-Slot Grid as in Screenshot 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const item = possessions[slotIdx];

              if (item) {
                return (
                  <div
                    key={item.id || slotIdx}
                    className="h-32 rounded-lg bg-[#08090b] border border-zinc-800/80 p-2 flex flex-col justify-between text-center relative group hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between w-full">
                      {item.equipped && (
                        <span className="text-[8px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 px-1 rounded uppercase">
                          Equipado
                        </span>
                      )}
                      {Number(item.quantity || 1) > 1 && (
                        <span className="text-[8px] font-mono text-zinc-400 ml-auto">
                          x{item.quantity}
                        </span>
                      )}
                    </div>

                    <div className="my-auto">
                      <ItemIcon item={item} className="size-5 text-zinc-500 mx-auto mb-1 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-[11px] font-oxanium font-bold text-zinc-200 line-clamp-2 uppercase">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">
                      {item.kind || 'Objeto'}
                    </span>
                  </div>
                );
              }

              // Empty slot (VACÍO)
              return (
                <div
                  key={`empty-${slotIdx}`}
                  className="h-32 rounded-lg bg-[#08090b] border border-zinc-850/60 flex items-center justify-center p-2 text-center"
                >
                  <span className="text-zinc-600 font-mono text-xs uppercase tracking-widest font-bold">
                    VACÍO
                  </span>
                </div>
              );
            })}
          </div>

          {/* Extra items beyond 5 if present */}
          {possessions.length > 5 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-zinc-800/40">
              {possessions.slice(5).map((item: any, idx: number) => (
                <div
                  key={item.id || idx + 5}
                  className="h-32 rounded-lg bg-[#08090b] border border-zinc-800/80 p-2 flex flex-col justify-between text-center relative group hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between w-full">
                    {item.equipped && (
                      <span className="text-[8px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 px-1 rounded uppercase">
                        Equipado
                      </span>
                    )}
                    {Number(item.quantity || 1) > 1 && (
                      <span className="text-[8px] font-mono text-zinc-400 ml-auto">
                        x{item.quantity}
                      </span>
                    )}
                  </div>

                  <div className="my-auto">
                    <ItemIcon item={item} className="size-5 text-zinc-500 mx-auto mb-1 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-[11px] font-oxanium font-bold text-zinc-200 line-clamp-2 uppercase">
                      {item.name}
                    </span>
                  </div>

                  <span className="text-[8px] font-mono text-zinc-500 uppercase truncate">
                    {item.kind || 'Objeto'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FOOTER: FICHA PÚBLICA DE SÓLO LECTURA · SHADOWMORE OS
          ========================================================================= */}
      <footer className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 py-6 border-t border-zinc-800/60 mt-4">
        FICHA PÚBLICA DE SÓLO LECTURA · SHADOWMORE OS
      </footer>
    </main>
  );
}
