import re

with open('src/components/mechanics/MechanicalEffectDefinitionEditor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('function ValueFields')

new_value_fields = """function ValueFields({ value, patch }: { value: MechanicalEffectDefinition; patch: (changes: Record<string, unknown>) => void }) {
  switch (value.type) {
    case "attribute_modifier": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Atributo</Label><Select value={value.attributeId} onValueChange={attributeId => patch({ attributeId })}><SelectTrigger><SelectValue>{value.attributeId}</SelectValue></SelectTrigger><SelectContent>{["FUE","DES","RES","INT","VOL","VEL"].map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "derived_stat_modifier": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Estadística</Label><Select value={value.statId} onValueChange={statId => patch({ statId })}><SelectTrigger><SelectValue>{{"INI":"Iniciativa","EVA":"Evasión","COR":"Coraje","SAL":"Salud máxima","EST":"Estamina máxima","RED":"Reducción de daño"}[value.statId] || value.statId}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INI">Iniciativa</SelectItem><SelectItem value="EVA">Evasión</SelectItem><SelectItem value="COR">Coraje</SelectItem><SelectItem value="SAL">Salud máxima</SelectItem><SelectItem value="EST">Estamina máxima</SelectItem><SelectItem value="RED">Reducción de daño</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "damage": return <div className="space-y-2"><Label>Dados / Cantidad de Daño</Label><Input value={value.dice} onChange={e => patch({ dice: e.target.value })} placeholder="Ej. 2D6" /></div>;
    case "healing": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Recurso</Label><Select value={value.resourceId} onValueChange={resourceId => patch({ resourceId })}><SelectTrigger><SelectValue>{value.resourceId === "SA" ? "Salud" : "Estamina"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="SA">Salud</SelectItem><SelectItem value="ES">Estamina</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" min={1} value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "barrier": return <div className="space-y-2"><Label>Puntos de Barrera</Label><Input type="number" min={1} value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div>;
    case "status": return <div className="space-y-2"><Label>Estado Alterado a Aplicar</Label><Input value={value.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID estable del estado" /></div>;
    case "currency": return <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Recompensa</Label><Select value={value.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue>{value.currencyId === "yen" ? "Yenes" : "Experiencia"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="yen">Yenes</SelectItem><SelectItem value="exp">Experiencia</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Cantidad</Label><Input type="number" value={value.amount} onChange={e => patch({ amount: Number(e.target.value) })} /></div></div>;
    case "rule_override": return <div className="space-y-2"><Label>Regla Especial</Label><Input value={value.ruleId} onChange={e => patch({ ruleId: e.target.value })} placeholder="ID estable de la regla" /></div>;
    case "choice": return <div className="space-y-2"><Label>Opciones a elegir (separadas por coma)</Label><Input value={value.options.join(", ")} onChange={e => patch({ options: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} /></div>;
  }
}
"""

content = content[:start_idx] + new_value_fields

with open('src/components/mechanics/MechanicalEffectDefinitionEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

