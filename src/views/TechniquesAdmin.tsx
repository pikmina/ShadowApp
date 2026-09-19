import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Plus, Settings2, Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";


const defaultForm = {
  id: "",
  kind: "technique_entitlement",
  name: "",
  description: "",
  status: "draft",
  effects: [] as any[],
  requirements: { operator: "all", requirements: [] as any[] }
};

const STATUS_TYPES: Record<string, string> = {
  draft: "Borrador (Oculto)",
  published: "Publicado"
};

export default function TechniquesAdmin() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];

  const { data: rawElements, mutate } = useSWR(
    user ? "/api/admin/elements" : null, fetcher
  );

  const elements = rawElements?.filter((el: any) => el.kind === "technique_entitlement");

  const [isDialogOpen, setIsDialogOpen] = useState(() => searchParams.get('create') === 'true');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setForm({ ...defaultForm, id: nanoid(8) });
      setIsDialogOpen(true);
    }
  }, [searchParams]);

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


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Técnicas</h2>
          <p className="text-muted-foreground mt-1">
            Diseña y balancea las habilidades activas de los personajes.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Técnica
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Nombre de la Técnica</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Efectos Mecánicos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!elements || elements.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No hay técnicas. Haz clic en "Crear Técnica" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              elements.map((el: any) => (
                <TableRow key={el.id}>
                  <TableCell className="font-semibold">{el.name}</TableCell>
                  <TableCell>
                    <Badge variant={el.status === "published" ? "default" : "secondary"}>{el.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {el.effects.length} Bloques conectados
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" title={el.status === "published" ? `Pasar a borrador` : `Publicar`} onClick={() => handleToggleStatus(el)}>
                        {el.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleOpenDialog(el)}><Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                      {deleteConfirmId === el.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(el.id)}>Confirmar</Button>
                          <Button variant="outline" size="icon" onClick={() => setDeleteConfirmId(null)}>X</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(el.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
            <DialogTitle>{form.id ? "Editar Técnica" : "Diseñador de Técnicas"}</DialogTitle>
            <DialogDescription>
              Construye técnicas de combate paso a paso sin programar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
              <div className="px-4 sm:px-6 pt-3 pb-2 border-b bg-muted/40 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-card border border-border/50">
                  <TabsTrigger value="info" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">1. Info Básica</TabsTrigger>
                  <TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Efectos Mecánicos</TabsTrigger>
                  <TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Requisitos anteriores</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="grid gap-2">
                    <Label>Nombre de la Técnica</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Lluvia de Acero, Golpe Fulminante..." />
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

                <TabsContent value="reqs" className="space-y-3"><p className="text-sm text-muted-foreground">Los requisitos de ejecución se seleccionan desde Reglas del Sistema en Efectos Mecánicos. Los requisitos anteriores de adquisición se conservan sin reinterpretarlos.</p>{form.requirements.requirements.map((req, index) => <div key={req._id ?? index} className="rounded border p-3 text-sm">{req.type}: {req.target} {req.min !== undefined ? `≥ ${req.min}` : ''}</div>)}</TabsContent>

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
            <Button onClick={handleSave}>Guardar Técnica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
