import { EntityPanel } from "../ui/entity-panel";
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { systemMechanicsConfigSchema, type SystemMechanicsConfig } from '../../domain/systemMechanics';
import { createEffectDefinition, MechanicalEffectDefinitionEditor } from './MechanicalEffectDefinitionEditor';
import { RuleComponentEditor, componentTemplates } from './RuleComponentEditor';

type Category = SystemMechanicsConfig[number];
export function UniversalRulesCatalog({ mechanics, onSave }: { mechanics: SystemMechanicsConfig; onSave: (value: SystemMechanicsConfig) => Promise<void> }) {
  const [draft, setDraft] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
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
  return <div className="space-y-4"><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={saving} onClick={() => setDraft(null)}>Volver</Button><Button disabled={saving} onClick={() => save(mechanics.some(c => c.id === draft.id) ? mechanics.map(c => c.id === draft.id ? draft : c) : [...mechanics, draft])}>{saving ? 'Guardando…' : 'Guardar categoría'}</Button></div>
    {error && <p role="alert" className="whitespace-pre-wrap text-sm text-destructive">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Nombre</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div><div><Label>Descripción</Label><Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div></div>
    {draft.coreKey && <p className="text-xs text-muted-foreground">Categoría core: identidad protegida.</p>}
    <div className="space-y-4">{draft.rules.map((r, i) => <div key={r.id} className="space-y-3 rounded border bg-card p-4"><div className="grid gap-3 sm:grid-cols-3"><div><Label>Opción</Label><Input value={r.name} onChange={e => patchRule(i, { name: e.target.value })} /></div><div><Label>CE adicional</Label><Input type="number" value={r.cost} onChange={e => patchRule(i, { cost: Number(e.target.value) })} /></div><div><Label>Clase</Label><Select value={r.ruleType} onValueChange={ruleType => setDraft({ ...draft, rules: draft.rules.map((old, j) => i !== j ? old : { id: old.id, name: old.name, cost: old.cost, mechDesc: old.mechDesc, ruleType: ruleType as typeof old.ruleType, ...(ruleType === 'effect' ? { effect: createEffectDefinition('damage') } : ruleType === 'component' ? { component: structuredClone(componentTemplates.duration) } : {}) }) })}><SelectTrigger><SelectValue>{{ effect: "Efecto", component: "Aplicación / regla", cost_modifier: "Ajuste CE" }[r.ruleType]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="effect">Efecto</SelectItem><SelectItem value="component">Aplicación / regla</SelectItem><SelectItem value="cost_modifier">Ajuste CE</SelectItem></SelectContent></Select></div></div>
      {r.effect && <MechanicalEffectDefinitionEditor value={r.effect} independentDuration onChange={effect => patchRule(i, { effect, ...(effect.timing === 'passive' ? { cost: 0 } : {}) })} />}
      {r.component && <RuleComponentEditor value={r.component} onChange={component => patchRule(i, { component })} />}
      <Button variant="ghost" onClick={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => i !== j) })}>Quitar opción</Button>
    </div>)}</div><Button variant="outline" onClick={() => setDraft({ ...draft, rules: [...draft.rules, draft.rules[0] ? { ...structuredClone(draft.rules[0]), id: nanoid(), name: 'Nueva opción', cost: 0 } : { id: nanoid(), name: 'Nueva opción', cost: 0, ruleType: 'component', component: structuredClone(componentTemplates.duration) }] })}>Añadir opción</Button>
  </div>;
}
