import re

with open('src/components/mechanics/MechanicalEffectDefinitionEditor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the garbage at the end of the file
bad_string = '  }}nChange={e => patch({ options: e.target.value.split(",").map(item => item.trim()).filter(Boolean) })} />;\n  }}'
if bad_string in content:
    content = content.replace(bad_string, '  }\n}\n')

with open('src/components/mechanics/MechanicalEffectDefinitionEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
