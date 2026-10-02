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
  Eye,
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
  Skull,
  Droplets,
  Layers,
  Search,
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

export interface VigilanteSheetViewProps {
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

export function VigilanteSheetView({
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
}: VigilanteSheetViewProps) {
  // Color configuration: strictly derived from Vigilantes faction token or passed color
  const accentColor = groupColor || 'var(--vigilantes, #6366f1)';

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
  const grupoText = displayValue(group, 'Vigilantes');
  const afiliacion = profile?.afiliacion || profile?.affiliation || grupoText;
  const ocupacion = getPersonalField('ocupaci') || profile?.occupation || 'No especificada';
  const nacionalidad = getPersonalField('nacionalidad') || profile?.nationality || 'Japonesa';

  // Character quote if explicitly present in profile
  const characterQuote = profile?.quote || profile?.frase || profile?.lema || null;

  return (
    <main
      className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-16 space-y-6 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white"
      style={{
        '--vigilante-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* =========================================================================
          NOIR COMIC / GRAPHIC NOVEL TOP BANNER & ISSUE STRIP
          ========================================================================= */}
      <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 font-bold text-black bg-zinc-200 rounded-xs shadow-[2px_2px_0px_#000]"
            style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)', color: '#ffffff' }}
          >
            VOL. 01
          </span>
          <span className="font-bold text-zinc-200">NOIR ARCHIVE // VIGILANTE DOSSIER</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-zinc-500">
          <span>REGISTRO EXTRAOFICIAL</span>
          <span>·</span>
          <span>ESTADO: {status || 'ACTIVO'}</span>
        </div>
      </div>

      {/* =========================================================================
          PANEL 1: HERO / COVER PANEL (PORTRAIT + IDENTITY + COMIC METADATA)
          ========================================================================= */}
      <div className="relative rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Subtle CSS Comic Halftone / Screentone Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 0)',
            backgroundSize: '8px 8px',
          }}
        />

        {/* Faction Accent Stripe Top Header */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch relative z-10">
          
          {/* 1. LEFT: Character Avatar Portrait with Noir Graphic Novel Framing */}
          <div className="lg:col-span-4 flex flex-col items-center justify-between">
            <div className="w-full max-w-[280px] relative">
              {/* Distressed Comic Panel Frame */}
              <div className="relative rounded-lg border-2 border-zinc-800 bg-[#121216] p-2 shadow-[4px_4px_0px_#000] group overflow-hidden">
                {/* Comic Corner Crop Marks */}
                <div
                  className="absolute top-1.5 left-1.5 size-3 border-t-2 border-l-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--vigilante-accent, #6366f1)' }}
                />
                <div
                  className="absolute top-1.5 right-1.5 size-3 border-t-2 border-r-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--vigilante-accent, #6366f1)' }}
                />
                <div
                  className="absolute bottom-12 left-1.5 size-3 border-b-2 border-l-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--vigilante-accent, #6366f1)' }}
                />
                <div
                  className="absolute bottom-12 right-1.5 size-3 border-b-2 border-r-2 pointer-events-none z-20"
                  style={{ borderColor: 'var(--vigilante-accent, #6366f1)' }}
                />

                {/* Photo Container */}
                <div className="relative aspect-[3/4] w-full rounded bg-[#070709] overflow-hidden border border-zinc-900">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={fullName}
                      className="w-full h-full object-cover object-top filter grayscale contrast-125 brightness-95 transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-[#09090c]">
                      <Eye
                        className="size-16 mb-2 opacity-60 animate-pulse"
                        style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                      />
                      <span className="font-mono text-[10px] tracking-widest text-zinc-400 font-bold uppercase text-center px-4">
                        SUJETO CLANDESTINO // SIN FOTO
                      </span>
                    </div>
                  )}

