import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { EffectTargeting, MechanicalEffectDefinition, MechanicalEffectType } from "../../domain/systemMechanics";

export const effectTypeLabels: Record<MechanicalEffectType, string> = {
  attribute_modifier: "Modificar atributo base",
  derived_stat_modifier: "Modificar estadística derivada",
  damage: "Daño",
  healing: "Curación",
  barrier: "Barrera",
  status: "Estado alterado",
  currency: "Recompensa",
  rule_override: "Excepción de regla",
  choice: "Elección",
};

export function createEffectDefinition(type: MechanicalEffectType, previous?: MechanicalEffectDefinition): MechanicalEffectDefinition {
  const base = { timing: previous?.timing ?? "on_activation", duration: previous?.duration };
  switch (type) {
    case "attribute_modifier": return { ...base, type, attributeId: "FUE", amount: 1 };
    case "derived_stat_modifier": return { ...base, type, statId: "SAL", amount: 1 };
    case "damage": return { ...base, type, dice: "1D6" };
    case "healing": return { ...base, type, resourceId: "SA", amount: 1 };
    case "barrier": return { ...base, type, amount: 1 };
    case "status": return { ...base, type, statusElementId: "status-id" };
    case "currency": return { ...base, type, currencyId: "yen", amount: 1 };
    case "rule_override": return { ...base, type, ruleId: "rule-id" };
    case "choice": return { ...base, type, options: ["Opción"] };
  }
}

export function describeEffect(effect: MechanicalEffectDefinition, targeting?: EffectTargeting): string {
  let behavior = effectTypeLabels[effect.type];
  if (effect.type === "attribute_modifier") behavior += ` ${effect.attributeId} ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
  if (effect.type === "derived_stat_modifier") behavior += ` ${effect.statId} ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
  if (effect.type === "damage") behavior += ` ${effect.dice}`;
  if (effect.type === "healing" || effect.type === "barrier") behavior += ` +${effect.amount}`;
  if (effect.type === "currency") behavior += ` ${effect.amount} ${effect.currencyId}`;
  if (!targeting) return behavior;
  const target = targeting.relationship === "self" ? "portador" : targeting.relationship === "ally" ? "aliado" : targeting.relationship === "enemy" ? "rival" : "cualquier objetivo";
  const quantity = targeting.maxTargets === null ? `${targeting.minTargets}+` : String(targeting.maxTargets);
  return `${behavior} · ${quantity} ${target}${quantity === "1" ? "" : "s"}`;
}

type Props = { value: MechanicalEffectDefinition; onChange: (value: MechanicalEffectDefinition) => void };

export function MechanicalEffectDefinitionEditor({ value, onChange }: Props) {
  const patch = (changes: Record<string, unknown>) => onChange({ ...value, ...changes } as MechanicalEffectDefinition);

  return <div className="space-y-4 rounded-md border bg-black/15 p-4">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Comportamiento</Label><Select value={value.type} onValueChange={type => onChange(createEffectDefinition(type as MechanicalEffectType, value))}><SelectTrigger><SelectValue>{effectTypeLabels[value.type]}</SelectValue></SelectTrigger><SelectContent>{Object.entries(effectTypeLabels).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Cuándo se aplica</Label><Select value={value.timing} onValueChange={timing => patch({ timing })}><SelectTrigger><SelectValue>{{"passive":"Pasivo","on_activation":"Al activar","on_hit":"Al impactar","on_critical":"En crítico","after_effect":"Después del efecto","turn_start":"Inicio del turno","each_turn":"Cada turno","on_fumble":"En pifia"}[value.timing] || value.timing}</SelectValue></SelectTrigger><SelectContent><SelectItem value="passive">Pasivo</SelectItem><SelectItem value="on_activation">Al activar</SelectItem><SelectItem value="on_hit">Al impactar</SelectItem><SelectItem value="on_critical">En crítico</SelectItem><SelectItem value="after_effect">Después del efecto</SelectItem><SelectItem value="turn_start">Inicio del turno</SelectItem><SelectItem value="each_turn">Cada turno</SelectItem><SelectItem value="on_fumble">En pifia</SelectItem></SelectContent></Select></div>
    </div>
    <ValueFields value={value} patch={patch} />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Duración (opcional)</Label><Input type="number" min={1} value={value.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: value.duration?.unit ?? "turn" } : undefined })} /></div>
      <div className="space-y-2"><Label>Unidad</Label><Select disabled={!value.duration} value={value.duration?.unit ?? "turn"} onValueChange={unit => patch({ duration: { value: value.duration?.value ?? 1, unit } })}><SelectTrigger><SelectValue>{{"turn":"Turnos","round":"Rondas","scene":"Escenas"}[value.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select></div>
    </div>
  </div>;
}

function ValueFields({ value, patch }: { value: MechanicalEffectDefinition; patch: (changes: Record<string, unknown>) => void }) {
  switch (value.type) {
    case "attribute_modifier": return <div className="grid gap-4 md:grid-cols-2"><Select value={value.attributeId} onValueChange={attributeId => patch({ attributeId })}><SelectTrigger><SelectValue>{value.attributeId}</SelectValue></SelectTrigger><SelectContent>{["FUE","DES","RES","INT","VOL","VEL"].map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent></Select><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "derived_stat_modifier": return <div className="grid gap-4 md:grid-cols-2"><Select value={value.statId} onValueChange={statId => patch({ statId })}><SelectTrigger><SelectValue>{{"INI":"Iniciativa","EVA":"Evasión","COR":"Coraje","SAL":"Salud máxima","EST":"Estamina máxima","RED":"Reducción de daño"}[value.statId] || value.statId}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INI">Iniciativa</SelectItem><SelectItem value="EVA">Evasión</SelectItem><SelectItem value="COR">Coraje</SelectItem><SelectItem value="SAL">Salud máxima</SelectItem><SelectItem value="EST">Estamina máxima</SelectItem><SelectItem value="RED">Reducción de daño</SelectItem></SelectContent></Select><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "damage": return <Input value={value.dice} onChange={e => patch({ dice: e.target.value })} placeholder="Ej. 2D6" />;
    case "healing": return <div className="grid gap-4 md:grid-cols-2"><Select value={value.resourceId} onValueChange={resourceId => patch({ resourceId })}><SelectTrigger><SelectValue>{value.resourceId === "SA" ? "Salud" : "Estamina"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="SA">Salud</SelectItem><SelectItem value="ES">Estamina</SelectItem></SelectContent></Select><Input type="number" min={1} value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "barrier": return <Input type="number" min={1} value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} />;
    case "status": return <Input value={value.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID estable del estado" />;
    case "currency": return <div className="grid gap-4 md:grid-cols-2"><Select value={value.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue>{value.currencyId === "yen" ? "Yenes" : "Experiencia"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="yen">Yenes</SelectItem><SelectItem value="exp">Experiencia</SelectItem></SelectContent></Select><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "rule_override": return <Input value={value.ruleId} onChange={e => patch({ ruleId: e.target.value })} placeholder="ID estable de la regla" />;
    case "choice": return <Input value={value.options.join(", ")} onChange={e => patch({ options: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} />;
  }
}
