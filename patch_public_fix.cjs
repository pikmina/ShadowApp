const fs = require('fs');
let code = fs.readFileSync('src/views/PublicSheet.tsx', 'utf8');

// Fix the template literal escape issue that broke the build
code = code.replace(
  'const res = await fetch(\`\\/api\\/public\\/character\\/\\${id}\`);',
  'const res = await fetch(`/api/public/character/${id}`);'
);
// In case the previous replace didn't match exactly because of bash escaping
code = code.replace(
  /fetch\(\\\`\/\api\/public\/character\/\\\$\{id\}\\\`\)/g,
  'fetch(`/api/public/character/${id}`)'
);
// A simpler replace if bash ate the backslashes
code = code.replace(
  /fetch\(\\\/api\\\/public\\\/character\\\/\$\{id\}\)/g,
  'fetch(`/api/public/character/${id}`)'
);

fs.writeFileSync('src/views/PublicSheet.tsx', code);
