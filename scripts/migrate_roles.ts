import { db } from '../src/db/index';
import { sql, eq } from 'drizzle-orm';
import { users, characters } from '../src/db/schema';

async function run() {
  console.log("Starting non-destructive role migration...");
  const targetAdminEmail = process.env.ADMIN_EMAIL || "saxagenia@gmail.com";
  try {
    await db.transaction(async (tx) => {
      const allPlayers = await tx.select().from(users).where(sql`role::text = 'player'`);
      console.log(`Found ${allPlayers.length} players to migrate.`);

      let targetAdmin = await tx.select().from(users).where(eq(users.email, targetAdminEmail)).limit(1).then(r => r[0]);

      if (!targetAdmin) {
        targetAdmin = await tx.select().from(users).where(sql`role::text = 'superadmin'`).limit(1).then(r => r[0]);
      }

      if (!targetAdmin) {
        throw new Error("Cannot migrate characters: No administrative account found to inherit them.");
      }

      if (allPlayers.length > 0) {
        const playerIds = allPlayers.map(p => p.id);
        
        await tx.execute(
          sql`UPDATE "characters" SET "user_id" = ${targetAdmin.id} WHERE "user_id" = ANY(ARRAY[${sql.join(playerIds, sql`, `)}])`
        );
        
        await tx.execute(
          sql`DELETE FROM "users" WHERE "id" = ANY(ARRAY[${sql.join(playerIds, sql`, `)}])`
        );
      }

      await tx.execute(sql`ALTER TYPE role RENAME TO role_old;`);
      await tx.execute(sql`CREATE TYPE role AS ENUM ('moderator', 'superadmin');`);
      await tx.execute(sql`ALTER TABLE users ALTER COLUMN role DROP DEFAULT;`);
      await tx.execute(sql`ALTER TABLE users ALTER COLUMN role TYPE role USING role::text::role;`);
      await tx.execute(sql`DROP TYPE role_old;`);

      console.log("Migration complete in transaction.");
    });
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}
run().then(() => process.exit(0));
