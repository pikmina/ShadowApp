import { db } from './index.ts';
import { shopOffers, systemElements, characters, elementPossessions, auditLogs, systemRules } from './schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { evaluateRequirements, requirementGroupSchema } from '../domain/requirements.ts';
import { calculateProgressionCost } from '../domain/progressionCosts.ts';

export async function getShopOffers() {
  try {
    const offers = await db.select().from(shopOffers).leftJoin(systemElements, eq(shopOffers.elementId, systemElements.id));
    return offers;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch shop offers", { cause: error });
  }
}

export async function upsertShopOffer(data: any, actorUid?: string) {
  try {
    let id = data.id;
    const globalStock = data.globalStock !== undefined && data.globalStock !== "" ? Number(data.globalStock) : null;
    const perCharacterLimit = data.perCharacterLimit !== undefined && data.perCharacterLimit !== "" ? Number(data.perCharacterLimit) : null;

    if (!id) {
      id = nanoid(10);
      const result = await db.insert(shopOffers).values({
        id,
        elementId: data.elementId,
        status: data.status || 'draft',
        prices: data.prices || [],
        requirements: data.requirements ?? { operator: 'all', requirements: [] },
        globalStock,
        perCharacterLimit,
      }).returning();

      if (actorUid) {
        await db.insert(auditLogs).values({
          actorUid,
          actionType: 'shop_offer_created',
          targetId: id,
          details: {
            elementId: data.elementId,
            status: data.status || 'draft',
            prices: data.prices || [],
            requirements: data.requirements ?? { operator: 'all', requirements: [] },
            globalStock,
            perCharacterLimit,
          },
        });
      }

      return result[0];
    } else {
      const [existing] = await db.select().from(shopOffers).where(eq(shopOffers.id, id));
      const result = await db.update(shopOffers).set({
        elementId: data.elementId,
        status: data.status,
        prices: data.prices,
        requirements: data.requirements !== undefined ? data.requirements : existing?.requirements,
        globalStock,
        perCharacterLimit,
        updatedAt: new Date(),
      }).where(eq(shopOffers.id, id)).returning();

      if (actorUid) {
        await db.insert(auditLogs).values({
          actorUid,
          actionType: 'shop_offer_updated',
          targetId: id,
          details: {
            elementId: data.elementId,
            status: data.status,
            previousStatus: existing?.status,
            prices: data.prices,
            requirements: data.requirements,
            globalStock,
            perCharacterLimit,
          },
        });
      }

      return result[0];
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert shop offer", { cause: error });
  }
}

export async function deleteShopOffer(id: string, actorUid?: string) {
  try {
    const [existing] = await db.select().from(shopOffers).where(eq(shopOffers.id, id));
    await db.delete(shopOffers).where(eq(shopOffers.id, id));

    if (actorUid && existing) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'shop_offer_deleted',
        targetId: id,
        details: {
          elementId: existing.elementId,
          status: existing.status,
        },
      });
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete shop offer", { cause: error });
  }
}

