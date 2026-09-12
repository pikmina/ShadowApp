import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  calculateCanonicalMechanicalCost,
  mechanicalEffectSchema,
  type CanonicalMechanicalEffect,
  type EffectTargeting,
  type MechanicalEffectType,
  type SystemMechanicsConfig,
} from "../../domain/systemMechanics";

type Props = {
  effects: unknown[];
  mechanics: SystemMechanicsConfig;
  onChange: (effects: unknown[]) => void;
  hideCosts?: boolean;
};

const labels: Record<MechanicalEffectType, string> = {
  attribute_modifier: "Modificar atributo",
  derived_stat_modifier: "Modificar estadística derivada",
  damage: "Causar daño",
  healing: "Recuperar Salud/Estamina",
  barrier: "Crear barrera",
  status: "Aplicar estado alterado",
  currency: "Modificar economía",
  rule_override: "Excepción de regla",
  choice: "Elección estructurada",
};

const selfTarget: EffectTargeting = {
  allowedEntityKinds: ["character", "npc"],
  relationship: "self",
  selection: "direct",
  minTargets: 1,
  maxTargets: 1,
};

function createEffect(type: MechanicalEffectType, old?: CanonicalMechanicalEffect): CanonicalMechanicalEffect {
  const base = { id: old?.id ?? nanoid(), timing: old?.timing ?? "on_activation" as const, targeting: old?.targeting ?? selfTarget, costRules: old?.costRules ?? [] };
  switch (type) {
    case "attribute_modifier": return { ...base, type, attributeId: "FUE", amount: 1 };
    case "derived_stat_modifier": return { ...base, type, statId: "EVA", amount: 1 };
    case "damage": return { ...base, type, dice: "1D6" };
    case "healing": return { ...base, type, resourceId: "SA", amount: 1 };
    case "barrier": return { ...base, type, amount: 1 };
    case "status": return { ...base, type, statusElementId: "" };
    case "currency": return { ...base, type, currencyId: "yen", amount: 1 };
    case "rule_override": return { ...base, type, ruleId: "" };
    case "choice": return { ...base, type, options: [""] };
  }
}

