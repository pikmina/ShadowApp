import { db } from './index.ts';
import { players, characters, users, auditLogs } from './schema.ts';
import { eq, asc, desc, and } from 'drizzle-orm';

export interface PlayerWithCharacters {
  id: number;
  name: string;
  status: 'active' | 'absent' | 'inactive';
  userId: number | null;
  identity: string | null;
  discord: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  user?: {
    id: number;
    email: string;
    displayName: string | null;
  } | null;
  characters: Array<{
    id: number;
    name: string;
    active: boolean;
    canonCharacterId: string | null;
    exp: number;
    yen: number;
    profileData?: Record<string, any> | null;
  }>;
  activeCharactersCount: number;
  totalCharactersCount: number;
}

export async function getPlayers(options?: { includeInactive?: boolean }): Promise<PlayerWithCharacters[]> {
  const allPlayers = await db
    .select({
      player: players,
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      }
    })
    .from(players)
    .leftJoin(users, eq(users.id, players.userId))
    .orderBy(asc(players.name));

  const allCharacters = await db
    .select({
      id: characters.id,
      name: characters.name,
      active: characters.active,
      canonCharacterId: characters.canonCharacterId,
      exp: characters.exp,
      yen: characters.yen,
      playerId: characters.playerId,
      profileData: characters.profileData,
    })
    .from(characters);

  const charMap = new Map<number, typeof allCharacters>();
  for (const char of allCharacters) {
    if (char.playerId) {
      if (!charMap.has(char.playerId)) {
        charMap.set(char.playerId, []);
      }
      charMap.get(char.playerId)!.push(char);
    }
  }

  return allPlayers
    .filter(row => options?.includeInactive ? true : row.player.status !== 'inactive')
    .map(({ player, user }) => {
      const pChars = charMap.get(player.id) || [];
      const activeChars = pChars.filter(c => c.active !== false);
      return {
        ...player,
        user: user?.id ? user : null,
        characters: pChars,
        activeCharactersCount: activeChars.length,
        totalCharactersCount: pChars.length,
      };
    });
}

/**
 * Public Registry Player List:
 * - Only includes players who have AT LEAST 1 active character.
 * - Players with 0 active characters are considered "out of the game" and excluded.
 * - Only active characters are listed for each player (inactive/archived are completely hidden).
 */
export async function getPublicPlayers() {
  const playerList = await getPlayers({ includeInactive: false });

  return playerList
    .filter(p => p.activeCharactersCount > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      status: p.status, // 'active' | 'absent'
      characters: p.characters
        .filter(c => c.active !== false)
        .map(c => ({
          id: c.id,
          name: c.name,
          canonCharacterId: c.canonCharacterId,
          profileData: c.profileData,
        })),
    }));
}

export async function createPlayer(data: {
  name: string;
  status?: 'active' | 'absent' | 'inactive';
  userId?: number | null;
  identity?: string | null;
  discord?: string | null;
  notes?: string | null;
}, actorUid?: string) {
  const [created] = await db
    .insert(players)
    .values({
      name: data.name.trim(),
      status: data.status || 'active',
      userId: data.userId || null,
      identity: data.identity ? data.identity.trim() : null,
      discord: data.discord ? data.discord.trim() : null,
      notes: data.notes ? data.notes.trim() : null,
    })
    .returning();

  if (actorUid) {
    await db.insert(auditLogs).values({
      actorUid,
      actionType: 'player_created',
      targetId: created.id.toString(),
      details: {
        name: created.name,
        status: created.status,
      },
    });
  }

  return created;
}

export async function updatePlayer(id: number, data: {
  name?: string;
  status?: 'active' | 'absent' | 'inactive';
  userId?: number | null;
  identity?: string | null;
  discord?: string | null;
  notes?: string | null;
}, actorUid?: string) {
  const updatePayload: Record<string, any> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.userId !== undefined) updatePayload.userId = data.userId;
  if (data.identity !== undefined) updatePayload.identity = data.identity ? data.identity.trim() : null;
  if (data.discord !== undefined) updatePayload.discord = data.discord ? data.discord.trim() : null;
  if (data.notes !== undefined) updatePayload.notes = data.notes ? data.notes.trim() : null;

  const [updated] = await db
    .update(players)
    .set(updatePayload)
    .where(eq(players.id, id))
    .returning();

  if (!updated) {
    const error = new Error("Player not found");
    (error as any).status = 404;
    throw error;
  }

  if (actorUid) {
    await db.insert(auditLogs).values({
      actorUid,
      actionType: 'player_updated',
      targetId: id.toString(),
      details: {
        changes: data,
      },
    });
  }

  return updated;
}

export async function deletePlayer(id: number, actorUid?: string) {
  await db.transaction(async (tx) => {
    // Unlink any characters assigned to this player
    await tx.update(characters).set({ playerId: null }).where(eq(characters.playerId, id));

    const [deleted] = await tx.delete(players).where(eq(players.id, id)).returning();
    if (!deleted) {
      const error = new Error("Player not found");
      (error as any).status = 404;
      throw error;
    }

    if (actorUid) {
      await tx.insert(auditLogs).values({
        actorUid,
        actionType: 'player_deleted',
        targetId: id.toString(),
        details: {
          name: deleted.name,
        },
      });
    }
  });

  return { success: true };
}
