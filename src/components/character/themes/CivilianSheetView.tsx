import React, { useMemo } from 'react';
import {
  FileText,
  User,
  Stamp,
  Building2,
  Coins,
  ShieldCheck,
  Scale,
  Award,
  BookOpen,
  Calendar,
  Briefcase,
  MapPin,
  CheckCircle,
  FileCheck2,
  FileBadge,
  Sparkles,
  Info,
  Scroll,
  Hash,
  Paperclip
} from 'lucide-react';
import { StatsHexagon, HexStat } from '../HexagonRadarChart';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
import { CANONICAL_STAT_ICONS } from '@/domain/canonicalStatIcons';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = '—') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface CivilianSheetViewProps {
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
  employments?: any[];
}

/**
 * Authentic Japanese Red Hanko (朱肉 / 朱印) Seal Component
 */
export function HankoSeal({
  text = '公認',
  subtext = '行政省',
  shape = 'circle',
  className = '',
}: {
  text?: string;
  subtext?: string;
  shape?: 'circle' | 'square';
  className?: string;
}) {
  if (shape === 'square') {
    return (
      <div
        className={cn(
          'inline-flex flex-col items-center justify-center border-2 border-red-700/80 bg-red-50/40 p-1 text-red-700 select-none shadow-xs font-serif',
          'relative before:absolute before:inset-0.5 before:border before:border-dashed before:border-red-600/50',
          className
        )}
        style={{ transform: 'rotate(-2.5deg)' }}
        aria-hidden="true"
      >
        <span className="text-[7px] tracking-widest font-bold uppercase leading-none text-red-800">
          {subtext}
        </span>
        <span className="text-xs font-black tracking-tighter leading-tight my-0.5">
          {text}
        </span>
        <span className="text-[6px] tracking-widest text-red-600 leading-none">
          登録済
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center size-12 rounded-full border-2 border-red-700/85 bg-red-100/30 text-red-700 select-none shadow-xs font-serif',
        'relative before:absolute before:inset-0.5 before:rounded-full before:border before:border-red-600/60',
        className
      )}
      style={{ transform: 'rotate(-4deg)' }}
      aria-hidden="true"
    >
      <span className="text-[6.5px] font-bold tracking-widest uppercase text-red-800/90 leading-none">
        {subtext}
      </span>
      <span className="text-[11px] font-black tracking-tight leading-tight my-0.5">
        {text}
      </span>
      <span className="text-[6px] font-bold tracking-widest text-red-700/80 leading-none">
        検証済
      </span>
    </div>
  );
}