export function MechanicalEffectsEditor({ effects, mechanics, onChange, hideCosts }: Props) {
  const parsed = useMemo(() => effects.map(effect => mechanicalEffectSchema.safeParse(effect)), [effects]);
  const canonical = parsed.flatMap(result => result.success ? [result.data] : []);
  const isCanonicalCandidate = (effect: unknown): effect is CanonicalMechanicalEffect =>
    typeof effect === "object" && effect !== null && "id" in effect && "type" in effect &&
    typeof effect.type === "string" && effect.type in labels;
  const legacyCount = effects.filter(effect => !isCanonicalCandidate(effect)).length;
  const invalidCanonicalCount = effects.filter((effect, index) =>
    isCanonicalCandidate(effect) && !parsed[index].success).length;
  const cost = calculateCanonicalMechanicalCost(canonical, mechanics);
  const [pending, setPending] = useState<Record<string, { mechanicId: string; ruleId: string }>>({});

  const replace = (index: number, effect: CanonicalMechanicalEffect) => onChange(effects.map((current, i) => i === index ? effect : current));
  const remove = (index: number) => onChange(effects.filter((_, i) => i !== index));

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold">Efectos mecánicos</h3><p className="text-xs text-muted-foreground">{hideCosts ? "El comportamiento y los destinatarios se guardan por separado." : "Comportamiento, destinatarios y costes se guardan por separado."}</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...effects, createEffect("damage")])}><Plus className="size-4" /> Añadir efecto</Button>
    </div>

    {effects.length === 0 && <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Este elemento no tiene efectos mecánicos.</div>}

    {effects.map((raw, index) => {
      const result = parsed[index];
      if (!isCanonicalCandidate(raw)) return <div key={index} className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
        <AlertTriangle className="size-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-amber-300">Efecto legado sin convertir</p><p className="text-xs text-muted-foreground">Se conserva sin cambios. Elimínalo y crea su equivalente canónico cuando confirmes su comportamiento.</p><code className="mt-2 block overflow-auto rounded bg-black/30 p-2 text-[11px]">{JSON.stringify(raw)}</code></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="size-4" /></Button>
      </div>;

      const effect = result.success ? result.data : raw;
      const draft = pending[effect.id] ?? { mechanicId: "", ruleId: "" };
      const category = mechanics.find(item => item.id === draft.mechanicId);
      const patch = (values: Record<string, unknown>) => replace(index, { ...effect, ...values } as CanonicalMechanicalEffect);
      const patchTarget = (values: Partial<EffectTargeting>) => {
        let targeting = { ...effect.targeting, ...values };
        if (values.relationship === "self") targeting = { ...targeting, relationship: "self", selection: "direct", minTargets: 1, maxTargets: 1 };
        patch({ targeting });
      };

      return <div key={effect.id} className="space-y-4 rounded-md border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Select value={effect.type} onValueChange={value => replace(index, createEffect(value as MechanicalEffectType, effect))}><SelectTrigger className="w-64"><SelectValue>{labels[effect.type as MechanicalEffectType] || effect.type}</SelectValue></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={effect.timing} onValueChange={timing => patch({ timing })}><SelectTrigger className="w-44"><SelectValue>{{"passive": "Pasivo", "on_activation": "Al activar", "on_hit": "Al impactar", "on_critical": "En crítico", "after_effect": "Después del efecto", "turn_start": "Inicio del turno", "each_turn": "Cada turno", "on_fumble": "En pifia"}[effect.timing] || effect.timing}</SelectValue></SelectTrigger><SelectContent><SelectItem value="passive">Pasivo</SelectItem><SelectItem value="on_activation">Al activar</SelectItem><SelectItem value="on_hit">Al impactar</SelectItem><SelectItem value="on_critical">En crítico</SelectItem><SelectItem value="after_effect">Después del efecto</SelectItem><SelectItem value="turn_start">Inicio del turno</SelectItem><SelectItem value="each_turn">Cada turno</SelectItem><SelectItem value="on_fumble">En pifia</SelectItem></SelectContent></Select>
          <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => remove(index)}><Trash2 className="size-4" /></Button>
        </div>

        <ValueFields effect={effect} patch={patch} />

        {!result.success && <p className="text-xs text-destructive">Completa los campos obligatorios antes de guardar.</p>}

        <div className="grid gap-2 rounded-md border p-3 md:grid-cols-4">
          <Select value={effect.targeting.relationship} onValueChange={relationship => patchTarget({ relationship: relationship as EffectTargeting["relationship"] })}><SelectTrigger><SelectValue>{{"self": "Portador", "ally": "Aliado", "enemy": "Enemigo", "any": "Cualquiera"}[effect.targeting.relationship] || effect.targeting.relationship}</SelectValue></SelectTrigger><SelectContent><SelectItem value="self">Portador</SelectItem><SelectItem value="ally">Aliado</SelectItem><SelectItem value="enemy">Enemigo</SelectItem><SelectItem value="any">Cualquiera</SelectItem></SelectContent></Select>
          <Select value={effect.targeting.selection} disabled={effect.targeting.relationship === "self"} onValueChange={selection => patchTarget({ selection: selection as EffectTargeting["selection"] })}><SelectTrigger><SelectValue>{{"direct": "Directo", "area": "Área"}[effect.targeting.selection] || effect.targeting.selection}</SelectValue></SelectTrigger><SelectContent><SelectItem value="direct">Directo</SelectItem><SelectItem value="area">Área</SelectItem></SelectContent></Select>
          <Input aria-label="Mínimo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.minTargets} onChange={event => patchTarget({ minTargets: Number(event.target.value) })} placeholder="Mínimo" />
          <Input aria-label="Máximo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.maxTargets ?? ""} onChange={event => patchTarget({ maxTargets: event.target.value === "" ? null : Number(event.target.value) })} placeholder={effect.targeting.selection === "area" ? "Sin límite" : "Máximo"} />
        </div>

        {!hideCosts && (
          <div className="space-y-2 rounded-md border p-3">
            {effect.costRules.map((reference, ruleIndex) => { const group = mechanics.find(item => item.id === reference.mechanicId); const rule = group?.rules.find(item => item.id === reference.ruleId); return <div key={`${reference.mechanicId}:${reference.ruleId}:${ruleIndex}`} className="flex items-center gap-2 text-sm"><span className="flex-1">{group?.name ?? reference.mechanicId} / {rule?.name ?? reference.ruleId}</span><span className="font-mono">{rule ? `${rule.cost >= 0 ? "+" : ""}${rule.cost} CE` : "Sin resolver"}</span><Button type="button" variant="ghost" size="icon" onClick={() => patch({ costRules: effect.costRules.filter((_, i) => i !== ruleIndex) })}><Trash2 className="size-4" /></Button></div>; })}
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Select value={draft.mechanicId} onValueChange={mechanicId => setPending(current => ({ ...current, [effect.id]: { mechanicId, ruleId: "" } }))}><SelectTrigger><SelectValue placeholder="Categoría de coste" /></SelectTrigger><SelectContent>{mechanics.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
              <Select value={draft.ruleId} disabled={!draft.mechanicId} onValueChange={ruleId => setPending(current => ({ ...current, [effect.id]: { ...draft, ruleId } }))}><SelectTrigger><SelectValue placeholder="Regla" /></SelectTrigger><SelectContent>{(category?.rules ?? []).map(rule => <SelectItem key={rule.id} value={rule.id}>{rule.name} ({rule.cost >= 0 ? "+" : ""}{rule.cost} CE)</SelectItem>)}</SelectContent></Select>
              <Button type="button" variant="secondary" onClick={() => { if (!draft.mechanicId || !draft.ruleId || effect.costRules.some(ref => ref.mechanicId === draft.mechanicId && ref.ruleId === draft.ruleId)) return; patch({ costRules: [...effect.costRules, draft] }); setPending(current => ({ ...current, [effect.id]: { mechanicId: "", ruleId: "" } })); }}>Añadir coste</Button>
            </div>
          </div>
        )}
      </div>;
    })}

    {!hideCosts && (
      <div className="flex items-center justify-between rounded-md border bg-black/20 p-4"><div><p className="text-sm font-semibold">Coste canónico total</p>{(legacyCount > 0 || invalidCanonicalCount > 0 || !cost.valid) && <p className="text-xs text-amber-300">{legacyCount > 0 ? `${legacyCount} efecto(s) legado(s) pendientes.` : invalidCanonicalCount > 0 ? "Hay efectos canónicos incompletos." : "Hay referencias de coste duplicadas o rotas."}</p>}</div><strong className="font-mono text-xl">{legacyCount === 0 && invalidCanonicalCount === 0 && cost.valid ? `${cost.total} CE` : "Sin resolver"}</strong></div>
    )}
  </div>;
}

