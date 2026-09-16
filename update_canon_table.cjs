const fs = require('fs');
let code = fs.readFileSync('src/views/CanonCharactersAdmin.tsx', 'utf8');

if (!code.includes('import { Table')) {
  code = code.replace(
    /import \{ Label \} from '@\/components\/ui\/label';/,
    `import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";`
  );
}

// Replace the list mapping with a Table
const tableRegex = /<div className="mt-6 space-y-4">[\s\S]*?<\/EntityPanel>/;

const newTableCode = `<div className="mt-6">
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
                            {readProfile(c.profileData, ['avatar_url', 'avatarUrl', 'image', 'avatar']) || c.imageUrl ? (
                              <img src={readProfile(c.profileData, ['avatar_url', 'avatarUrl', 'image', 'avatar']) || c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <Shield className="size-5 text-muted-foreground/30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-oxanium text-base font-bold text-white tracking-wide">
                            {\`\${readProfile(c.profileData, ['basic_name', 'name', 'nombre']) || c.firstName || c.name} \${readProfile(c.profileData, ['last_name', 'apellido']) || c.lastName || ''}\`.trim()}
                          </div>
                          <div className="text-muted-foreground text-[10px] uppercase">
                             AKA: {readProfile(c.profileData, ['alias', 'hero_name']) || (c.aliases && c.aliases.length > 0 ? c.aliases.join(', ') : 'NA')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-muted-foreground text-xs">Alineación: {readProfile(c.profileData, ['basic_alignment', 'alignment', 'alineamiento']) || 'Desconocida'}</div>
                          <div className="text-muted-foreground text-xs">Quirk: {readProfile(c.profileData, ['quirk_name_name', 'quirk_name', 'quirkName', 'don_name', 'don']) || 'Sin don'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'} className={\`uppercase text-[10px] font-bold tracking-wider px-3 py-1 \${c.status === 'available' ? 'bg-slate-500/40 text-slate-100 hover:bg-slate-500/50 border-transparent' : ''}\`}>
                            {c.status === 'available' ? 'DISPONIBLE' : c.status === 'occupied' ? 'OCUPADO' : 'RESERVADO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'available' && (
                              <Button variant="ghost" size="icon" title="Crear ficha" onClick={() => navigate(\`/character-editor?canonId=\${c.id}\`)}>
                                <Plus className="size-4" />
                              </Button>
                            )}
                            {c.status === 'occupied' && c.linkedCharacterId && (
                              <Button variant="ghost" size="icon" title="Ver ficha" onClick={() => navigate(\`/sheet/\${c.linkedCharacterId}\`)}>
                                <Eye className="size-4" />
                              </Button>
                            )}
                            {c.status === 'available' && (
                              <Button variant="ghost" size="icon" title="Reservar" onClick={() => {
                                apiFetch(\`/api/admin/canon-characters/\${c.id}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reserved: true }) }).then(() => mutate());
                              }}><Lock className="size-4" /></Button>
                            )}
                            {c.status === 'reserved' && (
                              <Button variant="ghost" size="icon" title="Liberar" onClick={() => {
                                apiFetch(\`/api/admin/canon-characters/\${c.id}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reserved: false }) }).then(() => mutate());
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
                                  <CanonProfileFields fields={fields || []} value={formData.profileData} onChange={profileData => setFormData({ ...formData, profileData })} disabled={false} />
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
      </EntityPanel>`;

code = code.replace(tableRegex, newTableCode);

fs.writeFileSync('src/views/CanonCharactersAdmin.tsx', code);
