import { db } from './src/db/index.ts';
import { characters } from './src/db/schema.ts';
async function main() {
  const chars = await db.select().from(characters).limit(1);
  console.log(JSON.stringify(chars, null, 2));
  process.exit(0);
}
main();
