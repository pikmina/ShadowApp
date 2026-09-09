const fs = require('fs');

const files = [
  'src/views/RulesAdmin.tsx',
  'src/views/CatalogAdmin.tsx',
  'src/views/TechniquesAdmin.tsx',
  'src/views/SheetBuilderAdmin.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export default function \w+\(\) {\n/g, (match) => {
    return match + `  const { user } = useAuth();\n`;
  });
  fs.writeFileSync(file, content);
}
