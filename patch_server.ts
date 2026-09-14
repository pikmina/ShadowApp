import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  /res\.status\(500\)\.json\(\{ error: "Failed to create canon character" \}\);/g,
  `console.error("Error creating canon character:", error);\n      res.status(500).json({ error: "Failed to create canon character" });`
);
fs.writeFileSync('server.ts', content, 'utf8');
