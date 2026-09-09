const fs = require('fs');

// Fix SettingsAdmin.tsx
let settings = fs.readFileSync('src/views/SettingsAdmin.tsx', 'utf8');
if (!settings.includes('import { apiFetch')) {
  settings = settings.replace(
    'import { useAuth } from "../contexts/AuthContext";',
    'import { useAuth } from "../contexts/AuthContext";\nimport { apiFetch } from "../lib/api";'
  );
  fs.writeFileSync('src/views/SettingsAdmin.tsx', settings);
}

// Fix SheetBuilderAdmin.tsx
let sheet = fs.readFileSync('src/views/SheetBuilderAdmin.tsx', 'utf8');
sheet = sheet.replace(
  /  const groupedFields = fields\?\.reduce\(\(acc: any, field: any\) => \{\n    if \(!acc\[field\.category\]\) acc\[field\.category\] = \[\];\n    acc\[field\.category\]\.push\(field\);\n    return acc;\n  \}\);/g,
  `  const groupedFields = (fields || []).reduce((acc: any, field: any) => {\n    if (!acc[field.category]) acc[field.category] = [];\n    acc[field.category].push(field);\n    return acc;\n  }, {});`
);
fs.writeFileSync('src/views/SheetBuilderAdmin.tsx', sheet);

// Fix CharacterEditor.tsx
let charEd = fs.readFileSync('src/components/character/CharacterEditor.tsx', 'utf8');
charEd = charEd.replace(
  /  const groupedFields = processedFields\.reduce\(\(acc: any, field: any\) => \{\n    if \(!acc\[field\.category\]\) acc\[field\.category\] = \[\];\n    acc\[field\.category\]\.push\(field\);\n    return acc;\n  \}\);/g,
  `  const groupedFields = processedFields.reduce((acc: any, field: any) => {\n    if (!acc[field.category]) acc[field.category] = [];\n    acc[field.category].push(field);\n    return acc;\n  }, {});`
);
fs.writeFileSync('src/components/character/CharacterEditor.tsx', charEd);

