import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { RuleComponent } from '../../domain/ruleComponents';
import useSWR from 'swr';
import { fetcher } from '../../lib/api';

const labels: Record<string, string> = { true: 'Sí', false: 'No', untilEnd: 'Mientras esté activo', kind: 'Tipo', self: 'Uno mismo', allies: 'Aliados', enemies: 'Enemigos', min: 'Mínimo', max: 'Máximo', meters: 'Metros', radius: 'Radio (metros)', duration: 'Duración', mode: 'Modalidad', turns: 'Turnos', signalId: 'ID de señal manual', passive: 'Pasivo', resourceId: 'Recurso', amount: 'Cantidad', period: 'Periodo', role: 'Función', match: 'Combinación', predicates: 'Condiciones', sense: 'Contacto', comparison: 'Comparación', percent: 'Porcentaje', abilityId: 'ID de habilidad', elementId: 'ID de elemento', quantity: 'Cantidad', when: 'Momento', consequence: 'Consecuencia', attributeId: 'ID de atributo', statusElementId: 'ID de estado', fraction: 'Fracción del daño', subject: 'Valor limitado', instant: 'Instantáneo', sustained: 'Sostenido', while_condition: 'Mientras se cumpla', condition: 'Condición', requirement: 'Requisito', limiter: 'Limitador', cost: 'Coste', all: 'Todas (Y)', any: 'Alguna (O)', physical: 'Físico', visual: 'Visual', auditory: 'Auditivo', lte: 'Menor o igual', gte: 'Mayor o igual', activation: 'Al activar', each_turn: 'Cada turno', end: 'Al terminar', after_damage: 'Después del daño', turn: 'Turno', combat: 'Combate', mission: 'Misión', day: 'Día', ES: 'Estamina', SA: 'Salud', target: 'Destinatarios', target_count: 'Cantidad de objetivos', range: 'Rango', area: 'Área', cooldown: 'Cooldown', maintenance: 'Mantenimiento', usage: 'Uso', cap: 'Límite', contact: 'Contacto', conscious: 'Consciente', resource: 'Recurso', ability_active: 'Habilidad activa', item: 'Poseer elemento', consumable: 'Consumible del Catálogo', manual: 'Señal manual', die: 'Dado individual', attribute: 'Penalización de atributo', status: 'Estado alterado', recoil: 'Recoil', consume: 'Consumir', stamina_cost: 'Coste de Estamina', damage: 'Daño', healing: 'Curación', barrier: 'Barrera', attribute_modifier: 'Modificador de atributo' };

export const componentTemplates: Record<RuleComponent['kind'], RuleComponent> = {
  target: { kind: 'target', self: true, allies: false, enemies: false },
  target_count: { kind: 'target_count', min: 1, max: 3 },
  range: { kind: 'range', meters: 10 },
  area: { kind: 'area', radius: 50 },
  duration: { kind: 'duration', duration: { mode: 'turns', turns: 2 } },
  activation: { kind: 'activation', turns: 0, signalId: '', passive: false },
  cooldown: { kind: 'cooldown', turns: 2 },
  maintenance: { kind: 'maintenance', resourceId: 'ES', amount: 1 },
  usage: { kind: 'usage', period: 'combat', max: 1 },
  condition: { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'signal-id' }] },
  consequence: { kind: 'consequence', role: 'consequence', when: 'end', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3, untilEnd: false } },
  cap: { kind: 'cap', subject: 'stamina_cost', min: 0, max: 100 },
  damage_type: { kind: 'damage_type', damageType: 'fisico' },
};

const predicateTemplates = { contact: { kind: 'contact', sense: 'physical' }, conscious: { kind: 'conscious' }, resource: { kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 50 }, ability_active: { kind: 'ability_active', abilityId: 'ability-id' }, item: { kind: 'item', elementId: 'element-id', quantity: 1 }, consumable: { kind: 'consumable', elementId: 'element-id', quantity: 1 }, manual: { kind: 'manual', signalId: 'signal-id' }, die: { kind: 'die', min: 1, max: 5 } };
const consequenceTemplates = { resource: { kind: 'resource', resourceId: 'SA', amount: 1 }, attribute: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3, untilEnd: false }, status: { kind: 'status', statusElementId: 'core.status.stunned', turns: 1 }, recoil: { kind: 'recoil', fraction: 0.5 }, consume: { kind: 'consume', elementId: 'element-id', quantity: 1 } };
const durationTemplates = { instant: { mode: 'instant' }, turns: { mode: 'turns', turns: 2 }, sustained: { mode: 'sustained' }, while_condition: { mode: 'while_condition' } };
const choices: Record<string, string[]> = { resourceId: ['ES', 'SA'], period: ['turn', 'combat', 'mission', 'day'], match: ['all', 'any'], sense: ['physical', 'visual', 'auditory'], comparison: ['lte', 'gte'], when: ['activation', 'each_turn', 'end', 'after_damage'], subject: ['stamina_cost', 'damage', 'healing', 'barrier', 'attribute_modifier'] };

