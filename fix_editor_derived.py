import re

with open('src/components/character/CharacterEditor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const derived = calculateDerivedStats(formData, stagesList);',
    'const derived = calculateDerivedStats(formData, stagesList, elements);'
)

with open('src/components/character/CharacterEditor.tsx', 'w') as f:
    f.write(content)
