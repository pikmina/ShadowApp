const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/,\s*\{\}\s*\}/g, ' }');
  content = content.replace(/,\s*\{\}\s*\)/g, ')');
  fs.writeFileSync(file, content);
}
