import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Loader2, Plus, Edit2, Trash2, GripVertical, Settings2 } from "lucide-react";
import { toast } from "sonner";

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) throw new Error("Error fetching data");
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response");
  }
  return res.json();
};

const defaultForm = {
  id: "",
  name: "",
  type: "text",
  category: "Datos Básicos",
  options: [] as string[],
  order: 0,
};

const FIELD_TYPES: Record<string, string> = {
  text: "Texto Corto",
  textarea: "Texto Largo",
  number: "Número",
  date: "Fecha (Calendario)",
  image: "Imagen (URL/Link)",
  select: "Desplegable (Una opción)",
  multiselect: "Múltiples Opciones",
  checkbox: "Casilla de Verificación (Check)",
  switch: "Interruptor (Sí/No)",
  quirk: "Poder/Quirk (Descripción + 3 Niveles)",
};

export default function SheetBuilderAdmin() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then(setToken);
  }, [getToken]);

  const { data: fields, mutate } = useSWR(
    token ? ["/api/sheet-fields", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [newOption, setNewOption] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);

  const existingCategories = Array.from(new Set(fields?.map((f: any) => f.category) || []));

  const handleOpenDialog = (field?: any) => {
    if (field) {
      setForm({ ...field, options: field.options || [] });
      setIsNewCategory(false);
    } else {
      setForm({ ...defaultForm, order: fields?.length || 0 });
      setIsNewCategory(existingCategories.length === 0);
    }
    setNewOption("");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category) {
      toast.error("El nombre y la categoría son obligatorios");
      return;
    }

    try {
      const res = await fetch("/api/sheet-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error();
      toast.success("Campo guardado correctamente");
      setIsDialogOpen(false);
      mutate();
    } catch (e) {
      toast.error("Error al guardar el campo");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este campo?")) return;
    try {
      const res = await fetch(`/api/sheet-fields/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success("Campo eliminado");
      mutate();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    if (form.options.includes(newOption.trim())) {
      toast.error("La opción ya existe");
      return;
    }
    setForm({ ...form, options: [...form.options, newOption.trim()] });
    setNewOption("");
  };

  const removeOption = (idx: number) => {
    const newOptions = [...form.options];
    newOptions.splice(idx, 1);
    setForm({ ...form, options: newOptions });
  };

  const needsOptions = ["select", "multiselect"].includes(form.type);

  // Agrupamos por categoría
  const groupedFields = fields?.reduce((acc: any, field: any) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, fieldId: string, category: string) => {
    setDraggedFieldId(fieldId);
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (draggedCategory === category) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFieldId: string, category: string) => {
    e.preventDefault();
    if (!draggedFieldId || draggedFieldId === targetFieldId || draggedCategory !== category) {
      setDraggedFieldId(null);
      setDraggedCategory(null);
      return;
    }
    
    const categoryFields = [...groupedFields[category]].sort((a: any, b: any) => a.order - b.order);
    const draggedIdx = categoryFields.findIndex((f: any) => f.id === draggedFieldId);
    const targetIdx = categoryFields.findIndex((f: any) => f.id === targetFieldId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = categoryFields.splice(draggedIdx, 1);
    categoryFields.splice(targetIdx, 0, draggedItem);
    
    const token = await getToken();
    if (!token) return;

    // Mutate locally instantly
    mutate(
      fields.map((f: any) => {
        const catIdx = categoryFields.findIndex((cf: any) => cf.id === f.id);
        if (catIdx !== -1) {
          return { ...f, order: catIdx * 10 };
        }
        return f;
      }),
      false
    );

    try {
      // Send updates to backend
      const updates = categoryFields.map((f: any, idx: number) => 
        fetch("/api/sheet-fields", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ ...f, order: idx * 10 }),
        })
      );
      await Promise.all(updates);
    } catch (error) {
      toast.error("Error al reordenar");
    } finally {
      mutate(); // Refresh from DB
      setDraggedFieldId(null);
      setDraggedCategory(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Diseñador de Fichas</h2>
          <p className="text-muted-foreground mt-1">
            Construye la plantilla de la hoja de personaje. Añade los campos que los jugadores deberán rellenar.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir Campo
        </Button>
      </div>

      {!fields ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedFields || {}).length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Settings2 className="w-12 h-12 mb-4 text-muted-foreground" />
            <p>La hoja de personaje está vacía.</p>
            <p className="text-sm">Empieza añadiendo campos como "Nombre", "Apariencia", etc.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedFields).map(category => (
            <Card key={category} className="shadow-sm border-border overflow-hidden">
              <CardHeader className="bg-muted py-3 border-b">
                <CardTitle className="text-base font-medium text-foreground uppercase tracking-wider">{category}</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nombre del Campo</TableHead>
                    <TableHead>Tipo de Input</TableHead>
                    <TableHead>Opciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedFields[category].sort((a: any, b: any) => a.order - b.order).map((field: any) => (
                    <TableRow 
                      key={field.id} 
                      className={`group ${draggedFieldId === field.id ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field.id, category)}
                      onDragOver={(e) => handleDragOver(e, category)}
                      onDrop={(e) => handleDrop(e, field.id, category)}
                    >
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                      </TableCell>
                      <TableCell className="font-medium">{field.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-xs">{FIELD_TYPES[field.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {["select", "multiselect"].includes(field.type) 
                          ? `${field.options?.length || 0} opciones`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(field)}>
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDelete(field.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Campo" : "Nuevo Campo de Ficha"}</DialogTitle>
            <DialogDescription>
              Define cómo verán los jugadores este campo en su hoja de personaje.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre del Campo</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Color de Ojos, Orientación..." />
            </div>

            <div className="grid gap-2">
              <Label>Categoría (Pestaña / Sección)</Label>
              {isNewCategory || existingCategories.length === 0 ? (
                <div className="flex gap-2">
                  <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Ej: Datos Básicos, Apariencia..." className="flex-1" />
                  {existingCategories.length > 0 && (
                    <Button type="button" variant="outline" onClick={() => {
                      setIsNewCategory(false);
                      setForm({...form, category: existingCategories[0] as string});
                    }}>
                      Volver
                    </Button>
                  )}
                </div>
              ) : (
                <Select value={form.category} onValueChange={v => {
                  if (v === '___NEW___') {
                    setIsNewCategory(true);
                    setForm({...form, category: ''});
                  } else {
                    setForm({...form, category: v});
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue>{form.category}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map(c => (
                      <SelectItem key={c as string} value={c as string}>{c as string}</SelectItem>
                    ))}
                    <SelectItem value="___NEW___" className="text-indigo-600 font-medium">+ Crear Nueva Categoría</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">Los campos con la misma categoría se agruparán automáticamente.</p>
            </div>

            <div className="grid gap-2">
              <Label>Tipo de Input</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger>
                  <SelectValue>{FIELD_TYPES[form.type] || "Selecciona un tipo"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOptions && (
              <div className="grid gap-2 p-3 bg-muted border rounded-md">
                <Label>Opciones Disponibles</Label>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} placeholder="Añadir opción..." className="bg-card" />
                  <Button type="button" variant="secondary" onClick={addOption}>Añadir</Button>
                </div>
                {form.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.options.map((opt, idx) => (
                      <Badge key={idx} variant="outline" className="bg-card px-2 py-1 flex items-center gap-1">
                        {opt}
                        <Trash2 className="w-3 h-3 text-red-500 cursor-pointer" onClick={() => removeOption(idx)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Campo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
