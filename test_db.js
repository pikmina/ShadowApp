import { db } from './src/db/index.ts';
import { characters, users, elementPossessions } from './src/db/schema.ts';
import { deleteCharacter } from './src/db/characters.ts';

async function main() {
  try {
    const chars = await db.select().from(characters);
    console.log("Characters:", chars.map(c => c.id));
    
    if (chars.length > 0) {
      const id = chars[0].id;
      console.log("Trying to delete character", id);
      await deleteCharacter(id);
      console.log("Deleted successfully!");
    } else {
      console.log("No characters to delete.");
    }
  } catch(e) {
    console.error("Failed:", e);
  } finally {
    process.exit(0);
  }
}

main();
