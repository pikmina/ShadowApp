const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /app\.post\("\/api\/character", requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to save character" \}\);\s*\}\s*\}\);/,
  `app.post("/api/character", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { characterId, name, profileData } = req.body;
      
      const character = await upsertCharacter(characterId, dbUser.id, name || "Unnamed", profileData || {});
      res.json(character);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save character" });
    }
  });`
);

fs.writeFileSync('server.ts', code);
