import { validateCoreCategories } from "./src/domain/coreRuleCatalog.ts";
import express from "express";
import { z } from "zod";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { resolveAppliedMechanics, staminaExecutionCostsSchema, systemMechanicsConfigSchema, validatePersistedMechanicalEffects } from "./src/domain/systemMechanics.ts";


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // System Rules API
  const { getRules, upsertRule, deleteRule, seedCoreRules } = await import("./src/db/rules.ts");

  await seedCoreRules();

  app.get("/api/rules", async (req, res) => {
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
      key: z.string().min(1),
      type: z.enum(['number', 'formula', 'json']),
      value: z.any(),
      description: z.string()
    });
    const parsed = RuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { key, type, description } = parsed.data;
      let value = parsed.data.value;

      if (key === "system_mechanics") {
        if (type !== "json") {
          return res.status(400).json({ error: "system_mechanics must use the json rule type" });
        }

        const mechanics = systemMechanicsConfigSchema.safeParse(value);
        if (!mechanics.success) {
          return res.status(400).json({
            error: "Invalid system mechanics configuration",
            details: mechanics.error,
          });
        }
        if (!validateCoreCategories(mechanics.data)) return res.status(400).json({ error: "Las categorías core no se pueden borrar ni cambiar de identidad" });
        value = mechanics.data;
      }
      if (key === "stamina_execution_costs") {
        if (type !== "json") return res.status(400).json({ error: "stamina_execution_costs must use the json rule type" });
        const costs = staminaExecutionCostsSchema.safeParse(value);
        if (!costs.success) return res.status(400).json({ error: "Invalid Stamina execution costs", details: costs.error });
        value = costs.data;
      }

      const rule = await upsertRule(key, type, value, description);
      res.json(rule);
    } catch (error: any) {
      res.status(error.status ?? 500).json({ error: error.status ? error.message : "Failed to save rule" });
    }
  });

  app.delete("/api/rules/:key", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      if (["system_mechanics", "stamina_execution_costs"].includes(req.params.key)) return res.status(400).json({ error: "La configuración core no se puede eliminar" });
      await deleteRule(req.params.key);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // System Elements API
  const { getElements, upsertElement, deleteElement } = await import("./src/db/elements.ts");

  app.get("/api/elements", async (req, res) => {
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
      kind: z.enum([
        'trait', 'weakness', 'skill', 'equipment', 'weapon',
        'ammunition', 'consumable', 'license', 'permission',
        'character_resource', 'attribute_upgrade', 'technique_entitlement',
        'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
        'technique' // adding this just in case they need it based on frontend
      ]),
      name: z.string().min(1),
      description: z.string(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      effects: z.array(z.any()).optional(),
      requirements: z.any().optional(),
      metadata: z.any().optional()
    });
    const parsed = ElementSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const effects = validatePersistedMechanicalEffects(parsed.data.effects ?? []);
      if (!effects.valid) {
        return res.status(400).json({
          error: "Invalid canonical mechanical effects",
          details: effects.errors,
        });
      }
      if (parsed.data.status === "published" && (effects.legacyEffects.length || effects.canonicalEffects.length)) return res.status(400).json({ error: "Sustituye los efectos anteriores por referencias antes de publicar" });
      if (effects.appliedMechanics.length > 0) {
        const storedRules = await getRules();
        const storedMechanics = storedRules.find((rule: any) => rule.key === "system_mechanics")?.value;
        const mechanics = systemMechanicsConfigSchema.safeParse(storedMechanics);
        if (!mechanics.success) return res.status(409).json({ error: "System mechanics are unavailable or invalid" });
        const resolution = resolveAppliedMechanics(effects.appliedMechanics, mechanics.data);
        if (!resolution.valid) return res.status(400).json({ error: "Unknown or duplicate applied mechanic reference", details: resolution.issues });
      }

      const item = await upsertElement(parsed.data);
      res.json(item);
    } catch (error: any) {
      res.status(error.status ?? 500).json({ error: error.status ? error.message : "Failed to save element" });
    }
  });

  app.delete("/api/elements/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteElement(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("DELETE ELEMENT ROUTE ERROR:", error);
      res.status(500).json({ error: "Failed to delete element: " + (error.message || String(error)) });
    }
  });

  // Sheet Fields API
  const { getSheetFields, upsertSheetField, deleteSheetField } = await import("./src/db/sheetFields.ts");
  app.get("/api/sheet-fields", async (req, res) => {
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
      name: z.string().min(1),
      type: z.string(),
      category: z.string(),
      options: z.array(z.any()).optional(),
      order: z.number().int().optional()
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

  app.post("/api/admin/character/:id/duplicate", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      const charId = parseInt(req.params.id);
      
      const { db } = await import("./src/db/index.ts");
      const { characters } = await import("./src/db/schema.ts");
      const { eq } = await import("drizzle-orm");
      
      const [char] = await db.select().from(characters).where(eq(characters.id, charId));
      if (!char) return res.status(404).json({ error: "Character not found" });

      const [newChar] = await db.insert(characters).values({
        userId: char.userId,
        name: char.name + " (Copia)",
        exp: char.exp,
        yen: char.yen,
        profileData: char.profileData
      }).returning();

      res.json(newChar);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to duplicate character" });
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
        expectedUpdatedAt: z.string().optional(),
        canonCharacterId: z.string().nullable().optional()
      });
      const parsed = CharSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { characterId, name, profileData, expectedUpdatedAt, userId, canonCharacterId } = parsed.data;
      console.log("POST /api/character request:", { characterId, name, expectedUpdatedAt, userId, canonCharacterId });
      
      
      if (canonCharacterId) {
        const { db } = await import("./src/db/index.ts");
        const { canonCharacters, characters } = await import("./src/db/schema.ts");
        const { eq, and, ne } = await import("drizzle-orm");
        
        const [canon] = await db.select().from(canonCharacters).where(eq(canonCharacters.id, canonCharacterId));
        if (!canon) {
          return res.status(404).json({ error: "Canon character not found" });
        }
        
        const [occupied] = await db.select().from(characters).where(eq(characters.canonCharacterId, canonCharacterId));
        if (occupied && occupied.id !== characterId) {
          return res.status(409).json({ error: "Canon character is already occupied" });
        }
      }
      
      const { updateCharacter, createCharacter } = await import("./src/db/characters.ts");
      let character;
      if (characterId) {
        character = await updateCharacter(characterId, { name, profileData, expectedUpdatedAt, canonCharacterId });
      } else {
        // Must provide userId to create. Since moderators create characters for players, we probably need userId in the body.
        // For now, if no userId is provided, fail. Wait, the legacy code used req.dbUser.id.
        const targetUserId = userId || req.dbUser.id;
        character = await createCharacter(targetUserId, name || "Unnamed", profileData || {}, canonCharacterId || null);
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
      status: z.enum(['draft', 'scheduled', 'available', 'paused', 'ended', 'archived']),
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

  app.get("/api/admin/canon-characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getCanonCharacters } = await import("./src/db/canonCharacters.ts");
      const list = await getCanonCharacters();
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch canon characters" });
    }
  });

  
  app.post("/api/admin/canon-characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const CanonSchema = z.object({
        name: z.string().min(1),
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        active: z.boolean().optional(),
        reserved: z.boolean().optional(),
        reservedUntil: z.string().datetime().optional().nullable(),
        sortOrder: z.number().int().optional()
      });
      const parsed = CanonSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { createCanonCharacter } = await import("./src/db/canonCharacters.ts");
      const result = await createCanonCharacter(parsed.data);
      res.json(result);
    } catch (error) {
      console.error("Error creating canon character:", error);
      res.status(500).json({ error: "Failed to create canon character" });
    }
  });

  
  app.put("/api/admin/canon-characters/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const CanonSchema = z.object({
        name: z.string().min(1).optional(),
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        active: z.boolean().optional(),
        reserved: z.boolean().optional(),
        reservedUntil: z.string().datetime().optional().nullable(),
        sortOrder: z.number().int().optional()
      });
      const parsed = CanonSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { updateCanonCharacter } = await import("./src/db/canonCharacters.ts");
      const updateData: any = { ...parsed.data };
      if (parsed.data.reservedUntil) updateData.reservedUntil = new Date(parsed.data.reservedUntil);
      const result = await updateCanonCharacter(req.params.id, updateData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to update canon character" });
    }
  });

  app.delete("/api/admin/canon-characters/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteCanonCharacter } = await import("./src/db/canonCharacters.ts");
      await deleteCanonCharacter(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  
  // --- Employments Admin API ---
  app.get("/api/admin/employments/structure", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getInstitutionsWithDepartmentsAndPositions } = await import("./src/db/employments.ts");
      res.json(await getInstitutionsWithDepartmentsAndPositions());
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.post("/api/admin/institutions", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createInstitution } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1), description: z.string().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createInstitution(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/institutions/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updateInstitution } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updateInstitution(req.params.id, parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/institutions/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteInstitution } = await import("./src/db/employments.ts");
      await deleteInstitution(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(409).json({ error: error.message }); }
  });

  app.post("/api/admin/departments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createDepartment } = await import("./src/db/employments.ts");
      const parsed = z.object({ institutionId: z.string(), name: z.string().min(1), description: z.string().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createDepartment(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/departments/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updateDepartment } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updateDepartment(req.params.id, parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/departments/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteDepartment } = await import("./src/db/employments.ts");
      await deleteDepartment(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(409).json({ error: error.message }); }
  });

  app.post("/api/admin/positions", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createPosition } = await import("./src/db/employments.ts");
      const parsed = z.object({ departmentId: z.string(), name: z.string().min(1), description: z.string().optional(), capacity: z.number().int().nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createPosition(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/positions/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updatePosition } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), capacity: z.number().int().nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updatePosition(req.params.id, parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/positions/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deletePosition } = await import("./src/db/employments.ts");
      await deletePosition(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(409).json({ error: error.message }); }
  });

  app.post("/api/admin/employments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { assignCharacterEmployment } = await import("./src/db/employments.ts");
      const parsed = z.object({ characterId: z.number().int(), positionId: z.string() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await assignCharacterEmployment(parsed.data.characterId, parsed.data.positionId));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.delete("/api/admin/employments/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { removeCharacterEmployment } = await import("./src/db/employments.ts");
      await removeCharacterEmployment(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  // --- Classes Admin API ---
  app.get("/api/admin/classes/structure", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getAcademicYearsWithClasses } = await import("./src/db/academicClasses.ts");
      res.json(await getAcademicYearsWithClasses());
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.post("/api/admin/academic-years", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createAcademicYear } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ name: z.string().min(1), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createAcademicYear(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/academic-years/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updateAcademicYear } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updateAcademicYear(req.params.id, parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/academic-years/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteAcademicYear } = await import("./src/db/academicClasses.ts");
      await deleteAcademicYear(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(409).json({ error: error.message }); }
  });

  app.post("/api/admin/class-groups", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createClassGroup } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ academicYearId: z.string(), name: z.string().min(1), description: z.string().optional(), capacity: z.number().int(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createClassGroup(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/class-groups/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updateClassGroup } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), capacity: z.number().int().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updateClassGroup(req.params.id, parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.delete("/api/admin/class-groups/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteClassGroup } = await import("./src/db/academicClasses.ts");
      await deleteClassGroup(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(409).json({ error: error.message }); }
  });

  app.post("/api/admin/enrollments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { enrollCharacter } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ characterId: z.number().int(), classGroupId: z.string() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await enrollCharacter(parsed.data.characterId, parsed.data.classGroupId));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.delete("/api/admin/enrollments/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { removeCharacterEnrollment } = await import("./src/db/academicClasses.ts");
      await removeCharacterEnrollment(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  // --- Character Specific ---
  app.get("/api/admin/characters/:id/employments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getCharacterEmployments } = await import("./src/db/employments.ts");
      res.json(await getCharacterEmployments(parseInt(req.params.id, 10)));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.get("/api/admin/characters/:id/enrollment", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getCharacterEnrollment } = await import("./src/db/academicClasses.ts");
      res.json(await getCharacterEnrollment(parseInt(req.params.id, 10)));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  // --- Public Routes ---
  app.get("/api/public/employments", async (req, res) => {
    try {
      const { getPublicEmployments } = await import("./src/db/employments.ts");
      res.json(await getPublicEmployments());
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.get("/api/public/classes", async (req, res) => {
    try {
      const { getPublicClasses } = await import("./src/db/academicClasses.ts");
      res.json(await getPublicClasses());
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.get("/api/public/canon-characters", async (req, res) => {
    try {
      const { getCanonCharacters } = await import("./src/db/canonCharacters.ts");
      const list = await getCanonCharacters();
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch canon characters" });
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
