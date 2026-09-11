import re

with open('src/lib/characterValidation.ts', 'r') as f:
    content = f.read()

# Add extraRed initialization
content = content.replace(
    'let extraEstamina = 0;',
    'let extraEstamina = 0;\n  let extraRed = 0;'
)

# Add logic for RED in derived modifiers
content = content.replace(
    "if (attrId === 'EST' || attrId === 'estamina') extraEstamina += amount;",
    "if (attrId === 'EST' || attrId === 'estamina') extraEstamina += amount;\n        if (attrId === 'RED' || attrId === 'reduccion_dano' || attrId === 'damage_reduction' || attrId === 'reduccion') extraRed += amount;"
)

# Calculate reduccionDano and return it
content = content.replace(
    "const iniciativa = calculateModifier(Math.floor((int + vel) / 2)) + extraIni;",
    "const iniciativa = calculateModifier(Math.floor((int + vel) / 2)) + extraIni;\n  const reduccionDano = extraRed;"
)

content = content.replace(
    "dañoBase: dbStr\n  };",
    "dañoBase: dbStr,\n    reduccionDano\n  };"
)

with open('src/lib/characterValidation.ts', 'w') as f:
    f.write(content)
