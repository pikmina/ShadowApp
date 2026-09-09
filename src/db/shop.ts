import { db } from './index.ts';
import { shopOffers, systemElements, characters, elementPossessions, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
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
    if (!id) {
      id = nanoid(10);
      const result = await db.insert(shopOffers).values({
        id,
        elementId: data.elementId,
        status: data.status || 'draft',
        prices: data.prices || [],
        globalStock: data.globalStock || null,
        perCharacterLimit: data.perCharacterLimit || null,
      }).returning();
      return result[0];
    } else {
      const result = await db.update(shopOffers).set({
        elementId: data.elementId,
        status: data.status,
        prices: data.prices,
        globalStock: data.globalStock,
        perCharacterLimit: data.perCharacterLimit,
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
  // Use a transaction
  return await db.transaction(async (tx) => {
    // 1. Get Character
    const [character] = await tx.select().from(characters).where(eq(characters.id, characterId));
    if (!character) throw new Error("Character not found");

    let totalExp = 0;
    let totalYen = 0;

    const auditDetails: any[] = [];
    const possessionsToAdd: any[] = [];

    // 2. Calculate Totals and Validate
    for (const item of cartItems) {
      const { offerId, quantity, selectedCurrency } = item;
      
      const [offer] = await tx.select().from(shopOffers).where(eq(shopOffers.id, offerId));
      if (!offer) throw new Error(`Offer ${offerId} not found`);

      const price = (offer.prices as any[]).find((p: any) => p.currency === selectedCurrency);
      if (!price) throw new Error(`Price in ${selectedCurrency} not found for offer ${offerId}`);

      if (selectedCurrency === 'exp') {
        totalExp += price.amount * quantity;
      } else if (selectedCurrency === 'yen') {
        totalYen += price.amount * quantity;
      }

      possessionsToAdd.push({
        id: nanoid(10),
        characterId,
        elementId: offer.elementId,
        quantity,
        acquiredAt: new Date(),
      });

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

    // 3. Deduct Currencies
    await tx.update(characters)
      .set({
        exp: character.exp - totalExp,
        yen: character.yen - totalYen,
        updatedAt: new Date()
      })
      .where(eq(characters.id, characterId));

    // 4. Add Possessions
    for (const poss of possessionsToAdd) {
      // Basic insert for now (could check if exists and increment quantity)
      await tx.insert(elementPossessions).values(poss);
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
