import { Input } from "../ui/input";
import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { AlertTriangle, Plus, Trash2, Sparkles, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { appliedMechanicReferenceSchema, resolveAppliedMechanics, type AppliedMechanicReference, type SystemMechanicsConfig } from "../../domain/systemMechanics";
import { describeEffect } from "./MechanicalEffectDefinitionEditor";

type Props = {
  effects: unknown[];
  mechanics: SystemMechanicsConfig;
  onChange: (effects: unknown[]) => void;
  hideCosts?: boolean;
  maxLevel?: number;
};

export function MechanicalEffectsEditor({ effects, mechanics, onChange, hideCosts, maxLevel }: Props) {
  const [groupId, setGroupId] = useState("Principal");
  const [categoryId, setCategoryId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [selectedMinLevel, setSelectedMinLevel] = useState<number>(1);

  const applied = useMemo(() => effects.flatMap(effect => { const result = appliedMechanicReferenceSchema.safeParse(effect); return result.success ? [result.data] : []; }), [effects]);
  const preserved = effects.filter(effect => !appliedMechanicReferenceSchema.safeParse(effect).success);
  const resolution = resolveAppliedMechanics(applied, mechanics);
  const category = mechanics.find(item => item.id === categoryId);
  const availableRules = (category?.rules ?? []).filter(rule => rule.ruleType === "effect" || rule.ruleType === "component" || !hideCosts);

  const add = () => {
    if (!groupId.trim() || !categoryId || !ruleId) return;
    const minLvl = maxLevel ? selectedMinLevel : undefined;
    if (applied.some(item => (item.groupId ?? "default") === groupId && item.mechanicId === categoryId && item.ruleId === ruleId && (item.minLevel ?? 1) === (minLvl ?? 1))) return;
    
    const reference: AppliedMechanicReference = {
      applicationId: nanoid(),
      groupId,
      mechanicId: categoryId,
      ruleId,
      ...(minLvl && minLvl > 1 ? { minLevel: minLvl } : {})
    };
    onChange([...effects, reference]);
    setRuleId("");
  };

  const updateMinLevel = (applicationId: string, newMinLevel: number) => {
    onChange(effects.map(effect => {
      const result = appliedMechanicReferenceSchema.safeParse(effect);
      if (!result.success || result.data.applicationId !== applicationId) return effect;
      return {
        ...result.data,
        minLevel: newMinLevel > 1 ? newMinLevel : undefined
      };
    }));
  };

  const remove = (applicationId: string) => onChange(effects.filter(effect => { const result = appliedMechanicReferenceSchema.safeParse(effect); return !result.success || result.data.applicationId !== applicationId; }));

  return <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold">Mecánicas aplicadas</h3>
      <p className="text-xs text-muted-foreground">
        Agrega dinámicas definidas en Reglas del Sistema. {maxLevel ? "Puedes configurar a qué nivel de la habilidad se activa cada efecto." : "La técnica o elemento solo guarda su referencia."}
      </p>
    </div>
    
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Las reglas del mismo grupo comparten objetivo, duración y condiciones. Usa otro grupo para un efecto independiente.</p>
      <Input aria-label="Grupo de composición" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Grupo" />
    </div>

    <div className={`grid gap-2 rounded-md border bg-card p-4 ${maxLevel ? 'md:grid-cols-[1fr_1fr_140px_auto]' : 'md:grid-cols-[1fr_1fr_auto]'}`}>
      <Select value={categoryId} onValueChange={value => { setCategoryId(value); setRuleId(""); }}>
        <SelectTrigger><SelectValue placeholder="Categoría mecánica">{category?.name}</SelectValue></SelectTrigger>
        <SelectContent>{mechanics.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
      </Select>

      <Select value={ruleId} disabled={!categoryId} onValueChange={setRuleId}>
        <SelectTrigger><SelectValue placeholder="Opción mecánica">{category?.rules.find(r => r.id === ruleId)?.name}</SelectValue></SelectTrigger>
        <SelectContent>{availableRules.map(rule => <SelectItem key={rule.id} value={rule.id}>{rule.name}{hideCosts ? "" : ` (${rule.cost >= 0 ? "+" : ""}${rule.cost} CE)`}</SelectItem>)}</SelectContent>
      </Select>

      {maxLevel && (
        <Select value={String(selectedMinLevel)} onValueChange={v => setSelectedMinLevel(parseInt(v, 10) || 1)}>
          <SelectTrigger>
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map(lvl => (
              <SelectItem key={lvl} value={String(lvl)}>
                {lvl === 1 ? 'Desde Nv. 1 (Base)' : `Desde Nv. ${lvl}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={!groupId.trim() || !ruleId || applied.some(r => (r.groupId ?? "default") === groupId && r.mechanicId === categoryId && r.ruleId === ruleId && (r.minLevel ?? 1) === (maxLevel ? selectedMinLevel : 1))}
        onClick={add}
      >
        <Plus className="size-4 mr-1" /> Agregar
      </Button>
    </div>

    {applied.length === 0 && preserved.length === 0 && (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Este elemento no tiene mecánicas asignadas.
      </div>
    )}

    {applied.map(reference => {
      const group = mechanics.find(item => item.id === reference.mechanicId);
      const rule = group?.rules.find(item => item.id === reference.ruleId);
      const composed = resolution.effects.find(e => e.id === reference.applicationId);
      const targeting = composed?.targeting ?? group?.targeting ?? group?.defaultTargeting;
      const effectMinLevel = reference.minLevel ?? 1;

      return (
        <div key={reference.applicationId} className="flex items-start gap-3 rounded-md border bg-card p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{rule?.name ?? "Referencia sin resolver"}</strong>
              <span className="text-xs text-muted-foreground">{group?.name ?? reference.mechanicId} · Grupo {reference.groupId ?? "Principal"}</span>
              
              {maxLevel && (
                <Badge variant="outline" className={`font-mono text-[11px] ${effectMinLevel > 1 ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-primary/30 text-primary bg-primary/10'}`}>
                  {effectMinLevel > 1 ? `Activa en Nivel ${effectMinLevel}+` : 'Activa en Nivel 1+'}
                </Badge>
              )}

              {!hideCosts && <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{rule ? `${rule.cost} CE` : "—"}</span>}
            </div>

            {rule?.effect && <p className="mt-1 text-xs text-muted-foreground">{describeEffect(composed ?? rule.effect, targeting)}</p>}
            {rule?.mechDesc && <p className="mt-1 text-xs text-muted-foreground">{rule.mechDesc}</p>}
          </div>

          {maxLevel && (
            <div className="shrink-0 flex items-center gap-1.5 mr-1">
              <Select value={String(effectMinLevel)} onValueChange={v => updateMinLevel(reference.applicationId, parseInt(v, 10) || 1)}>
                <SelectTrigger className="h-7 w-28 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxLevel }, (_, i) => i + 1).map(lvl => (
                    <SelectItem key={lvl} value={String(lvl)} className="text-xs">
                      {lvl === 1 ? 'Nv. 1+' : `Nv. ${lvl}+`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="button" variant="ghost" size="icon" onClick={() => remove(reference.applicationId)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      );
    })}

    {preserved.map((raw, index) => (
      <div key={index} className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
        <AlertTriangle className="size-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-300">Efecto anterior conservado</p>
          <p className="text-xs text-muted-foreground">No se altera al cargar. Sustitúyelo manualmente cuando confirmes su equivalencia.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(effects.filter(effect => effect !== raw))}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    ))}

    {!resolution.valid && <p role="alert" className="text-sm text-destructive">Referencias rotas, duplicadas o reglas incompatibles en el grupo. Revisa objetivos, duración y condiciones.</p>}
    {!hideCosts && (
      <div className="flex items-center justify-between rounded-md border bg-black/20 p-4">
        <div>
          <p className="text-sm font-semibold">CE de las opciones</p>
          <p className="text-xs text-muted-foreground">El coste final respeta también el mínimo configurado para la acción.</p>
          {(preserved.length > 0 || !resolution.valid) && <p className="text-xs text-amber-300">Hay datos anteriores o referencias rotas pendientes.</p>}
        </div>
        <strong className="shrink-0 whitespace-nowrap font-mono text-xl">{preserved.length === 0 && resolution.valid ? `${resolution.staminaCost} CE` : "Sin resolver"}</strong>
      </div>
    )}
  </div>;
}
