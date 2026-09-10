import express from "express";
import { z } from "zod";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";


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

  app.get("/api/rules", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const rules = await getRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.post("/api/rules", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
  try {
    const RuleSchema = z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      category: z.enum(['combat', 'exploration', 'social', 'magic', 'general']),
      cost: z.number().int().min(0),
      description: z.string()
    });
    const parsed = RuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      // In the future, enforce requireRole('superadmin') here
      const { key, type, value, description } = req.body;
      const rule = await upsertRule(key, type, value, description);
      res.json(rule);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save rule" });
    }
  });

  app.delete("/api/rules/:key", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteRule(req.params.key);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // System Elements API
  const { getElements, upsertElement, deleteElement } = await import("./src/db/elements.ts");

  app.get("/api/elements", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const items = await getElements();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch elements" });
    }
  });

  app.post("/api/elements", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
  try {
    const ElementSchema = z.object({
      id: z.string().optional(),
      type: z.enum(['technique', 'technique_entitlement', 'item', 'modifier', 'effect']),
      name: z.string().min(1),
      description: z.string(),
      mechanics: z.array(z.any()).optional()
    });
    const parsed = ElementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      // In the future, enforce requireRole('superadmin', 'moderator')
      const item = await upsertElement(req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save element" });
    }
  });

  app.delete("/api/elements/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteElement(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete element" });
    }
  });

  // Sheet Fields API
  const { getSheetFields, upsertSheetField, deleteSheetField } = await import("./src/db/sheetFields.ts");
  app.get("/api/sheet-fields", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const fields = await getSheetFields();
      res.json(fields);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sheet fields" });
    }
  });

  app.post("/api/sheet-fields", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
  try {
    const FieldSchema = z.object({
      id: z.string().optional(),
      type: z.enum(['text', 'number', 'longtext', 'boolean', 'select', 'multiselect', 'formula', 'attribute']),
      name: z.string().min(1),
      description: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
      orderIndex: z.number().int().optional(),
      isRequired: z.boolean().optional(),
      categoryId: z.string().optional()
    });
    const parsed = FieldSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const field = await upsertSheetField(req.body);
      res.json(field);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save sheet field" });
    }
  });

  app.delete("/api/sheet-fields/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteSheetField(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete sheet field" });
    }
  });

  // Character API
  const { getCharacterByUserId, deleteCharacter } = await import("./src/db/characters.ts");
  // System Settings API (stored in systemRules)
  app.get("/api/settings", async (req, res) => {
    try {
      const { getRule } = await import("./src/db/rules.ts");
      const settingsRule = await getRule("global_settings");
      
      const defaultSettings = { gameDate: { year: 2201, month: 1, day: 1 }, groups: [] };
      const settings = settingsRule?.value ? settingsRule.value : defaultSettings;
      
      res.json({ ...(settings as Record<string, any>), updatedAt: settingsRule?.updatedAt });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/api/settings", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
  try {
    const SettingsSchema = z.object({
      gameDate: z.any().optional(),
      groups: z.any().optional(),
      expectedUpdatedAt: z.string().optional()
    });
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { upsertRule } = await import("./src/db/rules.ts");
      const currentSettings = await import("./src/db/rules.ts").then(m => m.getRule("global_settings"));
      
      const currentVal = (currentSettings?.value && typeof currentSettings.value === "object" && !Array.isArray(currentSettings.value))
        ? (currentSettings.value as Record<string, unknown>)
        : {};
      const { expectedUpdatedAt, gameDate, groups } = parsed.data;
      if (expectedUpdatedAt && currentSettings?.updatedAt) {
        if (new Date(expectedUpdatedAt).getTime() !== new Date(currentSettings.updatedAt).getTime()) {
           const err: any = new Error("Conflict");
           err.status = 409;
           throw err;
        }
      }
      const newSettings = { ...currentVal };
      if (gameDate !== undefined) newSettings.gameDate = gameDate;
      if (groups !== undefined) newSettings.groups = groups;
      
      await upsertRule("global_settings", "json", newSettings, "Ajustes globales del sistema (Tiempo, Grupos, etc.)");
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      if (e.status) return res.status(e.status).json({ error: e.message });
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.get("/api/character", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      let dbUser = req.dbUser!;
      
      // Removed auto-promote
      const character = await getCharacterByUserId(dbUser.id);
      res.json(character || { id: null });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });


  app.delete("/api/admin/characters/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
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

  app.post("/api/character", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });
      
      const CharSchema = z.object({
        characterId: z.number().optional().nullable(),
        userId: z.number().optional(),
        name: z.string().optional(),
        profileData: z.record(z.string(), z.any()).optional(),
        expectedUpdatedAt: z.string().optional()
      });
      const parsed = CharSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { characterId, name, profileData, expectedUpdatedAt, userId } = parsed.data;

      
      const { updateCharacter, createCharacter } = await import("./src/db/characters.ts");
      let character;
      if (characterId) {
        character = await updateCharacter(characterId, { name, profileData, expectedUpdatedAt });
      } else {
        // Must provide userId to create. Since moderators create characters for players, we probably need userId in the body.
        // For now, if no userId is provided, fail. Wait, the legacy code used req.dbUser.id.
        const targetUserId = userId || req.dbUser.id;
        character = await createCharacter(targetUserId, name || "Unnamed", profileData || {});
      }
      res.json(character);
    } catch (error: any) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: "Failed to save character" });
    }
  });

  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const dbUser = req.dbUser!;
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
      const dbUser = req.dbUser!;
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

  app.get("/api/shop/offers", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const offers = await getShopOffers();
      res.json(offers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shop offers" });
    }
  });

  app.post("/api/shop/offers", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
  try {
    const OfferSchema = z.object({
      id: z.string().optional(),
      elementId: z.string().min(1),
      status: z.enum(['draft', 'available', 'hidden', 'archived']),
      prices: z.array(z.object({
        currency: z.enum(['exp', 'yen']),
        amount: z.number().int().min(0)
      })),
      globalStock: z.number().int().nullable().optional(),
      perCharacterLimit: z.number().int().min(1).nullable().optional()
    });
    const parsed = OfferSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const offer = await upsertShopOffer(req.body);
      res.json(offer);
    } catch (error) {
      res.status(500).json({ error: "Failed to save shop offer" });
    }
  });

  app.delete("/api/shop/offers/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteShopOffer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete shop offer" });
    }
  });

  app.post("/api/shop/purchase", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      
      const PurchaseSchema = z.object({
        characterId: z.number().int().positive(),
        cartItems: z.array(z.object({
          offerId: z.string().min(1),
          quantity: z.number().int().positive(),
          selectedCurrency: z.enum(['exp', 'yen'])
        })).min(1)
      });
      const parsed = PurchaseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload format" });
      const { characterId, cartItems } = parsed.data;

      const dbUser = req.dbUser!;
      const result = await processPurchase(dbUser.uid, characterId, cartItems);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/character/:id/reward", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const charId = Number(req.params.id);
      
      const RewardSchema = z.object({
        type: z.enum(['exp', 'yen']),
        amount: z.number().int().min(-100000).max(100000).refine(val => val !== 0, { message: "Amount cannot be 0" }),
        reason: z.string().optional()
      });
      const parsed = RewardSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { type, amount, reason } = parsed.data;

      
      const { grantReward } = await import("./src/db/characters.ts");
      const result = await grantReward(req.dbUser.uid, charId, type, amount, reason || "Manual reward");
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/character/:id/possession", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const charId = Number(req.params.id);
      
      const PosSchema = z.object({
        elementId: z.string().min(1),
        quantity: z.number().int().refine(val => val !== 0, { message: "Quantity change cannot be 0" }),
        reason: z.string().optional()
      });
      const parsed = PosSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { elementId, quantity, reason } = parsed.data;

      
      const { updatePossession } = await import("./src/db/characters.ts");
      const result = await updatePossession(req.dbUser.uid, charId, elementId, quantity, reason || "Manual adjustment");
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { db } = await import("./src/db/index.ts");
      const { characters } = await import("./src/db/schema.ts");
      const chars = await db.select().from(characters);
      res.json(chars);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  
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
