import { db } from './src/db/index.ts';
import { characters } from './src/db/schema.ts';

async function main() {
  try {
    const [created] = await db.insert(characters).values({
      userId: 1, // Assume admin user
      name: "Test",
      profileData: {}
    }).returning();
    console.log("Created:", created);
  } catch (e) {
    console.error("Error:", e);
  }
}
main();
