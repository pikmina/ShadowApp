// Installed only in the cPanel application root. No npm start or migrations.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const release = fs.realpathSync(path.join(__dirname, '.namecheap-current'));
const releases = fs.realpathSync(path.join(os.homedir(), 'shadowapp-releases'));
if (!release.startsWith(releases + path.sep)) throw new Error('Invalid Namecheap release path');
process.chdir(release);
process.env.NODE_ENV = 'production';
require(path.join(release, 'dist/server.cjs'));
