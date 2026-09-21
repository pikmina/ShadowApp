import { spawnSync } from 'node:child_process';
for (const args of [['--import','tsx','src/db/migrate.ts'], ['dist/server.cjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
