import { EntityPanel } from "../ui/entity-panel";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { systemMechanicsConfigSchema, type SystemMechanicsConfig } from '../../domain/systemMechanics';
import { getCoreCategoryContract } from '../../domain/coreRuleCatalog';
import { createEffectDefinition, describeEffect, MechanicalEffectDefinitionEditor } from './MechanicalEffectDefinitionEditor';
import { RuleComponentEditor, componentTemplates } from './RuleComponentEditor';
import { Edit2, Plus, Trash2, Swords, Shield, HeartHandshake, Brain, Lock, Wrench, Package, HandFist, HeartPulse, BrickWall, UserRoundPlus, UserRoundMinus, BugOff, MessageSquareDiff, Handshake, Target, Hash, FoldHorizontal, LandPlot, Hourglass, Star, Clock, ArrowUpCircle, Ban, HandGrab, Eye, Ear, UserStar, Parentheses, KeyRound, CookingPot, Dices, BatteryCharging, BatteryPlus, BoneFracture, ClockArrowDown, Flame, LineDotRightHorizontal, ClockArrowRight, RefreshCw, Settings2, Sparkles, AlertCircle } from 'lucide-react';

type Category = SystemMechanicsConfig[number];

const CoreKeyIcon = ({ coreKey, className }: { coreKey?: string, className?: string }) => {
  switch (coreKey) {
    case 'damage': return <HandFist className={className} />;
    case 'damage_type': return <Swords className={className} />;
    case 'healing': return <HeartPulse className={className} />;
    case 'barrier': return <BrickWall className={className} />;
    case 'numeric_modifier': return <Hash className={className} />;
    case 'bonus': return <UserRoundPlus className={className} />;
    case 'penalty': return <UserRoundMinus className={className} />;
    case 'status': return <BugOff className={className} />;
    case 'cost_adjustment': return <MessageSquareDiff className={className} />;
    case 'manual_resolution': return <Handshake className={className} />;
    case 'target': return <Target className={className} />;
    case 'target_count': return <Hash className={className} />;
    case 'range': return <FoldHorizontal className={className} />;
    case 'area': return <LandPlot className={className} />;
    case 'selection_restriction': return <Target className={className} />;
    case 'duration': return <Hourglass className={className} />;
    case 'frequency': return <RefreshCw className={className} />;
    case 'activation': return <Star className={className} />;
    case 'trigger': return <Flame className={className} />;
    case 'resolution': return <Handshake className={className} />;
    case 'roll_type': return <Dices className={className} />;
    case 'cooldown': return <Clock className={className} />;
    case 'maintenance': return <ArrowUpCircle className={className} />;
    case 'usage': return <Ban className={className} />;
    case 'resource_threshold': return <Parentheses className={className} />;
    case 'manual_condition': return <Handshake className={className} />;
    case 'additional_requirement': return <Settings2 className={className} />;
    case 'die_condition': return <Dices className={className} />;
    case 'health_cost': return <HeartPulse className={className} />;
    case 'caps': return <Ban className={className} />;
    default: return <Package className={className} />;
  }
};

const getLogicalTypeColor = (type: string) => {
  switch (type) {
    case 'offensive': return 'text-red-400 bg-red-950/30 border-red-900/50';
    case 'defensive': return 'text-blue-400 bg-blue-950/30 border-blue-900/50';
    case 'support': return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
    case 'control': return 'text-purple-400 bg-purple-950/30 border-purple-900/50';
    case 'limitation': return 'text-amber-400 bg-amber-950/30 border-amber-900/50';
    default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
  }
};

const getLogicalTypeLabel = (type: string) => {
  switch (type) {
    case 'offensive': return 'Ofensiva';
    case 'defensive': return 'Defensiva';
    case 'support': return 'Soporte';
    case 'control': return 'Control';
    case 'limitation': return 'Limitación';
    case 'utility': return 'Utilidad';
    default: return type;
  }
};

export type MechanicalBehaviorGroupKey = 
  | 'effects'
  | 'activation'
  | 'targeting'
  | 'conditions'
  | 'temporality'
  | 'resolution'
  | 'custom';

export interface CategoryGroupDef {
  key: MechanicalBehaviorGroupKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  coreKeys: string[];
}

