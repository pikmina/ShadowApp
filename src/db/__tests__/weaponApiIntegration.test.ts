import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
import { z } from "zod";
import { createCoreCategories } from "../../domain/coreRuleCatalog.ts";
import { requirementGroupSchema } from "../../domain/requirements.ts";
import {
  resolveAppliedMechanics,
  systemMechanicsConfigSchema,
  validatePersistedMechanicalEffects,
} from "../../domain/systemMechanics.ts";

// In-memory isolated database mock matching elementPersistence.test.ts pattern
const memory = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>,
}));

vi.mock("../index.ts", async () => {
  const { getTableName } = await import("drizzle-orm");
  const copy = (val: any) => JSON.parse(JSON.stringify(val));

  function evaluateSqlFilter(row: any, expr: any): boolean {
    if (!expr) return true;
    if (!expr.queryChunks) return true;
    const chunks = expr.queryChunks;

    if (chunks.length >= 4 && chunks[1] && chunks[1].name !== undefined) {
      const colName = chunks[1].name;
      const targetChunk = chunks[3];
      const targetVal =
        targetChunk &&
        typeof targetChunk === "object" &&
        "value" in targetChunk &&
        !Array.isArray(targetChunk.value)
          ? targetChunk.value
          : targetChunk;
      return row[colName] === targetVal;
    }

    let hasOr = false;
    let hasAnd = false;
    const subExprs: any[] = [];

    for (const chunk of chunks) {
      if (chunk && chunk.value && Array.isArray(chunk.value)) {
        const str = chunk.value.join("");
        if (str.includes(" or ")) hasOr = true;
        if (str.includes(" and ")) hasAnd = true;
      } else if (chunk && typeof chunk === "object" && chunk.queryChunks) {
        subExprs.push(chunk);
      }
    }

    if (subExprs.length === 1) {
      return evaluateSqlFilter(row, subExprs[0]);
    }
    if (hasOr) {
      return subExprs.some((sub) => evaluateSqlFilter(row, sub));
    }
    if (hasAnd) {
      return subExprs.every((sub) => evaluateSqlFilter(row, sub));
    }
    return false;
  }

  const db: any = {
    execute: async () => [],
    transaction: async (fn: any) => {
      const previous = copy(memory.tables);
      try {
        return await fn(db);
      } catch (error) {
        memory.tables = previous;
        throw error;
      }
    },
    select: () => ({
      from: (table: any) => {
        const getRows = () => copy(memory.tables[getTableName(table)] ?? []);
        return {
          where: (clause: any) => {
            const filtered = () => {
              const allRows = getRows();
              if (!clause) return allRows;
              return allRows.filter((r: any) => evaluateSqlFilter(r, clause));
            };
            return {
              limit: (n: number) => ({
                then: (fn: any) => Promise.resolve(filtered().slice(0, n)).then(fn),
              }),
              orderBy: () => filtered(),
              then: (fn: any) => Promise.resolve(filtered()).then(fn),
            };
          },
          limit: (n: number) => ({
            then: (fn: any) => Promise.resolve(getRows().slice(0, n)).then(fn),
          }),
          orderBy: () => getRows(),
          then: (fn: any) => Promise.resolve(getRows()).then(fn),
        };
      },
    }),
    insert: (table: any) => ({
      values: (payload: any) => {
        const executeInsert = async () => {
          const row = copy(payload);
          const name = getTableName(table);
          const tableRows = (memory.tables[name] ??= []);
          const conflictIdx = tableRows.findIndex(
            (r: any) =>
              (payload.id && r.id === payload.id) ||
              (payload.key && r.key === payload.key)
          );
          if (conflictIdx >= 0) {
            tableRows[conflictIdx] = { ...tableRows[conflictIdx], ...copy(payload) };
            return [copy(tableRows[conflictIdx])];
          }
          tableRows.push(row);
          return [copy(row)];
        };
        return {
          onConflictDoUpdate: () => ({
            returning: executeInsert,
            then: (fn: any) => executeInsert().then(fn),
          }),
          returning: executeInsert,
          then: (fn: any) => executeInsert().then(fn),
        };
      },
    }),
    update: (table: any) => ({
      set: (payload: any) => ({
        where: (clause: any) => {
          const executeUpdate = async () => {
            const name = getTableName(table);
            const rows = memory.tables[name] ?? [];
            const matchIdx = rows.findIndex((r: any) =>
              evaluateSqlFilter(r, clause)
            );
            if (matchIdx >= 0) {
              rows[matchIdx] = { ...rows[matchIdx], ...copy(payload) };
              return [copy(rows[matchIdx])];
            }
            return [];
          };
          return {
            returning: executeUpdate,
            then: (fn: any) => executeUpdate().then(fn),
          };
        },
      }),
    }),
    delete: (table: any) => ({
      where: (clause: any) => {
        const executeDelete = async () => {
          const name = getTableName(table);
          const rows = memory.tables[name] ?? [];
          if (!clause) {
            memory.tables[name] = [];
          } else {
            memory.tables[name] = rows.filter((r: any) => !evaluateSqlFilter(r, clause));
          }
        };
        return {
          then: (fn: any) => executeDelete().then(fn),
        };
      },
    }),
  };

  return { db };
});

