const fs = require('fs');

let content = fs.readFileSync('src/db/users.ts', 'utf8');

content = content.replace(
  'const validEmail = email && email.trim() ? email.trim() : null;',
  `const validEmail = email && email.trim() ? email.trim() : null;\n    if (validEmail === "saxagenia@gmail.com") {\n      role = "superadmin";\n    }`
);

// We need to also make sure onConflictDoUpdate updates the role if they are saxagenia@gmail.com
content = content.replace(
  /set: \{\s*email: validEmail,\s*\}/,
  'set: { email: validEmail, role: validEmail === "saxagenia@gmail.com" ? "superadmin" : undefined }'
);

fs.writeFileSync('src/db/users.ts', content);
