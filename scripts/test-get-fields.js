import { db } from './src/db/index.ts';
import { characterSheetFields } from './src/db/schema.ts';
async function main() {
  const fields = await db.select().from(characterSheetFields);
  console.log(JSON.stringify(fields, null, 2));
  process.exit(0);
}
main();
