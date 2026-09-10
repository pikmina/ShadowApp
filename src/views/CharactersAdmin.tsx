import React, { useState } from 'react';
import { 
  Users, Plus, Search, Eye, Edit2, Copy, Trash2, User, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminRewardsDialog from '@/components/character/AdminRewardsDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CharacterEditor from '@/components/character/CharacterEditor';
import { useAuth } from '@/contexts/AuthContext';
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { toast } from "sonner";
import { EntityPanel } from '@/components/ui/entity-panel';
import { Badge } from '@/components/ui/badge';
import { CyberSpacer } from '@/components/ui/cyber-spacer';

export default function CharactersAdmin() {
  const { user, dbUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [rewardingCharId, setRewardingCharId] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'canon'>('all');

  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';
  const { data: allCharacters, mutate: mutateAll } = useSWR(user && isMod ? '/api/admin/characters' : null, fetcher);

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de que quieres borrar este personaje? Esta acción es irreversible.")) return;
    try {
      const res = await apiFetch(`/api/admin/character/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Error borrando");
      toast.success("Personaje borrado con éxito");
      mutateAll();
    } catch (e: any) {
      toast.error(e.message || "Error al borrar el personaje");
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const res = await apiFetch(`/api/admin/character/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error("Error duplicando");
      toast.success("Personaje duplicado");
      mutateAll();
    } catch (e: any) {
      toast.error(e.message || "Error al duplicar el personaje");
    }
  };

  if (!isMod) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
        <p className="text-muted-foreground max-w-md">Solo los moderadores pueden acceder a este panel.</p>
      </div>
    );
  }

  const charactersList = allCharacters || [];
  const displayCharacter = selectedCharacterId ? charactersList.find((c: any) => c.id === selectedCharacterId) : null;

  if (editing) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <EntityPanel 
          title={displayCharacter ? `Editando: ${displayCharacter.name}` : 'Nuevo Personaje'} 
          icon={<Edit2 className="w-5 h-5" />}
          pattern="diagonal"
          accent="accent1"
        >
          <div className="flex justify-end mb-4">
             <Button variant="outline" onClick={() => setEditing(false)}>Volver a Personajes</Button>
          </div>
          <CharacterEditor 
            character={displayCharacter} 
            onSaved={() => { setEditing(false); mutateAll(); }}
            onCancel={() => setEditing(false)}
          />
        </EntityPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Container */}
      <EntityPanel 
        title="Base de Datos de Personajes" 
        subtitle="Sincronización instantánea de estadísticas y técnicas."
        icon={<Users className="w-5 h-5" />}
        pattern="grid"
        cornerTicks
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           {/* Tabs */}
           <div className="flex gap-2 bg-muted/30 p-1 rounded-md border border-border">
             <button 
               onClick={() => setActiveTab('all')}
               className={`px-4 py-1.5 text-xs font-bold font-oxanium tracking-widest uppercase rounded transition-colors ${activeTab === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               Todos
             </button>
             <button 
               onClick={() => setActiveTab('canon')}
               className={`px-4 py-1.5 text-xs font-bold font-oxanium tracking-widest uppercase rounded transition-colors ${activeTab === 'canon' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
               Canon
             </button>
           </div>
           
           <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-oxanium uppercase tracking-widest text-xs" onClick={() => { setSelectedCharacterId(null); setEditing(true); }}>
             <Plus className="w-4 h-4 mr-2" /> Nuevo Personaje
           </Button>
        </div>

        <CyberSpacer pattern="none" className="my-4" />
        
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
           <div className="relative md:col-span-2">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <Input placeholder="Filtrar por nombre, quirk, ID..." className="pl-9 h-9 text-xs bg-background/40" />
           </div>
           <Select defaultValue="todos">
             <SelectTrigger className="h-9 text-xs bg-background/40">
               <SelectValue placeholder="Grupo: Todos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Grupo: Todos</SelectItem>
             </SelectContent>
           </Select>
           <Select defaultValue="nombre">
             <SelectTrigger className="h-9 text-xs bg-background/40">
               <SelectValue placeholder="Ordenar: Nombre" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="nombre">Ordenar: Nombre</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </EntityPanel>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {charactersList.map((c: any) => {
          const p = c.profileData || {};
          const isOwner = c.userId === dbUser?.id;
          
          return (
            <div key={c.id} className="flex bg-card border border-border rounded-xl overflow-hidden relative group h-[180px] shadow-sm hover:border-primary/50 transition-colors">
               {/* Image side */}
               <div className="w-[120px] shrink-0 relative bg-muted/20 border-r border-border/50">
                 {p.avatarUrl ? (
                   <img src={p.avatarUrl} alt={c.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                     <User className="w-10 h-10" />
                   </div>
                 )}
                 <div className="absolute inset-0 border border-primary/10 mix-blend-overlay"></div>
                 <div className="absolute bottom-2 left-2 flex gap-1 z-10">
                   {isOwner && (
                     <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary border-transparent">Tuyo</Badge>
                   )}
                 </div>
               </div>

               {/* Content side */}
               <div className="flex-1 p-3 flex flex-col min-w-0">
                 <div className="flex justify-between items-start mb-1">
                   <h3 className="font-bold text-foreground truncate uppercase font-yanone text-lg leading-tight w-[100px]">{c.name}</h3>
                   <span className="text-[10px] font-oxanium tracking-widest text-muted-foreground/60 shrink-0">ID: {c.id}</span>
                 </div>
                 
                 <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-oxanium truncate mb-2">
                   "{p.alias || 'Desconocido'}"
                 </div>

                 <div className="text-[10px] font-oxanium text-primary truncate mb-3 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    {p.quirk_name || 'Sin Don'}
                 </div>

                 <div className="mt-auto flex flex-wrap items-center gap-1">
                   <Button 
                     variant="outline" 
                     size="icon" 
                     className="w-7 h-7 bg-transparent hover:bg-muted"
                     onClick={() => window.open(`/sheet/${c.id}`, '_blank')}
                     title="Ver Ficha Pública"
                   >
                     <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                   </Button>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     className="w-7 h-7 bg-transparent hover:bg-primary/20 hover:text-primary border-primary/20"
                     onClick={() => { setSelectedCharacterId(c.id); setEditing(true); }}
                     title="Editar Ficha"
                   >
                     <Edit2 className="w-3.5 h-3.5" />
                   </Button>
                   <Button 
                     variant="outline" 
                     size="icon" 
                     className="w-7 h-7 bg-transparent hover:bg-accent2/20 hover:text-accent2 border-accent2/20"
                     onClick={() => setRewardingCharId(c.id)}
                     title="Administrar Recompensas"
                   >
                     <Award className="w-3.5 h-3.5" />
                   </Button>
                   
                   {dbUser?.role === 'superadmin' && (
                     <>
                       <div className="w-px h-4 bg-border mx-0.5" />
                       <Button 
                         variant="outline" 
                         size="icon" 
                         className="w-7 h-7 bg-transparent hover:bg-muted"
                         onClick={() => handleDuplicate(c.id)}
                         title="Duplicar Personaje"
                       >
                         <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                       </Button>
                       <Button 
                         variant="outline" 
                         size="icon" 
                         className="w-7 h-7 bg-transparent hover:bg-destructive/20 hover:text-destructive border-destructive/20 ml-auto"
                         onClick={() => handleDelete(c.id)}
                         title="Borrar Personaje"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </Button>
                     </>
                   )}
                 </div>
               </div>
            </div>
          );
        })}
      </div>
      
      {rewardingCharId && <AdminRewardsDialog characterId={rewardingCharId} onClose={() => { setRewardingCharId(null); mutateAll(); }} />}
    </div>
  );
}
