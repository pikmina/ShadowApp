import fs from 'fs';
let content = fs.readFileSync('src/db/schema.ts', 'utf8');
content = content.replace(
  /export const roleEnum = pgEnum\('role', \['moderator', 'superadmin'\]\);/,
  "export const roleEnum = pgEnum('role', ['player', 'moderator', 'superadmin']);"
);
content = content.replace(
  /role: roleEnum\('role'\)\.notNull\(\)/,
  "role: roleEnum('role').default('player').notNull()"
);
fs.writeFileSync('src/db/schema.ts', content, 'utf8');
