import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  Clock,
  UserX,
  UserCheck,
  Shield,
  ExternalLink,
  Lock,
  MessageSquare,
  Sparkles,
  Dices,
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetcher } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EntityPanel } from '@/components/ui/entity-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import {
  generatePlayerName,
  generatePlayerNameList,
  NameGeneratorCategory
} from '@/lib/playerNameGenerator';

export default function PlayersAdmin() {
  const { user, dbUser } = useAuth();
  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';
  const { data: playersList, error, mutate } = useSWR<any[]>(user && isMod ? '/api/admin/players' : null, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'absent'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    identity: '',
    discord: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Generator state in dialog
  const [generatorCategory, setGeneratorCategory] = useState<NameGeneratorCategory>('all');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>(() => generatePlayerNameList(4, 'all'));

  const filteredPlayers = useMemo(() => {
    if (!playersList) return [];
    const query = searchTerm.trim().toLowerCase();
    return playersList.filter(player => {
      if (statusFilter !== 'all' && player.status !== statusFilter) return false;
      if (!query) return true;
      const matchName = player.name?.toLowerCase().includes(query);
      const matchIdentity = player.identity?.toLowerCase().includes(query);
      const matchDiscord = player.discord?.toLowerCase().includes(query);
      const matchChar = player.characters?.some((c: any) => c.name.toLowerCase().includes(query));
      const matchUser = player.user?.email?.toLowerCase().includes(query);
      return matchName || matchIdentity || matchDiscord || matchChar || matchUser;
    });
  }, [playersList, searchTerm, statusFilter]);

  const handleOpenDialog = (player?: any) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        name: player.name || '',
        identity: player.identity || '',
        discord: player.discord || '',
        notes: player.notes || '',
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        name: '',
        identity: '',
        discord: '',
        notes: '',
      });
    }
    setNameSuggestions(generatePlayerNameList(4, generatorCategory));
    setIsDialogOpen(true);
  };

  const handleQuickGenerate = (cat: NameGeneratorCategory = generatorCategory) => {
    const newName = generatePlayerName(cat);
    setFormData(prev => ({ ...prev, name: newName }));
    setNameSuggestions(generatePlayerNameList(4, cat));
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre o pseudónimo del jugador es obligatorio');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        identity: formData.identity.trim() || null,
        discord: formData.discord.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (editingPlayer) {
        const res = await apiFetch(`/api/admin/players/${editingPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Error al actualizar jugador');
        toast.success('Jugador actualizado con éxito');
      } else {
        const res = await apiFetch('/api/admin/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Error al crear jugador');
        toast.success('Jugador creado con éxito');
      }
      setIsDialogOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando jugador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (playerId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'absent' ? 'active' : 'absent';
    try {
      const res = await apiFetch(`/api/admin/players/${playerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Error al cambiar estado');
      toast.success(nextStatus === 'absent' ? 'Jugador marcado como Ausente' : 'Jugador marcado como Presente');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado del jugador');
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    try {
      const res = await apiFetch(`/api/admin/players/${playerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Jugador eliminado');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar jugador');
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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <SectionHeader
        icon={Users}
        title="Directorio de Jugadores"
        description="Gestión de jugadores, identidades privadas, presencia y personajes asignados."
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Nuevo Jugador
          </Button>
        }
      />

      <EntityPanel variant="default">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, identidad, discord o personaje..."
                className="h-9 bg-background/70 pl-8 text-xs"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto">
              {(['all', 'active', 'absent'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 font-oxanium text-xs font-bold uppercase tracking-wider rounded transition-colors ${statusFilter === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}
                >
                  {tab === 'all' ? 'Todos' : tab === 'active' ? 'Presentes' : 'Ausentes'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </EntityPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map(player => {
          const isAbsent = player.status === 'absent';
          const activeChars = player.characters?.filter((c: any) => c.active !== false) || [];
          const archivedChars = player.characters?.filter((c: any) => c.active === false) || [];

          return (
            <EntityPanel
              key={player.id}
              variant="character"
              pattern="dots"
              className="flex flex-col justify-between p-4 bg-black/40 border border-border/50 hover:border-primary/50 transition-colors rounded-xl"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-oxanium text-base font-bold text-foreground flex items-center gap-2 truncate">
                      {player.name}
                    </h3>
                    {player.user?.email && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        Cuenta: {player.user.email}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isAbsent ? 'destructive' : 'outline'}
                    className={`h-7 px-2.5 text-[10px] font-oxanium uppercase font-bold tracking-wider rounded shrink-0 ${isAbsent ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30' : 'bg-green-600/10 text-green-400 border-green-500/30 hover:bg-green-600/20'}`}
                    onClick={() => handleToggleStatus(player.id, player.status)}
                    title={isAbsent ? 'Marcar como Presente' : 'Marcar como Ausente'}
                  >
                    {isAbsent ? (
                      <>
                        <UserX className="size-3 mr-1" /> Ausente
                      </>
                    ) : (
                      <>
                        <UserCheck className="size-3 mr-1" /> Presente
                      </>
                    )}
                  </Button>
                </div>

                {/* Private identity & Discord metadata (Only visible in Admin/Mod view) */}
                {(player.identity || player.discord) && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1 text-xs">
                    <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-amber-400/90 font-mono">
                      <Lock className="size-2.5" />
                      <span>Datos Privados</span>
                    </div>
                    {player.identity && (
                      <div className="flex items-center gap-1.5 text-text1/90 font-mono">
                        <span className="text-[10px] text-muted-foreground">Identidad:</span>
                        <span className="font-semibold text-amber-300/90">{player.identity}</span>
                      </div>
                    )}
                    {player.discord && (
                      <div className="flex items-center gap-1.5 text-text1/90 font-mono">
                        <MessageSquare className="size-3 text-indigo-400 shrink-0" />
                        <span className="text-[10px] text-muted-foreground">Discord:</span>
                        <span className="font-semibold text-indigo-300">{player.discord}</span>
                      </div>
                    )}
                  </div>
                )}

                {player.notes && (
                  <div className="mt-2 text-xs text-slate-300 bg-muted/20 p-2 rounded border border-border/40 italic flex items-start gap-1.5">
                    <Lock className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{player.notes}</span>
                  </div>
                )}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-oxanium uppercase tracking-wider mb-1.5">
                    <span>Personajes Asignados ({activeChars.length})</span>
                    {archivedChars.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">({archivedChars.length} archivados)</span>
                    )}
                  </div>

                  {player.characters && player.characters.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {player.characters.map((char: any) => {
                        const isArchived = char.active === false;
                        return (
                          <div
                            key={char.id}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-oxanium border ${isArchived ? 'bg-muted/10 text-muted-foreground border-border/30 line-through' : 'bg-primary/10 text-foreground border-primary/20'}`}
                          >
                            <span>{char.name}</span>
                            {char.canonCharacterId && (
                              <Badge variant="outline" className="h-4 px-1 text-[8px] uppercase tracking-wider border-blue-500/30 text-blue-400">
                                Canon
                              </Badge>
                            )}
                            <Link
                              to={`/sheet/${char.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary ml-1"
                              title="Ver ficha"
                            >
                              <ExternalLink className="size-2.5" />
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic py-1">
                      Sin personajes asignados aún.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenDialog(player)}
                  title="Editar jugador"
                >
                  <Edit2 className="size-3.5" />
                </Button>

                {dbUser?.role === 'superadmin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`size-7 ${confirmDeleteId === player.id ? 'text-red-500 bg-red-500/10' : 'text-destructive hover:bg-destructive/10'}`}
                    onClick={() => {
                      if (confirmDeleteId === player.id) {
                        handleDeletePlayer(player.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(player.id);
                        setTimeout(() => setConfirmDeleteId(null), 3000);
                      }
                    }}
                    title={confirmDeleteId === player.id ? '¿Confirmar eliminación?' : 'Eliminar jugador'}
                  >
                    {confirmDeleteId === player.id ? <Check className="size-3.5" /> : <Trash2 className="size-3.5" />}
                  </Button>
                )}
              </div>
            </EntityPanel>
          );
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <EntityPanel pattern="dots" cornerTicks className="p-8 text-center">
          <Users className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="font-oxanium text-sm font-semibold text-foreground">No se encontraron jugadores</p>
          <p className="mt-1 text-xs text-muted-foreground">Crea un jugador o cambia el filtro de búsqueda.</p>
        </EntityPanel>
      )}

      {/* Dialog to create/edit player with themed generator and private fields */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-oxanium text-lg uppercase tracking-wider flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span>{editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePlayer} className="space-y-4 py-2">
            {/* Name / Public Pseudonym Field with Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="player-name" className="text-xs uppercase font-oxanium tracking-wider">
                  Nombre Público / Pseudónimo *
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-oxanium gap-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                    onClick={() => handleQuickGenerate()}
                    title="Generar nombre aleatorio de cómics, heroísmo y animalitos lindos"
                  >
                    <Dices className="size-3" />
                    <span>Generar</span>
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  id="player-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Ajolote Sónico, Bat-Nutria, Capibara Supremo..."
                  required
                  autoFocus
                  className="font-oxanium text-sm"
                />
              </div>

              {/* Generator Category Filter & Suggestions Chips */}
              <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-2.5 text-accent2" />
                    Temática de Generador:
                  </span>
                  <div className="flex gap-1">
                    {[
                      { key: 'all', label: 'Híbrido' },
                      { key: 'comic', label: 'Cómic' },
                      { key: 'heroic', label: 'Heroico' },
                      { key: 'cute_animals', label: 'Animalitos' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          const k = cat.key as NameGeneratorCategory;
                          setGeneratorCategory(k);
                          handleQuickGenerate(k);
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                          generatorCategory === cat.key
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-background/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {nameSuggestions.map((suggested, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, name: suggested }))}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 bg-background/80 hover:border-primary hover:text-primary transition-colors text-text2 font-oxanium"
                    >
                      {suggested}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNameSuggestions(generatePlayerNameList(4, generatorCategory))}
                    className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Más sugerencias"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Private Section (NOT PUBLIC) */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-oxanium font-bold uppercase tracking-wider">
                <Lock className="size-3.5" />
                <span>Datos Privados del Jugador (No Públicos)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Información confidencial para másters y moderadores. <strong className="text-amber-300/80">Nunca se muestra en vistas ni registros públicos.</strong>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="player-identity" className="text-[11px] uppercase font-oxanium tracking-wider flex items-center gap-1 text-muted-foreground">
                    <Shield className="size-3 text-amber-400" /> Identidad / Nombre Real
                  </Label>
                  <Input
                    id="player-identity"
                    value={formData.identity}
                    onChange={e => setFormData({ ...formData, identity: e.target.value })}
                    placeholder="Ej. Juan Pérez (Opcional)"
                    className="bg-background/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="player-discord" className="text-[11px] uppercase font-oxanium tracking-wider flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="size-3 text-indigo-400" /> Discord
                  </Label>
                  <Input
                    id="player-discord"
                    value={formData.discord}
                    onChange={e => setFormData({ ...formData, discord: e.target.value })}
                    placeholder="Ej. @usuario / tag (Opcional)"
                    className="bg-background/80 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label htmlFor="player-notes" className="text-[11px] uppercase font-oxanium tracking-wider flex items-center gap-1 text-muted-foreground">
                  <FileText className="size-3 text-slate-400" /> Notas del Máster
                </Label>
                <Textarea
                  id="player-notes"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas privadas sobre el jugador o disponibilidad..."
                  rows={2}
                  className="bg-background/80 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingPlayer ? 'Guardar Cambios' : 'Crear Jugador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
