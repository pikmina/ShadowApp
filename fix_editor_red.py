import re

with open('src/components/character/CharacterEditor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'iniciativa: derived.iniciativa,\n        daño_base: derived.dañoBase,',
    'iniciativa: derived.iniciativa,\n        daño_base: derived.dañoBase,\n        reduccion_dano: derived.reduccionDano,'
)

content = content.replace(
    '<div className="border border-border bg-muted/20 p-3 rounded-md text-center">\n                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Mod FUE</span>',
    '<div className="border border-border bg-muted/20 p-3 rounded-md text-center">\n                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">RED</span>\n                      <strong className="text-xl font-mono text-foreground">{derived.reduccionDano}</strong>\n                    </div>\n                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">\n                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Mod FUE</span>'
)

with open('src/components/character/CharacterEditor.tsx', 'w') as f:
    f.write(content)
