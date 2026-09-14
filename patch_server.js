const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/res\.status\(500\)\.json\(\{ error: "Failed" \}\);/g, 'console.error(error); res.status(500).json({ error: error.message });');
fs.writeFileSync('server.ts', code);
