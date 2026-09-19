import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Award, Check, Copy, Edit2, Eye, Plus, Search, Trash2, User, Users } from 'lucide-react';
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
import { validateCharacter } from '@/lib/characterValidation';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const readProfile = (profile: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (hasValue(profile[key])) return profile[key];
  }
  return undefined;
};

const isCanonCharacter = (character: Record<string, any>) => {
  return character.canonCharacterId !== null && character.canonCharacterId !== undefined;
};

const getGroupColorClass = (group: string) => {
  const g = group.toLowerCase().trim();
  if (g === 'héroes' || g === 'heroes' || g === 'héroe' || g === 'hero' || g.includes('hero')) return 'border-blue-800 text-blue-400 bg-blue-950/30';
  if (g === 'villanos' || g === 'villains' || g === 'villano') return 'border-red-800 text-red-400 bg-red-950/30';
  if (g === 'estudiantes' || g === 'students' || g === 'estudiante' || g.includes('u.a') || g.includes('shiketsu')) return 'border-green-800 text-green-400 bg-green-950/30';
  if (g === 'vigilantes' || g === 'vigilante') return 'border-purple-800 text-purple-400 bg-purple-950/30';
  if (g === 'civiles' || g === 'civilian' || g === 'civil') return 'border-neutral-700 text-neutral-400 bg-neutral-900/30';
  
  const colors = [
    'border-cyan-800 text-cyan-400 bg-cyan-950/30',
    'border-orange-800 text-orange-400 bg-orange-950/30',
    'border-pink-800 text-pink-400 bg-pink-950/30',
    'border-yellow-800 text-yellow-400 bg-yellow-950/30',
    'border-indigo-800 text-indigo-400 bg-indigo-950/30'
  ];
  let hash = 0;
  for (let i = 0; i < g.length; i++) {
    hash = g.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CharactersAdmin() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCanonId = searchParams.get('canonId');
  const initialCreate = searchParams.get('create') === 'true';
  const initialGroup = searchParams.get('group') || 'all';
  const initialStage = searchParams.get('stage') || 'all';

  const [editing, setEditing] = useState(!!initialCanonId || initialCreate);
  const [initialNewCanonId, setInitialNewCanonId] = useState<string | null>(initialCanonId);
  const [rewardingCharId, setRewardingCharId] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'canon'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [selectedDon, setSelectedDon] = useState('all');
  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');

  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam) setSelectedGroup(groupParam);
    const stageParam = searchParams.get('stage');
    if (stageParam) setSelectedStage(stageParam);
    if (searchParams.get('create') === 'true') {
      setSelectedCharacterId(null);
      setEditing(true);
    }
  }, [location.search]);

  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';
  const { data: allCharacters, mutate: mutateAll } = useSWR(user && isMod ? '/api/admin/characters' : null, fetcher);
  const { data: rules } = useSWR(user && isMod ? '/api/rules' : null, fetcher);
  const charactersList = Array.isArray(allCharacters) ? allCharacters : [];
  const stagesList = Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [];

  const groupOptions = useMemo(() => {
    const values = charactersList
      .map((character: any) => readProfile(character.profileData || {}, ['faction_group', 'group', 'grupo', 'faccion', 'facción']))
      .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [charactersList]);

  const donOptions = useMemo(() => {
    const values = charactersList
      .map((character: any) => readProfile(character.profileData || {}, ['quirk_name', 'quirkName', 'don_name', 'don']))
      .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [charactersList]);

  const stageOptions = useMemo(() => {
    const values = charactersList
      .map((character: any) => readProfile(character.profileData || {}, ['basic_stage', 'stage', 'etapa']))
      .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [charactersList]);

  const filteredCharacters = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es');
    return charactersList
      .filter((character: any) => {
        const profile = character.profileData || {};
        if (activeTab === 'canon' && !isCanonCharacter(character)) return false;
        
        const group = String(readProfile(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']) || '');
        if (selectedGroup !== 'all' && group !== selectedGroup) return false;

        const don = String(readProfile(profile, ['quirk_name', 'quirkName', 'don_name', 'don']) || '');
        if (selectedDon !== 'all' && don !== selectedDon) return false;

        const stage = String(readProfile(profile, ['basic_stage', 'stage', 'etapa']) || '');
        if (selectedStage !== 'all' && stage !== selectedStage) return false;
        
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
  }, [activeTab, charactersList, searchTerm, selectedGroup, selectedDon, selectedStage, sortBy]);

  const displayCharacter = selectedCharacterId
    ? charactersList.find((character: any) => character.id === selectedCharacterId)
    : null;

  const handleDelete = async (id: number) => {
    try {
      const response = await apiFetch(`/api/admin/characters/${id}`, { method: 'DELETE' });
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
        <CharacterEditor 
          character={displayCharacter}
          initialCanonId={initialNewCanonId}
          onSaved={() => { setEditing(false); setInitialNewCanonId(null); if(initialCanonId) navigate('/character-editor', { replace: true }); mutateAll(); }}
          onCancel={() => { setEditing(false); setInitialNewCanonId(null); if(initialCanonId) navigate('/character-editor', { replace: true }); }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <EntityPanel variant="character">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-oxanium text-lg font-semibold text-foreground">
                <Users className="size-4 text-primary" /> Personajes
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Base de datos automatizada Shadowmore OS 4.1.2 — Sincronización instantánea de estadísticas y técnicas.</p>
            </div>
            <Button size="sm" className="h-9" onClick={() => { setSelectedCharacterId(null); setEditing(true); }}>
              <Plus className="size-3.5 mr-1" /> Nuevo Personaje
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

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Filtrar por nombre, don o ID..." className="h-9 bg-background/70 pl-8 text-xs" />
            </div>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedGroup === 'all' || selectedGroup === '' ? 'Grupo: Todos' : `Grupo: ${selectedGroup}`}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Grupo: Todos</SelectItem>
                {groupOptions.map(group => <SelectItem key={group} value={group}>Grupo: {group}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedDon} onValueChange={setSelectedDon}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedDon === 'all' || selectedDon === '' ? 'Don: Todos' : `Don: ${selectedDon}`}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Don: Todos</SelectItem>
                {donOptions.map(don => <SelectItem key={don} value={don}>Don: {don}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedStage === 'all' || selectedStage === '' ? 'Etapa: Todas' : `Etapa: ${selectedStage}`}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Etapa: Todas</SelectItem>
                {stageOptions.map(stage => <SelectItem key={stage} value={stage}>Etapa: {stage}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={value => setSortBy(value as 'name' | 'recent')}>
              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{sortBy === 'name' ? 'Ordenar: Nombre' : 'Ordenar: Actualización'}</SelectValue></SelectTrigger>
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
          const firstName = String(readProfile(profile, ['basic_name', 'name', 'nombre']) || character.name || 'Sin nombre');
          const lastName = String(readProfile(profile, ['last_name', 'apellido']) || '');
          const name = `${firstName} ${lastName}`.trim();
          
          const alias = String(readProfile(profile, ['alias', 'hero_name', 'nombre_heroe']) || 'Desconocido');
          const quirk = String(readProfile(profile, ['quirk_name_name', 'quirk_name', 'quirkName', 'don_name', 'don']) || 'Sin don');
          const group = readProfile(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']);
          const avatar = readProfile(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']);
          const isOwner = character.userId === dbUser?.id;

          const stage = String(readProfile(profile, ['basic_stage', 'stage', 'etapa']) || 'Desconocida');
          const age = String(readProfile(profile, ['basic_age', 'age', 'edad']) || '?');
          const alignment = String(readProfile(profile, ['basic_alignment', 'alignment', 'alineamiento']) || 'Heroico');
          const bloodType = String(readProfile(profile, ['basic_blood_type', 'blood_type', 'sangre', 'sanguineo', 'grupo_sanguineo']) || 'O+');

          const validation = validateCharacter(profile, stagesList);
          
          let statusIcon = <CheckCircle className="size-3.5 text-green-500" />;
          let statusColor = 'border-green-500/30';
          if (validation.status === 'red') {
            statusIcon = <AlertTriangle className="size-3.5 text-red-500" />;
            statusColor = 'border-red-500/30';
          } else if (validation.status === 'orange') {
            statusIcon = <AlertCircle className="size-3.5 text-yellow-500" />;
            statusColor = 'border-yellow-500/30';
          }

          return (
            <EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex flex-col h-full rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 !p-0 !gap-0 overflow-hidden">
              <div className="flex-1 flex flex-row items-stretch min-h-40 w-full">
              <Link to={`/sheet/${character.id}`} className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-border/50 bg-black/20 self-stretch" aria-label={`Abrir ficha pública de ${name}`}>
                {avatar ? (
                  <img src={String(avatar)} alt={name} className="absolute inset-0 size-full object-cover grayscale opacity-90 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                ) : (
                  <div className="absolute inset-0 flex size-full items-center justify-center bg-muted/20 font-oxanium text-2xl font-bold text-primary/50">{name.charAt(0).toUpperCase() || <User className="size-9" />}</div>
                )}
                <div 
                  className={`absolute top-2 left-2 rounded-full bg-black/40 p-0.5 border ${statusColor}`}
                  title={validation.messages.join('\n') || 'Todo en orden'}
                >
                  {statusIcon}
                </div>
              </Link>
              
              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-3.5">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-oxanium text-sm font-semibold text-foreground transition-colors group-hover:text-primary" title={name}>{name}</h2>
                    {group && <Badge variant="outline" className={`shrink-0 h-5 px-1.5 font-oxanium text-[9px] uppercase rounded tracking-wider ${getGroupColorClass(String(group))}`}>{String(group)}</Badge>}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">AKA: {alias} • {stage} ({age}a)</p>
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">{bloodType} • {alignment}</p>
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">{quirk}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Experiencia actual">
                      {character.exp ?? 0} EXP
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Yenes disponibles">
                      ¥ {character.yen ?? 0}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="my-2 border-t border-dashed border-border/50" />
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/sheet/${character.id}`)} title="Ver ficha pública" aria-label="Ver ficha pública"><Eye className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => { setSelectedCharacterId(character.id); setEditing(true); }} title="Editar ficha" aria-label="Editar ficha"><Edit2 className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => setRewardingCharId(character.id)} title="Administrar recompensas" aria-label="Administrar recompensas"><Award className="size-3.5" /></Button>
                    {dbUser?.role === 'superadmin' && (
                      <>
                        <span className="mx-0.5 h-4 w-px bg-border/50" />
                        <Button variant="ghost" size="icon" className="size-8 rounded text-muted-foreground hover:text-foreground" onClick={() => handleDuplicate(character.id)} title="Duplicar personaje" aria-label="Duplicar personaje"><Copy className="size-3.5" /></Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`ml-auto size-8 rounded ${confirmDeleteId === character.id ? 'text-red-500 bg-red-500/10' : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}`} 
                          onClick={() => {
                            if (confirmDeleteId === character.id) {
                              handleDelete(character.id);
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(character.id);
                              setTimeout(() => setConfirmDeleteId(null), 3000);
                            }
                          }} 
                          title={confirmDeleteId === character.id ? "¿Confirmar borrado?" : "Borrar personaje"} 
                          aria-label="Borrar personaje"
                        >
                          {confirmDeleteId === character.id ? <Check className="size-3.5" /> : <Trash2 className="size-3.5 text-destructive" />}
                        </Button>
                      </>
                    )}
                  </div>
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

      {rewardingCharId && (
        <AdminRewardsDialog 
          characterId={rewardingCharId} 
          character={charactersList.find((c: any) => c.id === rewardingCharId)}
          onClose={() => { setRewardingCharId(null); mutateAll(); }} 
        />
      )}
    </div>
  );
}