export function CivilianSheetView({
  fullName,
  alias,
  avatar,
  group,
  groupColor,
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
}: CivilianSheetViewProps) {
  const charId = character?.id || 1;
  const registrationCode = `JPN-${String(charId).padStart(6, '0')}-CIV`;

  const resolvedPlusUltra = Number(
    plusUltra ??
    profile?.plus_ultra ??
    profile?.plusUltra ??
    character?.plus_ultra ??
    0
  );

  const attrWithMods = baseAttributes.map(attr => ({
    ...attr,
    mod: Math.floor((attr.value || 0) / 2),
  }));

  const fueStat = attrWithMods.find(a => (a as any).key === 'FUE' || a.label?.toLowerCase().includes('fuerza'));
  const desStat = attrWithMods.find(a => (a as any).key === 'DES' || a.label?.toLowerCase().includes('destreza'));
  const modFue = fueStat?.mod ?? 0;
  const modDes = desStat?.mod ?? 0;

  const normalizedPersonalData = useMemo(() => {
    const rawBirth = 
      profile?.birth_date ||
      profile?.basic_birth_date ||
      profile?.fecha_nacimiento ||
      profile?.nacimiento ||
      profile?.fecha_de_nacimiento ||
      profile?.birthday ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('cumple') || d.label?.toLowerCase().includes('nacimiento'))?.value;

    const rawAgeVal = 
      profile?.basic_age ??
      profile?.age ??
      profile?.edad ??
      personalDataList?.find(d => d.label?.toLowerCase().includes('edad'))?.value;

    const computedAge = rawBirth ? (() => {
      try {
        const b = new Date(rawBirth);
        if (!isNaN(b.getTime())) {
          const ref = new Date(2201, 0, 1);
          let a = ref.getFullYear() - b.getFullYear();
          const m = ref.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) a--;
          return a > 0 ? `${a} años` : undefined;
        }
      } catch { return undefined; }
      return undefined;
    })() : undefined;

    const ageDisplay = (rawAgeVal !== undefined && rawAgeVal !== null && rawAgeVal !== '' && rawAgeVal !== 'No especificada')
      ? (String(rawAgeVal).includes('año') ? String(rawAgeVal) : `${rawAgeVal} años`)
      : (computedAge || 'No especificada');

    const birthDisplay = (rawBirth !== undefined && rawBirth !== null && rawBirth !== '' && rawBirth !== 'No especificado' && rawBirth !== 'No especificada')
      ? String(rawBirth)
      : 'No especificado';

    const genderDisplay = 
      profile?.gender ||
      profile?.genero ||
      profile?.sexo ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('género') || d.label?.toLowerCase().includes('genero'))?.value ||
      'No especificado';

    const bloodTypeDisplay = 
      profile?.basic_blood_type ||
      profile?.blood_type ||
      profile?.bloodType ||
      profile?.grupo_sanguineo ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('sangre'))?.value ||
      'No especificado';

    const alignmentDisplay = 
      profile?.basic_alignment ||
      profile?.alignment ||
      profile?.alineacion ||
      profile?.alineación ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('alineación') || d.label?.toLowerCase().includes('alineacion'))?.value ||
      'No especificada';

    const groupDisplay = group || profile?.faction_group || profile?.group || 'Civiles';

    const occDisplay = 
      (employments.length > 0 ? employments.map(e => `${e.position?.name || 'Empleado'} (${e.institution?.name || 'Entidad'})`).join(', ') : null) ||
      profile?.occupation ||
      profile?.ocupacion ||
      profile?.ocupación ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('ocupación') || d.label?.toLowerCase().includes('ocupacion') || d.label?.toLowerCase().includes('clase'))?.value ||
      'Sector Civil / Autónomo';

    const nationalityDisplay = 
      profile?.nationality ||
      profile?.nacionalidad ||
      personalDataList?.find(d => d.label?.toLowerCase().includes('nacionalidad'))?.value ||
      'Japonesa';

    return [
      { label: 'Edad', value: ageDisplay },
      { label: 'Cumpleaños', value: birthDisplay },
      { label: 'Género', value: genderDisplay },
      { label: 'Tipo de Sangre', value: bloodTypeDisplay },
      { label: 'Alineación', value: alignmentDisplay },
      { label: 'Facción / Grupo', value: groupDisplay },
      { label: 'Ocupación / Empleo', value: occDisplay },
      { label: 'Nacionalidad', value: nationalityDisplay },
    ];
  }, [personalDataList, profile, group, employments]);

  return (
    <main className="max-w-5xl mx-auto px-2 sm:px-4 py-6 font-serif selection:bg-amber-200 selection:text-stone-900">
      {/* Official Government Dossier Container - Light archival paper background */}
      <div className="relative rounded-2xl border-[3px] border-stone-800 bg-[#fbf9f4] text-stone-900 shadow-[0_12px_45px_rgba(0,0,0,0.18)] p-6 sm:p-10 overflow-hidden">
        
        {/* Subtle Archival Watermark Security Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#d6cebe_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
        
        {/* Faint Official Background Seal Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.035] select-none text-stone-950 font-serif text-[180px] font-black tracking-widest">
          日本国
        </div>

        {/* =========================================================================
            TOP GOVERNMENT HEADER (Official Bureaucratic Heading with Seals)
            ========================================================================= */}
        <header className="relative z-10 border-b-2 border-stone-800 pb-5 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            
            {/* National Crest & Formal Titles */}
            <div className="flex items-start gap-4 text-center sm:text-left">
              <div className="hidden sm:flex size-14 shrink-0 rounded-full border-2 border-stone-800 bg-stone-100 items-center justify-center p-2 shadow-xs">
                {/* Stylized Japanese Administrative Mon Emblem */}
                <div className="size-full rounded-full border border-stone-700 flex flex-col items-center justify-center text-stone-800 font-serif font-black text-xs leading-none">
                  <span>日本</span>
                  <span className="text-[8px] font-normal">行政</span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold tracking-[0.25em] text-stone-600 uppercase font-sans">
                  GOBIERNO DE JAPÓN · MINISTERIO DE ASUNTOS INTERNOS Y REGISTRO CIVIL
                </p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 font-serif mt-0.5">
                  日本国 住民基本台帳 · 個別人事記録票
                </h1>
                <p className="text-xs sm:text-sm text-stone-700 italic font-serif mt-0.5">
                  Expediente Homologado de Población Civil y Registro de Ciudadanos
                </p>
              </div>
            </div>

            {/* Verification Hanko Seals & Expediente ID */}
            <div className="flex items-center gap-3 shrink-0 self-center sm:self-start">
              <HankoSeal text="公認" subtext="行政省" shape="circle" />
              <HankoSeal text="登録" subtext="法務課" shape="square" />
              
              <div className="border border-stone-400 bg-stone-50/80 px-2.5 py-1 text-right font-mono text-xs">
                <span className="text-[9px] uppercase tracking-wider text-stone-500 block">Nº EXPEDIENTE:</span>
                <span className="font-bold text-stone-900 tracking-wider">{registrationCode}</span>
              </div>
            </div>
          </div>

          {/* Sub-header Information Strip */}
          <div className="mt-4 pt-2.5 border-t border-dashed border-stone-300 flex flex-wrap items-center justify-between text-xs text-stone-600 font-sans gap-2">
            <div className="flex items-center gap-3">
              <span><strong>Prefectura:</strong> Región Metropolitana (Kanto / Musutafu)</span>
              <span>·</span>
              <span><strong>Clasificación:</strong> <span className="font-bold text-stone-900">POBLACIÓN CIVIL</span></span>
            </div>
            <div className="flex items-center gap-3">
              <span><strong>Validez Legal:</strong> <span className="text-emerald-800 font-bold">Vigente y Conforme</span></span>
              <span>·</span>
              <span className="font-mono text-[11px]">FECHA REG: 2185年</span>
            </div>
          </div>
        </header>

        {/* =========================================================================
            SECTION I: DATOS DE IDENTIDAD CIVIL (戸籍基本情報)
            ========================================================================= */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>I. REGISTRO DE IDENTIDAD Y ESTADO CIVIL (戸籍事項)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">REF: 住民票第12号</span>
          </div>

          <div className="border-x border-b border-stone-800 bg-white grid grid-cols-1 md:grid-cols-12">
            
            {/* Official Photo Box with authentic overlapping Hanko Seal */}
            <div className="md:col-span-3 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-stone-300 bg-stone-50/50 relative">
              <div className="relative w-36 h-48 border-2 border-stone-700 bg-stone-100 overflow-hidden shadow-sm flex items-center justify-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={fullName}
                    className="w-full h-full object-cover object-top filter grayscale contrast-105"
                  />
                ) : (
                  <div className="text-center p-3 text-stone-400">
                    <User className="size-12 mx-auto mb-1 stroke-1" />
                    <span className="text-[10px] font-sans">Sin fotografía archivada</span>
                  </div>
                )}

                {/* Hanko Overlapping Seal (Warīin - 割印) on photo border */}
                <div className="absolute -bottom-3 -right-3 pointer-events-none z-20">
                  <HankoSeal text="割印" subtext="公証" shape="circle" className="size-10 text-[9px]" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-stone-500 uppercase mt-2">
                Foto Oficial del Titular
              </span>
            </div>

            {/* Civil Identity Table Grid */}
            <div className="md:col-span-9 divide-y divide-stone-200">
              
              {/* Row 1: Full Legal Name */}
              <div className="grid grid-cols-1 sm:grid-cols-6 p-3 gap-2 items-center">
                <div className="sm:col-span-2 text-xs font-bold text-stone-700 uppercase">
                  Nombre Completo Legal:
                </div>
                <div className="sm:col-span-4 text-lg font-bold font-serif text-stone-950">
                  {fullName}
                </div>
              </div>

              {/* Row 2: Alias civil & Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 text-xs">
                <div className="p-2.5">
                  <span className="text-[10px] text-stone-500 uppercase font-sans block">Alias / Sobrenombre:</span>
                  <span className="font-medium text-stone-800">{alias && alias !== 'Sin alias' ? alias : 'Ninguno registrado'}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] text-stone-500 uppercase font-sans block">Estado del Registro:</span>
                  <span className="font-bold text-stone-900">{status || 'Activo'}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] text-stone-500 uppercase font-sans block">Facción / Grupo:</span>
                  <span className="font-bold text-stone-900">{group || 'Civiles'}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] text-stone-500 uppercase font-sans block">Etapa / Categoría:</span>
                  <span className="font-medium text-stone-800">{basicStage || 'Ciudadano Común'}</span>
                </div>
              </div>

              {/* Row 3: Biometrics & Demographics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-200 text-xs">
                {normalizedPersonalData.slice(0, 4).map((data: any, idx: number) => (
                  <div key={idx} className="p-2.5">
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">{data.label}:</span>
                    <span className="font-medium text-stone-800">{displayValue(data.value)}</span>
                  </div>
                ))}
              </div>

              {/* Row 4: Remaining Personal Data */}
              {normalizedPersonalData.length > 4 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-stone-200 text-xs">
                  {normalizedPersonalData.slice(4).map((data: any, idx: number) => (
                    <div key={idx} className="p-2.5">
                      <span className="text-[10px] text-stone-500 uppercase font-sans block">{data.label}:</span>
                      <span className="font-medium text-stone-800">{displayValue(data.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION II: DECLARACIÓN METAHUMANA (超常能力・個性届出)
            ========================================================================= */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>II. DECLARACIÓN DE CAPACIDAD METAHUMANA / REGISTRO DE DON (個性届出書)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">LEY DE DONES ART. 12</span>
          </div>

          <div className="border-x border-b border-stone-800 bg-white p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-stone-200 pb-3">
              <div className="p-2 bg-stone-50 border border-stone-200 rounded">
                <span className="text-[10px] font-sans font-bold text-stone-500 uppercase block">Don Declarado:</span>
                <span className="font-serif font-black text-base text-stone-900">{quirkName || 'Sin don registrado'}</span>
              </div>
              <div className="p-2 bg-stone-50 border border-stone-200 rounded">
                <span className="text-[10px] font-sans font-bold text-stone-500 uppercase block">Clasificación Ministerial:</span>
                <span className="font-serif font-bold text-stone-800">{quirkType || 'No determinado'}</span>
              </div>
              <div className="p-2 bg-stone-50 border border-stone-200 rounded">
                <span className="text-[10px] font-sans font-bold text-stone-500 uppercase block">Grado / Desarrollo:</span>
                <span className="font-serif font-bold text-stone-800">{quirkEvolution || 'Nivel 1'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-sans font-bold text-stone-500 uppercase block mb-1">
                Dictamen Técnico y Memoria Descriptiva Archivada:
              </span>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-serif bg-stone-50/50 p-3 border border-stone-200 rounded">
                {quirkDescription || 'El ciudadano no presenta manifestaciones anómalas registradas ni antecedentes de uso lesivo de particularidad metahumana.'}
              </p>
            </div>

            {/* Niveles de Desarrollo de Don */}
            {(quirkLevelOne || quirkLevelTwo || quirkLevelThree) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-stone-200">
                {quirkLevelOne && (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded space-y-1">
                    <span className="text-[10px] font-sans font-bold text-stone-600 uppercase block">
                      Nivel 1 • Despertar
                    </span>
                    <p className="text-xs text-stone-800 font-serif leading-relaxed">
                      {quirkLevelOne}
                    </p>
                  </div>
                )}
                {quirkLevelTwo && (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded space-y-1">
                    <span className="text-[10px] font-sans font-bold text-stone-600 uppercase block">
                      Nivel 2 • Dominio
                    </span>
                    <p className="text-xs text-stone-800 font-serif leading-relaxed">
                      {quirkLevelTwo}
                    </p>
                  </div>
                )}
                {quirkLevelThree && (
                  <div className="p-2.5 bg-stone-50 border border-stone-200 rounded space-y-1">
                    <span className="text-[10px] font-sans font-bold text-stone-600 uppercase block">
                      Nivel 3 • Plus Ultra
                    </span>
                    <p className="text-xs text-stone-800 font-serif leading-relaxed">
                      {quirkLevelThree}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-amber-50/70 border border-amber-300/80 p-2.5 rounded text-[11px] text-amber-900 flex items-start gap-2 font-sans">
              <Info className="size-4 shrink-0 mt-0.5 text-amber-800" />
              <span>
                <strong>Aviso de Restricción Legal:</strong> Queda estrictamente prohibido el empleo de dones en la vía pública o en centros de trabajo sin autorización administrativa expresa, bajo apercibimiento de sanción según el Código de Convivencia Civil.
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION III: ACTIVIDAD ECONÓMICA Y PATRIMONIO (職業及び財産状況)
            ========================================================================= */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>III. OCUPACIÓN LABORAL Y BIENES DECLARADOS (就労状況・資産)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">HACIENDA PÚBLICA</span>
          </div>

          <div className="border-x border-b border-stone-800 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 text-xs">
            <div className="p-3.5 flex items-center gap-3">
              <div className="p-2 border border-stone-400 bg-stone-100 text-stone-800">
                <Briefcase className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-sans text-stone-500 uppercase block">Ocupación / Empleo:</span>
                <span className="font-bold text-stone-900">
                  {employments.length > 0
                    ? employments.map(e => `${e.position?.name} (${e.institution?.name})`).join(', ')
                    : profile?.occupation || profile?.ocupacion || 'Sector Civil / Autónomo'}
                </span>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3">
              <div className="p-2 border border-stone-400 bg-stone-100 text-stone-800">
                <Coins className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-sans text-stone-500 uppercase block">Fondos y Capital Registrado:</span>
                <span className="font-serif font-bold text-base text-stone-900">
                  ¥ {Number(yen || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3">
              <div className="p-2 border border-stone-400 bg-stone-100 text-stone-800">
                <Award className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-sans text-stone-500 uppercase block">Méritos y Experiencia Civil:</span>
                <span className="font-serif font-bold text-base text-stone-900">
                  {exp || 0} EXP <span className="text-xs text-stone-500 font-normal font-sans">(Reputación: {reputation || 0})</span>
                </span>
              </div>
            </div>

            {resolvedPlusUltra > 0 && (
              <div className="p-3.5 flex items-center gap-3 bg-red-50/40">
                <div className="p-2 border border-red-700/60 bg-red-100 text-red-700">
                  <Sparkles className="size-5 text-red-700" />
                </div>
                <div>
                  <span className="text-[10px] font-sans text-red-800 uppercase block font-bold">Reserva Plus Ultra (超克):</span>
                  <span className="font-serif font-black text-base text-red-900">
                    {resolvedPlusUltra} PTS <span className="text-[10px] text-red-700 font-normal font-sans">(Extraordinario)</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            SECTION IV: EVALUACIÓN FÍSICA Y BIOMÉTRICA (能力評価診断表)
            ========================================================================= */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>IV. CERTIFICACIÓN MÉDICA Y EVALUACIÓN BIOMÉTRICA (健康及び基礎診断)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">CLÍNICA HOMOLOGADA</span>
          </div>

          <div className="border-x border-b border-stone-800 bg-white p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Hexagon Radar in Formal Japanese Style */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-stone-50 border border-stone-300 rounded">
              <div className="w-full flex items-center justify-between border-b border-stone-300 pb-2 mb-2 text-xs">
                <span className="font-bold text-stone-800 font-serif">DIAGRAMA DE APTITUD BIOMÉTRICA</span>
                <span className="font-mono text-[10px] text-stone-500">6 PARÁMETROS</span>
              </div>
              <StatsHexagon stats={baseAttributes} theme="civilian" accentColor={groupColor} />
              <p className="text-[10px] text-stone-500 italic mt-2 text-center font-serif">
                Evaluación homologada según el baremo médico oficial del Ministerio de Salud.
              </p>
            </div>

            {/* Tabular Numerical Breakdown with Modifiers */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                <table className="w-full border-collapse border border-stone-400 text-xs text-stone-800">
                  <thead>
                    <tr className="bg-stone-200/80 text-stone-900 border-b border-stone-400">
                      <th className="p-1.5 text-left border-r border-stone-400 font-bold">Parámetro</th>
                      <th className="p-1.5 text-center border-r border-stone-400 font-bold">Base</th>
                      <th className="p-1.5 text-center border-r border-stone-400 font-bold">Bono</th>
                      <th className="p-1.5 text-center border-r border-stone-400 font-bold">Total</th>
                      <th className="p-1.5 text-center font-bold text-amber-900">Mod.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300">
                    {attrWithMods.map((attr, idx) => {
                      const keySuffix = (attr as any).key ? ` (${(attr as any).key})` : '';
                      const isFuerza = (attr as any).key === 'FUE' || attr.label?.toLowerCase().includes('fuerza');
                      const isDestreza = (attr as any).key === 'DES' || attr.label?.toLowerCase().includes('destreza');
                      const modSign = attr.mod >= 0 ? `+${attr.mod}` : `${attr.mod}`;
                      return (
                        <tr
                          key={(attr as any).key || attr.label || idx}
                          className={cn('hover:bg-stone-50', (isFuerza || isDestreza) && 'bg-amber-50/50')}
                        >
                          <td className="p-1.5 border-r border-stone-300 font-serif font-bold text-stone-900">
                            {attr.label}{keySuffix}
                          </td>
                          <td className="p-1.5 text-center border-r border-stone-300 font-mono">
                            {attr.base}
                          </td>
                          <td className="p-1.5 text-center border-r border-stone-300 font-mono text-stone-600">
                            {attr.bonus > 0 ? `+${attr.bonus}` : '0'}
                          </td>
                          <td className="p-1.5 text-center border-r border-stone-300 font-mono font-bold text-stone-950 bg-stone-100/50">
                            {attr.value}
                          </td>
                          <td className="p-1.5 text-center font-mono font-black text-amber-900 bg-amber-100/40">
                            {modSign}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Modifiers Highlight Strip (Fuerza y Destreza) */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-300 text-xs">
                  <div className="p-2 border border-stone-300 bg-stone-50 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-stone-500 font-sans flex items-center gap-1">
                        <CANONICAL_STAT_ICONS.modFuerza className="size-3 text-stone-700" />
                        Mod. Fuerza (FUE):
                      </span>
                      <span className="text-[10px] text-stone-600 font-serif">Bono CQC / Melee</span>
                    </div>
                    <span className="font-mono font-black text-sm text-stone-900 bg-white px-2 py-0.5 border border-stone-300 rounded">
                      {modFue >= 0 ? `+${modFue}` : `${modFue}`}
                    </span>
                  </div>
                  <div className="p-2 border border-stone-300 bg-stone-50 rounded flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-stone-500 font-sans flex items-center gap-1">
                        <CANONICAL_STAT_ICONS.modDestreza className="size-3 text-stone-700" />
                        Mod. Destreza (DES):
                      </span>
                      <span className="text-[10px] text-stone-600 font-serif">Bono Distancia / Precisión</span>
                    </div>
                    <span className="font-mono font-black text-sm text-stone-900 bg-white px-2 py-0.5 border border-stone-300 rounded">
                      {modDes >= 0 ? `+${modDes}` : `${modDes}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vitals & Combat Summary Strip Homologado */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-dashed border-stone-300 text-xs">
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.health className="size-3 text-rose-600 fill-rose-600" />
                    Vitalidad (HP):
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{currentHealth} / {maxHealth}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.stamina className="size-3 text-amber-600 fill-amber-600" />
                    Estamina (ES):
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{currentStamina} / {maxStamina}</span>
                </div>
                {resolvedPlusUltra > 0 && (
                  <div className="p-2 border border-red-700/60 bg-red-50/50 rounded flex flex-col justify-between">
                    <span className="text-[9px] text-red-800 uppercase font-sans font-bold flex items-center gap-1">
                      <CANONICAL_STAT_ICONS.plusUltra className="size-3 text-red-600" />
                      Plus Ultra (超克):
                    </span>
                    <span className="font-black text-red-900 font-mono text-sm">{resolvedPlusUltra} PTS</span>
                  </div>
                )}
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.initiative className="size-3 text-stone-700" />
                    Iniciativa (Ini):
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{initiativeText}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.evasion className="size-3 text-stone-700" />
                    Evasión (EVA):
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{evasion}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.courage className="size-3 text-stone-700" />
                    Coraje (COR):
                  </span>
                  <span className="font-bold text-stone-900 font-mono text-sm">{courage}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.physicalDamage className="size-3 text-stone-700" />
                    Daño Físico (CQC):
                  </span>
                  <span className="font-bold text-stone-900 font-mono">{physicalDamageText}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.rangeDamage className="size-3 text-stone-700" />
                    Daño Rango (Dist.):
                  </span>
                  <span className="font-bold text-stone-900 font-mono">{rangeDamageText}</span>
                </div>
                <div className="p-2 border border-stone-300 bg-stone-50 rounded">
                  <span className="text-[9px] text-stone-500 uppercase font-sans flex items-center gap-1">
                    <CANONICAL_STAT_ICONS.damageReduction className="size-3 text-stone-700" />
                    Reducción Daño (RD):
                  </span>
                  <span className="font-bold text-stone-900 font-mono">{damageReductionText}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION V: COMPETENCIAS, RASGOS Y CONDICIONES (能力及び特記事項)
            ========================================================================= */}
        <section className="relative z-10 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Habilidades Registradas */}
          <div>
            <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span>HABILIDADES & COMPETENCIAS (技能)</span>
              <span className="font-mono text-[10px] text-stone-300 font-normal">{skills.length} REG</span>
            </div>
            <div className="border-x border-b border-stone-800 bg-white p-3 min-h-[140px] divide-y divide-stone-200">
              {skills.length > 0 ? (
                skills.map((skill: any, idx: number) => {
                  const sName = typeof skill === 'string' ? skill : skill.name || skill.label || 'Habilidad';
                  const sLevel = typeof skill === 'object' ? Number(skill.level ?? skill.quantity ?? 1) : 1;
                  const sDesc = typeof skill === 'object' ? skill.description : '';
                  return (
                    <div key={idx} className="py-2 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-stone-900">{sName}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-700">
                          <span className="font-bold">Nivel {sLevel}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((step) => (
                              <span
                                key={step}
                                className={cn(
                                  'size-2 border border-stone-700',
                                  step <= sLevel ? 'bg-stone-800' : 'bg-transparent'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {sDesc && <p className="text-[10px] text-stone-600 font-serif leading-relaxed">{sDesc}</p>}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-stone-400 italic font-serif">
                  Sin competencias especiales declaradas.
                </div>
              )}
            </div>
          </div>

          {/* Certificaciones y Licencias Oficiales */}
          <div>
            <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
              <span>LICENCIAS & PERMISOS OFICIALES (免許・資格)</span>
              <span className="font-mono text-[10px] text-stone-300 font-normal">{credentials.length} REG</span>
            </div>
            <div className="border-x border-b border-stone-800 bg-white p-3 min-h-[140px] space-y-2">
              {credentials.length > 0 ? (
                credentials.map((cred: any, idx: number) => {
                  const cName = cred.element?.name || cred.name || 'Licencia';
                  const cDesc = cred.element?.description || cred.description || '';
                  const cKind = cred.element?.kind || cred.kind || 'license';
                  return (
                    <div key={idx} className="p-2 border border-stone-300 bg-stone-50/60 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                          <FileBadge className="size-3.5 text-stone-700" />
                          {cName}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 border border-stone-400 text-stone-600 bg-white">
                          OFICIAL
                        </span>
                      </div>
                      {cDesc && (
                        <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 font-serif italic">
                          {cDesc}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-stone-400 italic font-serif">
                  Sin acreditaciones o licencias especiales registradas.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION VI: RASGOS, DEBILIDADES Y TÉCNICAS (特記事項・個別技術)
            ========================================================================= */}
        <section className="relative z-10 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rasgos Notables */}
          <div>
            <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              CONDICIONES NOTABLES Y RASGOS (特質)
            </div>
            <div className="border-x border-b border-stone-800 bg-white p-3 space-y-2">
              {traits.length > 0 ? (
                traits.map((t: any, idx: number) => (
                  <div key={idx} className="p-2 border border-stone-200 bg-stone-50 text-xs">
                    <span className="font-serif font-bold text-stone-900 block">{t.name || t}</span>
                    {t.description && <p className="text-[11px] text-stone-600 font-serif italic mt-0.5">{t.description}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic py-2 text-center font-serif">Sin rasgos extraordinarios.</p>
              )}
            </div>
          </div>

          {/* Debilidades y Limitaciones */}
          <div>
            <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              LIMITACIONES O CONDICIONES CLÍNICAS (弱点・制約)
            </div>
            <div className="border-x border-b border-stone-800 bg-white p-3 space-y-2">
              {weaknesses.length > 0 ? (
                weaknesses.map((w: any, idx: number) => (
                  <div key={idx} className="p-2 border border-stone-200 bg-stone-50 text-xs">
                    <span className="font-serif font-bold text-stone-900 block">{w.name || w}</span>
                    {w.description && <p className="text-[11px] text-stone-600 font-serif italic mt-0.5">{w.description}</p>}
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 italic py-2 text-center font-serif">Sin limitaciones clínicas consignadas.</p>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION VII: BIENES DECLARADOS E INVENTARIO (物品目録)
            (Strictly items: equipment, consumables, tools, materials)
            ========================================================================= */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>V. BIENES, PERTENENCIAS Y EQUIPAMIENTO DECLARADO (所持品目録)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">{possessions.length} ARTÍCULOS</span>
          </div>

          <div className="border-x border-b border-stone-800 bg-white p-4">
            {possessions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {possessions.map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 border border-stone-300 bg-stone-50/70 rounded text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-stone-950 truncate">{item.name}</span>
                        <span className="font-mono text-[10px] font-bold text-stone-600 bg-white px-1.5 py-0.2 border border-stone-300">
                          x{item.quantity || 1}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-stone-600 line-clamp-2 font-serif italic">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 pt-1 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                      <span className="uppercase">{item.kind || 'Objeto'}</span>
                      {item.equipped && <span className="font-bold text-stone-800">EN USO</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-400 italic font-serif">
                Sin objetos personales de valor o equipamiento especial consignado en este expediente.
              </div>
            )}
          </div>
        </section>

        {/* Techniques / Special civilian applications */}
        <section className="relative z-10 mb-6">
          <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <span>VI. PROCEDIMIENTOS O DESTREZAS METODOLÓGICAS (応用技術)</span>
            <span className="font-mono text-[10px] text-stone-300 font-normal">{techniques.length} REGISTRADAS</span>
          </div>
          <div className="border-x border-b border-stone-800 bg-white p-4 space-y-4">
            {techniques && techniques.length > 0 ? (
              techniques.map((tech: any, idx: number) => {
                const techName = tech?.name || `Procedimiento #${idx + 1}`;
                const techLevel = tech?.level ? `Nivel ${tech.level}` : 'Nivel 1';
                const techCost = tech?.cost !== undefined && tech?.cost !== null ? `${tech.cost} CE` : null;
                const techType = tech?.type || tech?.classification || null;
                const techTarget = tech?.target || tech?.defenseTarget || null;
                const loreDesc = tech?.description || tech?.loreDescription || '';
                const autoDesc = tech?.autoDescription || tech?.mechanicalDescription || tech?.mechanicalDesc || '';

                return (
                  <div key={tech.id || idx} className="p-3.5 border border-stone-300 bg-stone-50/70 rounded text-xs space-y-2.5">
                    {/* Header: Name and Level */}
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-4 text-stone-700 shrink-0" />
                        <span className="font-serif font-bold text-sm text-stone-950">{techName}</span>
                      </div>
                      <span className="font-mono text-[11px] text-stone-800 bg-stone-200/80 px-2 py-0.5 border border-stone-300 rounded font-bold">
                        {techLevel}
                      </span>
                    </div>

                    {/* Metadata Badges: Coste CE, Tipo, Resistencia/Objetivo */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      {techCost && (
                        <span className="px-2 py-0.5 border border-amber-600/70 bg-amber-50 text-amber-900 font-bold rounded">
                          Coste: {techCost}
                        </span>
                      )}
                      {techType && (
                        <span className="px-2 py-0.5 border border-stone-400 bg-white text-stone-800 uppercase rounded">
                          Clase: {techType}
                        </span>
                      )}
                      {techTarget && (
                        <span className="px-2 py-0.5 border border-stone-400 bg-white text-stone-800 uppercase rounded">
                          Objetivo: {techTarget}
                        </span>
                      )}
                    </div>

                    {/* Lore Description */}
                    {loreDesc && (
                      <p className="text-xs text-stone-800 font-serif leading-relaxed pl-1">
                        {loreDesc}
                      </p>
                    )}

                    {/* Mechanical Generated Description */}
                    {autoDesc && (
                      <div className="p-2.5 bg-stone-100/90 border border-stone-300 rounded text-[11px] font-mono space-y-1">
                        <span className="text-[10px] font-bold text-stone-600 uppercase flex items-center gap-1">
                          <Sparkles className="size-3 text-stone-700" />
                          Memoria Descriptiva Mecánica Registrada:
                        </span>
                        <p className="text-stone-900 leading-relaxed">
                          {autoDesc}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-stone-400 italic font-serif">
                Sin procedimientos o destrezas metodológicas registradas en este expediente.
              </div>
            )}
          </div>
        </section>

        {/* Biography / Notes */}
        {biography && (
          <section className="relative z-10 mb-6">
            <div className="bg-stone-800 text-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              VII. OBSERVACIONES Y NOTAS REGISTRALES (備考)
            </div>
            <div className="border-x border-b border-stone-800 bg-white p-4 text-xs font-serif leading-relaxed text-stone-800 whitespace-pre-wrap">
              {biography}
            </div>
          </section>
        )}

        {/* =========================================================================
            LEGAL CLOSING CLAUSE & OFFICIAL JAPANESE STAMP SIGN-OFF (認証結審)
            ========================================================================= */}
        <footer className="relative z-10 mt-8 pt-6 border-t-2 border-stone-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            <div className="md:col-span-8 space-y-2 text-xs text-stone-700 font-serif leading-relaxed">
              <p className="font-bold text-stone-900">
                CLÁUSULA DE FE PÚBLICA Y VALIDEZ ADMINISTRATIVA:
              </p>
              <p className="text-[11px] text-stone-600">
                Doy fe de que los datos consignados en este expediente se corresponden fielmente con los archivos del Registro Civil de Población y del Departamento de Registro de Dones Metahumanos. Este documento surte plenos efectos probatorios ante autoridades judiciales, prefecturas y entidades públicas de Japón.
              </p>
              <div className="pt-2 flex items-center gap-4 text-[10px] font-mono text-stone-500">
                <span>CÓDIGO HASH: SHA256:{String(charId * 987654321).slice(0, 16)}</span>
                <span>·</span>
                <span>CERT-ID: JPN-{charId}-CIVIL</span>
              </div>
            </div>

            {/* Official Stamp Authentication Block */}
            <div className="md:col-span-4 flex flex-col items-center sm:items-end justify-center">
              <div className="border border-stone-400 bg-white p-3 rounded text-center w-full max-w-[220px]">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 font-sans mb-1">
                  SELLO DEL REGISTRADOR OFICIAL
                </div>
                <div className="h-16 flex items-center justify-center gap-2">
                  <HankoSeal text="認証" subtext="法務省" shape="circle" className="size-11" />
                  <HankoSeal text="合議" subtext="総務課" shape="square" className="size-10" />
                </div>
                <div className="text-[9px] text-stone-400 font-mono border-t border-stone-200 pt-1 mt-1">
                  ARCHIVADO CONFORME
                </div>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}
