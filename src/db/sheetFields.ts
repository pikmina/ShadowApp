import { db } from './index.ts';
import { characterSheetFields, characters, auditLogs } from './schema.ts';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  coreProfileFields,
  coreProfileKeys,
  normalizedFieldName,
} from '../domain/coreProfileFields.ts';

export async function seedCoreProfileFields() {
  await db.transaction(async tx => {
    const existing = await tx.select().from(characterSheetFields);

    const profiles = await tx
      .select({ profileData: characters.profileData })
      .from(characters);

    const claimed = new Set(
      existing
        .filter(field => field.coreKey)
        .map(field => field.id)
    );

    for (const [index, definition] of coreProfileFields.entries()) {
      const compatible = (field: typeof existing[number]) =>
        field.type === definition.type ||
        (definition.type === 'text' && field.type === 'select') ||
        (definition.type === 'select' && field.type === 'select');

      const legacy = existing.find(
        field =>
          field.id !== definition.key &&
          !claimed.has(field.id) &&
          compatible(field) &&
          definition.aliases.some(
            alias =>
              normalizedFieldName(alias) ===
              normalizedFieldName(field.name)
          )
      );

      const current = existing.find(
        field => field.coreKey === definition.key
      );

      /*
       * Si el campo core ya existe, sincronizamos sus propiedades
       * estructurales con la definición canónica.
       */
      if (current) {
        // El tipo del campo core debe coincidir siempre con
        // coreProfileFields.
        if (current.type !== definition.type) {
          await tx
            .update(characterSheetFields)
            .set({
              type: definition.type,
              updatedAt: new Date(),
            })
            .where(eq(characterSheetFields.id, current.id));
        }

        // Si la definición canónica tiene opciones y el campo actual
        // todavía no las tiene, las añadimos.
        if (
          ('options' in definition && definition.options) &&
          (!Array.isArray(current.options) || current.options.length === 0)
        ) {
          await tx
            .update(characterSheetFields)
            .set({
              options: [...definition.options],
              updatedAt: new Date(),
            })
            .where(eq(characterSheetFields.id, current.id));
        }

        // Sincronizamos la categoría cuando el campo todavía utiliza
        // la categoría genérica.
        if (
          ('category' in definition && definition.category) &&
          (!current.category || current.category === 'Datos Básicos')
        ) {
          await tx
            .update(characterSheetFields)
            .set({
              category: definition.category,
              updatedAt: new Date(),
            })
            .where(eq(characterSheetFields.id, current.id));
        }

        // Compatibilidad con el orden legacy de Nivel de Quirk.
        if (
          definition.key === 'quirk_level' &&
          current.order === 90
        ) {
          await tx
            .update(characterSheetFields)
            .set({
              order: 15,
              updatedAt: new Date(),
            })
            .where(eq(characterSheetFields.id, current.id));
        }

        /*
         * Reconciliación legacy.
         *
         * Si existe un campo antiguo equivalente y no hay conflicto
         * entre los datos almacenados, trasladamos el coreKey al campo
         * legacy y eliminamos el duplicado canónico.
         */
        if (
          current.id === definition.key &&
          legacy &&
          profiles.every(row => {
            const profile = (row.profileData ?? {}) as Record<
              string,
              unknown
            >;

            return (
              profile[current.id] === undefined ||
              profile[legacy.id] === undefined ||
              JSON.stringify(profile[current.id]) ===
                JSON.stringify(profile[legacy.id])
            );
          })
        ) {
          await tx
            .update(characterSheetFields)
            .set({ coreKey: null })
            .where(eq(characterSheetFields.id, current.id));

          await tx
            .update(characterSheetFields)
            .set({ coreKey: definition.key })
            .where(eq(characterSheetFields.id, legacy.id));

          await tx
            .delete(characterSheetFields)
            .where(eq(characterSheetFields.id, current.id));

          claimed.add(legacy.id);
        }

        continue;
      }

      /*
       * Si todavía no existe un campo identificado por coreKey,
       * buscamos un campo legacy compatible por ID/nombre.
       */
      const match = existing.find(
        field =>
          !claimed.has(field.id) &&
          (
            field.id === definition.key ||
            (
              compatible(field) &&
              definition.aliases.some(
                alias =>
                  normalizedFieldName(alias) ===
                  normalizedFieldName(field.name)
              )
            )
          )
      );

      if (match) {
        const updateData: Record<string, unknown> = {
          coreKey: definition.key,
        };

        if (
          ('options' in definition && definition.options) &&
          (!Array.isArray(match.options) || match.options.length === 0)
        ) {
          updateData.options = [...definition.options];
        }

        if (
          ('category' in definition && definition.category) &&
          (!match.category || match.category === 'Datos Básicos')
        ) {
          updateData.category = definition.category;
        }

        await tx
          .update(characterSheetFields)
          .set(updateData)
          .where(eq(characterSheetFields.id, match.id));

        claimed.add(match.id);
      } else {
        /*
         * No existe ningún campo actual ni legacy:
         * creamos el campo directamente desde la definición canónica.
         */
        const defCategory =
          ('category' in definition && definition.category)
            ? definition.category
            : 'Datos Básicos';

        const defOptions =
          ('options' in definition && definition.options)
            ? [...definition.options]
            : [];

        await tx
          .insert(characterSheetFields)
          .values({
            id: definition.key,
            coreKey: definition.key,
            name: definition.name,
            type: definition.type,
            category: defCategory,
            options: defOptions,
            order: index * 10,
          })
          .onConflictDoNothing();
      }
    }
  });
}

