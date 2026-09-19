import { db } from './index.ts';
import { auditLogs, users } from './schema.ts';
import { eq, desc, asc, and, gte, lte, sql, ilike, or } from 'drizzle-orm';

export interface LogAuditParams {
  actorUid: string;
  actionType: string;
  targetId?: string | null;
  details: Record<string, unknown>;
}

export async function logAudit(params: LogAuditParams, tx?: any) {
  const runner = tx || db;
  const [created] = await runner.insert(auditLogs).values({
    actorUid: params.actorUid,
    actionType: params.actionType,
    targetId: params.targetId ?? null,
    details: params.details,
    createdAt: new Date(),
  }).returning();
  return created;
}

export interface GetAuditLogsFilter {
  page?: number;
  limit?: number;
  actionType?: string;
  actorUid?: string;
  targetId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(filter: GetAuditLogsFilter = {}) {
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (filter.actionType && filter.actionType !== 'all') {
    conditions.push(eq(auditLogs.actionType, filter.actionType));
  }

  if (filter.actorUid) {
    conditions.push(eq(auditLogs.actorUid, filter.actorUid));
  }

  if (filter.targetId) {
    conditions.push(eq(auditLogs.targetId, filter.targetId));
  }

  if (filter.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(filter.startDate)));
  }

  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogs.createdAt, end));
  }

  if (filter.search && filter.search.trim() !== '') {
    const term = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        ilike(auditLogs.actionType, term),
        ilike(auditLogs.targetId, term),
        ilike(auditLogs.actorUid, term),
        ilike(users.email, term),
        sql`CAST(${auditLogs.details} AS TEXT) ILIKE ${term}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .leftJoin(users, eq(users.uid, auditLogs.actorUid))
    .where(whereClause);

  const total = totalRes?.count || 0;

  const rows = await db
    .select({
      id: auditLogs.id,
      actorUid: auditLogs.actorUid,
      actorEmail: users.email,
      actorRole: users.role,
      actionType: auditLogs.actionType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.uid, auditLogs.actorUid))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows,
    logs: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAuditStats() {
  const [totalRes] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, today));

  const past7Days = new Date();
  past7Days.setDate(past7Days.getDate() - 7);
  const [past7DaysRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, past7Days));

  // Action type breakdown
  const actionBreakdown = await db
    .select({
      actionType: auditLogs.actionType,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.actionType)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Top actors
  const topActors = await db
    .select({
      actorUid: auditLogs.actorUid,
      email: users.email,
      role: users.role,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.uid, auditLogs.actorUid))
    .groupBy(auditLogs.actorUid, users.email, users.role)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const total = totalRes?.count || 0;
  const todayCount = todayRes?.count || 0;
  const past7DaysCount = past7DaysRes?.count || 0;

  return {
    total,
    today: todayCount,
    past7Days: past7DaysCount,
    totalLogs: total,
    logsToday: todayCount,
    logsPast7Days: past7DaysCount,
    actionBreakdown,
    topActors,
  };
}
