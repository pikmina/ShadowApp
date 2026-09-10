const fs = require('fs');
let file = fs.readFileSync('server.ts', 'utf8');

file = file.replace(
  'const { characterId, name, profileData, expectedUpdatedAt, userId } = parsed.data;',
  `const { characterId, name, profileData, expectedUpdatedAt, userId } = parsed.data;
      console.log("POST /api/character request:", { characterId, name, expectedUpdatedAt, userId });`
);

fs.writeFileSync('server.ts', file);
