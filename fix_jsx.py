import re

with open('src/components/character/CharacterEditor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'onCheckedChange={() => toggleElement(\'traits\', trait.id, maxTraits)}\n                          className="mt-1"',
    'className="mt-1 pointer-events-none"'
)

content = content.replace(
    'onCheckedChange={() => toggleElement(\'weaknesses\', weakness.id, 0, true)}\n                          className="mt-1"',
    'className="mt-1 pointer-events-none"'
)

with open('src/components/character/CharacterEditor.tsx', 'w') as f:
    f.write(content)
