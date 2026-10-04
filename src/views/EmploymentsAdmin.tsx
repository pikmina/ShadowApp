import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, Briefcase, DollarSign, X, AlertTriangle, UserPlus, CheckCircle2, HandCoins } from "lucide-react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { calculateEmploymentCompensation, employmentCompensationSchema } from "@/domain/employmentCompensation";
import { nanoid } from "nanoid";


export default function EmploymentsAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/employments/structure", fetcher);

  if (isLoading) return <div className="p-8">Cargando empleos...</div>;
  if (error) return <div className="p-8 text-red-500">Error al cargar empleos</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionHeader
        icon={Briefcase}
        title="Catálogo de Empleos y Cargos"
        description="Administra instituciones, departamentos y posiciones laborales."
        actions={
          <>
            <EmploymentPaymentsDialog structure={data ?? []} />
            <InstitutionDialog mutate={mutate} />
          </>
        }
      />

      <EntityPanel variant="character">
        <div className="p-4 sm:p-5">
          <div className="space-y-4">
        {data?.length === 0 && <p className="text-muted-foreground">No hay instituciones registradas.</p>}
        {data?.map((inst: any) => (
          <div key={inst.id} className="border border-border rounded-md bg-background overflow-hidden mb-4">
            <div className="bg-muted/20 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{inst.name} {!inst.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h2>
                {inst.description && <p className="text-sm text-muted-foreground">{inst.description}</p>}
              </div>
              <div className="flex gap-2">
                <DepartmentDialog institutionId={inst.id} mutate={mutate} />
                <InstitutionDialog institution={inst} mutate={mutate} />
                <DeleteAction type="institutions" id={inst.id} mutate={mutate} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {inst.departments?.length === 0 && <p className="text-sm text-muted-foreground">Sin departamentos.</p>}
              {inst.departments?.map((dep: any) => (
                <div key={dep.id} className="border border-border rounded-md p-4 bg-background">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-semibold text-primary">{dep.name} {!dep.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h3>
                      {dep.description && <p className="text-xs text-muted-foreground">{dep.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <PositionDialog departmentId={dep.id} mutate={mutate} />
                      <DepartmentDialog department={dep} institutionId={inst.id} mutate={mutate} />
                      <DeleteAction type="departments" id={dep.id} mutate={mutate} />
                    </div>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-border/50">
                    {dep.positions?.length === 0 && <p className="text-xs text-muted-foreground">Sin posiciones.</p>}
                    {dep.positions?.map((pos: any) => (
                      <div key={pos.id} className="rounded bg-muted/30 p-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-medium">{pos.name}</span> {!pos.active && <span className="text-red-500 text-xs">(Inactivo)</span>}
                          {pos.description && <p className="text-xs text-muted-foreground">{pos.description}</p>}
                          <div className="text-xs mt-1 text-primary">
                            Ocupantes: {pos.occupiedSlots} / {pos.capacity === null ? 'Ilimitado' : pos.capacity}
                          </div>
                          {(pos.levelId || pos.riskId) && <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {pos.levelId && <span>{employmentLevelFallbackLabel(pos.levelId)}</span>}{pos.riskId && <span>· {employmentRiskFallbackLabel(pos.riskId)}</span>}
                            {pos.minPosts !== null && <span>· {pos.minPosts} posts mínimos</span>}
                          </div>}
                        </div>
                        <div className="flex gap-2">
                          <EmploymentAssignmentDialog position={pos} mutate={mutate} />
                          <PositionDialog position={pos} departmentId={dep.id} mutate={mutate} />
                          <DeleteAction type="positions" id={pos.id} mutate={mutate} />
                        </div>
                        </div>
                        <div className="mt-3 border-t border-border/50 pt-3">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Personajes asignados</p>
                          {pos.occupants?.length ? <div className="flex flex-wrap gap-2">{pos.occupants.map((occupant: any) => (
                            <div key={occupant.employmentId} className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
                              {occupant.requirementsVerified && <CheckCircle2 className="size-3 text-emerald-500" />}
                              <span className="text-xs font-medium">{occupant.name}</span>
                              <Button variant="ghost" size="icon-sm" className="size-5 rounded-full text-muted-foreground hover:text-destructive" aria-label={`Retirar a ${occupant.name}`} onClick={async () => {
                                try {
                                  await apiFetch(`/api/admin/employments/${occupant.employmentId}`, { method: 'DELETE' });
                                  toast.success(`${occupant.name} fue retirado del puesto`);
                                  await mutate();
                                } catch (error: any) {
                                  toast.error(error.message || 'No se pudo retirar el empleo');
                                }
                              }}><X className="size-3" /></Button>
                            </div>
                          ))}</div> : <p className="text-xs text-muted-foreground">Todavía no hay personajes asignados.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
                </div>
        </div>
      </EntityPanel>
    </div>
  );
}

function EmploymentPaymentsDialog({ structure }: any) {
  const [open, setOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, { postsObserved: number; approved: boolean; optionalBonusIds: string[] }>>({});
  const [saving, setSaving] = useState(false);
  const { data: history, mutate: mutateHistory } = useSWR(open ? '/api/admin/employment-payments' : null, fetcher);
  const { data: rules } = useSWR(open ? '/api/rules' : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(rules?.find((rule: any) => rule.key === 'employment_compensation')?.value);
  const compensation = compensationResult.success ? compensationResult.data : null;
  const rows = structure.flatMap((institution: any) => institution.departments.flatMap((department: any) => department.positions.flatMap((position: any) =>
    (position.occupants ?? []).map((occupant: any) => ({ ...occupant, position }))
  )));
  const selectedRows = rows.filter((row: any) => selected[row.employmentId]);
  const quoteFor = (row: any) => {
    if (!compensation || !row.position.levelId || !row.position.riskId) return null;
    const chosen = (row.position.optionalBonuses ?? []).filter((bonus: any) => selected[row.employmentId]?.optionalBonusIds.includes(bonus.id));
    return calculateEmploymentCompensation(compensation, row.position.levelId, row.position.riskId,
      row.position.bonusYen + chosen.reduce((sum: number, bonus: any) => sum + bonus.yen, 0),
      row.position.bonusExp + chosen.reduce((sum: number, bonus: any) => sum + bonus.exp, 0));
  };
  const totals = selectedRows.reduce((sum: any, row: any) => { const quote = quoteFor(row); return { yen: sum.yen + (quote?.totalYen ?? 0), exp: sum.exp + (quote?.totalExp ?? 0) }; }, { yen: 0, exp: 0 });

  const toggle = (row: any, checked: boolean) => setSelected(current => {
    const next = { ...current };
    if (checked) next[row.employmentId] = { postsObserved: row.position.minPosts ?? 0, approved: false, optionalBonusIds: [] };
    else delete next[row.employmentId];
    return next;
  });
  const patchSelection = (id: string, patch: Partial<{ postsObserved: number; approved: boolean; optionalBonusIds: string[] }>) => setSelected(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  const pay = async () => {
    if (!periodLabel.trim()) return toast.error('Indica el periodo de pago');
    if (selectedRows.length === 0) return toast.error('Selecciona al menos un empleo');
    if (selectedRows.some((row: any) => !row.characterId)) return toast.error('Los personajes sin ficha vinculada no pueden recibir saldo');
    if (selectedRows.some((row: any) => !selected[row.employmentId].approved)) return toast.error('Aprueba manualmente los posts de cada pago');
    setSaving(true);
    try {
      await apiFetch('/api/admin/employment-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        periodLabel, notes, items: selectedRows.map((row: any) => ({ employmentId: row.employmentId, postsObserved: selected[row.employmentId].postsObserved, minimumPostsApproved: true, optionalBonusIds: selected[row.employmentId].optionalBonusIds })),
      }) });
      toast.success(`${selectedRows.length} pago${selectedRows.length === 1 ? '' : 's'} aplicado${selectedRows.length === 1 ? '' : 's'}`);
      setSelected({}); setNotes(''); await mutateHistory();
    } catch (error: any) { toast.error(error.message || 'No se pudo completar el lote de pagos'); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="outline" size="sm" className="h-9" />}><HandCoins className="mr-2 size-4" /> Preparar pagos</DialogTrigger>
    <DialogContent className="admin-dialog max-h-[92vh] overflow-y-auto sm:max-w-5xl">
      <DialogHeader><DialogTitle>Pagos manuales de empleos</DialogTitle></DialogHeader>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Periodo</Label><Input value={periodLabel} onChange={event => setPeriodLabel(event.target.value)} placeholder="Ej. Septiembre 2026" /></div><div className="space-y-2"><Label>Notas del moderador</Label><Input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Revisión del foro, incidencias..." /></div></div>
        <div className="space-y-2">
          {rows.length === 0 && <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No hay empleados activos para pagar.</p>}
          {rows.map((row: any) => { const entry = selected[row.employmentId]; const quote = entry ? quoteFor(row) : null; return <div key={row.employmentId} className="rounded-md border p-3">
            <div className="flex items-start gap-3"><Checkbox checked={Boolean(entry)} onCheckedChange={(checked: boolean) => toggle(row, checked)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">{row.position.name}{!row.characterId ? ' · Sin ficha vinculada' : ''}</p></div>{quote && <p className="font-mono text-sm text-emerald-400">¥{quote.totalYen} · +{quote.totalExp} EXP</p>}</div>
            {entry && <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-2"><div className="space-y-2"><Label>Posts observados</Label><Input type="number" min={0} value={entry.postsObserved} onChange={event => patchSelection(row.employmentId, { postsObserved: Number(event.target.value) })} /><p className="text-[11px] text-muted-foreground">Mínimo del puesto: {row.position.minPosts ?? 'sin mínimo'}</p></div><div className="flex items-center gap-2"><Checkbox checked={entry.approved} onCheckedChange={(approved: boolean) => patchSelection(row.employmentId, { approved })} /><Label>Posts revisados y aprobados</Label></div>
            {(row.position.optionalBonuses ?? []).length > 0 && <div className="space-y-2 md:col-span-2"><Label>Bonificaciones aplicables</Label>{row.position.optionalBonuses.map((bonus: any) => <label key={bonus.id} className="flex items-center gap-2 text-xs"><Checkbox checked={entry.optionalBonusIds.includes(bonus.id)} onCheckedChange={(checked: boolean) => patchSelection(row.employmentId, { optionalBonusIds: checked ? [...entry.optionalBonusIds, bonus.id] : entry.optionalBonusIds.filter((id: string) => id !== bonus.id) })} /><span>{bonus.name} · +¥{bonus.yen} / +{bonus.exp} EXP</span></label>)}</div>}</div>}
            </div></div>
          </div>; })}
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase">Total del lote</p><p className="text-lg font-bold text-emerald-400">¥{totals.yen} <span className="text-cyan-400">· +{totals.exp} EXP</span></p></div><Button onClick={pay} disabled={saving || selectedRows.length === 0}>{saving ? 'Aplicando...' : `Confirmar ${selectedRows.length} pago${selectedRows.length === 1 ? '' : 's'}`}</Button></div>
        <div className="space-y-2"><h3 className="font-semibold">Historial reciente</h3>{history?.slice(0, 10).map((payment: any) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 rounded border p-2 text-xs"><span><strong>{payment.characterName}</strong> · {payment.positionName} · {payment.periodLabel}</span><span className="text-emerald-400">¥{payment.totalYen} · +{payment.totalExp} EXP</span></div>)}{history?.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados.</p>}</div>
      </div>
    </DialogContent>
  </Dialog>;
}

function EmploymentAssignmentDialog({ position, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: characters } = useSWR(open ? '/api/admin/characters' : null, fetcher);
  const { data: canonCharacters } = useSWR(open ? '/api/admin/canon-characters' : null, fetcher);

  const assigned = new Set((position.occupants ?? []).flatMap((occupant: any) => [
    occupant.characterId ? `character:${occupant.characterId}` : null,
    occupant.canonCharacterId ? `canon:${occupant.canonCharacterId}` : null,
  ].filter(Boolean)));
  const options = [
    ...(characters ?? []).filter((item: any) => !item.canonCharacterId).map((item: any) => ({ value: `character:${item.id}`, label: item.name })),
    ...(canonCharacters ?? []).map((item: any) => ({ value: `canon:${item.id}`, label: `${item.name} (canon)` })),
  ].filter(option => !assigned.has(option.value));
  const full = position.capacity !== null && position.occupiedSlots >= position.capacity;

  const assign = async () => {
    const [kind, id] = selection.split(':');
    if (!kind || !id) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/employments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: position.id, ...(kind === 'canon' ? { canonCharacterId: id } : { characterId: Number(id) }) }),
      });
      toast.success('Empleo asignado');
      setSelection('');
      setOpen(false);
      await mutate();
    } catch (error: any) {
      const message = String(error.message ?? '');
      if (message.includes('Employment requirements not met')) toast.error('El personaje no cumple los requisitos obligatorios del puesto.');
      else if (message.includes('capacity')) toast.error('El puesto ya alcanzó su capacidad máxima.');
      else if (message.includes('already holds')) toast.error('El personaje ya ocupa este puesto.');
      else toast.error(message || 'No se pudo asignar el empleo');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="outline" size="sm" disabled={!position.active || full} className="h-7 font-oxanium text-[10px] uppercase tracking-wider" />}>
      <UserPlus className="mr-1 size-3" /> {full ? 'Sin cupos' : 'Asignar'}
    </DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Asignar personaje a {position.name}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Al confirmar, el sistema comprobará la capacidad y, cuando exista una ficha, sus requisitos obligatorios. Los personajes canon sin ficha quedarán pendientes de verificación manual.</p>
        <div className="space-y-2">
          <Label>Personaje</Label>
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger><SelectValue placeholder="Selecciona un personaje">{options.find(option => option.value === selection)?.label ?? 'Selecciona un personaje'}</SelectValue></SelectTrigger>
            <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
          {options.length === 0 && <p className="text-xs text-muted-foreground">No hay personajes disponibles para este puesto.</p>}
        </div>
      </div>
      <DialogFooter><Button onClick={assign} disabled={!selection || saving}>{saving ? 'Comprobando...' : 'Comprobar y asignar'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function InstitutionDialog({ institution, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(institution?.name || "");
  const [description, setDescription] = useState(institution?.description || "");
  const [active, setActive] = useState(institution ? institution.active : true);
  const [sortOrder, setSortOrder] = useState(institution?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = institution ? `/api/admin/institutions/${institution.id}` : `/api/admin/institutions`;
    const method = institution ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Institución guardada");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar institución");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={institution ? "ghost" : "default"} size={institution ? "icon-sm" : "sm"} className={!institution ? "h-9" : ""} />}>
        {institution ? <Edit2 className="size-4" /> : <><Plus className="size-3.5 mr-1" /> Nueva Institución </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{institution ? "Editar" : "Nueva"} Institución</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden (menor es primero)</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-inst" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-inst" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentDialog({ department, institutionId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(department?.name || "");
  const [description, setDescription] = useState(department?.description || "");
  const [active, setActive] = useState(department ? department.active : true);
  const [sortOrder, setSortOrder] = useState(department?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = department ? `/api/admin/departments/${department.id}` : `/api/admin/departments`;
    const method = department ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institutionId, name, description, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Departamento guardado");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar departamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={department ? "ghost" : "outline"} size={department ? "icon-sm" : "sm"} className={!department ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""} />}>
        {department ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nuevo Depto. </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{department ? "Editar" : "Nuevo"} Departamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-dep" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-dep" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PositionDialog({ position, departmentId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(position?.name || "");
  const [description, setDescription] = useState(position?.description || "");
  const [capacity, setCapacity] = useState(position?.capacity === null ? "" : position?.capacity?.toString() || "");
  const [active, setActive] = useState(position ? position.active : true);
  const [sortOrder, setSortOrder] = useState(position?.sortOrder || 0);
  const [levelId, setLevelId] = useState(position ? position.levelId ?? "" : "level_4");
  const [riskId, setRiskId] = useState(position ? position.riskId ?? "" : "moderate");
  const [bonusYen, setBonusYen] = useState(position?.bonusYen ?? 0);
  const [bonusExp, setBonusExp] = useState(position?.bonusExp ?? 0);
  const [minPosts, setMinPosts] = useState(position?.minPosts === null || position?.minPosts === undefined ? "" : String(position.minPosts));
  const [requirements, setRequirements] = useState<any>(position?.requirements ?? { operator: 'all', requirements: [] });
  const [optionalBonuses, setOptionalBonuses] = useState<any[]>(position?.optionalBonuses ?? []);
  const [reqType, setReqType] = useState<'owns_element' | 'skill_level' | 'attribute' | 'age'>('owns_element');
  const [reqReference, setReqReference] = useState('');
  const [reqValue, setReqValue] = useState(1);
  const [reqOptional, setReqOptional] = useState(false);
  const [reqBonusYen, setReqBonusYen] = useState(0);
  const [reqBonusExp, setReqBonusExp] = useState(0);
  const { data: rules } = useSWR(open ? '/api/rules' : null, fetcher);
  const { data: elements } = useSWR(open ? '/api/admin/elements' : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(rules?.find((rule: any) => rule.key === 'employment_compensation')?.value);
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === 'system_attributes')?.value ?? [];
  const validBonuses = Number.isSafeInteger(bonusYen) && bonusYen >= 0 && Number.isSafeInteger(bonusExp) && bonusExp >= 0;
  const quote = compensation && levelId && riskId && validBonuses && compensation.levels.some(item => item.id === levelId) && compensation.risks.some(item => item.id === riskId)
    ? calculateEmploymentCompensation(compensation, levelId, riskId, bonusYen, bonusExp)
    : null;

  const addRequirement = () => {
    if (reqType !== 'age' && !reqReference) return toast.error('Selecciona la referencia del requisito');
    const id = nanoid(10);
    const requirement = reqType === 'owns_element' ? { id, type: reqType, elementId: reqReference, quantity: 1 }
      : reqType === 'skill_level' ? { id, type: reqType, skillElementId: reqReference, comparison: 'gte', value: reqValue }
      : reqType === 'attribute' ? { id, type: reqType, attributeId: reqReference, comparison: 'gte', value: reqValue }
      : { id, type: reqType, comparison: 'gte', value: reqValue };
    if (reqOptional) {
      setOptionalBonuses(current => [...current, { id: nanoid(10), name: requirementLabel(requirement, elements, attributes), requirements: { operator: 'all', requirements: [requirement] }, yen: reqBonusYen, exp: reqBonusExp }]);
    } else {
      setRequirements((current: any) => ({ ...current, requirements: [...current.requirements, requirement] }));
    }
    setReqReference(''); setReqValue(1); setReqOptional(false); setReqBonusYen(0); setReqBonusExp(0);
  };

  const handleSubmit = async () => {
    const url = position ? `/api/admin/positions/${position.id}` : `/api/admin/positions`;
    const method = position ? "PUT" : "POST";
    const parsedCap = capacity === "" ? null : Number(capacity);
    
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId, name, description, capacity: parsedCap, active, sortOrder: Number(sortOrder), levelId: levelId || null, riskId: riskId || null, bonusYen, bonusExp, minPosts: minPosts === '' ? null : Number(minPosts), requirements, optionalBonuses })
    });
    if (res.ok) {
      toast.success("Posición guardada");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar posición");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={position ? "ghost" : "outline"} size={position ? "icon-sm" : "sm"} className={!position ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""} />}>
        {position ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nueva Posición </>}
      </DialogTrigger>
      <DialogContent className="admin-dialog max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader><DialogTitle>{position ? "Editar" : "Nueva"} Posición</DialogTitle></DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Nombre del puesto</Label><Input value={name} onChange={e => setName(e.target.value)} /></div><div className="space-y-2"><Label>Capacidad</Label><Input type="number" min={0} placeholder="Ilimitada" value={capacity} onChange={e => setCapacity(e.target.value)} /></div></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="rounded-lg border p-4 space-y-4">
              <div><h3 className="font-semibold">Requisitos del puesto</h3><p className="text-xs text-muted-foreground">Añade licencias, habilidades, atributos o edad mínima como en Shadowmore.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={reqType} onValueChange={(value: any) => { setReqType(value); setReqReference(''); }}><SelectTrigger><SelectValue>{requirementTypeLabel(reqType)}</SelectValue></SelectTrigger><SelectContent><SelectItem value="owns_element">Elemento, licencia, permiso o certificación</SelectItem><SelectItem value="skill_level">Habilidad</SelectItem><SelectItem value="attribute">Atributo</SelectItem><SelectItem value="age">Edad mínima</SelectItem></SelectContent></Select>
                {reqType === 'owns_element' && <Select value={reqReference} onValueChange={setReqReference}><SelectTrigger><SelectValue placeholder="Selecciona elemento">{reqReference ? requirementElementSelectLabel(reqReference, elements) : 'Selecciona elemento'}</SelectValue></SelectTrigger><SelectContent>{elements?.filter((item: any) => item.status === 'published').sort((a: any, b: any) => employmentElementKindOrder(a.kind) - employmentElementKindOrder(b.kind) || a.name.localeCompare(b.name)).map((item: any) => <SelectItem key={item.id} value={item.id}>[{employmentElementKindLabel(item.kind)}] {item.name}</SelectItem>)}</SelectContent></Select>}
                {reqType === 'skill_level' && <Select value={reqReference} onValueChange={setReqReference}><SelectTrigger><SelectValue placeholder="Selecciona habilidad">{reqReference ? requirementElementSelectLabel(reqReference, elements, false) : 'Selecciona habilidad'}</SelectValue></SelectTrigger><SelectContent>{elements?.filter((item: any) => item.status === 'published' && item.kind === 'skill').map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
                {reqType === 'attribute' && <Select value={reqReference} onValueChange={setReqReference}><SelectTrigger><SelectValue placeholder="Selecciona atributo">{reqReference ? attributes.find((item: any) => (item.abbrev ?? item.id) === reqReference)?.name ?? reqReference : 'Selecciona atributo'}</SelectValue></SelectTrigger><SelectContent>{attributes.map((item: any) => <SelectItem key={item.id} value={item.abbrev ?? item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
                {reqType === 'age' && <div className="flex items-center rounded-md border px-3 text-sm text-muted-foreground">Edad comprobada desde la ficha</div>}
              </div>
              {reqType !== 'owns_element' && <div className="space-y-1"><Label>Valor mínimo</Label><Input type="number" min={0} value={reqValue} onChange={event => setReqValue(Number(event.target.value))} /></div>}
              <div className="flex items-center gap-2"><Checkbox id={`optional-${position?.id ?? 'new'}`} checked={reqOptional} onCheckedChange={(checked: boolean) => setReqOptional(checked)} /><Label htmlFor={`optional-${position?.id ?? 'new'}`}>Requisito opcional con bonificación</Label></div>
              {reqOptional && <div className="grid grid-cols-2 gap-3"><div><Label>Bono ¥</Label><Input type="number" min={0} value={reqBonusYen} onChange={e => setReqBonusYen(Number(e.target.value))} /></div><div><Label>Bono EXP</Label><Input type="number" min={0} value={reqBonusExp} onChange={e => setReqBonusExp(Number(e.target.value))} /></div></div>}
              <Button type="button" variant="outline" onClick={addRequirement}><Plus className="size-4 mr-2" />Añadir requisito</Button>
              <RequirementTags title="Obligatorios" items={requirements?.requirements || []} elements={elements} attributes={attributes} onRemove={(id: string) => setRequirements((current: any) => ({ ...current, requirements: (current?.requirements || []).filter((item: any) => item.id !== id) }))} />
              <div className="space-y-2"><p className="text-xs font-bold uppercase text-muted-foreground">Opcionales</p>{optionalBonuses.map(item => <div key={item.id} className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs"><span>{item.name} · +¥{item.yen} / +{item.exp} EXP</span><Button variant="ghost" size="icon-sm" onClick={() => setOptionalBonuses(current => current.filter(entry => entry.id !== item.id))}><X className="size-3" /></Button></div>)}{optionalBonuses.length === 0 && <p className="text-xs text-muted-foreground">Sin bonificaciones opcionales.</p>}</div>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-amber-500/20 bg-muted/20 p-4">
            <h3 className="flex items-center gap-2 font-semibold"><DollarSign className="size-4 text-amber-400" /> Nivel y remuneración tabulada</h3>
            {!compensation && <p className="flex gap-2 text-xs text-destructive"><AlertTriangle className="size-4" />La regla de remuneración no está disponible.</p>}
            <div className="space-y-2"><Label>Nivel de responsabilidad</Label><Select value={levelId} onValueChange={setLevelId}><SelectTrigger><SelectValue placeholder="Sin configurar">{compensation?.levels.find(item => item.id === levelId)?.name ?? 'Sin configurar'}</SelectValue></SelectTrigger><SelectContent>{compensation?.levels.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Nivel de riesgo</Label><Select value={riskId} onValueChange={setRiskId}><SelectTrigger><SelectValue placeholder="Sin configurar">{compensation?.risks.find(item => item.id === riskId)?.name ?? 'Sin configurar'}</SelectValue></SelectTrigger><SelectContent>{compensation?.risks.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Bono extra ¥</Label><Input type="number" min={0} value={bonusYen} onChange={e => setBonusYen(Number(e.target.value))} /></div><div><Label>Bono extra EXP</Label><Input type="number" min={0} value={bonusExp} onChange={e => setBonusExp(Number(e.target.value))} /></div></div>
            <div className="space-y-2"><Label>Posts mínimos del foro</Label><Input type="number" min={0} placeholder="Sin requisito" value={minPosts} onChange={e => setMinPosts(e.target.value)} /><p className="text-xs text-muted-foreground">Un moderador los comprobará manualmente al preparar el pago.</p></div>
            {quote && <div className="rounded-lg border border-amber-500/30 bg-background p-4 space-y-2"><p className="text-xs font-bold uppercase">Sueldo calculado</p><div className="flex justify-between text-emerald-400"><span>Yenes</span><strong>¥{quote.totalYen}</strong></div><div className="flex justify-between text-cyan-400"><span>Experiencia</span><strong>+{quote.totalExp} EXP</strong></div><p className="border-t pt-2 text-[11px] text-muted-foreground">Base ¥{quote.levelYen}/{quote.levelExp} EXP · Riesgo +¥{quote.riskYen}/+{quote.riskExp} EXP</p></div>}
            <div className="grid grid-cols-2 gap-3"><div><Label>Orden</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} /></div><div className="flex items-end gap-2 pb-2"><Checkbox id="active-pos" checked={active} onCheckedChange={(c: boolean) => setActive(c)} /><Label htmlFor="active-pos">Activo</Label></div></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function requirementLabel(requirement: any, elements: any[] = [], attributes: any[] = []) {
  if (requirement.type === 'owns_element') return elements?.find(item => item.id === requirement.elementId)?.name ?? requirement.elementId;
  if (requirement.type === 'skill_level') return `${elements?.find(item => item.id === requirement.skillElementId)?.name ?? requirement.skillElementId} (Nv. ${requirement.value})`;
  if (requirement.type === 'attribute') return `${attributes?.find(item => (item.abbrev ?? item.id) === requirement.attributeId)?.name ?? requirement.attributeId} ≥ ${requirement.value}`;
  if (requirement.type === 'age') return `Edad ≥ ${requirement.value}`;
  return requirement.id;
}

function employmentElementKindLabel(kind: string) {
  return ({ certification: 'Certificación', license: 'Licencia', permission: 'Permiso', skill: 'Habilidad', equipment: 'Equipo', trait: 'Rasgo' } as Record<string, string>)[kind] ?? 'Elemento';
}

function employmentElementKindOrder(kind: string) {
  return ({ certification: 0, license: 1, permission: 2, skill: 3 } as Record<string, number>)[kind] ?? 10;
}

function requirementTypeLabel(type: string) {
  return ({ owns_element: 'Elemento, licencia, permiso o certificación', skill_level: 'Habilidad', attribute: 'Atributo', age: 'Edad mínima' } as Record<string, string>)[type] ?? 'Requisito';
}

function requirementElementSelectLabel(id: string, elements: any[] = [], showKind = true) {
  const element = elements?.find(item => item.id === id);
  if (!element) return id;
  return showKind ? `[${employmentElementKindLabel(element.kind)}] ${element.name}` : element.name;
}

function employmentLevelFallbackLabel(id: string) {
  return ({ level_1: 'Nivel I', level_2: 'Nivel II', level_3: 'Nivel III', level_4: 'Nivel IV', level_5: 'Nivel V', level_6: 'Nivel VI', per_topic: 'Por tema', per_article: 'Por artículo', per_sale: 'Por venta' } as Record<string, string>)[id] ?? id;
}

function employmentRiskFallbackLabel(id: string) {
  return ({ none: 'Ninguno', low: 'Leve', moderate: 'Moderado', serious: 'Grave', extreme: 'Extremo' } as Record<string, string>)[id] ?? id;
}

function RequirementTags({ title, items, elements, attributes, onRemove }: any) {
  return <div className="space-y-2"><p className="text-xs font-bold uppercase text-muted-foreground">{title}</p><div className="flex flex-wrap gap-2">{items.map((item: any) => <div key={item.id} className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs"><span>{requirementLabel(item, elements, attributes)}</span><Button variant="ghost" size="icon-sm" className="size-5 rounded-full" onClick={() => onRemove(item.id)}><X className="size-3" /></Button></div>)}</div>{items.length === 0 && <p className="text-xs text-muted-foreground">Sin requisitos obligatorios.</p>}</div>;
}

function DeleteAction({ type, id, mutate }: { type: string, id: string, mutate: any }) {
  const [open, setOpen] = useState(false);
  const handleDelete = async () => {
    const res = await apiFetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Eliminado");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error || "No se pudo eliminar, es posible que tenga registros hijos activos.");
    }
    setOpen(false);
  };
  
  return (
    <>
      <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este registro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
