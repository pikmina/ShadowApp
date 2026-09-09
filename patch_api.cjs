const fs = require('fs');

let content = fs.readFileSync('src/lib/api.ts', 'utf8');

content = content.replace(
  'throw new Error(`API error: ${res.statusText}`);',
  `const errorText = await res.text();\n    throw new Error(\`API error: \${res.status} \${res.statusText} - \${errorText}\`);`
);

fs.writeFileSync('src/lib/api.ts', content);
