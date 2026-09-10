import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { characters, users } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { updateCharacter, createCharacter } from '../characters.ts';
import { nanoid } from 'nanoid';

let testCharId: number;
let testUserId: number;
let dbAvailable = false;

try {
  // Test connection
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn("DB not available for integration test.");
}

describe.skipIf(!dbAvailable)('Characters Database Logic', () => {
  beforeAll(async () => {
    // We need to create a user first
    const [user] = await db.insert(users).values({
      uid: "test_user_" + nanoid(5),
      email: "test@example.com",
      role: 'moderator'
    }).returning();
    testUserId = user.id;

    const char = await createCharacter(testUserId, "Test Char", { bio: "Original" });
    testCharId = char.id;
  });

  afterAll(async () => {
    if (testCharId) {
      await db.delete(characters).where(eq(characters.id, testCharId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  test('updateCharacter preserves omitted profileData', async () => {
    // Now we must provide expectedUpdatedAt
    await db.update(characters).set({ updatedAt: new Date('2026-09-10T00:00:00.000Z') }).where(eq(characters.id, testCharId));
    const updated = await updateCharacter(testCharId, { name: "New Name", expectedUpdatedAt: new Date('2026-09-10T00:00:00.000Z') });
    expect(updated.name).toBe("New Name");
    expect(updated.profileData).toEqual({ bio: "Original" });
  });

  test('updateCharacter throws 409 Conflict on expectedUpdatedAt mismatch', async () => {
    try {
      await updateCharacter(testCharId, { name: "Another Name", expectedUpdatedAt: new Date(1999, 1, 1) });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).toBe("Conflict");
      expect(err.status).toBe(409);
    }
  });
});
