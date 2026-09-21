import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

const projectRoot = process.cwd();
const envLocalFile = resolve(projectRoot, '.env.local');

if (existsSync(envLocalFile)) {
  config({ path: envLocalFile, override: true });
} else {
  // Fall back to default .env if present
  config();
}

const databaseUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;

if (!databaseUrl && !sqlHost) {
  console.error('Missing database configuration. Define DATABASE_URL in .env.local or set SQL_* variables.');
  process.exit(1);
}

// Safely identify the target database without printing credentials
let testPool;
if (databaseUrl) {
  testPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
} else {
  testPool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 10000,
  });
}

try {
  const res = await testPool.query(
    'SELECT current_database() as db_name, current_user as db_user'
  );
  console.log(`[dev:local] Target development database: "${res.rows[0]?.db_name}" (user: "${res.rows[0]?.db_user}")`);
} catch (err: any) {
  console.error('[dev:local] Failed to connect to target development database:', err?.message || err);
  process.exit(1);
} finally {
  await testPool.end();
}

const childEnv = {
  ...process.env,
  NODE_ENV: 'development',
};

console.log('\n[dev:local] Running database migration check...');
const migration = spawnSync(process.execPath, [
  '--import',
  'tsx',
  resolve(projectRoot, 'src/db/migrate.ts'),
], {
  cwd: projectRoot,
  env: childEnv,
  stdio: 'inherit',
});

if (migration.error) {
  console.error(migration.error.message);
  process.exit(1);
}

if (migration.status !== 0) {
  console.error(`[dev:local] Migration failed with exit code ${migration.status}`);
  process.exit(migration.status ?? 1);
}

console.log('\n[dev:local] Starting development server...');
const server = spawnSync(process.execPath, [
  '--import',
  'tsx',
  resolve(projectRoot, 'server.ts'),
], {
  cwd: projectRoot,
  env: childEnv,
  stdio: 'inherit',
});

if (server.error) {
  console.error(server.error.message);
  process.exit(1);
}

process.exit(server.status ?? 0);

