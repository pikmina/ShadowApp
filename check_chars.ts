import { db } from './src/db/index.js';
import { characters } from './src/db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(characters).orderBy(desc(characters.createdAt)).limit(5);
  console.log(JSON.stringify(result.map(c => ({ id: c.id, name: c.name, userId: c.userId, group: c.profileData?.group || c.profileData?.faction_group, createdAt: c.createdAt })), null, 2));
  process.exit(0);
}
main().catch(console.error);
