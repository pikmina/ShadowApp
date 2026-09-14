import fs from 'fs';
let content = fs.readFileSync('src/views/CanonCharactersAdmin.tsx', 'utf8');

content = content.replace(
  /method: 'POST',\s*body: JSON\.stringify/g,
  `method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify`
);

content = content.replace(
  /method: 'PUT',\s*body: JSON\.stringify/g,
  `method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify`
);

fs.writeFileSync('src/views/CanonCharactersAdmin.tsx', content, 'utf8');
