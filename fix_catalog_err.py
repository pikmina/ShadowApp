import re

with open('src/views/CatalogAdmin.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'alert("Error borrando");',
    'alert("Error borrando: " + (e as Error).message);'
)

with open('src/views/CatalogAdmin.tsx', 'w') as f:
    f.write(content)