export async function getSheetFields() {
  try {
    return await db
      .select()
      .from(characterSheetFields)
      .orderBy(asc(characterSheetFields.order));
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Failed to fetch sheet fields', { cause: error });
  }
}

export async function upsertSheetField(data: any, actorUid?: string) {
  try {
    let id = data.id;

    if (!id) {
      id = nanoid(10);

      const result = await db
        .insert(characterSheetFields)
        .values({
          id,
          name: data.name,
          type: data.type,
          category: data.category,
          options: data.options || [],
          order: data.order || 0,
        })
        .returning();

      if (actorUid) {
        await db.insert(auditLogs).values({
          actorUid,
          actionType: 'sheet_field_created',
          targetId: id,
          details: {
            name: data.name,
            type: data.type,
            category: data.category,
          },
        });
      }

      return result[0];
    } else {
      const [existing] = await db
        .select()
        .from(characterSheetFields)
        .where(eq(characterSheetFields.id, id));

      if (!existing) {
        throw Object.assign(
          new Error('Field not found'),
          { status: 404 }
        );
      }

      if (existing.coreKey && data.type !== existing.type) {
        throw Object.assign(
          new Error('El tipo de un campo básico no puede cambiarse'),
          { status: 409 }
        );
      }

      const result = await db
        .update(characterSheetFields)
        .set({
          name: data.name,
          type: data.type,
          category: data.category,
          options: data.options,
          order: data.order,
          updatedAt: new Date(),
        })
        .where(eq(characterSheetFields.id, id))
        .returning();

      if (actorUid) {
        await db.insert(auditLogs).values({
          actorUid,
          actionType: 'sheet_field_updated',
          targetId: id,
          details: {
            name: data.name,
            previousName: existing.name,
            type: data.type,
            category: data.category,
          },
        });
      }

      return result[0];
    }
  } catch (error) {
    if ((error as any)?.status) {
      throw error;
    }

    console.error('Database query failed:', error);
    throw new Error('Failed to upsert sheet field', { cause: error });
  }
}

export async function deleteSheetField(
  id: string,
  actorUid?: string
) {
  try {
    const [existing] = await db
      .select()
      .from(characterSheetFields)
      .where(eq(characterSheetFields.id, id));

    if (existing?.coreKey || coreProfileKeys.has(id)) {
      throw Object.assign(
        new Error('Este campo básico no se puede eliminar'),
        { status: 409 }
      );
    }

    await db
      .delete(characterSheetFields)
      .where(eq(characterSheetFields.id, id));

    if (actorUid && existing) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'sheet_field_deleted',
        targetId: id,
        details: {
          name: existing.name,
          category: existing.category,
        },
      });
    }
  } catch (error) {
    if ((error as any)?.status) {
      throw error;
    }

    console.error('Database query failed:', error);
    throw new Error('Failed to delete sheet field', { cause: error });
  }
}