export const MECHANICAL_BEHAVIOR_GROUPS: CategoryGroupDef[] = [
  {
    key: 'effects',
    title: 'Efectos y Magnitudes',
    subtitle: 'Daño, curación, barreras, modificadores numéricos, estados alterados y transformaciones',
    icon: Swords,
    coreKeys: ['damage', 'damage_type', 'healing', 'barrier', 'numeric_modifier', 'status', 'transformation', 'caps', 'health_cost', 'cost_adjustment']
  },
  {
    key: 'activation',
    title: 'Activación y Disparadores',
    subtitle: 'Tipos de acción estándar, reacciones voluntarias, disparadores y frecuencias',
    icon: Flame,
    coreKeys: ['activation', 'trigger', 'frequency']
  },
  {
    key: 'targeting',
    title: 'Objetivos, Alcance y Área',
    subtitle: 'Selección de objetivos, alcance en metros, formas de área y restricciones',
    icon: Target,
    coreKeys: ['target', 'target_count', 'range', 'area', 'selection_restriction']
  },
  {
    key: 'conditions',
    title: 'Condiciones y Requisitos',
    subtitle: 'Condiciones manuales contextuales, umbrales de recursos y requisitos',
    icon: Handshake,
    coreKeys: ['manual_condition', 'additional_requirement', 'resource_threshold', 'die_condition']
  },
  {
    key: 'temporality',
    title: 'Duración y Limitaciones',
    subtitle: 'Turnos de duración, tiempos de recarga (cooldown), mantenimiento y límites de uso',
    icon: Hourglass,
    coreKeys: ['duration', 'cooldown', 'maintenance', 'usage']
  },
  {
    key: 'resolution',
    title: 'Resolución y Tiradas',
    subtitle: 'Dificultades (RD), tipos de tirada (ACC / RES) y resolución de efectos',
    icon: Dices,
    coreKeys: ['resolution', 'roll_type', 'manual_resolution']
  },
  {
    key: 'custom',
    title: 'Categorías Personalizadas',
    subtitle: 'Categorías mecánicas adicionales configuradas a nivel de campaña',
    icon: Settings2,
    coreKeys: []
  }
];

export function getCategoryGroupKey(category: Category): MechanicalBehaviorGroupKey {
  if (!category.coreKey) return 'custom';
  for (const group of MECHANICAL_BEHAVIOR_GROUPS) {
    if (group.coreKeys.includes(category.coreKey)) {
      return group.key;
    }
  }
  return 'custom';
}

