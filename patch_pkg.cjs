const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts["db:push"] = "drizzle-kit push --config=src/db/drizzle.config.ts";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
