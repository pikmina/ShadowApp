import fs from 'fs';
let content = fs.readFileSync('src/views/PublicSheet.tsx', 'utf8');
content = content.replace(
  /HeartPlus, Info/g,
  'Heart, HeartPlus, Info'
);
fs.writeFileSync('src/views/PublicSheet.tsx', content, 'utf8');
