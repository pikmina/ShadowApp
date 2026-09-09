import React, { useState } from 'react';
import { 
  Shield, Target, Coins, Heart, Dices, Brain, Flame, Move, Wind, Info, 
  Star, Briefcase, GraduationCap, HandFist, HeartPulse, Zap, Swords, 
  Shuffle, ShieldHalf, ShieldUser, Feather, Infinity, BatteryCharging, 
  User, HeartPlus, Diff, UserStar, Crosshair, BrainCircuit, HeartCrack, 
  Award, Sparkles, PackageOpen, CircleUserRound, Activity, CheckCircle2,
  Edit, Eye, Package, FileText, AlertTriangle
} from 'lucide-react';
import { CyberSpacer } from '@/components/ui/cyber-spacer';
import { CyberModule } from '@/components/ui/cyber-module';
import { CyberFillerPanel } from '@/components/ui/cyber-filler-panel';
import { EntityPanel } from '@/components/ui/entity-panel';
import { TechniqueCard } from '@/components/techniques/TechniqueCard';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CharacterEditor from '@/components/character/CharacterEditor';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from 'swr';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) throw new Error("Error fetching data");
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response");
  }
  return res.json();
};

// Mocked Data since we are in the admin dashboard and not the actual player context yet
const MOCK_CHARACTER = {
  id: "CHAR_DEKU_1",
  name: "Izuku",
  lastName: "Midoriya",
  alias: "Deku",
  group: "Estudiantes",
  bloodType: "O+",
  age: 15,
  alignment: "Heroico",
  gender: "Masculino",
  faceclaim: "Izuku Midoriya (Boku no Hero Academia)",
  reputationOrThreat: 10,
  currentYens: 2000,
  totalExp: 2000,
  avatarUrl: "https://i.pinimg.com/736x/80/bb/e9/80bbe9d1369527ec689115d97e7af7da.jpg",
  currentHealth: 22,
  currentStamina: 25,
  occupation: "Estudiante (Clase 1-A)",
  rank: "Clase 1-A",
  schoolYearOverride: "1er Año",
  plusUltraPoints: 1,
  quirkName: "ONE FOR ALL",
  quirkType: "EMISOR",
  quirkEvolution: "NIVEL 1. DESPERTAR",
  quirkDescription: "El Don Heredado de All Might, el Símbolo de la Paz. Con este don Izuku obtiene una fuerza, velocidad y resistencia sobrehumana. Aunque es incapaz de utilizar el 100% de su don, ya que si no lo gestiona de la manera correcta resulta herido, rompiéndose los huesos, dejando sus extremidades completamente inmovilizadas. Cuando hace uso de su don, pueden verse chispas verdes, como relámpagos en miniatura, al rededor de su cuerpo, especialmente donde canaliza el One For All.",
  quirkDescriptionLevel1: "A Nivel 1 Izuku es capaz de utilizar el One For All a menos del 5% de su capacidad, logrando aún, tener una velocidad impresionante, una resistencia decente y fuerza extraordinaria, sin embargo, siempre deja inutilizada el área desde donde canaliza su don, por ejemplo: un dedo, el brazo, las piernas.",
  quirkDescriptionLevel2: "El usuario ha logrado que su cuerpo se adapte al 20% del poder, siendo capaz de usar Full Cowl de manera sostenida.",
  quirkDescriptionLevel3: "Alcanza la sincronización máxima permitida en esta etapa.",
  certifications: ["Registro de Quirk ante el Ministerio Japonés"],
  skills: { COMBATE: 2, INVESTIGACION: 1 },
  skillSpecializations: { COMBATE: "Karate" },
  traits: ["Fortaleza mental: Tu personaje obtiene +1 en Voluntad.", "Estamina Mejorada: Tu personaje tiene +2 Estamina Extra."],
  weaknesses: ["Retroceso Corporal: Cada vez que usas tu quirk recibes 3 puntos de daño.", "Sobrecarga Total: Si obtienes doble 10 usando tu quirk, tu siguiente uso cuesta el doble de ES y recibes 4 daño."],
  inventory: [
    { name: "Cinturón Ligero", icon: "🥋", notes: "Motor 4.1 DC: 90", equipped: true, quantity: 1, description: "Un cinturón estándar que aumenta ligeramente tu capacidad de cargar peso." }
  ],
  techniques: [
    { name: "DELAWARE SMASH!", attribute: "FUE", level: "Nivel 1 (Despertar)", cost: 3, type: "OFENSIVA", vs: "EVA", description: "Izuku tensiona uno de sus dedos con su dedo pulgar para luego liberarlo y crear una poderosa onda de choque. Hacer esto fractura dicho dedo, lo cual limita la cantidad de veces que puede utilizar este movimiento al 10%. Aplica la Debilidad Retroceso corporal.", mechanic: "Inflige 3D6 de Daño. Requiere: Debe esperar 2 turnos para volverlo a realizar.", effect: "DAÑO 3D6. 2D10 + FUE" },
    { name: "DETROIT SMASH!", attribute: "FUE", level: "Nivel 1 (Despertar)", cost: 5, type: "HÍBRIDA", vs: "EVA", description: "Inspirado en All Might, Izuku realiza un uppercut que daña 2D6 y lanza al enemigo hacia atrás, penalizándolo con 2 de evasión en su siguiente turno. Izuku recibe 2 puntos de daño. Aplica la Debilidad Retroceso corporal.", mechanic: "Inflige 2D6 de Daño. Reduce -2 a Evasión por 1 turno. Requiere: Recibe 2 puntos de daño.", effect: "DAÑO 2D6. 2D10 + FUE" },
    { name: "ONE FOR ALL 10%", attribute: "FUE", level: "Nivel 1 (Despertar)", cost: 3, type: "POTENCIADOR", vs: "-", description: "Canaliza el poder en todo su cuerpo evitando fracturas graves.", mechanic: "Otorga +2 FUE y +2 VEL durante 3 turnos.", effect: "BUFF ESTADÍSTICAS" }
  ]
};

