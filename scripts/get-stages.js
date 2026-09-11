import { db } from '../src/db/index.ts';
import { systemRules } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const rules = await db.select().from(systemRules).where(eq(systemRules.key, 'system_stages'));
  if (rules.length > 0) {
    console.log(JSON.stringify(rules[0].value, null, 2));
  }
  process.exit(0);
}
main().catch(console.error);
