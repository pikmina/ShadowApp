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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CharacterEmployments, CharacterEnrollments } from '@/components/character/CharacterRelations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { data: settings } = useSWR('/api/settings', fetcher);
  const [searchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(() => searchParams.get('create') === 'true');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreating(true);
      setEditingId(null);
      setFormData(emptyForm);
    }
  }, [searchParams]);

  const processedFields = React.useMemo(() => {
    if (!fields) return [];
    const list = [...fields];
    if (settings?.groups && settings.groups.length > 0) {
      const hasGroupField = list.some((f: any) => {
        const name = f.name.toLowerCase();
        return (name.includes('grupo') && !name.includes('sangu')) || name.includes('facción') || name.includes('faccion');
      });
      if (!hasGroupField) {
        list.push({
          id: 'faction_group',
          name: 'Facción / Grupo',
          category: 'Datos Administrativos',
          type: 'select',
          order: -100,
          coreKey: 'faction_group',
          options: settings.groups.map((g: any) => g.name)
        });
      }
    }
    return list;
  }, [fields, settings]);

  const getMappedProfile = (c: any) => {
    const profile = { ...(c.profileData || {}) };
    const nameField = processedFields?.find((f: any) => f.coreKey === 'basic_name');
    if (nameField && !profile[nameField.id] && !profile[`${nameField.id}_name`]) profile[nameField.id] = c.firstName ?? c.name;
    
    const lastNameField = processedFields?.find((f: any) => f.coreKey === 'last_name');
    if (lastNameField && !profile[lastNameField.id] && !profile[`${lastNameField.id}_name`]) profile[lastNameField.id] = c.lastName ?? '';
    
    const aliasField = processedFields?.find((f: any) => f.coreKey === 'alias');
    if (aliasField && !profile[aliasField.id] && !profile[`${aliasField.id}_name`]) profile[aliasField.id] = (c.aliases || []).join(', ');
    
    const avatarField = processedFields?.find((f: any) => f.coreKey === 'avatar_url');
    if (avatarField && !profile[avatarField.id] && !profile[`${avatarField.id}_name`]) profile[avatarField.id] = c.imageUrl ?? '';
    
    const affiliationField = processedFields?.find((f: any) => f.coreKey === 'faction_group' || f.name.toLowerCase().includes('afili') || (f.name.toLowerCase().includes('grupo') && !f.name.toLowerCase().includes('sangu')));
    if (affiliationField && !profile[affiliationField.id]) profile[affiliationField.id] = c.affiliation ?? '';

    return profile;
  };

  const prepareSubmitData = () => {
    const nameField = processedFields?.find((f: any) => f.coreKey === 'basic_name');
    const nameVal = formData.profileData[nameField?.id || ''] || formData.profileData[`${nameField?.id}_name`] || '';
    const canonName = (typeof nameVal === 'string' ? nameVal : '').trim() || 'Sin Nombre';

    const lastNameField = processedFields?.find((f: any) => f.coreKey === 'last_name');
    const lastName = formData.profileData[lastNameField?.id || ''] || formData.profileData[`${lastNameField?.id}_name`] || null;

    const aliasField = processedFields?.find((f: any) => f.coreKey === 'alias');
    const aliasesStr = formData.profileData[aliasField?.id || ''] || formData.profileData[`${aliasField?.id}_name`] || '';
    const aliases = typeof aliasesStr === 'string' ? aliasesStr.split(',').map((v: string) => v.trim()).filter(Boolean) : [];

    const avatarField = processedFields?.find((f: any) => f.coreKey === 'avatar_url');
    const imageUrl = formData.profileData[avatarField?.id || ''] || formData.profileData[`${avatarField?.id}_name`] || null;

    const affiliationField = processedFields?.find((f: any) => f.coreKey === 'faction_group' || f.name.toLowerCase().includes('afili') || (f.name.toLowerCase().includes('grupo') && !f.name.toLowerCase().includes('sangu')));
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

  const getProfileValueByCoreKey = (profileData: any, coreKey: string, fallbacks: string[] = []) => {
    if (!profileData) return undefined;
    const field = processedFields.find((f: any) => f.coreKey === coreKey || fallbacks.includes(f.coreKey));
    if (field) {
       // Support for compound names or fields that save to special keys like quirks
       if (profileData[field.id] !== undefined && profileData[field.id] !== null && profileData[field.id] !== '') return profileData[field.id];
       if (profileData[`${field.id}_name`] !== undefined && profileData[`${field.id}_name`] !== null && profileData[`${field.id}_name`] !== '') return profileData[`${field.id}_name`];
    }
    return readProfile(profileData, [coreKey, ...fallbacks]);
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
                <CanonProfileFields fields={processedFields} value={formData.profileData} onChange={profileData => setFormData({ ...formData, profileData })} disabled={false} />
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground block">Descripción breve</label>
                  <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Resumen público" />
                </div>
              </div>
              <Button onClick={handleCreate}>Guardar</Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
            </div>
          )}

          <div className="mt-6">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Datos Básicos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <React.Fragment key={c.id}>
                      <TableRow className="hover:bg-muted/10 transition-colors">
                        <TableCell>
                          <div className="w-12 h-12 rounded overflow-hidden bg-black/40 border border-border/20 flex items-center justify-center">
                            {getProfileValueByCoreKey(c.profileData, 'avatar_url', ['avatarUrl', 'image', 'avatar']) || c.imageUrl ? (
                              <img src={getProfileValueByCoreKey(c.profileData, 'avatar_url', ['avatarUrl', 'image', 'avatar']) || c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="size-5 text-muted-foreground/30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-oxanium text-base font-bold text-white tracking-wide">
                            {`${getProfileValueByCoreKey(c.profileData, 'basic_name', ['name', 'nombre']) || c.firstName || c.name} ${getProfileValueByCoreKey(c.profileData, 'last_name', ['apellido']) || c.lastName || ''}`.trim()}
                          </div>
                          <div className="text-muted-foreground text-[10px] uppercase">
                             AKA: {getProfileValueByCoreKey(c.profileData, 'alias', ['hero_name']) || (c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : 'NA')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-muted-foreground text-xs">Alineación: {getProfileValueByCoreKey(c.profileData, 'basic_alignment', ['alignment', 'alineamiento']) || 'Desconocida'}</div>
                          <div className="text-muted-foreground text-xs">Quirk: {getProfileValueByCoreKey(c.profileData, 'quirk_name', ['quirk_name_name', 'quirkName', 'don_name', 'don']) || 'Sin don'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'} className={`uppercase text-[10px] font-bold tracking-wider px-3 py-1 ${c.status === 'available' ? 'bg-slate-500/40 text-slate-100 hover:bg-slate-500/50 border-transparent' : ''}`}>
                            {c.status === 'available' ? 'DISPONIBLE' : c.status === 'occupied' ? 'OCUPADO' : 'RESERVADO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'available' && (
                              <Button variant="ghost" size="icon" title="Crear ficha" onClick={() => navigate(`/character-editor?canonId=${c.id}`)}>
                                <Plus className="size-4" />
                              </Button>
                            )}
                            {c.status === 'occupied' && c.linkedCharacterId && (
                              <Button variant="ghost" size="icon" title="Ver ficha" onClick={() => navigate(`/sheet/${c.linkedCharacterId}`)}>
                                <Eye className="size-4" />
                              </Button>
                            )}
                            {c.status === 'available' && (
                              <Button variant="ghost" size="icon" title="Reservar" onClick={() => {
                                apiFetch(`/api/admin/canon-characters/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reserved: true }) }).then(() => mutate());
                              }}><Lock className="size-4" /></Button>
                            )}
                            {c.status === 'reserved' && (
                              <Button variant="ghost" size="icon" title="Liberar" onClick={() => {
                                apiFetch(`/api/admin/canon-characters/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reserved: false }) }).then(() => mutate());
                              }}><Unlock className="size-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => {
                               if (editingId === c.id) {
                                 setEditingId(null);
                               } else {
                                 setFormData({
                                   summary: c.summary || '',
                                   profileData: getMappedProfile(c),
                                   active: c.active,
                                   reserved: c.reserved
                                 });
                                 setEditingId(c.id);
                               }
                             }}><Edit2 className="size-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(c.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {editingId === c.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0 border-b-2 border-primary/20">
                            <div className="bg-[#0a0a0a]/60 p-5 shadow-inner">
                              <div className="grid gap-4 sm:grid-cols-2">
                                {c.status !== 'occupied' && (
                                  <CanonProfileFields fields={processedFields} value={formData.profileData} onChange={profileData => setFormData({ ...formData, profileData })} disabled={false} />
                                )}
                                <div className={c.status === 'occupied' ? "sm:col-span-2 space-y-1" : "sm:col-span-2 space-y-1 mt-4"}>
                                  <label className="text-xs text-muted-foreground block">Descripción breve</label>
                                  <Textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} placeholder="Resumen público (solo para Catálogo Canon, no reemplaza la ficha)" className="h-24" />
                                </div>
                              </div>
                              <div className="grid gap-6 border-t border-border mt-6 pt-6 lg:grid-cols-2">
                                <CharacterEmployments canonCharacterId={c.id} />
                                <CharacterEnrollments canonCharacterId={c.id} />
                              </div>
                              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border/50">
                                <Button onClick={() => handleUpdate(c.id)}>Guardar Cambios</Button>
                                <Button variant="ghost" onClick={() => setEditingId(null)}>Cerrar</Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No se encontraron personajes canon con esos criterios.</div>
            )}
          </div>
        </div>
      </EntityPanel>
    </div>
  );
}

function CanonProfileFields({ value, onChange, fields, disabled = false }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void; fields: any[], disabled?: boolean }) {
  if (!fields) return null;
  
  const allowedKeys = ['basic_name', 'last_name', 'quirk_name', 'quirk_type', 'quirk_level', 'basic_alignment', 'alias', 'avatar_url', 'faction_group'];
  const displayFields = fields.filter((f: any) => !!f.coreKey && allowedKeys.includes(f.coreKey));
  
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
          default:
            input = <Input type="text" value={String(val)} onChange={(e) => setVal(e.target.value)} placeholder={field.name} disabled={disabled} className={disabled ? "opacity-50 cursor-not-allowed" : ""} />;
            break;
        }

        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs text-muted-foreground block">{field.name}</Label>
            {input}
          </div>
        );
      })}
    </>
  );
}