export function UniversalRulesCatalog({ mechanics, onSave }: { mechanics: SystemMechanicsConfig; onSave: (value: SystemMechanicsConfig) => Promise<void> }) {
  const [draft, setDraft] = useState<Category | null>(null);
  const [backupDraft, setBackupDraft] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isNewOption, setIsNewOption] = useState<boolean>(false);
  const [ruleFilter, setRuleFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  const save = async (next: SystemMechanicsConfig) => {
    const parsed = systemMechanicsConfigSchema.safeParse(next);
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')); return; }
    setSaving(true); setError('');
    try { await onSave(parsed.data); setDraft(null); setBackupDraft(null); } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); } finally { setSaving(false); }
  };

  const saveWithoutClosing = async (draftOverride?: Category): Promise<boolean> => {
    const currentDraft = draftOverride || draft;
    if (!currentDraft) return false;
    const next = mechanics.some(c => c.id === currentDraft.id) ? mechanics.map(c => c.id === currentDraft.id ? currentDraft : c) : [...mechanics, currentDraft];
    const parsed = systemMechanicsConfigSchema.safeParse(next);
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')); return false; }
    setSaving(true); setError('');
    try { 
      await onSave(parsed.data); 
      return true;
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Error al guardar'); 
      return false;
    } finally { 
      setSaving(false); 
    }
  };

  const handleCancelOption = () => {
    if (backupDraft) {
      setDraft(backupDraft);
    }
    setEditingRuleId(null);
    setBackupDraft(null);
    setIsNewOption(false);
    setError('');
  };
  
  if (!draft) {
    const filteredMechanics = mechanics.filter(c => 
      c.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()) ||
      (c.description && c.description.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
    );

    const groupsToDisplay = MECHANICAL_BEHAVIOR_GROUPS.filter(g => {
      if (activeGroup !== 'all' && g.key !== activeGroup) return false;
      const groupCategories = filteredMechanics.filter(c => getCategoryGroupKey(c) === g.key);
      return groupCategories.length > 0 || activeGroup === g.key;
    });

    return <div className="space-y-6">
      <p className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">
        Catálogo de reglas mecánicas organizado según la arquitectura de <strong>Comportamiento Mecánico</strong>. Las categorías Core están protegidas por el motor, pero sus opciones son editables.
      </p>
      
      {error && <p role="alert" className="whitespace-pre-wrap text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
      
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Input className="max-w-xs" aria-label="Buscar categoría" placeholder="Buscar categoría u opción..." value={filter} onChange={e => setFilter(e.target.value)} />
        <Button onClick={() => setDraft({ id: nanoid(), name: '', description: '', logicalType: 'utility', scope: { techniques: true, objects: true, actions: true }, rules: [] })}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Group navigation tabs / filters */}
      <Tabs value={activeGroup} onValueChange={setActiveGroup} className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 no-scrollbar">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto">
            <TabsTrigger value="all">
              Todas ({mechanics.length})
            </TabsTrigger>
            {MECHANICAL_BEHAVIOR_GROUPS.map(g => {
              const count = mechanics.filter(c => getCategoryGroupKey(c) === g.key).length;
              const GroupIcon = g.icon;
              return (
                <TabsTrigger
                  key={g.key}
                  value={g.key}
                  className="flex items-center gap-1.5"
                >
                  <GroupIcon className="w-3.5 h-3.5 opacity-70" />
                  <span>{g.title.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-70 bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </Tabs>

      {/* Render grouped sections */}
      <div className="space-y-8">
        {groupsToDisplay.map(group => {
          const groupCategories = filteredMechanics.filter(c => getCategoryGroupKey(c) === group.key);
          const GroupIcon = group.icon;

          if (groupCategories.length === 0 && activeGroup === 'all') return null;

          return (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
                    <p className="text-xs text-muted-foreground">{group.subtitle}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {groupCategories.length} {groupCategories.length === 1 ? 'categoría' : 'categorías'}
                </span>
              </div>

              {groupCategories.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                  No hay categorías configuradas en este grupo.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-3">
                  {groupCategories.map(c => (
                    <EntityPanel 
                      key={c.id} 
                      title={c.name} 
                      icon={<CoreKeyIcon coreKey={c.coreKey} className="w-4 h-4 opacity-70" />}
                      pattern="none" 
                      className="min-w-0 flex flex-col justify-between [&>div.relative.z-10]:!p-2.5 [&>div.border-b]:!pb-2 [&_h3]:!text-sm"
                    >
                      <div className="space-y-1 h-full flex flex-col">
                        <div className="flex justify-between items-center gap-1.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${getLogicalTypeColor(c.logicalType).split(' ')[0]}`}>
                            {getLogicalTypeLabel(c.logicalType)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {c.rules.length} {c.rules.length === 1 ? 'opción' : 'ops'}
                          </span>
                        </div>
                        
                        <div className="flex-1 text-[11px] leading-tight text-muted-foreground line-clamp-2 mt-1">
                          {c.description || "Sin descripción"}
                        </div>
                        
                        <div className="pt-2 mt-auto flex gap-1.5">
                          <Button className="flex-1 h-7 text-xs" variant="secondary" onClick={() => { setDraft(structuredClone(c)); setError(''); }}>
                            <Edit2 className="w-3 h-3 mr-1.5" /> Editar
                          </Button>
                          {!c.coreKey && (
                            <Button className="h-7 w-7 px-0 shrink-0" variant="ghost" onClick={() => save(mechanics.filter(item => item.id !== c.id))} disabled={saving} aria-label="Eliminar categoría">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </EntityPanel>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredMechanics.length === 0 && (
        <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
          No se encontraron categorías que coincidan con la búsqueda.
        </div>
      )}
    </div>;
  }
  
  const patchRule = (index: number, patch: object) => setDraft({ ...draft, rules: draft.rules.map((r, i) => i === index ? { ...r, ...patch } : r) });
  
  const editingIndex = draft.rules.findIndex(r => r.id === editingRuleId);
  const editingRule = editingIndex !== -1 ? draft.rules[editingIndex] : null;

  return <div className="space-y-6">
    <div className="flex items-center justify-between border-b pb-4">
      <h2 className="text-xl font-bold">{draft.id ? "Editar Categoría" : "Nueva Categoría"}</h2>
      <div className="flex gap-3">
        <Button variant="outline" disabled={saving} onClick={() => { setDraft(null); setEditingRuleId(null); setBackupDraft(null); setError(''); }}>Volver</Button>
        <Button disabled={saving} onClick={() => save(mechanics.some(c => c.id === draft.id) ? mechanics.map(c => c.id === draft.id ? draft : c) : [...mechanics, draft])}>{saving ? 'Guardando…' : 'Guardar categoría'}</Button>
      </div>
    </div>
    
    {error && !editingRuleId && <p role="alert" className="whitespace-pre-wrap text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
    
    <div className="grid gap-6 sm:grid-cols-2 bg-card p-5 rounded-lg border">
      <div className="space-y-3"><Label className="text-sm font-semibold">Nombre</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
      <div className="space-y-3"><Label className="text-sm font-semibold">Descripción</Label><Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Tipo Lógico</Label>
        <Select value={draft.logicalType} onValueChange={(v: any) => setDraft({ ...draft, logicalType: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un tipo">
              {draft.logicalType ? getLogicalTypeLabel(draft.logicalType) : "Selecciona un tipo"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="offensive">Ofensiva</SelectItem>
            <SelectItem value="defensive">Defensiva</SelectItem>
            <SelectItem value="support">Soporte</SelectItem>
            <SelectItem value="control">Control</SelectItem>
            <SelectItem value="limitation">Limitación</SelectItem>
            <SelectItem value="utility">Utilidad</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {draft.coreKey && <div className="col-span-full"><p className="text-xs text-muted-foreground border-l-2 border-primary pl-2 py-1 bg-primary/5">Categoría core: su identidad y propósito estructural están protegidos por el motor. Puedes modificar sus opciones.</p></div>}
    </div>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold">Opciones de la Categoría</h3>
          <div className="flex items-center rounded-md border bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${ruleFilter === 'all' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setRuleFilter('all')}
            >
              Todas ({draft.rules.length})
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${ruleFilter === 'available' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setRuleFilter('available')}
            >
              Disponibles ({draft.rules.filter(r => r.isAvailable !== false).length})
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-sm font-medium transition-colors ${ruleFilter === 'unavailable' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setRuleFilter('unavailable')}
            >
              No disponibles ({draft.rules.filter(r => r.isAvailable === false).length})
            </button>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={saving} onClick={() => {
          const newId = nanoid();
          setBackupDraft(structuredClone(draft));
          const contract = getCoreCategoryContract(draft);
          let newRule: any;
          if (contract) {
            if (contract.kind === 'ce_adjustment') {
              newRule = {
                id: newId,
                name: contract.editorMode === 'numeric_modifier' ? '+1' : 'Nueva opción',
                cost: 0,
                ruleType: 'cost_modifier',
                runtimeKey: contract.editorMode === 'numeric_modifier' ? '1' : undefined,
                isAvailable: true,
              };
            } else if (contract.kind === 'effect') {
              newRule = {
                id: newId,
                name: 'Nueva opción',
                cost: 0,
                ruleType: 'effect',
                isAvailable: true,
                effect: createEffectDefinition(contract.effectType || 'damage'),
              };
            } else {
              const template = (componentTemplates as any)[draft.coreKey || ''] || componentTemplates.duration;
              newRule = {
                id: newId,
                name: 'Nueva opción',
                cost: 0,
                ruleType: 'component',
                isAvailable: true,
                component: structuredClone(template),
              };
            }
          } else {
            newRule = draft.rules[0] 
              ? { ...structuredClone(draft.rules[0]), id: newId, name: 'Nueva opción', cost: 0, isAvailable: true } 
              : { id: newId, name: 'Nueva opción', cost: 0, ruleType: 'component' as const, isAvailable: true, component: structuredClone(componentTemplates.duration) };
          }
          const newDraft = { ...draft, rules: [...draft.rules, newRule] } as Category;
          setDraft(newDraft);
          setEditingRuleId(newId);
          setIsNewOption(true);
          setError('');
        }}>
          <Plus className="w-4 h-4 mr-2" /> Añadir Opción
        </Button>
      </div>

      {/* OPTION EDIT MODAL */}
      <Dialog open={editingRuleId !== null} onOpenChange={(open) => { if (!open) handleCancelOption(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border border-primary/30 shadow-2xl bg-card">
          {editingRule && (() => {
            const contract = getCoreCategoryContract(draft);
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {isNewOption ? "Nueva Opción Mecánica" : `Editar Opción: ${editingRule.name || "Sin nombre"}`}
                    </DialogTitle>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium ml-auto">
                      {contract ? contract.ruleClassLabel : (draft.name || "Categoría")}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Configura el efecto mecánico, su coste de estamina (CE) y sus parámetros.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {error && (
                    <div role="alert" className="p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md whitespace-pre-wrap flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {(() => {
                    if (contract?.editorMode === 'numeric_modifier') {
                      return (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Modificador numérico</Label>
                            <Input 
                              value={editingRule.name} 
                              onChange={e => {
                                const val = e.target.value;
                                const derivedKey = val.replace(/[+−]/g, '').replace('−', '-').trim();
                                patchRule(editingIndex, { 
                                  name: val,
                                  runtimeKey: derivedKey,
                                  ruleType: 'cost_modifier',
                                  effect: undefined,
                                  component: undefined,
                                });
                              }} 
                              placeholder="Ej. +3 o -2" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">CE adicional (Coste de Estamina)</Label>
                            <Input type="number" value={editingRule.cost} onChange={e => patchRule(editingIndex, { cost: Number(e.target.value) })} />
                          </div>
                        </div>
                      );
                    }

                    if (contract?.editorMode === 'parameter') {
                      return (
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Nombre</Label>
                            <Input 
                              value={editingRule.name} 
                              onChange={e => patchRule(editingIndex, { name: e.target.value, ruleType: 'cost_modifier', effect: undefined, component: undefined })} 
                              placeholder="Ej. Fuerza" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">CE adicional</Label>
                            <Input type="number" value={editingRule.cost} onChange={e => patchRule(editingIndex, { cost: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Identificador</Label>
                            <div className="h-9 px-3 py-2 rounded-md border bg-muted/40 text-xs font-mono font-semibold text-muted-foreground flex items-center">
                              {editingRule.runtimeKey || editingRule.id.split('.').pop()}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Core Effect, Core Component, or Custom Category
                    return (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2 sm:col-span-1">
                          <Label className="text-xs font-semibold">Nombre de Opción</Label>
                          <Input 
                            value={editingRule.name} 
                            onChange={e => patchRule(editingIndex, { name: e.target.value })} 
                            placeholder="Ej. Daño Severo" 
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-1">
                          <Label className="text-xs font-semibold">CE adicional (Coste de Estamina)</Label>
                          <Input type="number" value={editingRule.cost} onChange={e => patchRule(editingIndex, { cost: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2 sm:col-span-1">
                          <Label className="text-xs font-semibold">Clase de Regla</Label>
                          {contract ? (
                            <div className="h-9 px-3 py-2 rounded-md border bg-muted/40 text-xs font-medium text-foreground flex items-center">
                              {contract.ruleClassLabel}
                            </div>
                          ) : (
                            <Select 
                              value={editingRule.ruleType} 
                              onValueChange={ruleType => setDraft({ 
                                ...draft, 
                                rules: draft.rules.map((old, j) => editingIndex !== j ? old : { 
                                  id: old.id, 
                                  name: old.name, 
                                  cost: old.cost, 
                                  mechDesc: old.mechDesc, 
                                  ruleType: ruleType as typeof old.ruleType, 
                                  ...(ruleType === 'effect' ? { effect: createEffectDefinition('damage') } : ruleType === 'component' ? { component: structuredClone(componentTemplates.duration) } : { effect: undefined, component: undefined }) 
                                }) 
                              })}
                            >
                              <SelectTrigger><SelectValue>{{ effect: "Efecto", component: "Aplicación / regla", cost_modifier: "Ajuste CE", ce_adjustment: "Ajuste CE" }[editingRule.ruleType]}</SelectValue></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="effect">Efecto</SelectItem>
                                <SelectItem value="component">Aplicación / regla</SelectItem>
                                <SelectItem value="cost_modifier">Ajuste CE</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-xs font-semibold">Disponible en el constructor</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Determina si esta opción puede seleccionarse al crear nuevas mecánicas. Desactivarla no afecta elementos existentes ni su funcionamiento.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {editingRule.isAvailable !== false ? "ON" : "OFF"}
                        </span>
                        <Switch
                          checked={editingRule.isAvailable !== false}
                          onCheckedChange={(checked) => patchRule(editingIndex, { isAvailable: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {editingRule.effect && contract?.kind !== 'ce_adjustment' && (
                    <div className="pt-2">
                      <Label className="text-xs font-semibold mb-2 block">Definición de Efecto Mecánico</Label>
                      <MechanicalEffectDefinitionEditor 
                        value={editingRule.effect} 
                        hideTypeSelector={Boolean(contract && contract.kind === 'effect')} 
                        independentDuration 
                        onChange={effect => {
                          if (contract?.effectType && effect.type !== contract.effectType) {
                            effect.type = contract.effectType;
                          }
                          patchRule(editingIndex, { effect });
                        }} 
                      />
                    </div>
                  )}

                  {editingRule.component && contract?.kind !== 'ce_adjustment' && (
                    <div className="pt-2">
                      <Label className="text-xs font-semibold mb-2 block">Parámetros de la Regla / Componente</Label>
                      <RuleComponentEditor value={editingRule.component} onChange={component => patchRule(editingIndex, { component })} />
                    </div>
                  )}
                </div>

              <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0 flex items-center justify-between sm:justify-between">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive" 
                  disabled={saving} 
                  onClick={async () => {
                    const newRules = draft.rules.filter((_, j) => j !== editingIndex);
                    const newDraft = { ...draft, rules: newRules } as Category;
                    setDraft(newDraft);
                    const ok = await saveWithoutClosing(newDraft);
                    if (ok) {
                      setEditingRuleId(null);
                      setBackupDraft(null);
                      setIsNewOption(false);
                    } else {
                      if (backupDraft) setDraft(backupDraft);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar Opción
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={saving} onClick={handleCancelOption}>
                    Cancelar
                  </Button>
                  <Button size="sm" disabled={saving} onClick={async () => {
                    const ok = await saveWithoutClosing();
                    if (ok) {
                      setEditingRuleId(null);
                      setBackupDraft(null);
                      setIsNewOption(false);
                    }
                  }}>
                    {saving ? 'Guardando…' : 'Guardar Opción'}
                  </Button>
                </div>
              </DialogFooter>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>

      <div className="space-y-3">
        {draft.rules
          .filter(r => {
            if (ruleFilter === 'available') return r.isAvailable !== false;
            if (ruleFilter === 'unavailable') return r.isAvailable === false;
            return true;
          })
          .map((r) => {
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/50">
                <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm">{r.name || "Sin nombre"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${r.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {r.cost > 0 ? `+${r.cost}` : r.cost} CE
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1.5 py-0.5 rounded-sm bg-black/20">
                      {{ effect: "Efecto", component: "Aplicación", cost_modifier: "Ajuste CE", ce_adjustment: "Ajuste CE" }[r.ruleType] || r.ruleType}
                    </span>
                    {r.isAvailable === false ? (
                      <span className="text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-400 border-rose-500/30">
                        No disponible
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-semibold border px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Disponible
                      </span>
                    )}
                  </div>
                  {r.effect ? (
                    <span className="text-xs text-muted-foreground line-clamp-1">{describeEffect(r.effect, { selection: 'direct', relationship: 'any', minTargets: 1, maxTargets: 1, allowedEntityKinds: ['character'] })}</span>
                  ) : r.runtimeKey && !r.component ? (
                    <span className="text-xs text-muted-foreground font-mono">ID: {r.runtimeKey}</span>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => {
                     setBackupDraft(structuredClone(draft));
                     setEditingRuleId(r.id);
                     setIsNewOption(false);
                     setError('');
                  }}>
                    <Edit2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" disabled={saving} onClick={async () => {
                     const originalDraft = draft;
                     const newDraft = { ...draft, rules: draft.rules.filter((rule) => rule.id !== r.id) } as Category;
                     setDraft(newDraft);
                     const ok = await saveWithoutClosing(newDraft);
                     if (!ok) {
                       setDraft(originalDraft);
                     }
                  }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        {draft.rules.filter(r => {
          if (ruleFilter === 'available') return r.isAvailable !== false;
          if (ruleFilter === 'unavailable') return r.isAvailable === false;
          return true;
        }).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
            {draft.rules.length === 0 
              ? "No hay opciones configuradas."
              : `No hay opciones ${ruleFilter === 'available' ? 'disponibles' : 'no disponibles'} en esta categoría.`}
          </p>
        )}
      </div>
    </div>
  </div>;
}
