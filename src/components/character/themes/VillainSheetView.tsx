import React from 'react';
import {
  Heart,
  Zap,
  Shield,
  Activity,
  Award,
  BookOpen,
  Sparkles,
  User,
  Backpack,
  Bookmark,
  Swords,
  Scroll,
  Pencil,
  Skull,
  Flame,
  Droplets,
  HeartCrack,
  Dna,
  ShieldAlert,
  Crosshair,
  BadgeAlert,
  FileWarning,
  Radio,
  Terminal,
  Fingerprint,
  Compass,
  FileText,
  Briefcase,
  Coins,
  Layers,
  Search,
  Slash,
} from 'lucide-react';
import { StatsHexagon, HexStat } from '../HexagonRadarChart';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
import { CANONICAL_STAT_ICONS } from '@/domain/canonicalStatIcons';
import { readValue } from '@/domain/characterSheetViewModel';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface VillainSheetViewProps {
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
  quirk?: {
    name: string;
    type: string;
    evolution: string;
    description: string;
    levelOne: string;
    levelTwo?: string | null;
    levelThree?: string | null;
  };
  resources?: {
    reputation: any;
    yen: any;
    exp: any;
    plusUltra: number;
    currentHealth: number;
    maxHealth: number;
    currentStamina: number;
    maxStamina: number;
  };
  combatStatus?: {
    evasion: number;
    courage: number;
    physicalDamageText: string;
    rangeDamageText: string;
    damageReductionText: string;
    initiativeText: string;
    modFuerza?: number;
    modDestreza?: number;
  };
  reputation?: any;
  yen?: any;
  exp?: any;
  plusUltra?: number;
  currentHealth?: number;
  maxHealth?: number;
  currentStamina?: number;
  maxStamina?: number;
  evasion?: number;
  courage?: number;
  physicalDamageText?: string;
  rangeDamageText?: string;
  damageReductionText?: string;
  initiativeText?: string;
  modFuerza?: number;
  modDestreza?: number;
  baseAttributes: HexStat[];
  defenseList?: any[];
  combatStatusList?: any[];
  personalDataList?: any[];
  traits?: any[];
  weaknesses?: any[];
  skills?: any[];
  credentials?: any[];
  techniques?: any[];
  possessions?: any[];
  biography?: string;
  character?: any;
  profile?: any;
  employments?: any[];
}

