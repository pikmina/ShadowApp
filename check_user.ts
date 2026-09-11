import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(users).where(eq(users.email, 'saxagenia@gmail.com'));
  console.log(result);
  process.exit(0);
}
main().catch(console.error);
