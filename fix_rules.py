import re

with open('src/views/RulesAdmin.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<Select value={mechanicForm.logicalType} onValueChange={v => setMechanicForm({...mechanicForm, logicalType: v})}>\n                  <SelectTrigger>\n                    <SelectValue />\n                  </SelectTrigger>',
    '<Select value={mechanicForm.logicalType} onValueChange={v => setMechanicForm({...mechanicForm, logicalType: v})}>\n                  <SelectTrigger>\n                    <SelectValue>{{"offensive": "Ofensiva (Ataque / Daño)", "defensive": "Defensiva (Barreras / Evasión)", "support": "Soporte (Curación / Bonos)", "control": "Control (Alteraciones / CC)", "limitation": "Limitación (Debilidades / Costes)", "utility": "Utilidad (Movimiento / Entorno)"}[mechanicForm.logicalType as string] || mechanicForm.logicalType}</SelectValue>\n                  </SelectTrigger>'
)

content = content.replace(
    '<Select value={mechanicForm.defaultResolution} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>\n                    <SelectTrigger>\n                      <SelectValue />\n                    </SelectTrigger>',
    '<Select value={mechanicForm.defaultResolution} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>\n                    <SelectTrigger>\n                      <SelectValue>{{"none": "Sin tirada", "attack_vs_defense": "Ataque vs Defensa", "skill_check": "Prueba de Habilidad", "opposed_check": "Tirada Enfrentada"}[mechanicForm.defaultResolution as string] || mechanicForm.defaultResolution}</SelectValue>\n                    </SelectTrigger>'
)

with open('src/views/RulesAdmin.tsx', 'w') as f:
    f.write(content)

