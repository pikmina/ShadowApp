const fs = require('fs');
let code = `import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

let config;

if (process.env.DATABASE_URL) {
  config = defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
      url: process.env.DATABASE_URL,
    },
    verbose: true,
  });
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;

  config = defineConfig({
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
      host: sqlHost || "",
      user: user || "",
      password: password || "",
      database: sqlDbName || "",
      ssl: false,
    },
    verbose: true,
  });
}

export default config;
`;
fs.writeFileSync('src/db/drizzle.config.ts', code);
