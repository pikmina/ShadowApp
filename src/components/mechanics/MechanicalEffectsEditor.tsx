import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { appliedMechanicReferenceSchema, resolveAppliedMechanics, type AppliedMechanicReference, type SystemMechanicsConfig } from "../../domain/systemMechanics";
import { describeEffect } from "./MechanicalEffectDefinitionEditor";

type Props = { effects: unknown[]; mechanics: SystemMechanicsConfig; onChange: (effects: unknown[]) => void; hideCosts?: boolean };

export function MechanicalEffectsEditor({ effects, mechanics, onChange, hideCosts }: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const applied = useMemo(() => effects.flatMap(effect => { const result = appliedMechanicReferenceSchema.safeParse(effect); return result.success ? [result.data] : []; }), [effects]);
  const preserved = effects.filter(effect => !appliedMechanicReferenceSchema.safeParse(effect).success);
  const resolution = resolveAppliedMechanics(applied, mechanics);
  const category = mechanics.find(item => item.id === categoryId);
  const availableRules = (category?.rules ?? []).filter(rule => rule.ruleType === "effect" || !hideCosts);

  const add = () => {
    if (!categoryId || !ruleId || applied.some(item => item.mechanicId === categoryId && item.ruleId === ruleId)) return;
    const reference: AppliedMechanicReference = { applicationId: nanoid(), mechanicId: categoryId, ruleId };
    onChange([...effects, reference]);
    setRuleId("");
  };
  const remove = (applicationId: string) => onChange(effects.filter(effect => { const result = appliedMechanicReferenceSchema.safeParse(effect); return !result.success || result.data.applicationId !== applicationId; }));

  return <div className="space-y-4">
    <div><h3 className="text-sm font-semibold">Mecánicas aplicadas</h3><p className="text-xs text-muted-foreground">Agrega dinámicas definidas en Reglas del Sistema. La técnica o elemento solo guarda su referencia.</p></div>
    <div className="grid gap-2 rounded-md border bg-card p-4 md:grid-cols-[1fr_1fr_auto]">
      <Select value={categoryId} onValueChange={value => { setCategoryId(value); setRuleId(""); }}><SelectTrigger><SelectValue placeholder="Categoría mecánica" /></SelectTrigger><SelectContent>{mechanics.filter(item => item.rules.some(rule => rule.ruleType === "effect")).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
      <Select value={ruleId} disabled={!categoryId} onValueChange={setRuleId}><SelectTrigger><SelectValue placeholder="Opción mecánica" /></SelectTrigger><SelectContent>{availableRules.map(rule => <SelectItem key={rule.id} value={rule.id}>{rule.name}{hideCosts ? "" : ` (${rule.cost >= 0 ? "+" : ""}${rule.cost} CE)`}</SelectItem>)}</SelectContent></Select>
      <Button type="button" variant="secondary" onClick={add}><Plus className="size-4" /> Agregar</Button>
    </div>
    {applied.length === 0 && preserved.length === 0 && <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Este elemento no tiene mecánicas.</div>}
    {applied.map(reference => {
      const group = mechanics.find(item => item.id === reference.mechanicId);
      const rule = group?.rules.find(item => item.id === reference.ruleId);
      const targeting = group?.targeting ?? group?.defaultTargeting;
      return <div key={reference.applicationId} className="flex items-start gap-3 rounded-md border bg-card p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{rule?.name ?? "Referencia sin resolver"}</strong><span className="text-xs text-muted-foreground">{group?.name ?? reference.mechanicId}</span>{!hideCosts && <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{rule ? `${rule.cost} CE` : "—"}</span>}</div>{rule?.effect && <p className="mt-1 text-xs text-muted-foreground">{describeEffect(rule.effect, targeting)}</p>}{rule?.mechDesc && <p className="mt-1 text-xs text-muted-foreground">{rule.mechDesc}</p>}</div><Button type="button" variant="ghost" size="icon" onClick={() => remove(reference.applicationId)}><Trash2 className="size-4" /></Button></div>;
    })}
    {preserved.map((raw, index) => <div key={index} className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4"><AlertTriangle className="size-4 shrink-0 text-amber-400" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-amber-300">Efecto anterior conservado</p><p className="text-xs text-muted-foreground">No se altera al cargar. Sustitúyelo manualmente cuando confirmes su equivalencia.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => onChange(effects.filter(effect => effect !== raw))}><Trash2 className="size-4" /></Button></div>)}
    {!hideCosts && <div className="flex items-center justify-between rounded-md border bg-black/20 p-4"><div><p className="text-sm font-semibold">CE de las opciones</p><p className="text-xs text-muted-foreground">El coste final respeta también el mínimo configurado para la acción.</p>{(preserved.length > 0 || !resolution.valid) && <p className="text-xs text-amber-300">Hay datos anteriores o referencias rotas pendientes.</p>}</div><strong className="font-mono text-xl">{preserved.length === 0 && resolution.valid ? `${resolution.staminaCost} CE` : "Sin resolver"}</strong></div>}
  </div>;
}