// Import database functions after mocking
import { getElement, getElements, upsertElement } from "../elements.ts";
import { getRules } from "../rules.ts";

describe("Pruebas de Integración HTTP: POST /api/elements y Persistencia de Armas", () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeEach(() => {
    // Reset database state with core system mechanics
    memory.tables = {
      system_rules: [{ key: "system_mechanics", value: createCoreCategories() }],
      system_elements: [],
      audit_logs: [],
    };
  });

  // Setup real Express HTTP application with the exact route handler from server.ts
  beforeEach(async () => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware matching requireAuth and requireRole
    const mockAuthMiddleware = (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer test-token")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.user = { uid: "test-admin-uid", email: "admin@example.com" };
      req.dbUser = { uid: "test-admin-uid", role: "superadmin" };
      next();
    };

    // Mount exact route controller from server.ts
    app.post("/api/elements", mockAuthMiddleware, async (req: any, res: any) => {
      try {
        const ElementSchema = z.object({
          id: z.string().optional(),
          kind: z.enum([
            "trait", "weakness", "skill", "equipment", "weapon",
            "ammunition", "consumable", "license", "permission", "certification",
            "character_resource", "attribute_upgrade", "technique_entitlement",
            "altered_status", "plus_ultra_effect", "crafting_material", "ingredient",
            "background", "vehicle", "real_estate", "clandestine_asset",
          ]),
          name: z.string().min(1),
          description: z.string(),
          status: z.enum(["draft", "published", "archived"]).optional(),
          iconType: z.enum(["lucide", "emoji"]).nullable().optional(),
          iconValue: z.string().nullable().optional(),
          effects: z.array(z.any()).optional(),
          mechanicalBehaviors: z.array(z.any()).optional(),
          requirements: requirementGroupSchema.optional(),
          metadata: z.any().optional(),
        });

        const parsed = ElementSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid payload", details: parsed.error });
        }

        const effects = validatePersistedMechanicalEffects(parsed.data.effects ?? []);
        if (!effects.valid) {
          return res.status(400).json({
            error: "Invalid canonical mechanical effects",
            details: effects.errors,
          });
        }

        if (
          parsed.data.status === "published" &&
          (effects.legacyEffects.length || effects.canonicalEffects.length)
        ) {
          return res.status(400).json({
            error: "Sustituye los efectos anteriores por referencias antes de publicar",
          });
        }

        if (effects.appliedMechanics.length > 0) {
          const storedRules = await getRules();
          const storedMechanics = storedRules.find(
            (rule: any) => rule.key === "system_mechanics"
          )?.value;
          const mechanics = systemMechanicsConfigSchema.safeParse(storedMechanics);
          if (!mechanics.success) {
            return res.status(409).json({ error: "System mechanics are unavailable or invalid" });
          }
          const resolution = resolveAppliedMechanics(effects.appliedMechanics, mechanics.data);
          if (!resolution.valid) {
            return res.status(400).json({
              error: "Unknown or duplicate applied mechanic reference",
              details: resolution.issues,
            });
          }
        }

        const item = await upsertElement(parsed.data, req.dbUser?.uid);
        res.json(item);
      } catch (error: any) {
        res.status(error.status ?? 500).json({
          error: error.status ? error.message : error.message || "Failed to save element",
        });
      }
    });

    // Start ephemeral server on random available port
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server && server.close) {
      server.close();
    }
  });

  const authHeaders = {
    Authorization: "Bearer test-token-superadmin",
    "Content-Type": "application/json",
  };

  it("Caso A: Creación de borrador incompleto mediante POST /api/elements", async () => {
    const draftPayload = {
      kind: "weapon",
      name: "Borrador de Rifle Experimental",
      description: "Concepto narrativo de rifle sin mecánicas aún.",
      status: "draft",
      metadata: {
        designerNotes: "Pendiente definir calibre y tipo",
      },
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(draftPayload),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Borrador de Rifle Experimental");
    expect(body.description).toBe("Concepto narrativo de rifle sin mecánicas aún.");
    expect(body.status).toBe("draft");

    // Verificar en la base de datos persistida:
    const persisted = await getElement(body.id);
    expect(persisted).toBeDefined();
    expect(persisted!.name).toBe("Borrador de Rifle Experimental");
    expect(persisted!.description).toBe("Concepto narrativo de rifle sin mecánicas aún.");
    expect(persisted!.metadata).toEqual({ designerNotes: "Pendiente definir calibre y tipo" });
    // No se inventaron mecánicas ni comportamientos:
    expect(persisted!.mechanicalBehaviors).toEqual([]);
  });

  it("Caso B: Publicación inválida rechazada con HTTP 400 y sin inserción en BD", async () => {
    const invalidPublishPayload = {
      kind: "weapon",
      name: "Arma Incompleta Publicada Ilegalmente",
      description: "Intento de publicar sin tipo ni daño.",
      status: "published",
      metadata: {},
    };

    const countBefore = (await getElements()).length;

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(invalidPublishPayload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("tipo de arma");

    // Comprobar que no se haya insertado el registro en la base de datos:
    const countAfter = (await getElements()).length;
    expect(countAfter).toBe(countBefore);
  });

  it("Caso C: Edición inválida rechazada con HTTP 400 y conservación intacta del registro previo", async () => {
    // 1. Crear un arma válida en la base de datos
    const validWeapon = await upsertElement({
      kind: "weapon",
      name: "Revólver Clásico",
      description: "Arma de fuego reglamentaria.",
      status: "published",
      metadata: {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
        usesAmmo: true,
        magazineCapacity: 6,
      },
      mechanicalBehaviors: [
        {
          id: "b_atk",
          mode: "active",
          effects: [{ type: "damage", dice: "1D10", damageType: "fisico" }],
        },
      ],
    });

    expect(validWeapon.id).toBeDefined();

    // 2. Intentar actualización inválida (dado base incompatible D6 para arma de fuego)
    const invalidUpdatePayload = {
      id: validWeapon.id,
      kind: "weapon",
      name: "Revólver Modificado Ilegal",
      description: "Arma reglamentaria con cambio inválido.",
      status: "published",
      metadata: {
        baseDice: "D6",
      },
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(invalidUpdatePayload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("no coincide con el dado base canónico");

    // 3. Consultar la base de datos y demostrar que el registro previo permanece intacto
    const intactRecord = await getElement(validWeapon.id);
    expect(intactRecord!.name).toBe("Revólver Clásico");
    expect((intactRecord!.metadata as any)?.baseDice).toBe("D10");
    expect((intactRecord!.metadata as any)?.magazineCapacity).toBe(6);
    expect((intactRecord!.mechanicalBehaviors as any[])[0].effects[0].dice).toBe("1D10");
  });

  it("Caso D: Edición válida de borrador incompleto preserva campos no informados", async () => {
    // 1. Crear borrador con metadatos personalizados y descripción
    const initialDraft = await upsertElement({
      kind: "weapon",
      name: "Borrador Alfa",
      description: "Descripción narrativa inicial.",
      status: "draft",
      metadata: {
        author: "Investigador",
        note: "Conservar este campo",
      },
    });

    // 2. Enviar actualización vía HTTP que solo modifica el nombre
    const partialUpdatePayload = {
      id: initialDraft.id,
      kind: "weapon",
      name: "Borrador Alfa Revisado",
      description: "Descripción narrativa actualizada.",
      status: "draft",
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(partialUpdatePayload),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Borrador Alfa Revisado");

    // 3. Comprobar que en BD se conservan los campos previos no informados
    const updatedRecord = await getElement(initialDraft.id);
    expect(updatedRecord!.name).toBe("Borrador Alfa Revisado");
    expect(updatedRecord!.description).toBe("Descripción narrativa actualizada.");
    expect((updatedRecord!.metadata as any)?.author).toBe("Investigador");
    expect((updatedRecord!.metadata as any)?.note).toBe("Conservar este campo");
  });

  it("Caso E: Categorías no relacionadas (trait/equipment) se crean y editan sin alteración", async () => {
    const traitPayload = {
      kind: "trait",
      name: "Determinación Heroica",
      description: "Rasgo que aumenta la voluntad en momentos críticos.",
      status: "published",
      metadata: {},
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(traitPayload),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Determinación Heroica");
    expect(body.kind).toBe("trait");

    const persisted = await getElement(body.id);
    expect(persisted).toBeDefined();
    expect(persisted!.kind).toBe("trait");
    expect(persisted!.name).toBe("Determinación Heroica");
  });

  it("Caso F: Actualización con metadata parcial conserva campos previos no modificados", async () => {
    // 1. Crear un arma con metadatos completos
    const initialWeapon = await upsertElement({
      kind: "weapon",
      name: "Rifle de Precisión",
      description: "Rifle militar de largo alcance.",
      status: "draft",
      metadata: {
        weaponTypeId: "firearm",
        baseDice: "D10",
        damageModifier: "NONE",
        usesAmmo: true,
        magazineCapacity: 10,
        author: "Comandancia",
        notes: "Uso reservado",
      },
    });

    // 2. Enviar actualización vía HTTP con metadata parcial (solo modifica magazineCapacity)
    const partialUpdatePayload = {
      id: initialWeapon.id,
      kind: "weapon",
      name: "Rifle de Precisión Modificado",
      description: "Rifle militar de largo alcance.",
      status: "draft",
      metadata: {
        magazineCapacity: 20,
        customAttachment: "Silenciador",
      },
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(partialUpdatePayload),
    });

    expect(response.status).toBe(200);

    // 3. Comprobar que en BD se conservan los campos previos no informados y se actualizó magazineCapacity
    const updated = await getElement(initialWeapon.id);
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Rifle de Precisión Modificado");
    expect((updated!.metadata as any)?.weaponTypeId).toBe("firearm");
    expect((updated!.metadata as any)?.baseDice).toBe("D10");
    expect((updated!.metadata as any)?.damageModifier).toBe("NONE");
    expect((updated!.metadata as any)?.usesAmmo).toBe(true);
    expect((updated!.metadata as any)?.author).toBe("Comandancia");
    expect((updated!.metadata as any)?.notes).toBe("Uso reservado");
    expect((updated!.metadata as any)?.magazineCapacity).toBe(20);
    expect((updated!.metadata as any)?.customAttachment).toBe("Silenciador");
  });

  it("Caso G: Actualización con propiedad explícitamente null elimina la propiedad del objeto metadata", async () => {
    // 1. Crear elemento con propiedad transitoria
    const initial = await upsertElement({
      kind: "weapon",
      name: "Prototipo Láser",
      description: "Arma experimental.",
      status: "draft",
      metadata: {
        weaponTypeId: "firearm",
        baseDice: "D10",
        temporaryTag: "experimental-v1",
        keepMe: "permanente",
      },
    });

    // 2. Enviar actualización que elimina temporaryTag mediante null
    const deletePropPayload = {
      id: initial.id,
      kind: "weapon",
      name: "Prototipo Láser",
      description: "Arma experimental.",
      status: "draft",
      metadata: {
        temporaryTag: null,
      },
    };

    const response = await fetch(`${baseUrl}/api/elements`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(deletePropPayload),
    });

    expect(response.status).toBe(200);

    const updated = await getElement(initial.id);
    expect(updated).toBeDefined();
    expect((updated!.metadata as any)).not.toHaveProperty("temporaryTag");
    expect((updated!.metadata as any)?.keepMe).toBe("permanente");
    expect((updated!.metadata as any)?.weaponTypeId).toBe("firearm");
    expect((updated!.metadata as any)?.baseDice).toBe("D10");
  });
});
