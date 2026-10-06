import { db } from './index.ts';
import { users, auditLogs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function getUserByUid(uid: string) {
  try {
    const [existing] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return existing || null;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to get user", { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error("Failed to fetch all users:", error);
    throw new Error("Failed to get users", { cause: error });
  }
}

export async function createStaffUser(data: { email: string; role: 'moderator' | 'superadmin'; displayName?: string }, actorUid?: string) {
  try {
    const email = data.email.trim().toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          role: data.role,
          displayName: data.displayName || existing.displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      if (actorUid) {
        await db.insert(auditLogs).values({
          actorUid,
          actionType: 'staff_user_updated',
          targetId: String(existing.id),
          details: { email, newRole: data.role },
        });
      }
      return updated;
    }

    const tempUid = `invited_${nanoid(12)}`;
    const [created] = await db
      .insert(users)
      .values({
        uid: tempUid,
        email,
        displayName: data.displayName || email.split('@')[0],
        role: data.role,
      })
      .returning();

    if (actorUid) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'staff_user_created',
        targetId: String(created.id),
        details: { email, role: data.role },
      });
    }

    return created;
  } catch (error) {
    console.error("Failed to create staff user:", error);
    throw new Error("Failed to create staff user", { cause: error });
  }
}

export async function updateUserRole(id: number, role: 'moderator' | 'superadmin' | 'player', actorUid?: string) {
  try {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      throw new Error("Usuario no encontrado");
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (actorUid) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'staff_role_changed',
        targetId: String(id),
        details: { email: existing.email, oldRole: existing.role, newRole: role },
      });
    }

    return updated;
  } catch (error) {
    console.error("Failed to update user role:", error);
    throw new Error("Failed to update user role", { cause: error });
  }
}

export async function deleteStaffUser(id: number, actorUid?: string) {
  try {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      throw new Error("Usuario no encontrado");
    }

    await db.delete(users).where(eq(users.id, id));

    if (actorUid) {
      await db.insert(auditLogs).values({
        actorUid,
        actionType: 'staff_user_deleted',
        targetId: String(id),
        details: { email: existing.email, role: existing.role },
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to delete staff user:", error);
    throw new Error("Failed to delete staff user", { cause: error });
  }
}

export async function updateUserProfile(uid: string, data: { displayName?: string | null; avatarUrl?: string | null }) {
  try {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }
    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.uid, uid))
      .returning();

    return updated || null;
  } catch (error) {
    console.error("Database update failed:", error);
    throw new Error("Failed to update user profile", { cause: error });
  }
}