export function VillainSheetView({
  fullName,
  alias,
  avatar,
  group,
  groupColor,
  status,
  basicStage,
  quirkName,
  quirkType,
  quirkEvolution,
  quirkDescription,
  quirkLevelOne,
  quirkLevelTwo,
  quirkLevelThree,
  quirk,
  resources,
  combatStatus,
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
}: VillainSheetViewProps) {
  // Color configuration: strictly derived from Villains faction token or passed color
  const accentColor = groupColor || 'var(--villanos, #e11d48)';

  const resolvedPlusUltra = Number(
    resources?.plusUltra ??
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

  const resolvedYen = resources?.yen ?? yen ?? character?.yen ?? profile?.yen ?? 0;
  const resolvedExp = resources?.exp ?? exp ?? character?.exp ?? profile?.exp ?? 0;
  const resolvedReputation = resources?.reputation ?? reputation ?? profile?.reputation ?? profile?.reputacion ?? null;

  const qName = quirk?.name || quirkName || 'Sin don registrado';
  const qType = quirk?.type || quirkType || '';
  const qEvolution = quirk?.evolution || quirkEvolution || '';
  const qDescription = quirk?.description || quirkDescription || 'No se ha registrado información sobre este don.';
  const qLevelOne = quirk?.levelOne || quirkLevelOne || 'Sin descripción de nivel.';
  const qLevelTwo = quirk?.levelTwo ?? quirkLevelTwo ?? null;
  const qLevelThree = quirk?.levelThree ?? quirkLevelThree ?? null;

  const resolvedHealth = resources?.currentHealth ?? currentHealth ?? 20;
  const resolvedMaxHealth = resources?.maxHealth ?? maxHealth ?? 20;
  const resolvedStamina = resources?.currentStamina ?? currentStamina ?? 20;
  const resolvedMaxStamina = resources?.maxStamina ?? maxStamina ?? 20;

  const resolvedEvasion = combatStatus?.evasion ?? evasion ?? Number(defenseList[0]?.value || 0);
  const resolvedCourage = combatStatus?.courage ?? courage ?? Number(defenseList[1]?.value || 0);
  const resolvedPhysicalDamage = combatStatus?.physicalDamageText ?? physicalDamageText ?? String(combatStatusList[0]?.value || '1D4');
  const resolvedRangeDamage = combatStatus?.rangeDamageText ?? rangeDamageText ?? String(combatStatusList[1]?.value || '1D4');
  const resolvedDamageReduction = combatStatus?.damageReductionText ?? damageReductionText ?? String(combatStatusList[2]?.value || '0');
  const resolvedInitiative = combatStatus?.initiativeText ?? initiativeText ?? String(combatStatusList[3]?.value || '0');

  // Compute modifiers
  const fueStat = baseAttributes.find((a) => a.key === 'FUE' || a.label?.toLowerCase().startsWith('fue') || a.label?.toLowerCase().includes('fuerza'));
  const desStat = baseAttributes.find((a) => a.key === 'DES' || a.label?.toLowerCase().startsWith('des') || a.label?.toLowerCase().includes('destreza'));
  const rawFue = readValue(profile, ['FUE', 'fue', 'fuerza']) ?? character?.profileData?.FUE ?? character?.FUE;
  const rawDes = readValue(profile, ['DES', 'des', 'destreza']) ?? character?.profileData?.DES ?? character?.DES;
  const resolvedModFuerza = modFuerzaProp ?? combatStatus?.modFuerza ?? (fueStat ? Math.floor(Number(fueStat.value ?? fueStat.base ?? 0) / 2) : (rawFue !== undefined && rawFue !== null && rawFue !== '' ? Math.floor(Number(rawFue || 0) / 2) : 0));
  const resolvedModDestreza = modDestrezaProp ?? combatStatus?.modDestreza ?? (desStat ? Math.floor(Number(desStat.value ?? desStat.base ?? 0) / 2) : (rawDes !== undefined && rawDes !== null && rawDes !== '' ? Math.floor(Number(rawDes || 0) / 2) : 0));

  // Helper to extract specific personal fields cleanly without fake mock defaults
  const getPersonalField = (labelPattern: string) => {
    const item = personalDataList.find((p) =>
      p.label?.toLowerCase().includes(labelPattern.toLowerCase())
    );
    return item?.value && item.value !== 'No especificada' && item.value !== 'No especificado' && item.value !== '—'
      ? item.value
      : null;
  };

  const apodo = alias && alias !== 'Sin alias' ? alias : (profile?.nickname || profile?.apodo || 'Sin alias');
  const edad = getPersonalField('edad') || (profile?.basic_age ? `${profile.basic_age} años` : 'No especificada');
  const cumpleanos = getPersonalField('cumple') || getPersonalField('nacimiento') || profile?.birth_date || 'No especificado';
  const genero = getPersonalField('género') || getPersonalField('genero') || profile?.gender || 'No especificado';
  const tipoSangre = getPersonalField('sangre') || profile?.blood_type || 'No especificado';
  const alineacion = getPersonalField('alineaci') || profile?.alignment || 'No especificada';
  const grupoText = displayValue(group, 'Villanos');
  const afiliacion = profile?.afiliacion || profile?.affiliation || grupoText;
  const ocupacion = getPersonalField('ocupaci') || profile?.occupation || 'No especificada';
  const nacionalidad = getPersonalField('nacionalidad') || profile?.nationality || 'Japonesa';

  // Character quote if explicitly present in profile
  const characterQuote = profile?.quote || profile?.frase || profile?.lema || null;

  return (
    <main
      className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-16 space-y-6 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white"
      style={{
        '--villain-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* =========================================================================
          UNDERGROUND GRUNGE BANNER / CHAOTIC EDITORIAL STRIP
          ========================================================================= */}
      <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 text-[11px] font-mono tracking-widest text-zinc-400 uppercase relative">
        {/* Pure CSS Dynamic Splatter Mask in Header Background */}
        <div
          className="absolute -top-4 -left-4 w-40 h-20 opacity-20 pointer-events-none"
          style={{
            WebkitMaskImage: 'var(--splatters)',
            maskImage: 'var(--splatters)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))',
          }}
        />

        <div className="flex items-center gap-2 relative z-10">
          <span
            className="px-2.5 py-0.5 font-black text-xs text-white uppercase rounded-xs shadow-[2px_2px_0px_#000] -rotate-1 tracking-wider inline-block"
            style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
          >
            {grupoText}
          </span>
          <span className="font-bold text-zinc-300 tracking-wider">UNDERGROUND CHAOTIC EDITORIAL</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-zinc-500 font-mono text-[10px]">
          <span>ESTADO: {status || 'ACTIVO'}</span>
          <span>·</span>
          <span>{basicStage || 'Rango'}</span>
        </div>
      </div>

      {/* =========================================================================
          PANEL 1: IDENTITY / COVER COLLAGE (AVATAR + PERSONAL METADATA)
          ========================================================================= */}
      <div className="relative rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Pure CSS Masked Splatter Texture Overlay (Recolored with dynamic Villain accent) */}
        <div
          className="absolute top-0 right-0 w-96 h-96 opacity-15 pointer-events-none"
          style={{
            WebkitMaskImage: 'var(--splatters)',
            maskImage: 'var(--splatters)',
            WebkitMaskSize: 'cover',
            maskSize: 'cover',
            WebkitMaskPosition: 'top right',
            maskPosition: 'top right',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))',
          }}
        />

        {/* Pure CSS Grain Texture */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            WebkitMaskImage: 'var(--bggrain)',
            maskImage: 'var(--bggrain)',
            WebkitMaskSize: 'cover',
            maskSize: 'cover',
            backgroundColor: '#ffffff',
          }}
        />

        {/* Angled Accent Trim */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch relative z-10">
          
          {/* 1. LEFT: Character Avatar Portrait with Distressed Collage Framing */}
          <div className="lg:col-span-4 flex flex-col items-center justify-between">
            <div className="w-full max-w-[280px] relative">
              {/* Distressed Tape & Frame Container */}
              <div className="relative rounded-lg border-2 border-zinc-800 bg-[#121116] p-2.5 shadow-[4px_4px_0px_#000] group overflow-hidden">
                {/* Decorative Masking Tape at Top Corner */}
                <div className="absolute -top-3 left-6 w-16 h-6 bg-zinc-700/50 -rotate-3 border border-zinc-600/60 pointer-events-none z-30" />

                {/* Corner Marks */}
                <div
                  className="absolute top-2 left-2 size-3 border-t-2 border-l-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                />
                <div
                  className="absolute top-2 right-2 size-3 border-t-2 border-r-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                />
                <div
                  className="absolute bottom-12 left-2 size-3 border-b-2 border-l-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                />
                <div
                  className="absolute bottom-12 right-2 size-3 border-b-2 border-r-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                />

                {/* Photo Image */}
                <div className="relative aspect-[3/4] w-full rounded bg-[#070709] overflow-hidden border border-zinc-900">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={fullName}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter contrast-115 brightness-95"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-[#09080c]">
                      <Skull
                        className="size-16 mb-2 opacity-60 animate-pulse"
                        style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                      />
                      <span className="font-mono text-[10px] tracking-widest text-zinc-400 font-bold uppercase text-center px-4">
                        SUJETO // SIN FOTO
                      </span>
                    </div>
                  )}

                  {/* Stamp Overlay */}
                  <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-xs text-zinc-200 px-2 py-0.5 rounded-xs border border-zinc-700 text-[9px] font-mono tracking-widest uppercase shadow-[2px_2px_0px_#000]">
                    {grupoText} · {basicStage || 'ACTIVO'}
                  </div>
                </div>

                {/* Bottom Moniker & Barcode Strip */}
                <div className="mt-2.5 pt-1.5 px-1 flex items-center justify-between border-t border-zinc-800 text-zinc-300">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono tracking-wider font-bold text-zinc-200">
                      {fullName}
                    </span>
                    <span className="text-[8px] font-mono tracking-widest text-zinc-500">
                      |||| | |||| ||| |||
                    </span>
                  </div>
                  <span
                    className="font-oxanium font-black text-sm tracking-wider uppercase drop-shadow-[2px_2px_0px_#000]"
                    style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                  >
                    {alias && alias !== 'Sin alias' ? alias : fullName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. RIGHT: Identity Details & Personal Data Table */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs text-white text-xs font-mono font-bold tracking-widest uppercase shadow-[3px_3px_0px_#000] border border-black"
                    style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                  >
                    <Skull className="size-3.5" />
                    <span>{grupoText}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 bg-[#15141a] px-2 py-0.5 rounded-xs border border-zinc-800 shadow-[2px_2px_0px_#000]">
                    ESTADO // {status || 'ACTIVO'}
                  </span>
                </div>
                {/* Abstract Graphic Filler */}
                <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-zinc-400 uppercase">
                  <span>/// CHAOS-MATRIX-01</span>
                </div>
              </div>

              {/* Full Name & Alias */}
              <div>
                <h1 className="font-oxanium font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-white drop-shadow-[3px_3px_0px_#000] leading-none">
                  {fullName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className="font-mono text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                  >
                    {alias && alias !== 'Sin alias' ? `[ ALIAS: ${alias} ]` : `[ ${fullName} ]`}
                  </p>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[11px] font-mono text-zinc-400">{basicStage || 'Novato'}</span>
                </div>
              </div>

              {/* Personal Information Grid */}
              <div className="rounded-lg bg-[#111015] border-2 border-zinc-800 p-2 text-xs font-oxanium shadow-[3px_3px_0px_#000]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 divide-y sm:divide-y-0 divide-zinc-800/60">
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">APODO</span>
                    <span className="font-bold text-zinc-100">{apodo}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">EDAD</span>
                    <span className="font-bold text-zinc-100">{edad}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">CUMPLEAÑOS</span>
                    <span className="font-bold text-zinc-100">{cumpleanos}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">GÉNERO</span>
                    <span className="font-bold text-zinc-100">{genero}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">GRUPO SANGUÍNEO</span>
                    <span className="font-bold text-zinc-100">{tipoSangre}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">ALINEACIÓN</span>
                    <span className="font-bold text-zinc-100">{alineacion}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">FACCIÓN / GRUPO</span>
                    <span className="font-bold flex items-center gap-1" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}>
                      <Skull className="size-3" />
                      {grupoText}
                    </span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">AFILIACIÓN</span>
                    <span className="font-bold text-zinc-100">{afiliacion}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b sm:border-b-0 border-zinc-800/60">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">OCUPACIÓN</span>
                    <span className="font-bold text-zinc-100">{ocupacion}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">NACIONALIDAD</span>
                    <span className="font-bold text-zinc-100">{nacionalidad}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Quote card or Graphic Distressed Strip */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
              {characterQuote ? (
                <div className="flex-1 relative rounded-lg bg-[#141218] border-2 border-zinc-800 p-3 shadow-[3px_3px_0px_#000]">
                  <div
                    className="absolute -top-2 left-4 px-2 py-0.2 bg-black border border-zinc-700 text-[8px] font-mono uppercase font-bold tracking-widest rounded-xs"
                    style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                  >
                    MANIFIESTO
                  </div>
                  <p className="font-sans italic text-sm text-zinc-300 text-left tracking-wide leading-relaxed pt-1">
                    “{characterQuote}”
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-lg bg-[#121116] border-2 border-zinc-800 p-2.5 flex items-center gap-3 shadow-[3px_3px_0px_#000]">
                  <Flame className="size-4 shrink-0" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                  <span className="text-[10px] font-mono text-zinc-400 leading-snug">
                    UNDERGROUND DISRUPTIVE NETWORK // IDENTIDAD AL MARGEN DE LA SOCIEDAD
                  </span>
                </div>
              )}

              {/* Graphic Decorative Filler Block */}
              <div className="shrink-0 flex items-center justify-center px-3 py-2 rounded-lg bg-black border-2 border-zinc-800 text-center shadow-[3px_3px_0px_#000]">
                <div
                  className="text-[9px] font-mono font-bold uppercase tracking-widest"
                  style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                >
                  SECTOR // UNDERGROUND
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          PANEL 2: MATRIZ DE RENDIMIENTO (RADAR + ATRIBUTOS BASE + DERIVADAS)
          ========================================================================= */}
      <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] space-y-5 relative overflow-hidden">
        {/* Masked Splatter Background Accent */}
        <div
          className="absolute -bottom-10 -right-10 w-72 h-72 opacity-15 pointer-events-none"
          style={{
            WebkitMaskImage: 'var(--splatters)',
            maskImage: 'var(--splatters)',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))',
          }}
        />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-800 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <Flame className="size-5" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
            <div>
              <h2 className="text-base font-black font-oxanium uppercase text-white tracking-wider">
                ESTADÍSTICAS & MATRIZ DE COMBATE
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                PROYECCIÓN RADAR DE 6 VÉRTICES, ATRIBUTOS Y PARÁMETROS DERIVADOS
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase border border-zinc-700 px-2 py-0.5 rounded-xs bg-black text-zinc-300 shadow-[2px_2px_0px_#000]">
            RADAR // 6-AXIS
          </span>
        </div>

        {/* 2-Column Balanced Grid: Hexagon Radar Chart with Attributes on Left (5 cols), Combat & Derived Stats on Right (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-10">
          
          {/* 1. Radar Chart & Base Attributes Column */}
          <div className="lg:col-span-5 rounded-lg border-2 border-zinc-800 bg-[#111015] p-4 flex flex-col justify-between relative overflow-hidden shadow-[4px_4px_0px_#000] space-y-3">
            <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2 px-1">
              <span
                className="text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
              >
                <Crosshair className="size-3.5" />
                RADAR & ATRIBUTOS BASE
              </span>
              <span className="text-[9px] font-mono text-zinc-400 bg-black px-1.5 py-0.5 rounded border border-zinc-800">
                6 ATRIBUTOS
              </span>
            </div>

            <div className="w-full flex-1 flex items-center justify-center p-1">
              <StatsHexagon
                stats={baseAttributes}
                theme="villain"
                accentColor="var(--villanos, #e11d48)"
              />
            </div>
          </div>

          {/* 2. Combat, Derived Stats & Telemetry Column */}
          <div className="lg:col-span-7 rounded-lg border-2 border-zinc-800 bg-[#111015] p-4 flex flex-col justify-between space-y-4 shadow-[4px_4px_0px_#000]">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span
                  className="text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                >
                  <Shield className="size-3.5" />
                  ESTADÍSTICAS DERIVADAS & COMBATE
                </span>
                <span className="text-[9px] font-mono text-zinc-400">PARÁMETROS FINALES</span>
              </div>

              {/* Top 4 Metrics: Salud, Estamina, Evasión, Coraje */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
                {/* SALUD */}
                <div className="p-3 rounded bg-[#16151c] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Heart className="size-3.5 text-rose-500 fill-rose-500/30" />
                    <span>SALUD</span>
                  </div>
                  <span className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedHealth}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    MAX {resolvedMaxHealth}
                  </span>
                </div>

                {/* ESTAMINA */}
                <div className="p-3 rounded bg-[#16151c] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Zap className="size-3.5" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                    <span>ESTAMINA</span>
                  </div>
                  <span className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedStamina}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    MAX {resolvedMaxStamina}
                  </span>
                </div>

                {/* EVASIÓN */}
                <div className="p-3 rounded bg-[#16151c] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <CANONICAL_STAT_ICONS.evasion className="size-3.5 text-zinc-300" />
                    <span>EVASIÓN</span>
                  </div>
                  <span className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedEvasion}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    DEFENSA
                  </span>
                </div>

                {/* CORAJE */}
                <div className="p-3 rounded bg-[#16151c] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <CANONICAL_STAT_ICONS.courage className="size-3.5 text-zinc-300" />
                    <span>CORAJE</span>
                  </div>
                  <span className="text-2xl font-black font-oxanium text-white mt-0.5">
                    {resolvedCourage}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    TEMPLE
                  </span>
                </div>
              </div>

              {/* Bottom 4 Combat Statuses: Daño Físico, Daño Rango, RD, Iniciativa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-oxanium">
                <div className="p-2.5 rounded bg-[#141319] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.physicalDamage className="size-3 text-zinc-300" />
                    <span>DAÑO FÍSICO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedPhysicalDamage}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Mod: {resolvedModFuerza > 0 ? `+${resolvedModFuerza}` : String(resolvedModFuerza)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#141319] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.rangeDamage className="size-3 text-zinc-300" />
                    <span>DAÑO RANGO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedRangeDamage}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Mod: {resolvedModDestreza > 0 ? `+${resolvedModDestreza}` : String(resolvedModDestreza)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#141319] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.damageReduction className="size-3 text-zinc-300" />
                    <span>REDUCCIÓN DAÑO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedDamageReduction}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Armadura</span>
                </div>
                <div className="p-2.5 rounded bg-[#141319] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.initiative className="size-3 text-zinc-300" />
                    <span>INICIATIVA</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedInitiative}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Reacción</span>
                </div>
              </div>

              {/* Modificadores de Atributo (Fuerza y Destreza) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-oxanium">
                <div className="p-2.5 rounded bg-[#141319] h-20 border-2 border-zinc-800 flex items-center justify-between shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <CANONICAL_STAT_ICONS.modFuerza className="size-5.5 text-zinc-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block">
                        Modificador de Fuerza
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 block">Bono CQC / Melee (FUE)</span>
                    </div>
                  </div>
                  <span className="font-black text-lg text-zinc-100 font-mono ml-2">
                    {resolvedModFuerza > 0 ? `+${resolvedModFuerza}` : String(resolvedModFuerza)}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#141319] border-2 border-zinc-800 flex items-center justify-between shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <CANONICAL_STAT_ICONS.modDestreza className="size-5.5 text-zinc-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block">
                        Modificador de Destreza
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 block">Bono Distancia / Precisión (DES)</span>
                    </div>
                  </div>
                  <span className="font-black text-lg text-zinc-100 font-mono ml-2">
                    {resolvedModDestreza > 0 ? `+${resolvedModDestreza}` : String(resolvedModDestreza)}
                  </span>
                </div>
              </div>
            </div>

            {/* Resources & Field Telemetry Panel (100% Real Canonical Data) */}
            <div className="rounded bg-[#141319] border-2 border-zinc-800 p-3 space-y-2.5 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-zinc-800 pb-1.5">
                <span
                  className="font-bold flex items-center gap-1.5"
                  style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                >
                  <Coins className="size-3" />
                  RECURSOS & TELEMETRÍA OPERATIVA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#0e0d13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">FONDOS // YEN</span>
                  <span className="font-bold text-zinc-200">¥{Number(resolvedYen).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded bg-[#0e0d13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">EXPERIENCIA // EXP</span>
                  <span className="font-bold text-zinc-200">{resolvedExp} EXP</span>
                </div>
                <div className="p-2 rounded bg-[#0e0d13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">PLUS ULTRA // PTS</span>
                  <span className="font-bold text-zinc-200">{resolvedPlusUltra} PTS</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
                <span>VILLAIN.SYS // UNDERGROUND-GRID</span>
                <span className="tracking-widest">|||| ||||| || ||||</span>
              </div>
            </div>

          </div>

        </div>

        {/* Legend strip for Modifiers, Rasgos, Equipamiento */}
        <div className="border-t-2 border-zinc-800 pt-2 px-1 relative z-10">
          <ModifierNotesLegend className="text-zinc-400" />
        </div>

      </div>

      {/* =========================================================================
          PANEL 3: HABILIDADES & QUIRK
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* QUIRK (Right 7 cols) */}
        <div className="lg:col-span-12 rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Skull className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                QUIRK / DON
              </h3>
            </div>
            {qEvolution && (
              <span className="text-[10px] font-mono text-zinc-400">
                {qEvolution}
              </span>
            )}
          </div>

          {/* Quirk Title & Type */}
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className="text-lg sm:text-xl font-black font-oxanium tracking-wide uppercase drop-shadow-[2px_2px_0px_#000]"
              style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
            >
              {qName}
            </h4>
            {qType && (
              <span className="text-[11px] font-mono font-bold text-zinc-200 bg-black px-2.5 py-0.5 rounded-xs border border-zinc-700 shadow-[2px_2px_0px_#000]">
                Tipo: {qType}
              </span>
            )}
          </div>

          {/* Quirk Main Description */}
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            {qDescription}
          </p>

          {/* 3-Column Quirk Evolution Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* NIVEL 1 · DESPERTAR */}
            <div className="p-3 rounded bg-[#141218] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                <span>NIVEL 1 · DESPERTAR</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelOne}
              </p>
            </div>

            {/* NIVEL 2 · DOMINIO */}
            <div className="p-3 rounded bg-[#141218] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                <span>NIVEL 2 · DOMINIO</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelTwo || 'En desarrollo / No alcanzado'}
              </p>
            </div>

            {/* NIVEL 3 · PLUS ULTRA */}
            <div className="p-3 rounded bg-[#141218] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                <span>NIVEL 3 · TRASCENDENCIA</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelThree || 'Sin despertar / No alcanzado'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          PANEL 4: RASGOS & DEBILIDADES
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* HABILIDADES (Left 5 cols) */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5 mb-3">
              <BookOpen className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                HABILIDADES
              </h3>
            </div>

            {skills && skills.length > 0 ? (
              <div className="rounded-lg bg-[#111015] border-2 border-zinc-800 divide-y divide-zinc-800 overflow-hidden shadow-[2px_2px_0px_#000]">
                {skills.map((skill: any, idx: number) => {
                  const sName = skill.name || skill.title || `Habilidad #${idx + 1}`;
                  const sLevel = skill.level || skill.quantity || 1;
                  const sDesc = skill.description || '';

                  return (
                    <div
                      key={skill.id || idx}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-oxanium text-xs font-semibold text-zinc-200 block truncate">
                          {sName}
                        </span>
                        {sDesc && (
                          <span className="text-[10px] text-zinc-400 font-sans block truncate">
                            {sDesc}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-black font-oxanium px-2 py-0.5 rounded-xs border border-zinc-700 shrink-0 shadow-[1px_1px_0px_#000]"
                        style={{ backgroundColor: 'black', color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                      >
                        Nivel {sLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic p-3 text-center">Sin habilidades registradas.</p>
            )}
          </div>
        </div>
        
        {/* RASGOS */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5">
            <div
              className="size-4.5 rounded-xs flex items-center justify-center font-black text-xs text-white border border-black shadow-[1px_1px_0px_#000]"
              style={{ backgroundColor: 'var(--villain-accent, var(--villanos, #e11d48))' }}
            >
              +
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              RASGOS
            </h3>
          </div>

          {traits && traits.length > 0 ? (
            <div className="space-y-2.5">
              {traits.map((t: any, idx: number) => {
                const tName = t?.name || t?.title || (typeof t === 'string' ? t : `Rasgo #${idx + 1}`);
                const tDesc = t?.description || t?.desc || '';

                return (
                  <div
                    key={t?.id || idx}
                    className="p-3 rounded bg-[#131218] border-2 border-zinc-800 flex items-start gap-3 shadow-[2px_2px_0px_#000]"
                  >
                    <div className="p-1.5 rounded bg-black border border-zinc-700 text-zinc-200 shrink-0 mt-0.5">
                      <Sparkles className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {tName}
                      </h4>
                      {tDesc && (
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          {tDesc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-2">Sin rasgos especiales registrados.</p>
          )}
        </div>

        {/* DEBILIDADES */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5">
            <div className="size-4.5 rounded-xs bg-zinc-800 border border-zinc-700 flex items-center justify-center text-rose-400 font-black text-xs shadow-[1px_1px_0px_#000]">
              -
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              DEBILIDADES
            </h3>
          </div>

          {weaknesses && weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map((w: any, idx: number) => {
                const wName = w?.name || w?.title || (typeof w === 'string' ? w : `Debilidad #${idx + 1}`);
                const wDesc = w?.description || w?.desc || '';

                return (
                  <div
                    key={w?.id || idx}
                    className="p-3 rounded bg-[#131218] border-2 border-zinc-800 flex items-start gap-3 shadow-[2px_2px_0px_#000]"
                  >
                    <div className="p-1.5 rounded bg-black border border-zinc-700 text-rose-400 shrink-0 mt-0.5">
                      <Droplets className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {wName}
                      </h4>
                      {wDesc && (
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          {wDesc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-2">Sin debilidades registradas.</p>
          )}
        </div>

      </div>

      {/* =========================================================================
          PANEL 5: TÉCNICAS & INVENTARIO
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* TÉCNICAS */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Swords className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                TÉCNICAS
              </h3>
            </div>
            {techniques && techniques.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-400">
                {techniques.length} ACTIVAS
              </span>
            )}
          </div>

          {techniques && techniques.length > 0 ? (
            <div className="space-y-3">
              {techniques.map((tech: any, idx: number) => {
                const tName = tech?.name || tech?.title || `Técnica #${idx + 1}`;
                const tCost = tech?.cost || tech?.staminaCost || null;
                const tType = tech?.type || tech?.classification || 'Ofensiva';
                const tDesc = tech?.description || '';
                const autoDesc = tech?.autoDescription || tech?.mechanicalDesc || '';

                return (
                  <div
                    key={tech?.id || idx}
                    className="p-3 rounded bg-[#131218] border-2 border-zinc-800 flex items-start gap-3 relative shadow-[2px_2px_0px_#000]"
                  >
                    {/* Thumbnail / Icon */}
                    <div className="size-11 rounded bg-black border border-zinc-700 shrink-0 flex items-center justify-center">
                      <Skull className="size-5" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
                    </div>

                    {/* Technique Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                            {tName}
                          </h4>
                          {tType && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-xs bg-black text-zinc-300 border border-zinc-700 uppercase">
                              {tType}
                            </span>
                          )}
                        </div>

                        {tCost && (
                          <span
                            className="text-xs font-black font-oxanium bg-black px-2 py-0.5 rounded-xs border border-zinc-700 shrink-0"
                            style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                          >
                            CE {String(tCost).replace(/[^0-9]/g, '') || tCost}
                          </span>
                        )}
                      </div>

                      {tDesc && (
                        <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                          {tDesc}
                        </p>
                      )}

                      {autoDesc && (
                        <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                          {autoDesc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-2">Sin técnicas de combate registradas.</p>
          )}
        </div>

        {/* INVENTARIO */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Backpack className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                INVENTARIO
              </h3>
            </div>
            {possessions && possessions.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-400">
                {possessions.length} OBJETOS
              </span>
            )}
          </div>

          {possessions && possessions.length > 0 ? (
            <div className="space-y-2.5">
              {possessions.map((item: any, idx: number) => {
                const iName = item?.element?.name || item?.name || item?.title || `Objeto #${idx + 1}`;
                const iQty = item?.possession?.quantity ?? item?.quantity ?? 1;
                const isEquipped = Boolean(item?.possession?.equipped || item?.equipped);
                const iCategory = item?.element?.category || item?.category || item?.element?.kind || 'General';

                return (
                  <div
                    key={item?.id || idx}
                    className="p-2.5 rounded bg-[#131218] border-2 border-zinc-800 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded bg-black border border-zinc-700 shrink-0 flex items-center justify-center text-zinc-300">
                        <Bookmark className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-oxanium text-xs font-bold text-white truncate uppercase block">
                            {iName}
                          </span>
                          {iQty > 1 && (
                            <span className="text-[9px] font-mono font-bold bg-black text-zinc-300 px-1 py-0.2 rounded-xs border border-zinc-700">
                              x{iQty}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 block truncate">
                          {iCategory}
                        </span>
                      </div>
                    </div>

                    {isEquipped && (
                      <span
                        className="text-[9px] font-mono font-bold bg-black px-2 py-0.5 rounded-xs border border-zinc-700 uppercase shrink-0"
                        style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }}
                      >
                        Equipado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic p-2">Sin objetos en inventario.</p>
          )}
        </div>

      </div>

      {/* =========================================================================
          PANEL 6: LICENCIAS, CERTIFICACIONES & ACTIVOS CLANDESTINOS
          ========================================================================= */}
      <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <BadgeAlert className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              LICENCIAS, CERTIFICACIONES & ACTIVOS CLANDESTINOS
            </h3>
          </div>
          {credentials && credentials.length > 0 && (
            <span className="text-[10px] font-mono text-zinc-400">
              {credentials.length} REGISTRADOS
            </span>
          )}
        </div>

        {credentials && credentials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {credentials.map((cred: any, idx: number) => {
              const cName = cred?.element?.name || cred?.name || cred?.title || `Documento #${idx + 1}`;
              const cDesc = cred?.element?.description || cred?.description || '';
              const cKind = cred?.element?.kind || cred?.kind || 'Licencia / Activo';
              return (
                <div
                  key={cred?.id || idx}
                  className="p-3 rounded bg-[#131218] border-2 border-zinc-800 space-y-1.5 flex flex-col justify-between shadow-[2px_2px_0px_#000]"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {cName}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-xs bg-black text-zinc-300 border border-zinc-700 shrink-0">
                        {cKind}
                      </span>
                    </div>
                    {cDesc && (
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-sans line-clamp-3">
                        {cDesc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic p-2">
            Sin licencias, certificaciones ni activos clandestinos registrados.
          </p>
        )}
      </div>

      {/* =========================================================================
          PANEL 7: ANTECEDENTES / HISTORIAL & EMPLEOS (SI EXISTEN)
          ========================================================================= */}
      {(biography || (employments && employments.length > 0)) && (
        <div className="rounded-xl border-2 border-zinc-900 bg-[#09090c] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2">
            <FileWarning className="size-4" style={{ color: 'var(--villain-accent, var(--villanos, #e11d48))' }} />
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              HISTORIAL // ANTECEDENTES
            </h3>
          </div>

          {employments && employments.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                OCUPACIONES & EMPLEOS:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {employments.map((emp: any, idx: number) => (
                  <div
                    key={emp.id || idx}
                    className="p-2.5 rounded bg-[#131218] border border-zinc-800 flex items-center justify-between text-xs font-oxanium"
                  >
                    <div>
                      <span className="font-bold text-white block">{emp.position?.name || 'Puesto'}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{emp.institution?.name || 'Entidad'}</span>
                    </div>
                    <Briefcase className="size-4 text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {biography && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                BIOGRAFÍA:
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line bg-[#131218] p-3 rounded border border-zinc-800">
                {biography}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
