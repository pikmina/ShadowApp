import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, Heart, Zap, Coins, Award, Activity, Info, User, 
  GraduationCap, Box, Swords, BrainCircuit, FileText, ChevronDown
} from 'lucide-react';

export default function PublicSheet() {
  const { id } = useParams();
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchChar = async () => {
      try {
        const res = await fetch(`/api/public/character/${id}`);
        if (!res.ok) throw new Error("Character not found");
        const data = await res.json();
        setCharacter(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchChar();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-muted-foreground">Cargando ficha...</div>;
  }

  if (error || !character) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-destructive">Error: Ficha no encontrada o privada.</div>;
  }

  const p = character.profileData || {};
  const getVal = (key: string) => p[key] || '-';

  return (
    <div className="min-h-screen bg-[#050505] text-[#a1a1aa] font-sans selection:bg-[#2c3e50] selection:text-white pb-20">
      
      {/* Top Navbar */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-white font-black tracking-widest text-sm flex items-center gap-2">
            <span className="bg-[#2c3e50] text-white px-1.5 py-0.5 rounded text-[10px]">S</span>
            SHADOWMORE OS <span className="text-[#3b82f6] text-xs font-normal">v4.1.2</span>
          </h1>
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground/60 mt-1">Ficha Oficial de Personaje (Vista Pública)</p>
        </div>
        <div className="flex gap-3">
          <Link to="/my-sheet" className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-white/10 rounded hover:bg-white/5 transition-colors text-white/70">
            Registros
          </Link>
          <Link to="/login" className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-white/10 rounded hover:bg-white/5 transition-colors text-white/70">
            Acceso Administrador
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-10 space-y-6">
        
        {/* Header Title & Top Stats */}
        <div className="flex justify-between items-end border-b border-white/10 pb-4">
          <h1 className="text-4xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            {character.name} <span className="text-[#3b82f6]/70 text-2xl font-bold">▪ {p.alias || 'SIN ALIAS'}</span>
          </h1>
          
          <div className="flex gap-2">
             <div className="bg-[#111] border border-white/5 rounded p-3 text-center min-w-[100px]">
               <div className="text-2xl font-black text-white">{p.reputation || 0}</div>
               <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Reputación</div>
             </div>
             <div className="bg-[#111] border border-white/5 rounded p-3 text-center min-w-[100px]">
               <div className="text-2xl font-black text-white">{character.yen || 0}</div>
               <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Yenes</div>
             </div>
             <div className="bg-[#111] border border-white/5 rounded p-3 text-center min-w-[100px]">
               <div className="text-2xl font-black text-white">{character.exp || 0}</div>
               <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Exp</div>
             </div>
          </div>
        </div>

        {/* Datos del Personaje Banner */}
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-md p-5 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/20 rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/20 rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20 rounded-br-sm" />
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
               <Activity className="w-5 h-5 text-[#3b82f6]" />
               <div>
                 <h2 className="text-white font-bold tracking-widest uppercase">Datos del Personaje</h2>
                 <p className="text-xs text-muted-foreground">Character Info</p>
               </div>
            </div>
            {p.group && (
              <span className="px-3 py-1 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-white/50 bg-white/5">
                {p.group}
              </span>
            )}
          </div>

          <div className="relative z-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
             <div>Grupo Sanguíneo • <span className="text-white font-bold">{getVal('bloodType')}</span></div>
             <div className="text-white/20">|</div>
             <div>Edad • <span className="text-white font-bold">{getVal('age')} Años</span></div>
             <div className="text-white/20">|</div>
             <div>Alineación • <span className="text-white font-bold">{getVal('alignment')}</span></div>
             <div className="text-white/20">|</div>
             <div>Género • <span className="text-white font-bold">{getVal('gender')}</span></div>
             <div className="text-white/20">|</div>
             <div>Nacionalidad • <span className="text-white font-bold">{getVal('nationality')}</span></div>
             <div className="text-white/20">|</div>
             <div>Faceclaim • <span className="text-white font-bold">{getVal('faceclaim')}</span></div>
          </div>
        </div>

        {/* 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_400px_1fr] gap-6">
          
          {/* Left Col: Avatar & Vitals */}
          <div className="space-y-6">
            <div className="bg-[#111] border border-white/10 p-2 rounded-md aspect-[3/4]">
               {p.avatarUrl ? (
                <img src={p.avatarUrl} alt={character.name} className="w-full h-full object-cover rounded-sm grayscale-[20%] contrast-125" />
              ) : (
                <div className="w-full h-full bg-black/50 rounded-sm flex items-center justify-center">
                  <User className="w-16 h-16 text-white/10" />
                </div>
              )}
            </div>

            {/* Vitals */}
            <div className="space-y-4">
               {/* Health */}
               <div className="bg-[#111] border border-white/10 rounded-md p-4 relative overflow-hidden">
                 <Heart className="absolute -left-2 -bottom-2 w-16 h-16 text-white/5" />
                 <div className="relative z-10 flex justify-between items-end mb-2">
                   <span className="text-[#63b3ed] font-bold text-xs uppercase tracking-widest">Salud</span>
                   <span className="text-white font-bold text-sm">({p.currentHealth || 0} / {p.maxHealth || 0})</span>
                 </div>
                 <div className="relative z-10 h-3 bg-black rounded-sm overflow-hidden border border-white/5">
                   <div className="h-full bg-[#63b3ed]" style={{ width: `${Math.min(100, ((p.currentHealth||0)/(p.maxHealth||1))*100)}%` }} />
                 </div>
               </div>

               {/* Stamina */}
               <div className="bg-[#111] border border-white/10 rounded-md p-4 relative overflow-hidden">
                 <Zap className="absolute -left-2 -bottom-2 w-16 h-16 text-white/5" />
                 <div className="relative z-10 flex justify-between items-end mb-2">
                   <span className="text-[#9f7aea] font-bold text-xs uppercase tracking-widest">Estamina</span>
                   <span className="text-white font-bold text-sm">({p.currentStamina || 0} / {p.maxStamina || 0})</span>
                 </div>
                 <div className="relative z-10 h-3 bg-black rounded-sm overflow-hidden border border-white/5">
                   <div className="h-full bg-[#9f7aea]" style={{ width: `${Math.min(100, ((p.currentStamina||0)/(p.maxStamina||1))*100)}%` }} />
                 </div>
               </div>
            </div>

            {/* Education */}
            <div className="bg-[#111] border border-white/10 rounded-md p-5 space-y-4">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-[#3b82f6]" /> Educación
              </h3>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="uppercase tracking-widest text-muted-foreground">Ocupación</span>
                <span className="font-bold text-white text-right max-w-[60%]">{getVal('occupation')}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                <span className="uppercase tracking-widest text-muted-foreground">Rango / Rol</span>
                <span className="font-bold text-white text-right max-w-[60%]">{getVal('rank')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-widest text-muted-foreground">Año Escolar</span>
                <span className="font-bold text-white text-right max-w-[60%]">{getVal('schoolYear')}</span>
              </div>
            </div>

            {/* Sys ID */}
            <div className="relative bg-[#0a0a0a] border border-white/5 rounded-md p-6 overflow-hidden flex flex-col items-center justify-center text-center">
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <Shield className="w-6 h-6 text-white/10 mb-2 relative z-10" />
              <div className="text-[10px] uppercase tracking-widest text-white/30 relative z-10">SYS.OPTIMAL<br/>ID: CHAR_CHAR_{character.id}</div>
              <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-white/10 rounded-tl-[1px]" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/10 rounded-tr-[1px]" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/10 rounded-bl-[1px]" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-white/10 rounded-br-[1px]" />
            </div>
          </div>

          {/* Middle Col: Stats */}
          <div className="space-y-6">
            
            {/* Base Attributes */}
            <div className="bg-[#111] border border-white/10 rounded-md p-5">
              <h3 className="text-[#63b3ed] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-5">
                <Heart className="w-3.5 h-3.5" /> Atributos Base
              </h3>
              
              <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 rounded-sm overflow-hidden">
                {[
                  { k: 'FUE', label: 'Fuerza', icon: '✊' },
                  { k: 'RES', label: 'Resistencia', icon: '🛡️' },
                  { k: 'DES', label: 'Destreza', icon: '⚡' },
                  { k: 'INT', label: 'Inteligencia', icon: '🧠' },
                  { k: 'VEL', label: 'Velocidad', icon: '💨' },
                  { k: 'VOL', label: 'Voluntad', icon: '🔥' },
                ].map(attr => (
                  <div key={attr.k} className="bg-[#111] p-3 flex items-center justify-between group hover:bg-[#151515] transition-colors relative overflow-hidden">
                    <span className="absolute -left-2 -bottom-2 text-4xl opacity-[0.03] grayscale">{attr.icon}</span>
                    <div className="flex flex-col relative z-10">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{attr.label}</span>
                    </div>
                    <span className="text-xl font-black text-white relative z-10">{p[attr.k] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Derived Attributes */}
            <div className="bg-[#111] border border-white/10 rounded-md p-5">
              <h3 className="text-[#63b3ed] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-5">
                <Activity className="w-3.5 h-3.5" /> Atributos Derivados
              </h3>
              
              <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 rounded-sm overflow-hidden">
                {[
                  { label: 'Evasión', val: p.eva || '10' },
                  { label: 'Coraje', val: p.cor || '10' },
                  { label: 'Daño Base', val: p.baseDamage || '1D4' },
                  { label: 'Plus Ultra', val: p.plusUltra || '1' },
                  { label: 'Reducción Daño', val: p.dr || '0' },
                  { label: 'Iniciativa', val: p.initiative || '+0' },
                  { label: 'Mod FUE', val: p.modFUE || '+0' },
                  { label: 'Mod DES', val: p.modDES || '+0' },
                ].map(attr => (
                  <div key={attr.label} className="bg-[#111] p-3 flex flex-col items-center justify-center gap-1 hover:bg-[#151515] transition-colors text-center">
                     <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{attr.label}</span>
                     <span className="text-lg font-black text-white">{attr.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync block */}
            <div className="relative bg-[#0a0a0a] border border-white/5 rounded-md p-6 overflow-hidden flex flex-col items-center justify-center text-center h-[120px]">
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <Activity className="w-6 h-6 text-white/10 mb-2 relative z-10" />
              <div className="text-[10px] uppercase tracking-widest text-white/30 relative z-10">ATTR.SYNC<br/>V.4.1.2</div>
              <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-white/10 rounded-tl-[1px]" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-white/10 rounded-tr-[1px]" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-white/10 rounded-bl-[1px]" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-white/10 rounded-br-[1px]" />
            </div>

          </div>

          {/* Right Col: Quirk & Text */}
          <div className="bg-[#111] border border-white/10 rounded-md p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
              <div className="bg-[#1a1a1a] p-3 rounded-md border border-white/10">
                <Zap className="w-6 h-6 text-[#63b3ed]" />
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black text-[#63b3ed] tracking-wider">QUIRK</h2>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">✦ Nivel 1. Despertar</p>
              </div>
            </div>

            <h3 className="text-xl font-black text-white italic flex items-center gap-2 mb-3">
              <span className="text-[#63b3ed]">✦</span> {p.quirkName || 'SIN DON'}
            </h3>
            
            <p className="text-sm leading-relaxed text-muted-foreground text-justify mb-6">
              <span className="font-bold text-white mr-2 uppercase">{p.quirkType || 'DESCONOCIDO'} —</span>
              {p.quirkDesc || 'Este personaje no posee un don registrado o es Quirkless.'}
            </p>

            {/* Quirk Levels accordion mock */}
            <div className="space-y-2 mt-auto">
              <div className="bg-[#1a1a1a] border border-white/5 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#63b3ed] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#63b3ed] rounded-full"></span> Nivel 1
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/30" />
                </div>
                <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {p.quirkLvl1 || 'Descripción del nivel 1 de poder.'}
                </div>
              </div>
              <div className="bg-black/30 border border-white/5 p-3 rounded-md flex justify-between items-center cursor-not-allowed">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white/10 rounded-full"></span> Nivel 2
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/10" />
              </div>
              <div className="bg-black/30 border border-white/5 p-3 rounded-md flex justify-between items-center cursor-not-allowed">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white/10 rounded-full"></span> Nivel 3
                  </span>
                  <ChevronDown className="w-4 h-4 text-white/10" />
              </div>
            </div>
          </div>
        </div>

        {/* Lower Grid: Certs, Skills, Traits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Certificaciones */}
          <div className="bg-[#111] border border-white/10 rounded-md p-5">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-5">
              <Award className="w-3.5 h-3.5 text-[#3b82f6]" /> Certificaciones
            </h3>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-md p-3 flex gap-3 items-center">
              <div className="text-2xl">📜</div>
              <div>
                <h4 className="text-sm font-bold text-[#63b3ed]">Registro de Quirk ante el Ministerio Japonés</h4>
                <p className="text-[10px] text-muted-foreground uppercase">General</p>
              </div>
            </div>
          </div>

          {/* Habilidades */}
          <div className="bg-[#111] border border-white/10 rounded-md p-5">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-5">
              <BrainCircuit className="w-3.5 h-3.5 text-[#3b82f6]" /> Habilidades
            </h3>
            <div className="space-y-4">
              {[
                { name: 'COMBATE [Karate]', lvl: 1 },
                { name: 'INVESTIGACION', lvl: 1 }
              ].map(s => (
                <div key={s.name} className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#63b3ed] flex items-center gap-2">
                    <span className="text-white/30 text-[10px]">✦</span> {s.name}
                  </span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-2 h-3 rounded-[1px] ${i <= s.lvl ? 'bg-[#3b82f6]' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rasgos y Debilidades */}
          <div className="bg-[#111] border border-white/10 rounded-md p-5">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-5">
              <FileText className="w-3.5 h-3.5 text-[#3b82f6]" /> Rasgos y Debilidades
            </h3>
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-[#3b82f6] font-bold mr-1">✦ Fortaleza mental :</span>
                <span className="text-muted-foreground">Tu personaje obtiene +1 en Voluntad.</span>
              </div>
              <div className="text-sm">
                <span className="text-[#3b82f6] font-bold mr-1">✦ Estamina Mejorada :</span>
                <span className="text-muted-foreground">Tu personaje tiene +2 Estamina Extra.</span>
              </div>
              <div className="text-sm">
                <span className="text-destructive font-bold mr-1">✦ Retroceso Corporal :</span>
                <span className="text-muted-foreground">Cada vez que usas tu quirk recibes 3 puntos de daño.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Split: Tecnicas y Inventario */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          {/* Técnicas */}
          <div className="bg-[#111] border border-white/10 rounded-md p-5 flex flex-col">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Swords className="w-3.5 h-3.5 text-[#3b82f6]" /> Técnicas
              </h3>
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">3</div>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 max-h-[400px]">
              {/* Fake Tech 1 */}
              <div className="border border-white/5 rounded-md p-4 bg-black/20">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-white/30 text-[10px]">✦</span> DELAWARE SMASH! <span className="text-muted-foreground font-normal">(FUE)</span>
                  </h4>
                  <span className="px-2 py-0.5 border border-white/10 rounded text-[10px] text-white/50 bg-white/5">Nivel 1 (Despertar)</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className="bg-[#1a1a1a] border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400">3 ES</span>
                  <span className="bg-[#1a1a1a] border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-[#63b3ed]">OFENSIVA</span>
                  <span className="bg-[#3b82f6]/20 border border-[#3b82f6]/30 px-2 py-0.5 rounded text-[10px] font-bold text-[#63b3ed]">VS EVA</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Izuku tensiona uno de sus dedos con su dedo pulgar para luego liberarlo y crear una poderosa onda de choque. Hacer esto fractura dicho dedo, lo cual limita la cantidad de veces que puede utilizar este movimiento al 10%. Aplica la Debilidad Retroceso corporal.
                </p>
                <div className="bg-[#1a1a1a] border-l-2 border-white/20 p-3 mb-3 text-sm text-muted-foreground">
                  <span className="font-bold text-white">Mecánica:</span> Inflige 3D6 de Daño. Requiere: Debe esperar 2 turnos para volverlo a realizar.
                </div>
                <div className="text-[10px] font-bold text-[#63b3ed] uppercase tracking-widest flex items-center justify-between">
                  <span>EFECTO: DAÑO 3D6. 2D10 + FUE</span>
                  <Box className="w-3 h-3 text-white/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div className="bg-[#111] border border-white/10 rounded-md p-5">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-5">
              <Box className="w-3.5 h-3.5 text-[#3b82f6]" /> Inventario
            </h3>
            
            <div className="grid grid-cols-4 gap-1">
              <div className="aspect-square bg-[#1a1a1a] border border-white/10 rounded-sm flex flex-col items-center justify-center p-2 text-center group cursor-pointer hover:border-white/30 transition-colors">
                <span className="text-2xl mb-1">🥋</span>
                <span className="text-[9px] text-white leading-tight">Cinturón Ligero</span>
                <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full">((Motor 4.1] DC: 90 ...</span>
              </div>
              {Array.from({length: 15}).map((_, i) => (
                <div key={i} className="aspect-square bg-black/40 border border-white/5 rounded-sm flex items-center justify-center text-[10px] text-white/10">
                  Vacío
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
