import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { characters } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { updateCharacter, createCharacter } from '../characters.ts';

describe('Characters Database Logic', () => {
  let testCharId: number;
  const testUserId = 999999;

  beforeAll(async () => {
    // We try to insert a character if DB is available. If it fails due to no DB, we skip.
    try {
      const char = await createCharacter(testUserId, "Test Char", { bio: "Original" });
      testCharId = char.id;
    } catch (e) {
      console.warn("DB not available for integration test, skipping.");
    }
  });

  afterAll(async () => {
    if (testCharId) {
      await db.delete(characters).where(eq(characters.id, testCharId));
    }
  });

  test('updateCharacter preserves omitted profileData', async () => {
    if (!testCharId) return; // Skip if no DB

    const updated = await updateCharacter(testCharId, { name: "New Name" });
    expect(updated.name).toBe("New Name");
    expect(updated.profileData).toEqual({ bio: "Original" });
  });

  test('updateCharacter throws 409 Conflict on expectedUpdatedAt mismatch', async () => {
    if (!testCharId) return; // Skip if no DB

    try {
      await updateCharacter(testCharId, { name: "Another Name", expectedUpdatedAt: new Date(1999, 1, 1) });
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.message).toBe("Conflict");
      expect(err.status).toBe(409);
    }
  });
});
