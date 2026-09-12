import { db } from "./src/db/index.js";
import { systemRules } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function run() {
    try {
        const res = await db.select().from(systemRules).where(eq(systemRules.key, 'system_stages'));
        console.log(JSON.stringify(res, null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

run();
