import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, Briefcase, DollarSign, X, AlertTriangle, UserPlus, CheckCircle2, HandCoins, ChevronDown, ChevronUp, Search, Copy, Users, Eye } from "lucide-react";
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
import { Combobox } from "../components/ui/combobox";
import { calculateEmploymentCompensation, employmentCompensationSchema } from "@/domain/employmentCompensation";
import { nanoid } from "nanoid";


export default function EmploymentsAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/employments/structure", fetcher);
  const { data: rules } = useSWR("/api/rules", fetcher);
  const { data: elements } = useSWR("/api/admin/elements", fetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const compensationResult = employmentCompensationSchema.safeParse(rules?.find((rule: any) => rule.key === 'employment_compensation')?.value);
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === 'system_attributes')?.value ?? [];
  const stages = Array.isArray(rules?.find((rule: any) => rule.key === 'system_stages')?.value) ? rules.find((rule: any) => rule.key === 'system_stages')?.value : [];

  const toggleDept = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const handleDuplicatePosition = async (pos: any) => {
    try {
      const payload = {
        departmentId: pos.departmentId,
        name: `${pos.name} (Copia)`,
        description: pos.description || null,
        capacity: pos.capacity,
        active: Boolean(pos.active),
        sortOrder: Number(pos.sortOrder) || 0,
        levelId: pos.levelId || null,
        riskId: pos.riskId || null,
        bonusYen: Number(pos.bonusYen) || 0,
        bonusExp: Number(pos.bonusExp) || 0,
        minPosts: pos.minPosts === null || pos.minPosts === undefined ? null : Number(pos.minPosts),
        requirements: pos.requirements ?? { operator: 'all', requirements: [] },
        optionalBonuses: pos.optionalBonuses ?? [],
      };

      const res = await apiFetch("/api/admin/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Puesto duplicado como "${payload.name}"`);
        await mutate();
      }
    } catch (err: any) {
      toast.error(err.message || "Error al duplicar el puesto");
    }
  };

  // Unique institutions and departments for filters
  const allInstitutions = useMemo(() => (data || []), [data]);
  const availableDepartments = useMemo(() => {
    if (!data) return [];
    if (filterInstitution === "all") {
      return data.flatMap((inst: any) => inst.departments || []);
    }
    const inst = data.find((i: any) => i.id === filterInstitution);
    return inst ? (inst.departments || []) : [];
  }, [data, filterInstitution]);

  // Filter logic
  const filteredInstitutions = useMemo(() => {
    if (!data) return [];
    const q = searchTerm.trim().toLowerCase();

    return data
      .filter((inst: any) => {
        if (filterInstitution !== "all" && inst.id !== filterInstitution) return false;
        return true;
      })
      .map((inst: any) => {
        const departments = (inst.departments || [])
          .filter((dep: any) => {
            if (filterDepartment !== "all" && dep.id !== filterDepartment) return false;
            return true;
          })
          .map((dep: any) => {
            const positions = (dep.positions || []).filter((pos: any) => {
              if (filterRisk !== "all" && (pos.riskId || 'none') !== filterRisk) return false;
              if (filterAvailability === "available") {
                if (pos.capacity !== null && pos.occupiedSlots >= pos.capacity) return false;
              } else if (filterAvailability === "full") {
                if (pos.capacity === null || pos.occupiedSlots < pos.capacity) return false;
              }

              if (q) {
                const matchName = pos.name.toLowerCase().includes(q);
                const matchDesc = (pos.description || "").toLowerCase().includes(q);
                const matchOccupant = (pos.occupants || []).some((occ: any) => occ.name.toLowerCase().includes(q));
                const matchReq = (pos.requirements?.requirements || []).some((r: any) => {
                  const lbl = requirementLabel(r, elements, attributes, stages).toLowerCase();
                  return lbl.includes(q);
                });
                if (!matchName && !matchDesc && !matchOccupant && !matchReq) return false;
              }

              return true;
            });

            return { ...dep, positions };
          })
          .filter((dep: any) => {
            // Keep department if it has matching positions or if no search query is active
            if (q || filterRisk !== "all" || filterAvailability !== "all") {
              return dep.positions.length > 0;
            }
            return true;
          });

        return { ...inst, departments };
      })
      .filter((inst: any) => {
        if (q || filterDepartment !== "all" || filterRisk !== "all" || filterAvailability !== "all") {
          return inst.departments.length > 0;
        }
        return true;
      });
  }, [data, searchTerm, filterInstitution, filterDepartment, filterRisk, filterAvailability, elements, attributes, stages]);

  if (isLoading) return <div className="p-8 font-oxanium text-sm">Cargando catálogo de empleos...</div>;
  if (error) return <div className="p-8 text-red-500 font-oxanium text-sm">Error al cargar empleos</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionHeader
        icon={Briefcase}
        title="Catálogo de Empleos y Cargos"
        description="Administra instituciones, departamentos y posiciones laborales con jerarquía visual."
        actions={
          <div className="flex items-center gap-2">
            <EmploymentPaymentsDialog structure={data ?? []} />
            <InstitutionDialog mutate={mutate} />
          </div>
        }
      />

      {/* Barra de Búsqueda y Filtros Rápidos (Estilo Cyberpunk de Referencia) */}
      <div className="rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de puesto, ocupante, descripción o requisito..."
            className="pl-9 h-9 bg-background/70 text-xs w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-oxanium uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Briefcase className="size-3" /> Institución
            </label>
            <Select value={filterInstitution} onValueChange={(val: string) => { setFilterInstitution(val); setFilterDepartment("all"); }}>
              <SelectTrigger className="h-8 bg-background/70 text-xs">
                <SelectValue placeholder="Todas las Instituciones">
                  {filterInstitution === "all" ? "Todas las Instituciones" : allInstitutions.find((i: any) => i.id === filterInstitution)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Instituciones</SelectItem>
                {allInstitutions.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-oxanium uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <span className="size-3 flex items-center justify-center font-bold">§</span> Área Vinculada
            </label>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="h-8 bg-background/70 text-xs">
                <SelectValue placeholder="Todas las Áreas">
                  {filterDepartment === "all" ? "Todas las Áreas" : availableDepartments.find((d: any) => d.id === filterDepartment)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                {availableDepartments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-oxanium uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="size-3 text-amber-400" /> Nivel de Riesgo
            </label>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="h-8 bg-background/70 text-xs">
                <SelectValue placeholder="Cualquier Riesgo">
                  {filterRisk === "all" ? "Cualquier Riesgo" : employmentRiskFallbackLabel(filterRisk)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier Riesgo</SelectItem>
                <SelectItem value="none">Ninguno</SelectItem>
                <SelectItem value="low">Leve</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
                <SelectItem value="serious">Grave</SelectItem>
                <SelectItem value="extreme">Extremo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-oxanium uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="size-3" /> Disponibilidad
            </label>
            <Select value={filterAvailability} onValueChange={setFilterAvailability}>
              <SelectTrigger className="h-8 bg-background/70 text-xs">
                <SelectValue placeholder="Todos los puestos">
                  {filterAvailability === "all" ? "Todos los puestos" : filterAvailability === "available" ? "Solo con vacantes" : "Ocupados al 100%"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los puestos</SelectItem>
                <SelectItem value="available">Solo con vacantes</SelectItem>
                <SelectItem value="full">Ocupados al 100%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid en 2 Columnas para Instituciones */}
      {filteredInstitutions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground font-oxanium">
          No se encontraron instituciones o puestos con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {filteredInstitutions.map((inst: any) => (
            <div
              key={inst.id}
              className="rounded-lg border border-border/80 bg-card/40 overflow-hidden shadow-xs flex flex-col transition-colors"
            >
              {/* Cabecera de la Institución */}
              <div className="bg-muted/30 px-3.5 py-2.5 border-b border-border/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-oxanium text-base font-bold text-foreground truncate">
                      {inst.name}
                    </h2>
                    {!inst.active && (
                      <span className="text-[10px] font-oxanium px-1.5 py-0.2 rounded bg-destructive/15 text-destructive font-semibold">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {inst.description && (
                    <p className="text-xs text-muted-foreground truncate">{inst.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <DepartmentDialog institutionId={inst.id} mutate={mutate} />
                  <InstitutionDialog institution={inst} mutate={mutate} />
                  <DeleteAction type="institutions" id={inst.id} mutate={mutate} />
                </div>
              </div>

              {/* Contenedor de Departamentos */}
              <div className="p-3 space-y-3">
                {inst.departments?.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1 py-2">Sin departamentos configurados.</p>
                )}

                {inst.departments?.map((dep: any) => {
                  const isCollapsed = Boolean(collapsedDepts[dep.id]);
                  const positionsCount = dep.positions?.length || 0;

                  return (
                    <div
                      key={dep.id}
                      className="rounded-md border border-border/60 bg-background/50 overflow-hidden"
                    >
                      {/* Cabecera del Departamento con Toggle Expandir/Minimizar */}
                      <div className="px-3 py-2 bg-muted/20 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDept(dep.id)}
                          className="flex items-center gap-2 min-w-0 text-left hover:text-primary transition-colors flex-1"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <span className="font-oxanium text-xs font-semibold text-foreground truncate block">
                              {dep.name} {!dep.active && <span className="text-destructive font-normal">(Inactivo)</span>}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {positionsCount} {positionsCount === 1 ? 'puesto' : 'puestos'}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <PositionDialog departmentId={dep.id} mutate={mutate} />
                          <DepartmentDialog department={dep} institutionId={inst.id} mutate={mutate} />
                          <DeleteAction type="departments" id={dep.id} mutate={mutate} />
                        </div>
                      </div>

                      {/* Lista de Puestos del Departamento */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-2 border-t border-border/40 bg-background/30">
                          {positionsCount === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic py-1 px-2">Sin puestos en esta área.</p>
                          ) : (
                            dep.positions.map((pos: any) => {
                              const occupied = pos.occupiedSlots || 0;
                              const capacity = pos.capacity;
                              const isFull = capacity !== null && occupied >= capacity;
                              const isVacant = capacity === null || occupied < capacity;

                              // Calculate quote for compact display
                              const quote = (compensation && pos.levelId && pos.riskId)
                                ? calculateEmploymentCompensation(compensation, pos.levelId, pos.riskId, pos.bonusYen || 0, pos.bonusExp || 0)
                                : null;

                              const riskColor = pos.riskId === 'extreme' ? 'text-rose-400'
                                : pos.riskId === 'serious' ? 'text-orange-400'
                                : pos.riskId === 'moderate' ? 'text-amber-400'
                                : 'text-zinc-400';

                              return (
                                <div
                                  key={pos.id}
                                  className="rounded border border-border/80 bg-card/60 p-2.5 transition-all hover:border-primary/40 text-xs space-y-1 shadow-2xs"
                                >
                                  {/* Fila superior: Badges contextuales + Acciones */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-oxanium">
                                      {pos.levelId && (
                                        <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono">
                                          {employmentLevelFallbackLabel(pos.levelId)}
                                        </span>
                                      )}
                                      {!pos.active && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold uppercase">
                                          Inactivo
                                        </span>
                                      )}
                                      <span className={`font-bold capitalize ${riskColor}`}>Riesgo &nbsp;
                                        {employmentRiskFallbackLabel(pos.riskId || 'none')}
                                      </span>
                                    </div>

                                    {/* Botones de acción en la esquina: Duplicar, Editar, Borrar */}
                                    <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="size-6 rounded hover:text-foreground"
                                        title="Duplicar puesto"
                                        aria-label={`Duplicar puesto ${pos.name}`}
                                        onClick={() => handleDuplicatePosition(pos)}
                                      >
                                        <Copy className="size-3.5" />
                                      </Button>
                                      <PositionDialog position={pos} departmentId={dep.id} mutate={mutate} />
                                      <DeleteAction type="positions" id={pos.id} mutate={mutate} />
                                    </div>
                                  </div>

                                  {/* Título del puesto */}
                                  <div className="min-w-0">
                                    <h4 className="font-oxanium text-sm font-bold text-foreground leading-tight truncate">
                                      {pos.name}
                                    </h4>
                                    {pos.description && (
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {pos.description}
                                      </p>
                                    )}
                                  </div>
                                  {/* Pie de la tarjeta: Estado de cupo + Botón Asignar / Ver Ocupantes */}
                                  <div className="pt-1 border-t border-border/40 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[11px] font-oxanium">
                                      <Users className="size-3 text-muted-foreground" />
                                      <span className="text-muted-foreground pt-1">
                                        Ocupantes ({occupied}/{capacity === null ? '∞' : capacity})
                                      </span>
                                      {isVacant && (
                                        <span className="text-[10px] font-bold text-emerald-400 px-1 py-0.2 pt-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                          {capacity === null ? 'Ilimitado' : `${capacity - occupied} disponible`}
                                        </span>
                                      )}
                                      {isFull && (
                                        <span className="text-[10px] font-bold text-rose-400 px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                                          Completo
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {occupied > 0 && (
                                        <OccupantsDetailsDialog position={pos} mutate={mutate} />
                                      )}
                                      <EmploymentAssignmentDialog position={pos} mutate={mutate} />
                                    </div>
                                  </div>

                                  {/* Requisitos Compactos */}
                                  {pos.requirements?.requirements?.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-oxanium font-bold uppercase tracking-wider text-muted-foreground">
                                        Requisitos:
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {pos.requirements.requirements.map((req: any) => (
                                          <span
                                            key={req.id || nanoid()}
                                            className="px-1.5 py-0.5 rounded border border-border/70 bg-background/80 text-[10px] text-foreground font-medium"
                                          >
                                            {requirementLabel(req, elements, attributes, stages)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OccupantsDetailsDialog({ position, mutate }: { position: any; mutate: any }) {
  const [open, setOpen] = useState(false);
  const occupants = position.occupants || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-oxanium gap-1 text-muted-foreground hover:text-foreground" />}>
        <Eye className="size-3" /> Ver lista ({occupants.length})
      </DialogTrigger>
      <DialogContent className="admin-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-oxanium text-base">
            Ocupantes del puesto: {position.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground">
            {occupants.length} {occupants.length === 1 ? 'personaje asignado' : 'personajes asignados'} a este cargo.
          </p>
          <div className="divide-y divide-border/50 border rounded-md">
            {occupants.map((occ: any) => (
              <div key={occ.employmentId} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {occ.requirementsVerified ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-foreground block truncate">{occ.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {occ.characterId ? `Ficha #${occ.characterId}` : 'Personaje Canon'}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  title={`Retirar a ${occ.name}`}
                  aria-label={`Retirar a ${occ.name}`}
                  onClick={async () => {
                    try {
                      await apiFetch(`/api/admin/employments/${occ.employmentId}`, { method: 'DELETE' });
                      toast.success(`${occ.name} fue retirado del puesto`);
                      await mutate();
                    } catch (error: any) {
                      toast.error(error.message || 'No se pudo retirar el empleo');
                    }
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
          <Combobox
            value={selection}
            onValueChange={setSelection}
            placeholder="Selecciona un personaje..."
            searchPlaceholder="Buscar personaje..."
            options={options.map(opt => ({ value: opt.value, label: opt.label }))}
          />
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

  useEffect(() => {
    if (open) {
      setName(institution?.name || "");
      setDescription(institution?.description || "");
      setActive(institution ? institution.active : true);
      setSortOrder(institution?.sortOrder || 0);
    }
  }, [open, institution]);

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

  useEffect(() => {
    if (open) {
      setName(department?.name || "");
      setDescription(department?.description || "");
      setActive(department ? department.active : true);
      setSortOrder(department?.sortOrder || 0);
    }
  }, [open, department]);

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
  const [reqType, setReqType] = useState<'owns_element' | 'skill_level' | 'attribute' | 'stage' | 'age'>('owns_element');
  const [reqReference, setReqReference] = useState('');
  const [reqValue, setReqValue] = useState(1);
  const [reqOptional, setReqOptional] = useState(false);
  const [reqBonusYen, setReqBonusYen] = useState(0);
  const [reqBonusExp, setReqBonusExp] = useState(0);

  useEffect(() => {
    if (open) {
      setName(position?.name || "");
      setDescription(position?.description || "");
      setCapacity(position?.capacity === null || position?.capacity === undefined ? "" : position.capacity.toString());
      setActive(position ? position.active : true);
      setSortOrder(position?.sortOrder || 0);
      setLevelId(position ? position.levelId ?? "" : "level_4");
      setRiskId(position ? position.riskId ?? "" : "moderate");
      setBonusYen(position?.bonusYen ?? 0);
      setBonusExp(position?.bonusExp ?? 0);
      setMinPosts(position?.minPosts === null || position?.minPosts === undefined ? "" : String(position.minPosts));
      setRequirements(position?.requirements ? JSON.parse(JSON.stringify(position.requirements)) : { operator: 'all', requirements: [] });
      setOptionalBonuses(position?.optionalBonuses ? JSON.parse(JSON.stringify(position.optionalBonuses)) : []);
      setReqType('owns_element');
      setReqReference('');
      setReqValue(1);
      setReqOptional(false);
      setReqBonusYen(0);
      setReqBonusExp(0);
    }
  }, [open, position]);
  const { data: rules } = useSWR(open ? '/api/rules' : null, fetcher);
  const { data: elements } = useSWR(open ? '/api/admin/elements' : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(rules?.find((rule: any) => rule.key === 'employment_compensation')?.value);
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === 'system_attributes')?.value ?? [];
  const stages = Array.isArray(rules?.find((rule: any) => rule.key === 'system_stages')?.value) ? rules.find((rule: any) => rule.key === 'system_stages')?.value : [];
  const validBonuses = Number.isSafeInteger(bonusYen) && bonusYen >= 0 && Number.isSafeInteger(bonusExp) && bonusExp >= 0;
  const quote = compensation && levelId && riskId && validBonuses && compensation.levels.some(item => item.id === levelId) && compensation.risks.some(item => item.id === riskId)
    ? calculateEmploymentCompensation(compensation, levelId, riskId, bonusYen, bonusExp)
    : null;

  const credentialOrder = ['license', 'permission', 'certification'];
  const credentialKindLabels: Record<string, string> = {
    license: 'Licencias',
    permission: 'Permisos',
    certification: 'Certificados',
  };

  const elementGroups = credentialOrder
    .map(kind => ({
      label: credentialKindLabels[kind] || kind,
      options: (elements || [])
        .filter((item: any) => item.status === 'published' && item.kind === kind)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((item: any) => ({
          value: item.id,
          label: item.name,
          description: item.description,
        })),
    }))
    .filter(group => group.options.length > 0);

  const skillOptions = (elements || [])
    .filter((item: any) => item.status === 'published' && item.kind === 'skill')
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
    .map((item: any) => ({ value: item.id, label: item.name, description: item.description }));

  const addRequirement = () => {
    if (reqType !== 'age' && !reqReference) return toast.error(reqType === 'stage' ? 'Selecciona la etapa mínima' : 'Selecciona la referencia del requisito');
    const id = nanoid(10);
    const requirement = reqType === 'owns_element' ? { id, type: reqType, elementId: reqReference, quantity: 1 }
      : reqType === 'skill_level' ? { id, type: reqType, skillElementId: reqReference, comparison: 'gte', value: reqValue }
      : reqType === 'attribute' ? { id, type: reqType, attributeId: reqReference, comparison: 'gte', value: reqValue }
      : reqType === 'stage' ? { id, type: reqType, stageId: reqReference, comparison: 'gte' }
      : { id, type: reqType, comparison: 'gte', value: reqValue };
    if (reqOptional) {
      setOptionalBonuses(current => [...current, { id: nanoid(10), name: requirementLabel(requirement, elements, attributes, stages), requirements: { operator: 'all', requirements: [requirement] }, yen: reqBonusYen, exp: reqBonusExp }]);
    } else {
      setRequirements((current: any) => ({ ...current, requirements: [...current.requirements, requirement] }));
    }
    setReqReference(''); setReqValue(1); setReqOptional(false); setReqBonusYen(0); setReqBonusExp(0);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("El nombre del puesto es obligatorio");
      return;
    }
    const url = position ? `/api/admin/positions/${position.id}` : `/api/admin/positions`;
    const method = position ? "PUT" : "POST";
    const parsedCap = capacity === "" || capacity === null || capacity === undefined ? null : Math.max(0, Math.floor(Number(capacity)));
    const parsedSortOrder = Number.isFinite(Number(sortOrder)) ? Math.floor(Number(sortOrder)) : 0;
    const parsedBonusYen = Number.isFinite(Number(bonusYen)) ? Math.max(0, Math.floor(Number(bonusYen))) : 0;
    const parsedBonusExp = Number.isFinite(Number(bonusExp)) ? Math.max(0, Math.floor(Number(bonusExp))) : 0;
    const parsedMinPosts = minPosts === '' || minPosts === null || minPosts === undefined ? null : Math.max(0, Math.floor(Number(minPosts)));
    
    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          name: trimmedName,
          description: description?.trim() || null,
          capacity: parsedCap,
          active: Boolean(active),
          sortOrder: parsedSortOrder,
          levelId: levelId?.trim() ? levelId.trim() : null,
          riskId: riskId?.trim() ? riskId.trim() : null,
          bonusYen: parsedBonusYen,
          bonusExp: parsedBonusExp,
          minPosts: parsedMinPosts,
          requirements: requirements ?? { operator: 'all', requirements: [] },
          optionalBonuses: optionalBonuses ?? [],
        })
      });
      if (res.ok) {
        toast.success("Posición guardada");
        setOpen(false);
        mutate();
      }
    } catch (error: any) {
      toast.error(error.message || "Error al guardar posición");
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
              <div><h3 className="font-semibold">Requisitos del puesto</h3><p className="text-xs text-muted-foreground">Añade licencias, habilidades, atributos, etapa o edad mínima como en Shadowmore.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={reqType} onValueChange={(value: any) => { setReqType(value); setReqReference(''); }}><SelectTrigger><SelectValue>{requirementTypeLabel(reqType)}</SelectValue></SelectTrigger><SelectContent><SelectItem value="owns_element">Licencia, permiso o certificado</SelectItem><SelectItem value="skill_level">Habilidad</SelectItem><SelectItem value="attribute">Atributo</SelectItem><SelectItem value="stage">Etapa mínima</SelectItem><SelectItem value="age">Edad mínima</SelectItem></SelectContent></Select>
                {reqType === 'owns_element' && (
                  <Combobox
                    value={reqReference}
                    onValueChange={setReqReference}
                    placeholder="Selecciona licencia, permiso o certificado..."
                    searchPlaceholder="Buscar licencia, permiso o certificado..."
                    groups={elementGroups}
                  />
                )}
                {reqType === 'skill_level' && (
                  <Combobox
                    value={reqReference}
                    onValueChange={setReqReference}
                    placeholder="Selecciona habilidad..."
                    searchPlaceholder="Buscar habilidad..."
                    options={skillOptions}
                  />
                )}
                {reqType === 'attribute' && <Select value={reqReference} onValueChange={setReqReference}><SelectTrigger><SelectValue placeholder="Selecciona atributo">{reqReference ? attributes.find((item: any) => (item.abbrev ?? item.id) === reqReference)?.name ?? reqReference : 'Selecciona atributo'}</SelectValue></SelectTrigger><SelectContent>{attributes.map((item: any) => <SelectItem key={item.id} value={item.abbrev ?? item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
                {reqType === 'stage' && (
                  <Select value={reqReference} onValueChange={setReqReference}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona etapa...">
                        {reqReference ? (() => {
                          const st = stages.find((s: any) => (s.id || s.name) === reqReference || s.name === reqReference);
                          return st ? `${st.name}${st.minAge !== undefined ? ` - ${st.minAge} años` : ''}` : reqReference;
                        })() : 'Selecciona etapa...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {stages.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">No hay etapas configuradas en Reglas</div>
                      ) : (
                        stages.map((st: any) => {
                          const val = st.name || st.id;
                          const label = `${st.name}${st.minAge !== undefined ? ` - ${st.minAge} años` : ''}`;
                          return <SelectItem key={val} value={val}>{label}</SelectItem>;
                        })
                      )}
                    </SelectContent>
                  </Select>
                )}
                {reqType === 'age' && <div className="flex items-center rounded-md border px-3 text-sm text-muted-foreground">Edad comprobada desde la ficha</div>}
              </div>
              {reqType !== 'owns_element' && reqType !== 'stage' && <div className="space-y-1"><Label>Valor mínimo</Label><Input type="number" min={0} value={reqValue} onChange={event => setReqValue(Number(event.target.value))} /></div>}
              <div className="flex items-center gap-2"><Checkbox id={`optional-${position?.id ?? 'new'}`} checked={reqOptional} onCheckedChange={(checked: boolean) => setReqOptional(checked)} /><Label htmlFor={`optional-${position?.id ?? 'new'}`}>Requisito opcional con bonificación</Label></div>
              {reqOptional && <div className="grid grid-cols-2 gap-3"><div><Label>Bono ¥</Label><Input type="number" min={0} value={reqBonusYen} onChange={e => setReqBonusYen(Number(e.target.value))} /></div><div><Label>Bono EXP</Label><Input type="number" min={0} value={reqBonusExp} onChange={e => setReqBonusExp(Number(e.target.value))} /></div></div>}
              <Button type="button" variant="outline" onClick={addRequirement}><Plus className="size-4 mr-2" />Añadir requisito</Button>
              <RequirementTags title="Obligatorios" items={requirements?.requirements || []} elements={elements} attributes={attributes} stages={stages} onRemove={(id: string) => setRequirements((current: any) => ({ ...current, requirements: (current?.requirements || []).filter((item: any) => item.id !== id) }))} />
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

function requirementLabel(requirement: any, elements: any[] = [], attributes: any[] = [], stages: any[] = []) {
  if (requirement.type === 'owns_element') return elements?.find(item => item.id === requirement.elementId)?.name ?? requirement.elementId;
  if (requirement.type === 'skill_level') return `${elements?.find(item => item.id === requirement.skillElementId)?.name ?? requirement.skillElementId} (Nv. ${requirement.value})`;
  if (requirement.type === 'attribute') return `${attributes?.find(item => (item.abbrev ?? item.id) === requirement.attributeId)?.name ?? requirement.attributeId} ≥ ${requirement.value}`;
  if (requirement.type === 'stage') {
    const stage = stages?.find((item: any) => (item.id || item.name) === requirement.stageId || item.name === requirement.stageId);
    const stageText = stage ? `${stage.name}${stage.minAge !== undefined ? ` - ${stage.minAge} años` : ''}` : requirement.stageId;
    return `Etapa ≥ ${stageText}`;
  }
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
  return ({ owns_element: 'Licencia, permiso o certificado', skill_level: 'Habilidad', attribute: 'Atributo', stage: 'Etapa mínima', age: 'Edad mínima' } as Record<string, string>)[type] ?? 'Requisito';
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

function RequirementTags({ title, items, elements, attributes, stages, onRemove }: any) {
  return <div className="space-y-2"><p className="text-xs font-bold uppercase text-muted-foreground">{title}</p><div className="flex flex-wrap gap-2">{items.map((item: any) => <div key={item.id} className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs"><span>{requirementLabel(item, elements, attributes, stages)}</span><Button variant="ghost" size="icon-sm" className="size-5 rounded-full" onClick={() => onRemove(item.id)}><X className="size-3" /></Button></div>)}</div>{items.length === 0 && <p className="text-xs text-muted-foreground">Sin requisitos obligatorios.</p>}</div>;
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
