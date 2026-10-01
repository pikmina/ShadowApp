import React from 'react';
import {
  Activity,
  Heart,
  Zap,
  Shield,
  Award,
  BookOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  BadgeCheck,
  User,
  Coins,
  Backpack,
  Bookmark,
  Swords,
  Scroll,
  Pencil,
  AlertTriangle,
  Trophy,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import { StatsHexagon, HexStat } from '../HexagonRadarChart';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface HeroSheetViewProps {
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
}

export function HeroSheetView({
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
  baseAttributes,
  defenseList,
  combatStatusList,
  personalDataList,
  traits,
  weaknesses,
  skills = [],
  credentials = [],
  techniques,
  possessions,
  biography,
  character,
  profile,
}: HeroSheetViewProps) {
  const resolvedPlusUltra = Number(
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

  const fueStat = baseAttributes.find(a => (a as any).key === 'FUE' || a.label?.toLowerCase().includes('fuerza'));
  const desStat = baseAttributes.find(a => (a as any).key === 'DES' || a.label?.toLowerCase().includes('destreza'));
  const modFue = Math.floor((fueStat?.value || 0) / 2);
  const modDes = Math.floor((desStat?.value || 0) / 2);

  return (
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
                <span className="text-[10px] font-oxanium font-black uppercase tracking-widest text-cyan-400 flex items-center justify-center gap-1.5 font-mono">
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

              {/* Quirk Evolution Levels */}
              {(quirkLevelOne || quirkLevelTwo || quirkLevelThree) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800/80">
                  {quirkLevelOne && (
                    <div className="p-2.5 rounded bg-zinc-900/80 border border-amber-500/30 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-300 block uppercase tracking-wider">
                        NIVEL 1 • DESPERTAR
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelOne}
                      </p>
                    </div>
                  )}
                  {quirkLevelTwo && (
                    <div className="p-2.5 rounded bg-zinc-900/80 border border-cyan-500/30 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-cyan-300 block uppercase tracking-wider">
                        NIVEL 2 • DOMINIO
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelTwo}
                      </p>
                    </div>
                  )}
                  {quirkLevelThree && (
                    <div className="p-2.5 rounded bg-zinc-900/80 border border-rose-500/30 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-rose-300 block uppercase tracking-wider">
                        NIVEL 3 • PLUS ULTRA
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelThree}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Currency & Progression Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-oxanium pt-1">
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
              {resolvedPlusUltra > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-rose-500/50 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                  <Sparkles className="size-4 text-rose-400 animate-pulse" />
                  <span className="text-zinc-400 font-mono text-[11px]">PLUS ULTRA:</span>
                  <span className="font-black text-rose-400 text-sm font-oxanium">{resolvedPlusUltra} PTS</span>
                </div>
              )}
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
            <StatsHexagon stats={baseAttributes} theme="hero" accentColor={groupColor} />
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
                      {Icon && <Icon className="size-4 text-cyan-400 shrink-0" />}
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
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                      <span>{item.label}</span>
                      {Icon && <Icon className="size-4 text-cyan-400" />}
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-sm font-black font-oxanium text-white">{displayValue(item.value, '0')}</span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.sub || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modifiers for FUE and DES */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs font-mono">
              <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block">MOD. FUERZA (FUE)</span>
                  <span className="text-[10px] text-zinc-400">Bono CQC / Melee</span>
                </div>
                <span className="font-bold text-sm text-amber-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                  {modFue >= 0 ? `+${modFue}` : modFue}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block">MOD. DESTREZA (DES)</span>
                  <span className="text-[10px] text-zinc-400">Bono Rango / Puntería</span>
                </div>
                <span className="font-bold text-sm text-cyan-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                  {modDes >= 0 ? `+${modDes}` : modDes}
                </span>
              </div>
            </div>

            <ModifierNotesLegend className="mt-3 border-zinc-800/80 bg-zinc-950/40 text-zinc-500" />
          </div>

          {/* Civil & Tactical Registration Card */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <div className="p-1.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                  REGISTRO CIVIL Y TÁCTICO
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  HISTORIAL DE EXPEDIENTE OFICIAL UA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {personalDataList.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/60 space-y-1 hover:border-zinc-700 transition-colors">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                      {Icon && <Icon className="size-3 text-zinc-400" />}
                      {item.label}
                    </span>
                    <strong className="block text-zinc-200 truncate pl-4.5 font-mono">{String(item.value)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: SPECIAL TALENTS (Skills, Traits, Weaknesses)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. HABILIDADES */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Award className="size-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wide">HABILIDADES</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Nivel de maestría y entrenamiento</p>
              </div>
            </div>

            {skills.length > 0 ? (
              <div className="space-y-2">
                {skills.map((skill: any, idx: number) => {
                  const skillName = typeof skill === 'string' ? skill : skill.name || skill.title || `Habilidad #${idx + 1}`;
                  const skillLevel = typeof skill === 'object' ? Number(skill.level ?? skill.quantity ?? 1) : 1;
                  const skillDesc = typeof skill === 'object' ? skill.description : '';
                  return (
                    <div key={idx} className="flex flex-col gap-1 rounded border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-zinc-300 truncate uppercase">✦ {skillName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] font-bold text-cyan-400">Nivel {skillLevel}</span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "size-2 rounded-xs transition-colors",
                                  i < skillLevel ? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" : "bg-zinc-800"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {skillDesc && <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{skillDesc}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No hay habilidades registradas.</p>
            )}
          </div>
        </div>

        {/* 2. RASGOS */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Award className="size-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wide">RASGOS / CUALIDADES</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Dotes innatas y ventajas biológicas</p>
            </div>
          </div>

          {traits.length > 0 ? (
            <div className="space-y-2.5">
              {traits.map((t: any, idx: number) => {
                const traitName = t?.name || t?.title || (typeof t === 'string' ? t : `Rasgo #${idx + 1}`);
                const traitDesc = t?.description || t?.desc || '';
                return (
                  <div key={idx} className="rounded border border-zinc-800 bg-zinc-950/80 p-3 text-xs space-y-1">
                    <strong className="text-amber-400 font-black block uppercase tracking-wide">✦ {traitName}</strong>
                    {traitDesc && <p className="text-zinc-300 leading-relaxed font-mono">{traitDesc}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">Sin rasgos registrados.</p>
          )}
        </div>

        {/* 3. DEBILIDADES */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <AlertTriangle className="size-5 text-rose-500" />
            <div>
              <h3 className="text-sm font-black font-oxanium uppercase text-white tracking-wide">LIMITANTES / DEBILIDADES</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Retrocesos físicos y vulnerabilidades</p>
            </div>
          </div>

          {weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map((w: any, idx: number) => {
                const wName = w?.name || w?.title || (typeof w === 'string' ? w : `Debilidad #${idx + 1}`);
                const wDesc = w?.description || w?.desc || '';
                return (
                  <div key={idx} className="rounded border border-zinc-800 bg-zinc-950/80 p-3 text-xs space-y-1">
                    <strong className="text-rose-400 font-black block uppercase tracking-wide">✦ {wName}</strong>
                    {wDesc && <p className="text-zinc-300 leading-relaxed font-mono">{wDesc}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">Sin debilidades registradas.</p>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: CERTIFICATIONS, TECHNIQUES & EQUIPMENT
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Certificaciones y Licencias */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Scroll className="size-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                CERTIFICACIONES & LICENCIAS
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                AUTORIZACIONES GUBERNAMENTALES DE OPERACIÓN
              </p>
            </div>
          </div>

          {credentials.length > 0 ? (
            <div className="space-y-3">
              {credentials.map((row: any, idx: number) => {
                const credName = row?.element?.name || row?.name || row?.title || `Documento #${idx + 1}`;
                const credDesc = row?.element?.description || row?.description || '';
                const credKind = row?.element?.kind || row?.kind || 'Licencia';
                return (
                  <div key={idx} className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1.5 text-xs shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase font-mono">
                        <Scroll className="size-4 text-amber-400 shrink-0" />
                        {credName}
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0">
                        {credKind}
                      </span>
                    </div>
                    {credDesc && (
                      <p className="text-zinc-300 text-xs leading-relaxed pl-5 font-mono">
                        {credDesc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">Sin certificaciones o licencias operacionales registradas.</p>
          )}
        </div>

        {/* Equipamiento e Inventario Real */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Backpack className="size-5 text-amber-400" />
            <div>
              <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                EQUIPAMIENTO & ARSENAL RECOMENDADO
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                OBJETOS Y HERRAMIENTAS ADJUDICADAS EN SERVICIO
              </p>
            </div>
          </div>

          {possessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {possessions.map((item: any, i: number) => {
                const itemName = item?.element?.name || item?.name || item?.title || `Objeto #${i + 1}`;
                const itemDesc = item?.element?.description || item?.description || '';
                const itemQty = item?.possession?.quantity ?? item?.quantity ?? 1;

                return (
                  <div key={i} className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-colors flex items-start gap-3">
                    <div className="p-2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0 mt-0.5">
                      <Bookmark className="size-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate block uppercase font-mono">
                          {itemName}
                        </span>
                        {itemQty > 1 && (
                          <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20">
                            x{itemQty}
                          </span>
                        )}
                      </div>
                      {itemDesc && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-mono">
                          {itemDesc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No hay equipamiento en inventario.</p>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ACTIVE TECHNIQUES & SPECIAL ACTIONS
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Swords className="size-5 text-rose-500" />
          <div>
            <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
              MÓDULOS DE COMBATE & MOVIMIENTOS ESPECIALES
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              TÉCNICAS ACTIVAS DE ATAQUE, SOPORTE Y MOVILIDAD
            </p>
          </div>
        </div>

        {techniques.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techniques.map((tech: any, idx: number) => {
              const techName = tech?.name || tech?.title || `Técnica #${idx + 1}`;
              const techLevel = tech?.level ? `Nivel ${tech.level}` : null;
              const techCost = tech?.cost || tech?.staminaCost || null;
              const techType = tech?.type || tech?.classification || null;
              const techTarget = tech?.target || tech?.defenseTarget || null;
              const autoDesc = tech?.autoDescription || tech?.mechanicalDesc || '';

              return (
                <div key={tech.id || idx} className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2.5 relative shadow-md">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="size-4 text-cyan-400 shrink-0" />
                      <h4 className="font-bold text-white text-sm font-oxanium truncate uppercase tracking-wider">
                        {techName}
                      </h4>
                    </div>
                    {techLevel && (
                      <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/50 shrink-0">
                        {techLevel}
                      </span>
                    )}
                  </div>

                  {/* Badges strip: Cost, Type, Target Defense */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {techCost && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold">
                        Coste: {String(techCost).includes('CE') || String(techCost).includes('ES') ? techCost : `${techCost} CE`}
                      </span>
                    )}
                    {techType && (
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40 font-bold uppercase">
                        {techType}
                      </span>
                    )}
                    {techTarget && (
                      <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold uppercase">
                        {techTarget}
                      </span>
                    )}
                  </div>

                  {/* Lore Description */}
                  {tech.description && (
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans border-t border-zinc-900 pt-1.5">
                      {tech.description}
                    </p>
                  )}

                  {/* Mechanical Auto-Description */}
                  {autoDesc && (
                    <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-[11px] space-y-1">
                      <span className="font-bold text-amber-400 flex items-center gap-1 text-[10px] font-mono">
                        <Sparkles className="size-3 text-amber-400" />
                        RESOLUCIÓN EN MATRIZ DE REGLAS:
                      </span>
                      <p className="text-zinc-200 font-mono leading-relaxed">
                        {autoDesc}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">No hay técnicas de combate autorizadas para este expediente.</p>
        )}
      </div>

      {/* Biography & RP Notes */}
      {biography && (
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Pencil className="size-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-black font-oxanium uppercase text-white tracking-wide">
                HISTORIAL BIOGRÁFICO & BITÁCORA DE SERVICIO
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                REGISTROS SUCINTOS DE LA TRAYECTORIA DEL INDIVIDUO
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {biography}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="text-center text-xs font-mono text-zinc-500 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 uppercase tracking-widest">
        <span>PRO-HERO ARCHIVE SYSTEM · VALIDATED FILES</span>
        <span>SHADOWMORE OS v4.2</span>
      </div>
    </main>
  );
}
