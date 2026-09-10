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

export const requireRole = (allowedRoles: ('superadmin' | 'moderator' | 'player')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.dbUser) {
      res.status(401).json({ error: 'Unauthorized: User not resolved' });
      return;
    }
    
    const effectiveRole = req.dbUser.role;
    // superadmin can do everything a moderator can
    if (allowedRoles.includes(effectiveRole) || effectiveRole === 'superadmin') {
      next();
    } else {
      res.status(403).json({ error: `Forbidden: Requires one of ${allowedRoles.join(', ')}` });
    }
  };
};
