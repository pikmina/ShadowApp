import { db } from './src/db/index.ts';
import { systemElements } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { deleteElement } from './src/db/elements.ts';

async function main() {
  try {
     console.log("Creating dummy element...");
     const dummyId = "dummy_123";
     await db.insert(systemElements).values({
        id: dummyId,
        kind: 'trait',
        name: 'Dummy',
        description: 'test',
        status: 'draft',
        effects: [],
        requirements: { operator: 'all', requirements: [] },
     });
     console.log("Dummy created. Attempting to delete using deleteElement function...");
     await deleteElement(dummyId);
     console.log("deleteElement function succeeded. Re-creating dummy for API test...");
     
     await db.insert(systemElements).values({
        id: dummyId,
        kind: 'trait',
        name: 'Dummy',
        description: 'test',
        status: 'draft',
        effects: [],
        requirements: { operator: 'all', requirements: [] },
     });
     console.log("Dummy created. Test it through the actual running server? Not easily without auth.");
  } catch (e: any) {
     console.error('Error:', e);
  }
}
main();
