import { SectionHeader } from "../components/common/SectionHeader";
import { Library as SectionIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { MechanicalBehaviorsEditor } from "../components/mechanics/MechanicalBehaviorsEditor";
import { MechanicalDescriptionPreview } from "../components/mechanics/MechanicalDescriptionPreview";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Plus, Settings2, Trash2, Edit2, Search, Eye, EyeOff, Sparkles, Layers, Copy, AlertCircle, Loader2, Flame, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";
import { getProgressionBreakdown } from "../domain/progressionCosts";
import { ItemIcon } from "../components/common/ItemIcon";
import { ItemIconPicker } from "../components/common/ItemIconPicker";

const ATTRIBUTE_OPTIONS = [
  { id: "FUE", name: "Fuerza (FUE)" },
  { id: "DES", name: "Destreza (DES)" },
  { id: "RES", name: "Resistencia (RES)" },
  { id: "INT", name: "Inteligencia (INT)" },
  { id: "VOL", name: "Voluntad (VOL)" },
  { id: "VEL", name: "Velocidad (VEL)" },
];

const DAMAGE_TYPE_OPTIONS = [
  { id: "fuego", name: "Fuego" },
  { id: "hielo", name: "Hielo" },
  { id: "electrico", name: "Eléctrico" },
  { id: "acido", name: "Ácido" },
  { id: "psiquico", name: "Psíquico / Mental" },
  { id: "sensorial", name: "Sensorial" },
  { id: "motor", name: "Motor" },
  { id: "anomalia_don", name: "Anomalía de Don" },
  { id: "fisico", name: "Físico" },
  { id: "cinetico", name: "Cinético" },
  { id: "cortante", name: "Cortante" },
  { id: "perforante", name: "Perforante" },
  { id: "contundente", name: "Contundente" },
];

const defaultForm = {
  id: "",
  kind: "trait",
  name: "",
  description: "",
  status: "draft",
  iconType: null as 'lucide' | 'emoji' | null,
  iconValue: null as string | null,
  effects: [] as any[],
  mechanicalBehaviors: [] as any[],
  requirements: { operator: "all", requirements: [] as any[] },
  metadata: {} as Record<string, any>
};

const KIND_TYPES: Record<string, string> = {
  trait: "Rasgo",
  weakness: "Debilidad",
  skill: "Habilidad",
  altered_status: "Estado Alterado",
  equipment: "Equipamiento",
  weapon: "Arma",
  consumable: "Consumible",
  ammunition: "Munición",
  license: "Licencia",
  permission: "Permiso",
  certification: "Certificación",
  character_resource: "Recurso de personaje",
  attribute_upgrade: "Mejora de atributo",
  plus_ultra_effect: "Efecto Plus Ultra",
  crafting_material: "Material de fabricación",
  ingredient: "Ingrediente",
  background: "Trasfondo",
  vehicle: "Vehículo",
  real_estate: "Inmueble",
  clandestine_asset: "Activo Clandestino"
};

const STATUS_TYPES: Record<string, string> = {
  draft: "Borrador (Oculto)",
  published: "Publicado"
};

const normalizeRequirements = (value: any) => ({
  operator: ['all', 'any', 'none'].includes(value?.operator) ? value.operator : 'all',
  requirements: Array.isArray(value?.requirements) ? value.requirements.map((requirement: any) => {
    if (requirement.id) return requirement;
    if (requirement.type === 'attribute' && requirement.target) return {
      id: requirement._id || nanoid(), type: 'attribute', attributeId: requirement.target,
      comparison: 'gte', value: Number(requirement.min ?? 0),
    };
    if (requirement.type === 'element' && requirement.target) return {
      id: requirement._id || nanoid(), type: 'owns_element', elementId: requirement.target, quantity: 1,
    };
    return requirement;
  }) : [],
});

export default function CatalogAdmin() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [isDialogOpen, setIsDialogOpen] = useState(() => searchParams.get('create') === 'true');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [adminActionError, setAdminActionError] = useState("");

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setForm({ ...defaultForm, id: nanoid(8) });
      setSaveError("");
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];

  const { data: rawElements, error: elementsError, isLoading: elementsLoading, mutate } = useSWR(
    user ? "/api/admin/elements" : null, fetcher
  );

  const elements = useMemo(() => {
    return Array.isArray(rawElements)
      ? rawElements.filter((el: any) => el.kind !== "technique" && el.kind !== "technique_entitlement")
      : [];
  }, [rawElements]);
  
  const filteredElements = useMemo(() => {
    if (!elements) return [];
    let list = elements;
    
    if (selectedType !== "all") {
      list = list.filter((el: any) => el.kind === selectedType);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((el: any) => 
        el.name.toLowerCase().includes(q) || 
        (KIND_TYPES[el.kind] || "").toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [elements, selectedType, searchTerm]);


  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [deletedSystemElements, setDeletedSystemElements] = useState<any[]>([]);
  const [selectedRestoreIds, setSelectedRestoreIds] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleOpenRestore = async () => {
    try {
      const res = await apiFetch("/api/admin/deleted-system-elements");
      const data = await res.json();
      if (res.ok) {
        setDeletedSystemElements(Array.isArray(data) ? data : []);
        setSelectedRestoreIds((Array.isArray(data) ? data : []).map((d: any) => d.id));
        setIsRestoreOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmRestore = async () => {
    if (selectedRestoreIds.length === 0) return;
    setIsRestoring(true);
    try {
      const res = await apiFetch("/api/admin/restore-system-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementIds: selectedRestoreIds })
      });
      if (res.ok) {
        setIsRestoreOpen(false);
        await mutate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenDialog = (el?: any) => {
    setSaveError("");
    if (el) {
      setForm({
        id: el.id,
        kind: el.kind,
        name: el.name,
        description: el.description,
        status: el.status,
        iconType: el.iconType ?? null,
        iconValue: el.iconValue ?? null,
        effects: el.effects || [],
        mechanicalBehaviors: el.mechanicalBehaviors || [],
        requirements: el.requirements || { operator: "all", requirements: [] },
        metadata: {
          baseExpCost: el.metadata?.baseExpCost ?? (el.kind === 'attribute_upgrade' ? 200 : el.kind === 'skill' ? 100 : undefined),
          maxLevel: el.metadata?.maxLevel ?? (el.kind === 'attribute_upgrade' ? 10 : el.kind === 'skill' ? 5 : 5),
          attributeId: el.metadata?.attributeId ?? 'FUE',
          damageTypeId: el.metadata?.damageTypeId ?? (el.kind === 'altered_status' ? 'fuego' : undefined),
          effectType: el.metadata?.effectType ?? (el.kind === 'altered_status' ? 'dot' : undefined),
          defaultDurationTurns: el.metadata?.defaultDurationTurns ?? (el.kind === 'altered_status' ? 2 : undefined),
          hasTiers: el.metadata?.hasTiers ?? (el.kind === 'altered_status' ? false : undefined),
          ...el.metadata
        }
      });
    } else {
      setForm({
        ...defaultForm,
        metadata: {
          baseExpCost: 100,
          maxLevel: 5,
          attributeId: "FUE",
          damageTypeId: "fuego",
          effectType: "dot",
          defaultDurationTurns: 2,
          hasTiers: false,
        }
      });
    }
    setActiveTab("info");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSaveError("Debes ingresar un nombre para el elemento.");
      return;
    }
    setSaveError("");
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al guardar elemento");
      setIsDialogOpen(false);
      setSaveError("");
      await mutate();
    } catch (e: any) {
      console.error(e);
      setSaveError(e.message || "Error al guardar elemento");
    } finally {
      setIsSaving(false);
    }
  };

  
  const handleToggleStatus = async (el: any) => {
    try {
      setAdminActionError("");
      const updatedEl = { ...el, status: el.status === "published" ? "draft" : "published" };
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEl)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al actualizar estado");
      await mutate();
    } catch (e: any) {
      console.error(e);
      setAdminActionError(e.message || "Error al actualizar estado");
    }
  };

  const handleDuplicate = async (el: any) => {
    try {
      setAdminActionError("");
      const { id, createdAt, updatedAt, ...rest } = el;
      const duplicated = {
        ...rest,
        name: `${el.name} (Copia)`,
        status: "draft",
        effects: el.effects?.map((eff: any) => ({
          ...eff,
          applicationId: nanoid(),
        })) || [],
        mechanicalBehaviors: el.mechanicalBehaviors ? JSON.parse(JSON.stringify(el.mechanicalBehaviors)) : [],
      };
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicated),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al duplicar elemento");
      await mutate();
    } catch (e: any) {
      console.error(e);
      setAdminActionError(e.message || "Error al duplicar elemento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setAdminActionError("");
      const res = await apiFetch(`/api/elements/${id}`, {
        method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al eliminar elemento");
      await mutate();
      setDeleteConfirmId(null);
    } catch (e: any) {
      setAdminActionError(e.message || "Error al borrar elemento");
    }
  };

  const [syncingStatuses, setSyncingStatuses] = useState(false);

  const handleSyncCanonicalStatuses = async () => {
    try {
      setSyncingStatuses(true);
      setAdminActionError("");
      const res = await apiFetch("/api/admin/system/sync-canonical-statuses", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al sincronizar estados canónicos");
      await mutate();
      toast.success("Estados alterados canónicos y reglas sincronizados con éxito");
    } catch (e: any) {
      console.error(e);
      setAdminActionError(e.message || "Error al sincronizar estados canónicos");
      toast.error(e.message || "Error al sincronizar estados canónicos");
    } finally {
      setSyncingStatuses(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        icon={SectionIcon} 
        title="Catálogo de elementos" 
        description="Define los rasgos, debilidades, habilidades y estados del sistema." 
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncCanonicalStatuses} 
              disabled={syncingStatuses}
              className="gap-1.5"
              title="Asegura que los 21 estados alterados canónicos y sus reglas estén sincronizados en la base de datos"
            >
              {syncingStatuses ? <Loader2 className="size-4 animate-spin text-primary" /> : <RefreshCw className="size-4 text-purple-400" />}
              Sincronizar Estados Canónicos
            </Button>
            <Button variant="outline" onClick={handleOpenRestore} className="gap-1.5">
              <Sparkles className="size-4" />
              Restaurar elementos del sistema
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="size-4" aria-hidden="true" />
              Crear elemento
            </Button>
          </div>
        } 
      />

      
      <div className="p-4 sm:p-5 bg-card/60 border border-border/80 rounded-lg mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[50%] w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Buscar por nombre..." 
              className="pl-9 bg-background/70 text-xs w-full h-9"
            />
          </div>
          <div className="w-full sm:w-64 shrink-0">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-background/70 text-xs h-9">
                <SelectValue>{selectedType === 'all' ? 'Todos los tipos' : KIND_TYPES[selectedType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(KIND_TYPES).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {adminActionError && (
        <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{adminActionError}</span>
        </div>
      )}

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Efectos Mecánicos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elementsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs font-mono uppercase tracking-wider">Cargando elementos del catálogo...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : elementsError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-destructive">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="size-6 text-destructive" />
                    <span className="font-semibold text-sm">Error al cargar los elementos del catálogo</span>
                    <span className="text-xs text-muted-foreground">{elementsError?.message || 'Error de conexión con la base de datos.'}</span>
                    <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-2 text-xs">
                      Reintentar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (!filteredElements || filteredElements.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  El catálogo está vacío. Haz clic en "Crear Elemento" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              filteredElements.map((el: any) => (
                <TableRow key={el.id}>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded bg-muted/60 border border-border flex items-center justify-center shrink-0">
                        <ItemIcon item={el} className="size-4.5 text-primary" />
                      </div>
                      <div>
                        <span>{el.name}</span>
                        {(el.kind === 'skill' || el.kind === 'attribute_upgrade') && Number(el.metadata?.baseExpCost) > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono">
                              <Sparkles className="size-2.5 mr-1 inline" />
                              Base: {Number(el.metadata.baseExpCost).toLocaleString('es-ES')} EXP (Nv 1-{el.metadata?.maxLevel || (el.kind === 'attribute_upgrade' ? 10 : 5)})
                            </Badge>
                          </div>
                        )}
                        {el.kind === 'altered_status' && (
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {el.metadata?.damageTypeId && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400 bg-purple-500/10">
                                  {DAMAGE_TYPE_OPTIONS.find(d => d.id === el.metadata.damageTypeId)?.name || el.metadata.damageTypeId}
                                </Badge>
                              )}
                              {el.metadata?.effectType && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-400 bg-blue-500/10">
                                  {el.metadata.effectType === 'dot' ? '🩸 Daño Continuo' : el.metadata.effectType === 'control' ? '🔒 Control' : el.metadata.effectType === 'buff' ? '✨ Beneficio' : '⚔️ Híbrido'}
                                </Badge>
                              )}
                              {el.metadata?.hasTiers && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                                  ⭐ Familia con Niveles (Leve / Grave)
                                </Badge>
                              )}
                              {!el.metadata?.hasTiers && el.metadata?.defaultDurationTurns ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                                  ⏱️ {el.metadata.defaultDurationTurns} {el.metadata.defaultDurationTurns === 1 ? 'turno' : 'turnos'}
                                </Badge>
                              ) : null}
                              {!el.metadata?.hasTiers && el.metadata?.resistanceDifficulty && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10">
                                  🛡️ {el.metadata.resistanceDifficulty}
                                </Badge>
                              )}
                              {!el.metadata?.hasTiers && el.metadata?.cureMethods && (
                                <span className="text-[10px] text-muted-foreground/80 italic">
                                  Curación: {el.metadata.cureMethods}
                                </span>
                              )}
                            </div>

                            {/* Detalle de niveles para familias agrupadas (Quemadura, Veneno, Hemorragia, Berserker) */}
                            {el.metadata?.hasTiers && el.metadata?.tiers && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                                {el.metadata.tiers.leve && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    <strong className="font-semibold text-emerald-400">Leve:</strong>
                                    {el.metadata.tiers.leve.combatEffect || el.metadata.tiers.leve.damageFormula} · ⏱️ {el.metadata.tiers.leve.durationTurns}t · 🛡️ {el.metadata.tiers.leve.resistanceDifficulty}
                                  </span>
                                )}
                                {el.metadata.tiers.grave && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    <strong className="font-semibold text-rose-400">Grave:</strong>
                                    {el.metadata.tiers.grave.combatEffect || el.metadata.tiers.grave.damageFormula} · ⏱️ {el.metadata.tiers.grave.durationTurns}t · 🛡️ {el.metadata.tiers.grave.resistanceDifficulty}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{KIND_TYPES[el.kind] || el.kind.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={el.status === "published" ? "default" : "secondary"}>{STATUS_TYPES[el.status] || el.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(() => {
                      const count = Array.isArray(el.mechanicalBehaviors) && el.mechanicalBehaviors.length > 0
                        ? el.mechanicalBehaviors.reduce((acc, b) => acc + (b.effects?.length ?? 0), 0)
                        : (el.effects?.length ?? 0);
                      return `${count} ${count === 1 ? "bloque conectado" : "bloques conectados"}`;
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" aria-label={el.status === "published" ? `Pasar a borrador ${el.name}` : `Publicar ${el.name}`} onClick={() => handleToggleStatus(el)}>
                        {el.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" aria-label={`Duplicar ${el.name}`} title="Duplicar elemento" onClick={() => handleDuplicate(el)}><Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                      <Button variant="outline" size="icon" aria-label={`Editar ${el.name}`} onClick={() => handleOpenDialog(el)}><Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                      {deleteConfirmId === el.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(el.id)}>Confirmar</Button>
                          <Button variant="outline" size="icon" onClick={() => setDeleteConfirmId(null)}>X</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label={`Eliminar ${el.name}`} onClick={() => setDeleteConfirmId(el.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[1000px] lg:max-w-[1100px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{form.id ? "Editar Elemento" : "Diseñador de Elementos"}</DialogTitle>
            <DialogDescription>
              Construye mecánicas paso a paso sin programar.
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <div className="mx-6 mt-3 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2 shrink-0">
              <AlertCircle className="size-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
              <div className="px-4 sm:px-6 pt-3 pb-2 border-b bg-muted/40 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto">
                  <TabsTrigger value="info">1. Info Básica</TabsTrigger>
                  {form.kind !== 'attribute_upgrade' && (
                    <TabsTrigger value="effects">2. Efectos Mecánicos</TabsTrigger>
                  )}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="grid gap-2">
                    <Label>Nombre del Elemento</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Talentoso, Lluvia de Acero..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Elemento (Mecánica)</Label>
                    <Select value={form.kind} onValueChange={v => {
                      const isAttr = v === 'attribute_upgrade';
                      const isSkill = v === 'skill';
                      if (isAttr && activeTab === 'effects') {
                        setActiveTab('info');
                      }
                      setForm({
                        ...form,
                        kind: v,
                        metadata: {
                          ...form.metadata,
                          baseExpCost: form.metadata?.baseExpCost ?? (isAttr ? 200 : isSkill ? 100 : 0),
                          maxLevel: form.metadata?.maxLevel ?? (isAttr ? 10 : isSkill ? 5 : 5),
                          attributeId: form.metadata?.attributeId ?? 'FUE'
                        }
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue>{KIND_TYPES[form.kind] || "Selecciona un tipo"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        
                        <SelectItem value="trait">Rasgo</SelectItem>
                        <SelectItem value="weakness">Debilidad</SelectItem>
                        <SelectItem value="skill">Habilidad</SelectItem>
                        <SelectItem value="altered_status">Estado Alterado</SelectItem>
                        <SelectItem value="equipment">Equipamiento</SelectItem>
                        <SelectItem value="weapon">Arma</SelectItem>
                        <SelectItem value="consumable">Consumible</SelectItem>
                        <SelectItem value="ammunition">Munición</SelectItem>
                        <SelectItem value="license">Licencia</SelectItem>
                        <SelectItem value="permission">Permiso</SelectItem>
                        <SelectItem value="certification">Certificación</SelectItem>
                        <SelectItem value="character_resource">Recurso de personaje</SelectItem>
                        <SelectItem value="attribute_upgrade">Mejora de atributo</SelectItem>
                        <SelectItem value="plus_ultra_effect">Efecto Plus Ultra</SelectItem>
                        <SelectItem value="crafting_material">Material de fabricación</SelectItem>
                        <SelectItem value="ingredient">Ingrediente</SelectItem>
                        <SelectItem value="background">Trasfondo</SelectItem>
                        <SelectItem value="vehicle">Vehículo</SelectItem>
                        <SelectItem value="real_estate">Inmueble</SelectItem>
                        <SelectItem value="clandestine_asset">Activo Clandestino</SelectItem>

                      </SelectContent>
                    </Select>
                  </div>

                  {/* Configuración de Progresión por Niveles y Costes Base en EXP */}
                  {(form.kind === 'skill' || form.kind === 'attribute_upgrade') && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Sparkles className="size-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Progresión por Niveles y Coste en EXP</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                          Coste = Base × Nivel Actual (0➔1 = Base)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {form.kind === 'attribute_upgrade' && (
                          <div className="grid gap-1.5">
                            <Label className="text-xs text-foreground font-medium">Atributo Asociado</Label>
                            <Select
                              value={form.metadata?.attributeId || 'FUE'}
                              onValueChange={v => setForm({
                                ...form,
                                metadata: { ...form.metadata, attributeId: v }
                              })}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background/80">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ATTRIBUTE_OPTIONS.map(attr => (
                                  <SelectItem key={attr.id} value={attr.id}>{attr.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid gap-1.5">
                          <Label className="text-xs text-foreground font-medium flex items-center gap-1">
                            <span>Coste Base en EXP</span>
                            <Sparkles className="size-3 text-amber-400" />
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.metadata?.baseExpCost ?? (form.kind === 'attribute_upgrade' ? 200 : 100)}
                            onChange={e => setForm({
                              ...form,
                              metadata: {
                                ...form.metadata,
                                baseExpCost: Math.max(0, parseInt(e.target.value, 10) || 0)
                              }
                            })}
                            className="h-8 text-xs font-mono font-bold bg-background/80"
                            placeholder="Ej: 100, 200, 350, 400..."
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="text-xs text-foreground font-medium">Nivel Máximo</Label>
                          <Select
                            value={String(form.metadata?.maxLevel ?? (form.kind === 'attribute_upgrade' ? 10 : 5))}
                            onValueChange={v => setForm({
                              ...form,
                              metadata: {
                                ...form.metadata,
                                maxLevel: parseInt(v, 10) || (form.kind === 'attribute_upgrade' ? 10 : 5)
                              }
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                                <SelectItem key={lvl} value={String(lvl)}>Nivel {lvl}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Live Progression Breakdown */}
                      {(() => {
                        const baseCost = form.metadata?.baseExpCost ?? (form.kind === 'attribute_upgrade' ? 200 : 100);
                        const maxLvl = form.metadata?.maxLevel ?? (form.kind === 'attribute_upgrade' ? 10 : 5);
                        const breakdown = getProgressionBreakdown(baseCost, maxLvl);
                        if (breakdown.length === 0) return null;

                        return (
                          <div className="mt-2 pt-2 border-t border-amber-500/20">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                              Desglose de Costes Calculado en Tiempo Real:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                              {breakdown.map(step => (
                                <div key={step.toLevel} className="bg-background/60 rounded p-1.5 border border-border/40 text-center">
                                  <span className="block text-[10px] font-bold text-amber-400">
                                    Nv. {step.toLevel}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-foreground block">
                                    {step.cost.toLocaleString('es-ES')} <span className="text-[9px] text-amber-400">EXP</span>
                                  </span>
                                  <span className="text-[9px] text-muted-foreground block">
                                    Acum: {step.cumulativeCost.toLocaleString('es-ES')}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-xs text-muted-foreground">
                                Coste Total (Nv 0 ➔ {maxLvl}): <strong className="text-amber-400 font-mono">{breakdown[breakdown.length - 1].cumulativeCost.toLocaleString('es-ES')} EXP</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Configuración de Estado Alterado */}
                  {form.kind === 'altered_status' && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-purple-400">
                          <Flame className="size-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Parámetros del Estado Alterado</h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                          Costes en CE gestionados en Reglas del Sistema
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-foreground font-medium">Familia Temática / Daño</Label>
                          <Select
                            value={form.metadata?.damageTypeId || "fuego"}
                            onValueChange={v => setForm({
                              ...form,
                              metadata: { ...form.metadata, damageTypeId: v }
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAMAGE_TYPE_OPTIONS.map(dt => (
                                <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="text-xs text-foreground font-medium">Naturaleza del Efecto</Label>
                          <Select
                            value={form.metadata?.effectType || "dot"}
                            onValueChange={v => setForm({
                              ...form,
                              metadata: { ...form.metadata, effectType: v }
                            })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background/80">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dot">🩸 Daño Continuo (DoT)</SelectItem>
                              <SelectItem value="control">🔒 Estado de Control</SelectItem>
                              <SelectItem value="hybrid">⚔️ Híbrido (Daño + Control)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="text-xs text-foreground font-medium">Duración Base (Turnos)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.metadata?.defaultDurationTurns ?? 2}
                            onChange={e => setForm({
                              ...form,
                              metadata: {
                                ...form.metadata,
                                defaultDurationTurns: Math.max(1, parseInt(e.target.value, 10) || 1)
                              }
                            })}
                            className="h-8 text-xs font-mono bg-background/80"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded bg-background/40 border border-purple-500/20">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-medium text-foreground cursor-pointer">¿Diferenciar por Severidad (Leve, Moderado, Grave)?</Label>
                          <p className="text-[11px] text-muted-foreground">Permite configurar daño, duración y curación específica por nivel de gravedad.</p>
                        </div>
                        <Switch
                          checked={Boolean(form.metadata?.hasTiers)}
                          onCheckedChange={checked => setForm({
                            ...form,
                            metadata: {
                              ...form.metadata,
                              hasTiers: checked
                            }
                          })}
                        />
                      </div>

                      {form.metadata?.hasTiers ? (
                        <div className="space-y-3 pt-2 border-t border-purple-500/20">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Configuración de Niveles de Severidad:
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(['leve', 'moderado', 'grave'] as const).map(tier => {
                              const tierData = form.metadata?.tiers?.[tier] || {};
                              const tierLabels = { leve: 'Leve', moderado: 'Moderado', grave: 'Grave' };
                              return (
                                <div key={tier} className="p-2.5 rounded border border-border/50 bg-background/60 space-y-2">
                                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                                    {tierLabels[tier]}
                                  </Badge>
                                  {(form.metadata?.effectType === 'dot' || form.metadata?.effectType === 'hybrid') && (
                                    <div className="grid gap-1">
                                      <Label className="text-[10px] text-muted-foreground">Daño por Turno (Dados/Fijo)</Label>
                                      <Input
                                        value={tierData.damageFormula || (tier === 'leve' ? '1D4' : tier === 'moderado' ? '1D6' : '2D6')}
                                        onChange={e => {
                                          const tiers = { ...(form.metadata?.tiers || {}) };
                                          tiers[tier] = { ...(tiers[tier] || {}), damageFormula: e.target.value };
                                          setForm({ ...form, metadata: { ...form.metadata, tiers } });
                                        }}
                                        className="h-7 text-xs font-mono bg-background"
                                        placeholder="Ej: 1D4, 1D6, 2"
                                      />
                                    </div>
                                  )}
                                  <div className="grid gap-1">
                                    <Label className="text-[10px] text-muted-foreground">Duración (Turnos)</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={tierData.durationTurns || (tier === 'leve' ? 2 : tier === 'moderado' ? 3 : 4)}
                                      onChange={e => {
                                        const tiers = { ...(form.metadata?.tiers || {}) };
                                        tiers[tier] = { ...(tiers[tier] || {}), durationTurns: parseInt(e.target.value, 10) || 1 };
                                        setForm({ ...form, metadata: { ...form.metadata, tiers } });
                                      }}
                                      className="h-7 text-xs font-mono bg-background"
                                    />
                                  </div>
                                  {(form.metadata?.effectType === 'control' || form.metadata?.effectType === 'hybrid') && (
                                    <div className="grid gap-1">
                                      <Label className="text-[10px] text-muted-foreground">Efecto / Restricción</Label>
                                      <Input
                                        value={tierData.controlDescription || ''}
                                        onChange={e => {
                                          const tiers = { ...(form.metadata?.tiers || {}) };
                                          tiers[tier] = { ...(tiers[tier] || {}), controlDescription: e.target.value };
                                          setForm({ ...form, metadata: { ...form.metadata, tiers } });
                                        }}
                                        className="h-7 text-xs bg-background"
                                        placeholder="Ej: -2 a EVA, pierde acción"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-500/20">
                          {(form.metadata?.effectType === 'dot' || form.metadata?.effectType === 'hybrid') && (
                            <div className="grid gap-1">
                              <Label className="text-xs text-foreground">Daño por Turno (Dados o Fijo)</Label>
                              <Input
                                value={form.metadata?.dotDamageFormula || "1D6"}
                                onChange={e => setForm({
                                  ...form,
                                  metadata: { ...form.metadata, dotDamageFormula: e.target.value }
                                })}
                                className="h-8 text-xs font-mono bg-background/80"
                                placeholder="Ej: 1D6, 2D4, 3"
                              />
                            </div>
                          )}
                          {(form.metadata?.effectType === 'control' || form.metadata?.effectType === 'hybrid') && (
                            <div className="grid gap-1">
                              <Label className="text-xs text-foreground">Efecto / Restricción de Control</Label>
                              <Input
                                value={form.metadata?.controlDescription || ""}
                                onChange={e => setForm({
                                  ...form,
                                  metadata: { ...form.metadata, controlDescription: e.target.value }
                                })}
                                className="h-8 text-xs bg-background/80"
                                placeholder="Ej: Pérdida de turno, inmovilizado..."
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-500/20">
                        <div className="grid gap-1">
                          <Label className="text-xs text-foreground">Dificultad de Resistencia</Label>
                          <Input
                            value={form.metadata?.resistanceDifficulty || ""}
                            onChange={e => setForm({
                              ...form,
                              metadata: { ...form.metadata, resistanceDifficulty: e.target.value }
                            })}
                            className="h-8 text-xs bg-background/80"
                            placeholder="Ej: Fácil (12), Muy Difícil (24)..."
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-foreground">Métodos de Curación</Label>
                          <Input
                            value={form.metadata?.cureMethods || ""}
                            onChange={e => setForm({
                              ...form,
                              metadata: { ...form.metadata, cureMethods: e.target.value }
                            })}
                            className="h-8 text-xs bg-background/80"
                            placeholder="Ej: Medicina, Quirk curativo, antídoto..."
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-foreground">Efecto de la Curación</Label>
                          <Input
                            value={form.metadata?.cureEffect || ""}
                            onChange={e => setForm({
                              ...form,
                              metadata: { ...form.metadata, cureEffect: e.target.value }
                            })}
                            className="h-8 text-xs bg-background/80"
                            placeholder="Ej: Elimina daño y restaura respiración..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Icono del artículo (Lucide / Emoji) */}
                  <ItemIconPicker
                    iconType={form.iconType}
                    iconValue={form.iconValue}
                    kind={form.kind}
                    itemName={form.name}
                    onChange={(newType, newValue) => setForm({ ...form, iconType: newType, iconValue: newValue })}
                  />

                  <div className="grid gap-2">
                    <Label>Descripción Narrativa</Label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-32" placeholder="Describe qué hace esto a nivel narrativo y de rol..." />
                  </div>
                  <MechanicalDescriptionPreview behaviors={form.mechanicalBehaviors || []} />
                  <div className="flex items-center justify-between rounded-lg border border-border/70 p-3.5 bg-card/50 mt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="catalog-item-status" className="text-sm font-medium cursor-pointer">
                        Estado de Publicación
                      </Label>
                      <div className="text-xs">
                        {form.status === "published" ? (
                          <span className="text-emerald-400 font-medium">Publicado (Visible en catálogo y tienda)</span>
                        ) : (
                          <span className="text-muted-foreground font-medium">Borrador (Oculto para jugadores)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-semibold uppercase text-muted-foreground">
                        {form.status === "published" ? "ON" : "OFF"}
                      </span>
                      <Switch
                        id="catalog-item-status"
                        checked={form.status === "published"}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({ ...prev, status: checked ? "published" : "draft" }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="effects" className="mt-0">
                  <MechanicalBehaviorsEditor
                    behaviors={form.mechanicalBehaviors || []}
                    onChange={(behaviors) => setForm((current) => ({ ...current, mechanicalBehaviors: behaviors }))}
                    legacyEffects={form.effects || []}
                    onLegacyChange={(effects) => setForm((current) => ({ ...current, effects }))}
                    mechanics={mechanics}
                    maxLevel={form.kind === 'skill' ? (Number(form.metadata?.maxLevel) || 5) : undefined}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
          

        </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving ? "Guardando..." : "Guardar Elemento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl">Restaurar elementos del sistema</DialogTitle>
            <DialogDescription>
              Selecciona los elementos canónicos eliminados administrativamente que deseas restaurar con sus comportamientos mecánicos originales.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2 flex-1 overflow-y-auto max-h-[50vh]">
            {deletedSystemElements.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No hay elementos del sistema eliminados pendientes de restauración.
              </div>
            ) : (
              <div className="space-y-3">
                {deletedSystemElements.map((el) => {
                  const isChecked = selectedRestoreIds.includes(el.id);
                  return (
                    <div
                      key={el.id}
                      onClick={() => {
                        setSelectedRestoreIds((prev) =>
                          isChecked ? prev.filter((id) => id !== el.id) : [...prev, el.id]
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 size-4 rounded border-border text-primary focus:ring-ring"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{el.name}</span>
                          <Badge variant="outline" className="text-xs uppercase">
                            {KIND_TYPES[el.kind] || el.kind}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{el.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted">
            <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmRestore} disabled={isRestoring || selectedRestoreIds.length === 0} className="gap-2">
              {isRestoring && <Loader2 className="size-4 animate-spin" />}
              {isRestoring ? "Restaurando..." : "Restaurar seleccionados"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
