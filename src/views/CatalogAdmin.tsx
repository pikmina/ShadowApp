import { SectionHeader } from "../components/common/SectionHeader";
import { Library as SectionIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { MechanicalEffectsEditor } from "../components/mechanics/MechanicalEffectsEditor";
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
import { Plus, Settings2, Trash2, Edit2, Search, Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";


const defaultForm = {
  id: "",
  kind: "trait",
  name: "",
  description: "",
  status: "draft",
  effects: [] as any[],
  requirements: { operator: "all", requirements: [] as any[] }
};

const KIND_TYPES: Record<string, string> = {
  trait: "Rasgo",
  weakness: "Debilidad",
  skill: "Habilidad",
  altered_status: "Estado Alterado",
  equipment: "Equipamiento",
  weapon: "Arma",
  consumable: "Consumible",
  ammunition: "Munición"
};

const STATUS_TYPES: Record<string, string> = {
  draft: "Borrador (Oculto)",
  published: "Publicado"
};

export default function CatalogAdmin() {
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  
  

  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];

  const { data: rawElements, mutate } = useSWR(
    user ? "/api/elements" : null, fetcher
  );

  const elements = rawElements?.filter((el: any) => el.kind !== "technique" && el.kind !== "technique_entitlement");
  
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


  const handleOpenDialog = (el?: any) => {
    if (el) {
      setForm({
        id: el.id,
        kind: el.kind,
        name: el.name,
        description: el.description,
        status: el.status,
        effects: el.effects || [],
        requirements: el.requirements || { operator: "all", requirements: [] }
      });
    } else {
      setForm(defaultForm);
    }
    setActiveTab("info");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
        try {
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Error saving");
      setIsDialogOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al guardar elemento");
    }
  };

  
  const handleToggleStatus = async (el: any) => {
    try {
      const updatedEl = { ...el, status: el.status === "published" ? "draft" : "published" };
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEl)
      });
      if (!res.ok) throw new Error("Error saving");
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al actualizar estado");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/elements/${id}`, {
        method: "DELETE" });
      mutate();
      setDeleteConfirmId(null);
    } catch (e) {
      alert("Error borrando: " + (e as Error).message);
    }
  };

  const addRequirement = () => {
    setForm(f => ({
      ...f,
      requirements: {
        ...f.requirements,
        requirements: [...f.requirements.requirements, { _id: nanoid(), type: "attribute", target: "FUE", min: 1 }]
      }
    }));
  };

  const removeRequirement = (id: string) => {
    setForm(f => ({
      ...f,
      requirements: {
        ...f.requirements,
        requirements: f.requirements.requirements.filter(r => r._id !== id)
      }
    }));
  };

  const updateRequirement = (id: string, updates: any) => {
    setForm(f => ({
      ...f,
      requirements: {
        ...f.requirements,
        requirements: f.requirements.requirements.map(r => r._id === id ? { ...r, ...updates } : r)
      }
    }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Catálogo de elementos" description="Define los rasgos, debilidades, habilidades y estados del sistema." actions={<Button onClick={() => handleOpenDialog()}><Plus className="size-4" aria-hidden="true" />Crear elemento</Button>} />

      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Buscar por nombre..." 
            className="pl-9 bg-card"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-card">
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
            {(!filteredElements || filteredElements.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  El catálogo está vacío. Haz clic en "Crear Elemento" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              filteredElements.map((el: any) => (
                <TableRow key={el.id}>
                  <TableCell className="font-semibold">{el.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{KIND_TYPES[el.kind] || el.kind.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={el.status === "published" ? "default" : "secondary"}>{STATUS_TYPES[el.status] || el.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {el.effects.length} Bloques conectados
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" aria-label={el.status === "published" ? `Pasar a borrador ${el.name}` : `Publicar ${el.name}`} onClick={() => handleToggleStatus(el)}>
                        {el.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
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
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
              <div className="px-4 sm:px-6 pt-3 pb-2 border-b bg-muted/40 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-card border border-border/50">
                  <TabsTrigger value="info" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">1. Info Básica</TabsTrigger>
                  <TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Efectos Mecánicos</TabsTrigger>
                  <TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Requisitos</TabsTrigger>
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
                    <Select value={form.kind} onValueChange={v => setForm({...form, kind: v})}>
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

                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descripción Narrativa</Label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="h-32" placeholder="Describe qué hace esto a nivel narrativo y de rol..." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Estado de Publicación</Label>
                    <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                      <SelectTrigger>
                        <SelectValue>{STATUS_TYPES[form.status] || "Selecciona un estado"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Borrador (Oculto)</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="reqs" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Árbol de Requisitos</h3>
                    <Button variant="outline" size="sm" onClick={addRequirement}>
                      <Plus className="w-4 h-4 mr-1" /> Añadir Requisito
                    </Button>
                  </div>
                  
                  {form.requirements.requirements.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                      No hay requisitos para obtener este elemento. (Cualquiera puede adquirirlo si está en la tienda).
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.requirements.requirements.map((req, idx) => (
                        <div key={req._id} className="flex items-center gap-3 bg-muted border p-3 rounded-md">
                          <Badge variant="secondary">{idx + 1}</Badge>
                          <Select value={req.type} onValueChange={v => updateRequirement(req._id, { type: v })}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attribute">Requiere Atributo</SelectItem>
                              <SelectItem value="element">Requiere Elemento</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {req.type === "attribute" ? (
                            <>
                              <Select value={req.target} onValueChange={v => updateRequirement(req._id, { target: v })}>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="FUE">Fuerza</SelectItem>
                                  <SelectItem value="DES">Destreza</SelectItem>
                                  <SelectItem value="RES">Resistencia</SelectItem>
                                  <SelectItem value="INT">Inteligencia</SelectItem>
                                  <SelectItem value="VOL">Voluntad</SelectItem>
                                  <SelectItem value="VEL">Velocidad</SelectItem>
                                </SelectContent>
                              </Select>
                              <span className="text-sm font-medium">≥</span>
                              <Input type="number" className="w-20" value={req.min} onChange={e => updateRequirement(req._id, { min: Number(e.target.value) })} />
                            </>
                          ) : (
                            <Input placeholder="ID del Elemento..." className="flex-1" value={req.target} onChange={e => updateRequirement(req._id, { target: e.target.value })} />
                          )}

                          <Button variant="ghost" size="icon" className="text-red-500 ml-auto" onClick={() => removeRequirement(req._id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="effects" className="mt-0">
                  <MechanicalEffectsEditor
                    effects={form.effects || []}
                    mechanics={mechanics}
                    onChange={(effects) => setForm((current) => ({ ...current, effects }))}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
          

        </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Elemento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
