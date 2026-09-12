import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

# For barrier and status we need to allow editing the duration.
# In the ValueFields function, let's update the barrier and status cases to include duration inputs.

barrier_old = 'case "barrier": return <Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad de barrera" />;'
barrier_new = '''case "barrier": return <div className="grid gap-2 md:grid-cols-3">
      <Input type="number" min={1} value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Cantidad" />
      <Input type="number" min={1} value={effect.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: effect.duration?.unit ?? "turn" } : undefined })} placeholder="Duración" />
      <Select value={effect.duration?.unit ?? "turn"} disabled={!effect.duration} onValueChange={unit => patch({ duration: effect.duration ? { ...effect.duration, unit } : undefined })}><SelectTrigger><SelectValue>{{"turn": "Turnos", "round": "Rondas", "scene": "Escenas"}[effect.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select>
    </div>;'''

status_old = 'case "status": return <Input value={effect.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID del estado alterado" />;'
status_new = '''case "status": return <div className="grid gap-2 md:grid-cols-3">
      <Input value={effect.statusElementId} onChange={e => patch({ statusElementId: e.target.value })} placeholder="ID del estado" />
      <Input type="number" min={1} value={effect.duration?.value ?? ""} onChange={e => patch({ duration: e.target.value ? { value: Number(e.target.value), unit: effect.duration?.unit ?? "turn" } : undefined })} placeholder="Duración" />
      <Select value={effect.duration?.unit ?? "turn"} disabled={!effect.duration} onValueChange={unit => patch({ duration: effect.duration ? { ...effect.duration, unit } : undefined })}><SelectTrigger><SelectValue>{{"turn": "Turnos", "round": "Rondas", "scene": "Escenas"}[effect.duration?.unit ?? "turn"]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="turn">Turnos</SelectItem><SelectItem value="round">Rondas</SelectItem><SelectItem value="scene">Escenas</SelectItem></SelectContent></Select>
    </div>;'''

if barrier_old in content:
    content = content.replace(barrier_old, barrier_new)
if status_old in content:
    content = content.replace(status_old, status_new)

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)
