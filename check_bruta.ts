import { db } from './src/db/index.ts';
import { systemElements } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const results = await db.select().from(systemElements).where(eq(systemElements.name, 'Fuerza Bruta'));
  console.log('Results:', results);
}

main().catch(console.error);
