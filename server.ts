import { validateCoreCategories, migrateCoreCategories } from "./src/domain/coreRuleCatalog.ts";
import express from "express";
import { z } from "zod";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";
import { resolveAppliedMechanics, staminaExecutionCostsSchema, systemMechanicsConfigSchema, validatePersistedMechanicalEffects } from "./src/domain/systemMechanics.ts";
import { requirementGroupSchema } from "./src/domain/requirements.ts";
import { employmentCompensationSchema, positionEmploymentRulesSchema } from "./src/domain/employmentCompensation.ts";


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API routes
  app.get("/api/health", async (req, res) => {
    try {
      const { db } = await import("./src/db/index.ts");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1 as alive`);
      res.json({
        status: "ok",
        database: "connected",
      });
    } catch (err: any) {
      console.error("Health check database query error:", err);
      res.status(503).json({
        status: "error",
        database: "disconnected",
      });
    }
  });

  // System Rules API
  const { getRules, upsertRule, deleteRule, seedCoreRules } = await import("./src/db/rules.ts");
  const { seedCoreWeaknesses, seedCoreTraits } = await import("./src/db/elements.ts");

  try {
    await seedCoreRules();
    await seedCoreWeaknesses();
    await seedCoreTraits();
  } catch (seedErr: any) {
    console.warn("Notice: Startup core seeding warning (safe fallback):", seedErr?.message || seedErr);
  }

  // Ensure database enums are updated (safe fallback if migrations were bypassed)
  try {
    const { db } = await import("./src/db/index.ts");
    const { sql } = await import("drizzle-orm");
    const existingResult = await db.execute<{ enumlabel: string }>(sql`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'element_kind';
    `);
    const existingLabels = new Set((existingResult.rows || []).map((r: any) => r.enumlabel));

    const elementKindValues = [
      'trait', 'weakness', 'skill', 'equipment', 'weapon', 
      'ammunition', 'consumable', 'license', 'permission', 'certification',
      'character_resource', 'attribute_upgrade', 'technique_entitlement', 
      'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
      'background', 'vehicle', 'real_estate', 'clandestine_asset'
    ];
    for (const val of elementKindValues) {
      if (!existingLabels.has(val)) {
        await db.execute(sql.raw(`ALTER TYPE "element_kind" ADD VALUE '${val}';`));
      }
    }
  } catch (err: any) {
    console.warn("Notice: Enum verification at server start:", err?.message || err);
  }

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

        try {
          value = migrateCoreCategories(value);
        } catch (e: any) {
          return res.status(400).json({ error: "Error migrando categorías core: " + e.message });
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
      if (key === "employment_compensation") {
        if (type !== "json") return res.status(400).json({ error: "employment_compensation must use the json rule type" });
        const compensation = employmentCompensationSchema.safeParse(value);
        if (!compensation.success) return res.status(400).json({ error: "Invalid employment compensation configuration", details: compensation.error });
        value = compensation.data;
      }

      const rule = await upsertRule(key, type, value, description, req.dbUser?.uid);
      res.json(rule);
    } catch (error: any) {
      res.status(error.status ?? 500).json({ error: error.status ? error.message : "Failed to save rule" });
    }
  });

  app.delete("/api/rules/:key", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      if (["system_mechanics", "stamina_execution_costs", "employment_compensation"].includes(req.params.key)) return res.status(400).json({ error: "La configuración core no se puede eliminar" });
      await deleteRule(req.params.key, req.dbUser?.uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // System Elements API
  const { getElements, getPublishedElements, upsertElement, deleteElement, getDeletedSystemElements, restoreSystemElements } = await import("./src/db/elements.ts");

  app.get("/api/admin/deleted-system-elements", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const deleted = await getDeletedSystemElements();
      res.json(deleted);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch deleted system elements" });
    }
  });

  app.post("/api/admin/restore-system-elements", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const schema = z.object({ elementIds: z.array(z.string()).min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const restored = await restoreSystemElements(parsed.data.elementIds, req.dbUser?.uid);
      res.json({ success: true, restored });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to restore system elements" });
    }
  });

  app.post("/api/admin/system/sync-canonical-statuses", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { seedCoreWeaknesses } = await import("./src/db/elements.ts");
      const { seedCoreRules } = await import("./src/db/rules.ts");
      await seedCoreWeaknesses(req.user?.uid || 'admin-sync');
      await seedCoreRules();
      res.json({
        success: true,
        message: "Estados alterados canónicos y reglas del sistema sincronizados con éxito.",
      });
    } catch (error: any) {
      console.error("Error syncing canonical statuses:", error);
      res.status(500).json({ error: error.message || "Failed to sync canonical statuses" });
    }
  });

  app.get("/api/elements", async (req, res) => {
    try {
      const items = await getPublishedElements();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch elements" });
    }
  });

  app.post("/api/elements", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
  try {
    const ElementSchema = z.object({
      id: z.string().optional(),
      kind: z.enum([
        'trait', 'weakness', 'skill', 'equipment', 'weapon',
        'ammunition', 'consumable', 'license', 'permission', 'certification',
        'character_resource', 'attribute_upgrade', 'technique_entitlement',
        'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
        'background', 'vehicle', 'real_estate', 'clandestine_asset'
      ]),
      name: z.string().min(1),
      description: z.string(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      iconType: z.enum(['lucide', 'emoji']).nullable().optional(),
      iconValue: z.string().nullable().optional(),
      effects: z.array(z.any()).optional(),
      mechanicalBehaviors: z.array(z.any()).optional(),
      requirements: requirementGroupSchema.optional(),
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

      const item = await upsertElement(parsed.data, req.dbUser?.uid);
      res.json(item);
    } catch (error: any) {
      console.error("UPSERT ELEMENT ROUTE ERROR:", error);
      res.status(error.status ?? 500).json({ error: error.status ? error.message : (error.message || "Failed to save element") });
    }
  });

  app.delete("/api/elements/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      await deleteElement(req.params.id, req.dbUser?.uid);
      res.json({ success: true });
    } catch (error: any) {
      console.error("DELETE ELEMENT ROUTE ERROR:", error);
      res.status(error.status ?? 500).json({ error: error.message || "Failed to delete element" });
    }
  });

  // Sheet Fields API
  const { getSheetFields, upsertSheetField, deleteSheetField, seedCoreProfileFields } = await import("./src/db/sheetFields.ts");
  try {
    await seedCoreProfileFields();
  } catch (fieldErr: any) {
    console.warn("Notice: Startup profile fields seeding warning (safe fallback):", fieldErr?.message || fieldErr);
  }
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

      const field = await upsertSheetField(parsed.data, req.dbUser?.uid);
      res.json(field);
    } catch (error: any) {
      res.status(error.status ?? 500).json({ error: error.message || "Failed to save sheet field" });
    }
  });

  app.delete("/api/sheet-fields/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      await deleteSheetField(req.params.id, req.dbUser?.uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(error.status ?? 500).json({ error: error.message || "Failed to delete sheet field" });
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
      expectedUpdatedAt: z.string().nullish()
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
      
      await upsertRule("global_settings", "json", newSettings, "Ajustes globales del sistema (Tiempo, Grupos, etc.)", req.dbUser?.uid);
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
      await deleteCharacter(parseInt(req.params.id), req.dbUser?.uid);
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
      const { characters, auditLogs } = await import("./src/db/schema.ts");
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

      if (req.dbUser?.uid) {
        await db.insert(auditLogs).values({
          actorUid: req.dbUser.uid,
          actionType: 'character_duplicated',
          targetId: newChar.id.toString(),
          details: {
            sourceCharacterId: charId,
            sourceName: char.name,
            newName: newChar.name,
          },
        });
      }

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
        userId: z.number().optional().nullable(),
        playerId: z.number().optional().nullable(),
        active: z.boolean().optional(),
        name: z.string().optional(),
        profileData: z.record(z.string(), z.any()).optional(),
        expectedUpdatedAt: z.string().optional(),
        canonCharacterId: z.string().nullable().optional(),
        elementIds: z.array(z.string().min(1)).optional(),
        exp: z.number().int().min(0).optional(),
        yen: z.number().int().min(0).optional(),
        inventoryPossessions: z.array(z.object({
          elementId: z.string().min(1),
          quantity: z.number().int().min(1).default(1),
          equipped: z.boolean().optional(),
          notes: z.string().nullable().optional(),
        })).optional(),
        credentialPossessions: z.array(z.object({
          elementId: z.string().min(1),
          quantity: z.number().int().min(1).optional()
        })).optional(),
        skillPossessions: z.array(z.object({
          elementId: z.string().min(1),
          quantity: z.number().int().min(1)
        })).optional(),
      });
      const parsed = CharSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });
      const { characterId, name, profileData, expectedUpdatedAt, userId, playerId, active, canonCharacterId, elementIds, exp, yen, inventoryPossessions, credentialPossessions, skillPossessions } = parsed.data;
      console.log("POST /api/character request:", { characterId, name, expectedUpdatedAt, userId, playerId, active, canonCharacterId, exp, yen });
      
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
      
      const { updateCharacter, createCharacter, saveCharacterWithElementSelections } = await import("./src/db/characters.ts");
      let character;
      if (elementIds !== undefined || inventoryPossessions !== undefined || credentialPossessions !== undefined || skillPossessions !== undefined || exp !== undefined || yen !== undefined || playerId !== undefined || active !== undefined) {
        character = await saveCharacterWithElementSelections({
          characterId,
          userId: userId !== undefined ? userId : req.dbUser.id,
          playerId,
          active,
          name: name || "Unnamed",
          profileData: profileData || {},
          expectedUpdatedAt,
          canonCharacterId,
          elementIds,
          exp,
          yen,
          inventoryPossessions,
          credentialPossessions,
          skillPossessions,
          actorUid: req.dbUser.uid,
        });
      } else if (characterId) {
        character = await updateCharacter(characterId, { name, profileData, expectedUpdatedAt, canonCharacterId, playerId, active });
      } else {
        const targetUserId = userId !== undefined ? userId : req.dbUser.id;
        character = await createCharacter(targetUserId, name || "Unnamed", profileData || {}, canonCharacterId || null, playerId || null, active ?? true);
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

  // --- Character Status Toggle API ---
  app.patch("/api/admin/characters/:id/status", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const charId = parseInt(req.params.id, 10);
      if (isNaN(charId)) return res.status(400).json({ error: "Invalid character ID" });
      const parsed = z.object({ active: z.boolean() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

      const { updateCharacter } = await import("./src/db/characters.ts");
      const updated = await updateCharacter(charId, { active: parsed.data.active });
      res.json(updated);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to update character status" });
    }
  });

  // --- Character Possession Equip Toggle API ---
  app.post("/api/characters/:id/possessions/:elementId/equip", requireAuth, async (req: AuthRequest, res) => {
    try {
      const charId = parseInt(req.params.id, 10);
      if (isNaN(charId)) return res.status(400).json({ error: "Invalid character ID" });
      const elementId = req.params.elementId;
      if (!elementId) return res.status(400).json({ error: "Invalid element ID" });

      const { getCharacterById, toggleCharacterPossessionEquip } = await import("./src/db/characters.ts");
      const character = await getCharacterById(charId);
      if (!character) return res.status(404).json({ error: "Character not found" });

      const isOwner = req.dbUser && character.userId === req.dbUser.id;
      const isAdmin = req.dbUser && ['superadmin', 'moderator'].includes(req.dbUser.role);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const schema = z.object({
        equipped: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body);
      const equipped = parsed.success ? parsed.data.equipped : undefined;

      const updated = await toggleCharacterPossessionEquip(charId, elementId, equipped, req.dbUser?.uid);
      res.json(updated);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to toggle possession equipment" });
    }
  });

  // --- Players Admin API ---
  app.get("/api/admin/players", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getPlayers } = await import("./src/db/players.ts");
      const playersList = await getPlayers({ includeInactive: true });
      res.json(playersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch players" });
    }
  });

  app.post("/api/admin/players", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "El nombre del jugador es obligatorio"),
        status: z.enum(["active", "absent", "inactive"]).optional(),
        identity: z.string().optional().nullable(),
        discord: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        userId: z.number().int().positive().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { createPlayer } = await import("./src/db/players.ts");
      const created = await createPlayer(parsed.data, req.dbUser?.uid);
      res.json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to create player" });
    }
  });

  app.put("/api/admin/players/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      if (isNaN(playerId)) return res.status(400).json({ error: "Invalid player ID" });
      const schema = z.object({
        name: z.string().min(1).optional(),
        status: z.enum(["active", "absent", "inactive"]).optional(),
        identity: z.string().optional().nullable(),
        discord: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        userId: z.number().int().positive().optional().nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { updatePlayer } = await import("./src/db/players.ts");
      const updated = await updatePlayer(playerId, parsed.data, req.dbUser?.uid);
      res.json(updated);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to update player" });
    }
  });

  app.delete("/api/admin/players/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      if (isNaN(playerId)) return res.status(400).json({ error: "Invalid player ID" });

      const { deletePlayer } = await import("./src/db/players.ts");
      await deletePlayer(playerId, req.dbUser?.uid);
      res.json({ success: true });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to delete player" });
    }
  });

  app.patch("/api/admin/players/:id/status", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      if (isNaN(playerId)) return res.status(400).json({ error: "Invalid player ID" });
      const schema = z.object({
        status: z.enum(["active", "absent", "inactive"]),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { updatePlayer } = await import("./src/db/players.ts");
      const updated = await updatePlayer(playerId, { status: parsed.data.status }, req.dbUser?.uid);
      res.json(updated);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to update player status" });
    }
  });

  app.post("/api/admin/players/:id/characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      if (isNaN(playerId)) return res.status(400).json({ error: "Invalid player ID" });
      const schema = z.object({
        characterId: z.number().int().positive(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const { assignCharacterToPlayer } = await import("./src/db/players.ts");
      const updated = await assignCharacterToPlayer(playerId, parsed.data.characterId, req.dbUser?.uid);
      res.json(updated);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to assign character" });
    }
  });

  app.delete("/api/admin/players/:id/characters/:characterId", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      const characterId = parseInt(req.params.characterId, 10);
      if (isNaN(playerId) || isNaN(characterId)) return res.status(400).json({ error: "Invalid IDs" });

      const { unassignCharacterFromPlayer } = await import("./src/db/players.ts");
      const updated = await unassignCharacterFromPlayer(playerId, characterId, req.dbUser?.uid);
      res.json({ success: true, character: updated });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message || "Failed to unassign character" });
    }
  });

  // --- Public Players API (only players with active characters, only active characters listed) ---
  app.get("/api/public/players", async (req, res) => {
    try {
      const { getPublicPlayers } = await import("./src/db/players.ts");
      const publicList = await getPublicPlayers();
      res.json(publicList);
    } catch (error: any) {
      console.error("public players error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch public players" });
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

  app.patch("/api/auth/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.dbUser) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { displayName, avatarUrl } = req.body;

      const { updateUserProfile } = await import("./src/db/users.ts");
      const updatedDbUser = await updateUserProfile(req.user.uid, {
        displayName: typeof displayName === "string" ? displayName.trim() : displayName === null ? null : undefined,
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl.trim() : avatarUrl === null ? null : undefined,
      });

      // Update Firebase Auth user profile
      try {
        const { adminAuth } = await import("./src/lib/firebase-admin.ts");
        const fbUpdate: { displayName?: string; photoURL?: string | null } = {};
        if (typeof displayName === "string") {
          fbUpdate.displayName = displayName.trim();
        } else if (displayName === null) {
          fbUpdate.displayName = "";
        }

        if (typeof avatarUrl === "string") {
          const trimmed = avatarUrl.trim();
          if (!trimmed) {
            fbUpdate.photoURL = null;
          } else {
            try {
              const parsed = new URL(trimmed);
              if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                fbUpdate.photoURL = trimmed;
              }
            } catch {
              // avatarUrl is a data URL (e.g. data:image/...) or relative URL.
              // Firebase Auth photoURL requires a valid HTTP(S) URL.
              // The image is already safely persisted in the database (users.avatar_url).
            }
          }
        } else if (avatarUrl === null) {
          fbUpdate.photoURL = null;
        }

        if (Object.keys(fbUpdate).length > 0) {
          await adminAuth.updateUser(req.user.uid, fbUpdate);
        }
      } catch (fbErr) {
        console.warn("Could not update Firebase user profile:", fbErr);
      }

      // Record in audit logs
      try {
        const { db } = await import("./src/db/index.ts");
        const { auditLogs } = await import("./src/db/schema.ts");
        await db.insert(auditLogs).values({
          actorUid: req.dbUser.uid,
          actionType: "profile_updated",
          targetId: req.dbUser.id.toString(),
          details: {
            displayName,
            avatarUrl,
          },
        });
      } catch (auditErr) {
        console.warn("Failed to write audit log for profile update:", auditErr);
      }

      res.json(updatedDbUser);
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error?.message || "Failed to update profile" });
    }
  });

  // --- Staff / Moderator Management (Superadmin Only) ---
  app.get("/api/admin/users", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      const { getAllUsers } = await import("./src/db/users.ts");
      const usersList = await getAllUsers();
      res.json(usersList);
    } catch (error: any) {
      console.error("Fetch users error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      const { email, role, displayName } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: "Email y rol son requeridos" });
      }
      if (role !== "moderator" && role !== "superadmin") {
        return res.status(400).json({ error: "Rol inválido. Debe ser moderator o superadmin" });
      }
      const { createStaffUser } = await import("./src/db/users.ts");
      const user = await createStaffUser({ email, role, displayName }, req.dbUser?.uid);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Create staff user error:", error);
      res.status(500).json({ error: error?.message || "Failed to create staff user" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { role } = req.body;
      if (!role || (role !== "moderator" && role !== "superadmin")) {
        return res.status(400).json({ error: "Rol inválido" });
      }
      if (req.dbUser?.id === id && role !== "superadmin") {
        return res.status(400).json({ error: "No puedes quitarte el rol de superadmin a ti mismo" });
      }
      const { updateUserRole } = await import("./src/db/users.ts");
      const updated = await updateUserRole(id, role, req.dbUser?.uid);
      res.json(updated);
    } catch (error: any) {
      console.error("Update staff user role error:", error);
      res.status(500).json({ error: error?.message || "Failed to update user role" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (req.dbUser?.id === id) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de staff" });
      }
      const { deleteStaffUser } = await import("./src/db/users.ts");
      const result = await deleteStaffUser(id, req.dbUser?.uid);
      res.json(result);
    } catch (error: any) {
      console.error("Delete staff user error:", error);
      res.status(500).json({ error: error?.message || "Failed to delete staff user" });
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

  app.post("/api/shop/offers", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
  try {
    const OfferSchema = z.object({
      id: z.string().optional(),
      elementId: z.string().min(1),
      status: z.enum(['draft', 'scheduled', 'available', 'paused', 'ended', 'archived']),
      prices: z.array(z.object({
        currency: z.enum(['exp', 'yen']),
        amount: z.coerce.number().int().min(0)
      })),
      requirements: requirementGroupSchema.optional(),
      globalStock: z.coerce.number().int().min(0).nullable().optional().transform(v => (v === 0 || v === undefined || v === null ? null : v)),
      perCharacterLimit: z.coerce.number().int().min(0).nullable().optional().transform(v => (v === 0 || v === undefined || v === null ? null : v))
    });
    const parsed = OfferSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error });

      const offer = await upsertShopOffer(parsed.data, req.dbUser?.uid);
      res.json(offer);
    } catch (error: any) {
      console.error("SAVE SHOP OFFER ERROR:", error);
      res.status(500).json({ error: error.message || "Failed to save shop offer" });
    }
  });

  app.delete("/api/shop/offers/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      await deleteShopOffer(req.params.id, req.dbUser?.uid);
      res.json({ success: true });
    } catch (error: any) {
      console.error("DELETE SHOP OFFER ERROR:", error);
      res.status(500).json({ error: error.message || "Failed to delete shop offer" });
    }
  });

  app.post("/api/shop/purchase", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      
      const PurchaseSchema = z.object({
        characterId: z.number().int().positive(),
        cartItems: z.array(z.object({
          offerId: z.string().min(1),
          quantity: z.number().int().positive().optional().default(1),
          selectedCurrency: z.enum(['exp', 'yen']),
          fromLevel: z.number().int().min(0).max(20).optional(),
          toLevel: z.number().int().min(1).max(20).optional(),
          customInfo: z.string().optional().nullable()
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
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
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
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
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
      console.error("canon-characters fetch error:", error); res.status(500).json({ error: error?.message || "Failed to fetch canon characters" });
    }
  });

  
  app.post("/api/admin/canon-characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const CanonSchema = z.object({
        name: z.string().min(1),
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        aliases: z.array(z.string()).optional(),
        summary: z.string().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        affiliation: z.string().optional().nullable(),
        profileData: z.record(z.string(), z.unknown()).optional(),
        active: z.boolean().optional(),
        reserved: z.boolean().optional(),
        reservedUntil: z.string().datetime().optional().nullable(),
        sortOrder: z.number().int().optional()
      });
      const parsed = CanonSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { createCanonCharacter } = await import("./src/db/canonCharacters.ts");
      const result = await createCanonCharacter(parsed.data, req.dbUser?.uid);
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
        aliases: z.array(z.string()).optional(),
        summary: z.string().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        affiliation: z.string().optional().nullable(),
        profileData: z.record(z.string(), z.unknown()).optional(),
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
      const result = await updateCanonCharacter(req.params.id, updateData, req.dbUser?.uid);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to update canon character" });
    }
  });

  app.delete("/api/admin/canon-characters/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { deleteCanonCharacter } = await import("./src/db/canonCharacters.ts");
      await deleteCanonCharacter(req.params.id, req.dbUser?.uid);
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
    } catch (error: any) { console.error(error); res.status(error.status ?? 500).json({ error: error.message }); }
  });

  app.post("/api/admin/institutions", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { createInstitution } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1), description: z.string().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createInstitution(parsed.data));
    } catch (error: any) { console.error(error); res.status(error.status ?? 500).json({ error: error.message }); }
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
      const parsed = z.object({ departmentId: z.string(), name: z.string().min(1), description: z.string().optional().nullable(), capacity: z.number().int().min(0).nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional(), ...positionEmploymentRulesSchema.shape }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createPosition(parsed.data));
    } catch (error: any) { console.error(error); res.status(error.status ?? 500).json({ error: error.message }); }
  });

  app.put("/api/admin/positions/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updatePosition } = await import("./src/db/employments.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), capacity: z.number().int().min(0).nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional(), ...positionEmploymentRulesSchema.shape }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await updatePosition(req.params.id, parsed.data));
    } catch (error: any) { console.error(error); res.status(error.status ?? 500).json({ error: error.message }); }
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
      const { assignEmployment } = await import("./src/db/employments.ts");
      const parsed = z.object({ characterId: z.number().int().positive().optional(), canonCharacterId: z.string().min(1).optional(), positionId: z.string().min(1) })
        .refine(value => Number(Boolean(value.characterId)) + Number(Boolean(value.canonCharacterId)) === 1, { message: "Exactly one owner is required" })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const owner = parsed.data.canonCharacterId ? { canonCharacterId: parsed.data.canonCharacterId } : { characterId: parsed.data.characterId! };
      res.json(await assignEmployment(owner, parsed.data.positionId));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.delete("/api/admin/employments/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { removeCharacterEmployment } = await import("./src/db/employments.ts");
      await removeCharacterEmployment(req.params.id);
      res.json({ success: true });
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.get("/api/admin/employment-payments", requireAuth, requireRole(["superadmin", "moderator"]), async (_req: AuthRequest, res) => {
    try {
      const { getEmploymentPaymentHistory } = await import("./src/db/employments.ts");
      res.json(await getEmploymentPaymentHistory());
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.post("/api/admin/employment-payments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const parsed = z.object({
        periodLabel: z.string().trim().min(1).max(100),
        notes: z.string().max(2000).optional().nullable(),
        items: z.array(z.object({
          employmentId: z.string().min(1), postsObserved: z.number().int().min(0), minimumPostsApproved: z.literal(true),
          optionalBonusIds: z.array(z.string().min(1)).optional(),
        })).min(1).max(100),
      }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payment payload" });
      const { payEmploymentBatch } = await import("./src/db/employments.ts");
      res.json(await payEmploymentBatch(req.dbUser.uid, parsed.data.periodLabel, parsed.data.notes ?? null, parsed.data.items));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  // --- Character Techniques API ---
  app.get("/api/admin/character-techniques", requireAuth, requireRole(["superadmin", "moderator"]), async (_req: AuthRequest, res) => {
    try {
      const { getAllCharacterTechniques } = await import("./src/db/characterTechniques.ts");
      const techniques = await getAllCharacterTechniques();
      res.json(techniques);
    } catch (error: any) {
      console.error("Fetch all character techniques error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch character techniques" });
    }
  });

  app.get("/api/characters/:characterId/techniques", requireAuth, async (req: AuthRequest, res) => {
    try {
      const characterId = parseInt(req.params.characterId, 10);
      if (isNaN(characterId)) return res.status(400).json({ error: "Invalid character ID" });

      const { getCharacterById } = await import("./src/db/characters.ts");
      const char = await getCharacterById(characterId);
      if (!char) return res.status(404).json({ error: "Character not found" });

      const isMod = req.dbUser?.role === "superadmin" || req.dbUser?.role === "moderator";
      const isOwner = char.userId === req.dbUser?.id;
      if (!isMod && !isOwner) {
        return res.status(403).json({ error: "Forbidden: You do not own this character" });
      }

      const { getCharacterTechniquesByCharacterId } = await import("./src/db/characterTechniques.ts");
      const techniques = await getCharacterTechniquesByCharacterId(characterId);
      res.json(techniques);
    } catch (error: any) {
      console.error("Fetch character techniques error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch techniques" });
    }
  });

  app.post("/api/characters/:characterId/techniques", requireAuth, async (req: AuthRequest, res) => {
    try {
      const characterId = parseInt(req.params.characterId, 10);
      if (isNaN(characterId)) return res.status(400).json({ error: "Invalid character ID" });

      const { getCharacterById } = await import("./src/db/characters.ts");
      const char = await getCharacterById(characterId);
      if (!char) return res.status(404).json({ error: "Character not found" });

      const isMod = req.dbUser?.role === "superadmin" || req.dbUser?.role === "moderator";
      const isOwner = char.userId === req.dbUser?.id;
      if (!isMod && !isOwner) {
        return res.status(403).json({ error: "Forbidden: You do not own this character" });
      }

      const { createCharacterTechnique } = await import("./src/db/characterTechniques.ts");
      const { createCharacterTechniqueSchema } = await import("./src/domain/characterTechnique.ts");

      const validated = createCharacterTechniqueSchema.parse({
        ...req.body,
        characterId,
      });

      // API boundary validation against system_mechanics
      const rules = await getRules();
      const sysMechRule = rules.find((r) => r.key === "system_mechanics")?.value;
      const { createCoreCategories } = await import("./src/domain/coreRuleCatalog.ts");
      const { findHealingOption } = await import("./src/domain/systemMechanics.ts");
      const effectiveMechanics = Array.isArray(sysMechRule) && sysMechRule.length > 0 ? sysMechRule : createCoreCategories();

      for (const b of (validated.mechanicalBehaviors || [])) {
        for (const eff of (b.effects || [])) {
          if (eff.type === 'healing') {
            const healingOpt = findHealingOption(effectiveMechanics, eff as any, eff.resourceId || 'SA');
            if (!healingOpt) {
              return res.status(400).json({ error: "Esta cantidad no está configurada en las reglas del sistema." });
            }
          }
        }
      }

      const technique = await createCharacterTechnique(validated);
      res.status(201).json(technique);
    } catch (error: any) {
      console.error("Create character technique error:", error);
      if (error?.name === "ZodError" || error?.status === 400) {
        return res.status(400).json({ error: error.message || "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to create technique" });
    }
  });

  app.put("/api/character-techniques/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { getCharacterTechniqueById, updateCharacterTechnique } = await import("./src/db/characterTechniques.ts");
      const existing = await getCharacterTechniqueById(id);
      if (!existing) return res.status(404).json({ error: "Technique not found" });

      const { getCharacterById } = await import("./src/db/characters.ts");
      const char = await getCharacterById(existing.characterId);
      if (!char) return res.status(404).json({ error: "Character not found" });

      const isMod = req.dbUser?.role === "superadmin" || req.dbUser?.role === "moderator";
      const isOwner = char.userId === req.dbUser?.id;
      if (!isMod && !isOwner) {
        return res.status(403).json({ error: "Forbidden: You do not own this character" });
      }

      const { updateCharacterTechniqueSchema } = await import("./src/domain/characterTechnique.ts");
      const validated = updateCharacterTechniqueSchema.parse(req.body);

      // API boundary validation against system_mechanics
      if (Array.isArray(validated.mechanicalBehaviors)) {
        const rules = await getRules();
        const sysMechRule = rules.find((r) => r.key === "system_mechanics")?.value;
        const { createCoreCategories } = await import("./src/domain/coreRuleCatalog.ts");
        const { findHealingOption } = await import("./src/domain/systemMechanics.ts");
        const effectiveMechanics = Array.isArray(sysMechRule) && sysMechRule.length > 0 ? sysMechRule : createCoreCategories();

        for (const b of validated.mechanicalBehaviors) {
          for (const eff of (b.effects || [])) {
            if (eff.type === 'healing') {
              const healingOpt = findHealingOption(effectiveMechanics, eff as any, eff.resourceId || 'SA');
              if (!healingOpt) {
                return res.status(400).json({ error: "Esta cantidad no está configurada en las reglas del sistema." });
              }
            }
          }
        }
      }

      const updated = await updateCharacterTechnique(id, validated, req.body.expectedRevision);
      res.json(updated);
    } catch (error: any) {
      console.error("Update character technique error:", error);
      if (error?.status === 409) return res.status(409).json({ error: error.message });
      if (error?.name === "ZodError" || error?.status === 400) {
        return res.status(400).json({ error: error.message || "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to update technique" });
    }
  });

  app.delete("/api/character-techniques/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { getCharacterTechniqueById, deleteCharacterTechnique } = await import("./src/db/characterTechniques.ts");
      const existing = await getCharacterTechniqueById(id);
      if (!existing) return res.status(404).json({ error: "Technique not found" });

      const { getCharacterById } = await import("./src/db/characters.ts");
      const char = await getCharacterById(existing.characterId);
      if (!char) return res.status(404).json({ error: "Character not found" });

      const isMod = req.dbUser?.role === "superadmin" || req.dbUser?.role === "moderator";
      const isOwner = char.userId === req.dbUser?.id;
      if (!isMod && !isOwner) {
        return res.status(403).json({ error: "Forbidden: You do not own this character" });
      }

      const deleted = await deleteCharacterTechnique(id);
      res.json({ success: deleted });
    } catch (error: any) {
      console.error("Delete character technique error:", error);
      res.status(500).json({ error: error.message || "Failed to delete technique" });
    }
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
      const parsed = z.object({ academicYearId: z.string(), name: z.string().min(1), description: z.string().optional().nullable(), capacity: z.number().int(), active: z.boolean().optional(), sortOrder: z.number().int().optional(), courseType: z.string().optional().nullable() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      res.json(await createClassGroup(parsed.data));
    } catch (error) { console.error(error); res.status(500).json({ error: error.message }); }
  });

  app.put("/api/admin/class-groups/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { updateClassGroup } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ name: z.string().min(1).optional(), description: z.string().optional().nullable(), capacity: z.number().int().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional(), courseType: z.string().optional().nullable() }).safeParse(req.body);
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
      const { enrollOwner } = await import("./src/db/academicClasses.ts");
      const parsed = z.object({ characterId: z.number().int().positive().optional(), canonCharacterId: z.string().min(1).optional(), classGroupId: z.string().min(1) })
        .refine(value => Number(Boolean(value.characterId)) + Number(Boolean(value.canonCharacterId)) === 1, { message: "Exactly one owner is required" })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const owner = parsed.data.canonCharacterId ? { canonCharacterId: parsed.data.canonCharacterId } : { characterId: parsed.data.characterId! };
      res.json(await enrollOwner(owner, parsed.data.classGroupId));
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

  app.get("/api/admin/elements", requireAuth, requireRole(["superadmin", "moderator"]), async (_req, res) => {
    try {
      res.json(await getElements());
    } catch {
      res.status(500).json({ error: "Failed to fetch elements" });
    }
  });

  app.get("/api/admin/canon-characters/:id/employments", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getOwnerEmployments } = await import("./src/db/employments.ts");
      res.json(await getOwnerEmployments({ canonCharacterId: req.params.id }));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
  });

  app.get("/api/admin/canon-characters/:id/enrollment", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getOwnerEnrollment } = await import("./src/db/academicClasses.ts");
      res.json(await getOwnerEnrollment({ canonCharacterId: req.params.id }));
    } catch (error: any) { res.status(error.status || 500).json({ error: error.message }); }
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
      console.error("canon fetch error:", error); res.status(500).json({ error: error?.message || "Failed to fetch canon characters" });
    }
  });

  app.get("/api/public/characters", async (_req, res) => {
    try {
      const { getPublicCharacters } = await import("./src/db/characters.ts");
      res.json(await getPublicCharacters());
    } catch (error: any) {
      console.error("public characters fetch error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch public characters" });
    }
  });

  app.get("/api/admin/characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getCharactersWithPossessions } = await import("./src/db/characters.ts");
      res.json(await getCharactersWithPossessions());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  
  app.get("/api/public/character/:id", async (req, res) => {
    try {
      const { getPublicCharacterByIdOrName } = await import("./src/db/characters.ts");
      const character = await getPublicCharacterByIdOrName(req.params.id);
      
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      res.json(character);
    } catch (error) {
      console.error("Public character error:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  // --- Audit Logs Admin API ---
  app.get("/api/admin/audit-logs", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getAuditLogs } = await import("./src/db/auditLogs.ts");
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const actionType = req.query.actionType as string | undefined;
      const actorUid = req.query.actorUid as string | undefined;
      const targetId = req.query.targetId as string | undefined;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await getAuditLogs({
        page,
        limit,
        actionType,
        actorUid,
        targetId,
        search,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Audit logs fetch error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/audit-logs/stats", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getAuditStats } = await import("./src/db/auditLogs.ts");
      const stats = await getAuditStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Audit stats fetch error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch audit stats" });
    }
  });

  // --- Admin Dashboard Stats API ---
  app.get("/api/admin/dashboard-stats", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {
    try {
      const { getDashboardStats } = await import("./src/db/dashboard.ts");
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Dashboard stats fetch error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch dashboard stats" });
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
