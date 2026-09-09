const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  'const { getCharacterByUserId, upsertCharacter } = await import("./src/db/characters.ts");',
  'const { getCharacterByUserId, upsertCharacter, deleteCharacter } = await import("./src/db/characters.ts");'
);

const deleteEndpoint = `
  app.delete("/api/admin/characters/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const { deleteCharacter } = await import("./src/db/characters.ts");
      await deleteCharacter(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });
`;

server = server.replace(
  '  app.post("/api/character", requireAuth, async (req: AuthRequest, res) => {',
  deleteEndpoint + '\n  app.post("/api/character", requireAuth, async (req: AuthRequest, res) => {'
);

fs.writeFileSync('server.ts', server);
