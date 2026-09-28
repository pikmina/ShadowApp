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
  cost_adjustment: "Modificar coste",
  manual_resolution: "Resolución manual",
  transformation: "Transformación",
};

export function createEffectDefinition(type: MechanicalEffectType, previous?: MechanicalEffectDefinition): MechanicalEffectDefinition {
  const base: { duration?: any; timing?: any } = { duration: previous?.duration };
  if (previous?.timing) {
    base.timing = previous.timing;
  }
  switch (type) {
    case "cost_adjustment": return { ...base, type, scopeId: "quirk", amount: 1 };
    case "manual_resolution": return { ...base, type, message: "El Master determina el efecto." };
    case "attribute_modifier": return { ...base, type, attributeId: "FUE", amount: 1 };
    case "derived_stat_modifier": return { ...base, type, statId: "SAL", amount: 1 };
    case "damage": return { ...base, type, dice: "1D6" };
    case "healing": return { ...base, type, resourceId: "SA", amount: 1 };
    case "barrier": return { ...base, type, amount: 1 };
    case "status": return { ...base, type, statusElementId: "status-id" };
    case "currency": return { ...base, type, currencyId: "yen", amount: 1 };
    case "rule_override": return { ...base, type, ruleId: "rule-id" };
    case "choice": return { ...base, type, options: ["Opción"] };
    case "transformation": return { ...base, type, magnitude: { type: "corporal", value: 1 } };
  }
}

export function describeEffect(effect: MechanicalEffectDefinition, targeting?: EffectTargeting): string {
  let behavior = effectTypeLabels[effect.type];
  if (effect.type === "attribute_modifier") behavior += ` ${effect.attributeId} ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
  if (effect.type === "derived_stat_modifier") behavior += ` ${effect.statId} ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
  if (effect.type === "damage") behavior += ` ${effect.dice}`;
  if (effect.type === "barrier") behavior += ` +${effect.amount}`;
  if (effect.type === "transformation") behavior += ` (${(effect as any).magnitude?.type ?? "corporal"})`;
  if (effect.type === "healing") {
    const isDice = (effect as any).magnitude?.kind === "dice" || (effect as any).kind === "dice" || Boolean((effect as any).dice) || Boolean((effect as any).formula);
    if (isDice) {
      behavior += ` ${(effect as any).magnitude?.formula ?? (effect as any).formula ?? (effect as any).dice}`;
    } else {
      behavior += ` +${(effect as any).magnitude?.amount ?? effect.amount}`;
    }
  }
  if (effect.type === "currency") behavior += ` ${effect.amount} ${effect.currencyId}`;
  if (effect.type === "manual_resolution") behavior += `: ${effect.message}`;
  if (effect.type === "cost_adjustment") behavior += ` ${effect.scopeId} ${effect.amount}`;
  if (effect.duration) behavior += ` · ${effect.duration.value} ${{ turn: "turnos", round: "rondas", scene: "escenas" }[effect.duration.unit]}`;
  if (!targeting) return behavior;
  const target = targeting.relationship === "self" ? "portador" : targeting.relationship === "ally" ? "aliado" : targeting.relationship === "enemy" ? "rival" : "cualquier objetivo";
  const quantity = targeting.maxTargets === null ? `${targeting.minTargets}+` : String(targeting.maxTargets);
  return `${behavior} · ${quantity} ${target}${quantity === "1" ? "" : "s"}`;
}

type Props = { 
  independentDuration?: boolean; 
  value: MechanicalEffectDefinition; 
  onChange: (value: MechanicalEffectDefinition) => void;
  hideTypeSelector?: boolean;
};

export function MechanicalEffectDefinitionEditor({ value, onChange, independentDuration, hideTypeSelector }: Props) {
  const patch = (changes: Record<string, unknown>) => onChange({ ...value, ...changes } as MechanicalEffectDefinition);

  return <div className="space-y-4 rounded-md border bg-black/15 p-4">
    {!hideTypeSelector && (
      <div className="space-y-2">
        <Label>Tipo de efecto</Label>
        <Select value={value.type} onValueChange={type => onChange(createEffectDefinition(type as MechanicalEffectType, value))}>
          <SelectTrigger><SelectValue>{effectTypeLabels[value.type]}</SelectValue></SelectTrigger>
          <SelectContent>{Object.entries(effectTypeLabels).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    )}
    <ValueFields value={value} patch={patch} />
    {(!independentDuration || value.duration) && <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Duración (opcional)</Label><Input type="number" min={1} value={value.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: value.duration?.unit ?? "turn" } : undefined })} /></div>
      <div className="space-y-2"><Label>Unidad</Label><Select disabled={!value.duration} value={value.duration?.unit ?? "turn"} onValueChange={unit => patch({ duration: { value: value.duration?.value ?? 1, unit } })}><SelectTrigger><SelectValue>{{"turn":"Turnos","round":"Rondas","scene":"Escenas"}[value.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select></div>
    </div>}
    {independentDuration && <p className="text-xs text-muted-foreground">Añade Duración como regla independiente en el grupo del elemento.</p>}
  </div>;
}

