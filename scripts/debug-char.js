import { db } from '../src/db/index.ts';
import { characters } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const chars = await db.select().from(characters).where(eq(characters.id, 29));
  if (chars.length > 0) {
    console.log(JSON.stringify(chars[0].profileData, null, 2));
  }
  process.exit(0);
}
main().catch(console.error);
