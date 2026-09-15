import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';

const projectRoot = process.cwd();
const envFile = resolve(projectRoot, '.env.test.local');

if (!existsSync(envFile)) {
  console.error('Missing .env.test.local. Copy .env.test.example and add the test database URL.');
  process.exit(1);
}

config({ path: envFile, override: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const safetyConfirmation = process.env.TEST_DATABASE_CONFIRM;

if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is required in .env.test.local.');
  process.exit(1);
}

if (safetyConfirmation !== 'shadowapp-integration-test') {
  console.error('TEST_DATABASE_CONFIRM must be "shadowapp-integration-test".');
  process.exit(1);
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(testDatabaseUrl);
} catch {
  console.error('TEST_DATABASE_URL is not a valid URL.');
  process.exit(1);
}

if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
  console.error('TEST_DATABASE_URL must use the postgres or postgresql protocol.');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
};

const run = (label: string, args: string[]) => {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env: childEnv,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const schemaCheckPool = new Pool({
  connectionString: testDatabaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  const schemaCheck = await schemaCheckPool.query<{ characters_table: string | null }>(
    `SELECT to_regclass('public.characters')::text AS characters_table`,
  );

  if (!schemaCheck.rows[0]?.characters_table) {
    run('Creating the initial test schema...', [
      resolve(projectRoot, 'node_modules/drizzle-kit/bin.cjs'),
      'push',
      '--config=src/db/drizzle.config.ts',
    ]);
  } else {
    console.log('\nTest schema already exists; skipping the initial schema push.');
  }
} finally {
  await schemaCheckPool.end();
}

run('Preparing the test database...', [
  '--import',
  'tsx',
  resolve(projectRoot, 'src/db/migrate.ts'),
]);

run('Running PostgreSQL integration tests...', [
  resolve(projectRoot, 'node_modules/vitest/vitest.mjs'),
  'run',
  'src/db/__tests__',
]);