                  {/* Tape / Stamp Overlay */}
                  <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-xs text-zinc-200 px-2 py-0.5 rounded-xs border border-zinc-700 text-[9px] font-mono tracking-widest uppercase shadow-[2px_2px_0px_#000]">
                    VIGILANTE · {basicStage || 'ACTIVO'}
                  </div>
                </div>

                {/* Bottom Barcode & Moniker Tag */}
                <div className="mt-2 pt-1 px-1 flex items-center justify-between border-t border-zinc-800 text-zinc-300">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono tracking-wider font-bold text-zinc-200">
                      {fullName}
                    </span>
                    <span className="text-[8px] font-mono tracking-widest text-zinc-500">
                      ||| | | ||||| | |||
                    </span>
                  </div>
                  <span
                    className="font-oxanium font-black text-sm tracking-wider uppercase drop-shadow-[2px_2px_0px_#000]"
                    style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                  >
                    {alias && alias !== 'Sin alias' ? alias : fullName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. RIGHT: Identity Header, Key-Value Dossier Table & Noir Monologue Box */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Header Tags & Faction Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs text-white text-xs font-mono font-bold tracking-widest uppercase shadow-[3px_3px_0px_#000] border border-black"
                    style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }}
                  >
                    <Eye className="size-3.5" />
                    <span>{grupoText}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 bg-[#16161a] px-2 py-0.5 rounded-xs border border-zinc-800 shadow-[2px_2px_0px_#000]">
                    ESTADO // {status || 'ACTIVO'}
                  </span>
                </div>
                {/* Noir Cipher Tag */}
                <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-zinc-400 uppercase">
                  <Fingerprint className="size-3" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
                  <span>DOSSIER // ARCHIVO-NOIR</span>
                </div>
              </div>

              {/* Character Full Name & Graphic Novel Heading */}
              <div>
                <h1 className="font-oxanium font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-white drop-shadow-[3px_3px_0px_#000] leading-none">
                  {fullName}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p
                    className="font-mono text-xs font-bold tracking-widest uppercase"
                    style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                  >
                    {alias && alias !== 'Sin alias' ? `[ ALIAS: ${alias} ]` : `[ REGISTRO EXTRAOFICIAL ]`}
                  </p>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[11px] font-mono text-zinc-400">{basicStage || 'Rango Operativo'}</span>
                </div>
              </div>

              {/* Noir Comic Key-Value Information Grid */}
              <div className="rounded-lg bg-[#111115] border-2 border-zinc-800 p-2 text-xs font-oxanium shadow-[3px_3px_0px_#000]">
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
                    <span className="font-bold flex items-center gap-1" style={{ color: 'var(--vigilante-accent, #6366f1)' }}>
                      <Eye className="size-3" />
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

            {/* Bottom Row: Noir Narrator Monologue Box / Caption Tab */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
              {characterQuote ? (
                <div className="flex-1 relative rounded-lg bg-[#141419] border-2 border-zinc-800 p-3 shadow-[3px_3px_0px_#000]">
                  <div
                    className="absolute -top-2 left-4 px-2 py-0.2 bg-black border border-zinc-700 text-[8px] font-mono uppercase font-bold tracking-widest rounded-xs"
                    style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                  >
                    CAPTION // DIARIO NOCTURNO
                  </div>
                  <p className="font-sans italic text-sm text-zinc-300 text-left tracking-wide leading-relaxed pt-1">
                    “{characterQuote}”
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-lg bg-[#121216] border-2 border-zinc-800 p-2.5 flex items-center gap-3 shadow-[3px_3px_0px_#000]">
                  <Compass className="size-4 shrink-0" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
                  <span className="text-[10px] font-mono text-zinc-400 leading-snug">
                    RED CLANDESTINA // OPERANDO AL MARGEN DE LA LEY BAJO CÓDIGO DE HONOR
                  </span>
                </div>
              )}

              {/* Graphic Novel Stamp */}
              <div className="shrink-0 flex items-center justify-center px-3 py-2 rounded-lg bg-black border-2 border-zinc-800 text-center shadow-[3px_3px_0px_#000]">
                <div
                  className="text-[9px] font-mono font-bold uppercase tracking-widest"
                  style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                >
                  EXPEDIENTE NOIR
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          PANEL 2: MATRIZ TÁCTICA, RADAR DE COMBATE & ESTADÍSTICAS DERIVADAS
          ========================================================================= */}
      <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] space-y-5 relative overflow-hidden">
        {/* Screentone texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 0)',
            backgroundSize: '8px 8px',
          }}
        />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-zinc-800 pb-3 relative z-10">
          <div className="flex items-center gap-2">
            <Crosshair className="size-5" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
            <div>
              <h2 className="text-base font-black font-oxanium uppercase text-white tracking-wider">
                MATRIZ BIO-TÁCTICA & COMBATE NOIR
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                PROYECCIÓN RADAR DE 6 VÉRTICES Y PARÁMETROS DERIVADOS
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-mono uppercase border border-zinc-700 px-2 py-0.5 rounded-xs bg-black text-zinc-300 shadow-[2px_2px_0px_#000]"
          >
            PANEL 02 // BAREMO
          </span>
        </div>

        {/* 2-Column Comic Grid: Radar with 3x2 Base Attributes (Left 5 cols) + Combat Stats (Right 7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-10">
          
          {/* 1. Radar Chart & Base Attributes Column */}
          <div className="lg:col-span-5 rounded-lg border-2 border-zinc-800 bg-[#111115] p-4 flex flex-col justify-between relative overflow-hidden shadow-[4px_4px_0px_#000] space-y-3">
            <div className="w-full flex items-center justify-between border-b border-zinc-800 pb-2 px-1">
              <span
                className="text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5"
                style={{ color: 'var(--vigilante-accent, #6366f1)' }}
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
                theme="vigilante"
                accentColor="var(--vigilantes, #6366f1)"
              />
            </div>
          </div>

          {/* 2. Combat Stats & Field Telemetry Column */}
          <div className="lg:col-span-7 rounded-lg border-2 border-zinc-800 bg-[#111115] p-4 flex flex-col justify-between space-y-4 shadow-[4px_4px_0px_#000]">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span
                  className="text-[11px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                >
                  <Shield className="size-3.5" />
                  ESTADÍSTICAS DERIVADAS & COMBATE
                </span>
                <span className="text-[9px] font-mono text-zinc-400">PARÁMETROS ACTIVOS</span>
              </div>

              {/* Top 4 Metrics: Salud, Estamina, Evasión, Coraje */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* SALUD */}
                <div className="p-3 rounded bg-[#16161b] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
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
                <div className="p-3 rounded bg-[#16161b] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                    <Zap className="size-3.5" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
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
                <div className="p-3 rounded bg-[#16161b] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
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
                <div className="p-3 rounded bg-[#16161b] border-2 border-zinc-800 flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000]">
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

              {/* 4 Combat Outputs: Daño Físico, Daño Rango, RD, Iniciativa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-oxanium">
                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.physicalDamage className="size-3 text-zinc-300" />
                    <span>DAÑO FÍSICO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedPhysicalDamage}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Mod: {resolvedModFuerza > 0 ? `+${resolvedModFuerza}` : String(resolvedModFuerza)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.rangeDamage className="size-3 text-zinc-300" />
                    <span>DAÑO RANGO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedRangeDamage}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Mod: {resolvedModDestreza > 0 ? `+${resolvedModDestreza}` : String(resolvedModDestreza)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
                    <CANONICAL_STAT_ICONS.damageReduction className="size-3 text-zinc-300" />
                    <span>REDUCCIÓN DAÑO</span>
                  </div>
                  <span className="font-black text-base text-zinc-100">{resolvedDamageReduction}</span>
                  <span className="text-[9px] font-mono text-zinc-500 block">Armadura</span>
                </div>
                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 text-center shadow-[2px_2px_0px_#000]">
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
                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 flex items-center justify-between shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <CANONICAL_STAT_ICONS.modFuerza className="size-3.5 text-zinc-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block">
                        Modificador de Fuerza
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 block">Bono CQC / Melee (FUE)</span>
                    </div>
                  </div>
                  <span className="font-black text-base text-zinc-100 font-mono ml-2">
                    {resolvedModFuerza > 0 ? `+${resolvedModFuerza}` : String(resolvedModFuerza)}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#141418] border-2 border-zinc-800 flex items-center justify-between shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <CANONICAL_STAT_ICONS.modDestreza className="size-3.5 text-zinc-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider block">
                        Modificador de Destreza
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 block">Bono Distancia / Precisión (DES)</span>
                    </div>
                  </div>
                  <span className="font-black text-base text-zinc-100 font-mono ml-2">
                    {resolvedModDestreza > 0 ? `+${resolvedModDestreza}` : String(resolvedModDestreza)}
                  </span>
                </div>
              </div>
            </div>

            {/* Noir Field Telemetry & Resources Box */}
            <div className="rounded bg-[#141418] border-2 border-zinc-800 p-3 space-y-2.5 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-b border-zinc-800 pb-1.5">
                <span
                  className="font-bold flex items-center gap-1.5"
                  style={{ color: 'var(--vigilante-accent, #6366f1)' }}
                >
                  <Terminal className="size-3" />
                  TELEMETRÍA DE RECURSOS & OPERACIONES
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-[#0f0f13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">FONDOS // YEN</span>
                  <span className="font-bold text-zinc-200">¥{Number(resolvedYen).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded bg-[#0f0f13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">EXPERIENCIA // EXP</span>
                  <span className="font-bold text-zinc-200">{resolvedExp} EXP</span>
                </div>
                <div className="p-2 rounded bg-[#0f0f13] border border-zinc-800">
                  <span className="text-zinc-500 block text-[9px] uppercase">PLUS ULTRA // PTS</span>
                  <span className="font-bold text-zinc-200">{resolvedPlusUltra} PTS</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
                <span>VIGILANTE.SYS // PROTOCOLO-NOIR</span>
                <span className="tracking-widest">||| ||||| || |||</span>
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
          PANEL 3: HABILIDADES & MANIFIESTO DEL QUIRK
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* HABILIDADES (Left 5 cols) */}
        <div className="lg:col-span-5 rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5 mb-3">
              <BookOpen className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                HABILIDADES & DESTREZAS
              </h3>
            </div>

            {skills && skills.length > 0 ? (
              <div className="rounded-lg bg-[#111115] border-2 border-zinc-800 divide-y divide-zinc-800 overflow-hidden shadow-[2px_2px_0px_#000]">
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
                        style={{ backgroundColor: 'black', color: 'var(--vigilante-accent, #6366f1)' }}
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

        {/* QUIRK (Right 7 cols) */}
        <div className="lg:col-span-7 rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Eye className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                MANIFIESTO DEL QUIRK / DON
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
              style={{ color: 'var(--vigilante-accent, #6366f1)' }}
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
            <div className="p-3 rounded bg-[#131317] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }} />
                <span>NIVEL 1 · DESPERTAR</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelOne}
              </p>
            </div>

            {/* NIVEL 2 · DOMINIO */}
            <div className="p-3 rounded bg-[#131317] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }} />
                <span>NIVEL 2 · DOMINIO</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {qLevelTwo || 'En desarrollo / No alcanzado'}
              </p>
            </div>

            {/* NIVEL 3 · PLUS ULTRA */}
            <div className="p-3 rounded bg-[#131317] border-2 border-zinc-800 space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
                <span className="size-2 rounded-full inline-block" style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* RASGOS */}
        <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5">
            <div
              className="size-4.5 rounded-xs flex items-center justify-center font-black text-xs text-white border border-black shadow-[1px_1px_0px_#000]"
              style={{ backgroundColor: 'var(--vigilante-accent, #6366f1)' }}
            >
              +
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              RASGOS POSITIVOS
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
                    className="p-3 rounded bg-[#131317] border-2 border-zinc-800 flex items-start gap-3 shadow-[2px_2px_0px_#000]"
                  >
                    <div className="p-1.5 rounded bg-black border border-zinc-700 text-zinc-200 shrink-0 mt-0.5">
                      <Sparkles className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
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
        <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2.5">
            <div className="size-4.5 rounded-xs bg-zinc-800 border border-zinc-700 flex items-center justify-center text-rose-400 font-black text-xs shadow-[1px_1px_0px_#000]">
              -
            </div>
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              DEBILIDADES & VULNERABILIDADES
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
                    className="p-3 rounded bg-[#131317] border-2 border-zinc-800 flex items-start gap-3 shadow-[2px_2px_0px_#000]"
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
        <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Swords className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                TÉCNICAS & MANIOBRAS
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
                    className="p-3 rounded bg-[#131317] border-2 border-zinc-800 flex items-start gap-3 relative shadow-[2px_2px_0px_#000]"
                  >
                    {/* Icon / Thumbnail */}
                    <div className="size-11 rounded bg-black border border-zinc-700 shrink-0 flex items-center justify-center">
                      <Swords className="size-5" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
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
                            style={{ color: 'var(--vigilante-accent, #6366f1)' }}
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
        <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Backpack className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
                INVENTARIO & PERTRECHOS
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
                    className="p-2.5 rounded bg-[#131317] border-2 border-zinc-800 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#000]"
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
                        style={{ color: 'var(--vigilante-accent, #6366f1)' }}
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
          PANEL 6: CERTIFICACIONES, LICENCIAS & ACTIVOS CLANDESTINOS
          ========================================================================= */}
      <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <BadgeAlert className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
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
                  className="p-3 rounded bg-[#131317] border-2 border-zinc-800 space-y-1.5 flex flex-col justify-between shadow-[2px_2px_0px_#000]"
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
          PANEL 7: ANTECEDENTES / REGISTRO DE VIGILANCIA & EMPLEOS
          ========================================================================= */}
      {(biography || (employments && employments.length > 0)) && (
        <div className="rounded-xl border-2 border-zinc-900 bg-[#0c0c0e] p-4 sm:p-5 space-y-3.5 shadow-[6px_6px_0px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-2 border-b-2 border-zinc-800 pb-2">
            <FileWarning className="size-4" style={{ color: 'var(--vigilante-accent, #6366f1)' }} />
            <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wider">
              ARCHIVO CLANDESTINO // ANTECEDENTES & VÍNCULOS
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
                    className="p-2.5 rounded bg-[#131317] border border-zinc-800 flex items-center justify-between text-xs font-oxanium"
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
                HISTORIAL / ANTECEDENTES:
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line bg-[#131317] p-3 rounded border border-zinc-800">
                {biography}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
