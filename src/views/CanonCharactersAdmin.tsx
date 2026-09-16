import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Check, X, Shield, Lock, Unlock, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EntityPanel } from '@/components/ui/entity-panel';
import { useNavigate } from 'react-router-dom';
import { CharacterEmployments, CharacterEnrollments } from '@/components/character/CharacterRelations';

export default function CanonCharactersAdmin() {
  const { data: canonCharacters, mutate } = useSWR('/api/admin/canon-characters', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', aliases: '', summary: '', imageUrl: '', affiliation: '', active: true, reserved: false });
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      await apiFetch('/api/admin/canon-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, active: formData.active }),
      });
      toast.success('Personaje canon creado');
      setIsCreating(false);
      setFormData({ name: '', aliases: '', summary: '', imageUrl: '', affiliation: '', active: true, reserved: false });
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear');
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await apiFetch(`/api/admin/canon-characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      toast.success('Personaje actualizado');
      setEditingId(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este personaje del catálogo canon?')) return;
    try {
      await apiFetch(`/api/admin/canon-characters/${id}`, { method: 'DELETE' });
      toast.success('Personaje eliminado');
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const filtered = (canonCharacters || []).filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <EntityPanel variant="character">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-oxanium text-lg font-semibold text-foreground">
                <Shield className="size-4 text-primary" /> Catálogo de Personajes Canon
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Gestiona el catálogo de personajes oficiales (Reservados, Ocupados y Disponibles).</p>
            </div>
            <Button size="sm" onClick={() => setIsCreating(true)} className="h-9">
              <Plus className="size-3.5 mr-1" /> Nuevo Personaje Canon
            </Button>
          </div>

          <div className="mt-4">
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar canon..."
              className="max-w-sm"
            />
          </div>

          {isCreating && (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del personaje"
              />
              <Button onClick={handleCreate}>Guardar</Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {filtered.map((c: any) => (
              <div key={c.id} className={`rounded-xl border border-border/50 bg-[#0a0a0a] overflow-hidden ${editingId === c.id ? 'p-4' : 'flex flex-col md:flex-row relative'}`} style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                {editingId === c.id ? (
                  <div className="space-y-5 relative z-10 bg-[#0a0a0a]/80 p-2 rounded-lg">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre" />
                      <Input value={formData.aliases} onChange={(e) => setFormData({ ...formData, aliases: e.target.value })} placeholder="Alias, separados por comas" />
                      <Input value={formData.affiliation} onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })} placeholder="Afiliación" />
                      <Input value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} placeholder="URL de imagen" />
                      <Textarea className="sm:col-span-2" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Resumen público" />
                    </div>
                    <div className="grid gap-6 border-t border-border pt-4 lg:grid-cols-2">
                      <CharacterEmployments canonCharacterId={c.id} />
                      <CharacterEnrollments canonCharacterId={c.id} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleUpdate(c.id, { name: formData.name, aliases: formData.aliases.split(',').map(value => value.trim()).filter(Boolean), summary: formData.summary || null, imageUrl: formData.imageUrl || null, affiliation: formData.affiliation || null })}>Guardar</Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full md:w-48 shrink-0 bg-black/40 relative min-h-[200px] md:min-h-0 border-r border-border/20">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover absolute inset-0" />
                      ) : (
                        <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                          <Shield className="size-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-oxanium text-2xl font-bold text-white tracking-wide">{c.name}</h3>
                          <Badge variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'} className={`uppercase text-[10px] font-bold tracking-wider px-3 py-1 ${c.status === 'available' ? 'bg-slate-500/40 text-slate-100 hover:bg-slate-500/50 border-transparent' : ''}`}>
                            {c.status === 'available' ? 'DISPONIBLE' : c.status === 'occupied' ? 'OCUPADO' : 'RESERVADO'}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 text-cyan-500/80 text-sm font-medium">{c.affiliation || 'Sin afiliación'}</div>
                        <div className="text-muted-foreground text-xs mt-1">También conocido como {c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : 'NA'}</div>
                        
                        {c.summary && <p className="text-sm text-slate-300 mt-5 leading-relaxed max-w-3xl">{c.summary}</p>}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/30 justify-end opacity-60 hover:opacity-100 transition-opacity">
                        {c.status === 'available' && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/character-editor?canonId=${c.id}`)}>Crear ficha</Button>
                        )}
                        {c.status === 'occupied' && c.linkedCharacterId && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/sheet/${c.linkedCharacterId}`)}>Ver ficha</Button>
                        )}
                        {c.status === 'available' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdate(c.id, { reserved: true })}><Lock className="mr-1 size-3" /> Reservar</Button>
                        )}
                        {c.status === 'reserved' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdate(c.id, { reserved: false })}><Unlock className="mr-1 size-3" /> Liberar</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setFormData({ name: c.name, aliases: (c.aliases || []).join(', '), summary: c.summary || '', imageUrl: c.imageUrl || '', affiliation: c.affiliation || '', active: c.active, reserved: c.reserved }); setEditingId(c.id); }}><Edit2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </EntityPanel>
    </div>
  );
}
