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
import { MechanicalEffectDefinitionEditor, createEffectDefinition, describeEffect } from "../components/mechanics/MechanicalEffectDefinitionEditor";
import type { MechanicalEffectDefinition } from "../domain/systemMechanics";


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
  const { user } = useAuth();
  
  

  const { data: rules, error, isLoading, mutate } = useSWR(
    user ? "/api/rules" : null, fetcher
  );

  
  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { key: 'system_mechanics', type: 'json', value: [], description: 'Categorías Mecánicas y Coste de Estamina (CE)' };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];
  const staminaRule = rules?.find((r: any) => r.key === 'stamina_execution_costs');
  const [staminaCosts, setStaminaCosts] = useState<any>(defaultStaminaCosts);
  const [staminaCostsDirty, setStaminaCostsDirty] = useState(false);
  useEffect(() => {
    if (!staminaCostsDirty && staminaRule?.value) setStaminaCosts(staminaRule.value);
  }, [staminaRule?.value, staminaCostsDirty]);
  
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [activeMechanicView, setActiveMechanicView] = useState<'list' | 'edit'>('list');
  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false); // Deprecated, but keeping to not break if used elsewhere
  const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', targeting: { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }, defaultResolution: 'none', rules: [] });
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCost, setNewRuleCost] = useState(0);
  const [newRuleMechDesc, setNewRuleMechDesc] = useState('');
  const [newRuleType, setNewRuleType] = useState<'effect' | 'cost_modifier'>('effect');
  const [newRuleEffect, setNewRuleEffect] = useState<MechanicalEffectDefinition>(() => createEffectDefinition('damage'));

  const selectedMechanic = mechanics.find((m: any) => m.id === selectedMechanicId);
  const setCategoryRelationship = (relationship: 'self' | 'enemy' | 'ally' | 'any') => setMechanicForm((current: any) => ({
    ...current,
    defaultTarget: relationship,
    targeting: relationship === 'self'
      ? { allowedEntityKinds: ['character', 'npc'], relationship, selection: 'direct', minTargets: 1, maxTargets: 1 }
      : { allowedEntityKinds: ['character', 'npc'], selection: 'direct', minTargets: 1, maxTargets: 1, ...current.targeting, relationship },
  }));

  const saveStaminaCosts = async () => {
    const response = await apiFetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'stamina_execution_costs', type: 'json', value: staminaCosts, description: 'Costes de Estamina por contexto de ejecución' }) });
    if (!response.ok) throw new Error('No se pudieron guardar los costes de Estamina');
    setStaminaCostsDirty(false);
    await mutate();
  };

  const handleSaveMechanic = async () => {
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === mechanicForm.id);
      const relationship = mechanicForm.targeting?.relationship ?? mechanicForm.defaultTarget ?? 'self';
      const normalizedTargeting = relationship === 'self'
        ? { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }
        : (mechanicForm.targeting ?? { allowedEntityKinds: ['character', 'npc'], relationship, selection: 'direct', minTargets: 1, maxTargets: 1 });
      const normalizedForm = { ...mechanicForm, defaultTarget: relationship, targeting: normalizedTargeting };
      
      if (existingIndex >= 0) {
        newMechanics[existingIndex] = normalizedForm;
      } else {
        newMechanics.push({ ...normalizedForm, id: mechanicForm.name.toLowerCase().replace(/\s+/g, '_') });
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
      setActiveMechanicView('list');
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

  
  
  const getEffectLogicalType = (effect: any): 'offensive' | 'defensive' | 'support' | 'control' | 'utility' => {
    if (!effect) return 'utility';
    if (effect.type === 'damage') return 'offensive';
    if (effect.type === 'barrier') return 'defensive';
    if (effect.type === 'healing') return 'support';
    if (effect.type === 'status') return 'control';
    if (effect.type === 'attribute_modifier' || effect.type === 'derived_stat_modifier') return effect.amount >= 0 ? 'support' : 'control';
    return 'utility';
  };

  const deriveLogicalType = (rules: any[]) => {
    const types = rules
      .filter((r: any) => r.ruleType === 'effect' && r.effect)
      .map((r: any) => getEffectLogicalType(r.effect));
    
    if (types.includes('offensive')) return 'offensive';
    if (types.includes('control')) return 'control';
    if (types.includes('support')) return 'support';
    if (types.includes('defensive')) return 'defensive';
    return 'utility';
  };

  const handleAddRuleToForm = () => {
    if (!newRuleName.trim()) return;
    const newRule = {
      id: Date.now().toString(),
      name: newRuleName,
      cost: newRuleCost,
      mechDesc: newRuleMechDesc,
      ruleType: newRuleType,
      ...(newRuleType === 'effect' ? { effect: newRuleEffect } : {}),
    };
    
    const currentRules = mechanicForm.rules || [];
    const allRules = [...currentRules, newRule];
    const types = allRules
      .filter((r: any) => r.ruleType === 'effect' && r.effect)
      .map((r: any) => getEffectLogicalType(r.effect));
      
    const hasOffensiveOrControl = types.includes('offensive') || types.includes('control');
    const hasSupportOrDefensive = types.includes('support') || types.includes('defensive');
    
    if (hasOffensiveOrControl && hasSupportOrDefensive) {
      alert("Incompatibilidad mecánica: No puedes mezclar opciones de Daño/Control con opciones de Soporte/Defensivas en la misma categoría técnica.");
      return;
    }
    
    setMechanicForm((current: any) => ({
      ...current,
      logicalType: deriveLogicalType(allRules),
      rules: allRules
    }));
    setNewRuleName('');
    setNewRuleCost(0);
    setNewRuleMechDesc('');
    setNewRuleType('effect');
    setNewRuleEffect(createEffectDefinition('damage'));
  };

  const handleRemoveRuleFromForm = (ruleId: string) => {
    setMechanicForm((current: any) => {
      const newRules = (current.rules || []).filter((r: any) => r.id !== ruleId);
      return {
        ...current,
        logicalType: deriveLogicalType(newRules),
        rules: newRules
      };
    });
  };

  const handleAddRuleToMechanic = async () => {
    if (!newRuleName.trim() || !selectedMechanic) return;
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === selectedMechanic.id);
      
      if (existingIndex >= 0) {
        const updatedRules = [...(newMechanics[existingIndex].rules || []), {
          id: Date.now().toString(),
          name: newRuleName,
          cost: newRuleCost,
          mechDesc: newRuleMechDesc,
          ruleType: newRuleType,
          ...(newRuleType === 'effect' ? { effect: newRuleEffect } : {}),
        }];
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
        setNewRuleType('effect');
        setNewRuleEffect(createEffectDefinition('damage'));
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
  
  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores (FUE / DES)","formula":"Floor(Atributo / 2)","desc":"Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5."},{"id":"db","name":"Daño Base (DB)","formula":"Dado de Etapa + Mod. FUE","desc":"Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4)."},{"id":"ini","name":"Iniciativa (INI)","formula":"Floor( (INT + VEL) / 2 ) / 2","desc":"Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc)."}] };
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
            <TabsTrigger value="stages" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Etapas por Edad</TabsTrigger>
            <TabsTrigger value="attributes" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Atributos Base</TabsTrigger>
            <TabsTrigger value="derived" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Estad. Derivadas</TabsTrigger>
            <TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>
            <TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Categorías Mecánicas</TabsTrigger>
            <TabsTrigger value="stamina" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Costes de Estamina</TabsTrigger>
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
                    {derived.map((stat: any, idx: number) => (
                      <TableRow key={stat.id || idx}>
                        <TableCell className="font-semibold">{stat.name}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">{stat.formula}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{stat.desc}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAttrDialog(idx, true)}>Editar</Button>
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
            <CardHeader>
              <CardTitle>Límites y RD</CardTitle>
              <CardDescription>Esta sección se programará en el siguiente módulo. (Modificadores máximos, Rangos de Dificultad, etc.)</CardDescription>
            </CardHeader>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key].map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = staminaCosts[key].map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
<TabsContent value="mechanics" className="m-0 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeMechanicView === 'list' ? (
            <div className="space-y-6">
              

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Categorías Mecánicas</h3>
                  <Button size="sm" onClick={() => {
                    setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', targeting: { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }, defaultResolution: 'none', rules: [] });
                    setActiveMechanicView('edit');
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mechanics.map((m: any) => {
                    const Icon = availableIcons.find(i => i.value === m.icon)?.icon || availableIcons[0].icon;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => { setMechanicForm(m); setActiveMechanicView('edit'); }}
                        className="p-4 rounded-lg border bg-card border-border hover:border-primary/50 hover:bg-black/20 transition-all cursor-pointer flex flex-col gap-3"
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
                              <span className="capitalize">{{"offensive": "Ofensiva", "defensive": "Defensiva", "support": "Soporte", "control": "Control", "limitation": "Limitación", "utility": "Utilidad"}[m.logicalType as string] || m.logicalType}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteMechanic(m.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {m.scope?.techniques && <span className="text-[10px] text-cyan-400">Técnicas</span>}
                          {m.scope?.objects && <span className="text-[10px] text-cyan-400">Objetos</span>}
                          {m.scope?.actions && <span className="text-[10px] text-cyan-400">Acciones normales</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setActiveMechanicView('list')}><ArrowLeft className="w-4 h-4 mr-2" /> Volver al listado</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveMechanicView('list')}>Cancelar</Button>
                  <Button onClick={handleSaveMechanic}>Guardar Categoría</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">{mechanicForm.id ? "Editar Categoría" : "Nueva Categoría"}</h3>
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
                        <Label>Tipo Lógico (Derivado)</Label>
                        <div className="flex items-center h-10 px-3 py-2 text-sm border rounded-md bg-muted/50 text-muted-foreground border-input">
                          {{"offensive": "Ofensiva", "defensive": "Defensiva", "support": "Soporte", "control": "Control", "utility": "Utilidad"}[mechanicForm.logicalType as string] || "Utilidad"}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Icono</Label>
                        <Select value={mechanicForm.icon} onValueChange={v => setMechanicForm({...mechanicForm, icon: v})}>
                          <SelectTrigger>
                            <SelectValue>{availableIcons.find(i => i.value === mechanicForm.icon)?.name || "Seleccionar"}</SelectValue>
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
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <Label className="text-primary block">Destinatarios de la Categoría Mecánica</Label>
                    <p className="text-xs text-muted-foreground mb-4">Es la regla efectiva para todas sus opciones. No volverá a capturarse en Catálogo o Técnicas.</p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'self' ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'self'} onChange={() => setCategoryRelationship('self')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'self' ? 'border-primary' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'self' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className="font-bold text-sm text-primary flex items-center gap-1">👤 Portador Equipado (Usuario)</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Armaduras, Trajes, Buffs y Reducción de Daño.</span>
                      </label>
                      
                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'enemy' ? 'bg-destructive/10 border-destructive' : 'bg-card border-border hover:border-destructive/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'enemy'} onChange={() => setCategoryRelationship('enemy')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'enemy' ? 'border-destructive' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'enemy' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                          </div>
                          <span className="font-bold text-sm text-destructive flex items-center gap-1">🎯 Objetivo Impactado / Rival (Enemigo)</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Armas, Proyectiles, Venenos y Daño.</span>
                      </label>

                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'ally' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-card border-border hover:border-emerald-500/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'ally'} onChange={() => setCategoryRelationship('ally')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'ally' ? 'border-emerald-500' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'ally' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                          <span className="font-bold text-sm text-emerald-500 flex items-center gap-1">🤝 Compañero / Aliado</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Curación externa, Buffs de grupo y Apoyo.</span>
                      </label>

                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'any' ? 'bg-amber-500/10 border-amber-500' : 'bg-card border-border hover:border-amber-500/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'any'} onChange={() => setCategoryRelationship('any')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'any' ? 'border-amber-500' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'any' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <span className="font-bold text-sm text-amber-500 flex items-center gap-1">🌐 Cualquier Objetivo</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para objetos consumibles que puedes usar en ti mismo o en otro.</span>
                      </label>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border">
                      <Label className="text-primary mb-3 block">Resolución de la Categoría</Label>
                      <p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría.</p>
                      
                      <Select value={mechanicForm.defaultResolution || 'none'} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>
                        <SelectTrigger className="bg-card">
                          <SelectValue>{{"none": "Sin Tirada (Auto Impacto / Defecto)", "eva": "vs Evasión (EVA)", "cor": "vs Coraje (COR)", "rd": "vs Dificultad (RD)", "opposed": "Tirada Enfrentada"}[mechanicForm.defaultResolution as string] || "Sin Tirada (Auto Impacto / Defecto)"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin Tirada (Auto Impacto / Defecto)</SelectItem>
                          <SelectItem value="eva">vs Evasión (EVA)</SelectItem>
                          <SelectItem value="cor">vs Coraje (COR)</SelectItem>
                          <SelectItem value="rd">vs Dificultad (RD)</SelectItem>
                          <SelectItem value="opposed">Tirada Enfrentada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border">
                      <Label className="text-primary mb-3 block">Alcance (Dónde se puede añadir)</Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.techniques ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, techniques: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Técnicas
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.objects ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, objects: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Objetos (Catálogo)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.actions ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, actions: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Acciones Normales
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <div><h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Añadir opción mecánica a {mechanicForm.name || 'la categoría'}</h3><p className="text-xs text-muted-foreground mt-1">Define una vez el comportamiento y su Coste de Estamina. Catálogo y Técnicas solo seleccionarán esta opción.</p></div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Nombre</Label><Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: Daño 2D8" /></div>
                      <div className="space-y-2"><Label>Clase</Label><Select value={newRuleType} onValueChange={value => setNewRuleType(value as 'effect' | 'cost_modifier')}><SelectTrigger><SelectValue>{newRuleType === 'effect' ? "Mecánica ejecutable" : "Ajuste de Coste de Estamina"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="effect">Mecánica ejecutable</SelectItem><SelectItem value="cost_modifier">Ajuste de Coste de Estamina</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Coste de Estamina (CE)</Label><Input type="number" disabled={newRuleType === 'effect' && newRuleEffect.timing === 'passive'} value={newRuleType === 'effect' && newRuleEffect.timing === 'passive' ? 0 : newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />{newRuleType === 'effect' && newRuleEffect.timing === 'passive' && <p className="text-xs text-muted-foreground">Las mecánicas pasivas existen permanentemente y no consumen Estamina.</p>}</div>
                    </div>
                    <div className="space-y-2"><Label>Descripción</Label><Input value={newRuleMechDesc} onChange={e => setNewRuleMechDesc(e.target.value)} placeholder="Cuándo o por qué se utiliza" /></div>
                    {newRuleType === 'effect' && <MechanicalEffectDefinitionEditor value={newRuleEffect} onChange={effect => { setNewRuleEffect(effect); if (effect.timing === 'passive') setNewRuleCost(0); }} />}
                    <div className="flex justify-end"><Button onClick={handleAddRuleToForm} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"><Plus className="w-4 h-4 mr-1" /> Añadir opción</Button></div>
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
                        {(mechanicForm.rules || []).map((rule: any) => (
                          <TableRow key={rule.id}>
                            <TableCell><div className="font-medium text-sm">{rule.name}</div>{rule.effect && <div className="text-xs text-primary mt-0.5">{describeEffect(rule.effect, mechanicForm.targeting ?? mechanicForm.defaultTargeting)}</div>}{rule.mechDesc && <div className="text-xs text-muted-foreground mt-0.5">{rule.mechDesc}</div>}{!rule.ruleType && <div className="text-xs text-amber-400 mt-0.5">Regla anterior: conviértela explícitamente para que ejecute una mecánica.</div>}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs px-2 py-1 rounded-md font-bold ${rule.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : rule.cost < 0 ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                                {rule.cost > 0 ? '+' : ''}{rule.cost} CE
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <button onClick={() => handleRemoveRuleFromForm(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!mechanicForm.rules || mechanicForm.rules.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                              No hay reglas definidas para esta categoría.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
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
      

    </div>
  );
}
