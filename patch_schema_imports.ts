import fs from 'fs';
let content = fs.readFileSync('src/db/schema.ts', 'utf8');

content = content.replace(
  /import \{ integer, pgTable, serial, text, timestamp, jsonb, boolean, pgEnum , unique \} from 'drizzle-orm\/pg-core';/,
  "import { integer, pgTable, serial, text, timestamp, jsonb, boolean, pgEnum, unique, varchar } from 'drizzle-orm/pg-core';"
);

fs.writeFileSync('src/db/schema.ts', content, 'utf8');
