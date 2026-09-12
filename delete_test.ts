import { db } from './src/db/index.ts';
import { systemElements } from './src/db/schema.ts';
import { deleteElement } from './src/db/elements.ts';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const results = await db.select().from(systemElements).where(eq(systemElements.name, 'Fuerza Bruta'));
    if (results.length === 0) {
      console.log('Trait not found');
      return;
    }
    const id = results[0].id;
    console.log(`Found trait with ID: ${id}. Attempting to delete...`);
    await deleteElement(id);
    console.log('Deleted successfully.');
  } catch (e: any) {
    console.error('Error during deletion:', e);
  }
}

main().catch(console.error);
