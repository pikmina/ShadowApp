import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreCategories } from "../../domain/coreRuleCatalog.ts";
import { upsertElement } from "../elements.ts";
import { consumeCharacterAmmunition } from "../characters.ts";
import { resolveAmmunitionStock } from "../../domain/ammunition.ts";

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
      const val = row[colName] !== undefined
        ? row[colName]
        : row[colName.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase())];
      return val === targetVal;
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
              const updatedPayload = { ...copy(payload) };
              for (const [k, v] of Object.entries(payload)) {
                const camel = k.replace(/_([a-z])/g, (_: any, c: string) => c.toUpperCase());
                const snake = k.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
                updatedPayload[camel] = v;
                updatedPayload[snake] = v;
              }
              rows[matchIdx] = { ...rows[matchIdx], ...updatedPayload };
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
        const name = getTableName(table);
        const rows = memory.tables[name] ?? [];
        memory.tables[name] = rows.filter((r: any) => !evaluateSqlFilter(r, clause));
        return Promise.resolve();
      },
    }),
  };

  return { db, pool: { query: async () => ({ rows: [] }) } };
});

describe("Ammunition Integration & Persistence Tests", () => {
  beforeEach(() => {
    memory.tables = {
      system_rules: [
        {
          id: "system_mechanics",
          key: "system_mechanics",
          name: "System Mechanics Config",
          category: "mechanics",
          version: 1,
          isSystem: true,
          content: createCoreCategories(),
        },
      ],
      system_elements: [],
      element_possessions: [],
      audit_logs: [],
    };
  });

  it("creates a published ammunition item in catalog and persists all mechanical fields", async () => {
    const ammoPayload = {
      name: "Munición 9mm Parabellum",
      description: "Caja metálica de 30 proyectiles de punta ojival.",
      kind: "ammunition" as const,
      status: "published" as const,
      metadata: {
        caliberName: "9mm",
        weaponTypeId: "firearm",
        boxQuantity: 30,
        damageBonus: 1,
        mechanicalDescription: "Calibre 9mm. Compatible con Arma de fuego. 30 balas por caja. Bono de daño: +1.",
      },
    };

    const saved = await upsertElement(ammoPayload, "mod-uid-1");
    expect(saved).toBeDefined();
    expect(saved.id).toBeDefined();
    expect(saved.kind).toBe("ammunition");
    expect(saved.status).toBe("published");
    const meta = (saved.metadata || {}) as any;
    expect(meta.caliberName).toBe("9mm");
    expect(meta.weaponTypeId).toBe("firearm");
    expect(meta.boxQuantity).toBe(30);
    expect(meta.damageBonus).toBe(1);
    expect(meta.mechanicalDescription).toBe(
      "Calibre 9mm. Compatible con Arma de fuego. 30 balas por caja. Bono de daño: +1."
    );
  });

  it("rejects incomplete published ammunition while allowing incomplete drafts", async () => {
    // 1. Incomplete draft succeeds
    const draft = await upsertElement(
      {
        name: "Prototipo de bala",
        description: "Borrador sin calibre ni arma asociada",
        kind: "ammunition" as const,
        status: "draft" as const,
        metadata: {},
      },
      "mod-uid-1"
    );
    expect(draft.id).toBeDefined();
    expect(draft.status).toBe("draft");

    // 2. Incomplete published fails with 400
    await expect(
      upsertElement(
        {
          name: "Bala Incompleta",
          description: "Le faltan campos requeridos",
          kind: "ammunition" as const,
          status: "published" as const,
          metadata: {},
        },
        "mod-uid-1"
      )
    ).rejects.toThrow(/Error de validación semántica en munición/);
  });

  it("persists character stock independently and consumes 1 bullet per shot without altering catalog", async () => {
    // 1. Create ammunition in catalog
    const ammo = await upsertElement(
      {
        name: "Cartuchos .45 ACP",
        description: "Caja de 30 balas estándar de pistola pesada.",
        kind: "ammunition" as const,
        status: "published" as const,
        metadata: {
          caliberName: ".45 ACP",
          weaponTypeId: "firearm",
          boxQuantity: 30,
          damageBonus: 0,
        },
      },
      "mod-uid-1"
    );

    // 2. Give 1 box to character 42 in element_possessions
    const initialChoices = { remainingBullets: 30 };
    memory.tables["element_possessions"].push({
      id: "pos-ammo-42",
      characterId: 42,
      elementId: ammo.id,
      quantity: 1,
      equipped: false,
      notes: null,
      selectedChoices: initialChoices,
    });

    // 3. Fire 5 shots (consume 1 bullet 5 times)
    for (let i = 0; i < 5; i++) {
      const res = await consumeCharacterAmmunition(42, ammo.id, 1);
      expect(res.success).toBe(true);
      expect(res.remainingBullets).toBe(30 - (i + 1));
      expect(res.isExhausted).toBe(false);
    }

    // Verify state after 5 shots
    const posAfter5 = memory.tables["element_possessions"].find((p: any) => p.id === "pos-ammo-42");
    expect(posAfter5.selectedChoices.remainingBullets).toBe(25);

    // Verify catalog element was untouched
    const catalogElem = memory.tables["system_elements"].find((e: any) => e.id === ammo.id);
    expect(catalogElem.metadata.boxQuantity).toBe(30);

    // 4. Fire 25 more shots
    const res25 = await consumeCharacterAmmunition(42, ammo.id, 25);
    expect(res25.remainingBullets).toBe(0);
    expect(res25.isExhausted).toBe(true);

    const posFinal = memory.tables["element_possessions"].find((p: any) => p.id === "pos-ammo-42");
    expect(posFinal.selectedChoices.remainingBullets).toBe(0);

    // 5. Trying to consume another bullet throws because stock is 0
    await expect(consumeCharacterAmmunition(42, ammo.id, 1)).rejects.toThrow(/Munición insuficiente/);
    expect(posFinal.selectedChoices.remainingBullets).toBe(0);

    // 6. Test stock resolver reflects the exhausted state
    const resolvedStock = resolveAmmunitionStock(posFinal, catalogElem);
    expect(resolvedStock.remainingBullets).toBe(0);
    expect(resolvedStock.isExhausted).toBe(true);
    expect(resolvedStock.displayStock).toBe("0/30 balas");
  });
});
