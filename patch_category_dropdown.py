import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

# Replace the category dropdown filtering
old_dropdown = '<SelectContent>{mechanics.filter(item => item.rules.some(rule => rule.ruleType === "effect")).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>'
new_dropdown = '<SelectContent>{mechanics.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>'

if old_dropdown in content:
    content = content.replace(old_dropdown, new_dropdown)
    print("Patched category dropdown.")
else:
    print("Dropdown pattern not found.")

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)

