import React from 'react';
import {
  GraduationCap,
  Heart,
  Zap,
  Shield,
  Award,
  BookOpen,
  Sparkles,
  Paperclip,
  CheckCircle2,
  FileText,
  BadgeCheck,
  User,
  Activity,
  Coins,
  Brain,
  Backpack,
  Bookmark,
  Swords,
  Scroll,
  Pencil,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';
import { StatsHexagon, HexStat } from '../HexagonRadarChart';
import { StudentAcademicHeader, StudentNotebookCard } from './FactionSheetTheme';
import { ModifierBadgeGroup, ModifierNotesLegend } from '../ModifierBadge';
import { cn } from '@/lib/utils';

export const displayValue = (value: unknown, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

export interface StudentSheetViewProps {
  fullName: string;
  alias?: string;
  avatar?: string | null;
  group?: string;
  className?: string;
  courseName?: string;
  schoolName?: string;
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

export function StudentSheetView({
  fullName,
  alias,
  avatar,
  group,
  className,
  courseName,
  schoolName,
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
}: StudentSheetViewProps) {
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
  return (
    <div className="min-h-screen bg-[#f3efe3] text-slate-900 font-sans selection:bg-blue-500/20 p-2 sm:p-6 space-y-6 max-w-6xl mx-auto rounded-3xl border-2 border-stone-300 shadow-2xl relative my-4 overflow-hidden bg-[linear-gradient(transparent_27px,rgba(59,130,246,0.07)_28px)] [background-size:100%_28px]">
      {/* Decorative binder holes along left side */}
      <div className="absolute left-3 top-8 bottom-8 hidden md:flex flex-col justify-around pointer-events-none z-20">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="size-4 rounded-full bg-[#f3efe3] border-2 border-stone-400 shadow-inner" />
        ))}
      </div>

      {/* Top Academic Registration Banner Header */}
      <StudentAcademicHeader
        fullName={fullName}
        group={group}
        className={className || 'Clase 1-A'}
        courseName={courseName || basicStage || 'Curso de Héroes'}
        schoolName={schoolName || 'Academia UA'}
        quirkName={quirkName}
        stageName={basicStage}
        avatarUrl={avatar}
        alias={alias}
        status={status}
      />

      {/* Quick Stats Bar (Yenes, EXP, Reputación, Formación, Plus Ultra) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-300/80 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
            <Coins className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Becas / Yenes</span>
            <span className="text-base font-bold text-amber-800">{displayValue(yen, '0')} ¥</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-300/80 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300">
            <Sparkles className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Experiencia (EXP)</span>
            <span className="text-base font-bold text-blue-800">{displayValue(exp, '0')} pts</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-300/80 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Award className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Méritos Escolares</span>
            <span className="text-base font-bold text-emerald-800">{displayValue(reputation, '0')}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-300/80 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-800 border border-purple-300">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-500 block font-bold">Formación</span>
            <span className="text-base font-bold text-purple-900 truncate block">{courseName || 'Curso de Héroes'}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 shadow-xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-200 text-rose-800 border border-rose-300">
            <Sparkles className="size-5 text-rose-600" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-rose-700 block font-bold">Plus Ultra (超克)</span>
            <span className="text-base font-bold text-rose-950">{resolvedPlusUltra} pts</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Hexagon Stats & Health Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (Lg 7): Radar Chart Card */}
        <div className="lg:col-span-7">
          <StudentNotebookCard
            title="EVALUACIÓN FÍSICO-MENTAL (RADAR ESCOLAR)"
            subtitle="Prueba de Diagnóstico de Aptitudes del Alumno"
            icon={Activity}
            badgeText="UA EVALUATION"
            stickyNote="Resultados homologados según las pruebas de control físico y entrenamiento práctico."
          >
            {/* Health, Stamina & Plus Ultra Pool Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5 font-mono">
                    <Heart className="size-4 text-rose-600 fill-rose-600" />
                    SALUD (HP)
                  </span>
                  <span className="text-base font-bold text-rose-950 font-mono">
                    {currentHealth} / {maxHealth}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-rose-300/60 p-0.5">
                  <div className="bg-gradient-to-r from-rose-600 to-amber-500 h-full rounded-full w-full" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 font-mono">
                    <Zap className="size-4 text-amber-600 fill-amber-600" />
                    ESTAMINA (ES)
                  </span>
                  <span className="text-base font-bold text-amber-950 font-mono">
                    {currentStamina} / {maxStamina}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-amber-300/60 p-0.5">
                  <div className="bg-gradient-to-r from-amber-500 to-cyan-500 h-full rounded-full w-full" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-red-800 flex items-center gap-1.5 font-mono">
                    <Sparkles className="size-4 text-red-600" />
                    PLUS ULTRA
                  </span>
                  <span className="text-base font-bold text-red-950 font-mono">
                    {resolvedPlusUltra} PTS
                  </span>
                </div>
                <span className="text-[10px] text-red-700 font-mono">Proeza Extraordinaria</span>
              </div>
            </div>

            {/* Exact Hexagon Radar Chart with Student theme */}
            <div className="rounded-xl bg-white border border-slate-200 shadow-xs p-2 sm:p-4">
              <StatsHexagon stats={baseAttributes} theme="student" />
            </div>
          </StudentNotebookCard>
        </div>

        {/* Right (Lg 5): Defensas, Atributos Derivados y Expediente */}
        <div className="lg:col-span-5 space-y-6">
          <StudentNotebookCard
            title="ESTADO DE COMBATE & DEFENSAS"
            subtitle="Parámetros tácticos para simulaciones"
            icon={Shield}
            badgeText="DEFENSAS"
          >
            {/* Defenses Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {defenseList.map((def) => {
                const Icon = def.icon;
                return (
                  <div key={def.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {Icon && <Icon className="size-4 text-blue-600 shrink-0" />}
                      <span className="text-xs font-bold text-slate-800">{def.label}</span>
                      <ModifierBadgeGroup sources={def.sources} />
                    </div>
                    <span className="text-base font-bold text-blue-900 font-mono">{displayValue(def.value, '0')}</span>
                  </div>
                );
              })}
            </div>

            {/* Derived Combat Status */}
            <div className="grid grid-cols-2 gap-2.5">
              {combatStatusList.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>{item.label}</span>
                      {Icon && <Icon className="size-3.5 text-blue-600 shrink-0" />}
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-blue-950 font-mono">{displayValue(item.value, '0')}</span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{item.sub || ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modifiers for FUE and DES */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-blue-900 font-bold uppercase block">Mod. Fuerza (FUE)</span>
                  <span className="text-[10px] text-slate-600">Bono Melee / Físico</span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-300">
                  {modFue >= 0 ? `+${modFue}` : modFue}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-blue-900 font-bold uppercase block">Mod. Destreza (DES)</span>
                  <span className="text-[10px] text-slate-600">Bono Rango / Precisión</span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-300">
                  {modDes >= 0 ? `+${modDes}` : modDes}
                </span>
              </div>
            </div>

            <ModifierNotesLegend className="mt-3 border-slate-200 bg-slate-50 text-slate-600" />
          </StudentNotebookCard>

          {/* Personal Record Data */}
          <StudentNotebookCard
            title="EXPEDIENTE CIVIL Y ACADÉMICO"
            subtitle="Datos de registro personal"
            icon={FileText}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {personalDataList.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-blue-700 uppercase font-bold">
                      {Icon && <Icon className="size-3" />}
                      <span>{item.label}</span>
                    </div>
                    <p className="font-semibold text-slate-800 truncate pl-4.5">
                      {String(item.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </StudentNotebookCard>
        </div>
      </div>

      {/* Quirk / Don Specification Section */}
      <StudentNotebookCard
        title={`FICHA DEL DON: ${quirkName}`}
        subtitle="Expediente de Singularidad de la Academia"
        icon={Zap}
        badgeText={quirkType}
        stickyNote={`Don de tipo ${quirkType} registrado formalmente en el expediente escolar.`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300/80 space-y-1">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block font-hand text-base">
              ✏️ Apuntes del Don y Funcionamiento:
            </span>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {quirkDescription}
            </p>
          </div>

          {/* Evolution Levels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-amber-300 shadow-xs space-y-2">
              <span className="text-xs font-bold text-amber-800 block uppercase font-mono">
                NIVEL 1 • DESPERTAR
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {quirkLevelOne}
              </p>
            </div>

            {quirkLevelTwo && (
              <div className="p-3.5 rounded-xl bg-white border border-blue-300 shadow-xs space-y-2">
                <span className="text-xs font-bold text-blue-800 block uppercase font-mono">
                  NIVEL 2 • DOMINIO
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {quirkLevelTwo}
                </p>
              </div>
            )}

            {quirkLevelThree && (
              <div className="p-3.5 rounded-xl bg-white border border-purple-300 shadow-xs space-y-2">
                <span className="text-xs font-bold text-purple-800 block uppercase font-mono">
                  NIVEL 3 • PLUS ULTRA
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {quirkLevelThree}
                </p>
              </div>
            )}
          </div>
        </div>
      </StudentNotebookCard>

      {/* Traits & Weaknesses Section (Resolved Real Names & Descriptions) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StudentNotebookCard
          title="CUALIDADES & RASGOS DESTACADOS"
          subtitle="Ventajas y dotes personales"
          icon={Award}
          badgeText={`${traits.length} Rasgos`}
        >
          {traits.length > 0 ? (
            <div className="space-y-2.5">
              {traits.map((trait: any, i: number) => {
                const traitName = trait?.name || trait?.title || (typeof trait === 'string' ? trait : `Rasgo #${i + 1}`);
                const traitDesc = trait?.description || trait?.desc || '';
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-sans text-xs space-y-1 relative shadow-xs"
                  >
                    <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>{traitName}</span>
                    </div>
                    {traitDesc && (
                      <p className="text-slate-700 text-xs leading-relaxed pl-5">
                        {traitDesc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-hand text-slate-500 italic">No hay rasgos registrados.</p>
          )}
        </StudentNotebookCard>

        <StudentNotebookCard
          title="DEBILIDADES & PUNTOS DE MEJORA"
          subtitle="Aspectos a trabajar en entrenamiento"
          icon={AlertTriangle}
          badgeText={`${weaknesses.length} Puntos`}
        >
          {weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map((w: any, i: number) => {
                const wName = w?.name || w?.title || (typeof w === 'string' ? w : `Debilidad #${i + 1}`);
                const wDesc = w?.description || w?.desc || '';
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 font-sans text-xs space-y-1 relative shadow-xs"
                  >
                    <div className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                      <span>{wName}</span>
                    </div>
                    {wDesc && (
                      <p className="text-slate-700 text-xs leading-relaxed pl-5">
                        {wDesc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-hand text-slate-500 italic">No hay debilidades registradas.</p>
          )}
        </StudentNotebookCard>
      </div>

      {/* Skills & Certifications Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Habilidades y Destrezas */}
        <StudentNotebookCard
          title="HABILIDADES & DESTREZAS"
          subtitle="Aptitudes técnicas y grado de aprendizaje"
          icon={Brain}
          badgeText={`${skills.length} Habilidades`}
        >
          {skills.length > 0 ? (
            <div className="space-y-2">
              {skills.map((skill: any, idx: number) => {
                const skillName = typeof skill === 'string' ? skill : skill.name || skill.title || `Habilidad #${idx + 1}`;
                const skillLevel = typeof skill === 'object' ? Number(skill.level ?? skill.quantity ?? 1) : 1;
                const skillDesc = typeof skill === 'object' ? skill.description : '';
                return (
                  <div
                    key={skill.id || idx}
                    className="flex flex-col gap-1 p-2.5 rounded-xl bg-white border border-slate-300 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-blue-950 uppercase tracking-wide truncate flex items-center gap-1.5">
                        <span className="text-blue-600">✦</span> {skillName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] font-bold text-blue-800">Nivel {skillLevel}</span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'size-2.5 rounded-xs transition-colors',
                                i < skillLevel
                                  ? 'bg-blue-600 shadow-xs'
                                  : 'bg-slate-200 border border-slate-300'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {skillDesc && <p className="text-[10px] text-slate-600 leading-relaxed font-sans">{skillDesc}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-hand text-slate-500 italic">Sin habilidades registradas.</p>
          )}
        </StudentNotebookCard>

        {/* Certificaciones y Licencias */}
        <StudentNotebookCard
          title="CERTIFICACIONES & LICENCIAS"
          subtitle="Acreditaciones y permisos oficiales"
          icon={Scroll}
          badgeText={`${credentials.length} Documentos`}
        >
          {credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map((row: any, idx: number) => {
                const credName = row?.element?.name || row?.name || row?.title || `Documento #${idx + 1}`;
                const credDesc = row?.element?.description || row?.description || '';
                const credKind = row?.element?.kind || row?.kind || 'Licencia';
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Scroll className="size-4 text-amber-700 shrink-0" />
                        {credName}
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                        {credKind}
                      </span>
                    </div>
                    {credDesc && (
                      <p className="text-slate-700 text-xs leading-relaxed pl-5">
                        {credDesc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-hand text-slate-500 italic">Sin certificaciones registradas.</p>
          )}
        </StudentNotebookCard>
      </div>

      {/* Techniques & Abilities (Rich Mechanical Details, Type, Cost & Target) */}
      <StudentNotebookCard
        title="ASIGNATURAS Y TÉCNICAS PRÁCTICAS"
        subtitle="Movimientos especiales y habilidades registradas"
        icon={Swords}
        badgeText={`${techniques.length} Técnicas`}
        stickyNote="Las técnicas representan los movimientos especiales autorizados para simulaciones prácticas."
      >
        {techniques.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {techniques.map((tech: any, i: number) => {
              const techName = tech?.name || tech?.title || `Técnica #${i + 1}`;
              const techLevel = tech?.level ? `Nivel ${tech.level}` : null;
              const techCost = tech?.cost || tech?.staminaCost || null;
              const techType = tech?.type || tech?.classification || null;
              const techTarget = tech?.target || tech?.defenseTarget || null;
              const autoDesc = tech?.autoDescription || tech?.mechanicalDesc || '';

              return (
                <div
                  key={tech.id || i}
                  className="p-4 rounded-xl bg-white border border-slate-300 hover:border-blue-400 transition-colors space-y-2.5 relative shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="size-4 text-blue-600 shrink-0" />
                      <h4 className="font-bold text-slate-900 text-sm font-sans truncate">
                        {techName}
                      </h4>
                    </div>
                    {techLevel && (
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded border border-blue-300 shrink-0">
                        {techLevel}
                      </span>
                    )}
                  </div>

                  {/* Badges strip: Cost, Type, Target Defense */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {techCost && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                        Coste: {String(techCost).includes('CE') ? techCost : `${techCost} CE`}
                      </span>
                    )}
                    {techType && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold uppercase">
                        {techType}
                      </span>
                    )}
                    {techTarget && (
                      <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold uppercase">
                        {techTarget}
                      </span>
                    )}
                  </div>

                  {/* Lore Description */}
                  {tech.description && (
                    <p className="text-xs text-slate-700 leading-relaxed font-sans border-t border-slate-100 pt-1.5">
                      {tech.description}
                    </p>
                  )}

                  {/* Mechanical Auto-Description */}
                  {autoDesc && (
                    <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-[11px] space-y-1">
                      <span className="font-bold text-amber-900 flex items-center gap-1 text-[10px] font-mono">
                        <Sparkles className="size-3 text-amber-600" />
                        DESCRIPCIÓN MECÁNICA GENERADA:
                      </span>
                      <p className="text-slate-800 font-mono leading-relaxed">
                        {autoDesc}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs font-hand text-slate-500 italic">No hay técnicas registradas en el cuaderno.</p>
        )}
      </StudentNotebookCard>

      {/* Equipment & Items (Material Escolar y Mochila) */}
      <StudentNotebookCard
        title="MATERIAL ESCOLAR & MOCHILA DE CAMPO"
        subtitle="Equipamiento autorizado para lecciones prácticas"
        icon={Backpack}
        badgeText={`${possessions.length} Objetos`}
      >
        {possessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {possessions.map((item: any, i: number) => {
              const itemName = item?.element?.name || item?.name || item?.title || `Objeto #${i + 1}`;
              const itemDesc = item?.element?.description || item?.description || '';
              const itemQty = item?.possession?.quantity ?? item?.quantity ?? 1;
              const itemKind = item?.element?.kind || item?.kind || 'Objeto';

              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white border border-slate-300 hover:border-blue-400 transition-colors flex items-start gap-3 shadow-xs"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 shrink-0 mt-0.5">
                    <Bookmark className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 truncate block">
                        {itemName}
                      </span>
                      {itemQty > 1 && (
                        <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                          x{itemQty}
                        </span>
                      )}
                    </div>
                    {itemDesc && (
                      <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                        {itemDesc}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs font-hand text-slate-500 italic">Mochila vacía por el momento.</p>
        )}
      </StudentNotebookCard>

      {/* Biography & RP Notes */}
      {biography && (
        <StudentNotebookCard
          title="HISTORIAL ESCOLAR & DIARIO PERSONAL"
          subtitle="Anotaciones autobiográficas del estudiante"
          icon={Pencil}
          stickyNote="Diario de progreso escrito por el alumno."
        >
          <div className="p-4 rounded-xl bg-white border border-slate-300 font-hand text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
            {biography}
          </div>
        </StudentNotebookCard>
      )}
    </div>
  );
}
