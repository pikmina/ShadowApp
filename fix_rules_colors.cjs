const fs = require('fs');
let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

content = content.replace(/text-indigo-600 bg-indigo-50/g, 'text-indigo-300 bg-indigo-500/20');
fs.writeFileSync('src/views/RulesAdmin.tsx', content);
