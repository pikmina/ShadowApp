import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { getUserByUid } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Resolve dbUser as the source of truth for roles
    let dbUser = await getUserByUid(decodedToken.uid);
    if (!dbUser && decodedToken.email) {
      const email = decodedToken.email.trim().toLowerCase();
      const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (byEmail) {
        const targetRole = (byEmail.role as string) === 'player' ? 'moderator' : byEmail.role;
        const [linked] = await db
          .update(users)
          .set({
            uid: decodedToken.uid,
            displayName: byEmail.displayName || decodedToken.name || email.split('@')[0],
            avatarUrl: byEmail.avatarUrl || decodedToken.picture || null,
            role: targetRole,
            updatedAt: new Date()
          })
          .where(eq(users.id, byEmail.id))
          .returning();
        dbUser = linked;
      } else {
        const all = await db.select().from(users).limit(1);
        if (all.length === 0) {
          const [firstAdmin] = await db
            .insert(users)
            .values({
              uid: decodedToken.uid,
              email,
              displayName: decodedToken.name || email.split('@')[0],
              avatarUrl: decodedToken.picture || null,
              role: 'superadmin'
            })
            .returning();
          dbUser = firstAdmin;
        } else {
          const [newUser] = await db
            .insert(users)
            .values({
              uid: decodedToken.uid,
              email,
              displayName: decodedToken.name || email.split('@')[0],
              avatarUrl: decodedToken.picture || null,
              role: 'moderator'
            })
            .returning();
          dbUser = newUser;
        }
      }
    }

    if (dbUser && (dbUser.role as string) === 'player') {
      const [upgraded] = await db
        .update(users)
        .set({ role: 'moderator', updatedAt: new Date() })
        .where(eq(users.id, dbUser.id))
        .returning();
      dbUser = upgraded || { ...dbUser, role: 'moderator' };
    }

    if (!dbUser) {
      res.status(403).json({ error: 'Forbidden: User not found in database or not active' });
      return;
    }
    req.dbUser = dbUser;
    
    next();
  } catch (error: any) {
    if (error.code !== 'auth/id-token-expired') {
      console.warn('Error verifying Firebase ID token:', error.message || error);
    }
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};

export const requireRole = (allowedRoles: ('superadmin' | 'moderator')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized: User not resolved' });
      return;
    }
    
    const effectiveRole = req.dbUser.role;
    // superadmin can do everything a moderator can
    if ((allowedRoles as string[]).includes(effectiveRole) || effectiveRole === 'superadmin') {
      next();
    } else {
      res.status(403).json({ error: `Forbidden: Requires one of ${allowedRoles.join(', ')}` });
    }
  };
};
