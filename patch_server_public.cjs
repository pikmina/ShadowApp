const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add public character endpoint
const publicEndpoint = `
  app.get("/api/public/character/:id", async (req, res) => {
    try {
      const { db } = await import("./src/db/index.ts");
      const { characters } = await import("./src/db/schema.ts");
      const { eq } = await import("drizzle-orm");
      
      const [character] = await db.select().from(characters).where(eq(characters.id, parseInt(req.params.id)));
      
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Optionally check if character is marked as canon or public if needed, 
      // but the prompt says "Esta ficha pública, debe ser visible sin acceder, y tener su propia URL"
      res.json(character);
    } catch (error) {
      console.error("Public character error:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });
`;

code = code.replace(
  '// Vite middleware for development',
  publicEndpoint + '\n  // Vite middleware for development'
);

fs.writeFileSync('server.ts', code);
