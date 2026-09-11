import re

with open('src/lib/characterValidation.ts', 'r') as f:
    content = f.read()

content = content.replace('  let extraRed = 0;\n  let extraRed = 0;', '  let extraRed = 0;')
content = content.replace("        if (attrId === 'RED' || attrId === 'reduccion_dano' || attrId === 'damage_reduction' || attrId === 'reduccion') extraRed += amount;\n        if (attrId === 'RED' || attrId === 'reduccion_dano' || attrId === 'damage_reduction' || attrId === 'reduccion') extraRed += amount;", "        if (attrId === 'RED' || attrId === 'reduccion_dano' || attrId === 'damage_reduction' || attrId === 'reduccion') extraRed += amount;")
content = content.replace('  const reduccionDano = extraRed;\n  const reduccionDano = extraRed;', '  const reduccionDano = extraRed;')

with open('src/lib/characterValidation.ts', 'w') as f:
    f.write(content)
