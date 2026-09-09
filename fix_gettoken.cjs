const fs = require('fs');
const glob = require('glob');

const files = [
  'src/views/RulesAdmin.tsx',
  'src/views/CatalogAdmin.tsx',
  'src/views/TechniquesAdmin.tsx',
  'src/views/SheetBuilderAdmin.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/  useEffect\(\(\) => \{\n    getToken\(\)\.then\(setToken\);\n  \}, \[getToken\]\);\n/g, '');
  
  fs.writeFileSync(file, content);
}