function ValueFields({ value, patch }: { value: MechanicalEffectDefinition; patch: (changes: Record<string, unknown>) => void }) {
  switch (value.type) {
    case "manual_resolution": return <div><Label>Mensaje para el Master</Label><Input value={value.message} onChange={e => patch({ message: e.target.value })} /></div>;
    case "cost_adjustment": return <div className="grid gap-3 sm:grid-cols-2"><div><Label>Ámbito de coste (ID)</Label><Input value={value.scopeId} onChange={e => patch({ scopeId: e.target.value })} /></div><div><Label>Ajuste</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "attribute_modifier": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Atributo</Label><Select value={value.attributeId} onValueChange={attributeId => patch({ attributeId })}><SelectTrigger><SelectValue>{value.attributeId}</SelectValue></SelectTrigger><SelectContent>{["FUE","DES","RES","INT","VOL","VEL"].map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "derived_stat_modifier": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Estadística</Label><Select value={value.statId} onValueChange={statId => patch({ statId })}><SelectTrigger><SelectValue>{{"INI":"Iniciativa","EVA":"Evasión","COR":"Coraje","SAL":"Salud máxima","EST":"Estamina máxima","RED":"Reducción de daño"}[value.statId] || value.statId}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INI">Iniciativa</SelectItem><SelectItem value="EVA">Evasión</SelectItem><SelectItem value="COR">Coraje</SelectItem><SelectItem value="SAL">Salud máxima</SelectItem><SelectItem value="EST">Estamina máxima</SelectItem><SelectItem value="RED">Reducción de daño</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "damage": return <div className="space-y-2"><Label>Dados / Cantidad de Daño</Label><Input value={value.dice} onChange={e => patch({ dice: e.target.value })} placeholder="Ej. 2D6" /></div>;
    case "healing": {
      const isDice = (value as any).magnitude?.kind === "dice" || (value as any).kind === "dice" || Boolean((value as any).dice) || Boolean((value as any).formula);
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Recurso</Label>
            <Select value={value.resourceId} onValueChange={resourceId => patch({ resourceId })}>
              <SelectTrigger><SelectValue>{value.resourceId === "SA" ? "Salud" : "Estamina"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="SA">Salud</SelectItem>
                <SelectItem value="ES">Estamina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Magnitud</Label>
            <Select
              value={isDice ? "dice" : "fixed"}
              onValueChange={(k) => {
                if (k === "dice") {
                  const formula = (value as any).dice || (value as any).formula || "1D6";
                  patch({
                    kind: "dice",
                    formula,
                    dice: formula,
                    magnitude: { kind: "dice", formula },
                    amount: undefined,
                  });
                } else {
                  const amount = typeof value.amount === "number" && value.amount > 0 ? value.amount : 2;
                  patch({
                    kind: "fixed",
                    amount,
                    magnitude: { kind: "fixed", amount },
                    formula: undefined,
                    dice: undefined,
                  });
                }
              }}
            >
              <SelectTrigger><SelectValue>{isDice ? "Dados" : "Fija"}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fija</SelectItem>
                <SelectItem value="dice">Dados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {isDice ? (
              <>
                <Label>Fórmula de Dados</Label>
                <Input
                  value={(value as any).formula ?? (value as any).dice ?? "1D6"}
                  onChange={e => {
                    const formula = e.target.value.toUpperCase();
                    patch({
                      kind: "dice",
                      formula,
                      dice: formula,
                      magnitude: { kind: "dice", formula },
                    });
                  }}
                  placeholder="Ej. 1D6"
                />
              </>
            ) : (
              <>
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={value.amount ?? 1}
                  onChange={e => {
                    const amount = Number(e.target.value);
                    patch({
                      kind: "fixed",
                      amount,
                      magnitude: { kind: "fixed", amount },
                    });
                  }}
                />
              </>
            )}
          </div>
        </div>
      );
    }
    case "barrier": return <div className="space-y-2"><Label>Puntos de Barrera</Label><Input type="number" min={1} value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "status": return <div className="space-y-2"><Label>Estado Alterado a Aplicar</Label><Input value={value.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID estable del estado" /></div>;
    case "currency": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Recompensa</Label><Select value={value.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue>{value.currencyId === "yen" ? "Yenes" : "Experiencia"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="yen">Yenes</SelectItem><SelectItem value="exp">Experiencia</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "rule_override": return <div className="space-y-2"><Label>Regla Especial</Label><Input value={value.ruleId} onChange={e => patch({ ruleId: e.target.value })} placeholder="ID estable de la regla" /></div>;
    case "choice": return <div className="space-y-2"><Label>Opciones a elegir (separadas por coma)</Label><Input value={value.options.join(", ")} onChange={e => patch({ options: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /></div>;
    case "transformation": {
      const magType = (value as any).magnitude?.type || "corporal";
      return (
        <div className="space-y-2">
          <Label>Magnitud de Transformación</Label>
          <Select
            value={magType}
            onValueChange={(val) => {
              const costMap: Record<string, number> = {
                body: 1,
                corporal: 1,
                "2m": 2,
                "5m": 3,
                "10m": 4,
                "20m": 6,
              };
              patch({
                magnitude: { type: val, value: costMap[val] ?? 1 },
              });
            }}
          >
            <SelectTrigger><SelectValue>{{"body": "Corporal", "corporal": "Corporal", "2m": "2 metros", "5m": "5 metros", "10m": "10 metros", "20m": "20 metros"}[magType] || magType}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="corporal">Corporal</SelectItem>
              <SelectItem value="2m">2 metros</SelectItem>
              <SelectItem value="5m">5 metros</SelectItem>
              <SelectItem value="10m">10 metros</SelectItem>
              <SelectItem value="20m">20 metros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
  }
}
