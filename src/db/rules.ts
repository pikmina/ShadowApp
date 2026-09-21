import { assertElementMechanics, validateElementMechanics } from "../domain/elementMechanics.ts";
import { migrateCoreCategories, validateCoreCategories } from "../domain/coreRuleCatalog.ts";
import { systemMechanicsConfigSchema } from "../domain/systemMechanics.ts";
import { systemElements, auditLogs } from "./schema.ts";
import { db } from './index.ts';
import { systemRules } from './schema.ts';
import { eq, sql } from 'drizzle-orm';
import { defaultEmploymentCompensation, employmentCompensationSchema } from '../domain/employmentCompensation.ts';

export async function getRules() {
  try {
    return await db.select().from(systemRules);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch rules", { cause: error });
  }
}

export async function getRule(key: string) {
  try {
    const results = await db.select().from(systemRules).where(eq(systemRules.key, key));
    return results[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch rule", { cause: error });
  }
}

export async function upsertRule(key: string, type: string, value: any, description: string, actorUid?: string) {
  try {
    if (key === 'employment_compensation') value = employmentCompensationSchema.parse(value);
    if (key === 'system_mechanics') {
      const parsed = systemMechanicsConfigSchema.parse(value);
      if (!validateCoreCategories(parsed)) throw new Error('Core categories are required');
      return await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(72643001)`);
        const elements = await tx.select({ id: systemElements.id, name: systemElements.name, effects: systemElements.effects, status: systemElements.status }).from(systemElements);
        const [currentRule] = await tx.select().from(systemRules).where(eq(systemRules.key, "system_mechanics"));
        const existingMechanics = currentRule?.value && Array.isArray(currentRule.value) ? (currentRule.value as any[]) : [];
        const missingRuleReferences = new Map<string, { mechanicId: string; ruleId: string; elements: Set<string> }>();
        const registerMissing = (mechanicId: string, ruleId: string, elemName: string) => {
          if (!mechanicId || !ruleId) return;
          if (!parsed.some(c => c.id === mechanicId && c.rules.some(r => r.id === ruleId))) {
            const mapKey = `${mechanicId}:${ruleId}`;
            let entry = missingRuleReferences.get(mapKey);
            if (!entry) {
              entry = { mechanicId, ruleId, elements: new Set() };
              missingRuleReferences.set(mapKey, entry);
            }
            entry.elements.add(elemName);
          }
        };

        for (const element of elements) {
          const elemName = element.name ? `"${element.name}"` : `ID ${element.id}`;
          for (const ref of Array.isArray(element.effects) ? (element.effects as any[]) : []) {
            if (ref?.mechanicId && ref?.ruleId) {
              registerMissing(ref.mechanicId, ref.ruleId, elemName);
            }
            if (Array.isArray(ref?.costRules)) {
              for (const cr of ref.costRules) {
                if (cr?.mechanicId && cr?.ruleId) {
                  registerMissing(cr.mechanicId, cr.ruleId, elemName);
                }
              }
            }
          }
        }

        if (missingRuleReferences.size > 0) {
          const entries = Array.from(missingRuleReferences.values());
          if (entries.length === 1) {
            const entry = entries[0];
            const prevCat = existingMechanics.find(c => c.id === entry.mechanicId);
            const prevRule = prevCat?.rules?.find((r: any) => r.id === entry.ruleId);
            const ruleName = prevRule?.name ? `"${prevRule.name}" (${entry.ruleId})` : `"${entry.ruleId}"`;
            const catName = prevCat?.name ? `"${prevCat.name}"` : `"${entry.mechanicId}"`;
            const elementList = Array.from(entry.elements).join(", ");
            throw Object.assign(
              new Error(`No se puede eliminar la opción ${ruleName} de la categoría ${catName} porque está siendo utilizada por los siguientes elementos:\n• ${elementList}`),
              { status: 409 }
            );
          } else {
            const items = entries.map(entry => {
              const prevCat = existingMechanics.find(c => c.id === entry.mechanicId);
              const prevRule = prevCat?.rules?.find((r: any) => r.id === entry.ruleId);
              const ruleName = prevRule?.name ? `"${prevRule.name}" (${entry.ruleId})` : `"${entry.ruleId}"`;
              const catName = prevCat?.name ? `"${prevCat.name}"` : `"${entry.mechanicId}"`;
              const elementList = Array.from(entry.elements).join(", ");
              return `• Opción ${ruleName} (${catName}) usada por: ${elementList}`;
            });
            throw Object.assign(
              new Error(`No se pueden eliminar las opciones porque están siendo utilizadas por los siguientes elementos:\n${items.join("\n")}`),
              { status: 409 }
            );
          }
        }

        for (const element of elements) {
          const issues = validateElementMechanics(element.effects as unknown[], element.status === 'published' ? 'draft' : element.status, parsed);
          if (issues.length) {
            const elemName = element.name ? `"${element.name}"` : `ID ${element.id}`;
            throw Object.assign(new Error(`Conflicto de validación con el elemento ${elemName}: ${issues.join('; ')}`), { status: 409 });
          }
        }
        const result = await tx.insert(systemRules).values({ key, type, value: parsed, description }).onConflictDoUpdate({ target: systemRules.key, set: { type, value: parsed, description, updatedAt: new Date() } }).returning();
        
        if (actorUid && actorUid !== 'system_seed') {
          await tx.insert(auditLogs).values({
            actorUid,
            actionType: 'rule_updated',
            targetId: key,
            details: {
              key,
              type,
              description,
            },
          });
        }

        return result[0];
      });
    }
    const existing = await getRule(key);
    const result = await db.insert(systemRules)
      .values({ key, type, value, description })
      .onConflictDoUpdate({
        target: systemRules.key,
        set: { type, value, description, updatedAt: new Date() }
      })
      .returning();

    if (actorUid && actorUid !== 'system_seed') {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: existing ? 'rule_updated' : 'rule_created',
        targetId: key,
        details: {
          key,
          type,
          description,
        },
      });
    }

    return result[0];
  } catch (error) {
    if (error instanceof Error && "status" in error) throw error;
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert rule", { cause: error });
  }
}

export async function deleteRule(key: string, actorUid?: string) {
  if (["system_mechanics", "stamina_execution_costs", "employment_compensation"].includes(key)) throw new Error("Core rules cannot be deleted");
  try {
    const [existing] = await db.select().from(systemRules).where(eq(systemRules.key, key));
    await db.delete(systemRules).where(eq(systemRules.key, key));

    if (actorUid) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'rule_deleted',
        targetId: key,
        details: {
          key,
          description: existing?.description,
        },
      });
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete rule", { cause: error });
  }
}

/** Idempotent startup migration, serialized with rule writes; never invoked by GET. */
export async function seedCoreRules() {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(72643001)`);
    const [stored] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_mechanics'));
    const value = migrateCoreCategories(stored?.value);
    if (!stored || JSON.stringify(stored.value) !== JSON.stringify(value)) {
      await tx.insert(systemRules).values({ key: 'system_mechanics', type: 'json', value, description: 'Motor universal de reglas' }).onConflictDoUpdate({ target: systemRules.key, set: { value, updatedAt: new Date() } });
    }
    await tx.insert(systemRules).values({
      key: 'employment_compensation', type: 'json', value: defaultEmploymentCompensation,
      description: 'Tablas de remuneración por nivel y riesgo para empleos',
    }).onConflictDoNothing();
    await tx.insert(systemRules).values({
      key: 'max_purchased_attributes', type: 'number', value: 5,
      description: 'Límite máximo de mejoras de atributo comprables por personaje',
    }).onConflictDoNothing();
    await tx.insert(systemElements).values({ id: 'core.status.stunned', kind: 'altered_status', name: 'Aturdido', description: 'Estado Aturdido. La resolución específica se configura en el catálogo.', status: 'draft', effects: [] }).onConflictDoNothing();
  });
}
