import re

with open('src/views/SystemManual.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("r.key === 'stages'", "r.key === 'system_stages'")

with open('src/views/SystemManual.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

