import { db } from './src/db/index.ts';
import { characterSheetFields } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { generateId } from './src/lib/utils.ts'; // wait, generateId might not be here. Let's just generate a 10 char string.

async function fix() {
  const id = Math.random().toString(36).substring(2, 12);
  
  await db.update(characterSheetFields)
    .set({ type: 'text' })
    .where(eq(characterSheetFields.id, 'HWNcgGwtC_'));
    
  await db.insert(characterSheetFields).values({
    id,
    coreKey: 'quirk_levels',
    name: 'Niveles de Quirk',
    type: 'quirk',
    category: 'Quirk & Poder',
    options: [],
    order: 20
  });
  
  console.log("Fields updated!");
  process.exit(0);
}
fix();
