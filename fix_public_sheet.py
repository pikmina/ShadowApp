import re

with open('src/views/PublicSheet.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "['Reducción de daño', readValue(profile, ['dr', 'damageReduction', 'damage_reduction'])],",
    "['Reducción de daño', readValue(profile, ['reduccionDano', 'reduccion_dano', 'dr', 'damageReduction', 'damage_reduction'])],"
)

with open('src/views/PublicSheet.tsx', 'w') as f:
    f.write(content)

