import re

for filename in ['src/views/CatalogAdmin.tsx', 'src/views/TechniquesAdmin.tsx']:
    with open(filename, 'r') as f:
        content = f.read()

    content = content.replace(
        '<TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Requisitos</TabsTrigger>\n                  <TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Efectos Mecánicos</TabsTrigger>',
        '<TabsTrigger value="effects" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">2. Efectos Mecánicos</TabsTrigger>\n                  <TabsTrigger value="reqs" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">3. Requisitos</TabsTrigger>'
    )

    with open(filename, 'w') as f:
        f.write(content)

