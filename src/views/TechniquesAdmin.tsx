import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
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
import { Plus, Settings2, Trash2, Edit } from "lucide-react";
import { nanoid } from "nanoid";
import { ScrollArea } from "../components/ui/scroll-area";


const defaultForm = {
  id: "",
  kind: "technique",
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

const EFFECT_TYPES: Record<string, string> = {
  modify_attribute: "Modificar Atributo",
  modify_derived: "Modificar Estadística Derivada",
  deal_damage: "Causar Daño",
  apply_status: "Aplicar Estado Alterado",
  player_choice: "Elección del Jugador"
};

export default function TechniquesAdmin() {
  const { user } = useAuth();
  
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then(setToken);
  }, [getToken]);

  const { data: rawElements, mutate } = useSWR(
    user ? "/api/elements" : null, fetcher
  );

  const elements = rawElements?.filter((el: any) => el.kind === "technique");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);

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
    if (!token) return;
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

  const handleDelete = async (id: string) => {
    if (!confirm("¿Borrar este elemento?")) return;
    try {
      await apiFetch(`/api/elements/${id}`, {
        method: "DELETE" });
      mutate();
    } catch (e) {
      alert("Error borrando");
    }
  };

  const addEffect = () => {
    setForm(f => ({
      ...f,
      effects: [...f.effects, { _id: nanoid(), type: "modify_attribute", target: "FUE", value: 1 }]
    }));
  };

  const removeEffect = (id: string) => {
    setForm(f => ({
      ...f,
      effects: f.effects.filter(e => e._id !== id)
    }));
  };

  const updateEffect = (id: string, updates: any) => {
    setForm(f => ({
      ...f,
      effects: f.effects.map(e => {
        if (e._id === id) {
          const next = { ...e, ...updates };
          if (updates.type && e.type !== updates.type) {
            next.target = undefined;
            next.value = undefined;
            next.duration = undefined;
            next.dice = undefined;
            next.recipient = undefined;
            next.frequency = undefined;
            
            if (updates.type === 'grant_currency') next.target = 'yen';
            if (updates.type === 'recover_stat') next.target = 'ES';
            if (updates.type === 'modify_attribute') { next.target = 'FUE'; next.value = 1; }
            if (updates.type === 'deal_damage') next.target = 'enemy';
            if (updates.type === 'modify_derived') { next.target = 'EVA'; next.value = 1; }
          }
          return next;
        }
        return e;
      })
    }));
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

  // Basic CE calculation simulator
  let calculatedCE = 0;
  form.effects.forEach(e => {
    if (e.type === "deal_damage") calculatedCE += 2;
    if (e.type === "apply_status") calculatedCE += 1;
    if (e.type === "modify_attribute") calculatedCE += Number(e.value || 0);
  });
  const ceLevel = calculatedCE <= 2 ? "Nivel 1 (Bajo)" : calculatedCE <= 5 ? "Nivel 2 (Medio)" : "Nivel 3+ (Alto)";

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
                      <Button variant="outline" size="icon" onClick={() => handleOpenDialog(el)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(el.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[800px] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{form.id ? "Editar Técnica" : "Diseñador de Técnicas"}</DialogTitle>
            <DialogDescription>
              Construye técnicas de combate paso a paso sin programar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
              <div className="px-4 sm:px-6 pt-3 pb-2 border-b bg-muted/40 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-card border border-border/50">
                  <TabsTrigger value="info" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">1. Info Básica</TabsTrigger>
                  <TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Requisitos</TabsTrigger>
                  <TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Efectos Mecánicos</TabsTrigger>
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
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="effects" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Motor de Efectos (Lego)</h3>
                      <p className="text-xs text-muted-foreground">Añade los bloques matemáticos que esto ejecuta en combate o en la ficha.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addEffect}>
                      <Settings2 className="w-4 h-4 mr-1" /> Añadir Efecto
                    </Button>
                  </div>
                  
                  {form.effects.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                      Este elemento es puramente narrativo, no tiene efectos mecánicos programados.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {form.effects.map((effect, idx) => (
                        <div key={effect._id} className="flex flex-col gap-2 bg-indigo-50/50 border border-indigo-100 p-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600">{idx + 1}</Badge>
                            <Select value={effect.type} onValueChange={v => updateEffect(effect._id, { type: v })}>
                              <SelectTrigger className="w-[220px] bg-card">
                                <SelectValue>{EFFECT_TYPES[effect.type] || "Seleccionar Efecto"}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="modify_attribute">Modificar Atributo</SelectItem>
                                <SelectItem value="modify_derived">Modificar Estadística Derivada</SelectItem>
                                <SelectItem value="deal_damage">Causar Daño</SelectItem>
                                <SelectItem value="apply_status">Aplicar Estado Alterado</SelectItem>
                                <SelectItem value="player_choice">Elección del Jugador</SelectItem>
                                <SelectItem value="recover_stat">Recuperar Salud/Estamina</SelectItem>
                                <SelectItem value="grant_currency">Ingreso / Economía</SelectItem>
                                <SelectItem value="system_override">Excepción de Regla (Flag)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="text-red-500 ml-auto" onClick={() => removeEffect(effect._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 pl-10">
                            {effect.type === "modify_attribute" && (
                              <>
                                <span className="text-sm">Atributo:</span>
                                <Select value={effect.target} onValueChange={v => updateEffect(effect._id, { target: v })}>
                                  <SelectTrigger className="w-[120px] bg-card"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FUE">Fuerza</SelectItem>
                                    <SelectItem value="DES">Destreza</SelectItem>
                                    <SelectItem value="RES">Resistencia</SelectItem>
                                    <SelectItem value="INT">Inteligencia</SelectItem>
                                    <SelectItem value="VOL">Voluntad</SelectItem>
                                    <SelectItem value="VEL">Velocidad</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Modificador (Ej: +1, -2):</span>
                                <Input type="number" className="w-24 bg-card" value={effect.value} onChange={e => updateEffect(effect._id, { value: Number(e.target.value) })} />
                              </>
                            )}

                            {effect.type === "deal_damage" && (
                              <>
                                <span className="text-sm">Dado(s):</span>
                                <Input placeholder="Ej: 2D6" className="w-24 bg-card" value={effect.dice || ""} onChange={e => updateEffect(effect._id, { dice: e.target.value })} />
                                <span className="text-sm">Objetivo:</span>
                                <Select value={effect.target || "enemy"} onValueChange={v => updateEffect(effect._id, { target: v })}>
                                  <SelectTrigger className="w-[120px] bg-card"><SelectValue>{effect.target === 'ally' ? 'Aliado' : effect.target === 'self' ? 'A sí mismo' : effect.target === 'area' ? 'Área (AoE)' : 'Enemigo'}</SelectValue></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="enemy">Enemigo</SelectItem>
                                    <SelectItem value="ally">Aliado</SelectItem>
                                    <SelectItem value="self">A sí mismo</SelectItem>
                                    <SelectItem value="area">Área (AoE)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            
                            {effect.type === "apply_status" && (
                              <>
                                <span className="text-sm">ID del Estado:</span>
                                <Input placeholder="ej: quemadura_grave" className="flex-1 bg-card" value={effect.target || ""} onChange={e => updateEffect(effect._id, { target: e.target.value })} />
                                <span className="text-sm">Duración (Turnos):</span>
                                <Input type="number" className="w-20 bg-card" value={effect.duration || 1} onChange={e => updateEffect(effect._id, { duration: Number(e.target.value) })} />
                              </>
                            )}

                            {effect.type === "player_choice" && (
                              <>
                                <span className="text-sm">Opciones (separadas por coma):</span>
                                <Input placeholder="FUE, DES, RES..." className="flex-1 bg-card" value={effect.value || ""} onChange={e => updateEffect(effect._id, { value: e.target.value })} />
                              </>
                            )}

                            {effect.type === "modify_derived" && (
                              <>
                                <span className="text-sm">Estadística:</span>
                                <Select value={effect.target || "EVA"} onValueChange={v => updateEffect(effect._id, { target: v })}>
                                  <SelectTrigger className="w-[140px] bg-card"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="SA">Salud Máxima</SelectItem>
                                    <SelectItem value="ES">Estamina Máx</SelectItem>
                                    <SelectItem value="EVA">Evasión</SelectItem>
                                    <SelectItem value="COR">Coraje</SelectItem>
                                    <SelectItem value="DB">Daño Base</SelectItem>
                                    <SelectItem value="INI">Iniciativa</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Modificador (Ej: +1, -2):</span>
                                <Input type="number" className="w-24 bg-card" value={effect.value || 1} onChange={e => updateEffect(effect._id, { value: Number(e.target.value) })} />
                              </>
                            )}

                            {effect.type === "recover_stat" && (
                              <>
                                <span className="text-sm">Recuperar:</span>
                                <Select value={effect.target || "ES"} onValueChange={v => updateEffect(effect._id, { target: v })}>
                                  <SelectTrigger className="w-[120px] bg-card"><SelectValue>{effect.target === 'SA' ? 'Salud' : 'Estamina'}</SelectValue></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ES">Estamina</SelectItem>
                                    <SelectItem value="SA">Salud</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Cantidad:</span>
                                <Input type="number" className="w-20 bg-card" value={effect.value || 1} onChange={e => updateEffect(effect._id, { value: Number(e.target.value) })} />
                                <span className="text-sm">Objetivo:</span>
                                <Select value={effect.recipient || "self"} onValueChange={v => updateEffect(effect._id, { recipient: v })}>
                                  <SelectTrigger className="w-[120px] bg-card"><SelectValue>{effect.recipient === 'ally' ? 'Aliado(s)' : 'A sí mismo'}</SelectValue></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="self">A sí mismo</SelectItem>
                                    <SelectItem value="ally">Aliado(s)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}

                            {effect.type === "grant_currency" && (
                              <>
                                <span className="text-sm">Moneda:</span>
                                <Select value={effect.target || "yen"} onValueChange={v => updateEffect(effect._id, { target: v })}>
                                  <SelectTrigger className="w-[120px] bg-card"><SelectValue>{effect.target === 'exp' ? 'Experiencia' : 'Yenes'}</SelectValue></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yen">Yenes</SelectItem>
                                    <SelectItem value="exp">Experiencia</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-sm">Cantidad:</span>
                                <Input type="number" className="w-24 bg-card" value={effect.value || 0} onChange={e => updateEffect(effect._id, { value: Number(e.target.value) })} />
                                <span className="text-sm">Frecuencia:</span>
                                <Input placeholder="Ej: por mes, por sesión..." className="flex-1 bg-card" value={effect.frequency || ""} onChange={e => updateEffect(effect._id, { frequency: e.target.value })} />
                              </>
                            )}

                            {effect.type === "system_override" && (
                              <>
                                <span className="text-sm">Regla a ignorar/sobreescribir:</span>
                                <Input placeholder="Ej: max_attribute_limit" className="flex-1 bg-card" value={effect.target || ""} onChange={e => updateEffect(effect._id, { target: e.target.value })} />
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Simulador de Cálculo de CE */}
                  <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-2">Simulador de Coste (CE)</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-indigo-700">Coste total calculado por el motor:</span>
                      <Badge className="bg-indigo-600">{ceLevel} - Coste: {calculatedCE}</Badge>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Técnica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
