import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Activity, BatteryCharging, Brain, Briefcase, Feather, FileText, Flame,
  HandFist, HeartPlus, Info, PackageOpen, Shield, ShieldHalf, Sparkles,
  Swords, User, Wind, Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CyberFillerPanel } from '@/components/ui/cyber-filler-panel';
import { CyberModule } from '@/components/ui/cyber-module';
import { CyberSpacer } from '@/components/ui/cyber-spacer';
import { EntityPanel } from '@/components/ui/entity-panel';
import { calculateDerivedStats } from '@/lib/characterValidation';

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


export default function PublicSheet() {
  const { id } = useParams();
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
          fetch(`/api/public/character/${id}`, { signal: controller.signal }),
          fetch('/api/elements', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] })),
          fetch('/api/rules', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] }))
        ]);
        if (!response.ok) throw new Error('Character not found');
        setCharacter(await response.json());
        if ((elemResponse as any).ok) setElements(await (elemResponse as any).json());
        if ((rulesResponse as any).ok) setRules(await (rulesResponse as any).json());
      } catch (requestError: any) {
        if (requestError.name !== 'AbortError') {
          console.error("PublicSheet fetch error:", requestError);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadCharacter();
    return () => controller.abort();
  }, [id]);

  const stagesList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [], [rules]);
  const mechanicsList = useMemo(() => Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_mechanics')?.value || [] : [], [rules]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-oxanium text-sm text-muted-foreground">Cargando expediente...</div>;
  if (error || !character) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center font-oxanium text-sm text-destructive">Ficha no encontrada o no disponible (Revisa la consola).</div>;

  const storedProfile = character.profileData || {};
  const possessionRows = Array.isArray(character.possessions) ? character.possessions : [];
  const relationalTraits = possessionRows.filter((row: any) => row?.element?.kind === 'trait').map((row: any) => row.element.id);
  const relationalWeaknesses = possessionRows.filter((row: any) => row?.element?.kind === 'weakness').map((row: any) => row.element.id);
  const credentials = possessionRows.filter((row: any) => ['license', 'permission', 'certification'].includes(row?.element?.kind));
  const hasRelationalSelections = relationalTraits.length > 0 || relationalWeaknesses.length > 0;
  const profile = hasRelationalSelections ? { ...storedProfile, traits: relationalTraits, weaknesses: relationalWeaknesses } : storedProfile;

  let derived = null;
  try {
    derived = (stagesList.length > 0) ? calculateDerivedStats(profile, stagesList, elements, mechanicsList) : null;
  } catch (err) {
    console.error("Error calculating derived stats:", err);
  }

  const maxHealth = derived ? derived.salud : Number(readValue(profile, ['maxHealth', 'max_health', 'salud_maxima']) || 20);
  const maxStamina = derived ? derived.estamina : Number(readValue(profile, ['maxStamina', 'max_stamina', 'estamina_maxima']) || 20);
  
  // Siempre mostrar al máximo por defecto hasta que se implemente un gestor de daño
  const currentHealth = maxHealth;
  const currentStamina = maxStamina;
  
  const getElementName = (id: string) => elements.find(el => el.id === id)?.name || id;
  const traits = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknesses = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];
  const name = displayValue(readValue(profile, ['basic_name', 'name', 'nombre']) || character.name, 'Sin nombre');
  const lastName = displayValue(readValue(profile, ['last_name', 'lastName', 'apellido']), '');
  const fullName = `${name} ${lastName}`.trim();
  const alias = displayValue(readValue(profile, ['alias', 'hero_name', 'nombre_heroe']), 'Sin alias');
  const avatar = readValue(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']);
  const group = readValue(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']);
  const status = displayValue(readValue(profile, ['status', 'estado']), 'Activo');
  const quirkName = displayValue(readValue(profile, ['quirk_name', 'quirkName', 'don_name', 'don']), 'Sin don registrado');
  const quirkType = displayValue(readValue(profile, ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don']), 'Sin clasificación');
  const quirkEvolution = displayValue(readValue(profile, ['quirk_evolution', 'quirkEvolution', 'nivel_quirk']), 'Nivel sin registrar');
  const quirkDescription = displayValue(readValue(profile, ['quirk_description', 'quirkDesc', 'quirk_desc', 'don_descripcion']), 'No se ha registrado información sobre este don.');
  const quirkLevelOne = displayValue(readValue(profile, ['quirk_lvl1', 'quirkLvl1', 'quirk_level_1', 'quirk_nivel_1']), 'Sin descripción de nivel.');

  const baseAttributes = [
    { label: 'Fuerza', value: readValue(profile, ['FUE', 'fue', 'fuerza']), icon: HandFist },
    { label: 'Resistencia', value: readValue(profile, ['RES', 'res', 'resistencia']), icon: HeartPlus },
    { label: 'Destreza', value: readValue(profile, ['DES', 'des', 'destreza']), icon: Zap },
    { label: 'Inteligencia', value: readValue(profile, ['INT', 'int', 'inteligencia']), icon: Brain },
    { label: 'Velocidad', value: readValue(profile, ['VEL', 'vel', 'velocidad']), icon: Wind },
    { label: 'Voluntad', value: readValue(profile, ['VOL', 'vol', 'voluntad']), icon: Flame }
  ];
  const derivedAttributes = [
    ['Evasión', derived?.evasion ?? readValue(profile, ['eva', 'evasion', 'evasión'])],
    ['Coraje', derived?.coraje ?? readValue(profile, ['cor', 'courage', 'coraje'])],
    ['Daño base', derived?.dañoBase ?? readValue(profile, ['baseDamage', 'base_damage', 'dano_base', 'daño_base'])],
    ['Plus Ultra', readValue(profile, ['plusUltra', 'plus_ultra'])],
    ['Reducción de daño', derived?.reduccionDano ?? readValue(profile, ['reduccionDano', 'reduccion_dano', 'dr', 'damageReduction', 'damage_reduction'])],
    ['Iniciativa', derived?.iniciativa ?? readValue(profile, ['initiative', 'iniciativa'])],
    ['Mod. FUE', derived?.modFue ?? readValue(profile, ['modFUE', 'mod_fue'])],
    ['Mod. DES', derived?.modDes ?? readValue(profile, ['modDES', 'mod_des'])]
  ];
  const identityData = [
    ['Grupo sanguíneo', readValue(profile, ['basic_blood_type', 'bloodType', 'blood_type', 'sangre', 'grupo_sanguineo'])],
    ['Edad', readValue(profile, ['basic_age', 'age', 'edad'])],
    ['Alineación', readValue(profile, ['basic_alignment', 'alignment', 'alineacion', 'alineación'])],
    ['Género', readValue(profile, ['gender', 'genero', 'género', 'sexo'])],
    ['Nacionalidad', readValue(profile, ['nationality', 'nacionalidad'])],
    ['Faceclaim', readValue(profile, ['faceclaim', 'faceclaim_pb', 'pb'])]
  ];

  return (
    <div className="public-view min-h-screen bg-background pb-16 font-oxanium text-text1 selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-black tracking-widest text-foreground"><span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">S</span> SHADOWMORE OS <span className="text-xs font-normal text-primary">4.1.2</span></p>
            <p className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Expediente público de personaje</p>
          </div>
          <nav className="flex shrink-0 gap-2">
            <Link to="/character-editor" className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Registros</Link>
            <Link to="/login" className="hidden rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block">Acceso</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto mt-7 max-w-6xl space-y-6 px-4 sm:px-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0"><h1 className="truncate font-yanone text-4xl font-black uppercase leading-none tracking-wider text-text1 sm:text-5xl">{fullName}</h1><p className="mt-1 truncate text-lg font-bold uppercase tracking-widest text-primary">• {alias}</p></div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Reputación', readValue(profile, ['reputation', 'reputacion', 'amenaza'])],
              ['Yenes', character.yen],
              ['EXP', character.exp]
            ].map(([label, value]) => <div key={String(label)} className="min-w-20 border border-bg3 bg-bg2/80 px-3 py-2 text-center"><strong className="block text-lg leading-none text-text1">{displayValue(value, '0')}</strong><span className="mt-1 block text-[9px] uppercase tracking-widest text-text2">{String(label)}</span></div>)}
          </div>
        </section>

        <CyberSpacer variant="line" accent="accent1" glow className="my-0" />

        <EntityPanel title="Datos del personaje" subtitle="Character info" badge={displayValue(group, 'Sin grupo')} icon={<Activity className="size-4" />} pattern="dots" accent="accent1" cornerTicks>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {identityData.map(([label, value], index) => <React.Fragment key={String(label)}>{index > 0 && <span className="hidden text-border sm:inline">|</span>}<span>{String(label)} • <strong className="text-foreground">{displayValue(value)}</strong></span></React.Fragment>)}
          </div>
        </EntityPanel>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-3">
            <div className="relative aspect-[3/4] overflow-hidden border border-bg3 bg-bg2">
              {avatar ? <img src={String(avatar)} alt={fullName} className="size-full object-cover" /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-text2/40"><User className="size-12" /><span className="text-[10px] uppercase tracking-widest">Sin imagen</span></div>}
              <Badge variant="outline" className="absolute bottom-3 left-3 bg-background/80 font-oxanium text-[9px] uppercase tracking-wider backdrop-blur">{status}</Badge>
            </div>
            <div className="border border-bg3 bg-bg2/40 p-3 text-xs">
              <h2 className="mb-3 flex items-center gap-2 border-b border-bg3 pb-2 text-[10px] font-bold uppercase tracking-widest text-text1"><Briefcase className="size-4 text-accent2" /> Ocupación</h2>
              {[
                ['Ocupación', readValue(profile, ['occupation', 'ocupacion', 'ocupación'])],
                ['Rango / rol', readValue(profile, ['rank', 'rango', 'role', 'rol'])],
                ['Año escolar', readValue(profile, ['schoolYear', 'school_year', 'ano_escolar', 'año_escolar'])]
              ].map(([label, value]) => <div key={String(label)} className="flex items-start justify-between gap-3 border-b border-bg3/50 py-1.5 last:border-0"><span className="text-[9px] uppercase tracking-widest text-text2">{String(label)}</span><strong className="text-right text-text1">{displayValue(value)}</strong></div>)}
            </div>
            <CyberFillerPanel icon={Shield} title="SYS.OPTIMAL" subtitle={`ID: CHAR_${character.id}`} variant="accent2" pattern="dots" className="min-h-24 p-4" />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="border border-bg3 bg-bg2/40 p-4">
              <h2 className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-accent2"><HeartPlus className="size-4" /> Atributos base</h2>
              <div className="grid grid-cols-2 gap-3">
                {baseAttributes.map(({ label, value, icon: Icon }) => <div key={label} className="relative overflow-hidden border border-bg3 bg-bg1 p-2 text-right"><Icon className="absolute left-2 top-1/2 size-8 -translate-y-1/2 text-text2 opacity-10" /><span className="relative z-10 block text-[9px] uppercase tracking-widest text-primary">{label}</span><strong className="relative z-10 mt-1 block text-xl leading-none text-text1">{displayValue(value, '—')}</strong></div>)}
              </div>
            </div>
            <div className="border border-bg3 bg-bg2/40 p-4">
              <h2 className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-accent2"><Activity className="size-4" /> Estatus</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative overflow-hidden border border-bg3 bg-bg1 p-2 text-right">
                  <HeartPlus className="absolute left-2 top-1/2 size-8 -translate-y-1/2 text-text2 opacity-10" />
                  <span className="relative z-10 block text-[9px] uppercase tracking-widest text-primary">Salud</span>
                  <div className="relative z-10 mt-1 flex items-baseline justify-end gap-1 whitespace-nowrap">
                    <strong className="text-xl leading-none text-text1">{currentHealth}</strong>
                    <span className="text-[10px] font-bold text-text2/60">/ {maxHealth}</span>
                  </div>
                </div>
                <div className="relative overflow-hidden border border-bg3 bg-bg1 p-2 text-right">
                  <BatteryCharging className="absolute left-2 top-1/2 size-8 -translate-y-1/2 text-text2 opacity-10" />
                  <span className="relative z-10 block text-[9px] uppercase tracking-widest text-primary">Estamina</span>
                  <div className="relative z-10 mt-1 flex items-baseline justify-end gap-1 whitespace-nowrap">
                    <strong className="text-xl leading-none text-text1">{currentStamina}</strong>
                    <span className="text-[10px] font-bold text-text2/60">/ {maxStamina}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border border-bg3 bg-bg2/40 p-4">
              <h2 className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-accent2"><Activity className="size-4" /> Atributos derivados</h2>
              <div className="grid grid-cols-2 gap-3">
                {derivedAttributes.map(([label, value]) => <div key={String(label)} className="border border-bg3 bg-bg1 p-2 text-center"><span className="block text-[9px] uppercase tracking-widest text-primary">{String(label)}</span><strong className="mt-1 block text-lg leading-none text-text1">{displayValue(value, '—')}</strong></div>)}
              </div>
            </div>
            <CyberFillerPanel icon={Activity} title="ATTR.SYNC" subtitle="READ ONLY" variant="accent1" pattern="grid" className="min-h-24 p-4" />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-5">
            <EntityPanel title="Don (Quirk)" icon={<Sparkles className="size-5" />} pattern="radial" accent="accent1" cornerTicks glow className="flex-1">
              <div className="flex h-full flex-col">
                <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4"><div className="rounded-md border border-border bg-bg3 p-3"><Zap className="size-6 text-primary" /></div><div className="text-right"><p className="text-3xl font-black tracking-wider text-primary">QUIRK</p><p className="mt-1 text-[9px] uppercase tracking-widest text-text2">{quirkEvolution}</p></div></div>
                <h2 className="text-xl font-black italic text-text1">✦ {quirkName}</h2>
                <p className="mt-3 text-sm leading-relaxed text-text2"><strong className="mr-2 uppercase text-text1">{quirkType} —</strong>{quirkDescription}</p>
                <div className="mt-6">
                  <CyberModule title="Nivel 1" subtitle="Despertar" variant="accent1" showTelemetry={false} />
                  <p className="border-x border-b border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-text2">{quirkLevelOne}</p>
                </div>
              </div>
            </EntityPanel>
            <EntityPanel title="Historia y personalidad" icon={<Info className="size-4" />} cornerTicks>
              <div className="space-y-4 text-sm leading-relaxed text-text2"><div><h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text1">Personalidad</h3><p className="whitespace-pre-wrap">{displayValue(readValue(profile, ['personality', 'personalidad']), 'Información no registrada.')}</p></div><div><h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text1">Historia</h3><p className="whitespace-pre-wrap">{displayValue(readValue(profile, ['backstory', 'history', 'historia']), 'Expediente no disponible.')}</p></div></div>
            </EntityPanel>
          </div>
        </section>

        <CyberSpacer variant="brackets" accent="accent1" className="my-1" />
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <EntityPanel title="Técnicas" icon={<Swords className="size-4" />} cornerTicks><CyberFillerPanel icon={Swords} title="Sin datos públicos" subtitle="Módulo pendiente de conexión" className="min-h-28 p-4" /></EntityPanel>
          <EntityPanel title="Inventario" icon={<PackageOpen className="size-4" />} pattern="dots" cornerTicks><CyberFillerPanel icon={PackageOpen} title="Sin datos públicos" subtitle="Módulo pendiente de conexión" className="min-h-28 p-4" /></EntityPanel>
          <EntityPanel title="Credenciales" icon={<ShieldHalf className="size-4" />} cornerTicks>
            {credentials.length > 0 ? <div className="space-y-2 p-4 text-sm text-text2">{credentials.map((row: any) => <div key={row.possession.id}><span className="mr-2 text-[9px] font-bold uppercase tracking-wider text-amber-400">{{ license: 'Licencia', permission: 'Permiso', certification: 'Certificación' }[row.element.kind] ?? row.element.kind}</span>{row.element.name}</div>)}</div> : <CyberFillerPanel icon={ShieldHalf} title="Sin credenciales" subtitle="No posee licencias, permisos ni certificaciones" className="min-h-28 p-4" />}
          </EntityPanel>
          <EntityPanel title="Rasgos" icon={<FileText className="size-4" />} cornerTicks>
            {traits.length > 0 ? (
              <div className="space-y-2 p-4 text-sm text-text2">
                {traits.map(id => <div key={id} className="flex items-center gap-2"><div className="size-1 bg-cyan-500 rounded-full" />{getElementName(id)}</div>)}
              </div>
            ) : <CyberFillerPanel icon={Feather} title="Sin datos públicos" subtitle="No posee rasgos registrados" className="min-h-28 p-4" />}
          </EntityPanel>
          <EntityPanel title="Debilidades" icon={<ShieldHalf className="size-4" />} cornerTicks>
            {weaknesses.length > 0 ? (
              <div className="space-y-2 p-4 text-sm text-text2">
                {weaknesses.map(id => <div key={id} className="flex items-center gap-2"><div className="size-1 bg-red-500 rounded-full" />{getElementName(id)}</div>)}
              </div>
            ) : <CyberFillerPanel icon={ShieldHalf} title="Sin datos públicos" subtitle="No posee debilidades registradas" className="min-h-28 p-4" />}
          </EntityPanel>
        </section>
        <p className="text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Ficha pública de sólo lectura · Shadowmore OS</p>
      </main>
    </div>
  );
}
