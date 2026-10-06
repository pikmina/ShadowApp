import { expect, it, describe, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { players, characters } from '../schema.ts';
import { eq } from 'drizzle-orm';
import { createPlayer, getPlayers, getPublicPlayers, updatePlayer, deletePlayer } from '../players.ts';
import { nanoid } from 'nanoid';

let dbAvailable = false;
try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn("DB not available for integration test.");
}

describe.skipIf(!dbAvailable)('Player Privacy & Persistence Integration Tests', () => {
  let createdPlayerId: number;
  let testCharacterId: number;

  afterAll(async () => {
    if (testCharacterId) {
      await db.delete(characters).where(eq(characters.id, testCharacterId));
    }
    if (createdPlayerId) {
      await db.delete(players).where(eq(players.id, createdPlayerId));
    }
  });

  it('creates a player with identity, discord, and notes fields', async () => {
    const uniqueAlias = `Nutria Vengadora ${nanoid(4)}`;
    const created = await createPlayer({
      name: uniqueAlias,
      identity: 'Clark Kent Privado',
      discord: 'clark#9999',
      notes: 'Jugador nocturno, solo fines de semana',
      status: 'active'
    });

    expect(created).toBeDefined();
    expect(created.id).toBeTypeOf('number');
    expect(created.name).toBe(uniqueAlias);
    expect(created.identity).toBe('Clark Kent Privado');
    expect(created.discord).toBe('clark#9999');
    expect(created.notes).toBe('Jugador nocturno, solo fines de semana');
    createdPlayerId = created.id;
  });

  it('updates identity, discord, and notes fields properly', async () => {
    const updated = await updatePlayer(createdPlayerId, {
      identity: 'Bruce Wayne Confidencial',
      discord: 'bruce#0007',
      notes: 'Disponibilidad ampliada',
    });

    expect(updated.identity).toBe('Bruce Wayne Confidencial');
    expect(updated.discord).toBe('bruce#0007');
    expect(updated.notes).toBe('Disponibilidad ampliada');
  });

  it('admin getPlayers retrieves private fields', async () => {
    const all = await getPlayers({ includeInactive: true });
    const found = all.find(p => p.id === createdPlayerId);
    expect(found).toBeDefined();
    expect(found?.identity).toBe('Bruce Wayne Confidencial');
    expect(found?.discord).toBe('bruce#0007');
    expect(found?.notes).toBe('Disponibilidad ampliada');
  });

  it('CRITICAL PRIVACY: getPublicPlayers NEVER returns identity, discord, or notes', async () => {
    // Attach an active character to player so they appear in public list
    const [char] = await db.insert(characters).values({
      name: `Hero ${nanoid(4)}`,
      playerId: createdPlayerId,
      active: true,
      exp: 10,
      yen: 500,
    }).returning();
    testCharacterId = char.id;

    const publicList = await getPublicPlayers();
    const publicPlayer = publicList.find(p => p.id === createdPlayerId);

    expect(publicPlayer).toBeDefined();
    expect(publicPlayer?.name).toBeDefined();
    expect((publicPlayer as any).identity).toBeUndefined();
    expect((publicPlayer as any).discord).toBeUndefined();
    expect((publicPlayer as any).notes).toBeUndefined();
    expect((publicPlayer as any).userId).toBeUndefined();
  });

  it('assigns and unassigns unassigned character to a player', async () => {
    const { assignCharacterToPlayer, unassignCharacterFromPlayer } = await import('../players.ts');
    
    // Create an unassigned character (playerId: null)
    const [unassignedChar] = await db.insert(characters).values({
      name: `Free Agent ${nanoid(4)}`,
      playerId: null,
      active: true,
      exp: 0,
      yen: 100,
    }).returning();

    // Assign to player
    const assigned = await assignCharacterToPlayer(createdPlayerId, unassignedChar.id);
    expect(assigned.playerId).toBe(createdPlayerId);

    // Verify in getPlayers
    const all = await getPlayers({ includeInactive: true });
    const playerWithChars = all.find(p => p.id === createdPlayerId);
    expect(playerWithChars?.characters.some(c => c.id === unassignedChar.id)).toBe(true);

    // Unassign
    await unassignCharacterFromPlayer(createdPlayerId, unassignedChar.id);
    const allAfter = await getPlayers({ includeInactive: true });
    const playerAfter = allAfter.find(p => p.id === createdPlayerId);
    expect(playerAfter?.characters.some(c => c.id === unassignedChar.id)).toBe(false);

    // Cleanup
    await db.delete(characters).where(eq(characters.id, unassignedChar.id));
  });
});
