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
import { Edit2, Plus, Trash2 } from 'lucide-react';

type Category = SystemMechanicsConfig[number];
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
  if (!draft) return <div className="space-y-4"><p className="text-sm text-muted-foreground">Categorías core protegidas. Sus opciones y costes son editables. Los requisitos se comprueban; los limitadores restringen el uso; los costes se pagan al activar; las consecuencias ocurren en su momento configurado.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><Input aria-label="Buscar categoría" placeholder="Buscar categoría" value={filter} onChange={e => setFilter(e.target.value)} /><Button onClick={() => setDraft({ id: nanoid(), name: '', description: '', logicalType: 'utility', scope: { techniques: true, objects: true, actions: true }, rules: [] })}>Nueva categoría</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mechanics.filter(c => c.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(c => <EntityPanel key={c.id} title={c.name} pattern="dots" accent="accent1" className="min-w-0"><div className="space-y-2"><p className="text-xs text-muted-foreground">{c.coreKey ? 'Core · ' : ''}{c.rules.length} opciones</p><Button variant="outline" onClick={() => { setDraft(structuredClone(c)); setError(''); }}>Editar</Button>{!c.coreKey && <Button variant="ghost" disabled={saving} onClick={() => save(mechanics.filter(item => item.id !== c.id))}>Eliminar</Button>}</div></EntityPanel>)}</div></div>;
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
        <Button variant="outline" size="sm" onClick={() => {
          const newId = nanoid();
          setDraft({ ...draft, rules: [...draft.rules, draft.rules[0] ? { ...structuredClone(draft.rules[0]), id: newId, name: 'Nueva opción', cost: 0 } : { id: newId, name: 'Nueva opción', cost: 0, ruleType: 'component', component: structuredClone(componentTemplates.duration) }] });
          setEditingRuleId(newId);
        }}>
          <Plus className="w-4 h-4 mr-2" /> Añadir Opción
        </Button>
      </div>
      
      <div className="space-y-3">
        {draft.rules.map((r, i) => {
          const isEditing = editingRuleId === r.id;
          
          if (!isEditing) {
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{r.name || "Sin nombre"}</span>
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
                  <Button variant="ghost" size="icon" onClick={() => setEditingRuleId(r.id)}>
                    <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => i !== j) })}>
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            );
          }
          
          return (
            <div key={r.id} className="space-y-5 rounded-lg border border-primary/50 bg-black/20 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h4 className="text-sm font-semibold text-primary">Editando Opción</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingRuleId(null)}>Hecho</Button>
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
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => {
                   setDraft({ ...draft, rules: draft.rules.filter((_, j) => i !== j) });
                   setEditingRuleId(null);
                }}>
                  <Trash2 className="w-4 h-4 mr-2"/> Eliminar Opción
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
