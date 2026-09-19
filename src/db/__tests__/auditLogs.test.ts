import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../index.ts';
import { users, auditLogs, systemElements, systemRules } from '../schema.ts';
import { eq, inArray } from 'drizzle-orm';
import { logAudit, getAuditLogs, getAuditStats } from '../auditLogs.ts';
import { upsertElement, deleteElement } from '../elements.ts';
import { upsertRule, deleteRule } from '../rules.ts';
import { nanoid } from 'nanoid';

let dbAvailable = false;
try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn('DB not available for audit log test.');
}

describe.skipIf(!dbAvailable)('Audit Logging System Integration Tests', () => {
  let testActorUid: string;
  let testUserId: number;
  let createdElementId: string;
  const testRuleKey = `test_rule_${nanoid(6)}`;
  const createdLogIds: number[] = [];

  beforeAll(async () => {
    testActorUid = `actor_test_${nanoid(8)}`;
    const [user] = await db.insert(users).values({
      uid: testActorUid,
      email: `${testActorUid}@example.com`,
      role: 'superadmin',
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up created audit logs
    if (createdLogIds.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.id, createdLogIds));
    }
    // Clean up test element if still exists
    if (createdElementId) {
      await db.delete(systemElements).where(eq(systemElements.id, createdElementId));
    }
    // Clean up test rule if still exists
    await db.delete(systemRules).where(eq(systemRules.key, testRuleKey));
    // Clean up test user
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it('should create an audit log directly via logAudit', async () => {
    const log = await logAudit({
      actorUid: testActorUid,
      actionType: 'test_manual_action',
      targetId: 'target_123',
      details: { note: 'Manual audit test' },
    });

    expect(log).toBeDefined();
    expect(log.id).toBeTypeOf('number');
    expect(log.actorUid).toBe(testActorUid);
    expect(log.actionType).toBe('test_manual_action');
    createdLogIds.push(log.id);
  });

  it('should record audit log on upsertElement (creation and update) and deleteElement', async () => {
    // 1. Create element with actorUid
    const created = await upsertElement({
      name: 'Test Element for Audit',
      kind: 'equipment',
      category: 'general',
      status: 'draft',
      description: 'Audit test element',
    }, testActorUid);

    expect(created).toBeDefined();
    createdElementId = created.id;

    // Verify creation log
    const createLogs = await getAuditLogs({
      actionType: 'element_created',
      targetId: created.id,
      actorUid: testActorUid,
    });
    expect(createLogs.logs.length).toBeGreaterThanOrEqual(1);
    expect((createLogs.logs[0].details as any)?.name).toBe('Test Element for Audit');
    createdLogIds.push(...createLogs.logs.map(l => l.id));

    // 2. Update element with actorUid
    await upsertElement({
      id: created.id,
      name: 'Test Element Updated for Audit',
      kind: 'equipment',
      category: 'general',
      status: 'draft',
      description: 'Audit test element updated',
    }, testActorUid);

    // Verify update log
    const updateLogs = await getAuditLogs({
      actionType: 'element_updated',
      targetId: created.id,
      actorUid: testActorUid,
    });
    expect(updateLogs.logs.length).toBeGreaterThanOrEqual(1);
    expect((updateLogs.logs[0].details as any)?.name).toBe('Test Element Updated for Audit');
    createdLogIds.push(...updateLogs.logs.map(l => l.id));

    // 3. Delete element with actorUid
    await deleteElement(created.id, testActorUid);

    // Verify delete log
    const deleteLogs = await getAuditLogs({
      actionType: 'element_deleted',
      targetId: created.id,
      actorUid: testActorUid,
    });
    expect(deleteLogs.logs.length).toBeGreaterThanOrEqual(1);
    expect((deleteLogs.logs[0].details as any)?.name).toBe('Test Element Updated for Audit');
    createdLogIds.push(...deleteLogs.logs.map(l => l.id));
  });

  it('should record audit log on upsertRule and deleteRule', async () => {
    // 1. Create rule with actorUid
    await upsertRule(testRuleKey, 'json', { settingA: 100 }, 'Test rule for audit', testActorUid);

    const createRuleLogs = await getAuditLogs({
      actionType: 'rule_created',
      targetId: testRuleKey,
      actorUid: testActorUid,
    });
    expect(createRuleLogs.logs.length).toBeGreaterThanOrEqual(1);
    createdLogIds.push(...createRuleLogs.logs.map(l => l.id));

    // 2. Update rule with actorUid
    await upsertRule(testRuleKey, 'json', { settingA: 200 }, 'Test rule updated', testActorUid);

    const updateRuleLogs = await getAuditLogs({
      actionType: 'rule_updated',
      targetId: testRuleKey,
      actorUid: testActorUid,
    });
    expect(updateRuleLogs.logs.length).toBeGreaterThanOrEqual(1);
    createdLogIds.push(...updateRuleLogs.logs.map(l => l.id));

    // 3. Delete rule with actorUid
    await deleteRule(testRuleKey, testActorUid);

    const deleteRuleLogs = await getAuditLogs({
      actionType: 'rule_deleted',
      targetId: testRuleKey,
      actorUid: testActorUid,
    });
    expect(deleteRuleLogs.logs.length).toBeGreaterThanOrEqual(1);
    createdLogIds.push(...deleteRuleLogs.logs.map(l => l.id));
  });

  it('should return aggregated audit stats', async () => {
    const stats = await getAuditStats();
    expect(stats.totalLogs).toBeGreaterThanOrEqual(1);
    expect(stats.logsToday).toBeGreaterThanOrEqual(1);
    expect(stats.logsPast7Days).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(stats.topActors)).toBe(true);
  });
});
