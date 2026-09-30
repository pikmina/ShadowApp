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
  AlertTriangle,
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
} from 'lucide-react';
import { StatsHexagon, HexStat } from '../HexagonRadarChart';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface VillainSheetViewProps {
  fullName: string;
  alias?: string;
  avatar?: string | null;
  group?: string;
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
}

export function VillainSheetView({
  fullName,
  alias,
  avatar,
  group,
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
  baseAttributes,
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
}: VillainSheetViewProps) {
  const resolvedPlusUltra = Number(
    resources?.plusUltra ??
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

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

  const resolvedEvasion = combatStatus?.evasion ?? evasion ?? 0;
  const resolvedCourage = combatStatus?.courage ?? courage ?? 0;
  const resolvedPhysicalDamage = combatStatus?.physicalDamageText ?? physicalDamageText ?? '1D4';
  const resolvedRangeDamage = combatStatus?.rangeDamageText ?? rangeDamageText ?? '1D4';
  const resolvedDamageReduction = combatStatus?.damageReductionText ?? damageReductionText ?? '0';
  const resolvedInitiative = combatStatus?.initiativeText ?? initiativeText ?? '0';

  // Helper to extract specific personal fields cleanly without fake mock defaults
  const getPersonalField = (labelPattern: string) => {
    const item = personalDataList.find((p) =>
      p.label.toLowerCase().includes(labelPattern.toLowerCase())
    );
    return item?.value && item.value !== 'No especificada' && item.value !== 'No especificado'
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

  // Character quote if explicitly present in profile
  const characterQuote = profile?.quote || profile?.frase || profile?.lema || null;

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-12 space-y-5 text-zinc-100 font-sans selection:bg-rose-600 selection:text-white">
      {/* =========================================================================
          TOP SECTION: IDENTITY DOSSIER (HEADER / AVATAR / DATA / GRUNGE FILLERS)
          ========================================================================= */}
      <div className="relative rounded-2xl border-2 border-rose-900/60 bg-[#0c0b0f] p-4 sm:p-6 shadow-[0_0_35px_rgba(225,29,72,0.18)] overflow-hidden">
        {/* Subtle background red splatter / dark grunge effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-rose-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-radial from-rose-900/15 via-transparent to-transparent pointer-events-none" />
        
        {/* Danger stripes top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-700 via-rose-500 to-rose-800 shadow-[0_0_12px_rgba(244,63,94,0.6)]" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch relative z-10">
          
          {/* 1. LEFT: Character Avatar Portrait with Grunge Villain Framing */}
          <div className="lg:col-span-4 flex flex-col items-center justify-between">
            <div className="w-full max-w-[280px] relative">
              {/* Distressed Frame Container */}
              <div className="relative rounded-xl border-2 border-rose-700/70 bg-[#141218] p-2 shadow-[0_0_20px_rgba(225,29,72,0.25)] group overflow-hidden">
                {/* Crosshairs & caution marks */}
                <div className="absolute top-1.5 left-1.5 size-3 border-t-2 border-l-2 border-rose-500 pointer-events-none z-20" />
                <div className="absolute top-1.5 right-1.5 size-3 border-t-2 border-r-2 border-rose-500 pointer-events-none z-20" />
                <div className="absolute bottom-10 left-1.5 size-3 border-b-2 border-l-2 border-rose-500 pointer-events-none z-20" />
                <div className="absolute bottom-10 right-1.5 size-3 border-b-2 border-r-2 border-rose-500 pointer-events-none z-20" />

                {/* Photo Image */}
                <div className="relative aspect-[3/4] w-full rounded-lg bg-[#070709] overflow-hidden border border-rose-950">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={fullName}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105 filter brightness-95 contrast-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-rose-800/80 bg-[#09080c]">
                      <Skull className="size-16 mb-2 opacity-60 animate-pulse text-rose-600" />
                      <span className="font-mono text-[11px] tracking-widest text-rose-400 font-bold uppercase">EXPEDIENTE // CLASIFICADO</span>
                    </div>
                  )}

                  {/* Threat badge stamp overlay */}
                  <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-xs text-rose-400 px-2 py-0.5 rounded border border-rose-900/80 text-[10px] font-mono tracking-widest uppercase">
                    AMENAZA // {basicStage || 'ACTIVO'}
                  </div>
                </div>

                {/* Bottom Barcode & Moniker Tag */}
                <div className="mt-2 pt-1 px-1 flex items-center justify-between border-t border-rose-950 text-rose-400">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono tracking-wider font-bold text-zinc-300">
                      {fullName}
                    </span>
                    <span className="text-[9px] font-mono tracking-widest text-rose-500/90">
                      ||||| ||| ||||||| |||
                    </span>
                  </div>
                  <span className="font-hand font-black text-lg tracking-wider text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] uppercase">
                    {alias && alias !== 'Sin alias' ? alias : fullName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. RIGHT: Identity Header, Table & Grunge Fillers */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header tags & Cyberpunk Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-950/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-black/80 border border-rose-600/70 text-rose-400 text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(225,29,72,0.3)]">
                    <Skull className="size-3.5 text-rose-500" />
                    <span>{grupoText}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-[#16131c] px-2 py-0.5 rounded border border-rose-950">
                    ESTADO // {status || 'ACTIVO'}
                  </span>
                </div>
                {/* Grunge Filler Stamped Cipher */}
                <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-rose-500/70 uppercase">
                  <Fingerprint className="size-3 text-rose-500" />
                  <span>CIPHER-ID // CLASIFICADO-S</span>
                </div>
              </div>

              {/* Character Full Name */}
              <div>
                <h1 className="font-poppins font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.35)] leading-none">
                  {fullName}
                </h1>
                <p className="font-mono text-xs text-rose-400/80 tracking-widest mt-1">
                  {alias && alias !== 'Sin alias' ? `[ ALIAS: ${alias} ]` : `[ EXPEDIENTE CLASIFICADO ]`}
                </p>
              </div>

              {/* Key-Value Personal Information Table in 2 Columns */}
              <div className="rounded-lg bg-[#121016]/90 border border-rose-950 p-2 text-xs font-oxanium">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 divide-y sm:divide-y-0 divide-rose-950/60">
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">APODO</span>
                    <span className="font-bold text-zinc-100">{apodo}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">EDAD</span>
                    <span className="font-bold text-zinc-100">{edad}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">CUMPLEAÑOS</span>
                    <span className="font-bold text-zinc-100">{cumpleanos}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">GÉNERO</span>
                    <span className="font-bold text-zinc-100">{genero}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">TIPO DE SANGRE</span>
                    <span className="font-bold text-zinc-100">{tipoSangre}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">ALINEACIÓN</span>
                    <span className="font-bold text-zinc-100">{alineacion}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">GRUPO</span>
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <Skull className="size-3 text-rose-500" />
                      {grupoText}
                    </span>
                  </div>
                  <div className="py-1 flex items-center justify-between border-b border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">AFILIACIÓN</span>
                    <span className="font-bold text-zinc-100">{afiliacion}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between sm:col-span-2 border-b sm:border-b-0 border-rose-950/50">
                    <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">OCUPACIÓN</span>
                    <span className="font-bold text-zinc-100">{ocupacion}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row of Header: Quote card + Grunge Tactical Stamp */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
              {characterQuote ? (
                <div className="flex-1 relative rounded-lg bg-[#141117] border border-rose-900/50 p-3 shadow-inner">
                  <div className="absolute -top-2 left-4 w-12 h-3.5 bg-zinc-700/60 border border-zinc-600/80 rotate-[-2deg] rounded-xs" />
                  <p className="font-hand text-sm text-rose-300 italic text-center tracking-wide leading-relaxed pt-1">
                    “{characterQuote}”
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-lg bg-[#100e14] border border-rose-950/60 p-2.5 flex items-center gap-3">
                  <Radio className="size-4 text-rose-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono text-zinc-400 leading-snug">
                    COMISIÓN DE SEGURIDAD PÚBLICA // EXPEDIENTE ACTIVO BAJO PROTOCOLO DE CONTENCIÓN
                  </span>
                </div>
              )}

              {/* Grunge Tactical Stamp */}
              <div className="shrink-0 flex items-center justify-center p-2 rounded-lg bg-black/60 border border-dashed border-rose-800/80 text-center">
                <div className="text-[9px] font-mono text-rose-400 font-bold uppercase tracking-widest">
                  AMENAZA NIVEL-S
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          ROW 2: MATRIZ DE RENDIMIENTO (COMBATE DERIVADAS + ATRIBUTOS + RADAR + LEYENDA)
          ========================================================================= */}
      <div className="rounded-2xl border-2 border-rose-900/60 bg-[#0c0b0f] p-4 sm:p-6 shadow-[0_0_35px_rgba(225,29,72,0.18)] space-y-5">
        
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-950 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-rose-500" />
            <div>
              <h2 className="text-base font-black font-oxanium uppercase text-rose-400 tracking-wider">
                ESTADÍSTICAS & MATRIZ DE COMBATE
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                ATRIBUTOS BASE, PARÁMETROS DERIVADOS Y PROYECCIÓN RADAR
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase text-rose-500/80 border border-rose-900/60 px-2 py-0.5 rounded bg-black/60">
            RADAR // 6-AXIS
          </span>
        </div>

        {/* 2-Column Balanced Grid: Hexagon Radar Chart with Attributes on Left, Combat & Derived Stats with Tactical Fillers on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* 1. Radar Chart & Base Attributes Column (~5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-rose-950 bg-[#110f15] p-4 flex flex-col justify-between relative overflow-hidden shadow-inner space-y-3">
            <div className="w-full flex items-center justify-between border-b border-rose-950/70 pb-2 px-1">
              <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <Crosshair className="size-3.5 text-rose-500" />
                RADAR TÁCTICO & ATRIBUTOS BASE
              </span>
              <span className="text-[9px] font-mono text-rose-500/80 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/60">
                6 VÉRTICES
              </span>
            </div>

            <div className="w-full flex-1 flex items-center justify-center p-1">
              <StatsHexagon
                stats={baseAttributes}
                theme="villain"
                accentColor="#e11d48"
              />
            </div>
          </div>

          {/* 2. Combat, Derived Stats & Tactical Diagnostic Fillers Column (~7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-rose-950 bg-[#110f15] p-4 flex flex-col justify-between space-y-4 shadow-inner">
            
            {/* Derived Combat Stats Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-rose-950/70 pb-2">
                <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Skull className="size-3.5 text-rose-500" />
                  ESTADÍSTICAS DERIVADAS & COMBATE
                </span>
                <span className="text-[9px] font-mono text-zinc-500">PARÁMETROS FINALES</span>
              </div>

              {/* Top 4 Metrics: Salud, Estamina, Evasión, Coraje */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* SALUD */}
                <div className="p-3 rounded-lg bg-[#16131c] border border-rose-950 flex flex-col items-center justify-center text-center group hover:border-rose-700/60 transition-colors shadow-xs">
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
                <div className="p-3 rounded-lg bg-[#16131c] border border-rose-950 flex flex-col items-center justify-center text-center group hover:border-rose-700/60 transition-colors shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Zap className="size-3.5 text-rose-500 fill-rose-500/30" />
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
                <div className="p-3 rounded-lg bg-[#16131c] border border-rose-950 flex flex-col items-center justify-center text-center group hover:border-rose-700/60 transition-colors shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Activity className="size-3.5 text-rose-500" />
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
                <div className="p-3 rounded-lg bg-[#16131c] border border-rose-950 flex flex-col items-center justify-center text-center group hover:border-rose-700/60 transition-colors shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Shield className="size-3.5 text-rose-500" />
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
                <div className="p-2.5 rounded-lg bg-[#141119] border border-rose-950/70 text-center">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">DAÑO FÍSICO</span>
                  <span className="font-black text-base text-zinc-100">{resolvedPhysicalDamage}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141119] border border-rose-950/70 text-center">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">DAÑO RANGO</span>
                  <span className="font-black text-base text-zinc-100">{resolvedRangeDamage}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141119] border border-rose-950/70 text-center">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">REDUCCIÓN DAÑO</span>
                  <span className="font-black text-base text-zinc-100">{resolvedDamageReduction}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#141119] border border-rose-950/70 text-center">
                  <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">INICIATIVA</span>
                  <span className="font-black text-base text-zinc-100">{resolvedInitiative}</span>
                </div>
              </div>
            </div>

            {/* Tactical Diagnostics & Threat Analysis Grunge Filler Panel */}
            <div className="rounded-lg bg-[#141119] border border-rose-950/80 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-rose-950/60 pb-1.5">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="size-3 text-rose-500" />
                  DIAGNÓSTICO TÁCTICO // PROTOCOLO DE AMENAZA
                </span>
                <span className="text-rose-500/80 font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  PRIORIDAD 1
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#0f0d14] border border-rose-950/60">
                  <span className="text-zinc-500 block text-[9px] uppercase">ÍNDICE DE PELIGRO</span>
                  <span className="font-bold text-rose-400">ALERTA ROJA (S)</span>
                </div>
                <div className="p-2 rounded bg-[#0f0d14] border border-rose-950/60">
                  <span className="text-zinc-500 block text-[9px] uppercase">ORDEN DE CAPTURA</span>
                  <span className="font-bold text-amber-400">VIGENTE // ACTIVA</span>
                </div>
                <div className="p-2 rounded bg-[#0f0d14] border border-rose-950/60">
                  <span className="text-zinc-500 block text-[9px] uppercase">CONTENCIÓN</span>
                  <span className="font-bold text-zinc-200">FUERZA AUTORIZADA</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
                <span>SYS.VILLAIN//CIPHER-MATRIX-ACTIVE</span>
                <span className="tracking-widest">|||| ||||| || ||||</span>
              </div>
            </div>

          </div>

        </div>

        {/* Legend strip for Modifiers, Rasgos, Equipamiento, etc. */}
        <div className="border-t border-rose-950/80 pt-2 px-1">
          <ModifierNotesLegend className="text-zinc-400" />
        </div>

      </div>

      {/* =========================================================================
          ROW 3: HABILIDADES & QUIRK
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* HABILIDADES (Left ~5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-rose-950 pb-2.5 mb-3">
              <BookOpen className="size-4 text-rose-500" />
              <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
                HABILIDADES
              </h3>
            </div>

            {skills && skills.length > 0 ? (
              <div className="rounded-lg bg-[#121016] border border-rose-950 divide-y divide-rose-950/60 overflow-hidden">
                {skills.map((skill: any, idx: number) => {
                  const sName = skill.name || skill.title || `Habilidad #${idx + 1}`;
                  const sLevel = skill.level || skill.quantity || 1;
                  const sDesc = skill.description || '';

                  return (
                    <div
                      key={skill.id || idx}
                      className="px-3.5 py-2 flex items-center justify-between hover:bg-rose-950/20 transition-colors group relative"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-oxanium text-xs font-semibold text-zinc-200 block truncate">
                          {sName}
                        </span>
                        {sDesc && (
                          <span className="text-[10px] text-zinc-500 font-mono block truncate">
                            {sDesc}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black font-oxanium text-rose-500 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900/60 shrink-0">
                        {sLevel}
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

        {/* QUIRK (Right ~7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-2 border-b border-rose-950 pb-2.5">
            <Skull className="size-4 text-rose-500" />
            <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
              QUIRK
            </h3>
          </div>

          {/* Quirk Title & Type */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg sm:text-xl font-black font-oxanium text-rose-500 tracking-wide uppercase">
              {qName}
            </h4>
            {qType && (
              <span className="text-[11px] font-mono font-bold text-zinc-300 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-800/70">
                Tipo: {qType}
              </span>
            )}
            {qEvolution && (
              <span className="text-[10px] font-mono text-rose-400/90">
                {qEvolution}
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
            <div className="p-3 rounded-lg bg-[#141219] border border-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                <span className="size-2 rounded-full bg-rose-600 inline-block" />
                <span>NIVEL 1 · DESPERTAR</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelOne}
              </p>
            </div>

            {/* NIVEL 2 · DOMINIO */}
            <div className="p-3 rounded-lg bg-[#141219] border border-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                <span className="size-2 rounded-full bg-rose-600 inline-block" />
                <span>NIVEL 2 · DOMINIO</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelTwo || 'En desarrollo / No alcanzado'}
              </p>
            </div>

            {/* NIVEL 3 · PLUS ULTRA */}
            <div className="p-3 rounded-lg bg-[#141219] border border-rose-950 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                <span className="size-2 rounded-full bg-rose-600 inline-block" />
                <span>NIVEL 3 · PLUS ULTRA</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelThree || 'Sin despertar / No alcanzado'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ROW 4: RASGOS & DEBILIDADES
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* RASGOS */}
        <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-2 border-b border-rose-950 pb-2.5">
            <div className="size-4.5 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 font-black text-xs">
              +
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
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
                    className="p-3 rounded-lg bg-[#141219] border border-rose-950 flex items-start gap-3 hover:border-rose-900/60 transition-colors"
                  >
                    <div className="p-1.5 rounded bg-rose-950/80 border border-rose-900 text-rose-400 shrink-0 mt-0.5">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {tName}
                      </h4>
                      {tDesc && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
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
        <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-2 border-b border-rose-950 pb-2.5">
            <div className="size-4.5 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 font-black text-xs">
              -
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
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
                    className="p-3 rounded-lg bg-[#141219] border border-rose-950 flex items-start gap-3 hover:border-rose-900/60 transition-colors"
                  >
                    <div className="p-1.5 rounded bg-rose-950/80 border border-rose-900 text-rose-400 shrink-0 mt-0.5">
                      <Droplets className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {wName}
                      </h4>
                      {wDesc && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
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
          ROW 5: TÉCNICAS & INVENTARIO
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* TÉCNICAS */}
        <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-rose-950 pb-2.5">
            <div className="flex items-center gap-2">
              <Swords className="size-4 text-rose-500" />
              <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
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
                    className="p-3 rounded-lg bg-[#141219] border border-rose-950 hover:border-rose-800/70 transition-colors flex items-start gap-3 relative"
                  >
                    {/* Thumbnail / Icon */}
                    <div className="size-12 rounded bg-black border border-rose-900/60 shrink-0 overflow-hidden flex items-center justify-center">
                      <Skull className="size-6 text-rose-600 opacity-80" />
                    </div>

                    {/* Technique Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                            {tName}
                          </h4>
                          {tType && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                              {tType}
                            </span>
                          )}
                        </div>

                        {tCost && (
                          <span className="text-xs font-black font-oxanium text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-900 shrink-0">
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
                        <p className="text-[10px] text-rose-400/90 font-mono leading-tight">
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
        <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-rose-950 pb-2.5">
            <div className="flex items-center gap-2">
              <Backpack className="size-4 text-rose-500" />
              <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
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
                const iDesc = item?.element?.description || item?.description || '';
                const iQty = item?.possession?.quantity ?? item?.quantity ?? 1;
                const isEquipped = Boolean(item?.possession?.equipped || item?.equipped);
                const iCategory = item?.element?.category || item?.category || item?.element?.kind || 'General';

                return (
                  <div
                    key={item?.id || idx}
                    className="p-2.5 rounded-lg bg-[#141219] border border-rose-950 hover:border-rose-800/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded bg-black border border-rose-900/60 shrink-0 flex items-center justify-center text-rose-400">
                        <Bookmark className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-oxanium text-xs font-bold text-white truncate uppercase block">
                            {iName}
                          </span>
                          {iQty > 1 && (
                            <span className="text-[9px] font-mono text-rose-400 font-bold bg-rose-950 px-1 py-0.2 rounded border border-rose-800">
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
                      <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-700 uppercase shrink-0">
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
          ROW 6: CERTIFICACIONES, LICENCIAS & ACTIVOS CLANDESTINOS
          ========================================================================= */}
      <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3.5 shadow-md">
        <div className="flex items-center justify-between border-b border-rose-950 pb-2.5">
          <div className="flex items-center gap-2">
            <BadgeAlert className="size-4 text-rose-500" />
            <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
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
                  className="p-3 rounded-lg bg-[#141219] border border-rose-950 hover:border-rose-800/70 transition-colors space-y-1.5 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-oxanium text-xs font-bold text-white uppercase tracking-wider">
                        {cName}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-900 shrink-0">
                        {cKind}
                      </span>
                    </div>
                    {cDesc && (
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-sans line-clamp-3">
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
          BIOGRAFÍA / HISTORIAL EXPEDIENTE (if available)
          ========================================================================= */}
      {biography && (
        <div className="rounded-xl border border-rose-950 bg-[#0d0c11] p-4 sm:p-5 space-y-3 shadow-md">
          <div className="flex items-center gap-2 border-b border-rose-950 pb-2">
            <FileWarning className="size-4 text-rose-500" />
            <h3 className="text-sm font-black font-oxanium uppercase text-rose-400 tracking-wider">
              REGISTRO DE AMENAZA // ANTECEDENTES
            </h3>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line">
            {biography}
          </p>
        </div>
      )}
    </main>
  );
}
