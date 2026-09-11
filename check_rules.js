import { db } from './src/db/index.ts';
import { systemRules } from './src/db/schema.ts';
async function main() {
  const rules = await db.select().from(systemRules);
  console.log(JSON.stringify(rules, null, 2));
  process.exit(0);
}
main();
