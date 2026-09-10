import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Migrating roles...");
  try {
    await db.execute(sql`DELETE FROM "element_possessions" WHERE "character_id" IN (SELECT "id" FROM "characters" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role"::text = 'player'));`);
    await db.execute(sql`DELETE FROM "characters" WHERE "user_id" IN (SELECT "id" FROM "users" WHERE "role"::text = 'player');`);
    await db.execute(sql`DELETE FROM "users" WHERE "role"::text = 'player';`);

    // Alter the enum
    await db.execute(sql`ALTER TYPE role RENAME TO role_old;`);
    await db.execute(sql`CREATE TYPE role AS ENUM ('moderator', 'superadmin');`);
    await db.execute(sql`ALTER TABLE users ALTER COLUMN role DROP DEFAULT;`);
    await db.execute(sql`ALTER TABLE users ALTER COLUMN role TYPE role USING role::text::role;`);
    await db.execute(sql`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'moderator';`);
    await db.execute(sql`DROP TYPE role_old;`);
    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

run().then(() => process.exit(0));
