import { db } from './src/db/index.ts';
import { characters } from './src/db/schema.ts';

async function main() {
  const chars = await db.select().from(characters);
  console.log("Characters:", chars.map(c => c.id));
  process.exit(0);
}
main();
