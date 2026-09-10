import { SectionHeader } from "../components/common/SectionHeader";
import { Library as SectionIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "../lib/api";
import { calculateTotalCE, getCELevel, resolveLiveRule } from "../domain/mechanics";
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

const EFFECT_TYPES: Record<string, string> = {
  modify_attribute: "Modificar Atributo",
  modify_derived: "Modificar Estadística Derivada",
  deal_damage: "Causar Daño",
  apply_status: "Aplicar Estado Alterado",
  player_choice: "Elección del Jugador",
  recover_stat: "Recuperar Salud/Estamina",
  grant_currency: "Ingreso / Economía",
  system_override: "Excepción de Regla (Flag)",
  mechanic_rule: "Regla del Sistema (CE)"
};

export default function CatalogAdmin() {
  const { user } = useAuth();
  
  

  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];

  const { data: rawElements, mutate } = useSWR(
    user ? "/api/elements" : null, fetcher
  );

  const elements = rawElements?.filter((el: any) => el.kind !== "technique" && el.kind !== "technique_entitlement");

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

  const calculatedCE = calculateTotalCE(form.effects || [], mechanics);
  const ceLevel = getCELevel(calculatedCE);

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Catálogo de elementos" description="Define los rasgos, debilidades, habilidades y estados del sistema." actions={<Button onClick={() => handleOpenDialog()}><Plus className="size-4" aria-hidden="true" />Crear elemento</Button>} />

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
            {(!elements || elements.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  El catálogo está vacío. Haz clic en "Crear Elemento" para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              elements.map((el: any) => (
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
                      <Button variant="outline" size="icon" aria-label={`Editar ${el.name}`} onClick={() => handleOpenDialog(el)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="destructive" size="icon" aria-label={`Eliminar ${el.name}`} onClick={() => handleDelete(el.id)}><Trash2 className="w-4 h-4" /></Button>
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
                  <TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Requisitos</TabsTrigger>
                  <TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Efectos Mecánicos</TabsTrigger>
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
                        <div key={effect._id} className="flex flex-col gap-2 bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-md">
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
                                <SelectItem value="mechanic_rule">Regla del Sistema (CE)</SelectItem>
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

                            
                            {effect.type === "mechanic_rule" && (
                              <>
                                <span className="text-sm">Categoría:</span>
                                <Select value={effect.mechanicId || ""} onValueChange={v => {
                                  updateEffect(effect._id, { mechanicId: v, ruleId: "" });
                                }}>
                                  <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Seleccionar Categoría" /></SelectTrigger>
                                  <SelectContent>
                                    {mechanics.map((m: any) => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {effect.mechanicId && (
                                  <>
                                    <span className="text-sm">Regla:</span>
                                    <Select value={effect.ruleId || ""} onValueChange={v => {
                                      const mechanic = mechanics.find((m: any) => m.id === effect.mechanicId);
                                      const rule = mechanic?.rules?.find((r: any) => r.id === v);
                                      updateEffect(effect._id, { 
                                        ruleId: v, 
                                        ruleName: rule?.name, 
                                        cost: rule?.cost, 
                                        mechDesc: rule?.mechDesc,
                                        resolution: mechanic?.defaultResolution,
                                        target: mechanic?.defaultTarget
                                      });
                                    }}>
                                      <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Seleccionar Regla" /></SelectTrigger>
                                      <SelectContent>
                                        {(mechanics.find((m: any) => m.id === effect.mechanicId)?.rules || []).map((r: any) => (
                                          <SelectItem key={r.id} value={r.id}>{r.name} ({r.cost > 0 ? '+' : ''}{r.cost} CE)</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
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
                  <div className="mt-8 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-indigo-300 mb-2">Simulador de Coste (CE)</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-indigo-200">Coste total calculado por el motor:</span>
                      <Badge className="bg-indigo-600">{ceLevel} - Coste: {calculatedCE}</Badge>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
            <div className="w-full md:w-80 bg-black/40 border-l border-border flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-card/50 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold tracking-wider text-sm uppercase text-foreground">Resumen de Coste</h3>
              </div>
              
              <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                <div className="bg-card border border-border p-6 rounded-lg text-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                  
                  <div className="text-6xl font-black font-mono text-primary mb-2 drop-shadow-md">
                    {calculateTotalCE(form.effects || [], mechanics)}
                  </div>
                  <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Coste de Activación (CE)
                  </div>
                </div>

                {form.effects.filter((e: any) => e.type === 'mechanic_rule').length === 0 && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-2">
                    <span className="text-lg leading-none">⚠️</span>
                    <span className="flex-1">Selecciona al menos una regla mecánica (CE) en la pestaña Efectos para calcular su coste.</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider border-b border-border pb-1">Desglose de Reglas</h4>
                  <div className="flex flex-col gap-2">
                    {form.effects.filter((e: any) => e.type === 'mechanic_rule').map((e: any, i: number) => {
                      const liveRule = resolveLiveRule(e, mechanics);
                      const cost = liveRule ? liveRule.cost : (e.cost || 0);
                      const name = liveRule ? liveRule.name : (e.ruleName ? e.ruleName + ' (Desvinculado)' : 'Regla (Desvinculada)');
                      return (
                      <div key={i} className="flex justify-between items-center text-sm border border-border/50 bg-black/20 p-2 rounded">
                        <span className="truncate pr-2 text-foreground/80">{name}</span>
                        <span className={`font-mono font-bold shrink-0 ${cost > 0 ? 'text-destructive' : cost < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {cost > 0 ? '+' : ''}{cost || 0}
                        </span>
                      </div>
                    )
                  })}
                  </div>
                </div>
              </div>
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
