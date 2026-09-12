import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const allUsers = await db.select().from(users);
  console.log('Users:', allUsers);
}

main().catch(console.error);
