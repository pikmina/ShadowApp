import React, { useMemo, useState } from 'react';
import { Award, Copy, Edit2, Eye, Plus, Search, Trash2, User, Users } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';
import AdminRewardsDialog from '@/components/character/AdminRewardsDialog';
import CharacterEditor from '@/components/character/CharacterEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CyberSpacer } from '@/components/ui/cyber-spacer';
import { EntityPanel } from '@/components/ui/entity-panel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, fetcher } from '@/lib/api';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const readProfile = (profile: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (hasValue(profile[key])) return profile[key];
  }
  return undefined;
};

const isCanonCharacter = (profile: Record<string, any>) => {
  const value = readProfile(profile, ['isCanon', 'is_canon', 'canon', 'character_canon']);
  return value === true || value === 'true' || value === 'Sí' || value === 'Si';
};

export default function CharactersAdmin() {
  const { user, dbUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [rewardingCharId, setRewardingCharId] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'canon'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');

  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';
  const { data: allCharacters, mutate: mutateAll } = useSWR(user && isMod ? '/api/admin/characters' : null, fetcher);
  const charactersList = Array.isArray(allCharacters) ? allCharacters : [];

  const groupOptions = useMemo(() => {
    const values = charactersList
      .map((character: any) => readProfile(character.profileData || {}, ['faction_group', 'group', 'grupo', 'faccion', 'facción']))
      .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [charactersList]);

  const filteredCharacters = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es');
    return charactersList
      .filter((character: any) => {
        const profile = character.profileData || {};
        if (activeTab === 'canon' && !isCanonCharacter(profile)) return false;
        const group = String(readProfile(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']) || '');
        if (selectedGroup !== 'all' && group !== selectedGroup) return false;
        if (!query) return true;
        const searchable = [
          character.id,
          character.name,
          readProfile(profile, ['basic_name', 'name', 'nombre']),
          readProfile(profile, ['alias', 'hero_name', 'nombre_heroe']),
          readProfile(profile, ['quirk_name', 'quirkName', 'don_name', 'don'])
        ].filter(hasValue).join(' ').toLocaleLowerCase('es');
        return searchable.includes(query);
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'recent') {
          return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
        }
        const aName = String(readProfile(a.profileData || {}, ['basic_name', 'name', 'nombre']) || a.name || '');
        const bName = String(readProfile(b.profileData || {}, ['basic_name', 'name', 'nombre']) || b.name || '');
        return aName.localeCompare(bName, 'es');
      });
  }, [activeTab, charactersList, searchTerm, selectedGroup, sortBy]);

  const displayCharacter = selectedCharacterId
    ? charactersList.find((character: any) => character.id === selectedCharacterId)
    : null;

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres borrar este personaje? Esta acción es irreversible.')) return;
    try {
      const response = await apiFetch(`/api/admin/character/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error borrando');
      toast.success('Personaje borrado con éxito');
      mutateAll();
    } catch (error: any) {
      toast.error(error.message || 'Error al borrar el personaje');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const response = await apiFetch(`/api/admin/character/${id}/duplicate`, { method: 'POST' });
      if (!response.ok) throw new Error('Error duplicando');
      toast.success('Personaje duplicado');
      mutateAll();
    } catch (error: any) {
      toast.error(error.message || 'Error al duplicar el personaje');
    }
  };

  if (!isMod) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-center">
        <h2 className="text-xl font-bold text-foreground">Acceso restringido</h2>
        <p className="max-w-md text-muted-foreground">Solo los moderadores pueden acceder a este panel.</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <EntityPanel
          title={displayCharacter ? `Editando: ${displayCharacter.name}` : 'Nuevo personaje'}
          icon={<Edit2 className="size-5" />}
          pattern="diagonal"
          accent="accent1"
          cornerTicks
        >
          <div className="mb-4 flex justify-end">
            <Button variant="outline" onClick={() => setEditing(false)}>Volver a personajes</Button>
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
    <div className="mx-auto max-w-6xl space-y-5">
      <EntityPanel variant="character" pattern="grid" cornerTicks>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-oxanium text-lg font-semibold text-foreground">
                <Users className="size-4 text-primary" /> Personajes
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Base de datos de fichas, estadísticas y recompensas.</p>
            </div>
            <Button size="sm" className="h-9 font-oxanium text-xs uppercase tracking-wider" onClick={() => { setSelectedCharacterId(null); setEditing(true); }}>
              <Plus className="size-3.5" /> Nuevo personaje
            </Button>
          </div>

          <div className="mt-4 flex w-full max-w-sm rounded-md border border-border bg-muted/30 p-1">
            {(['all', 'canon'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded px-3 py-1.5 font-oxanium text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'all' ? 'Todos los personajes' : 'Personajes canon'}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filtrar por nombre, don o ID..." className="h-9 bg-background/70 pl-8 text-xs" />
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Grupo: Todos</SelectItem>
                {groupOptions.map(group => <SelectItem key={group} value={group}>Grupo: {group}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={value => setSortBy(value as 'name' | 'recent')}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Ordenar: Nombre</SelectItem>
                <SelectItem value="recent">Ordenar: Actualización</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </EntityPanel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCharacters.map((character: any) => {
          const profile = character.profileData || {};
          const name = String(readProfile(profile, ['basic_name', 'name', 'nombre']) || character.name || 'Sin nombre');
          const alias = String(readProfile(profile, ['alias', 'hero_name', 'nombre_heroe']) || 'Desconocido');
          const quirk = String(readProfile(profile, ['quirk_name', 'quirkName', 'don_name', 'don']) || 'Sin don');
          const group = readProfile(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']);
          const avatar = readProfile(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']);
          const isOwner = character.userId === dbUser?.id;

          return (
            <EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex min-h-40 flex-row rounded-xl transition-colors hover:border-primary/60">
              <button type="button" className="relative flex w-24 shrink-0 items-center justify-center overflow-hidden border-r border-border bg-muted/30 sm:w-28" onClick={() => window.open(`/sheet/${character.id}`, '_blank', 'noopener,noreferrer')} aria-label={`Abrir ficha pública de ${name}`}>
                {avatar ? (
                  <img src={String(avatar)} alt={name} className="size-full object-cover grayscale opacity-80 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted/20 font-oxanium text-2xl font-bold text-primary/50">{name.charAt(0).toUpperCase() || <User className="size-9" />}</div>
                )}
              </button>

              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-oxanium text-sm font-semibold uppercase text-foreground transition-colors group-hover:text-primary" title={name}>{name}</h2>
                    <span className="shrink-0 font-oxanium text-[9px] tracking-wider text-muted-foreground">ID {character.id}</span>
                  </div>
                  <p className="mt-1 truncate font-oxanium text-[10px] uppercase tracking-widest text-muted-foreground">«{alias}»</p>
                  <p className="mt-1.5 flex items-center gap-1.5 truncate font-oxanium text-[11px] font-medium text-primary" title={quirk}><span className="size-1 shrink-0 rounded-full bg-primary" /> {quirk}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group && <Badge variant="outline" className="h-5 max-w-full truncate px-1.5 font-oxanium text-[9px] uppercase">{String(group)}</Badge>}
                    {isOwner && <Badge className="h-5 bg-primary/15 px-1.5 font-oxanium text-[9px] uppercase text-primary">Asignado a ti</Badge>}
                  </div>
                </div>

                <div>
                  <CyberSpacer variant="line" accent="accent1" className="my-1.5" />
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="size-8" onClick={() => window.open(`/sheet/${character.id}`, '_blank', 'noopener,noreferrer')} title="Ver ficha pública" aria-label="Ver ficha pública"><Eye className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8 border-primary/30 text-primary" onClick={() => { setSelectedCharacterId(character.id); setEditing(true); }} title="Editar ficha" aria-label="Editar ficha"><Edit2 className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setRewardingCharId(character.id)} title="Administrar recompensas" aria-label="Administrar recompensas"><Award className="size-3.5" /></Button>
                    {dbUser?.role === 'superadmin' && (
                      <>
                        <span className="mx-0.5 h-4 w-px bg-border" />
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDuplicate(character.id)} title="Duplicar personaje" aria-label="Duplicar personaje"><Copy className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="ml-auto size-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(character.id)} title="Borrar personaje" aria-label="Borrar personaje"><Trash2 className="size-3.5" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </EntityPanel>
          );
        })}
      </div>

      {filteredCharacters.length === 0 && (
        <EntityPanel pattern="dots" cornerTicks className="p-8 text-center">
          <Users className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="font-oxanium text-sm font-semibold text-foreground">No hay personajes que coincidan</p>
          <p className="mt-1 text-xs text-muted-foreground">Prueba con otro nombre, grupo o pestaña.</p>
        </EntityPanel>
      )}

      {rewardingCharId && <AdminRewardsDialog characterId={rewardingCharId} onClose={() => { setRewardingCharId(null); mutateAll(); }} />}
    </div>
  );
}
