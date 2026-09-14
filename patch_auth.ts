import fs from 'fs';
let content = fs.readFileSync('src/middleware/auth.ts', 'utf8');
content = content.replace(
  /export const requireRole = \(allowedRoles: \('superadmin' \| 'moderator'\)\[\]\) => \{/,
  "export const requireRole = (allowedRoles: string[]) => {"
);
fs.writeFileSync('src/middleware/auth.ts', content, 'utf8');
