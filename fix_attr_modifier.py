import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

replacement = """case "attribute_modifier": return <div className="grid gap-2 md:grid-cols-2"><Select value={effect.attributeId} onValueChange={attributeId => patch({ attributeId })}><SelectTrigger><SelectValue>{{"FUE": "Fuerza (FUE)", "DES": "Destreza (DES)", "RES": "Resistencia (RES)", "INT": "Inteligencia (INT)", "VOL": "Voluntad (VOL)", "VEL": "Velocidad (VEL)"}[effect.attributeId as string] || effect.attributeId || "Seleccionar atributo..."}</SelectValue></SelectTrigger><SelectContent><SelectItem value="FUE">Fuerza (FUE)</SelectItem><SelectItem value="DES">Destreza (DES)</SelectItem><SelectItem value="RES">Resistencia (RES)</SelectItem><SelectItem value="INT">Inteligencia (INT)</SelectItem><SelectItem value="VOL">Voluntad (VOL)</SelectItem><SelectItem value="VEL">Velocidad (VEL)</SelectItem></SelectContent></Select><Input type="number" value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Modificador" /></div>;"""

content = content.replace(
    'case "attribute_modifier": return <div className="grid gap-2 md:grid-cols-2"><Input value={effect.attributeId} onChange={e => patch({ attributeId: e.target.value })} placeholder="ID del atributo" /><Input type="number" value={effect.amount} onChange={e => patch({ amount: Number(e.target.value) })} placeholder="Modificador" /></div>;',
    replacement
)

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)
