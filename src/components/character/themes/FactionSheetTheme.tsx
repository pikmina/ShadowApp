import React, { useState } from 'react';
import {
  GraduationCap,
  Shield,
  Skull,
  FileText,
  Eye,
  BookOpen,
  Award,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Bookmark,
  Pencil,
  BookmarkCheck,
  Star,
  Library,
  Tag,
  PenTool,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FactionThemeId = 'base' | 'hero' | 'student' | 'civilian' | 'villain' | 'vigilante';

export interface FactionThemeOption {
  id: FactionThemeId;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  activeBg: string;
}

export const FACTION_THEMES: FactionThemeOption[] = [
  {
    id: 'base',
    label: 'Ficha Base',
    sublabel: 'Expediente Estándar',
    icon: FileText,
    badgeBg: 'bg-zinc-500/20',
    badgeText: 'text-zinc-300',
    borderColor: 'border-zinc-500/50',
    activeBg: 'bg-zinc-800 text-zinc-100 border-zinc-400',
  },
  {
    id: 'hero',
    label: 'Héroes',
    sublabel: 'Cyber-Pro Agencia',
    icon: Shield,
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    activeBg: 'bg-cyan-950/60 text-cyan-300 border-cyan-400',
  },
  {
    id: 'student',
    label: 'Estudiantes',
    sublabel: 'Cuaderno Escolar / UA',
    icon: GraduationCap,
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-400',
    borderColor: 'border-blue-400/50',
    activeBg: 'bg-blue-900/60 text-blue-200 border-blue-400',
  },
  {
    id: 'civilian',
    label: 'Civiles',
    sublabel: 'Documento Legal / Formal',
    icon: FileText,
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    activeBg: 'bg-amber-950/60 text-amber-300 border-amber-400',
  },
  {
    id: 'villain',
    label: 'Villanos',
    sublabel: 'Registro de Amenaza',
    icon: Skull,
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    activeBg: 'bg-rose-950/60 text-rose-300 border-rose-400',
  },
  {
    id: 'vigilante',
    label: 'Vigilantes',
    sublabel: 'Expediente Extraoficial',
    icon: Eye,
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    activeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-400',
  },
];

/**
 * Detects appropriate faction theme strictly based on the assigned faction / group:
 * - Sin grupo / grupo desconocido -> BASE
 * - Héroes -> HERO
 * - Estudiantes -> STUDENT
 * - Villanos -> VILLAIN
 * - Civiles -> CIVILIAN
 * - Vigilantes -> VIGILANTE
 * 
 * CANONICAL RULE: Fallback is strictly BASE. NEVER HERO.
 */
export function detectFactionTheme(groupName?: string | null): FactionThemeId {
  if (!groupName) return 'base';
  const lower = groupName.toLowerCase().trim();

  // 1. Estudiantes -> STUDENT
  if (
    lower.includes('estudiante') ||
    lower.includes('estudiantes') ||
    lower.includes('alumno') ||
    lower.includes('alumnos') ||
    lower.includes('clase 1') ||
    lower.includes('clase 2') ||
    lower.includes('clase a') ||
    lower.includes('clase b') ||
    lower.includes('academia ua') ||
    lower === 'ua'
  ) {
    return 'student';
  }

  // 2. Héroes -> HERO
  if (
    lower.includes('hero') ||
    lower.includes('héro') ||
    lower.includes('pro-hero') ||
    lower.includes('pro hero')
  ) {
    return 'hero';
  }

  // 3. Civiles -> CIVILIAN
  if (
    lower.includes('civil') ||
    lower.includes('civiles') ||
    lower.includes('ciudadano') ||
    lower.includes('ciudadanos') ||
    lower.includes('ministerio') ||
    lower.includes('gobierno') ||
    lower.includes('poblacion') ||
    lower.includes('población')
  ) {
    return 'civilian';
  }

  // 4. Villanos -> VILLAIN
  if (
    lower.includes('villano') ||
    lower.includes('villanos') ||
    lower.includes('liga de villanos') ||
    lower.includes('shie hassaikai') ||
    lower.includes('paranormal') ||
    lower.includes('frente de liberacion') ||
    lower.includes('frente de liberación')
  ) {
    return 'villain';
  }

  // 5. Vigilantes -> VIGILANTE
  if (
    lower.includes('vigilante') ||
    lower.includes('vigilantes')
  ) {
    return 'vigilante';
  }

  // 6. Sin grupo / grupo desconocido -> BASE (CANONICAL FALLBACK, NEVER HERO)
  return 'base';
}

/**
 * Theme Selector Switcher Bar
 */
export function FactionThemeSelector({
  activeTheme,
  onSelectTheme,
  detectedTheme,
}: {
  activeTheme: FactionThemeId;
  onSelectTheme: (theme: FactionThemeId) => void;
  detectedTheme?: FactionThemeId;
}) {
  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 px-3 py-2 text-xs font-oxanium backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 uppercase tracking-widest text-[10px] font-bold flex items-center gap-1.5">
            <Sparkles className="size-3 text-amber-400 animate-pulse" />
            <span>Diseño de Ficha:</span>
          </span>
          {detectedTheme && detectedTheme !== activeTheme && (
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Auto: <strong className="text-amber-300 capitalize">{detectedTheme}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {FACTION_THEMES.map((theme) => {
            const Icon = theme.icon;
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border',
                  isSelected
                    ? theme.activeBg + ' shadow-md font-bold scale-[1.02]'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                )}
                title={`Cambiar diseño a estilo ${theme.label}`}
              >
                <Icon className={cn('size-3.5', isSelected ? 'text-current' : theme.badgeText)} />
                <span>{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Student Theme Decorative Header & ID Badge (Authentic Academic Dossier / Notebook style)
 */
export function StudentAcademicHeader({
  fullName,
  group,
  className,
  courseName,
  schoolName,
  quirkName,
  stageName,
  avatarUrl,
  alias,
  status,
}: {
  fullName: string;
  group?: string;
  className?: string;
  courseName?: string;
  schoolName?: string;
  quirkName?: string;
  stageName?: string;
  avatarUrl?: string | null;
  alias?: string;
  status?: string;
}) {
  return (
    <div className="relative mb-6 rounded-3xl border-2 border-slate-300 bg-[#fdfdfc] p-5 sm:p-6 shadow-[0_10px_35px_rgba(30,41,59,0.12)] overflow-hidden text-slate-900">
      {/* Decorative binder rings on top */}
      <div className="absolute top-2 left-6 right-6 flex justify-between pointer-events-none opacity-60">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-3.5 h-5 rounded-full border border-slate-400 bg-gradient-to-b from-slate-200 to-slate-400 shadow-md" />
        ))}
      </div>

      <div className="pt-3 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
        {/* Student Photo Frame with Tape & Stamp */}
        <div className="shrink-0 relative">
          <div className="w-36 h-44 sm:w-40 sm:h-48 bg-white p-2 rounded-xl border-2 border-slate-300 shadow-xl rotate-[-2deg] relative group overflow-hidden">
            {/* Washi Tape Graphic */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-amber-200/80 border border-amber-300 backdrop-blur-xs rotate-2 z-20 pointer-events-none shadow-xs" />
            
            <div className="w-full h-32 sm:h-36 rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <GraduationCap className="size-10 mb-1 opacity-60" />
                  <span className="text-[10px] font-hand">Sin fotografía</span>
                </div>
              )}
              {/* Seal */}
              <div className="absolute bottom-1 right-1 bg-blue-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-700 font-mono shadow-xs">
                {schoolName || 'UA'} • ALUMNO
              </div>
            </div>

            <div className="mt-1.5 text-center">
              <span className="font-hand text-xs font-bold text-slate-900 truncate block">
                {fullName}
              </span>
              <span className="text-[9px] font-mono text-blue-700 font-bold uppercase tracking-widest block">
                MATRÍCULA #2026-UA
              </span>
            </div>
          </div>
        </div>

        {/* Academic Profile Details */}
        <div className="flex-1 space-y-2.5 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 border border-blue-300 shadow-xs">
              <GraduationCap className="size-4 text-blue-700" />
              <span>{schoolName || 'ACADEMIA UA'} • EXPEDIENTE DE ALUMNO</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-900 border border-emerald-300">
              <BadgeCheck className="size-3.5 text-emerald-700" />
              <span>ESTADO: {status || 'MATRICULADO'}</span>
            </span>
          </div>

          <div>
            <h1 className="font-yanone text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wide text-blue-950 leading-tight">
              {fullName}
            </h1>
            {alias && alias !== 'Sin alias' && (
              <p className="font-hand text-xl text-blue-800 font-bold flex items-center justify-center md:justify-start gap-2">
                <span>Nombre de Héroe: <strong className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">"{alias}"</strong></span>
              </p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-300 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-oxanium">
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200">
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Clase / Aula:</span>
              <span className="text-blue-950 font-black text-sm">{className || 'Clase 1-A'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200">
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Formación / Curso:</span>
              <span className="text-emerald-900 font-black text-sm">{courseName || stageName || 'Curso de Héroes'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200">
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Don Registrado:</span>
              <span className="text-amber-800 font-black text-sm truncate block">{quirkName || 'No asignado'}</span>
            </div>
          </div>
        </div>

        {/* Evaluation Stamp / Badge (Realistic Rubber Stamp) */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="relative border-2 border-dashed border-rose-600 bg-rose-50/90 p-3.5 rounded-2xl rotate-[-3deg] shadow-md text-center max-w-[145px]">
            <div className="text-[9px] font-bold tracking-widest text-rose-700 uppercase">EVALUACIÓN DOCENTE</div>
            <div className="font-yanone text-3xl font-black text-rose-800 leading-none my-0.5">APROBADO</div>
            <div className="font-hand text-xs text-amber-700 font-bold">★ Calificación: A+</div>
            <div className="text-[8px] font-mono text-rose-600/90 mt-0.5">Firma del Tutor UA</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Student Notebook Card Container Wrapper (Notebook Paper Aesthetic)
 */
export function StudentNotebookCard({
  title,
  subtitle,
  icon: Icon,
  badgeText,
  children,
  className,
  stickyNote,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  badgeText?: string;
  children: React.ReactNode;
  className?: string;
  stickyNote?: string;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden transition-all text-slate-900',
        // Notebook horizontal blue lines pattern
        'bg-[linear-gradient(transparent_27px,rgba(59,130,246,0.10)_28px)] [background-size:100%_28px]',
        className
      )}
    >
      {/* Left red margin line */}
      <div className="absolute top-0 bottom-0 left-6 sm:left-8 w-0.5 bg-rose-400/60 pointer-events-none z-10" />

      {/* Header */}
      <div className="pl-6 sm:pl-8 mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-blue-100 text-blue-900 border border-blue-300 shadow-xs">
              <Icon className="size-5" />
            </div>
          )}
          <div>
            <h3 className="font-yanone text-2xl sm:text-3xl font-bold uppercase tracking-wider text-blue-950 leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="font-hand text-sm text-slate-600 leading-none">{subtitle}</p>
            )}
          </div>
        </div>

        {badgeText && (
          <span className="font-hand text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-md border border-amber-300 rotate-1 shadow-xs">
            {badgeText}
          </span>
        )}
      </div>

      {/* Sticky note callout if provided (Post-It Yellow Note) */}
      {stickyNote && (
        <div className="ml-6 sm:ml-8 mb-4 p-3.5 rounded-xl bg-[#fef9c3] border border-amber-300 text-amber-950 font-hand text-sm shadow-md relative rotate-[-0.5deg]">
          <span className="font-bold text-amber-800 mr-2">📌 Apunte de Clase:</span>
          {stickyNote}
        </div>
      )}

      {/* Main Content */}
      <div className="pl-6 sm:pl-8 relative z-10">{children}</div>
    </div>
  );
}

/**
 * Avatar Paperclip Photo Frame for Student Theme
 */
export function StudentAvatarFrame({
  avatarUrl,
  name,
  quirkName,
}: {
  avatarUrl?: string | null;
  name: string;
  quirkName?: string;
}) {
  return (
    <div className="relative group mx-auto sm:mx-0 w-44 sm:w-48 transition-transform hover:scale-[1.02]">
      {/* Metallic Paperclip Graphic at top right */}
      <div className="absolute -top-3 right-4 z-20 pointer-events-none">
        <div className="w-4 h-8 border-2 border-slate-300 rounded-full bg-slate-400/20 shadow-md rotate-12" />
      </div>

      {/* Photo Frame Container */}
      <div className="relative bg-[#131b2e] p-2.5 rounded-lg border-2 border-blue-800/60 shadow-lg -rotate-1 overflow-hidden">
        {/* Photo Area */}
        <div className="relative aspect-square w-full rounded bg-slate-900 overflow-hidden border border-slate-800">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600">
              <GraduationCap className="size-10 mb-1 opacity-50" />
              <span className="text-[10px] font-hand">Sin fotografía</span>
            </div>
          )}

          {/* Sello Escolar en la esquina de la foto */}
          <div className="absolute bottom-1.5 right-1.5 bg-blue-950/90 text-blue-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/50 shadow-sm uppercase tracking-wider font-mono">
            UA • ESTUDIANTE
          </div>
        </div>

        {/* Handwritten Label underneath photo */}
        <div className="mt-2 text-center">
          <p className="font-hand text-base font-bold text-blue-200 leading-tight">
            {name}
          </p>
          <p className="font-hand text-xs text-blue-400">
            Don: {quirkName || 'No registrado'}
          </p>
        </div>
      </div>
    </div>
  );
}
