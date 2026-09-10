import { db } from './index.ts';
import { shopOffers, systemElements, characters, elementPossessions, auditLogs } from './schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function getShopOffers() {
  try {
    const offers = await db.select().from(shopOffers).leftJoin(systemElements, eq(shopOffers.elementId, systemElements.id));
    return offers;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to fetch shop offers", { cause: error });
  }
}

export async function upsertShopOffer(data: any) {
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
        globalStock,
        perCharacterLimit,
      }).returning();
      return result[0];
    } else {
      const result = await db.update(shopOffers).set({
        elementId: data.elementId,
        status: data.status,
        prices: data.prices,
        globalStock,
        perCharacterLimit,
        updatedAt: new Date(),
      }).where(eq(shopOffers.id, id)).returning();
      return result[0];
    }
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to upsert shop offer", { cause: error });
  }
}

export async function deleteShopOffer(id: string) {
  try {
    await db.delete(shopOffers).where(eq(shopOffers.id, id));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete shop offer", { cause: error });
  }
}

export async function processPurchase(moderatorUid: string, characterId: number, cartItems: any[]) {
  return await db.transaction(async (tx) => {
    // 1. Get Character with FOR UPDATE lock to prevent concurrent double-spends
    const [character] = await tx.select().from(characters)
      .where(eq(characters.id, characterId))
      // .for('update') is native to postgres but we can just do conditional update if needed,
      // or rely on serializable transaction. We'll use simple check and update.
      // Drizzle ORM pg supports .for('update') but we'll use conditional update
      
    if (!character) throw new Error("Character not found");

    let totalExp = 0;
    let totalYen = 0;
    const auditDetails: any[] = [];
    const possessionsToAdd: Record<string, number> = {}; // track by elementId to sum quantities

    for (const item of cartItems) {
      const { offerId, quantity, selectedCurrency } = item;
      
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity: ${quantity}`);
      }
      if (selectedCurrency !== 'exp' && selectedCurrency !== 'yen') {
        throw new Error(`Invalid currency: ${selectedCurrency}`);
      }

      // Need to lock the row for the offer
      const [offer] = await tx.select().from(shopOffers).where(eq(shopOffers.id, offerId));
      if (!offer) throw new Error(`Offer ${offerId} not found`);
      if (offer.status !== 'available') throw new Error(`Offer ${offerId} is not available`);

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

      auditDetails.push({
        offerId,
        elementId: offer.elementId,
        quantity,
        cost: price.amount * quantity,
        currency: selectedCurrency
      });
    }

    if (character.exp < totalExp) {
      throw new Error(`Not enough EXP. Need ${totalExp}, has ${character.exp}`);
    }
    if (character.yen < totalYen) {
      throw new Error(`Not enough Yen. Need ${totalYen}, has ${character.yen}`);
    }

    // 3. Deduct Currencies safely
    const charUpdate = await tx.update(characters)
      .set({
        exp: sql`exp - ${totalExp}`,
        yen: sql`yen - ${totalYen}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(characters.id, characterId),
        sql`exp >= ${totalExp}`,
        sql`yen >= ${totalYen}`
      )).returning();
      
    if (charUpdate.length === 0) {
        throw new Error("Concurrent character update or insufficient funds.");
    }

    // 4. Add Possessions
    for (const [elementId, quantity] of Object.entries(possessionsToAdd)) {
        await tx.insert(elementPossessions).values({
            id: nanoid(10),
            characterId,
            elementId,
            quantity,
            acquiredAt: new Date()
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
