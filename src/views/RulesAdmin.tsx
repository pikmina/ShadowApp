import { SectionHeader } from "../components/common/SectionHeader";
import { BookOpen as SectionIcon, Hand, Shield, Heart, Activity, AlertTriangle, Clock, Target, Maximize, TrendingUp, Edit2, Trash2, Plus, GripVertical, Settings2 } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";


const defaultStage = {
  name: "",
  minAge: 15,
  maxAge: 17,
  exp: 2000,
  yen: 2000,
  baseHealth: 20,
  baseStamina: 20,
  baseDefenses: 10,
  attrPoints: 20,
  maxAttr: 6,
  baseDamage: "1D8",
  habN1: 3, habN2: 2, habN3: 1, habN4: 0, habN5: 0,
  techN1: 3, techN2: 0, techN3: 0,
  maxTraits: 3,
  minWeaknesses: 2
};

export default function RulesAdmin() {
  const { user } = useAuth();
  
  

  const { data: rules, error, isLoading, mutate } = useSWR(
    user ? "/api/rules" : null, fetcher
  );

  
  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { key: 'system_mechanics', type: 'json', value: [], description: 'Mecánicas y Costes del Sistema (CE)' };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];
  
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false);
  const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', defaultResolution: 'none', rules: [] });
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCost, setNewRuleCost] = useState(0);
  const [newRuleMechDesc, setNewRuleMechDesc] = useState('');

  const selectedMechanic = mechanics.find((m: any) => m.id === selectedMechanicId);

  const handleSaveMechanic = async () => {
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === mechanicForm.id);
      
      if (existingIndex >= 0) {
        newMechanics[existingIndex] = { ...mechanicForm };
      } else {
        newMechanics.push({ ...mechanicForm, id: mechanicForm.name.toLowerCase().replace(/\s+/g, '_') });
      }

      await apiFetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'system_mechanics',
          type: 'json',
          value: newMechanics,
          description: mechanicsRule.description
        })
      });
      setIsMechanicDialogOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres borrar esta categoría?")) return;
    try {
      const newMechanics = mechanics.filter((m: any) => m.id !== id);
      await apiFetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'system_mechanics',
          type: 'json',
          value: newMechanics,
          description: mechanicsRule.description
        })
      });
      if (selectedMechanicId === id) setSelectedMechanicId(null);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRuleToMechanic = async () => {
    if (!newRuleName.trim() || !selectedMechanic) return;
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === selectedMechanic.id);
      
      if (existingIndex >= 0) {
        const updatedRules = [...(newMechanics[existingIndex].rules || []), { id: Date.now().toString(), name: newRuleName, cost: newRuleCost, mechDesc: newRuleMechDesc }];
        newMechanics[existingIndex] = { ...newMechanics[existingIndex], rules: updatedRules };
        
        await apiFetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: 'system_mechanics',
            type: 'json',
            value: newMechanics,
            description: mechanicsRule.description
          })
        });
        setNewRuleName('');
        setNewRuleCost(0);
        setNewRuleMechDesc('');
        mutate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRuleFromMechanic = async (mechanicId: string, ruleId: string) => {
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === mechanicId);
      
      if (existingIndex >= 0) {
        const updatedRules = newMechanics[existingIndex].rules.filter((r: any) => r.id !== ruleId);
        newMechanics[existingIndex] = { ...newMechanics[existingIndex], rules: updatedRules };
        
        await apiFetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: 'system_mechanics',
            type: 'json',
            value: newMechanics,
            description: mechanicsRule.description
          })
        });
        mutate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const availableIcons = [
    { name: 'HandFist', value: 'Hand', icon: Hand },
    { name: 'Shield', value: 'Shield', icon: Shield },
    { name: 'Heart', value: 'Heart', icon: Heart },
    { name: 'Activity', value: 'Activity', icon: Activity },
    { name: 'Alert', value: 'AlertTriangle', icon: AlertTriangle },
    { name: 'Clock', value: 'Clock', icon: Clock },
    { name: 'Target', value: 'Target', icon: Target },
    { name: 'Area', value: 'Maximize', icon: Maximize },
    { name: 'Bonus', value: 'TrendingUp', icon: TrendingUp },
  ];

  // Parse stages from rules
  const stagesRule = rules?.find((r: any) => r.key === 'system_stages') || { key: 'system_stages', type: 'json', value: [], description: 'Definición estricta de Etapas por Edad' };
  const stages = Array.isArray(stagesRule.value) ? stagesRule.value : [];

  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState({ ...defaultStage });
  
  const attrsRule = rules?.find((r: any) => r.key === 'system_attributes') || { value: [{"id":"fue","name":"Fuerza","abbrev":"FUE","desc":"Capacidad física, levantamiento y daño cuerpo a cuerpo pesado."},{"id":"des","name":"Destreza","abbrev":"DES","desc":"Agilidad, puntería, reflejos y habilidades manuales precisas."},{"id":"res","name":"Resistencia","abbrev":"RES","desc":"Tolerancia al daño físico, enfermedades y fatiga extrema."},{"id":"int","name":"Inteligencia","abbrev":"INT","desc":"Capacidad analítica, memoria, percepción y uso de tecnología."},{"id":"vol","name":"Voluntad","abbrev":"VOL","desc":"Fuerza mental, resistencia psíquica y control de emociones/quirks."},{"id":"vel","name":"Velocidad","abbrev":"VEL","desc":"Capacidad de movimiento, iniciativa en combate y evasión rápida."}] };
  const attributes = attrsRule.value;
  
  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores","formula":"(Valor - 10) / 2","desc":"Bonos aplicados a las tiradas d10."},{"id":"ini","name":"Iniciativa","formula":"Promedio de INT+VEL","desc":"Velocidad de reacción en combate."}] };
  const derived = derivedRule.value;

  const [isAttrDialogOpen, setIsAttrDialogOpen] = useState(false);
  const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);
  const [attrForm, setAttrForm] = useState({ id: '', name: '', abbrev: '', desc: '', formula: '' });
  const [isDerived, setIsDerived] = useState(false);

  const handleOpenAttrDialog = (index: number, derivedFlag: boolean) => {
    setIsDerived(derivedFlag);
    setEditingAttrIndex(index);
    if (derivedFlag) {
      setAttrForm({ ...derived[index] });
    } else {
      setAttrForm({ ...attributes[index] });
    }
    setIsAttrDialogOpen(true);
  };

  const handleSaveAttr = async () => {
    try {
      if (isDerived) {
        const newDerived = [...derived];
        if (editingAttrIndex !== null) newDerived[editingAttrIndex] = { ...attrForm };
        await apiFetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'system_derived', type: 'json', value: newDerived, description: 'Estadísticas derivadas' })
        });
      } else {
        const newAttrs = [...attributes];
        if (editingAttrIndex !== null) newAttrs[editingAttrIndex] = { ...attrForm };
        await apiFetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'system_attributes', type: 'json', value: newAttrs, description: 'Atributos base' })
        });
      }
      mutate();
      setIsAttrDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenStageDialog = (index: number | null) => {
    if (index !== null) {
      setEditingStageIndex(index);
      setStageForm({ ...stages[index] });
    } else {
      setEditingStageIndex(null);
      setStageForm({ ...defaultStage });
    }
    setIsStageDialogOpen(true);
  };

  const handleSaveStage = async () => {
        
    let newStages = [...stages];
    if (editingStageIndex !== null) {
      newStages[editingStageIndex] = stageForm;
    } else {
      newStages.push(stageForm);
    }
    
    // Sort stages logically by minimum age
    newStages.sort((a, b) => a.minAge - b.minAge);

    try {
      const res = await apiFetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "system_stages",
          type: "json",
          value: newStages,
          description: "Definición estricta de Etapas por Edad"
        })
      });

      if (!res.ok) throw new Error("Error saving stage");
      setIsStageDialogOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al guardar la etapa.");
    }
  };

  const handleDeleteStage = async (index: number) => {
        if (!confirm(`¿Estás seguro de eliminar la etapa: ${stages[index].name}?`)) return;

    let newStages = [...stages];
    newStages.splice(index, 1);

    try {
      const res = await apiFetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "system_stages",
          type: "json",
          value: newStages,
          description: "Definición estricta de Etapas por Edad"
        })
      });
      if (!res.ok) throw new Error("Error deleting stage");
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al eliminar la etapa.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Reglas del sistema" description="Etapas, atributos y valores que definen el sistema de juego." />

      <Tabs defaultValue="stages" className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 no-scrollbar">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-muted/60 border border-border/50">
            <TabsTrigger value="stages" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Etapas de Personaje</TabsTrigger>
            <TabsTrigger value="attributes" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Atributos Base</TabsTrigger>
            <TabsTrigger value="derived" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Estad. Derivadas</TabsTrigger>
            <TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>
            <TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Mecánicas y Costes (CE)</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Etapas y Experiencia</CardTitle>
                <CardDescription>
                  Define los valores iniciales y límites según el rango de edad.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenStageDialog(null)}>Añadir Etapa</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead>Exp / Yenes</TableHead>
                      <TableHead>Salud / Def</TableHead>
                      <TableHead>Atributos (Pts/Max)</TableHead>
                      <TableHead>Daño Base</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay etapas configuradas.</TableCell>
                      </TableRow>
                    ) : (
                      stages.map((stage: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{stage.name}</TableCell>
                          <TableCell>{stage.minAge} - {stage.maxAge} años</TableCell>
                          <TableCell>{stage.exp} / {stage.yen}</TableCell>
                          <TableCell>{stage.baseHealth} / {stage.baseDefenses}</TableCell>
                          <TableCell>{stage.attrPoints} pts (Máx {stage.maxAttr})</TableCell>
                          <TableCell>{stage.baseDamage}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenStageDialog(idx)}>Editar</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteStage(idx)}>Borrar</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Atributos Base del Sistema</CardTitle>
              <CardDescription>Estos son los 6 atributos mecánicos inmutables del Motor de Shadowmore. Desde aquí puedes ajustar sus descripciones y abreviaturas para la hoja de personaje.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Abrev.</TableHead>
                      <TableHead>Descripción Narrativa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attributes.map((attr: any, idx: number) => (
                      <TableRow key={attr.id || idx}>
                        <TableCell className="font-semibold">{attr.name}</TableCell>
                        <TableCell className="font-mono text-xs">{attr.abbrev}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{attr.desc}</TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleOpenAttrDialog(idx, false)}>Editar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="derived" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas Derivadas (Fórmulas)</CardTitle>
              <CardDescription>Las estadísticas secundarias que el Motor calcula automáticamente combinando atributos base y reglas de etapa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Estadística</TableHead>
                      <TableHead>Fórmula Matemática</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Salud (SA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Salud Base de Etapa + RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Estamina (ES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Salud Base de Etapa + DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Evasión (EVA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">10 + VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque físico.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Coraje (COR)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">10 + VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque mental.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Modificadores (FUE / DES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Floor(Atributo / 2)</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Daño Base (DB)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Dado de Etapa + Mod. FUE</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Iniciativa (INI)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Floor( (INT + VEL) / 2 ) / 2</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Límites y RD</CardTitle>
              <CardDescription>Esta sección se programará en el siguiente módulo. (Modificadores máximos, Rangos de Dificultad, etc.)</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      
        <TabsContent value="mechanics" className="m-0 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sidebar Categorías */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Categorías de Costes (CE)</h3>
                <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                  setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', defaultResolution: 'none', rules: [] });
                  setIsMechanicDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Nueva
                </Button>
              </div>
              
              <div className="flex flex-col gap-2">
                {mechanics.map((m: any) => {
                  const Icon = availableIcons.find(i => i.value === m.icon)?.icon || Hand;
                  return (
                    <div 
                      key={m.id}
                      onClick={() => setSelectedMechanicId(m.id)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedMechanicId === m.id ? 'bg-black/40 border-primary/50' : 'bg-card border-border hover:border-primary/30 hover:bg-black/20'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-black/40 rounded-md border border-border/50">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{m.name}</h4>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1.5">
                            <span>{(m.rules || []).length} reglas</span>
                            <span>&bull;</span>
                            <span className="capitalize">{m.logicalType}</span>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {m.scope?.techniques && <span className="text-[10px] text-cyan-400">Técnicas</span>}
                            {m.scope?.objects && <span className="text-[10px] text-cyan-400">Objetos</span>}
                            {m.scope?.actions && <span className="text-[10px] text-cyan-400">Acciones normales</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setMechanicForm(m); setIsMechanicDialogOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground">
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteMechanic(m.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {selectedMechanic ? (
                <>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-black/40 rounded-md border border-border/50">
                        {(() => {
                          const Icon = availableIcons.find(i => i.value === selectedMechanic.icon)?.icon || Hand;
                          return <Icon className="w-6 h-6 text-muted-foreground" />;
                        })()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold">{selectedMechanic.name}</h2>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 border border-border/50 capitalize">{selectedMechanic.logicalType}</span>
                          
                          <div className="flex gap-1.5 flex-wrap">
                            {selectedMechanic.scope?.techniques && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Técnicas</span>}
                            {selectedMechanic.scope?.objects && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Objetos</span>}
                            {selectedMechanic.scope?.actions && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Acciones normales</span>}
                            
                            {selectedMechanic.defaultTarget === 'enemy' && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">🎯 Objetivo / Rival</span>}
                            {selectedMechanic.defaultTarget === 'self' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">👤 Portador / Usuario</span>}
                            
                            {selectedMechanic.defaultResolution && selectedMechanic.defaultResolution !== 'none' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-900/50 flex items-center gap-1">
                                🎲 {
                                  selectedMechanic.defaultResolution === 'eva' ? 'vs Evasión (EVA)' :
                                  selectedMechanic.defaultResolution === 'cor' ? 'vs Coraje (COR)' :
                                  selectedMechanic.defaultResolution === 'rd' ? 'vs Dificultad (RD)' :
                                  selectedMechanic.defaultResolution === 'opposed' ? 'Tirada Enfrentada' : ''
                                }
                              </span>
                            )}
                          </div>

                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{selectedMechanic.description}</p>
                      </div>
                    </div>
                  </div>

                  
                  <div className="p-6 rounded-lg border border-border bg-card">
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Añadir nueva regla a {selectedMechanic.name}</h3>
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label>Nombre de la regla (ej: 3D8, Muy Rápido)</Label>
                        <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: 3D8" />
                      </div>
                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label>Efecto Mecánico (Opcional)</Label>
                        <Input value={newRuleMechDesc} onChange={e => setNewRuleMechDesc(e.target.value)} placeholder="Ej: Reduce la Salud en 3D8." />
                      </div>
                      <div className="col-span-8 md:col-span-2 space-y-2">
                        <Label>Coste CE</Label>
                        <Input type="number" value={newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />
                      </div>
                      <div className="col-span-4 md:col-span-12 flex justify-end mt-2">
                        <Button onClick={handleAddRuleToMechanic} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"><Plus className="w-4 h-4 mr-1" /> Añadir</Button>
                      </div>
                    </div>
                  </div>


                  <div className="rounded-lg border border-border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-black/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground">REGLA / OPCIÓN</TableHead>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground w-32 text-center">COSTE (CE)</TableHead>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground w-24 text-right">ACCIONES</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedMechanic.rules || []).map((rule: any) => (
                          <TableRow key={rule.id}>
                            <TableCell><div className="font-medium text-sm">{rule.name}</div>{rule.mechDesc && <div className="text-xs text-muted-foreground mt-0.5">{rule.mechDesc}</div>}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs px-2 py-1 rounded-md font-bold ${rule.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : rule.cost < 0 ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                                {rule.cost > 0 ? '+' : ''}{rule.cost} CE
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <button onClick={() => handleDeleteRuleFromMechanic(selectedMechanic.id, rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!selectedMechanic.rules || selectedMechanic.rules.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                              No hay reglas definidas para esta categoría.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-black/20 text-center p-8">
                  <Settings2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Selecciona una categoría</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Selecciona una categoría del panel izquierdo o crea una nueva para configurar sus reglas y costes mecánicos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* ATTR DIALOG */}
      <Dialog open={isAttrDialogOpen} onOpenChange={setIsAttrDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[500px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Editar {isDerived ? 'Estadística' : 'Atributo'}</DialogTitle>
            <DialogDescription>
              Modifica la descripción o fórmula visual de la regla.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={attrForm.name} onChange={e => setAttrForm({...attrForm, name: e.target.value})} />
            </div>
            {!isDerived && (
              <div className="grid gap-2">
                <Label>Abreviatura</Label>
                <Input value={attrForm.abbrev} onChange={e => setAttrForm({...attrForm, abbrev: e.target.value})} />
              </div>
            )}
            {isDerived && (
              <div className="grid gap-2">
                <Label>Fórmula / Expresión</Label>
                <Input value={attrForm.formula || ''} onChange={e => setAttrForm({...attrForm, formula: e.target.value})} />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Input value={attrForm.desc} onChange={e => setAttrForm({...attrForm, desc: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttrDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAttr}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* STAGE DIALOG */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b">
            <DialogTitle>{editingStageIndex !== null ? "Editar Etapa" : "Nueva Etapa"}</DialogTitle>
            <DialogDescription>
              Ajusta los parámetros estrictos. El sistema generará y validará la información automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 px-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
              
              <div className="col-span-2 grid gap-2">
                <Label>Nombre de la Etapa (Ej: Novato, Leyenda)</Label>
                <Input value={stageForm.name} onChange={e => setStageForm({...stageForm, name: e.target.value})} placeholder="Emergente" />
              </div>

              <div className="grid gap-2">
                <Label>Edad Mínima</Label>
                <Input type="number" value={stageForm.minAge} onChange={e => setStageForm({...stageForm, minAge: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Edad Máxima</Label>
                <Input type="number" value={stageForm.maxAge} onChange={e => setStageForm({...stageForm, maxAge: Number(e.target.value)})} />
              </div>

              <div className="grid gap-2">
                <Label>Experiencia Inicial</Label>
                <Input type="number" value={stageForm.exp} onChange={e => setStageForm({...stageForm, exp: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Yenes Iniciales</Label>
                <Input type="number" value={stageForm.yen} onChange={e => setStageForm({...stageForm, yen: Number(e.target.value)})} />
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Bases de Combate</h4>
              <div className="grid gap-2">
                <Label>Base de Salud</Label>
                <Input type="number" value={stageForm.baseHealth} onChange={e => setStageForm({...stageForm, baseHealth: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Base de Estamina</Label>
                <Input type="number" value={stageForm.baseStamina} onChange={e => setStageForm({...stageForm, baseStamina: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Base de Defensas (Física/Mental)</Label>
                <Input type="number" value={stageForm.baseDefenses} onChange={e => setStageForm({...stageForm, baseDefenses: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Daño Base</Label>
                <Select value={stageForm.baseDamage} onValueChange={v => setStageForm({...stageForm, baseDamage: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el dado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1D4">1D4</SelectItem>
                    <SelectItem value="1D6">1D6</SelectItem>
                    <SelectItem value="1D8">1D8</SelectItem>
                    <SelectItem value="1D10">1D10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Atributos</h4>
              <div className="grid gap-2">
                <Label>Puntos a Repartir</Label>
                <Input type="number" value={stageForm.attrPoints} onChange={e => setStageForm({...stageForm, attrPoints: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Máximo por Atributo</Label>
                <Input type="number" value={stageForm.maxAttr} onChange={e => setStageForm({...stageForm, maxAttr: Number(e.target.value)})} />
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Habilidades Máximas Permitidas</h4>
              <div className="grid grid-cols-5 gap-2 col-span-2">
                <div className="grid gap-1"><Label className="text-xs">Nivel 1</Label><Input type="number" value={stageForm.habN1} onChange={e => setStageForm({...stageForm, habN1: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 2</Label><Input type="number" value={stageForm.habN2} onChange={e => setStageForm({...stageForm, habN2: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 3</Label><Input type="number" value={stageForm.habN3} onChange={e => setStageForm({...stageForm, habN3: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 4</Label><Input type="number" value={stageForm.habN4} onChange={e => setStageForm({...stageForm, habN4: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 5</Label><Input type="number" value={stageForm.habN5} onChange={e => setStageForm({...stageForm, habN5: Number(e.target.value)})} /></div>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Técnicas Máximas Permitidas</h4>
              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div className="grid gap-1"><Label className="text-xs">Nivel 1 (Despertar)</Label><Input type="number" value={stageForm.techN1} onChange={e => setStageForm({...stageForm, techN1: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 2 (Dominio)</Label><Input type="number" value={stageForm.techN2} onChange={e => setStageForm({...stageForm, techN2: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 3 (Trascendencia)</Label><Input type="number" value={stageForm.techN3} onChange={e => setStageForm({...stageForm, techN3: Number(e.target.value)})} /></div>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Rasgos y Debilidades</h4>
              <div className="grid gap-2">
                <Label>Máximo de Rasgos</Label>
                <Input type="number" value={stageForm.maxTraits} onChange={e => setStageForm({...stageForm, maxTraits: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Mínimo de Debilidades</Label>
                <Input type="number" value={stageForm.minWeaknesses} onChange={e => setStageForm({...stageForm, minWeaknesses: Number(e.target.value)})} />
              </div>

            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveStage}>Guardar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MECHANIC CATEGORY DIALOG */}
      <Dialog open={isMechanicDialogOpen} onOpenChange={setIsMechanicDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              {mechanicForm.id ? "Editar Categoría de Regla" : "Nueva Categoría de Regla"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">
            <div className="grid gap-2">
              <Label>Nombre de la Categoría</Label>
              <Input value={mechanicForm.name} onChange={e => setMechanicForm({...mechanicForm, name: e.target.value})} placeholder="Ej: Daño" />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={mechanicForm.description} 
                onChange={e => setMechanicForm({...mechanicForm, description: e.target.value})} 
                placeholder="Impacto ofensivo de la técnica..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo Lógico</Label>
                <Select value={mechanicForm.logicalType} onValueChange={v => setMechanicForm({...mechanicForm, logicalType: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offensive">Ofensiva (Ataque / Daño)</SelectItem>
                    <SelectItem value="defensive">Defensiva (Barreras / Evasión)</SelectItem>
                    <SelectItem value="support">Soporte (Curación / Bonos)</SelectItem>
                    <SelectItem value="control">Control (Estados Alterados)</SelectItem>
                    <SelectItem value="limitation">Limitación (Desventajas)</SelectItem>
                    <SelectItem value="utility">Utilidad (Alcance / Duración)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Icono</Label>
                <Select value={mechanicForm.icon} onValueChange={v => setMechanicForm({...mechanicForm, icon: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="w-4 h-4" />
                          <span>{icon.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-primary mb-3 block">Destinatario por Defecto de los Efectos Mecánicos</Label>
              <p className="text-xs text-muted-foreground mb-4">Define a quién aplicarán automáticamente los efectos de los elementos creados en esta categoría.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'self' ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'self'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'self'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'self' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'self' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm text-primary flex items-center gap-1">👤 Portador Equipado (Usuario)</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armaduras, Trajes, Buffs y Reducción de Daño.</span>
                </label>
                
                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'enemy' ? 'bg-destructive/10 border-destructive' : 'bg-card border-border hover:border-destructive/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'enemy'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'enemy'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'enemy' ? 'border-destructive' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'enemy' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </div>
                    <span className="font-bold text-sm text-destructive flex items-center gap-1">🎯 Objetivo Impactado / Rival</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armas, Proyectiles, Venenos y Daño.</span>
                </label>
              </div>
            </div>

            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-purple-400 mb-3 block">Tipo de Tirada / Resolución de Acción por Defecto</Label>
              <p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría.</p>
              
              <Select value={mechanicForm.defaultResolution} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sin resolución por defecto (Uso Pasivo / Sin tirada) --</SelectItem>
                  <SelectItem value="eva">Ataque Físico / Proyectil (Contra Evasión - EVA)</SelectItem>
                  <SelectItem value="cor">Ataque Mental / Ilusión (Contra Coraje - COR)</SelectItem>
                  <SelectItem value="rd">Acción Compleja (Contra Rango de Dificultad - RD Estático)</SelectItem>
                  <SelectItem value="opposed">Tirada Enfrentada de Atributos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-cyan-400 mb-3 block">Ámbito de Aplicación (¿A qué elementos del sistema aplica?)</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Técnicas</span>
                  <input type="checkbox" checked={mechanicForm.scope?.techniques || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, techniques: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Objetos</span>
                  <input type="checkbox" checked={mechanicForm.scope?.objects || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, objects: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Acciones normales</span>
                  <input type="checkbox" checked={mechanicForm.scope?.actions || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, actions: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">
            <Button variant="outline" onClick={() => setIsMechanicDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMechanic}>Guardar Categoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
