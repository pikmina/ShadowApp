import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_statement = "import SystemManual from \"./views/SystemManual\";\n"
if "import SystemManual" not in content:
    content = content.replace("import ComponentShowcase from \"./views/ComponentShowcase\";", "import ComponentShowcase from \"./views/ComponentShowcase\";\n" + import_statement)

route_statement = "      <Route path=\"/manual\" element={<SystemManual />} />\n"
if "path=\"/manual\"" not in content:
    content = content.replace("<Route path=\"/sheet/:id\" element={<PublicSheet />} />", "<Route path=\"/sheet/:id\" element={<PublicSheet />} />\n" + route_statement)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

