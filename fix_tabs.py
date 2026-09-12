import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Etapas de Personaje', 'Etapas por Edad')

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