const MOCK_DERIVED = {
  maxHealth: 24,
  maxStamina: 25,
  evasion: 15,
  courage: 14,
  baseDamageFormula: "1D8 + 2",
  damageReduction: 0,
  initiativeFormula: "+2",
  modFUE: 2,
  modDES: 1,
  attributeBreakdowns: {
    FUE: { effective: 4 },
    RES: { effective: 2 },
    DES: { effective: 3 },
    INT: { effective: 5 },
    VEL: { effective: 5 },
    VOL: { effective: 4 },
  }
};


export default function PlayerSheet() {

  const { user } = useAuth();
  const { data: dbCharacter, mutate } = useSWR(user ? ['/api/character', user.accessToken] : null, ([url, token]) => fetcher(url, token));
  const { data: fields } = useSWR(user ? ['/api/sheet-fields', user.accessToken] : null, ([url, token]) => fetcher(url, token));
  const { data: settings } = useSWR(user ? ['/api/settings', user.accessToken] : null, ([url, token]) => fetcher(url, token));
  const [isEditing, setIsEditing] = useState(false);
  

  const profileData = dbCharacter?.profileData || {};
  const character = dbCharacter?.id ? { ...MOCK_CHARACTER, ...profileData, name: dbCharacter.name } : MOCK_CHARACTER;
  const derived = MOCK_DERIVED;

  // Identify character data source
  const isMock = !dbCharacter?.id;
  
  // Resolve Names based on dynamic fields OR mock data if in mock mode
  // The backend might not have the fields mapped by ID initially, but the CharacterEditor sets them by ID or Name based on the form configuration.
  // To make it robust we'll try to find the fields mapped to "Nombre", "Apellido", "Apodo" or use the values directly.
  
  const firstNameField = fields?.find((f: any) => f.name.toLowerCase().includes('nombre'));
  const lastNameField = fields?.find((f: any) => f.name.toLowerCase().includes('apellido'));
  const aliasField = fields?.find((f: any) => f.name.toLowerCase().includes('apodo') || f.name.toLowerCase().includes('alias'));

  const firstName = ((firstNameField && profileData[firstNameField.id]) || profileData['Nombre'] || (isMock ? character.name : ''))?.trim() || '';
  const lastName = ((lastNameField && profileData[lastNameField.id]) || profileData['Apellido'] || profileData['Apellidos'] || (isMock ? character.lastName : ''))?.trim() || '';
  const alias = ((aliasField && profileData[aliasField.id]) || profileData['Apodo'] || (isMock ? character.alias : ''))?.trim() || '';

  const hasAnyName = firstName || lastName || alias;

  // Map dynamic fields
  const imageField = fields?.find((f: any) => f.type === 'image');
  const avatarUrl = (imageField && profileData[imageField.id]) ? profileData[imageField.id] : character.avatarUrl;

  const quirkField = fields?.find((f: any) => f.type === 'quirk');
  const quirkData = quirkField ? {
    name: profileData[`${quirkField.id}_name`] || 'Sin Quirk',
    desc: profileData[`${quirkField.id}_desc`] || 'Descripción no especificada.',
    lvl1: profileData[`${quirkField.id}_lvl1`] || 'No especificado.',
    lvl2: profileData[`${quirkField.id}_lvl2`] || 'No especificado.',
    lvl3: profileData[`${quirkField.id}_lvl3`] || 'No especificado.',
  } : {
    name: character.quirkName,
    desc: character.quirkDescription,
    lvl1: character.quirkDescriptionLevel1,
    lvl2: character.quirkDescriptionLevel2,
    lvl3: character.quirkDescriptionLevel3,
  };

  const quirkTypeField = fields?.find((f: any) => f.name.toLowerCase().includes('tipo de quirk') || f.name.toLowerCase().includes('tipo de don') || f.name.toLowerCase().includes('clasificación de quirk') || f.name.toLowerCase().includes('clasificacion de quirk'));
  const actualQuirkType = (quirkTypeField && profileData[quirkTypeField.id]) 
    ? profileData[quirkTypeField.id] 
    : (profileData.quirkType || character.quirkType || "DON");

  const basicFields = fields?.filter((f: any) => 
    !['image', 'quirk', 'textarea'].includes(f.type) && 
    (f.category === 'Datos Básicos' || f.category === 'Datos Administrativos') &&
    f.id !== 'faction_group' &&
    f.id !== quirkTypeField?.id
  ) || [];

  if (isEditing) {
    return (
      <div className="p-4 relative">
        <CharacterEditor 
          character={dbCharacter?.id ? dbCharacter : null} 
          onSaved={() => {
            mutate();
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const factionName = profileData['faction_group'] || profileData['Facción'] || profileData['Faccion'] || profileData['Grupo'] || character.group || 'Sin Grupo';
  const selectedGroup = settings?.groups?.find((g: any) => g.name === factionName);
  const factionColor = selectedGroup?.color;
  
  let dynamicStyle = null;
  if (factionColor) {
    let r = 0, g = 0, b = 0;
    const hex = factionColor.replace('#', '');
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    
    // Inject CSS variables scoped to this container to override global root colors
    dynamicStyle = (
      <style>{`
        .player-sheet-container {
          --accent1: ${factionColor};
          --accent1a: ${r} ${g} ${b};
          --primary: color-mix(in srgb, var(--accent1) 85%, black);
          --accent: color-mix(in srgb, var(--accent1) 16%, var(--bg2));
          --ring: var(--accent1);
          --chart-1: var(--accent1);
          --sidebar-primary: var(--accent1);
          --sidebar-ring: var(--accent1);
        }
      `}</style>
    );
  }

  return (
    <div className="player-sheet-container font-oxanium text-sm text-foreground pb-16 relative p-4 lg:p-8">
      {dynamicStyle}
      {/* 1. TOP HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
        <div className="flex flex-col mt-auto">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-foreground drop-shadow-md flex items-center gap-3">
            {!hasAnyName ? (
              <span>SIN NOMBRE</span>
            ) : (
              <>
                {firstName}{firstName && lastName ? ' ' : ''}{lastName}
                {alias && (
                  <span className="text-primary text-xl md:text-2xl font-bold">
                    {(firstName || lastName) ? ' • ' : ''}{alias.toUpperCase()}
                  </span>
                )}
              </>
            )}
          </h1>
        </div>
        
        {/* TOP STATS & ACTIONS */}
        <div className="flex flex-col items-end gap-2">
          {/* Action Row - Will naturally hide if user doesn't have permission (since we only show it to the owner, but here we show it for demo) */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground h-8"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Ficha
          </Button>

          <div className="flex gap-2">
            <div className="bg-card/80 border border-border px-4 py-2 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-2xl font-bold text-foreground leading-none">{character.reputationOrThreat}</span>
              <span className="text-[10px] uppercase text-muted-foreground tracking-widest mt-1">Reputación</span>
            </div>
            <div className="bg-card/80 border border-border px-4 py-2 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-2xl font-bold text-foreground leading-none">{character.currentYens}</span>
              <span className="text-[10px] uppercase text-muted-foreground tracking-widest mt-1">Yenes</span>
            </div>
            <div className="bg-card/80 border border-border px-4 py-2 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-2xl font-bold text-foreground leading-none">{character.totalExp}</span>
              <span className="text-[10px] uppercase text-muted-foreground tracking-widest mt-1">EXP</span>
            </div>
          </div>
        </div>
      </div>
      
      
      
      
      
      
      <CyberSpacer variant="line" accent="accent1" glow />

      <div className="mt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
            <div className="aspect-[3/4] w-full bg-card border border-border overflow-hidden">
              <img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" />
            </div>
            
            {/* Job/School Information */}
            <div className="bg-card/40 border border-border p-3 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 border-b border-border pb-2 mb-1">
                <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-400" /> Educación
                </h3>
              </div>
              <div className="flex justify-between items-start border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground text-[9px] uppercase tracking-widest">Ocupación</span>
                <span className="text-foreground font-bold text-right">{character.occupation}</span>
              </div>
              <div className="flex justify-between items-start border-b border-border/50 pb-1.5">
                <span className="text-muted-foreground text-[9px] uppercase tracking-widest">Rango / Rol</span>
                <span className="text-foreground font-bold text-right">{character.rank}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground text-[9px] uppercase tracking-widest">Año Escolar</span>
                <span className="text-foreground font-bold text-right">{character.schoolYearOverride}</span>
              </div>
            </div>
            
            {/* Certifications */}
            {character.certifications && character.certifications.length > 0 && (
              <div className="bg-card/40 border border-border p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-border pb-2 mb-1">
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Certificaciones
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  {character.certifications.map((cert: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                      <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {character.skills && Object.keys(character.skills).length > 0 && (
              <div className="bg-card/40 border border-border p-3 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 border-b border-border pb-2 mb-1">
                  <h3 className="font-bold text-foreground uppercase tracking-widest text-[10px] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" /> Habilidades
                  </h3>
                </div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(character.skills).map(([skill, value]: [string, any], idx: number) => (
                    <div key={idx} className="flex justify-between items-start border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground text-[9px] uppercase tracking-widest">{skill}</span>
                      <span className="text-foreground font-bold text-right flex items-center gap-2">
                        {character.skillSpecializations && character.skillSpecializations[skill] && (
                          <span className="text-amber-400 text-[9px] font-normal italic mr-1">
                            ({character.skillSpecializations[skill]})
                          </span>
                        )}
                        Nvl. {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <CyberFillerPanel 
              icon={Shield}
              title="SYS.OPTIMAL"
              subtitle={`ID: CHAR_DEKU_1`}
              variant="accent2"
              pattern="dots" 
            />
          </div>
          
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            <EntityPanel
              pattern="dots"
              accent="accent1"
              glow
              cornerTicks
              title="DATOS DEL PERSONAJE"
              subtitle="Character Info"
              badge={factionName}
              icon={<Activity className="w-4 h-4" />}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 font-sans">
                {basicFields.length > 0 ? (
                  basicFields
                    .filter((field: any) => 
                        profileData[field.id] && 
                        String(profileData[field.id]).trim() !== '' &&
                      !field.name.toLowerCase().includes('nombre') &&
                      !field.name.toLowerCase().includes('apellido') &&
                      !field.name.toLowerCase().includes('apodo') &&
                      !field.name.toLowerCase().includes('alias')
                    )
                    .map((field: any, idx: number, arr: any[]) => {
                      const value = profileData[field.id];
                      let displayValue = Array.isArray(value) ? value.join(", ") : String(value);
                      if (field.type === 'date' && field.name.toLowerCase().includes('nacimiento')) {
                        const [year, month, day] = String(value).split('-');
                        if (year && month && day) {
                          const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                          const formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                          displayValue = formattedDate;
                          if (settings?.gameDate) {
                            const game = new Date(settings.gameDate.year, settings.gameDate.month - 1, settings.gameDate.day);
                            let age = game.getFullYear() - dateObj.getFullYear();
                            const m = game.getMonth() - dateObj.getMonth();
                            if (m < 0 || (m === 0 && game.getDate() < dateObj.getDate())) {
                              age--;
                            }
                            if (age >= 0) {
                              displayValue = `${displayValue} (${age} años)`;
                            }
                          }
                        }
                      }
                      return (
                        <React.Fragment key={field.id}>
                          <span>{field.name} • <strong className="text-foreground">{displayValue}</strong></span>
                          {idx < arr.length - 1 && <span className="text-border hidden sm:inline">|</span>}
                        </React.Fragment>
                      );
                    })
                ) : (
                  <>
                    <span>Grupo Sanguíneo • <strong className="text-foreground">{character.bloodType}</strong></span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span>Edad • <strong className="text-foreground">{character.age} Años</strong></span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span>Alineación • <strong className="text-foreground">{character.alignment}</strong></span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span>Género • <strong className="text-foreground">{character.gender}</strong></span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span>Nacionalidad • <strong className="text-foreground">Japonesa</strong></span>
                    <span className="text-border hidden sm:inline">|</span>
                    <span>Faceclaim • <strong className="text-foreground">{character.faceclaim}</strong></span>
                  </>
                )}
              </div>
            </EntityPanel>
            
            {/* Health & Stamina */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col bg-background border border-border p-3 relative overflow-hidden group">
                <HeartPlus className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground opacity-10" />
                <div className="relative z-10 flex flex-col gap-2 pl-8">
                  <div className="flex justify-end text-[10px] font-bold uppercase tracking-widest text-foreground">
                    <span className="text-primary mr-1">Salud</span> ({character.currentHealth} / {derived.maxHealth})
                  </div>
                  <div className="h-4 w-full bg-card border border-border overflow-hidden ml-auto">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(character.currentHealth / derived.maxHealth) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col bg-background border border-border p-3 relative overflow-hidden group">
                <BatteryCharging className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground opacity-10" />
                <div className="relative z-10 flex flex-col gap-2 pl-8">
                  <div className="flex justify-end text-[10px] font-bold uppercase tracking-widest text-foreground">
                    <span className="text-purple-500 mr-1">Estamina</span> ({character.currentStamina} / {derived.maxStamina})
                  </div>
                  <div className="h-4 w-full bg-card border border-border overflow-hidden ml-auto">
                    <div 
                      className="h-full bg-purple-500" 
                      style={{ width: `${(character.currentStamina / derived.maxStamina) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4 border-b border-primary/20 pb-4">
                <div className="bg-primary/20 p-2 text-primary">
                  <Zap className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-primary uppercase tracking-widest leading-none mb-1">QUIRK</h3>
                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest">✦ {character.quirkEvolution}</span>
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-lg font-bold text-foreground uppercase italic tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> {quirkData.name}
                </h4>
                <p className="text-xs text-muted-foreground text-justify leading-relaxed mb-4">
                  <strong className="text-foreground uppercase mr-2">{actualQuirkType} —</strong>
                  {quirkData.desc}
                </p>
              </div>
              <Accordion type="multiple" defaultValue={['level-1']} className="space-y-3 flex-1">
                <AccordionItem value="level-1" className="border-border bg-background/60 hover:border-indigo-400/40 transition-colors">
                  <AccordionTrigger className="text-indigo-400 text-xs font-bold uppercase tracking-widest py-3 px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Nivel 1
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1">
                    <p className="text-xs text-muted-foreground text-justify leading-relaxed">{quirkData.lvl1}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="level-2" className="border-border bg-background/60 hover:border-indigo-400/40 transition-colors">
                  <AccordionTrigger className="text-indigo-400 text-xs font-bold uppercase tracking-widest py-3 px-4 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Nivel 2
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1">
                    <p className="text-xs text-muted-foreground text-justify leading-relaxed">{quirkData.lvl2}</p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="level-3" className="border-border bg-background/60 hover:border-indigo-400/40 transition-colors">
                  <AccordionTrigger className="text-indigo-400 font-bold uppercase tracking-widest py-3 px-4 hover:no-underline text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      Nivel 3
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-1">
                    <p className="text-xs text-muted-foreground text-justify leading-relaxed">{quirkData.lvl3}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Traits & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntityPanel
                pattern="circuit"
                accent="accent1"
                title="RASGOS (TRAITS)"
                subtitle="Beneficios Pasivos"
                icon={<Sparkles className="w-4 h-4" />}
                className="h-full"
              >
                <div className="flex flex-col gap-2 mt-2">
                  {character.traits && character.traits.map((trait: string, idx: number) => (
                    <div key={idx} className="bg-primary/5 border border-primary/20 p-2 text-xs flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{trait}</span>
                    </div>
                  ))}
                  {(!character.traits || character.traits.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Sin rasgos registrados.</p>
                  )}
                </div>
              </EntityPanel>

              <EntityPanel
                pattern="circuit"
                accent="destructive"
                title="DEBILIDADES"
                subtitle="Penalizadores"
                icon={<AlertTriangle className="w-4 h-4" />}
                className="h-full"
              >
                <div className="flex flex-col gap-2 mt-2">
                  {character.weaknesses && character.weaknesses.map((weakness: string, idx: number) => (
                    <div key={idx} className="bg-destructive/5 border border-destructive/20 p-2 text-xs flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{weakness}</span>
                    </div>
                  ))}
                  {(!character.weaknesses || character.weaknesses.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Sin debilidades registradas.</p>
                  )}
                </div>
              </EntityPanel>
            </div>

            {/* Inventory */}
            <EntityPanel
              pattern="grid"
              title="INVENTARIO Y EQUIPAMIENTO"
              subtitle="Posesiones y Recursos"
              icon={<Package className="w-4 h-4" />}
            >
              <div className="flex flex-col gap-2 mt-2">
                {character.inventory && character.inventory.map((item: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="bg-muted p-3 flex items-center justify-center text-2xl rounded-sm">
                      {item.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm uppercase text-foreground">{item.name}</h4>
                        {item.equipped && (
                          <span className="text-[9px] uppercase tracking-widest bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm font-bold">
                            Equipado
                          </span>
                        )}
                        <span className="text-[9px] uppercase tracking-widest bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm font-bold ml-auto">
                          x{item.quantity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {item.notes && (
                        <p className="text-[10px] text-amber-400 mt-1 italic opacity-80">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
                {(!character.inventory || character.inventory.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">Inventario vacío.</p>
                )}
              </div>
            </EntityPanel>

            {/* Techniques */}
            <EntityPanel
              pattern="dots"
              accent="accent2"
              title="TÉCNICAS ESPECIALES"
              subtitle="Movimientos de Combate"
              icon={<Zap className="w-4 h-4" />}
            >
              <div className="flex flex-col gap-3 mt-2">
                {character.techniques && character.techniques.map((tech: any, idx: number) => (
                  <div key={idx} className="bg-card border border-border p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-black text-sm uppercase text-foreground tracking-wide flex items-center gap-2">
                          <span className="text-indigo-400">✦</span> {tech.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] uppercase tracking-widest font-bold">
                          <span className="text-muted-foreground">{tech.level}</span>
                          <span className="text-border">|</span>
                          <span className={tech.type === 'OFENSIVA' ? 'text-destructive' : tech.type === 'DEFENSIVA' ? 'text-emerald-400' : 'text-amber-400'}>
                            {tech.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 text-xs font-bold font-mono">
                          -{tech.cost} EST
                        </span>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                          Tirada: <span className="text-foreground">{tech.attribute}</span> vs <span className="text-foreground">{tech.vs}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-2 text-xs text-muted-foreground italic mb-2 border-l-2 border-border">
                      {tech.description}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
                      <div className="bg-background border border-border p-1.5 flex flex-col">
                        <span className="text-muted-foreground opacity-70 mb-0.5">Efecto / Mecánica</span>
                        <span className="text-foreground font-bold">{tech.mechanic}</span>
                      </div>
                      <div className="bg-background border border-border p-1.5 flex flex-col">
                        <span className="text-muted-foreground opacity-70 mb-0.5">Fórmula</span>
                        <span className="text-primary font-bold">{tech.effect}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!character.techniques || character.techniques.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">Sin técnicas registradas.</p>
                )}
              </div>
            </EntityPanel>
            
          </div>
        </div>
      </div>
    </div>
  );
}
