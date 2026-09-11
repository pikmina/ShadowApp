import re

with open('src/views/RulesAdmin.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<Select value={mechanicForm.defaultResolution || \'none\'} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>\n                <SelectTrigger className="bg-card">\n                  <SelectValue />\n                </SelectTrigger>',
    '<Select value={mechanicForm.defaultResolution || \'none\'} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>\n                <SelectTrigger className="bg-card">\n                  <SelectValue>{{"none": "Sin Tirada (Auto Impacto / Defecto)", "eva": "vs Evasión (EVA)", "cor": "vs Coraje (COR)", "rd": "vs Dificultad (RD)", "opposed": "Tirada Enfrentada"}[mechanicForm.defaultResolution as string] || "Sin Tirada (Auto Impacto / Defecto)"}</SelectValue>\n                </SelectTrigger>'
)

with open('src/views/RulesAdmin.tsx', 'w') as f:
    f.write(content)

