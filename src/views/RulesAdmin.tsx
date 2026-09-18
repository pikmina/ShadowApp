import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UniversalRulesCatalog } from "../components/mechanics/UniversalRulesCatalog";
import { SectionHeader } from "../components/common/SectionHeader";
import { BookOpen as SectionIcon, Hand, Shield, Heart, Activity, AlertTriangle, Clock, Target, Maximize, TrendingUp, Edit2, Trash2, Plus, GripVertical, Settings2, ArrowLeft } from "lucide-react";
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
import { EmploymentCompensationRules } from "../components/EmploymentCompensationRules";
import { employmentCompensationSchema } from "../domain/employmentCompensation";


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

const defaultStaminaCosts = {
  baseAction: 1,
  objectUse: 1,
  techniqueByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
  skillByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
};

export default function RulesAdmin() {
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const { user } = useAuth();
  
  

  const { data: rules, error, isLoading, mutate } = useSWR(
    user ? "/api/rules" : null, fetcher
  );

  
  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty');
  const difficulties = difficultyRule?.value || { normal: [], sustained: [] };

  const [diffForm, setDiffForm] = useState(difficulties);
  const [diffDirty, setDiffDirty] = useState(false);
  
  useEffect(() => {
    if (!diffDirty && difficultyRule?.value) {
      setDiffForm(difficultyRule.value);
    }
  }, [difficultyRule?.value, diffDirty]);

  const saveDifficulties = async () => {
    const response = await apiFetch('/api/rules', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        key: 'system_difficulty', 
        type: 'json', 
        value: diffForm, 
        description: 'Rangos de Dificultad para tiradas' 
      }) 
    });
    if (!response.ok) throw new Error('No se pudieron guardar las dificultades');
    setDiffDirty(false);
    await mutate();
  };

  const addDiff = (type: 'normal' | 'sustained') => {
    setDiffDirty(true);
    setDiffForm({
      ...diffForm,
      [type]: [
        ...(diffForm[type] || []),
        type === 'normal' 
          ? { name: "Nueva Dificultad", rd: 10, desc: "" }
          : { name: "Nuevo Proyecto", successes: 5, desc: "" }
      ]
    });
  };

  const updateDiff = (type: 'normal' | 'sustained', index: number, field: string, val: any) => {
    setDiffDirty(true);
    const newList = [...(diffForm[type] || [])];
    newList[index] = { ...newList[index], [field]: val };
    setDiffForm({ ...diffForm, [type]: newList });
  };

  const removeDiff = (type: 'normal' | 'sustained', index: number) => {
    setDiffDirty(true);
    const newList = [...(diffForm[type] || [])];
    newList.splice(index, 1);
    setDiffForm({ ...diffForm, [type]: newList });
  };

  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { key: 'system_mechanics', type: 'json', value: [], description: 'Categorías Mecánicas y Coste de Estamina (CE)' };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];
  const employmentCompensationRule = rules?.find((r: any) => r.key === 'employment_compensation');
  const employmentCompensation = employmentCompensationSchema.safeParse(employmentCompensationRule?.value);
  const staminaRule = rules?.find((r: any) => r.key === 'stamina_execution_costs');
  const [staminaCosts, setStaminaCosts] = useState<any>(defaultStaminaCosts);
  const [staminaCostsDirty, setStaminaCostsDirty] = useState(false);
  useEffect(() => {
    if (!staminaCostsDirty && staminaRule?.value) setStaminaCosts(staminaRule.value);
  }, [staminaRule?.value, staminaCostsDirty]);
  
  const saveStaminaCosts = async () => {
    const response = await apiFetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'stamina_execution_costs', type: 'json', value: staminaCosts, description: 'Costes de Estamina por contexto de ejecución' }) });
    if (!response.ok) throw new Error('No se pudieron guardar los costes de Estamina');
    setStaminaCostsDirty(false);
    await mutate();
  };

  // Parse stages from rules
  const stagesRule = rules?.find((r: any) => r.key === 'system_stages') || { key: 'system_stages', type: 'json', value: [], description: 'Definición estricta de Etapas por Edad' };
  const stages = Array.isArray(stagesRule.value) ? stagesRule.value : [];

  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState({ ...defaultStage });
  
  const attrsRule = rules?.find((r: any) => r.key === 'system_attributes') || { value: [{"id":"fue","name":"Fuerza","abbrev":"FUE","desc":"Capacidad física, levantamiento y daño cuerpo a cuerpo pesado."},{"id":"des","name":"Destreza","abbrev":"DES","desc":"Agilidad, puntería, reflejos y habilidades manuales precisas."},{"id":"res","name":"Resistencia","abbrev":"RES","desc":"Tolerancia al daño físico, enfermedades y fatiga extrema."},{"id":"int","name":"Inteligencia","abbrev":"INT","desc":"Capacidad analítica, memoria, percepción y uso de tecnología."},{"id":"vol","name":"Voluntad","abbrev":"VOL","desc":"Fuerza mental, resistencia psíquica y control de emociones/quirks."},{"id":"vel","name":"Velocidad","abbrev":"VEL","desc":"Capacidad de movimiento, iniciativa en combate y evasión rápida."}] };
  const attributes = attrsRule.value;
  
  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores (FUE / DES)","formula":"Floor(Atributo / 2)","desc":"Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5."},{"id":"df","name":"Daño Físico (DF)","formula":"Dado de Etapa + Mod. FUE","desc":"Daño cuerpo a cuerpo. Ej: 1D8 + 2 (si FUE es 4)."},{"id":"dr","name":"Daño de Rango (DR)","formula":"Dado de Etapa + Mod. DES","desc":"Daño a distancia. Ej: 1D8 + 2 (si DES es 4)."},{"id":"ini","name":"Iniciativa (INI)","formula":"Floor( (INT + VEL) / 2 ) / 2","desc":"Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc)."}] };
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

  const confirmDeleteStage = async () => {
    if (deleteConfirmIndex === null) return;
    const index = deleteConfirmIndex;
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
    } finally {
      setDeleteConfirmIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Reglas del sistema" description="Etapas, atributos y valores que definen el sistema de juego." />

      <Tabs defaultValue="stages" className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 no-scrollbar">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-muted/60 border border-border/50">
            <TabsTrigger value="stages" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Etapas por Edad</TabsTrigger>
            <TabsTrigger value="attributes" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Atributos Base</TabsTrigger>
            <TabsTrigger value="derived" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Estad. Derivadas</TabsTrigger>
            <TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>
            <TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Categorías Mecánicas</TabsTrigger>
            <TabsTrigger value="stamina" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Costes de Estamina</TabsTrigger>
            <TabsTrigger value="employment" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Empleos y nómina</TabsTrigger>
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
                      <TableHead>Dado Base</TableHead>
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
                              <Button variant="outline" size="icon" onClick={() => handleOpenStageDialog(idx)}><Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmIndex(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                        <TableCell className="text-right"><Button variant="outline" size="icon" onClick={() => handleOpenAttrDialog(idx, false)}><Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button></TableCell>
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
                    {derived.map((stat: any, idx: number) => (
                      <TableRow key={stat.id || idx}>
                        <TableCell className="font-semibold">{stat.name}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">{stat.formula}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{stat.desc}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="icon" onClick={() => handleOpenAttrDialog(idx, true)}><Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rangos de Dificultad (RD)</CardTitle>
                <CardDescription>Configura los valores objetivo para superar tiradas.</CardDescription>
              </div>
              <Button onClick={saveDifficulties}>Guardar Dificultades</Button>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Normal Rolls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Tiradas Normales</h3>
                  <Button variant="outline" size="sm" onClick={() => addDiff('normal')}>
                    <Plus className="w-4 h-4 mr-2" /> Añadir RD
                  </Button>
                </div>
                <div className="space-y-2">
                  {(diffForm.normal || []).map((diff: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-start bg-muted/50 p-2 rounded-md">
                      <div className="grid gap-2 flex-1">
                        <div className="flex gap-2">
                          <Input className="flex-1" value={diff.name} onChange={e => updateDiff('normal', idx, 'name', e.target.value)} placeholder="Nombre (Ej: Normal)" />
                          <Input className="w-24 text-center font-mono font-bold" type="number" value={diff.rd} onChange={e => updateDiff('normal', idx, 'rd', Number(e.target.value))} placeholder="RD" />
                        </div>
                        <Input value={diff.desc} onChange={e => updateDiff('normal', idx, 'desc', e.target.value)} placeholder="Descripción (Opcional)" className="text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeDiff('normal', idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!diffForm.normal || diffForm.normal.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay RDs normales configurados.</p>
                  )}
                </div>
              </div>

              {/* Sustained Rolls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Tiradas Sostenidas (Proyectos)</h3>
                  <Button variant="outline" size="sm" onClick={() => addDiff('sustained')}>
                    <Plus className="w-4 h-4 mr-2" /> Añadir Proyecto
                  </Button>
                </div>
                <div className="space-y-2">
                  {(diffForm.sustained || []).map((diff: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-start bg-muted/50 p-2 rounded-md">
                      <div className="grid gap-2 flex-1">
                        <div className="flex gap-2">
                          <Input className="flex-1" value={diff.name} onChange={e => updateDiff('sustained', idx, 'name', e.target.value)} placeholder="Nombre (Ej: Difícil)" />
                          <div className="flex items-center gap-2 bg-background border px-3 rounded-md w-32 shrink-0">
                            <Input className="w-12 p-0 border-0 text-center h-8" type="number" value={diff.successes} onChange={e => updateDiff('sustained', idx, 'successes', Number(e.target.value))} />
                            <span className="text-xs text-muted-foreground">Éxitos</span>
                          </div>
                        </div>
                        <Input value={diff.desc} onChange={e => updateDiff('sustained', idx, 'desc', e.target.value)} placeholder="Descripción (Opcional)" className="text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeDiff('sustained', idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!diffForm.sustained || diffForm.sustained.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay tiradas sostenidas configuradas.</p>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      
        
        <TabsContent value="stamina" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Costes Base de Estamina (CE)</CardTitle>
                <CardDescription>
                  Define los costes por defecto para ejecutar mecánicas básicas y de progresión. Se cobra al ejecutar; las mecánicas pasivas cuestan 0.
                </CardDescription>
              </div>
              <Button onClick={saveStaminaCosts}>Guardar costes base</Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 border-t border-border/50">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Costo mínimo por técnica</Label><Input type="number" min={1} value={staminaCosts.minTechniqueCost ?? 1} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, minTechniqueCost: Number(e.target.value)}); }} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key as keyof typeof staminaCosts]?.map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = (staminaCosts[key as keyof typeof staminaCosts] as any[]).map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
              </div>
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-bold">Dificultad de Técnicas de Soporte/Defensa</Label>
                    <p className="text-sm text-muted-foreground">La RD a superar depende del Coste de Estamina final de la técnica.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const newSupport = [...(staminaCosts.supportDifficulty || [])];
                    newSupport.push({ maxCost: 0, difficultyId: "" });
                    setStaminaCostsDirty(true);
                    setStaminaCosts({ ...staminaCosts, supportDifficulty: newSupport });
                  }}>
                    <Plus className="w-4 h-4 mr-2" /> Añadir Rango
                  </Button>
                </div>
                <div className="grid gap-2">
                  {(staminaCosts.supportDifficulty || []).map((sd: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center bg-muted/30 p-2 rounded-md">
                      <span className="text-sm shrink-0">Coste CE hasta:</span>
                      <Input type="number" min={0} className="w-24" value={sd.maxCost} onChange={e => {
                        const newSupport = [...(staminaCosts.supportDifficulty || [])];
                        newSupport[idx] = { ...newSupport[idx], maxCost: Number(e.target.value) };
                        setStaminaCostsDirty(true);
                        setStaminaCosts({ ...staminaCosts, supportDifficulty: newSupport });
                      }} />
                      <span className="text-sm shrink-0">=&gt; RD:</span>
                      <Select value={sd.difficultyId || ""} onValueChange={v => {
                        const newSupport = [...(staminaCosts.supportDifficulty || [])];
                        newSupport[idx] = { ...newSupport[idx], difficultyId: v };
                        setStaminaCostsDirty(true);
                        setStaminaCosts({ ...staminaCosts, supportDifficulty: newSupport });
                      }}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecciona Dificultad">
                            {sd.difficultyId 
                              ? `${sd.difficultyId} (RD ${(diffForm.normal || []).find((d: any) => d.name === sd.difficultyId)?.rd || '?'})`
                              : "Selecciona Dificultad"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(diffForm.normal || []).map((d: any) => (
                            <SelectItem key={d.name} value={d.name}>{d.name} (RD {d.rd})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => {
                        const newSupport = [...(staminaCosts.supportDifficulty || [])];
                        newSupport.splice(idx, 1);
                        setStaminaCostsDirty(true);
                        setStaminaCosts({ ...staminaCosts, supportDifficulty: newSupport });
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!staminaCosts.supportDifficulty || staminaCosts.supportDifficulty.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay rangos configurados.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="employment" className="mt-6">
          {employmentCompensation.success ? <EmploymentCompensationRules value={employmentCompensation.data} onSave={async value => {
            const response = await apiFetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'employment_compensation', type: 'json', value, description: 'Tablas de remuneración por nivel y riesgo para empleos' }) });
            if (!response.ok) throw new Error('No se pudo guardar la remuneración de empleos');
            await mutate();
          }} /> : <Card><CardHeader><CardTitle>Configuración no disponible</CardTitle><CardDescription>La regla de remuneración falta o no es válida. Reinicia el servidor para ejecutar la semilla aditiva antes de editarla.</CardDescription></CardHeader></Card>}
        </TabsContent>
<TabsContent value="mechanics" className="mt-6"><UniversalRulesCatalog mechanics={mechanics} onSave={async value => { await apiFetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'system_mechanics', type: 'json', value, description: mechanicsRule.description }) }); await mutate(); }} /></TabsContent>

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
                <Label>Dado Base</Label>
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
      

    
      <AlertDialog open={deleteConfirmIndex !== null} onOpenChange={(open) => !open && setDeleteConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar la etapa "{deleteConfirmIndex !== null ? stages[deleteConfirmIndex]?.name : ''}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStage} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