export async function processPurchase(moderatorUid: string, characterId: number, cartItems: any[]) {
  return await db.transaction(async (tx) => {
    // 1. Get Character
    const [character] = await tx.select().from(characters)
      .where(eq(characters.id, characterId));
      
    if (!character) throw new Error("Character not found");

    let totalExp = 0;
    let totalYen = 0;
    const auditDetails: any[] = [];
    const possessionsToAdd: Record<string, number> = {}; // track standard items by elementId
    const progressionUpdates: Record<string, number> = {}; // track progression items by elementId -> target level
    const attributeUpdates: Record<string, number> = {}; // track attribute updates e.g. FUE -> target level

    const currentPossessions = await tx.select().from(elementPossessions).where(eq(elementPossessions.characterId, characterId));
    const possessionContext = new Map(currentPossessions.map(item => [item.elementId, {
      quantity: item.quantity,
      selectedChoices: item.selectedChoices as Record<string, unknown>,
    }]));
    const [stagesRule] = await tx.select().from(systemRules).where(eq(systemRules.key, 'system_stages'));
    const stageIds = Array.isArray(stagesRule?.value) ? (stagesRule.value as any[]).map(stage => String(stage.id ?? stage.name)) : [];

    for (const item of cartItems) {
      const { offerId, quantity = 1, selectedCurrency, fromLevel, toLevel } = item;
      
      if (selectedCurrency !== 'exp' && selectedCurrency !== 'yen') {
        throw new Error(`Invalid currency: ${selectedCurrency}`);
      }

      // Need to lock the row for the offer
      const [offer] = await tx.select().from(shopOffers).where(eq(shopOffers.id, offerId));
      if (!offer) throw new Error(`Offer ${offerId} not found`);
      
      const [element] = await tx.select().from(systemElements).where(eq(systemElements.id, offer.elementId));
      if (!element || element.status !== 'published') {
         throw new Error(`Element for offer ${offerId} is not published`);
      }
      const requirements = requirementGroupSchema.parse(offer.requirements ?? { operator: 'all', requirements: [] });
      const evaluation = evaluateRequirements(requirements, {
        profile: (character.profileData ?? {}) as Record<string, unknown>,
        possessions: possessionContext,
        stageIds,
      });
      if (!evaluation.passed) throw new Error(`Requisitos no cumplidos para ${element.name}: ${evaluation.failures.join(', ')}`);
      
      if (offer.status !== 'available') throw new Error(`Offer ${offerId} is not available`);

      const isProgression = fromLevel !== undefined && toLevel !== undefined;

      if (isProgression) {
        if (!Number.isInteger(fromLevel) || fromLevel < 0) {
          throw new Error(`Invalid fromLevel: ${fromLevel}`);
        }
        if (!Number.isInteger(toLevel) || toLevel <= fromLevel) {
          throw new Error(`Invalid toLevel: ${toLevel} (must be greater than fromLevel ${fromLevel})`);
        }

        const maxLevel = Number((element.metadata as any)?.maxLevel) || (element.kind === 'attribute_upgrade' ? 10 : 5);
        if (toLevel > maxLevel) {
          throw new Error(`toLevel ${toLevel} exceeds maximum level of ${maxLevel} for ${element.name}`);
        }

        const price = (offer.prices as any[]).find((p: any) => p.currency === selectedCurrency);
        const baseCost = Number((element.metadata as any)?.baseExpCost) || (price ? price.amount : 0);
        if (baseCost <= 0) {
          throw new Error(`No valid base cost configured for progression element ${element.name}`);
        }

        const progressionCost = calculateProgressionCost(baseCost, fromLevel, toLevel);

        if (selectedCurrency === 'exp') {
          totalExp += progressionCost;
        } else {
          totalYen += progressionCost;
        }

        progressionUpdates[offer.elementId] = toLevel;
        possessionContext.set(offer.elementId, {
          quantity: toLevel,
          selectedChoices: possessionContext.get(offer.elementId)?.selectedChoices ?? {},
        });

        if (element.kind === 'attribute_upgrade') {
          const attrId = (element.metadata as any)?.attributeId || 'FUE';
          attributeUpdates[attrId] = toLevel;
        }

        auditDetails.push({
          offerId,
          elementId: offer.elementId,
          fromLevel,
          toLevel,
          cost: progressionCost,
          currency: selectedCurrency,
          isProgression: true
        });

      } else {
        // Standard item purchase
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity: ${quantity}`);
        }

        if (offer.perCharacterLimit !== null) {
          // Find existing possessions for this element
          const [existingPos] = await tx.select().from(elementPossessions).where(and(
            eq(elementPossessions.characterId, characterId),
            eq(elementPossessions.elementId, offer.elementId)
          ));
          const currentAmount = existingPos ? existingPos.quantity : 0;
          const pendingAdded = possessionsToAdd[offer.elementId] || 0;
          if (currentAmount + pendingAdded + quantity > offer.perCharacterLimit) {
            throw new Error(`Per-character limit exceeded for offer ${offerId}. Limit is ${offer.perCharacterLimit}.`);
          }
        }

        const price = (offer.prices as any[]).find((p: any) => p.currency === selectedCurrency);
        if (!price) throw new Error(`Price in ${selectedCurrency} not found for offer ${offerId}`);
        if (!Number.isInteger(price.amount) || price.amount < 0) throw new Error(`Invalid price on offer ${offerId}`);

        if (offer.globalStock !== null) {
          if (offer.globalStock < quantity) throw new Error(`Not enough global stock for offer ${offerId}`);
          
          // Decrement stock
          const updateResult = await tx.update(shopOffers)
            .set({ globalStock: sql`global_stock - ${quantity}` })
            .where(and(
               eq(shopOffers.id, offerId),
               sql`global_stock >= ${quantity}`
            )).returning();
            
          if (updateResult.length === 0) {
              throw new Error(`Concurrent modification or stock depleted for offer ${offerId}`);
          }
        }

        if (selectedCurrency === 'exp') {
          totalExp += price.amount * quantity;
        } else if (selectedCurrency === 'yen') {
          totalYen += price.amount * quantity;
        }

        possessionsToAdd[offer.elementId] = (possessionsToAdd[offer.elementId] || 0) + quantity;
        possessionContext.set(offer.elementId, {
          quantity: (possessionContext.get(offer.elementId)?.quantity ?? 0) + quantity,
          selectedChoices: possessionContext.get(offer.elementId)?.selectedChoices ?? {},
        });

        auditDetails.push({
          offerId,
          elementId: offer.elementId,
          quantity,
          cost: price.amount * quantity,
          currency: selectedCurrency
        });
      }
    }

    if (character.exp < totalExp) {
      throw new Error(`Not enough EXP. Need ${totalExp}, has ${character.exp}`);
    }
    if (character.yen < totalYen) {
      throw new Error(`Not enough Yen. Need ${totalYen}, has ${character.yen}`);
    }

    // 3. Deduct Currencies safely
    const charUpdatePayload: any = {
      exp: sql`exp - ${totalExp}`,
      yen: sql`yen - ${totalYen}`,
      updatedAt: new Date()
    };

    if (Object.keys(attributeUpdates).length > 0) {
      charUpdatePayload.profileData = {
        ...((character.profileData as Record<string, any>) || {}),
        ...attributeUpdates
      };
    }

    const charUpdate = await tx.update(characters)
      .set(charUpdatePayload)
      .where(and(
        eq(characters.id, characterId),
        sql`exp >= ${totalExp}`,
        sql`yen >= ${totalYen}`
      )).returning();
      
    if (charUpdate.length === 0) {
        throw new Error("Concurrent character update or insufficient funds.");
    }

    // 4. Add or Update Possessions
    for (const [elementId, targetLevel] of Object.entries(progressionUpdates)) {
      await tx.insert(elementPossessions).values({
        id: nanoid(10),
        characterId,
        elementId,
        quantity: targetLevel,
        acquiredAt: new Date()
      }).onConflictDoUpdate({
        target: [elementPossessions.characterId, elementPossessions.elementId],
        set: { quantity: targetLevel }
      });
    }

    for (const [elementId, quantity] of Object.entries(possessionsToAdd)) {
      await tx.insert(elementPossessions).values({
        id: nanoid(10),
        characterId,
        elementId,
        quantity,
        acquiredAt: new Date()
      }).onConflictDoUpdate({
        target: [elementPossessions.characterId, elementPossessions.elementId],
        set: { quantity: sql`${elementPossessions.quantity} + ${quantity}` }
      });
    }

    // 5. Log Audit
    await tx.insert(auditLogs).values({
      actorUid: moderatorUid,
      actionType: 'shop_purchase',
      targetId: characterId.toString(),
      details: {
        totalExp,
        totalYen,
        items: auditDetails
      }
    });

    return { success: true, totalExp, totalYen };
  });
}
