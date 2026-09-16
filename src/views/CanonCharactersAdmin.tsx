import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Check, X, Shield, Lock, Unlock, Eye, Edit2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EntityPanel } from '@/components/ui/entity-panel';
import { useNavigate } from 'react-router-dom';
import { CharacterEmployments, CharacterEnrollments } from '@/components/character/CharacterRelations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const emptyForm = { summary: '', profileData: {} as Record<string, string>, active: true, reserved: false };

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';
const readProfile = (profile: Record<string, any> | undefined | null, keys: string[]) => {
  if (!profile) return undefined;
  for (const key of keys) {
    if (hasValue(profile[key])) return profile[key];
  }
  return undefined;
};

export default function CanonCharactersAdmin() {
  const { data: canonCharacters, mutate } = useSWR('/api/admin/canon-characters', fetcher);
  const { data: fields } = useSWR('/api/sheet-fields', fetcher);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const navigate = useNavigate();

  const getMappedProfile = (c: any) => {
    const profile = { ...(c.profileData || {}) };
    const nameField = fields?.find((f: any) => f.coreKey === 'basic_name');
    if (nameField && !profile[nameField.id]) profile[nameField.id] = c.firstName ?? c.name;
    
    const lastNameField = fields?.find((f: any) => f.coreKey === 'last_name');
    if (lastNameField && !profile[lastNameField.id]) profile[lastNameField.id] = c.lastName ?? '';
    
    const aliasField = fields?.find((f: any) => f.coreKey === 'alias');
    if (aliasField && !profile[aliasField.id]) profile[aliasField.id] = (c.aliases || []).join(', ');
    
    const avatarField = fields?.find((f: any) => f.coreKey === 'avatar_url');
    if (avatarField && !profile[avatarField.id]) profile[avatarField.id] = c.imageUrl ?? '';
    
    const affiliationField = fields?.find((f: any) => f.name.toLowerCase().includes('afili'));
    if (affiliationField && !profile[affiliationField.id]) profile[affiliationField.id] = c.affiliation ?? '';

    return profile;
  };

  const prepareSubmitData = () => {
    const nameField = fields?.find((f: any) => f.coreKey === 'basic_name');
    const canonName = formData.profileData[nameField?.id || '']?.trim() || 'Sin Nombre';

    const lastNameField = fields?.find((f: any) => f.coreKey === 'last_name');
    const lastName = formData.profileData[lastNameField?.id || ''] || null;

    const aliasField = fields?.find((f: any) => f.coreKey === 'alias');
    const aliasesStr = formData.profileData[aliasField?.id || ''] || '';
    const aliases = aliasesStr.split(',').map((v: string) => v.trim()).filter(Boolean);

    const avatarField = fields?.find((f: any) => f.coreKey === 'avatar_url');
    const imageUrl = formData.profileData[avatarField?.id || ''] || null;

    const affiliationField = fields?.find((f: any) => f.name.toLowerCase().includes('afili'));
    const affiliation = formData.profileData[affiliationField?.id || ''] || null;

    return {
      name: canonName,
      firstName: canonName,
      lastName,
      aliases,
      summary: formData.summary || null,
      imageUrl,
      affiliation,
      profileData: formData.profileData,
      active: formData.active
    };
  };

  const handleCreate = async () => {
    try {
      await apiFetch('/api/admin/canon-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareSubmitData()),
      });
      toast.success('Personaje canon creado');
      setIsCreating(false);
      setFormData(emptyForm);
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await apiFetch(`/api/admin/canon-characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareSubmitData()),
      });
      toast.success('Personaje actualizado');
      setEditingId(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar');
    }
  };

  const confirmDeletion = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiFetch(`/api/admin/canon-characters/${deleteConfirmId}`, { method: 'DELETE' });
      toast.success('Personaje eliminado');
      mutate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    } finally {
      setDeleteConfirmId(null);
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
            <div className="mt-4 space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <CanonProfileFields fields={fields || []} value={formData.profileData} onChange={profileData => setFormData({ ...formData, profileData })} disabled={false} />
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground block">Descripción breve</label>
                  <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Resumen público" />
                </div>
              </div>
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
                      <CanonProfileFields fields={fields || []} value={formData.profileData} onChange={profileData => setFormData({ ...formData, profileData })} disabled={c.status === 'occupied'} />
                      <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground block">Descripción breve</label>
                  <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Resumen público" />
                </div>
                    </div>
                    <div className="grid gap-6 border-t border-border pt-4 lg:grid-cols-2">
                      <CharacterEmployments canonCharacterId={c.id} />
                      <CharacterEnrollments canonCharacterId={c.id} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleUpdate(c.id)}>Guardar</Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full md:w-48 shrink-0 bg-black/40 relative min-h-[200px] md:min-h-0 border-r border-border/20">
                      {readProfile(c.profileData, ['avatar_url', 'avatarUrl', 'image', 'avatar']) || c.imageUrl ? (
                        <img src={readProfile(c.profileData, ['avatar_url', 'avatarUrl', 'image', 'avatar']) || c.imageUrl} alt={c.name} className="w-full h-full object-cover absolute inset-0" />
                      ) : (
                        <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                          <Shield className="size-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between relative z-10">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-oxanium text-2xl font-bold text-white tracking-wide">
                            {`${readProfile(c.profileData, ['basic_name', 'name', 'nombre']) || c.firstName || c.name} ${readProfile(c.profileData, ['last_name', 'apellido']) || c.lastName || ''}`.trim()}
                          </h3>
                          <Badge variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'} className={`uppercase text-[10px] font-bold tracking-wider px-3 py-1 ${c.status === 'available' ? 'bg-slate-500/40 text-slate-100 hover:bg-slate-500/50 border-transparent' : ''}`}>
                            {c.status === 'available' ? 'DISPONIBLE' : c.status === 'occupied' ? 'OCUPADO' : 'RESERVADO'}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 text-cyan-500/80 text-sm font-medium">Alineación: {readProfile(c.profileData, ['basic_alignment', 'alignment', 'alineamiento']) || 'Desconocida'}</div>
                        <div className="text-muted-foreground text-xs mt-1">AKA: {readProfile(c.profileData, ['alias', 'hero_name']) || (c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : 'NA')}</div>
                        <div className="text-muted-foreground text-xs mt-1">Quirk: {readProfile(c.profileData, ['quirk_name_name', 'quirk_name', 'quirkName', 'don_name', 'don']) || 'Sin don'}</div>
                        <div className="text-muted-foreground text-xs mt-1">Grupo: {readProfile(c.profileData, ['faction_group', 'group', 'grupo', 'faccion', 'facción', 'affiliation']) || c.affiliation || 'Sin grupo'}</div>
                        
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
                          <Button variant="outline" size="sm" onClick={() => {
                            apiFetch(`/api/admin/canon-characters/${c.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reserved: true })
                            }).then(() => mutate());
                          }}><Lock className="mr-1 size-3" /> Reservar</Button>
                        )}
                        {c.status === 'reserved' && (
                          <Button variant="outline" size="sm" onClick={() => {
                            apiFetch(`/api/admin/canon-characters/${c.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reserved: false })
                            }).then(() => mutate());
                          }}><Unlock className="mr-1 size-3" /> Liberar</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { 
                          setFormData({ 
                            summary: c.summary || '', 
                            profileData: getMappedProfile(c), 
                            active: c.active, 
                            reserved: c.reserved 
                          }); 
                          setEditingId(c.id); 
                        }}><Edit2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(c.id)} className="text-destructive"><Trash2 className="size-3.5" /></Button>
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

function CanonProfileFields({ value, onChange, fields, disabled = false }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void; fields: any[], disabled?: boolean }) {
  if (!fields) return null;
  
  // Usar TODOS los campos que tengan coreKey (los campos básicos por defecto)
  // Ocultar ciertos campos básicos en este formulario específico
  const hiddenKeys = ['nationality', 'faceclaim', 'basic_blood_type', 'quirk_type'];
  const displayFields = fields.filter((f: any) => !!f.coreKey && !hiddenKeys.includes(f.coreKey));
  
  return (
    <>
      {[...displayFields].sort((a, b) => a.order - b.order).map((field) => {
        const val = value[field.id] ?? '';
        const setVal = (v: any) => { if (!disabled) onChange({ ...value, [field.id]: v }); };
        
        let input;
        switch (field.type) {
          case 'select':
            input = (
              <Select value={String(val)} onValueChange={setVal} disabled={disabled}>
                <SelectTrigger className={disabled ? "opacity-50 cursor-not-allowed" : ""}>
                  <SelectValue placeholder={`Seleccionar ${field.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
            break;
          case 'date':
            input = <Input type="date" value={String(val)} onChange={(e) => setVal(e.target.value)} disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""} />;
            break;
          case 'textarea':
            input = <Textarea value={String(val)} onChange={(e) => setVal(e.target.value)} disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""} />;
            break;
          case 'quirk':
            input = (
              <Input value={String(value[`${field.id}_name`] || '')} onChange={e => { if (!disabled) onChange({ ...value, [`${field.id}_name`]: e.target.value }) }} placeholder="Nombre del quirk/poder..." disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""} />
            );
            break;
          default:
            input = <Input type="text" value={String(val)} onChange={(e) => setVal(e.target.value)} placeholder={field.name} disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""} />;
            break;
        }

        return (
          <label key={field.id} className="space-y-1 text-xs text-muted-foreground block">
            <span>{field.name}</span>
            {input}
          </label>
        );
      })}
    </>
  );
}
