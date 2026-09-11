import { db } from './src/db/index.ts';
import { systemElements } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
    const traits = await db.select().from(systemElements).where(eq(systemElements.kind, 'trait'));
    console.log(JSON.stringify(traits, null, 2));
}

main().catch(console.error);
