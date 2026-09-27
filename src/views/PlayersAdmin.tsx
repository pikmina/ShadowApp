import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Users, Plus, Search, Edit2, Trash2, Check, Clock, UserX, UserCheck, Shield, ExternalLink } from 'lucide-react';
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

export default function PlayersAdmin() {
  const { user, dbUser } = useAuth();
  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';
  const { data: playersList, error, mutate } = useSWR<any[]>(user && isMod ? '/api/admin/players' : null, fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'absent'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filteredPlayers = useMemo(() => {
    if (!playersList) return [];
    const query = searchTerm.trim().toLowerCase();
    return playersList.filter(player => {
      if (statusFilter !== 'all' && player.status !== statusFilter) return false;
      if (!query) return true;
      const matchName = player.name.toLowerCase().includes(query);
      const matchChar = player.characters?.some((c: any) => c.name.toLowerCase().includes(query));
      const matchUser = player.user?.email?.toLowerCase().includes(query);
      return matchName || matchChar || matchUser;
    });
  }, [playersList, searchTerm, statusFilter]);

  const handleOpenDialog = (player?: any) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({ name: player.name, notes: player.notes || '' });
    } else {
      setEditingPlayer(null);
      setFormData({ name: '', notes: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del jugador es obligatorio');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingPlayer) {
        const res = await apiFetch(`/api/admin/players/${editingPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name.trim(), notes: formData.notes.trim() || null }),
        });
        if (!res.ok) throw new Error('Error al actualizar jugador');
        toast.success('Jugador actualizado');
      } else {
        const res = await apiFetch('/api/admin/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name.trim(), notes: formData.notes.trim() || null }),
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
      toast.success(nextStatus === 'absent' ? 'Jugador marcado como Ausente' : 'Jugador marcado como Activo');
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
        description="Gestión de jugadores (con o sin cuenta), control de presencia (activo/ausente) y personajes asignados."
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
                placeholder="Buscar jugador o personaje..."
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
                  <div>
                    <h3 className="font-oxanium text-base font-bold text-foreground flex items-center gap-2">
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
                    className={`h-7 px-2.5 text-[10px] font-oxanium uppercase font-bold tracking-wider rounded ${isAbsent ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30' : 'bg-green-600/10 text-green-400 border-green-500/30 hover:bg-green-600/20'}`}
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

                {player.notes && (
                  <p className="mt-2 text-xs text-slate-400 bg-muted/20 p-2 rounded border border-border/40 italic">
                    {player.notes}
                  </p>
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
                  title="Editar nombre y notas"
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

      {/* Dialog to create/edit player */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-oxanium text-lg uppercase tracking-wider">
              {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePlayer} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="player-name" className="text-xs uppercase font-oxanium tracking-wider">
                Nombre del Jugador / Apodo
              </Label>
              <Input
                id="player-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Gato"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Nombre del jugador en la comunidad para asignar personajes y controlar presencia.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-notes" className="text-xs uppercase font-oxanium tracking-wider">
                Notas (Opcional)
              </Label>
              <Textarea
                id="player-notes"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas del máster..."
                rows={3}
              />
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
