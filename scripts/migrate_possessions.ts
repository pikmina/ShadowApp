import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Migrating possessions...");
  try {
    // Merge duplicates by summing their quantity
    await db.execute(sql`
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
    await db.execute(sql`
      DELETE FROM element_possessions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM element_possessions
        GROUP BY character_id, element_id
      );
    `);

    // We rely on Drizzle's push to add the unique index, but just in case we can add it:
    await db.execute(sql`
      ALTER TABLE element_possessions ADD CONSTRAINT "element_possessions_character_id_element_id_unique" UNIQUE (character_id, element_id);
    `).catch(() => console.log("Constraint already exists or couldn't be added directly."));

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

run().then(() => process.exit(0));
