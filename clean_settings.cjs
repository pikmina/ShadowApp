const fs = require('fs');
let content = fs.readFileSync('src/views/SettingsAdmin.tsx', 'utf8');

// The headers object is inside a fetch call. Wait, apiFetch merges headers.
// But we want to remove the token dependency since it's not defined here.
content = content.replace(/          Authorization: `Bearer \$\{token\}`,\n/g, '');

fs.writeFileSync('src/views/SettingsAdmin.tsx', content);
