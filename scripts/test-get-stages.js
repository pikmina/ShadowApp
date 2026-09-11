import { db } from './src/db/index.ts';
import { systemRules } from './src/db/schema.ts';
async function main() {
  const rules = await db.select().from(systemRules);
  const stages = rules.find(r => r.key === 'system_stages')?.value || [];
  console.log(JSON.stringify(stages, null, 2));
  process.exit(0);
}
main();
