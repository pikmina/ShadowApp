const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../..');
const app = path.join(os.homedir(), 'shadowapp');
const releases = path.join(os.homedir(), 'shadowapp-releases');
const policy = require('./policy.json');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
function prepare(source) {
  source = source.replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  if (hash !== policy.serverHash) throw new Error('Server startup changed. Review the Namecheap startup adaptation before deploying.');
  const begin = source.indexOf('  await seedCoreRules();');
  const end = source.indexOf('  app.get("/api/rules"', begin);
  if (begin < 0 || end < 0 || !source.includes('  await seedCoreProfileFields();')) throw new Error('Startup structure not recognized');
  return source.slice(0, begin) + '  // Namecheap: no automatic database initialization.\n\n' + source.slice(end).replace('  await seedCoreProfileFields();', '');
}
module.exports = { prepare };
if (require.main === module) {
  if (process.platform !== 'linux') throw new Error('Run deployment only on cPanel Linux');
  if (git('status', '--porcelain')) throw new Error('Repository has uncommitted changes');
  const changed = git('diff', '--name-only', policy.baseline, 'HEAD', '--', 'src/db/schema.ts', 'src/db/migrate.ts', 'src/db/migrations');
  if (changed) throw new Error('Database structure changed. Review schema compatibility before deployment. No migration was executed.');
  const names = git('ls-files').split('\n');
  if (names.some(n => /(^|\/)\.env($|\.)/.test(n) && !n.endsWith('.example'))) throw new Error('Tracked environment files must not be deployed');
  const patched = prepare(fs.readFileSync(path.join(repo, 'server.ts'), 'utf8'));
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  if (pkg.scripts.build !== policy.build || ['preinstall', 'install', 'postinstall', 'prepare', 'prebuild', 'postbuild'].some(k => pkg.scripts[k])) throw new Error('Build lifecycle changed; review before deploying');
  if (!fs.existsSync(app)) throw new Error('Existing shadowapp application folder not found');
  fs.mkdirSync(releases, { recursive: true });
  const lock = path.join(releases, '.deploy-lock');
  fs.mkdirSync(lock); // Refuse concurrent publication.
  try {
    const release = fs.mkdtempSync(path.join(releases, 'release-'));
    const archive = execFileSync('git', ['archive', 'HEAD'], { cwd: repo, maxBuffer: 100 * 1024 * 1024 });
    execFileSync('tar', ['-x', '-C', release], { input: archive });
    fs.writeFileSync(path.join(release, 'server.ts'), patched);
    pkg.scripts.start = 'node dist/server.cjs';
    fs.writeFileSync(path.join(release, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    const env = { ...process.env, NODE_ENV: 'production' };
    for (const key of Object.keys(env)) if (/^(DATABASE_URL|SQL_|PG|FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS)/.test(key)) delete env[key];
    execFileSync('npm', ['ci', '--include=dev', '--prefix', release], { cwd: release, env, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build', '--prefix', release], { cwd: release, env, stdio: 'inherit' });
    for (const file of ['dist/index.html', 'dist/server.cjs']) if (!fs.existsSync(path.join(release, file))) throw new Error('Build artifact missing: ' + file);
    fs.writeFileSync(path.join(release, 'NAMECHEAP_COMMIT'), git('rev-parse', 'HEAD') + '\n');
    const current = path.join(app, '.namecheap-current');
    const previous = path.join(app, '.namecheap-previous');
    if (fs.existsSync(current)) {
      const tempPrevious = previous + '.next';
      fs.symlinkSync(fs.realpathSync(current), tempPrevious);
      fs.renameSync(tempPrevious, previous);
    }
    const launcher = path.join(app, 'namecheap.cjs');
    fs.copyFileSync(path.join(__dirname, 'start.cjs'), launcher + '.next');
    fs.renameSync(launcher + '.next', launcher);
    fs.symlinkSync(release, current + '.next');
    fs.renameSync(current + '.next', current);
    fs.mkdirSync(path.join(app, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(app, 'tmp/restart.txt'), new Date().toISOString());
    console.log('Release prepared: ' + release);
    console.log('First setup: set cPanel startup file to namecheap.cjs, save and restart. Check /api/health after every deployment.');
  } finally {
    fs.rmdirSync(lock); // Only the empty lock directory created above.
  }
}
