import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const projectRoot = process.cwd();
const envFile = resolve(projectRoot, '.env.test.local');

if (!existsSync(envFile)) {
  console.error('Missing .env.test.local. Copy .env.test.example and add the development database URL.');
  process.exit(1);
}

config({ path: envFile, override: true });

if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is required in .env.test.local.');
  process.exit(1);
}

if (process.env.TEST_DATABASE_CONFIRM !== 'shadowapp-integration-test') {
  console.error('TEST_DATABASE_CONFIRM must be "shadowapp-integration-test".');
  process.exit(1);
}

const childEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  NODE_ENV: 'development',
};

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
  process.exit(migration.status ?? 1);
}

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
