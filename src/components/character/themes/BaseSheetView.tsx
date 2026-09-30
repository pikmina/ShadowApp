import React from 'react';
import {
  Activity,
  Heart,
  Zap,
  Shield,
  Award,
  BookOpen,
  Sparkles,
  FileText,
  User,
  Coins,
  Bookmark,
  Swords,
  Scroll,
  Pencil,
  Trophy,
  ShieldAlert,
  Dices,
  Briefcase
} from 'lucide-react';
import { StatsHexagon, HexStat, StatsHexagonTheme } from '../HexagonRadarChart';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
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
  employments?: any[];
  theme?: StatsHexagonTheme | string;
}

export function BaseSheetView({
  fullName,
  alias,
  avatar,
  group,
  status = 'Activo',
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
  physicalDamageText,
  rangeDamageText,
  damageReductionText,
  initiativeText,
  baseAttributes,
  defenseList,
  combatStatusList,
  personalDataList,
  traits,
  weaknesses,
  skills = [],
  credentials = [],
  techniques = [],
  possessions = [],
  biography,
  character,
  profile,
  employments = [],
  theme = 'base',
}: BaseSheetViewProps) {
  const resolvedPlusUltra = Number(
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

  // Calculate attribute modifiers
  const attrModifiers = baseAttributes.map(attr => ({
    ...attr,
    mod: Math.floor((attr.value || 0) / 2),
  }));

  const fueStat = attrModifiers.find(a => (a as any).key === 'FUE' || a.label?.toLowerCase().includes('fuerza'));
  const desStat = attrModifiers.find(a => (a as any).key === 'DES' || a.label?.toLowerCase().includes('destreza'));
  const modFue = fueStat?.mod ?? 0;
  const modDes = desStat?.mod ?? 0;

  return (
    <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6 font-oxanium text-zinc-100">
      {/* =========================================================================
          HEADER: EXPEDIENTE BASE (SHADOWMORE OS STANDARD DOSSIER)
          ========================================================================= */}
      <div className="relative rounded-xl border border-zinc-800 bg-gradient-to-b from-[#14141a] via-[#0e0e13] to-[#0a0a0d] overflow-hidden shadow-2xl p-6 sm:p-8">
        {/* Subtle Terminal Scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none" />
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-zinc-600 via-cyan-500 to-amber-500" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          {/* Portrait Box */}
          <div className="md:col-span-4 flex flex-col items-center sm:items-start">
            <div className="relative w-44 h-56 sm:w-48 sm:h-60 rounded-lg border-2 border-zinc-700 bg-black overflow-hidden shadow-lg group">
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="w-full h-full object-cover object-top filter contrast-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-4 text-center">
                  <User className="size-16 mb-2 text-zinc-700" />
                  <span className="text-xs uppercase font-bold tracking-wider">Sin Fotografía</span>
                </div>
              )}

              {/* Faction / Group Tag */}
              <div className="absolute bottom-0 inset-x-0 bg-black/90 p-2 text-center border-t border-zinc-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 font-mono">
                  {group || 'SIN GRUPO ASIGNADO'}
                </span>
              </div>
            </div>
          </div>

          {/* Dossier Data Header */}
          <div className="md:col-span-8 space-y-4">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-zinc-700">
                EXPEDIENTE #{character?.id || 1}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                ESTADO: <span className="text-emerald-400 font-bold">{status}</span>
              </span>
              {basicStage && (
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs">
                  {basicStage}
                </span>
              )}
            </div>

            {/* Name & Alias */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
                {fullName}
              </h1>
              {alias && alias !== 'Sin alias' && (
                <p className="text-lg sm:text-xl font-bold text-amber-400 uppercase tracking-wide mt-0.5">
                  "{alias}"
                </p>
              )}
            </div>

            {/* Quirk / Biosignature Box */}
            <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-400" />
                  PARTICULARIDAD / DON
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                  {quirkType || 'No determinado'} · {quirkEvolution || 'Nivel 1'}
                </span>
              </div>
              <p className="text-base font-black text-amber-300">
                {quirkName || 'Sin don registrado'}
              </p>
              {quirkDescription && (
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {quirkDescription}
                </p>
              )}

              {/* Quirk Evolution Levels if present */}
              {(quirkLevelOne || quirkLevelTwo || quirkLevelThree) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800">
                  {quirkLevelOne && (
                    <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400 block uppercase">
                        Nivel 1 • Despertar
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelOne}
                      </p>
                    </div>
                  )}
                  {quirkLevelTwo && (
                    <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 block uppercase">
                        Nivel 2 • Dominio
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelTwo}
                      </p>
                    </div>
                  )}
                  {quirkLevelThree && (
                    <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-rose-400 block uppercase">
                        Nivel 3 • Plus Ultra
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {quirkLevelThree}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resources Strip (EXP, Fondos, and PLUS ULTRA) */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800">
                <Trophy className="size-4 text-amber-400" />
                <span className="text-zinc-400 font-mono text-[11px]">EXP:</span>
                <span className="font-black text-amber-400">{exp ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800">
                <Coins className="size-4 text-emerald-400" />
                <span className="text-zinc-400 font-mono text-[11px]">FONDOS:</span>
                <span className="font-black text-emerald-400">¥{(yen ?? 0).toLocaleString()}</span>
              </div>
              
              {/* Highlighted Plus Ultra Resource */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-950 border border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                <Sparkles className="size-4 text-rose-400 animate-pulse" />
                <span className="font-mono text-[11px] text-zinc-300 font-bold uppercase tracking-wider">PLUS ULTRA:</span>
                <span className="font-black text-rose-400 text-sm">{resolvedPlusUltra} PTS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: ATRIBUTOS, RADAR & ESTADO DE COMBATE
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Lg 7): Vitals, Hexagon Radar & Attributes Table */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-cyan-400" />
              <div>
                <h2 className="text-base font-black uppercase text-white tracking-wide">
                  PARÁMETROS BASE & VITALIDAD
                </h2>
                <p className="text-xs text-zinc-400 font-mono">
                  EVALUACIÓN DE ATRIBUTOS Y MODIFICADORES
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              6 ATRIBUTOS
            </span>
          </div>

          {/* Vitals Meters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Health Pool */}
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1 font-mono">
                  <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                  HP // SALUD
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {currentHealth} / {maxHealth}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-rose-950">
                <div className="bg-gradient-to-r from-rose-600 to-amber-500 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Stamina Pool */}
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1 font-mono">
                  <Zap className="size-3.5 text-amber-400 fill-amber-400" />
                  ES // ESTAMINA
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {currentStamina} / {maxStamina}
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-amber-950">
                <div className="bg-gradient-to-r from-amber-500 to-cyan-400 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Plus Ultra Indicator */}
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-600/40 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1 font-mono">
                  <Sparkles className="size-3.5 text-rose-400" />
                  PLUS ULTRA
                </span>
                <span className="text-base font-black text-rose-300 font-mono">
                  {resolvedPlusUltra}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400">Recurso extraordinario</span>
            </div>
          </div>

          {/* Hexagon Radar Chart */}
          <div className="rounded-lg bg-zinc-950/90 border border-zinc-800 p-3 sm:p-4">
            <StatsHexagon stats={baseAttributes} theme={theme || 'base'} />
          </div>

          {/* Detailed Attributes & Modifiers Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-800 text-xs text-zinc-300 font-mono">
              <thead>
                <tr className="bg-zinc-900 text-zinc-200 border-b border-zinc-800">
                  <th className="p-2 text-left border-r border-zinc-800 font-bold">Atributo</th>
                  <th className="p-2 text-center border-r border-zinc-800">Base</th>
                  <th className="p-2 text-center border-r border-zinc-800">Bono</th>
                  <th className="p-2 text-center border-r border-zinc-800 font-bold text-white">Total</th>
                  <th className="p-2 text-center font-bold text-cyan-400">Modificador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {attrModifiers.map((attr, idx) => {
                  const isFuerza = (attr as any).key === 'FUE' || attr.label?.toLowerCase().includes('fuerza');
                  const isDestreza = (attr as any).key === 'DES' || attr.label?.toLowerCase().includes('destreza');
                  const modSign = attr.mod >= 0 ? `+${attr.mod}` : `${attr.mod}`;

                  return (
                    <tr
                      key={(attr as any).key || attr.label || idx}
                      className={cn(
                        'hover:bg-zinc-900/50 transition-colors',
                        (isFuerza || isDestreza) && 'bg-zinc-950/60'
                      )}
                    >
                      <td className="p-2 border-r border-zinc-800 font-bold text-white flex items-center justify-between">
                        <span>{attr.label}</span>
                        {(isFuerza || isDestreza) && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                            {isFuerza ? 'FUE' : 'DES'}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center border-r border-zinc-800">{attr.base}</td>
                      <td className="p-2 text-center border-r border-zinc-800 text-zinc-400">
                        {attr.bonus > 0 ? `+${attr.bonus}` : '0'}
                      </td>
                      <td className="p-2 text-center border-r border-zinc-800 font-black text-white bg-zinc-900/40">
                        {attr.value}
                      </td>
                      <td className="p-2 text-center font-black text-cyan-400 bg-cyan-950/20">
                        {modSign}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Highlights for Mod FUE & Mod DES */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-mono">Modificador Fuerza (FUE):</span>
              <span className="font-black font-mono text-cyan-400 text-sm">
                {modFue >= 0 ? `+${modFue}` : `${modFue}`}
              </span>
            </div>
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-mono">Modificador Destreza (DES):</span>
              <span className="font-black font-mono text-cyan-400 text-sm">
                {modDes >= 0 ? `+${modDes}` : `${modDes}`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (Lg 5): Estado de Combate, Defensas & Datos Personales */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Estado de Combate & Defensas */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ShieldAlert className="size-5 text-amber-400" />
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-wide">
                  ESTADO DE COMBATE & DEFENSAS
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  PARÁMETROS DERIVADOS HOMOLOGADOS
                </p>
              </div>
            </div>

            {/* Defensas Principales: Evasión & Coraje */}
            <div className="grid grid-cols-2 gap-3">
              {defenseList.map(def => {
                const Icon = def.icon;
                return (
                  <div key={def.label} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon className="size-4 text-cyan-400 shrink-0" />}
                      <span className="text-xs font-bold text-zinc-300">{def.label}</span>
                      <ModifierBadgeGroup sources={def.sources} />
                    </div>
                    <span className="text-base font-black text-white font-mono shrink-0 ml-2">
                      {displayValue(def.value, '0')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Combat Status Grid (Daño Físico, Daño Rango, RD, Iniciativa) */}
            <div className="grid grid-cols-2 gap-2.5">
              {combatStatusList.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                      <span>{item.label}</span>
                      {Icon && <Icon className="size-3.5 text-cyan-400" />}
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <span className="text-sm font-black text-white font-mono">
                        {displayValue(item.value, '0')}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.sub || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <ModifierNotesLegend className="mt-2 border-zinc-800 bg-zinc-950/40 text-zinc-500" />
          </div>

          {/* Expediente Personal / Registro Civil */}
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText className="size-5 text-cyan-400" />
              <div>
                <h3 className="text-base font-black uppercase text-white tracking-wide">
                  REGISTRO DE IDENTIDAD
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  DATOS BIOGRÁFICOS Y DEMOGRÁFICOS
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {personalDataList.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
                      {Icon && <Icon className="size-3 text-cyan-400" />}
                      <span>{item.label}</span>
                    </div>
                    <p className="font-bold text-white truncate pl-4.5 font-sans">
                      {displayValue(item.value)}
                    </p>
                  </div>
                );
              })}

              {/* Empleos / Ocupación adicional si existe */}
              {employments.length > 0 && (
                <div className="sm:col-span-2 p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
                    <Briefcase className="size-3 text-cyan-400" />
                    <span>Empleo / Puesto Institucional</span>
                  </div>
                  <p className="font-bold text-white truncate pl-4.5 font-sans">
                    {employments.map(e => `${e.position?.name} (${e.institution?.name})`).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          SECTION 2: RASGOS, DEBILIDADES, COMPETENCIAS & LICENCIAS
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rasgos y Condiciones */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-amber-400" />
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                CONDICIONES & RASGOS
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{traits.length} REG</span>
          </div>

          {traits.length > 0 ? (
            <div className="space-y-2">
              {traits.map((t: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <span className="font-bold text-amber-300 block font-mono">{t.name || t}</span>
                  {t.description && <p className="text-zinc-400 text-xs font-sans leading-relaxed">{t.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">Sin rasgos extraordinarios consignados.</p>
          )}
        </div>

        {/* Debilidades y Limitaciones */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-400" />
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                DEBILIDADES & LIMITACIONES
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{weaknesses.length} REG</span>
          </div>

          {weaknesses.length > 0 ? (
            <div className="space-y-2">
              {weaknesses.map((w: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <span className="font-bold text-rose-400 block font-mono">{w.name || w}</span>
                  {w.description && <p className="text-zinc-400 text-xs font-sans leading-relaxed">{w.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">Sin debilidades clínicas consignadas.</p>
          )}
        </div>

        {/* Habilidades & Competencias */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-cyan-400" />
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                HABILIDADES & COMPETENCIAS
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{skills.length} REG</span>
          </div>

          {skills.length > 0 ? (
            <div className="space-y-2">
              {skills.map((skill: any, idx: number) => {
                const sName = typeof skill === 'string' ? skill : skill.name || skill.label || 'Habilidad';
                const sLevel = typeof skill === 'object' ? Number(skill.level ?? skill.quantity ?? 1) : 1;
                const sDesc = typeof skill === 'object' ? skill.description : '';
                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{sName}</span>
                      <span className="font-mono text-cyan-400 font-bold">Nivel {sLevel}</span>
                    </div>
                    {sDesc && <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{sDesc}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">Sin competencias especiales registradas.</p>
          )}
        </div>

        {/* Licencias & Certificaciones */}
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Scroll className="size-5 text-amber-400" />
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                LICENCIAS & CERTIFICACIONES
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{credentials.length} REG</span>
          </div>

          {credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map((cred: any, idx: number) => {
                const cName = cred.element?.name || cred.name || 'Licencia';
                const cDesc = cred.element?.description || cred.description || '';
                const cKind = cred.element?.kind || cred.kind || 'Licencia';
                return (
                  <div key={idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{cName}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase">
                        {cKind}
                      </span>
                    </div>
                    {cDesc && <p className="text-zinc-400 text-xs font-sans leading-relaxed">{cDesc}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">Sin certificaciones especiales registradas.</p>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: INVENTARIO (OBJETOS, CONSUMIBLES, ARMAS, MATERIALES)
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="size-5 text-amber-400" />
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                INVENTARIO DECLARADO
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                OBJETOS, CONSUMIBLES, EQUIPAMIENTO Y MATERIALES
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">{possessions.length} ARTÍCULOS</span>
        </div>

        {possessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {possessions.map((item: any, idx: number) => {
              const itemName = item?.name || item?.element?.name || `Objeto #${idx + 1}`;
              const itemDesc = item?.description || item?.element?.description || '';
              const itemQty = item?.quantity ?? item?.possession?.quantity ?? 1;
              const itemKind = item?.kind || item?.element?.kind || 'Objeto';

              return (
                <div key={idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col justify-between text-xs space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-white truncate font-mono">{itemName}</span>
                      <span className="text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300 px-1.5 py-0.2 rounded border border-zinc-800 shrink-0">
                        x{itemQty}
                      </span>
                    </div>
                    {itemDesc && (
                      <p className="text-zinc-400 text-xs font-sans line-clamp-2 leading-relaxed">
                        {itemDesc}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase">
                    <span>{itemKind}</span>
                    {item?.equipped && <span className="text-cyan-400 font-bold">EQUIPADO</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic py-4 text-center">No hay objetos o equipamiento en inventario.</p>
        )}
      </div>

      {/* =========================================================================
          SECTION 4: TÉCNICAS (CON TODA LA INFORMACIÓN RELEVANTE)
          ========================================================================= */}
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Swords className="size-5 text-rose-500" />
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                TÉCNICAS & HABILIDADES ACTIVAS
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                INFORMACIÓN RELEVANTE COMPLETA (NOMBRE, COSTE CE, DESCRIPCIÓN NARRATIVA Y MECÁNICA)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">{techniques.length} REG</span>
        </div>

        {techniques.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techniques.map((tech: any, idx: number) => {
              const techName = tech?.name || `Técnica #${idx + 1}`;
              const techLevel = tech?.level ? `Nivel ${tech.level}` : 'Nivel 1';
              const techCost = tech?.cost !== undefined && tech?.cost !== null ? `${tech.cost} CE` : null;
              const techType = tech?.type || tech?.classification || null;
              const techTarget = tech?.target || tech?.defenseTarget || null;
              const autoDesc = tech?.autoDescription || tech?.mechanicalDescription || tech?.mechanicalDesc || '';
              const loreDesc = tech?.description || tech?.loreDescription || '';

              return (
                <div
                  key={tech.id || idx}
                  className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-3 shadow-md"
                >
                  {/* Top Bar: Name & Level */}
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="size-4 text-cyan-400 shrink-0" />
                      <h4 className="font-bold text-white text-sm font-oxanium uppercase tracking-wider truncate">
                        {techName}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/50 shrink-0">
                      {techLevel}
                    </span>
                  </div>

                  {/* Badges Strip: Coste CE, Tipo/Clasificación, Resistencia / Objetivo */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {techCost && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 font-bold">
                        Coste: {techCost}
                      </span>
                    )}
                    {techType && (
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/40 font-bold uppercase">
                        {techType}
                      </span>
                    )}
                    {techTarget && (
                      <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 font-bold uppercase flex items-center gap-1">
                        <Dices className="size-2.5" />
                        {techTarget}
                      </span>
                    )}
                  </div>

                  {/* Lore Description */}
                  {loreDesc && (
                    <div className="pt-1 text-xs text-zinc-300 leading-relaxed font-sans border-t border-zinc-900">
                      {loreDesc}
                    </div>
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
          <p className="text-xs text-zinc-500 italic py-4 text-center">No hay técnicas registradas en este expediente.</p>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: BIOGRAFÍA / HISTORIAL
          ========================================================================= */}
      {biography && (
        <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] p-5 sm:p-6 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Pencil className="size-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wide">
                HISTORIAL & BIOGRAFÍA
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                REGISTROS SUCINTOS DE LA TRAYECTORIA
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
            {biography}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs font-mono text-zinc-500 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 uppercase tracking-widest">
        <span>EXPEDIENTE OFICIAL DE PERSONAJE · SHADOWMORE OS</span>
        <span>SISTEMA REGISTRAL v4.2</span>
      </footer>
    </main>
  );
}
