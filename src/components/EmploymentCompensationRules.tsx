import { useEffect, useState } from 'react';
import { EmploymentCompensation, calculateEmploymentCompensation, employmentCompensationSchema } from '@/domain/employmentCompensation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const copy = (value: EmploymentCompensation): EmploymentCompensation => structuredClone(value);

export function EmploymentCompensationRules({ value, onSave }: { value: EmploymentCompensation; onSave: (value: EmploymentCompensation) => Promise<void> }) {
  const [form, setForm] = useState(() => copy(value));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setForm(copy(value));
  }, [value, dirty]);

  const update = (group: 'levels' | 'risks', index: number, field: 'name' | 'yen' | 'exp', next: string | number) => {
    setDirty(true);
    setForm(current => ({ ...current, [group]: current[group].map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: next } : entry) }));
  };

  const save = async () => {
    const validated = employmentCompensationSchema.parse(form);
    setSaving(true);
    try {
      await onSave(validated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const validation = employmentCompensationSchema.safeParse(form);
  const example = validation.success ? calculateEmploymentCompensation(validation.data, validation.data.levels[0].id, validation.data.risks[0].id) : null;

  return <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div>
        <CardTitle>Remuneración de empleos</CardTitle>
        <CardDescription>Configura las bases por nivel y los adicionales por riesgo. Los pagos siempre requieren la aprobación manual de un moderador.</CardDescription>
      </div>
      <Button onClick={save} disabled={!dirty || saving || !validation.success}>{saving ? 'Guardando…' : 'Guardar remuneración'}</Button>
    </CardHeader>
    <CardContent className="space-y-8">
      {(['levels', 'risks'] as const).map(group => <section key={group} className="space-y-3">
        <div><h3 className="font-semibold">{group === 'levels' ? 'Base por nivel' : 'Adicional por riesgo'}</h3><p className="text-xs text-muted-foreground">Los identificadores son estables; puedes cambiar el nombre y los valores.</p></div>
        <div className="space-y-2">
          {form[group].map((entry, index) => <div key={entry.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(150px,1fr)_110px_110px]">
            <div className="space-y-1"><Label htmlFor={`${group}-${entry.id}-name`}>Nombre · {entry.id}</Label><Input id={`${group}-${entry.id}-name`} value={entry.name} onChange={event => update(group, index, 'name', event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor={`${group}-${entry.id}-yen`}>Yenes</Label><Input id={`${group}-${entry.id}-yen`} type="number" min={0} value={entry.yen} onChange={event => update(group, index, 'yen', Number(event.target.value))} /></div>
            <div className="space-y-1"><Label htmlFor={`${group}-${entry.id}-exp`}>EXP</Label><Input id={`${group}-${entry.id}-exp`} type="number" min={0} value={entry.exp} onChange={event => update(group, index, 'exp', Number(event.target.value))} /></div>
          </div>)}
        </div>
      </section>)}
      {example ? <div className="rounded-md bg-muted/40 p-4 text-sm"><strong>Ejemplo de cálculo:</strong> {form.levels[0].name} + {form.risks[0].name} = ¥{example.totalYen} y {example.totalExp} EXP.</div> : <p className="text-sm text-destructive">Corrige nombres vacíos o cantidades negativas antes de guardar.</p>}
    </CardContent>
  </Card>;
}
