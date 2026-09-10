import React, { useState } from 'react';
import { 
  Users, Plus, Search, Contact, Eye, Edit2, Copy, Trash2, User, Shield
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


export default function CharactersView() {
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
      await apiFetch(`/api/admin/characters/${id}`, { method: 'DELETE' });
      toast.success("Personaje borrado exitosamente");
      mutateAll();
    } catch (e) {
      toast.error("Error al borrar el personaje");
    }
  };

  const handleDuplicate = async (character: any) => {
    try {
      const newName = character.name + " (Copia)";
      const body = {
        name: newName,
        profileData: character.profileData
      };
      // Since it's admin, they might be duplicating someone else's char, but wait, POST /api/character saves it for the logged in user right now.
      // Actually we just want a way to duplicate. The current api uses the logged in user.
      await apiFetch('/api/character', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      toast.success("Personaje duplicado exitosamente");
      mutateAll();
    } catch (e) {
      toast.error("Error al duplicar el personaje");
    }
  };

  const charactersList = (isMod ? (allCharacters || []) : []).filter((c: any) => {
    if (activeTab === 'canon') return c.profileData?.isCanon === true;
    return true;
  });
  
  if (!isMod) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-bold text-foreground">Acceso Restringido</h2>
        <p className="text-muted-foreground max-w-md">
          Solo los moderadores pueden acceder a este panel.
        </p>
      </div>
    );
  }

  if (editing) {
    const displayCharacter = charactersList.find((c: any) => c.id === selectedCharacterId) || null;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-md border border-border">
          <h2 className="text-lg font-bold">{displayCharacter ? `Editando: ${displayCharacter.name}` : 'Nuevo Personaje'}</h2>
          <Button variant="ghost" onClick={() => setEditing(false)}>Volver a Personajes</Button>
        </div>
        <div className="bg-card p-6 rounded-md shadow border border-border">
          <CharacterEditor 
            character={displayCharacter} 
            onSaved={() => { setEditing(false); mutateAll(); }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Container */}
      <div className="bg-[#111111] border border-border p-5 rounded-xl flex flex-col gap-5 shadow-sm">
         {/* Top row */}
         <div className="flex items-start justify-between">
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
               <Users className="w-5 h-5 text-muted-foreground" />
               Personajes
             </h2>
             <p className="text-xs text-muted-foreground mt-1.5">
               Base de datos automatizada Shadowmore OS 4.1.2 — Sincronización instantánea de estadísticas y técnicas.
             </p>
           </div>
           <div className="flex items-center gap-3 shrink-0">
             <Button size="sm" className="bg-[#4b637c] hover:bg-[#3d5166] text-white text-xs border-none shadow-sm h-9 px-4" onClick={() => { setSelectedCharacterId(null); setEditing(true); }}>
               <Plus className="w-4 h-4 mr-1.5" />
               Nuevo Personaje
             </Button>
           </div>
         </div>

         {/* Tabs */}
         <div className="flex gap-2 border-b border-border/50 pb-4">
           <button 
             onClick={() => setActiveTab('all')}
             className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${activeTab === 'all' ? 'bg-[#1a1a1a] border border-border text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}>
             Todos los Personajes
           </button>
           <button 
             onClick={() => setActiveTab('canon')}
             className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${activeTab === 'canon' ? 'bg-[#1a1a1a] border border-border text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}>
             Personajes Canon
           </button>
         </div>

         {/* Filters */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
           <div className="relative lg:col-span-2">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <Input placeholder="Filtrar por nombre, quirk, ID..." className="pl-9 h-9 text-xs bg-black/40 border-border focus-visible:ring-1 focus-visible:ring-border" />
           </div>
           <Select defaultValue="todos">
             <SelectTrigger className="h-9 text-xs bg-black/40 border-border focus:ring-1 focus:ring-border">
               <SelectValue placeholder="Grupo: Todos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Grupo: Todos</SelectItem>
             </SelectContent>
           </Select>
           <Select defaultValue="todos">
             <SelectTrigger className="h-9 text-xs bg-black/40 border-border focus:ring-1 focus:ring-border">
               <SelectValue placeholder="Don: Todos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Don: Todos</SelectItem>
             </SelectContent>
           </Select>
           <Select defaultValue="todos">
             <SelectTrigger className="h-9 text-xs bg-black/40 border-border focus:ring-1 focus:ring-border">
               <SelectValue placeholder="Etapa: Todas" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Etapa: Todas</SelectItem>
             </SelectContent>
           </Select>
           <Select defaultValue="nombre">
             <SelectTrigger className="h-9 text-xs bg-black/40 border-border focus:ring-1 focus:ring-border">
               <SelectValue placeholder="Ordenar: Nombre" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="nombre">Ordenar: Nombre</SelectItem>
             </SelectContent>
           </Select>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {charactersList.map((c: any) => {
          const p = c.profileData || {};
          return (
            <div key={c.id} className="flex bg-[#111111] border border-border rounded-xl overflow-hidden relative group h-[170px] shadow-sm hover:border-border/80 transition-colors">
               {/* Image side */}
               <div className="w-[110px] shrink-0 relative bg-[#1a1a1a] border-r border-border/50">
                 {p.avatarUrl ? (
                   <img src={p.avatarUrl} alt={c.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                     <User className="w-10 h-10" />
                   </div>
                 )}
                 {/* Gold Token */}
                 <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center backdrop-blur-sm shadow-sm">
                    <span className="text-[10px] font-bold text-yellow-500 leading-none" style={{ textShadow: '0 0 4px rgba(234,179,8,0.5)' }}>I</span>
                 </div>
               </div>

               {/* Content side */}
               <div className="flex-1 p-4 flex flex-col relative overflow-hidden bg-[#131313]">
                 {/* Dot pattern background */}
                 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                 
                 {/* Corner brackets */}
                 <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-muted-foreground/30 rounded-tr-[1px]" />
                 <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-muted-foreground/30 rounded-br-[1px]" />
                 
                 <div className="relative z-10 flex justify-between items-start mb-1.5 gap-2">
                   <h3 className="font-bold text-[13px] text-foreground truncate">{c.name}</h3>
                   {p.group ? (
                     <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap uppercase">
                       {p.group}
                     </span>
                   ) : (
                     <div className="h-4"></div>
                   )}
                 </div>
                 
                 <div className="relative z-10 text-[10px] text-muted-foreground/80 flex flex-col gap-1 mt-0.5 leading-tight">
                   <p className="truncate">«{p.alias || 'Sin Alias'}» • {p.occupation || 'Desconocido'} ({p.age || '?'}a)</p>
                   <p className="truncate">{p.bloodType || '?'} • {p.alignment || 'Neutral'}</p>
                   <p className="text-primary/70 font-medium truncate mt-0.5">{p.quirkName || 'Sin Don'}</p>
                 </div>

                 {/* Actions bottom */}
                 <div className="relative z-10 mt-auto flex items-center justify-between pt-3">
                   <div className="flex items-center gap-0.5 bg-black/40 border border-border/80 rounded-md p-0.5">
                     <a href={`/sheet/${c.id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:text-foreground text-muted-foreground transition-colors hover:bg-white/5 rounded-sm">
                       <Eye className="w-3.5 h-3.5" />
                     </a>
                   </div>
                   <div className="flex items-center gap-1 text-muted-foreground/60">
                     <button onClick={() => { setSelectedCharacterId(c.id); setEditing(true); }} className="p-1.5 hover:text-foreground hover:bg-white/5 rounded-md transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleDuplicate(c)} className="p-1.5 hover:text-foreground hover:bg-white/5 rounded-md transition-all"><Copy className="w-3.5 h-3.5" /></button>
                     <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                 </div>
               </div>
            </div>
          );
        })}
        
        {charactersList.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-border rounded-xl bg-black/20">
            <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No hay personajes registrados en la base de datos.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Usa el botón "Nuevo Personaje" para comenzar.</p>
          </div>
        )}
            {rewardingCharId && <AdminRewardsDialog characterId={rewardingCharId} onClose={() => { setRewardingCharId(null); mutateAll(); }} />}
      </div>
    </div>
  );
}