function ValueFields({ effect, patch }: { effect: CanonicalMechanicalEffect; patch: (value: Record<string, unknown>) => void }) {
  switch (effect.type) {
    case "attribute_modifier": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.attributeId} onValueChange={attributeId => patch({ attributeId })}><SelectTrigger><SelectValue>{{"FUE": "Fuerza (FUE)", "DES": "Destreza (DES)", "RES": "Resistencia (RES)", "INT": "Inteligencia (INT)", "VOL": "Voluntad (VOL)", "VEL": "Velocidad (VEL)"}[effect.attributeId as string] || effect.attributeId || "Seleccionar atributo..."}</SelectValue></SelectTrigger><SelectContent><SelectItem value="FUE">Fuerza (FUE)</SelectItem><SelectItem value="DES">Destreza (DES)</SelectItem><SelectItem value="RES">Resistencia (RES)</SelectItem><SelectItem value="INT">Inteligencia (INT)</SelectItem><SelectItem value="VOL">Voluntad (VOL)</SelectItem><SelectItem value="VEL">Velocidad (VEL)</SelectItem></SelectContent></Select><Input type="number" value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Modificador" /></div>;
    case "derived_stat_modifier": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.statId} onValueChange={statId => patch({ statId })}><SelectTrigger><SelectValue>{{"INI": "Iniciativa", "EVA": "Evasión", "COR": "Coraje", "SAL": "Salud Max", "EST": "Estamina Max", "RED": "Reducción de Daño"}[effect.statId as string] || effect.statId || "Seleccionar..."}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INI">Iniciativa</SelectItem><SelectItem value="EVA">Evasión</SelectItem><SelectItem value="COR">Coraje</SelectItem><SelectItem value="SAL">Salud Max</SelectItem><SelectItem value="EST">Estamina Max</SelectItem><SelectItem value="RED">Reducción de Daño (RED)</SelectItem></SelectContent></Select><Input type="number" value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Modificador" /></div>;
    case "damage": return <Input value={effect.dice} onChange={e => patch({ dice: e.target.value })} placeholder="Dados, por ejemplo 2D6" />;
    case "healing": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.resourceId} onValueChange={resourceId => patch({ resourceId })}><SelectTrigger><SelectValue>{{"SA": "Salud", "ES": "Estamina"}[effect.resourceId as string] || effect.resourceId}</SelectValue></SelectTrigger><SelectContent><SelectItem value="SA">Salud</SelectItem><SelectItem value="ES">Estamina</SelectItem></SelectContent></Select><Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad" /></div>;
    case "barrier": return <Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad de barrera" />;
    case "status": return <Input value={effect.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID del estado alterado" />;
    case "currency": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue>{{"yen": "Yenes", "exp": "Experiencia"}[effect.currencyId as string] || effect.currencyId}</SelectValue></SelectTrigger><SelectContent><SelectItem value="yen">Yenes</SelectItem><SelectItem value="exp">Experiencia</SelectItem></SelectContent></Select><Input type="number" value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "rule_override": return <Input value={effect.ruleId} onChange={e => patch({ ruleId: e.target.value })} placeholder="ID de la regla" />;
    case "choice": return <Input value={effect.options.join(", ")} onChange={e => patch({ options: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} placeholder="Opciones separadas por coma" />;
  }
}
