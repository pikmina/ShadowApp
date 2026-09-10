import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Migrating possessions...");
  try {
    await db.transaction(async (tx) => {
      // Merge duplicates by summing their quantity
      await tx.execute(sql`
        WITH duplicates AS (
          SELECT character_id, element_id, SUM(quantity) as total_qty, MIN(id) as keep_id
          FROM element_possessions
          GROUP BY character_id, element_id
          HAVING COUNT(*) > 1
        )
        UPDATE element_possessions ep
        SET quantity = d.total_qty
        FROM duplicates d
        WHERE ep.id = d.keep_id;
      `);

      // Delete the rest of the duplicates
      await tx.execute(sql`
        DELETE FROM element_possessions
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM element_possessions
          GROUP BY character_id, element_id
        );
      `);

      // Add the unique index. If it fails, the transaction will rollback and throw.
      await tx.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'element_possessions_character_id_element_id_unique'
          ) THEN
            CREATE UNIQUE INDEX "element_possessions_character_id_element_id_unique" ON "element_possessions" ("character_id", "element_id");
          END IF;
        END
        $$;
      `);
      
      console.log("Migration complete inside transaction.");
    });
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
