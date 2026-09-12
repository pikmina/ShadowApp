import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

old_block = """<div className="grid gap-4 rounded-md border p-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Relación</label>
            <Select value={effect.targeting.relationship} onValueChange={relationship => patchTarget({ relationship: relationship as EffectTargeting["relationship"] })}><SelectTrigger><SelectValue>{{"self": "Portador", "ally": "Aliado", "enemy": "Enemigo", "any": "Cualquiera"}[effect.targeting.relationship] || effect.targeting.relationship}</SelectValue></SelectTrigger><SelectContent><SelectItem value="self">Portador</SelectItem><SelectItem value="ally">Aliado</SelectItem><SelectItem value="enemy">Enemigo</SelectItem><SelectItem value="any">Cualquiera</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Selección</label>
            <Select value={effect.targeting.selection} disabled={effect.targeting.relationship === "self"} onValueChange={selection => patchTarget({ selection: selection as EffectTargeting["selection"] })}><SelectTrigger><SelectValue>{{"direct": "Directo", "area": "Área"}[effect.targeting.selection] || effect.targeting.selection}</SelectValue></SelectTrigger><SelectContent><SelectItem value="direct">Directo</SelectItem><SelectItem value="area">Área</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Mínimo</label>
            <Input aria-label="Mínimo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.minTargets} onChange={event => patchTarget({ minTargets: Number(event.target.value) })} placeholder="Mínimo" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Máximo</label>
            <Input aria-label="Máximo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.maxTargets ?? ""} onChange={event => patchTarget({ maxTargets: event.target.value === "" ? null : Number(event.target.value) })} placeholder={effect.targeting.selection === "area" ? "Sin límite" : "Máximo"} />
          </div>
        </div>"""

new_block = """<div className={`grid gap-4 rounded-md border p-4 ${effect.targeting.selection === "area" ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Relación</label>
            <Select value={effect.targeting.relationship} onValueChange={relationship => patchTarget({ relationship: relationship as EffectTargeting["relationship"] })}><SelectTrigger><SelectValue>{{"self": "Portador", "ally": "Aliado", "enemy": "Enemigo", "any": "Cualquiera"}[effect.targeting.relationship] || effect.targeting.relationship}</SelectValue></SelectTrigger><SelectContent><SelectItem value="self">Portador</SelectItem><SelectItem value="ally">Aliado</SelectItem><SelectItem value="enemy">Enemigo</SelectItem><SelectItem value="any">Cualquiera</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Selección</label>
            <Select value={effect.targeting.selection} disabled={effect.targeting.relationship === "self"} onValueChange={selection => patchTarget({ selection: selection as EffectTargeting["selection"] })}><SelectTrigger><SelectValue>{{"direct": "Directo", "area": "Área"}[effect.targeting.selection] || effect.targeting.selection}</SelectValue></SelectTrigger><SelectContent><SelectItem value="direct">Directo</SelectItem><SelectItem value="area">Área</SelectItem></SelectContent></Select>
          </div>
          {effect.targeting.selection === "area" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Mínimo</label>
                <Input aria-label="Mínimo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.minTargets} onChange={event => patchTarget({ minTargets: Number(event.target.value) })} placeholder="Mínimo" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Máximo</label>
                <Input aria-label="Máximo de destinatarios" type="number" min={1} disabled={effect.targeting.relationship === "self"} value={effect.targeting.maxTargets ?? ""} onChange={event => patchTarget({ maxTargets: event.target.value === "" ? null : Number(event.target.value) })} placeholder={effect.targeting.selection === "area" ? "Sin límite" : "Máximo"} />
              </div>
            </>
          )}
        </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Could not find block")
