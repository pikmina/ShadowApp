const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /\/\/ Auto-promote specific email to superadmin[\s\S]*?returning\(\);\s*\}/,
  '// Removed auto-promote'
);

content = content.replace(
  /app\.post\("\/api\/character", requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?res\.json\(character\);\s*\} catch \(error: any\) \{/g,
  `app.post("/api/character", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
      const { characterId, name, profileData } = req.body;
      
      const { upsertCharacter } = await import("./src/db/characters.ts");
      const character = await upsertCharacter(characterId, req.dbUser.id, name, profileData);
      res.json(character);
    } catch (error: any) {`
);

content = content.replace(
  /let dbUser = await getOrCreateUser\(req\.user\.uid, req\.user\.email \|\| ""\);/,
  'let dbUser = req.dbUser!;'
);

content = content.replace(
  /const dbUser = await getOrCreateUser\(req\.user\.uid, req\.user\.email \|\| ""\);/g,
  'const dbUser = req.dbUser!;'
);

fs.writeFileSync('server.ts', content);
