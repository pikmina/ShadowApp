import { expect, test, describe, vi } from 'vitest';
import { requireRole } from '../auth';

describe('Auth Middleware - Role Matrix & Identity Rejection', () => {
  test('Superadmin can access moderator routes', () => {
    const middleware = requireRole(['moderator']);
    const req: any = { dbUser: { role: 'superadmin' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Player cannot access moderator routes', () => {
    const middleware = requireRole(['moderator']);
    const req: any = { dbUser: { role: 'player' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('Rejects identity without dbUser (unauthorized Firebase user)', () => {
    const middleware = requireRole(['moderator', 'superadmin']);
    const req: any = { dbUser: null }; // Not resolved from DB
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
