import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  const result = await db.update(users).set({ role: 'superadmin' }).where(eq(users.email, 'saxagenia@gmail.com')).returning();
  console.log('Elevated user:', result);
  process.exit(0);
}
run();
