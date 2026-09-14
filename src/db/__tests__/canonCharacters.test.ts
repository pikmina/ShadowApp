import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { characters, users, canonCharacters } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { updateCharacter, createCharacter } from '../characters.ts';
import { 
  createCanonCharacter, 
  getCanonCharacters, 
  deleteCanonCharacter, 
  reserveCanonCharacter, 
  releaseCanonCharacter 
} from '../canonCharacters.ts';
import { nanoid } from 'nanoid';

let testUserId: number;
let dbAvailable = false;
let testCanonId: string;
let testCharId: number;

try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn("DB not available for integration test.");
}

describe.skipIf(!dbAvailable)('Canon Characters Integration', () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({
      uid: "test_user_canon_" + nanoid(5),
      email: "canon_test@example.com",
      role: 'player'
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testCharId) await db.delete(characters).where(eq(characters.id, testCharId));
    if (testCanonId) await db.delete(canonCharacters).where(eq(canonCharacters.id, testCanonId));
    if (testUserId) await db.delete(users).where(eq(users.id, testUserId));
  });

  test('1. Create a CanonCharacter', async () => {
    const name = "Test Canon " + nanoid(4);
    const created = await createCanonCharacter({ name });
    expect(created).toBeDefined();
    expect(created.name).toBe(name);
    testCanonId = created.id;
  });

  test('2. Link it when creating a character', async () => {
    const char = await createCharacter(testUserId, "My Canon Char", {}, testCanonId);
    expect(char).toBeDefined();
    expect(char.canonCharacterId).toBe(testCanonId);
    testCharId = char.id;
  });

  test('3. Obtain occupied status from relation', async () => {
    const canons = await getCanonCharacters();
    const canon = canons.find((c: any) => c.id === testCanonId);
    expect(canon).toBeDefined();
    expect(canon?.status).toBe('occupied');
    expect(canon?.linkedCharacterId).toBe(testCharId);
  });

  test('4. Reject second sheet with the same canon', async () => {
    let error;
    try {
      await createCharacter(testUserId, "Another Char", {}, testCanonId);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
  });

  test('5. Unlink the sheet', async () => {
    const updated = await updateCharacter(testCharId, { canonCharacterId: null });
    expect(updated.canonCharacterId).toBeNull();
  });

  test('6. Check that it returns to available', async () => {
    const canons = await getCanonCharacters();
    const canon = canons.find((c: any) => c.id === testCanonId);
    expect(canon?.status).toBe('available');
    expect(canon?.linkedCharacterId).toBeNull();
  });

  test('7. Reserve and release', async () => {
    await reserveCanonCharacter(testCanonId);
    let canons = await getCanonCharacters();
    let canon = canons.find((c: any) => c.id === testCanonId);
    expect(canon?.status).toBe('reserved');

    await releaseCanonCharacter(testCanonId);
    canons = await getCanonCharacters();
    canon = canons.find((c: any) => c.id === testCanonId);
    expect(canon?.status).toBe('available');
  });

  test('8. Prevent deleting occupied canon', async () => {
    // Link it back
    await updateCharacter(testCharId, { canonCharacterId: testCanonId });
    
    let error;
    try {
      await deleteCanonCharacter(testCanonId);
    } catch (e: any) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.message).toContain('occupied');
  });

  test('9. Delete it when no longer occupied', async () => {
    // Unlink first
    await updateCharacter(testCharId, { canonCharacterId: null });
    
    // Now delete
    await deleteCanonCharacter(testCanonId);
    
    const canons = await getCanonCharacters();
    const canon = canons.find((c: any) => c.id === testCanonId);
    expect(canon).toBeUndefined();
    
    testCanonId = ''; // Prevent afterAll from failing
  });
});
