import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

# Replace the flex block up top
old_top = """        <div className="flex flex-wrap gap-2">
          <Select value={effect.type} onValueChange={value => replace(index, createEffect(value as MechanicalEffectType, effect))}><SelectTrigger className="w-64"><SelectValue>{labels[effect.type as MechanicalEffectType] || effect.type}</SelectValue></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={effect.timing} onValueChange={timing => patch({ timing })}><SelectTrigger className="w-44"><SelectValue>{{"passive": "Pasivo", "on_activation": "Al activar", "on_hit": "Al impactar", "on_critical": "En crítico", "after_effect": "Después del efecto", "turn_start": "Inicio del turno", "each_turn": "Cada turno", "on_fumble": "En pifia"}[effect.timing] || effect.timing}</SelectValue></SelectTrigger><SelectContent><SelectItem value="passive">Pasivo</SelectItem><SelectItem value="on_activation">Al activar</SelectItem><SelectItem value="on_hit">Al impactar</SelectItem><SelectItem value="on_critical">En crítico</SelectItem><SelectItem value="after_effect">Después del efecto</SelectItem><SelectItem value="turn_start">Inicio del turno</SelectItem><SelectItem value="each_turn">Cada turno</SelectItem><SelectItem value="on_fumble">En pifia</SelectItem></SelectContent></Select>
          <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => remove(index)}><Trash2 className="size-4" /></Button>
        </div>"""

new_top = """        <div className="flex flex-wrap gap-2 items-center">
          <Select value={effect.type} onValueChange={value => replace(index, createEffect(value as MechanicalEffectType, effect))}><SelectTrigger className="w-64"><SelectValue>{labels[effect.type as MechanicalEffectType] || effect.type}</SelectValue></SelectTrigger><SelectContent>{Object.entries(labels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Select value={effect.timing} onValueChange={timing => patch({ timing })}><SelectTrigger className="w-44"><SelectValue>{{"passive": "Pasivo", "on_activation": "Al activar", "on_hit": "Al impactar", "on_critical": "En crítico", "after_effect": "Después del efecto", "turn_start": "Inicio del turno", "each_turn": "Cada turno", "on_fumble": "En pifia"}[effect.timing] || effect.timing}</SelectValue></SelectTrigger><SelectContent><SelectItem value="passive">Pasivo</SelectItem><SelectItem value="on_activation">Al activar</SelectItem><SelectItem value="on_hit">Al impactar</SelectItem><SelectItem value="on_critical">En crítico</SelectItem><SelectItem value="after_effect">Después del efecto</SelectItem><SelectItem value="turn_start">Inicio del turno</SelectItem><SelectItem value="each_turn">Cada turno</SelectItem><SelectItem value="on_fumble">En pifia</SelectItem></SelectContent></Select>
          {((["each_turn", "turn_start"].includes(effect.timing) || ["status", "barrier"].includes(effect.type))) && (
            <div className="flex items-center gap-2 border rounded-md px-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Duración:</span>
              <Input type="number" min={1} className="w-20 h-9 border-0 focus-visible:ring-0 px-1 text-center" value={effect.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: effect.duration?.unit ?? "turn" } : undefined })} placeholder="1" />
              <Select value={effect.duration?.unit ?? "turn"} onValueChange={unit => patch({ duration: { value: effect.duration?.value ?? 1, unit } })}><SelectTrigger className="w-28 h-9 border-0 focus-visible:ring-0 shadow-none"><SelectValue>{{"turn": "Turnos", "round": "Rondas", "scene": "Escenas"}[effect.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select>
            </div>
          )}
          <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => remove(index)}><Trash2 className="size-4" /></Button>
        </div>"""

if old_top in content:
    content = content.replace(old_top, new_top)
    print("Replaced top block")

# Also remove the duplicate duration fields in ValueFields for barrier and status
barrier_old = """case "barrier": return <div className="grid gap-2 md:grid-cols-3">
      <Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad" />
      <Input type="number" min={1} value={effect.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: effect.duration?.unit ?? "turn" } : undefined })} placeholder="Duración" />
      <Select value={effect.duration?.unit ?? "turn"} disabled={!effect.duration} onValueChange={unit => patch({ duration: effect.duration ? { ...effect.duration, unit } : undefined })}><SelectTrigger><SelectValue>{{"turn": "Turnos", "round": "Rondas", "scene": "Escenas"}[effect.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select>
    </div>;"""
barrier_new = 'case "barrier": return <Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad de barrera" />;'

status_old = """case "status": return <div className="grid gap-2 md:grid-cols-3">
      <Input value={effect.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID del estado" />
      <Input type="number" min={1} value={effect.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: effect.duration?.unit ?? "turn" } : undefined })} placeholder="Duración" />
      <Select value={effect.duration?.unit ?? "turn"} disabled={!effect.duration} onValueChange={unit => patch({ duration: effect.duration ? { ...effect.duration, unit } : undefined })}><SelectTrigger><SelectValue>{{"turn": "Turnos", "round": "Rondas", "scene": "Escenas"}[effect.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select>
    </div>;"""
status_new = 'case "status": return <Input value={effect.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID del estado alterado" />;'

if barrier_old in content:
    content = content.replace(barrier_old, barrier_new)
if status_old in content:
    content = content.replace(status_old, status_new)

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)

