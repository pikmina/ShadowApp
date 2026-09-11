import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

# Replace statId Input with Select
content = content.replace(
    'case "derived_stat_modifier": return <div className="grid gap-2 md:grid-cols-2"><Input value={effect.statId} onChange={e => patch({ statId: e.target.value })} placeholder="ID de estadística" />',
    'case "derived_stat_modifier": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.statId} onValueChange={statId => patch({ statId })}><SelectTrigger><SelectValue>{{"INI": "Iniciativa", "EVA": "Evasión", "COR": "Coraje", "SAL": "Salud Max", "EST": "Estamina Max", "RED": "Reducción de Daño"}[effect.statId as string] || effect.statId || "Seleccionar..."}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INI">Iniciativa</SelectItem><SelectItem value="EVA">Evasión</SelectItem><SelectItem value="COR">Coraje</SelectItem><SelectItem value="SAL">Salud Max</SelectItem><SelectItem value="EST">Estamina Max</SelectItem><SelectItem value="RED">Reducción de Daño (RED)</SelectItem></SelectContent></Select>'
)

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)

