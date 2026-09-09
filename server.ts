import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // System Rules API
  const { getRules, upsertRule, deleteRule } = await import("./src/db/rules.ts");

  app.get("/api/rules", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rules = await getRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.post("/api/rules", requireAuth, async (req: AuthRequest, res) => {
    try {
      // In the future, enforce requireRole('superadmin') here
      const { key, type, value, description } = req.body;
      const rule = await upsertRule(key, type, value, description);
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save rule" });
    }
  });

  app.delete("/api/rules/:key", requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteRule(req.params.key);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // System Elements API
  const { getElements, upsertElement, deleteElement } = await import("./src/db/elements.ts");

  app.get("/api/elements", requireAuth, async (req: AuthRequest, res) => {
    try {
      const items = await getElements();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch elements" });
    }
  });

  app.post("/api/elements", requireAuth, async (req: AuthRequest, res) => {
    try {
      // In the future, enforce requireRole('superadmin', 'moderator')
      const item = await upsertElement(req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save element" });
    }
  });

  app.delete("/api/elements/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteElement(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete element" });
    }
  });

  // Sheet Fields API
  const { getSheetFields, upsertSheetField, deleteSheetField } = await import("./src/db/sheetFields.ts");
  app.get("/api/sheet-fields", requireAuth, async (req: AuthRequest, res) => {
    try {
      const fields = await getSheetFields();
      res.json(fields);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sheet fields" });
    }
  });

  app.post("/api/sheet-fields", requireAuth, async (req: AuthRequest, res) => {
    try {
      const field = await upsertSheetField(req.body);
      res.json(field);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save sheet field" });
    }
  });

  app.delete("/api/sheet-fields/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteSheetField(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete sheet field" });
    }
  });

  // Character API
  const { getCharacterByUserId, upsertCharacter } = await import("./src/db/characters.ts");
  // System Settings API (stored in systemRules)
  app.get("/api/settings", async (req, res) => {
    try {
      const { getRule } = await import("./src/db/rules.ts");
      const settingsRule = await getRule("global_settings");
      
      const defaultSettings = { gameDate: { year: 2201, month: 1, day: 1 }, groups: [] };
      const settings = settingsRule?.value ? settingsRule.value : defaultSettings;
      
      res.json(settings);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { upsertRule } = await import("./src/db/rules.ts");
      const currentSettings = await import("./src/db/rules.ts").then(m => m.getRule("global_settings"));
      
      const currentVal = (currentSettings?.value && typeof currentSettings.value === "object" && !Array.isArray(currentSettings.value))
        ? (currentSettings.value as Record<string, unknown>)
        : {};
      const newSettings = { 
        ...currentVal,
        ...req.body 
      };

      await upsertRule("global_settings", "json", newSettings, "Ajustes globales del sistema (Tiempo, Grupos, etc.)");
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/character", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      const character = await getCharacterByUserId(dbUser.id);
      res.json(character || { id: null });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  app.post("/api/character", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      const { name, profileData } = req.body;
      const character = await upsertCharacter(dbUser.id, name || "Unnamed", profileData || {});
      res.json(character);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save character" });
    }
  });

  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      if (!dbUser) {
        res.status(500).json({ error: "Failed to retrieve user" });
        return;
      }
      res.json(dbUser);
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  app.get("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      if (!dbUser) {
        res.status(500).json({ error: "Failed to retrieve user" });
        return;
      }
      res.json(dbUser);
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  
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

  app.post("/api/shop/purchase", requireAuth, async (req: AuthRequest, res) => {
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

  app.get("/api/admin/characters", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { db } = await import("./src/db/index.ts");
      const { characters } = await import("./src/db/schema.ts");
      const chars = await db.select().from(characters);
      res.json(chars);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
