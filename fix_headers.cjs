const fs = require('fs');
let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

content = content.replace(
  /await apiFetch\('\/api\/rules', \{\n\s*method: 'POST',\n\s*body:/g,
  "await apiFetch('/api/rules', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body:"
);

fs.writeFileSync('src/views/RulesAdmin.tsx', content);
