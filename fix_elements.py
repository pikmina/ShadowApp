import re

with open('src/db/elements.ts', 'r') as f:
    content = f.read()

content = content.replace(', { cause: error }', '')

with open('src/db/elements.ts', 'w') as f:
    f.write(content)
