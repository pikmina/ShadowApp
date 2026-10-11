const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const serverPath = path.join(rootDir, 'server.ts');
const policyPath = path.join(rootDir, 'deploy/namecheap/policy.json');

if (!fs.existsSync(serverPath)) {
  console.error('Error: server.ts not found');
  process.exit(1);
}

if (!fs.existsSync(policyPath)) {
  console.error('Error: deploy/namecheap/policy.json not found');
  process.exit(1);
}

const source = fs.readFileSync(serverPath, 'utf8').replace(/\r\n/g, '\n');
const currentHash = crypto.createHash('sha256').update(source).digest('hex');

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

const shouldUpdate = process.argv.includes('--update') || process.argv.includes('--fix');

if (policy.serverHash !== currentHash) {
  if (shouldUpdate) {
    policy.serverHash = currentHash;
    fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated deploy/namecheap/policy.json serverHash to ${currentHash}`);
  } else {
    console.error('❌ Mismatch in Namecheap deploy policy serverHash!');
    console.error(`  Expected: ${policy.serverHash}`);
    console.error(`  Actual:   ${currentHash}`);
    console.error('\nIf you intentionally modified server.ts, update policy.json by running:');
    console.error('  npm run update:policy\n');
    process.exit(1);
  }
} else {
  console.log('✓ Namecheap deploy policy serverHash matches server.ts');
}