function Pick({ value, values, onChange }: { value: string; values: string[]; onChange: (value: string) => void }) {
  return <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue>{labels[value] ?? value}</SelectValue></SelectTrigger>
    <SelectContent>{values.map(v => <SelectItem key={v} value={v}>{labels[v] ?? v}</SelectItem>)}</SelectContent>
  </Select>;
}

function Fields({ value, onChange, templates, elements }: { value: Record<string, any>; onChange: (value: any) => void; templates: Record<string, any>; elements?: any[] }) {
  if (!value || typeof value !== 'object') return null;
  return <div className="grid gap-3 sm:grid-cols-2">
    {Object.entries(value).map(([key, entry]) => {
      const patch = (next: unknown) => onChange({ ...value, [key]: next });
      const enums = key === 'role' ? value.kind === 'condition' ? ['condition', 'requirement', 'limiter'] : ['cost', 'consequence'] : choices[key];
      const isElementId = key === 'elementId' || key === 'statusElementId' || key === 'abilityId';

      let elementOptions = elements || [];
      if (key === 'elementId' && (value.kind === 'consume' || value.kind === 'consumable')) elementOptions = elementOptions.filter(e => e.kind === 'consumable');
      if (key === 'statusElementId') elementOptions = elementOptions.filter(e => e.kind === 'altered_status');

      return <div key={key} className={typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
        <Label>{(key === 'elementId' && (value.kind === 'consume' || value.kind === 'consumable')) ? 'Consumible del Catálogo' : (labels[key] ?? key)}</Label>
        {key === 'kind' || key === 'mode' ? <Pick value={entry || ''} values={Object.keys(templates)} onChange={next => onChange(structuredClone(templates[next]))} />
        : typeof entry === 'boolean' ? <Pick value={String(entry)} values={['true', 'false']} onChange={next => patch(next === 'true')} />
        : enums ? <Pick value={entry || ''} values={enums} onChange={patch} />
        : Array.isArray(entry) ? <div className="space-y-3">
          {entry.map((p, i) => <div key={i} className="space-y-2 rounded border p-3">
            <Fields value={p} templates={predicateTemplates} onChange={next => patch(entry.map((item, j) => j === i ? next : item))} elements={elements} />
            <Button type="button" variant="ghost" onClick={() => patch(entry.filter((_, j) => i !== j))}>Quitar condición</Button>
          </div>)}
          <Button type="button" variant="outline" onClick={() => patch([...entry, { kind: 'manual', signalId: 'signal-id' }])}>Añadir condición</Button>
        </div>
        : isElementId && elements ? (
          <Select value={entry || ''} onValueChange={patch}>
            <SelectTrigger><SelectValue>{elements.find((el: any) => el.id === entry)?.name || entry || 'Seleccionar...'}</SelectValue></SelectTrigger>
            <SelectContent>
              {/* Ensure current value is always an option if not in the fetched list */}
              {entry && !elementOptions.find((el: any) => el.id === entry) && (
                <SelectItem value={entry}>{entry}</SelectItem>
              )}
              {elementOptions.map((el: any) => (
                <SelectItem key={el.id} value={el.id}>[{el.kind}] {el.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
        : typeof entry === 'object' && entry !== null ? <Fields value={entry} onChange={patch} templates={key === 'duration' ? durationTemplates : consequenceTemplates} elements={elements} />
        : <Input type={typeof entry === 'number' ? 'number' : 'text'} step="any" value={entry ?? ''} onChange={e => patch(typeof entry === 'number' ? Number(e.target.value) : e.target.value)} />}
      </div>;
    })}
  </div>;
}

export function RuleComponentEditor({ value, onChange }: { value: RuleComponent; onChange: (value: RuleComponent) => void }) {
  const { data: adminElements } = useSWR('/api/admin/elements', fetcher);
  const { data: publicElements } = useSWR('/api/elements', fetcher);
  const elements = adminElements || publicElements;
  return <Fields value={value} onChange={onChange} templates={componentTemplates} elements={elements} />;
}
