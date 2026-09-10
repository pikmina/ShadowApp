import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, Heart, Zap, Coins, Award, Activity, Info, User, 
  GraduationCap, Box, Swords, BrainCircuit, FileText, ChevronDown
} from 'lucide-react';
import { EntityPanel } from '@/components/ui/entity-panel';
import { CyberModule } from '@/components/ui/cyber-module';
import { CyberSpacer } from '@/components/ui/cyber-spacer';
import { CyberFillerPanel } from '@/components/ui/cyber-filler-panel';
import { Badge } from '@/components/ui/badge';

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
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Cargando ficha...</div>;
  }
  if (error || !character) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-destructive">Error: Ficha no encontrada o privada.</div>;
  }

  const p = character.profileData || {};
  const getVal = (key: string) => p[key] || '-';
  const getNum = (key: string) => parseInt(p[key] || '0');

  // Computed values
  const attrKeys = ['fuerza', 'destreza', 'constitucion', 'inteligencia', 'percepcion', 'carisma', 'voluntad', 'suerte'];
  const baseAttrs = attrKeys.map(k => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: getNum(k) }));
  
  const derivedAttrs = [
    { label: 'Aguante', value: Math.floor((getNum('constitucion') * 2) + (getNum('voluntad') * 0.5)) },
    { label: 'Iniciativa', value: Math.floor((getNum('destreza') + getNum('percepcion')) / 2) },
    { label: 'Evasión', value: Math.floor(getNum('destreza') + (getNum('suerte') * 0.2)) },
    { label: 'Dureza', value: Math.floor(getNum('constitucion') * 1.5) },
  ];

  const possesses = character.possessions || [];
  
  // Elements filtering (assuming relations are partly fetched or we use defaults for now)
  const traits = possesses.filter((p: any) => p.element?.kind === 'trait');
  const weaknesses = possesses.filter((p: any) => p.element?.kind === 'weakness');
  const skills = possesses.filter((p: any) => p.element?.kind === 'skill');
  const techniques = possesses.filter((p: any) => p.element?.kind === 'technique' || p.element?.kind === 'technique_entitlement');
  const inventory = possesses.filter((p: any) => ['equipment', 'weapon', 'consumable', 'ammunition', 'crafting_material', 'ingredient'].includes(p.element?.kind));

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins selection:bg-primary/20 selection:text-primary pb-20">
      
      {/* Top Navbar */}
      <div className="border-b border-border bg-background/60 backdrop-blur-md px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-foreground font-black tracking-widest text-sm flex items-center gap-2 font-oxanium">
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px]">S</span>
            SHADOWMORE OS <span className="text-primary text-xs font-normal">v4.1.2</span>
          </h1>
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground mt-1 font-oxanium">Expediente Oficial (Público)</p>
        </div>
        <div className="flex gap-3">
          <Link to="/character-editor" className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-border rounded hover:bg-muted transition-colors text-muted-foreground font-oxanium">
            Registros
          </Link>
          <Link to="/login" className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-border rounded hover:bg-muted transition-colors text-muted-foreground font-oxanium">
            Acceso Admin
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-start">
          <div className="relative aspect-square md:aspect-auto md:h-64 border border-border bg-card rounded-md overflow-hidden shrink-0 group">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt={character.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                <User className="w-20 h-20" />
              </div>
            )}
            <div className="absolute inset-0 border border-primary/20 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-4">
              <Badge variant="outline" className="bg-background/80 backdrop-blur border-primary/30 text-primary font-oxanium uppercase tracking-widest text-[10px]">
                {getVal('status') || 'Activo'}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-black font-yanone tracking-tight text-foreground uppercase leading-none">
                {character.name}
              </h2>
              <div className="text-xl font-oxanium text-muted-foreground tracking-widest uppercase mt-1">
                "{getVal('alias') || 'Desconocido'}"
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="font-oxanium uppercase tracking-wider text-xs px-3 py-1 bg-accent/10 border-accent/20 text-accent-foreground">{getVal('group') || 'Independiente'}</Badge>
              <Badge variant="secondary" className="font-oxanium uppercase tracking-wider text-xs px-3 py-1 bg-accent2/10 border-accent2/20 text-accent2">{getVal('gender') || 'N/A'}</Badge>
              <Badge variant="secondary" className="font-oxanium uppercase tracking-wider text-xs px-3 py-1 bg-accent3/10 border-accent3/20 text-accent3">Nvl {getVal('level') || '1'}</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-oxanium">HP Máximo</span>
                  <span className="text-sm font-bold">{getVal('max_hp') || '100'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-oxanium">Stamina</span>
                  <span className="text-sm font-bold">{getVal('max_stamina') || '100'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-accent4" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-oxanium">Reputación</span>
                  <span className="text-sm font-bold">{getVal('reputation') || '0'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-accent2" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-oxanium">Yenes</span>
                  <span className="text-sm font-bold">{getVal('yens') || '0'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CyberSpacer pattern="grid" className="my-8" />

        {/* Quirk & Identity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EntityPanel 
              title="Don (Quirk)" 
              icon={<Activity className="w-5 h-5" />} 
              pattern="dots" 
              accent="accent1" 
              cornerTicks 
              glow
            >
              <h3 className="text-xl font-bold uppercase tracking-wider text-primary mb-2 font-oxanium">
                {getVal('quirk_name') || 'Sin Quirk'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {getVal('quirk_description') || 'No se ha registrado información sobre su Don.'}
              </p>
              
              {/* Optional module if it's a specific type */}
              <CyberModule 
                title="Clasificación" 
                text={getVal('quirk_type') || 'Emisor'} 
                variant="accent1" 
                className="mt-4" 
              />
            </EntityPanel>
            
            <EntityPanel title="Historia y Personalidad" icon={<Info className="w-5 h-5" />} pattern="none" cornerTicks>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                <div>
                  <h4 className="text-foreground font-bold font-oxanium uppercase tracking-widest text-xs mb-1">Personalidad</h4>
                  <p>{getVal('personality') || 'Información clasificada.'}</p>
                </div>
                <div>
                  <h4 className="text-foreground font-bold font-oxanium uppercase tracking-widest text-xs mb-1">Historia</h4>
                  <p>{getVal('backstory') || 'Expediente no disponible.'}</p>
                </div>
              </div>
            </EntityPanel>
          </div>

          <div className="space-y-6">
            <EntityPanel title="Atributos Base" icon={<BrainCircuit className="w-5 h-5" />} pattern="grid" accent="default">
              <div className="grid grid-cols-2 gap-2">
                {baseAttrs.map(attr => (
                  <div key={attr.label} className="bg-muted/30 border border-border p-2 rounded flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-oxanium uppercase tracking-widest">{attr.label}</span>
                    <span className="text-xl font-bold text-foreground">{attr.value}</span>
                  </div>
                ))}
              </div>
            </EntityPanel>

            <EntityPanel title="Estadísticas Derivadas" icon={<Activity className="w-5 h-5" />} pattern="diagonal" accent="accent3">
              <div className="space-y-2">
                {derivedAttrs.map(attr => (
                  <div key={attr.label} className="flex justify-between items-center p-2 bg-muted/20 border border-border rounded">
                    <span className="text-xs text-muted-foreground font-oxanium uppercase tracking-widest">{attr.label}</span>
                    <span className="text-sm font-bold text-foreground">{attr.value}</span>
                  </div>
                ))}
              </div>
            </EntityPanel>
          </div>
        </div>

        <CyberSpacer pattern="horizontal" className="my-8" />

        {/* Inventory and Mechanics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <EntityPanel title="Habilidades y Destrezas" icon={<GraduationCap className="w-5 h-5" />} cornerTicks>
              {skills.length > 0 ? (
                <div className="space-y-2">
                  {skills.map((s: any) => (
                    <CyberModule key={s.id} title={s.element.name} text={s.element.description || 'Sin descripción'} variant="default" showTelemetry={false} />
                  ))}
                </div>
              ) : (
                <CyberFillerPanel message="Sin habilidades registradas" />
              )}
            </EntityPanel>
            
            <EntityPanel title="Inventario y Equipamiento" icon={<Box className="w-5 h-5" />} cornerTicks pattern="dots">
              {inventory.length > 0 ? (
                <div className="space-y-2">
                  {inventory.map((item: any) => (
                    <CyberModule key={item.id} title={item.element.name} subtitle={`Cant: ${item.quantity}`} text={item.element.description} variant="default" showTelemetry={false} />
                  ))}
                </div>
              ) : (
                <CyberFillerPanel message="Inventario vacío" />
              )}
            </EntityPanel>
          </div>

          <div className="space-y-6">
            <EntityPanel title="Técnicas Especiales" icon={<Swords className="w-5 h-5" />} cornerTicks pattern="radial" accent="accent1" glow>
              {techniques.length > 0 ? (
                <div className="space-y-2">
                  {techniques.map((t: any) => (
                    <CyberModule key={t.id} title={t.element.name} text={t.element.description} variant="accent1" />
                  ))}
                </div>
              ) : (
                <CyberFillerPanel message="No domina técnicas especiales" />
              )}
            </EntityPanel>
            
            <div className="grid grid-cols-2 gap-4">
              <EntityPanel title="Rasgos" icon={<FileText className="w-4 h-4" />}>
                {traits.length > 0 ? (
                  <div className="space-y-2">
                    {traits.map((t: any) => (
                      <Badge key={t.id} variant="outline" className="w-full justify-start text-xs font-normal font-oxanium text-muted-foreground">{t.element.name}</Badge>
                    ))}
                  </div>
                ) : (
                  <CyberFillerPanel message="Sin rasgos" minHeight="80px" />
                )}
              </EntityPanel>
              
              <EntityPanel title="Debilidades" icon={<ChevronDown className="w-4 h-4" />}>
                {weaknesses.length > 0 ? (
                  <div className="space-y-2">
                    {weaknesses.map((w: any) => (
                      <Badge key={w.id} variant="outline" className="w-full justify-start text-xs font-normal font-oxanium text-destructive border-destructive/30">{w.element.name}</Badge>
                    ))}
                  </div>
                ) : (
                  <CyberFillerPanel message="Sin debilidades" minHeight="80px" />
                )}
              </EntityPanel>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
