import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import {
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  DollarSign,
  X,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  HandCoins,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Users,
  Eye,
  ArrowLeft,
  Building2,
  ShieldAlert,
  Award,
  Clock,
  Sparkles
} from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ItemIcon } from "@/components/common/ItemIcon";
import { ItemIconPicker } from "@/components/common/ItemIconPicker";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { Combobox } from "../components/ui/combobox";
import {
  calculateEmploymentCompensation,
  employmentCompensationSchema
} from "@/domain/employmentCompensation";
import { nanoid } from "nanoid";

export default function EmploymentsAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/employments/structure", fetcher);
  const { data: rules } = useSWR("/api/rules", fetcher);
  const { data: elements } = useSWR("/api/admin/elements", fetcher);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const compensationResult = employmentCompensationSchema.safeParse(
    rules?.find((rule: any) => rule.key === "employment_compensation")?.value
  );
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === "system_attributes")?.value ?? [];
  const stages = Array.isArray(rules?.find((rule: any) => rule.key === "system_stages")?.value)
    ? rules.find((rule: any) => rule.key === "system_stages")?.value
    : [];

  const toggleDept = (deptId: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const handleDuplicateInstitution = async (inst: any) => {
    try {
      const res = await apiFetch(`/api/admin/institutions/${inst.id}/duplicate`, {
        method: "POST"
      });
      if (res.ok) {
        toast.success(`Institución duplicada exitosamente`);
        await mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al duplicar la institución");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al duplicar la institución");
    }
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
        requirements: pos.requirements ?? { operator: "all", requirements: [] },
        optionalBonuses: pos.optionalBonuses ?? []
      };

      const res = await apiFetch("/api/admin/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Puesto duplicado como "${payload.name}"`);
        await mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al duplicar el puesto");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al duplicar el puesto");
    }
  };

  // Compute overall stats for an institution
  const getInstitutionStats = (inst: any) => {
    const depsCount = inst.departments?.length || 0;
    let employeesCount = 0;
    let totalCapacity = 0;
    let isUnlimitedCapacity = false;

    (inst.departments || []).forEach((dep: any) => {
      (dep.positions || []).forEach((pos: any) => {
        employeesCount += pos.occupiedSlots || 0;
        if (pos.capacity === null) {
          isUnlimitedCapacity = true;
        } else {
          totalCapacity += pos.capacity;
        }
      });
    });

    const vacanciesCount = isUnlimitedCapacity
      ? "Ilimitadas"
      : Math.max(0, totalCapacity - employeesCount);

    return { depsCount, employeesCount, vacanciesCount };
  };

  // Unique institutions and departments for filters
  const allInstitutions = useMemo(() => data || [], [data]);

  const availableDepartments = useMemo(() => {
    if (!data) return [];
    if (filterInstitution === "all" && !selectedInstitutionId) {
      return data.flatMap((inst: any) => inst.departments || []);
    }
    const instId = selectedInstitutionId || filterInstitution;
    const inst = data.find((i: any) => i.id === instId);
    return inst ? inst.departments || [] : [];
  }, [data, filterInstitution, selectedInstitutionId]);

  // Selected single institution object
  const selectedInstitution = useMemo(() => {
    if (!selectedInstitutionId || !data) return null;
    return data.find((inst: any) => inst.id === selectedInstitutionId) || null;
  }, [data, selectedInstitutionId]);

  // Filter logic for positions inside selected institution or list
  const filteredDepartments = useMemo(() => {
    if (!selectedInstitution) return [];
    const q = searchTerm.trim().toLowerCase();

    return (selectedInstitution.departments || [])
      .filter((dep: any) => {
        if (filterDepartment !== "all" && dep.id !== filterDepartment) return false;
        return true;
      })
      .map((dep: any) => {
        const positions = (dep.positions || []).filter((pos: any) => {
          const effectiveRisk = pos.riskId || dep.defaultRiskId || "none";
          if (filterRisk !== "all" && effectiveRisk !== filterRisk) return false;

          if (filterAvailability === "available") {
            if (pos.capacity !== null && pos.occupiedSlots >= pos.capacity) return false;
          } else if (filterAvailability === "full") {
            if (pos.capacity === null || pos.occupiedSlots < pos.capacity) return false;
          }

          if (q) {
            const matchName = pos.name.toLowerCase().includes(q);
            const matchDesc = (pos.description || "").toLowerCase().includes(q);
            const matchOccupant = (pos.occupants || []).some((occ: any) =>
              occ.name.toLowerCase().includes(q)
            );
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
        if (q || filterRisk !== "all" || filterAvailability !== "all") {
          return dep.positions.length > 0;
        }
        return true;
      });
  }, [selectedInstitution, searchTerm, filterDepartment, filterRisk, filterAvailability, elements, attributes, stages]);

  if (isLoading)
    return <div className="p-8 font-oxanium text-sm">Cargando catálogo de empleos...</div>;
  if (error)
    return <div className="p-8 text-red-500 font-oxanium text-sm">Error al cargar empleos</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <SectionHeader
        icon={Briefcase}
        title="Catálogo de Empleos e Instituciones"
        description="Administra instituciones, áreas y puestos laborales con control visual e integraciones."
        actions={
          <div className="flex items-center gap-2">
            <EmploymentPaymentsDialog structure={data ?? []} />
            <InstitutionDialog mutate={mutate} />
          </div>
        }
      />

      {/* VISTA 1: VISTA DE CATÁLOGO GENERAL (GRID DE 2 COLUMNAS CON TARJETAS DE INSTITUCIONES) */}
      {!selectedInstitutionId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-oxanium text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Instituciones Registradas ({allInstitutions.length})
            </h2>
          </div>

          {allInstitutions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground font-oxanium">
              No hay instituciones registradas. Haz clic en "Nueva Institución" para comenzar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allInstitutions.map((inst: any) => {
                const stats = getInstitutionStats(inst);

                return (
                  <div
                    key={inst.id}
                    className="rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between space-y-4"
                  >
                    {/* Header de la Tarjeta */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <ItemIcon
                              iconType={inst.iconType}
                              iconValue={inst.iconValue}
                              fallbackIcon={Briefcase}
                              className="size-5 text-primary"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-oxanium text-base font-bold text-foreground truncate flex items-center gap-2">
                              {inst.name}
                              {!inst.active && (
                                <span className="text-[10px] font-oxanium px-1.5 py-0.2 rounded bg-destructive/15 text-destructive font-semibold">
                                  Inactivo
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {inst.description || "Sin descripción corta"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Métricas / Stats de la Institución */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center font-oxanium text-xs">
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Departamentos</span>
                          <span className="font-bold text-foreground">{stats.depsCount}</span>
                        </div>
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Empleados</span>
                          <span className="font-bold text-cyan-400">{stats.employeesCount}</span>
                        </div>
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="block text-[10px] text-muted-foreground uppercase font-semibold">Vacantes</span>
                          <span className="font-bold text-emerald-400">{stats.vacanciesCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción de la Institución */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 font-oxanium text-xs gap-1.5 flex-1"
                        onClick={() => setSelectedInstitutionId(inst.id)}
                      >
                        <Eye className="size-3.5" /> Ver Institución
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="size-8 rounded hover:text-foreground"
                          title="Duplicar institución"
                          onClick={() => handleDuplicateInstitution(inst)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <InstitutionDialog institution={inst} mutate={mutate} />
                        <DeleteAction type="institutions" id={inst.id} mutate={mutate} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: DETALLE DE LA INSTITUCIÓN SELECCIONADA CON FILTROS Y TABLA DE PUESTOS */
        <div className="space-y-6">
          {/* Banner / Cabecera de la Institución en Vista Detallada */}
          <div className="rounded-lg border border-border/80 bg-card/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 font-oxanium text-xs"
                  onClick={() => setSelectedInstitutionId(null)}
                >
                  <ArrowLeft className="size-3.5" /> Volver a Instituciones
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {selectedInstitution && (
                  <DepartmentDialog institutionId={selectedInstitution.id} mutate={mutate} />
                )}
                {selectedInstitution && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-oxanium gap-1"
                    title="Duplicar institución"
                    onClick={() => handleDuplicateInstitution(selectedInstitution)}
                  >
                    <Copy className="size-3.5" /> Duplicar
                  </Button>
                )}
                {selectedInstitution && (
                  <InstitutionDialog institution={selectedInstitution} mutate={mutate} />
                )}
                {selectedInstitution && (
                  <DeleteAction type="institutions" id={selectedInstitution.id} mutate={mutate} />
                )}
              </div>
            </div>

            {selectedInstitution && (
              <div className="flex items-center gap-4 pt-2">
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <ItemIcon
                    iconType={selectedInstitution.iconType}
                    iconValue={selectedInstitution.iconValue}
                    fallbackIcon={Briefcase}
                    className="size-6 text-primary"
                  />
                </div>
                <div>
                  <h1 className="font-oxanium text-xl font-bold text-foreground flex items-center gap-2">
                    {selectedInstitution.name}
                    {!selectedInstitution.active && (
                      <span className="text-xs font-oxanium px-2 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">
                        Inactivo
                      </span>
                    )}
                  </h1>
                  {selectedInstitution.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedInstitution.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Barra de Búsqueda y Filtros Rápidos */}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-oxanium uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <span className="size-3 flex items-center justify-center font-bold">§</span> Área / Departamento
                </label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="h-8 bg-background/70 text-xs">
                    <SelectValue placeholder="Todas las Áreas">
                      {filterDepartment === "all"
                        ? "Todas las Áreas"
                        : availableDepartments.find((d: any) => d.id === filterDepartment)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Áreas</SelectItem>
                    {availableDepartments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
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
                      {filterAvailability === "all"
                        ? "Todos los puestos"
                        : filterAvailability === "available"
                        ? "Solo con vacantes"
                        : "Ocupados al 100%"}
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

          {/* Lista/Tabla de Departamentos y Puestos agrupados */}
          {filteredDepartments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground font-oxanium">
              No se encontraron puestos ni áreas con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDepartments.map((dep: any) => {
                const isCollapsed = Boolean(collapsedDepts[dep.id]);
                const positionsCount = dep.positions?.length || 0;

                return (
                  <div
                    key={dep.id}
                    className="rounded-lg border border-border/80 bg-card/60 overflow-hidden shadow-xs"
                  >
                    {/* Encabezado del Departamento con Toggle Expandir / [+ Nuevo puesto] */}
                    <div className="px-4 py-3 bg-muted/30 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleDept(dep.id)}
                        className="flex items-center gap-2.5 text-left hover:text-primary transition-colors min-w-0 flex-1"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <span className="font-oxanium text-sm font-bold text-foreground truncate flex items-center gap-2">
                            {dep.name} {!dep.active && <span className="text-destructive text-xs font-normal">(Inactivo)</span>}
                            {dep.defaultLevelId && (
                              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-muted/80 text-foreground font-mono">
                                Resp: {employmentLevelFallbackLabel(dep.defaultLevelId)}
                              </span>
                            )}
                            {dep.defaultRiskId && (
                              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">
                                Riesgo: {employmentRiskFallbackLabel(dep.defaultRiskId)}
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {positionsCount} {positionsCount === 1 ? "puesto" : "puestos"}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <PositionDialog department={dep} mutate={mutate} />
                        <DepartmentDialog department={dep} institutionId={selectedInstitution!.id} mutate={mutate} />
                        <DeleteAction type="departments" id={dep.id} mutate={mutate} />
                      </div>
                    </div>

                    {/* Tabla de Puestos del Departamento */}
                    {!isCollapsed && (
                      <div className="p-2 overflow-x-auto">
                        {positionsCount === 0 ? (
                          <p className="text-xs text-muted-foreground italic p-4 text-center">
                            Sin puestos configurados en esta área.
                          </p>
                        ) : (
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="border-b border-border/50 text-[10px] font-oxanium uppercase font-bold text-muted-foreground bg-muted/20">
                                <th className="p-2.5">Puesto / Descripción</th>
                                <th className="p-2.5">Nivel Riesgo</th>
                                <th className="p-2.5">Responsabilidad</th>
                                <th className="p-2.5">Requisito / Etapa</th>
                                <th className="p-2.5">Remuneración</th>
                                <th className="p-2.5">Posts para Cobrar</th>
                                <th className="p-2.5">Vacantes</th>
                                <th className="p-2.5 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {dep.positions.map((pos: any) => {
                                const occupied = pos.occupiedSlots || 0;
                                const capacity = pos.capacity;
                                const isFull = capacity !== null && occupied >= capacity;
                                const isVacant = capacity === null || occupied < capacity;

                                const effectiveLevel = pos.levelId || dep.defaultLevelId;
                                const effectiveRisk = pos.riskId || dep.defaultRiskId;

                                const quote =
                                  compensation && effectiveLevel && effectiveRisk
                                    ? calculateEmploymentCompensation(
                                        compensation,
                                        effectiveLevel,
                                        effectiveRisk,
                                        pos.bonusYen || 0,
                                        pos.bonusExp || 0
                                      )
                                    : null;

                                const riskColor =
                                  effectiveRisk === "extreme"
                                    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                    : effectiveRisk === "serious"
                                    ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                    : effectiveRisk === "moderate"
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                    : "text-muted-foreground bg-muted/40 border-border/40";

                                // Summarize age/stage minimum requirements
                                const minReqText = pos.requirements?.requirements?.length
                                  ? requirementLabel(pos.requirements.requirements[0], elements, attributes, stages)
                                  : "Sin requisito";

                                return (
                                  <tr key={pos.id} className="hover:bg-muted/15 transition-colors">
                                    {/* Nombre + Descripción */}
                                    <td className="p-2.5 max-w-[220px]">
                                      <div className="font-oxanium font-bold text-foreground text-sm flex items-center gap-1.5">
                                        {pos.name}
                                        {!pos.active && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/15 text-rose-400 font-bold uppercase">
                                            Inactivo
                                          </span>
                                        )}
                                      </div>
                                      {pos.description && (
                                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                                          {pos.description}
                                        </div>
                                      )}
                                    </td>

                                    {/* Riesgo */}
                                    <td className="p-2.5 font-oxanium whitespace-nowrap">
                                      <span
                                        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${riskColor}`}
                                      >
                                        {employmentRiskFallbackLabel(effectiveRisk || "none")}
                                      </span>
                                    </td>

                                    {/* Responsabilidad */}
                                    <td className="p-2.5 font-oxanium whitespace-nowrap">
                                      <span className="px-1.5 py-0.5 rounded bg-muted/80 text-foreground font-mono text-[10px]">
                                        {employmentLevelFallbackLabel(effectiveLevel || "Sin nivel")}
                                      </span>
                                    </td>

                                    {/* Edad / Etapa Mínima */}
                                    <td className="p-2.5 text-[11px] text-muted-foreground max-w-[160px] truncate">
                                      {minReqText}
                                    </td>

                                    {/* Remuneración */}
                                    <td className="p-2.5 font-mono whitespace-nowrap">
                                      {quote ? (
                                        <div className="text-xs text-emerald-400 font-bold">
                                          ¥{quote.totalYen.toLocaleString()}{" "}
                                          <span className="text-cyan-400 font-normal">
                                            / +{quote.totalExp} EXP
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground font-sans">
                                          Sin tabulador
                                        </span>
                                      )}
                                    </td>

                                    {/* Posts para Cobrar */}
                                    <td className="p-2.5 font-mono whitespace-nowrap text-xs">
                                      {pos.minPosts ? (
                                        <span className="font-semibold text-foreground">{pos.minPosts} posts</span>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground font-sans">Sin mínimo</span>
                                      )}
                                    </td>

                                    {/* Vacantes */}
                                    <td className="p-2.5 font-oxanium whitespace-nowrap">
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-foreground">
                                          {occupied} / {capacity === null ? "∞" : capacity}
                                        </span>
                                        {isVacant && (
                                          <span className="text-[9px] font-bold text-emerald-400 px-1 py-0.2 rounded bg-emerald-500/10">
                                            Libre
                                          </span>
                                        )}
                                        {isFull && (
                                          <span className="text-[9px] font-bold text-rose-400 px-1 py-0.2 rounded bg-rose-500/10">
                                            Lleno
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-2.5 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1">
                                        {/* Botón Ver (Detalles + Personajes) */}
                                        <PositionDetailDialog position={pos} mutate={mutate} />

                                        {/* Botón Duplicar */}
                                        <Button
                                          variant="ghost"
                                          size="icon-sm"
                                          className="size-7 rounded text-muted-foreground hover:text-foreground"
                                          title="Duplicar puesto"
                                          onClick={() => handleDuplicatePosition(pos)}
                                        >
                                          <Copy className="size-3.5" />
                                        </Button>

                                        {/* Botón Editar */}
                                        <PositionDialog position={pos} department={dep} mutate={mutate} />

                                        {/* Botón Borrar */}
                                        <DeleteAction type="positions" id={pos.id} mutate={mutate} />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Diálogo para Ver Detalle del Puesto y Personajes Asignados
function PositionDetailDialog({ position, mutate }: { position: any; mutate: any }) {
  const [open, setOpen] = useState(false);
  const { data: rules } = useSWR(open ? "/api/rules" : null, fetcher);
  const { data: elements } = useSWR(open ? "/api/admin/elements" : null, fetcher);

  const compensationResult = employmentCompensationSchema.safeParse(
    rules?.find((rule: any) => rule.key === "employment_compensation")?.value
  );
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === "system_attributes")?.value ?? [];
  const stages = Array.isArray(rules?.find((rule: any) => rule.key === "system_stages")?.value)
    ? rules.find((rule: any) => rule.key === "system_stages")?.value
    : [];

  const occupants = position.occupants || [];
  const capacity = position.capacity;
  const occupied = position.occupiedSlots || 0;
  const quote =
    compensation && position.levelId && position.riskId
      ? calculateEmploymentCompensation(
          compensation,
          position.levelId,
          position.riskId,
          position.bonusYen || 0,
          position.bonusExp || 0
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="size-7 rounded text-muted-foreground hover:text-primary" title="Ver detalle del puesto y personajes" />}>
        <Eye className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="admin-dialog sm:max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <DialogHeader>
          <DialogTitle className="font-oxanium text-lg flex items-center justify-between gap-2">
            <span>Puesto: {position.name}</span>
            <span className="text-xs font-mono font-normal text-muted-foreground">
              Cupo: {occupied} / {capacity === null ? "∞" : capacity}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Descripción e información general */}
        {position.description && (
          <div className="bg-muted/30 p-3 rounded-md text-xs text-muted-foreground">
            {position.description}
          </div>
        )}

        {/* Remuneración y Clasificación */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-oxanium">
          <div className="bg-background/80 p-2.5 rounded border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Nivel Responsabilidad</span>
            <span className="font-bold text-foreground">
              {employmentLevelFallbackLabel(position.levelId || "Sin configurar")}
            </span>
          </div>
          <div className="bg-background/80 p-2.5 rounded border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Nivel de Riesgo</span>
            <span className="font-bold text-amber-400">
              {employmentRiskFallbackLabel(position.riskId || "Ninguno")}
            </span>
          </div>
          <div className="bg-background/80 p-2.5 rounded border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Posts para Cobrar</span>
            <span className="font-bold text-foreground font-mono">
              {position.minPosts ? `${position.minPosts} posts min.` : "Sin mínimo"}
            </span>
          </div>
          <div className="bg-background/80 p-2.5 rounded border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Sueldo Base</span>
            <span className="font-bold text-emerald-400 font-mono">
              {quote ? `¥${quote.totalYen.toLocaleString()} / +${quote.totalExp} EXP` : "Sin calcular"}
            </span>
          </div>
        </div>

        {/* Requisitos Obligatorios */}
        <div className="space-y-2">
          <h4 className="text-xs font-oxanium font-bold uppercase text-muted-foreground">Requisitos Obligatorios</h4>
          {position.requirements?.requirements?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {position.requirements.requirements.map((req: any) => (
                <span
                  key={req.id || nanoid()}
                  className="px-2 py-1 rounded border border-border/80 bg-background text-xs font-medium"
                >
                  {requirementLabel(req, elements, attributes, stages)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin requisitos requeridos para este puesto.</p>
          )}
        </div>

        {/* Personajes Asignados a este Puesto */}
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-oxanium font-bold uppercase text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3.5" /> Personajes Asignados ({occupants.length})
            </h4>
            <EmploymentAssignmentDialog position={position} mutate={mutate} />
          </div>

          {occupants.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-3 text-center border border-dashed rounded">
              Actualmente no hay personajes en este puesto.
            </p>
          ) : (
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
                        {occ.characterId ? `Ficha #${occ.characterId}` : "Personaje Canon"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title={`Retirar a ${occ.name}`}
                    onClick={async () => {
                      try {
                        await apiFetch(`/api/admin/employments/${occ.employmentId}`, { method: "DELETE" });
                        toast.success(`${occ.name} fue retirado del puesto`);
                        await mutate();
                      } catch (error: any) {
                        toast.error(error.message || "No se pudo retirar el empleo");
                      }
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmploymentPaymentsDialog({ structure }: any) {
  const [open, setOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<
    Record<string, { postsObserved: number; approved: boolean; optionalBonusIds: string[] }>
  >({});
  const [saving, setSaving] = useState(false);
  const { data: history, mutate: mutateHistory } = useSWR(
    open ? "/api/admin/employment-payments" : null,
    fetcher
  );
  const { data: rules } = useSWR(open ? "/api/rules" : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(
    rules?.find((rule: any) => rule.key === "employment_compensation")?.value
  );
  const compensation = compensationResult.success ? compensationResult.data : null;
  const rows = structure.flatMap((institution: any) =>
    institution.departments.flatMap((department: any) =>
      department.positions.flatMap((position: any) =>
        (position.occupants ?? []).map((occupant: any) => ({ ...occupant, position }))
      )
    )
  );
  const selectedRows = rows.filter((row: any) => selected[row.employmentId]);
  const quoteFor = (row: any) => {
    if (!compensation || !row.position.levelId || !row.position.riskId) return null;
    const chosen = (row.position.optionalBonuses ?? []).filter((bonus: any) =>
      selected[row.employmentId]?.optionalBonusIds.includes(bonus.id)
    );
    return calculateEmploymentCompensation(
      compensation,
      row.position.levelId,
      row.position.riskId,
      row.position.bonusYen + chosen.reduce((sum: number, bonus: any) => sum + bonus.yen, 0),
      row.position.bonusExp + chosen.reduce((sum: number, bonus: any) => sum + bonus.exp, 0)
    );
  };
  const totals = selectedRows.reduce(
    (sum: any, row: any) => {
      const quote = quoteFor(row);
      return { yen: sum.yen + (quote?.totalYen ?? 0), exp: sum.exp + (quote?.totalExp ?? 0) };
    },
    { yen: 0, exp: 0 }
  );

  const toggle = (row: any, checked: boolean) =>
    setSelected(current => {
      const next = { ...current };
      if (checked)
        next[row.employmentId] = {
          postsObserved: row.position.minPosts ?? 0,
          approved: false,
          optionalBonusIds: []
        };
      else delete next[row.employmentId];
      return next;
    });
  const patchSelection = (
    id: string,
    patch: Partial<{ postsObserved: number; approved: boolean; optionalBonusIds: string[] }>
  ) => setSelected(current => ({ ...current, [id]: { ...current[id], ...patch } }));

  const pay = async () => {
    if (!periodLabel.trim()) return toast.error("Indica el periodo de pago");
    if (selectedRows.length === 0) return toast.error("Selecciona al menos un empleo");
    if (selectedRows.some((row: any) => !row.characterId))
      return toast.error("Los personajes sin ficha vinculada no pueden recibir saldo");
    if (selectedRows.some((row: any) => !selected[row.employmentId].approved))
      return toast.error("Aprueba manualmente los posts de cada pago");
    setSaving(true);
    try {
      await apiFetch("/api/admin/employment-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodLabel,
          notes,
          items: selectedRows.map((row: any) => ({
            employmentId: row.employmentId,
            postsObserved: selected[row.employmentId].postsObserved,
            minimumPostsApproved: true,
            optionalBonusIds: selected[row.employmentId].optionalBonusIds
          }))
        })
      });
      toast.success(
        `${selectedRows.length} pago${selectedRows.length === 1 ? "" : "s"} aplicado${
          selectedRows.length === 1 ? "" : "s"
        }`
      );
      setSelected({});
      setNotes("");
      await mutateHistory();
    } catch (error: any) {
      toast.error(error.message || "No se pudo completar el lote de pagos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-9" />}>
        <HandCoins className="mr-2 size-4" /> Preparar pagos
      </DialogTrigger>
      <DialogContent className="admin-dialog max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Pagos manuales de empleos</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Input
                value={periodLabel}
                onChange={event => setPeriodLabel(event.target.value)}
                placeholder="Ej. Septiembre 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas del moderador</Label>
              <Input
                value={notes}
                onChange={event => setNotes(event.target.value)}
                placeholder="Revisión del foro, incidencias..."
              />
            </div>
          </div>
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                No hay empleados activos para pagar.
              </p>
            )}
            {rows.map((row: any) => {
              const entry = selected[row.employmentId];
              const quote = entry ? quoteFor(row) : null;
              return (
                <div key={row.employmentId} className="rounded-md border p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={Boolean(entry)}
                      onCheckedChange={(checked: boolean) => toggle(row, checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.position.name}
                            {!row.characterId ? " · Sin ficha vinculada" : ""}
                          </p>
                        </div>
                        {quote && (
                          <p className="font-mono text-sm text-emerald-400">
                            ¥{quote.totalYen} · +{quote.totalExp} EXP
                          </p>
                        )}
                      </div>
                      {entry && (
                        <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Posts observados</Label>
                            <Input
                              type="number"
                              min={0}
                              value={entry.postsObserved}
                              onChange={event =>
                                patchSelection(row.employmentId, {
                                  postsObserved: Number(event.target.value)
                                })
                              }
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Mínimo del puesto: {row.position.minPosts ?? "sin mínimo"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={entry.approved}
                              onCheckedChange={(approved: boolean) =>
                                patchSelection(row.employmentId, { approved })
                              }
                            />
                            <Label>Posts revisados y aprobados</Label>
                          </div>
                          {(row.position.optionalBonuses ?? []).length > 0 && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>Bonificaciones aplicables</Label>
                              {row.position.optionalBonuses.map((bonus: any) => (
                                <label
                                  key={bonus.id}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <Checkbox
                                    checked={entry.optionalBonusIds.includes(bonus.id)}
                                    onCheckedChange={(checked: boolean) =>
                                      patchSelection(row.employmentId, {
                                        optionalBonusIds: checked
                                          ? [...entry.optionalBonusIds, bonus.id]
                                          : entry.optionalBonusIds.filter(
                                              (id: string) => id !== bonus.id
                                            )
                                      })
                                    }
                                  />
                                  <span>
                                    {bonus.name} · +¥{bonus.yen} / +{bonus.exp} EXP
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase">Total del lote</p>
              <p className="text-lg font-bold text-emerald-400">
                ¥{totals.yen} <span className="text-cyan-400">· +{totals.exp} EXP</span>
              </p>
            </div>
            <Button onClick={pay} disabled={saving || selectedRows.length === 0}>
              {saving
                ? "Aplicando..."
                : `Confirmar ${selectedRows.length} pago${
                    selectedRows.length === 1 ? "" : "s"
                  }`}
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Historial reciente</h3>
            {history?.slice(0, 10).map((payment: any) => (
              <div
                key={payment.id}
                className="flex flex-wrap justify-between gap-2 rounded border p-2 text-xs"
              >
                <span>
                  <strong>{payment.characterName}</strong> · {payment.positionName} ·{" "}
                  {payment.periodLabel}
                </span>
                <span className="text-emerald-400">
                  ¥{payment.totalYen} · +{payment.totalExp} EXP
                </span>
              </div>
            ))}
            {history?.length === 0 && (
              <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmploymentAssignmentDialog({ position, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState("");
  const [saving, setSaving] = useState(false);
  const { data: characters } = useSWR(open ? "/api/admin/characters" : null, fetcher);
  const { data: canonCharacters } = useSWR(open ? "/api/admin/canon-characters" : null, fetcher);

  const assigned = new Set(
    (position.occupants ?? []).flatMap((occupant: any) =>
      [
        occupant.characterId ? `character:${occupant.characterId}` : null,
        occupant.canonCharacterId ? `canon:${occupant.canonCharacterId}` : null
      ].filter(Boolean)
    )
  );
  const options = [
    ...(characters ?? [])
      .filter((item: any) => !item.canonCharacterId)
      .map((item: any) => ({ value: `character:${item.id}`, label: item.name })),
    ...(canonCharacters ?? []).map((item: any) => ({
      value: `canon:${item.id}`,
      label: `${item.name} (canon)`
    }))
  ].filter(option => !assigned.has(option.value));
  const full = position.capacity !== null && position.occupiedSlots >= position.capacity;

  const assign = async () => {
    const [kind, id] = selection.split(":");
    if (!kind || !id) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/employments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId: position.id,
          ...(kind === "canon" ? { canonCharacterId: id } : { characterId: Number(id) })
        })
      });
      toast.success("Empleo asignado");
      setSelection("");
      setOpen(false);
      await mutate();
    } catch (error: any) {
      const message = String(error.message ?? "");
      if (message.includes("Employment requirements not met"))
        toast.error("El personaje no cumple los requisitos obligatorios del puesto.");
      else if (message.includes("capacity")) toast.error("El puesto ya alcanzó su capacidad máxima.");
      else if (message.includes("already holds")) toast.error("El personaje ya ocupa este puesto.");
      else toast.error(message || "No se pudo asignar el empleo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={!position.active || full}
            className="h-7 font-oxanium text-[10px] uppercase tracking-wider gap-1"
          />
        }
      >
        <UserPlus className="size-3" /> {full ? "Sin cupos" : "Asignar"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar personaje a {position.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al confirmar, el sistema comprobará la capacidad y, cuando exista una ficha, sus
            requisitos obligatorios. Los personajes canon sin ficha quedarán pendientes de
            verificación manual.
          </p>
          <div className="space-y-2">
            <Label>Personaje</Label>
            <Combobox
              value={selection}
              onValueChange={setSelection}
              placeholder="Selecciona un personaje..."
              searchPlaceholder="Buscar personaje..."
              options={options.map(opt => ({ value: opt.value, label: opt.label }))}
            />
            {options.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay personajes disponibles para este puesto.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={assign} disabled={!selection || saving}>
            {saving ? "Comprobando..." : "Comprobar y asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstitutionDialog({ institution, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(institution?.name || "");
  const [description, setDescription] = useState(institution?.description || "");
  const [iconType, setIconType] = useState<"lucide" | "emoji" | null>(institution?.iconType || null);
  const [iconValue, setIconValue] = useState<string | null>(institution?.iconValue || null);
  const [active, setActive] = useState(institution ? institution.active : true);
  const [sortOrder, setSortOrder] = useState(institution?.sortOrder || 0);

  useEffect(() => {
    if (open) {
      setName(institution?.name || "");
      setDescription(institution?.description || "");
      setIconType(institution?.iconType || null);
      setIconValue(institution?.iconValue || null);
      setActive(institution ? institution.active : true);
      setSortOrder(institution?.sortOrder || 0);
    }
  }, [open, institution]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("El nombre de la institución es obligatorio");
    const url = institution ? `/api/admin/institutions/${institution.id}` : `/api/admin/institutions`;
    const method = institution ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        iconType,
        iconValue,
        active,
        sortOrder: Number(sortOrder) || 0
      })
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
      <DialogTrigger
        render={
          <Button
            variant={institution ? "ghost" : "default"}
            size={institution ? "icon-sm" : "sm"}
            className={!institution ? "h-9" : ""}
          />
        }
      >
        {institution ? (
          <Edit2 className="size-4" />
        ) : (
          <>
            <Plus className="size-3.5 mr-1" /> Nueva Institución{" "}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="admin-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{institution ? "Editar" : "Nueva"} Institución</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Institución</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Policía de Neo-Tokyo, Hospital Central..." />
          </div>

          <div className="space-y-2">
            <Label>Icono / Emoji Reconocible</Label>
            <ItemIconPicker
              iconType={iconType}
              iconValue={iconValue}
              itemName={name}
              onChange={(type, val) => {
                setIconType(type);
                setIconValue(val);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción Breve</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve resumen de la entidad..." />
          </div>

          <div className="space-y-2">
            <Label>Orden de aparición (menor número va primero)</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="active-inst" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-inst" className="text-sm font-medium">
              Institución Activa
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar Institución</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentDialog({ department, institutionId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(department?.name || "");
  const [description, setDescription] = useState(department?.description || "");
  const [defaultLevelId, setDefaultLevelId] = useState<string>(department?.defaultLevelId || "");
  const [defaultRiskId, setDefaultRiskId] = useState<string>(department?.defaultRiskId || "");
  const [active, setActive] = useState(department ? department.active : true);
  const [sortOrder, setSortOrder] = useState(department?.sortOrder || 0);

  const { data: rules } = useSWR(open ? "/api/rules" : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(
    rules?.find((rule: any) => rule.key === "employment_compensation")?.value
  );
  const compensation = compensationResult.success ? compensationResult.data : null;

  useEffect(() => {
    if (open) {
      setName(department?.name || "");
      setDescription(department?.description || "");
      setDefaultLevelId(department?.defaultLevelId || "");
      setDefaultRiskId(department?.defaultRiskId || "");
      setActive(department ? department.active : true);
      setSortOrder(department?.sortOrder || 0);
    }
  }, [open, department]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("El nombre del departamento es obligatorio");
    const url = department ? `/api/admin/departments/${department.id}` : `/api/admin/departments`;
    const method = department ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionId,
        name: name.trim(),
        description: description.trim() || null,
        defaultLevelId: defaultLevelId || null,
        defaultRiskId: defaultRiskId || null,
        active,
        sortOrder: Number(sortOrder) || 0
      })
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
      <DialogTrigger
        render={
          <Button
            variant={department ? "ghost" : "outline"}
            size={department ? "icon-sm" : "sm"}
            className={!department ? "h-7 font-oxanium text-[10px] uppercase tracking-wider gap-1" : ""}
          />
        }
      >
        {department ? (
          <Edit2 className="size-4" />
        ) : (
          <>
            <Plus className="size-3 mr-1" /> Nuevo Depto.
          </>
        )}
      </DialogTrigger>
      <DialogContent className="admin-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{department ? "Editar" : "Nuevo"} Departamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Área / Departamento</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Investigación, Seguridad Especial, Administración..." />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Propósito del departamento..." />
          </div>

          {/* Valores por defecto de Nivel de Responsabilidad y Riesgo */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
            <div className="space-y-1.5">
              <Label className="text-xs">Responsabilidad por Defecto</Label>
              <Select value={defaultLevelId} onValueChange={setDefaultLevelId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin asignar (Opcional)">
                    {defaultLevelId ? employmentLevelFallbackLabel(defaultLevelId) : "Sin asignar (Opcional)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar (Opcional)</SelectItem>
                  {compensation?.levels?.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  )) ?? (
                    <>
                      <SelectItem value="level_1">Nivel I</SelectItem>
                      <SelectItem value="level_2">Nivel II</SelectItem>
                      <SelectItem value="level_3">Nivel III</SelectItem>
                      <SelectItem value="level_4">Nivel IV</SelectItem>
                      <SelectItem value="level_5">Nivel V</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Riesgo por Defecto</Label>
              <Select value={defaultRiskId} onValueChange={setDefaultRiskId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin asignar (Opcional)">
                    {defaultRiskId ? employmentRiskFallbackLabel(defaultRiskId) : "Sin asignar (Opcional)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar (Opcional)</SelectItem>
                  <SelectItem value="none">Ninguno</SelectItem>
                  <SelectItem value="low">Leve</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="serious">Grave</SelectItem>
                  <SelectItem value="extreme">Extremo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="active-dep" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-dep" className="text-sm font-medium">
              Departamento Activo
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar Departamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PositionDialog({ position, department, departmentId, mutate }: any) {
  const targetDeptId = departmentId || department?.id;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(position?.name || "");
  const [description, setDescription] = useState(position?.description || "");
  const [capacity, setCapacity] = useState(
    position?.capacity === null || position?.capacity === undefined
      ? ""
      : position?.capacity?.toString() || ""
  );
  const [active, setActive] = useState(position ? position.active : true);
  const [sortOrder, setSortOrder] = useState(position?.sortOrder || 0);

  // Pre-fill level & risk with department defaults if creating new position
  const initialLevel = position?.levelId ?? department?.defaultLevelId ?? "level_4";
  const initialRisk = position?.riskId ?? department?.defaultRiskId ?? "moderate";

  const [levelId, setLevelId] = useState(initialLevel);
  const [riskId, setRiskId] = useState(initialRisk);
  const [bonusYen, setBonusYen] = useState(position?.bonusYen ?? 0);
  const [bonusExp, setBonusExp] = useState(position?.bonusExp ?? 0);
  const [minPosts, setMinPosts] = useState(
    position?.minPosts === null || position?.minPosts === undefined ? "" : String(position.minPosts)
  );
  const [requirements, setRequirements] = useState<any>(
    position?.requirements ?? { operator: "all", requirements: [] }
  );
  const [optionalBonuses, setOptionalBonuses] = useState<any[]>(position?.optionalBonuses ?? []);
  const [reqType, setReqType] = useState<"owns_element" | "skill_level" | "attribute" | "stage" | "age">(
    "owns_element"
  );
  const [reqReference, setReqReference] = useState("");
  const [reqValue, setReqValue] = useState(1);
  const [reqOptional, setReqOptional] = useState(false);
  const [reqBonusYen, setReqBonusYen] = useState(0);
  const [reqBonusExp, setReqBonusExp] = useState(0);

  useEffect(() => {
    if (open) {
      setName(position?.name || "");
      setDescription(position?.description || "");
      setCapacity(
        position?.capacity === null || position?.capacity === undefined
          ? ""
          : position.capacity.toString()
      );
      setActive(position ? position.active : true);
      setSortOrder(position?.sortOrder || 0);
      setLevelId(position?.levelId ?? department?.defaultLevelId ?? "level_4");
      setRiskId(position?.riskId ?? department?.defaultRiskId ?? "moderate");
      setBonusYen(position?.bonusYen ?? 0);
      setBonusExp(position?.bonusExp ?? 0);
      setMinPosts(
        position?.minPosts === null || position?.minPosts === undefined ? "" : String(position.minPosts)
      );
      setRequirements(
        position?.requirements
          ? JSON.parse(JSON.stringify(position.requirements))
          : { operator: "all", requirements: [] }
      );
      setOptionalBonuses(
        position?.optionalBonuses ? JSON.parse(JSON.stringify(position.optionalBonuses)) : []
      );
      setReqType("owns_element");
      setReqReference("");
      setReqValue(1);
      setReqOptional(false);
      setReqBonusYen(0);
      setReqBonusExp(0);
    }
  }, [open, position, department]);

  const { data: rules } = useSWR(open ? "/api/rules" : null, fetcher);
  const { data: elements } = useSWR(open ? "/api/admin/elements" : null, fetcher);
  const compensationResult = employmentCompensationSchema.safeParse(
    rules?.find((rule: any) => rule.key === "employment_compensation")?.value
  );
  const compensation = compensationResult.success ? compensationResult.data : null;
  const attributes = rules?.find((rule: any) => rule.key === "system_attributes")?.value ?? [];
  const stages = Array.isArray(rules?.find((rule: any) => rule.key === "system_stages")?.value)
    ? rules.find((rule: any) => rule.key === "system_stages")?.value
    : [];

  const quote =
    compensation && levelId && riskId
      ? calculateEmploymentCompensation(
          compensation,
          levelId,
          riskId,
          Number(bonusYen) || 0,
          Number(bonusExp) || 0
        )
      : null;

  const addRequirement = () => {
    if (!reqReference && reqType !== "age") return toast.error("Selecciona la referencia del requisito");
    const id = nanoid();
    let newReq: any = { id, type: reqType };
    if (reqType === "owns_element") newReq.elementId = reqReference;
    else if (reqType === "skill_level") {
      newReq.skillElementId = reqReference;
      newReq.value = reqValue;
    } else if (reqType === "attribute") {
      newReq.attributeId = reqReference;
      newReq.value = reqValue;
    } else if (reqType === "stage") newReq.stageId = reqReference;
    else if (reqType === "age") newReq.value = reqValue;

    if (reqOptional) {
      setOptionalBonuses(curr => [
        ...curr,
        {
          id,
          name: `Requisito opcional (${requirementLabel(newReq, elements, attributes, stages)})`,
          yen: reqBonusYen,
          exp: reqBonusExp,
          requirements: [newReq]
        }
      ]);
    } else {
      setRequirements((curr: any) => ({
        ...curr,
        requirements: [...(curr?.requirements || []), newReq]
      }));
    }
    setReqReference("");
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("El nombre del puesto es obligatorio");
      return;
    }
    const url = position ? `/api/admin/positions/${position.id}` : `/api/admin/positions`;
    const method = position ? "PUT" : "POST";
    const parsedCap = capacity === "" ? null : Number(capacity);

    const payload = {
      departmentId: targetDeptId,
      name: trimmedName,
      description: description.trim() || null,
      capacity: parsedCap !== null && !isNaN(parsedCap) ? parsedCap : null,
      active,
      sortOrder: Number(sortOrder) || 0,
      levelId: levelId || null,
      riskId: riskId || null,
      bonusYen: Number(bonusYen) || 0,
      bonusExp: Number(bonusExp) || 0,
      minPosts: minPosts === "" ? null : Number(minPosts),
      requirements,
      optionalBonuses
    };

    try {
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("Puesto guardado");
        setOpen(false);
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar el puesto");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el servidor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={position ? "ghost" : "default"}
            size={position ? "icon-sm" : "sm"}
            className={!position ? "h-7 text-xs gap-1 font-oxanium" : "size-7 rounded"}
          >
            {position ? (
              <Edit2 className="size-3.5" />
            ) : (
              <>
                <Plus className="size-3 mr-1" /> Nuevo Puesto
              </>
            )}
          </Button>
        }
      >
        {position ? (
          <Edit2 className="size-3.5" />
        ) : (
          <>
            <Plus className="size-3 mr-1" /> Nuevo Puesto
          </>
        )}
      </DialogTrigger>
      <DialogContent className="admin-dialog max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{position ? "Editar" : "Nuevo"} Puesto de Trabajo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del puesto</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Oficial de Patrulla, Médico Cirujano..." />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Funciones y responsabilidades..." />
            </div>
            <div className="space-y-2">
              <Label>Capacidad máxima (vacantes)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Deja vacío para cupo ilimitado"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configurar Requisitos</p>
              <div className="space-y-2">
                <Label>Tipo de requisito</Label>
                <Select value={reqType} onValueChange={(val: any) => { setReqType(val); setReqReference(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owns_element">Licencia, permiso o certificado</SelectItem>
                    <SelectItem value="skill_level">Habilidad y nivel</SelectItem>
                    <SelectItem value="attribute">Atributo del personaje</SelectItem>
                    <SelectItem value="stage">Etapa mínima</SelectItem>
                    <SelectItem value="age">Edad mínima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reqType === "owns_element" && (
                <div className="space-y-1">
                  <Label className="text-xs">Licencia, permiso o certificado requerido</Label>
                  <Select value={reqReference} onValueChange={setReqReference}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona licencia, permiso o certificado..." /></SelectTrigger>
                    <SelectContent>
                      {(elements ?? [])
                        .filter((el: any) =>
                          ["license", "permission", "certification"].includes(el.kind)
                        )
                        .map((el: any) => (
                          <SelectItem key={el.id} value={el.id}>
                            [{employmentElementKindLabel(el.kind)}] {el.name}
                          </SelectItem>
                        ))}
                      {(elements ?? []).filter((el: any) =>
                        ["license", "permission", "certification"].includes(el.kind)
                      ).length === 0 && (
                        <p className="p-2 text-xs text-muted-foreground italic">
                          No hay licencias, permisos ni certificados disponibles.
                        </p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reqType === "skill_level" && (
                <div className="space-y-1">
                  <Label className="text-xs">Habilidad requerida</Label>
                  <Select value={reqReference} onValueChange={setReqReference}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona habilidad..." /></SelectTrigger>
                    <SelectContent>
                      {(elements ?? []).filter((e: any) => e.kind === "skill").map((el: any) => (
                        <SelectItem key={el.id} value={el.id}>
                          {el.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reqType === "attribute" && (
                <div className="space-y-1">
                  <Label className="text-xs">Atributo</Label>
                  <Select value={reqReference} onValueChange={setReqReference}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona atributo..." /></SelectTrigger>
                    <SelectContent>
                      {(attributes ?? []).map((attr: any) => (
                        <SelectItem key={attr.id || attr.abbrev} value={attr.abbrev || attr.id}>
                          {attr.name} ({attr.abbrev || attr.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reqType === "stage" && (
                <div className="space-y-1">
                  <Label className="text-xs">Etapa</Label>
                  <Select value={reqReference} onValueChange={setReqReference}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecciona etapa..." /></SelectTrigger>
                    <SelectContent>
                      {(stages ?? []).map((st: any) => (
                        <SelectItem key={st.id || st.name} value={st.id || st.name}>
                          {st.name} {st.minAge !== undefined ? `(${st.minAge}+ años)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reqType !== "owns_element" && reqType !== "stage" && (
                <div className="space-y-1">
                  <Label className="text-xs">Valor mínimo</Label>
                  <Input type="number" min={0} value={reqValue} onChange={e => setReqValue(Number(e.target.value))} className="h-8 text-xs" />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Checkbox id={`optional-${position?.id ?? "new"}`} checked={reqOptional} onCheckedChange={(checked: boolean) => setReqOptional(checked)} />
                <Label htmlFor={`optional-${position?.id ?? "new"}`} className="text-xs">Requisito opcional con bonificación</Label>
              </div>

              {reqOptional && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[10px]">Bono ¥</Label>
                    <Input type="number" min={0} value={reqBonusYen} onChange={e => setReqBonusYen(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Bono EXP</Label>
                    <Input type="number" min={0} value={reqBonusExp} onChange={e => setReqBonusExp(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                </div>
              )}

              <Button type="button" variant="outline" size="sm" onClick={addRequirement} className="w-full text-xs h-8">
                <Plus className="size-3.5 mr-1" /> Añadir Requisito
              </Button>

              <RequirementTags
                title="Obligatorios"
                items={requirements?.requirements || []}
                elements={elements}
                attributes={attributes}
                stages={stages}
                onRemove={(id: string) =>
                  setRequirements((current: any) => ({
                    ...current,
                    requirements: (current?.requirements || []).filter((item: any) => item.id !== id)
                  }))
                }
              />

              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Opcionales</p>
                {optionalBonuses.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded border border-amber-500/20 bg-amber-500/5 p-1.5 text-xs">
                    <span>{item.name} · +¥{item.yen} / +{item.exp} EXP</span>
                    <Button variant="ghost" size="icon-sm" className="size-5" onClick={() => setOptionalBonuses(current => current.filter(entry => entry.id !== item.id))}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
                {optionalBonuses.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sin bonificaciones opcionales.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-amber-500/20 bg-muted/20 p-4">
            <h3 className="flex items-center gap-2 font-semibold font-oxanium text-sm">
              <DollarSign className="size-4 text-amber-400" /> Nivel y Remuneración Tabulada
            </h3>
            {!compensation && (
              <p className="flex gap-2 text-xs text-destructive">
                <AlertTriangle className="size-4" /> La regla de remuneración no está disponible.
              </p>
            )}

            <div className="space-y-2">
              <Label>Nivel de responsabilidad</Label>
              <Select value={levelId} onValueChange={setLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin configurar">
                    {compensation?.levels.find(item => item.id === levelId)?.name ?? "Sin configurar"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {compensation?.levels.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nivel de riesgo</Label>
              <Select value={riskId} onValueChange={setRiskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin configurar">
                    {compensation?.risks.find(item => item.id === riskId)?.name ?? "Sin configurar"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {compensation?.risks.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bono extra ¥</Label>
                <Input type="number" min={0} value={bonusYen} onChange={e => setBonusYen(Number(e.target.value))} />
              </div>
              <div>
                <Label>Bono extra EXP</Label>
                <Input type="number" min={0} value={bonusExp} onChange={e => setBonusExp(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Posts mínimos del foro</Label>
              <Input
                type="number"
                min={0}
                placeholder="Sin requisito"
                value={minPosts}
                onChange={e => setMinPosts(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Un moderador los comprobará manualmente al preparar el pago.
              </p>
            </div>

            {quote && (
              <div className="rounded-lg border border-amber-500/30 bg-background p-3 space-y-1.5 font-oxanium text-xs">
                <p className="font-bold uppercase text-[10px] text-muted-foreground">Sueldo Calculado Estimado</p>
                <div className="flex justify-between text-emerald-400">
                  <span>Yenes</span>
                  <strong>¥{quote.totalYen.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between text-cyan-400">
                  <span>Experiencia</span>
                  <strong>+{quote.totalExp} EXP</strong>
                </div>
                <p className="border-t pt-1.5 text-[10px] text-muted-foreground font-sans">
                  Base ¥{quote.levelYen}/{quote.levelExp} EXP · Riesgo +¥{quote.riskYen}/+{quote.riskExp} EXP
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Orden</Label>
                <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox id="active-pos" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
                <Label htmlFor="active-pos">Puesto Activo</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar Puesto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function requirementLabel(
  requirement: any,
  elements: any[] = [],
  attributes: any[] = [],
  stages: any[] = []
) {
  if (requirement.type === "owns_element")
    return elements?.find(item => item.id === requirement.elementId)?.name ?? requirement.elementId;
  if (requirement.type === "skill_level")
    return `${
      elements?.find(item => item.id === requirement.skillElementId)?.name ?? requirement.skillElementId
    } (Nv. ${requirement.value})`;
  if (requirement.type === "attribute")
    return `${
      attributes?.find(item => (item.abbrev ?? item.id) === requirement.attributeId)?.name ??
      requirement.attributeId
    } ≥ ${requirement.value}`;
  if (requirement.type === "stage") {
    const stage = stages?.find(
      (item: any) =>
        (item.id || item.name) === requirement.stageId || item.name === requirement.stageId
    );
    const stageText = stage
      ? `${stage.name}${stage.minAge !== undefined ? ` - ${stage.minAge} años` : ""}`
      : requirement.stageId;
    return `Etapa ≥ ${stageText}`;
  }
  if (requirement.type === "age") return `Edad ≥ ${requirement.value}`;
  return requirement.id;
}

function employmentElementKindLabel(kind: string) {
  return (
    ({
      certification: "Certificación",
      license: "Licencia",
      permission: "Permiso",
      skill: "Habilidad",
      equipment: "Equipo",
      trait: "Rasgo"
    } as Record<string, string>)[kind] ?? "Elemento"
  );
}

function employmentLevelFallbackLabel(id: string) {
  return (
    ({
      level_1: "Nivel I",
      level_2: "Nivel II",
      level_3: "Nivel III",
      level_4: "Nivel IV",
      level_5: "Nivel V",
      level_6: "Nivel VI",
      per_topic: "Por tema",
      per_article: "Por artículo",
      per_sale: "Por venta"
    } as Record<string, string>)[id] ?? id
  );
}

function employmentRiskFallbackLabel(id: string) {
  return (
    ({
      none: "Ninguno",
      low: "Leve",
      moderate: "Moderado",
      serious: "Grave",
      extreme: "Extremo"
    } as Record<string, string>)[id] ?? id
  );
}

function RequirementTags({ title, items, elements, attributes, stages, onRemove }: any) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs"
          >
            <span>{requirementLabel(item, elements, attributes, stages)}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-4 rounded-full"
              onClick={() => onRemove(item.id)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">Sin requisitos obligatorios.</p>
      )}
    </div>
  );
}

function DeleteAction({ type, id, mutate }: { type: string; id: string; mutate: any }) {
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
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-7 rounded text-destructive hover:bg-destructive/10 shrink-0"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
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
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
