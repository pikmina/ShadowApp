import { EntityPanel } from "../ui/entity-panel";
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { systemMechanicsConfigSchema, type SystemMechanicsConfig } from '../../domain/systemMechanics';
import { createEffectDefinition, describeEffect, MechanicalEffectDefinitionEditor } from './MechanicalEffectDefinitionEditor';
import { RuleComponentEditor, componentTemplates } from './RuleComponentEditor';
import { Edit2, Plus, Trash2, Swords, Shield, HeartHandshake, Brain, Lock, Wrench, Package, HandFist, HeartPulse, BrickWall, UserRoundPlus, UserRoundMinus, BugOff, MessageSquareDiff, Handshake, Target, Hash, FoldHorizontal, LandPlot, Hourglass, Star, Clock, ArrowUpCircle, Ban, HandGrab, Eye, Ear, UserStar, Parentheses, KeyRound, CookingPot, Dices, BatteryCharging, BatteryPlus, BoneFracture, ClockArrowDown, Flame, LineDotRightHorizontal, ClockArrowRight, RefreshCw } from 'lucide-react';

type Category = SystemMechanicsConfig[number];

const CoreKeyIcon = ({ coreKey, className }: { coreKey?: string, className?: string }) => {
  switch (coreKey) {
    case 'damage': return <HandFist className={className} />;
    case 'healing': return <HeartPulse className={className} />;
    case 'barrier': return <BrickWall className={className} />;
    case 'bonus': return <UserRoundPlus className={className} />;
    case 'penalty': return <UserRoundMinus className={className} />;
    case 'status': return <BugOff className={className} />;
    case 'cost_adjustment': return <MessageSquareDiff className={className} />;
    case 'manual_resolution': return <Handshake className={className} />;
    case 'target': return <Target className={className} />;
    case 'target_count': return <Hash className={className} />;
    case 'range': return <FoldHorizontal className={className} />;
    case 'area': return <LandPlot className={className} />;
    case 'duration': return <Hourglass className={className} />;
    case 'activation': return <Star className={className} />;
    case 'cooldown': return <Clock className={className} />;
    case 'maintenance': return <ArrowUpCircle className={className} />;
    case 'usage': return <Ban className={className} />;
    case 'physical_contact': return <HandGrab className={className} />;
    case 'visual_contact': return <Eye className={className} />;
    case 'auditory_contact': return <Ear className={className} />;
    case 'conscious': return <UserStar className={className} />;
    case 'resource_threshold': return <Parentheses className={className} />;
    case 'active_ability': return <KeyRound className={className} />;
    case 'consumption': return <CookingPot className={className} />;
    case 'manual_condition': return <Handshake className={className} />;
    case 'die_condition': return <Dices className={className} />;
    case 'stamina_cost': return <BatteryCharging className={className} />;
    case 'health_cost': return <BatteryPlus className={className} />;
    case 'self_damage': return <BoneFracture className={className} />;
    case 'temporary_penalty': return <ClockArrowDown className={className} />;
    case 'consequence_status': return <Flame className={className} />;
    case 'end_effect': return <LineDotRightHorizontal className={className} />;
    case 'per_turn_effect': return <ClockArrowRight className={className} />;
    case 'recoil': return <RefreshCw className={className} />;
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

export function UniversalRulesCatalog({ mechanics, onSave }: { mechanics: SystemMechanicsConfig; onSave: (value: SystemMechanicsConfig) => Promise<void> }) {
  const [draft, setDraft] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const save = async (next: SystemMechanicsConfig) => {
    const parsed = systemMechanicsConfigSchema.safeParse(next);
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')); return; }
    setSaving(true); setError('');
    try { await onSave(parsed.data); setDraft(null); } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); } finally { setSaving(false); }
  };

  const saveWithoutClosing = async (draftOverride?: Category) => {
    const currentDraft = draftOverride || draft;
    if (!currentDraft) return;
    const next = mechanics.some(c => c.id === currentDraft.id) ? mechanics.map(c => c.id === currentDraft.id ? currentDraft : c) : [...mechanics, currentDraft];
    const parsed = systemMechanicsConfigSchema.safeParse(next);
    if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')); return; }
    setSaving(true); setError('');
    try { await onSave(parsed.data); } catch (e) { setError(e instanceof Error ? e.message : 'Error al guardar'); } finally { setSaving(false); }
  };
  
  if (!draft) {
    return <div className="space-y-6">
      <p className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/10">Categorías de reglas mecánicas. Las categorías Core están protegidas, pero sus opciones son editables. Puedes añadir categorías personalizadas adicionales.</p>
      
      {error && <p role="alert" className="text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}
      
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Input className="max-w-xs" aria-label="Buscar categoría" placeholder="Buscar categoría..." value={filter} onChange={e => setFilter(e.target.value)} />
        <Button onClick={() => setDraft({ id: nanoid(), name: '', description: '', logicalType: 'utility', scope: { techniques: true, objects: true, actions: true }, rules: [] })}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-3">
        {mechanics.filter(c => c.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(c => (
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
      {mechanics.length === 0 && <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">No hay categorías configuradas.</div>}
    </div>;
  }
  
  const patchRule = (index: number, patch: object) => setDraft({ ...draft, rules: draft.rules.map((r, i) => i === index ? { ...r, ...patch } : r) });
  return <div className="space-y-6">
    <div className="flex items-center justify-between border-b pb-4">
      <h2 className="text-xl font-bold">{draft.id ? "Editar Categoría" : "Nueva Categoría"}</h2>
      <div className="flex gap-3">
        <Button variant="outline" disabled={saving} onClick={() => { setDraft(null); setEditingRuleId(null); }}>Volver</Button>
        <Button disabled={saving} onClick={() => save(mechanics.some(c => c.id === draft.id) ? mechanics.map(c => c.id === draft.id ? draft : c) : [...mechanics, draft])}>{saving ? 'Guardando…' : 'Guardar categoría'}</Button>
      </div>
    </div>
    
    {error && <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">{error}</p>}
    
    <div className="grid gap-6 sm:grid-cols-2 bg-card p-5 rounded-lg border">
      <div className="space-y-3"><Label className="text-sm font-semibold">Nombre</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
      <div className="space-y-3"><Label className="text-sm font-semibold">Descripción</Label><Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      {draft.coreKey && <div className="col-span-full"><p className="text-xs text-muted-foreground border-l-2 border-primary pl-2 py-1 bg-primary/5">Categoría core: su identidad y propósito estructural están protegidos por el motor. Puedes modificar sus opciones.</p></div>}
    </div>
    
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Opciones de la Categoría</h3>
        <Button variant="outline" size="sm" disabled={saving} onClick={() => {
          const newId = nanoid();
          const newDraft = { ...draft, rules: [...draft.rules, draft.rules[0] ? { ...structuredClone(draft.rules[0]), id: newId, name: 'Nueva opción', cost: 0 } : { id: newId, name: 'Nueva opción', cost: 0, ruleType: 'component', component: structuredClone(componentTemplates.duration) }] } as Category;
          setDraft(newDraft);
          setEditingRuleId(newId);
          saveWithoutClosing(newDraft);
        }}>
          <Plus className="w-4 h-4 mr-2" /> Añadir Opción
        </Button>
      </div>
      
      {(() => {
        const editingIndex = draft.rules.findIndex(r => r.id === editingRuleId);
        if (editingIndex === -1) return null;
        const r = draft.rules[editingIndex];
        const i = editingIndex;
        
        return (
            <div className="space-y-5 rounded-lg border border-primary/50 bg-black/20 p-5 shadow-sm mb-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h4 className="text-sm font-semibold text-primary">Editando Opción</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={saving} onClick={() => { setEditingRuleId(null); saveWithoutClosing(); }}>{saving ? 'Guardando...' : 'Hecho'}</Button>
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-3"><Label className="text-sm font-semibold">Nombre de Opción</Label><Input value={r.name} onChange={e => patchRule(i, { name: e.target.value })} /></div>
                <div className="space-y-3"><Label className="text-sm font-semibold">CE adicional</Label><Input type="number" value={r.cost} onChange={e => patchRule(i, { cost: Number(e.target.value) })} /></div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Clase</Label>
                  <Select value={r.ruleType} onValueChange={ruleType => setDraft({ ...draft, rules: draft.rules.map((old, j) => i !== j ? old : { id: old.id, name: old.name, cost: old.cost, mechDesc: old.mechDesc, ruleType: ruleType as typeof old.ruleType, ...(ruleType === 'effect' ? { effect: createEffectDefinition('damage') } : ruleType === 'component' ? { component: structuredClone(componentTemplates.duration) } : {}) }) })}>
                    <SelectTrigger><SelectValue>{{ effect: "Efecto", component: "Aplicación / regla", cost_modifier: "Ajuste CE" }[r.ruleType]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="effect">Efecto</SelectItem>
                      <SelectItem value="component">Aplicación / regla</SelectItem>
                      <SelectItem value="cost_modifier">Ajuste CE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {r.effect && <div className="pt-4 border-t border-border/50"><MechanicalEffectDefinitionEditor value={r.effect} independentDuration onChange={effect => patchRule(i, { effect, ...(effect.timing === 'passive' ? { cost: 0 } : {}) })} /></div>}
              {r.component && <div className="pt-4 border-t border-border/50"><RuleComponentEditor value={r.component} onChange={component => patchRule(i, { component })} /></div>}
              
              <div className="flex justify-end pt-3">
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={saving} onClick={() => {
                   const newDraft = { ...draft, rules: draft.rules.filter((_, j) => i !== j) } as Category;
                   setDraft(newDraft);
                   setEditingRuleId(null);
                   saveWithoutClosing(newDraft);
                }}>
                  <Trash2 className="w-4 h-4 mr-2 text-destructive"/> Eliminar Opción
                </Button>
              </div>
            </div>
        );
      })()}

      <div className="space-y-3">
        {draft.rules.map((r, i) => {
          const isEditing = editingRuleId === r.id;
          return (
              <div key={r.id} className={`flex items-center justify-between rounded-lg border bg-card p-4 transition-colors ${isEditing ? 'border-primary ring-1 ring-primary/50' : 'hover:border-primary/50'}`}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-sm ${isEditing ? 'text-primary' : ''}`}>{r.name || "Sin nombre"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${r.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {r.cost > 0 ? `+${r.cost}` : r.cost} CE
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1.5 py-0.5 rounded-sm bg-black/20">
                      {{ effect: "Efecto", component: "Aplicación", cost_modifier: "Ajuste CE" }[r.ruleType] || r.ruleType}
                    </span>
                  </div>
                  {r.effect && <span className="text-xs text-muted-foreground line-clamp-1">{describeEffect(r.effect, {relationship: 'any', minTargets: 1, maxTargets: 1, allowedEntityKinds: ['character']})}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant={isEditing ? "secondary" : "ghost"} size="icon" onClick={() => {
                     setEditingRuleId(isEditing ? null : r.id);
                     if (!isEditing) window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" disabled={isEditing || saving} onClick={() => {
                     const newDraft = { ...draft, rules: draft.rules.filter((_, j) => i !== j) } as Category;
                     setDraft(newDraft);
                     saveWithoutClosing(newDraft);
                  }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
          );
        })}
        {draft.rules.length === 0 && <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">No hay opciones configuradas.</p>}
      </div>
    </div>
  </div>;
}
