const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
  // Shop API
  const { getShopOffers, upsertShopOffer, deleteShopOffer, processPurchase } = await import("./src/db/shop.ts");

  app.get("/api/shop/offers", requireAuth, async (req, res) => {
    try {
      const offers = await getShopOffers();
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop offers" });
    }
  });

  app.post("/api/shop/offers", requireAuth, async (req, res) => {
    try {
      const offer = await upsertShopOffer(req.body);
      res.json(offer);
    } catch (error) {
      res.status(500).json({ error: "Failed to save shop offer" });
    }
  });

  app.delete("/api/shop/offers/:id", requireAuth, async (req, res) => {
    try {
      await deleteShopOffer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shop offer" });
    }
  });

  app.post("/api/shop/purchase", requireAuth, async (req, res) => {
    try {
      const { characterId, cartItems } = req.body;
      const user = req.user;
      if (user.role !== 'moderator' && user.role !== 'superadmin') {
        return res.status(403).json({ error: "Solo los moderadores pueden procesar compras directamente." });
      }
      const result = await processPurchase(user.uid, characterId, cartItems);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/characters", requireAuth, async (req, res) => {
    try {
      const { db } = await import("./src/db/index.ts");
      const { characters } = await import("./src/db/schema.ts");
      const chars = await db.select().from(characters);
      res.json(chars);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });
`;

serverCode = serverCode.replace('// Vite middleware for development', endpoints + '\n  // Vite middleware for development');
fs.writeFileSync('server.ts', serverCode);
