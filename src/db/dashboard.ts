import { db } from './index.ts';
import { 
  characters, 
  canonCharacters, 
  systemElements, 
  systemRules, 
  shopOffers, 
  institutions, 
  positions, 
  characterEmployments, 
  academicYears, 
  classGroups, 
  characterEnrollments,
  auditLogs,
  users
} from './schema.ts';
import { eq, desc, sql, isNotNull, isNull, and } from 'drizzle-orm';

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const readProfileValue = (profile: Record<string, any> | undefined | null, keys: string[]) => {
  if (!profile) return undefined;
  for (const key of keys) {
    if (hasValue(profile[key])) return profile[key];
  }
  return undefined;
};

export async function getDashboardStats() {
  // 1. Fetch all characters with user info
  const charRows = await db
    .select({
      id: characters.id,
      name: characters.name,
      userId: characters.userId,
      canonCharacterId: characters.canonCharacterId,
      exp: characters.exp,
      yen: characters.yen,
      profileData: characters.profileData,
      createdAt: characters.createdAt,
      updatedAt: characters.updatedAt,
      userEmail: users.email,
    })
    .from(characters)
    .leftJoin(users, eq(users.id, characters.userId))
    .orderBy(desc(characters.updatedAt));

  // 2. Fetch stages rule for canonical ordering and limits
  const stagesRule = await db
    .select()
    .from(systemRules)
    .where(eq(systemRules.key, 'system_stages'));
  const stagesConfig: Array<{ name: string; exp?: number; yen?: number }> = Array.isArray(stagesRule[0]?.value) 
    ? (stagesRule[0].value as any[]) 
    : [];

  // 3. Fetch global settings for defined groups
  const settingsRule = await db
    .select()
    .from(systemRules)
    .where(eq(systemRules.key, 'global_settings'));
  const definedGroups: Array<{ id: string; name: string }> = Array.isArray((settingsRule[0]?.value as any)?.groups)
    ? (settingsRule[0]?.value as any).groups
    : [];

  // Group & Stage counters
  const groupCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  let canonAssigned = 0;
  let totalExp = 0;
  let totalYen = 0;

  for (const char of charRows) {
    const profile = (char.profileData as Record<string, any>) || {};
    
    // Group extraction
    const groupVal = String(readProfileValue(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']) || '').trim();
    const groupName = groupVal.length > 0 ? groupVal : 'Sin Grupo';
    groupCounts[groupName] = (groupCounts[groupName] || 0) + 1;

    // Stage extraction
    const stageVal = String(readProfileValue(profile, ['basic_stage', 'stage', 'etapa']) || '').trim();
    const stageName = stageVal.length > 0 ? stageVal : 'Sin Etapa';
    stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;

    if (char.canonCharacterId) {
      canonAssigned++;
    }

    totalExp += char.exp || 0;
    totalYen += char.yen || 0;
  }

  const totalCharacters = charRows.length;

  // Format group breakdown sorted descending
  const charactersByGroup = Object.entries(groupCounts)
    .map(([group, count]) => ({
      group,
      count,
      percentage: totalCharacters > 0 ? Math.round((count / totalCharacters) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.group.localeCompare(b.group, 'es'));

  // Format stage breakdown
  const stageOrderMap = new Map<string, number>();
  stagesConfig.forEach((s, idx) => stageOrderMap.set(s.name.toLowerCase().trim(), idx));

  const charactersByStage = Object.entries(stageCounts)
    .map(([stage, count]) => ({
      stage,
      count,
      percentage: totalCharacters > 0 ? Math.round((count / totalCharacters) * 1000) / 10 : 0,
      order: stageOrderMap.has(stage.toLowerCase().trim()) ? stageOrderMap.get(stage.toLowerCase().trim())! : 999,
    }))
    .sort((a, b) => a.order - b.order || b.count - a.count);

  // 4. Canon characters overview
  const [canonTotalRes] = await db.select({ count: sql<number>`count(*)::int` }).from(canonCharacters);
  const [canonReservedRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(canonCharacters)
    .where(eq(canonCharacters.reserved, true));
  const [canonActiveRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(canonCharacters)
    .where(eq(canonCharacters.active, true));

  const totalCanon = canonTotalRes?.count || 0;
  const reservedCanon = canonReservedRes?.count || 0;
  const activeCanon = canonActiveRes?.count || 0;
  const availableCanon = Math.max(0, activeCanon - canonAssigned - reservedCanon);

  // 5. Catalog Elements breakdown
  const [elementsTotalRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(sql`${systemElements.kind} != 'technique_entitlement'`);
  const [elementsPublishedRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(and(sql`${systemElements.kind} != 'technique_entitlement'`, eq(systemElements.status, 'published')));
  const [elementsDraftRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(and(sql`${systemElements.kind} != 'technique_entitlement'`, eq(systemElements.status, 'draft')));

  // 6. Techniques breakdown
  const [techTotalRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(eq(systemElements.kind, 'technique_entitlement'));
  const [techPublishedRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(and(eq(systemElements.kind, 'technique_entitlement'), eq(systemElements.status, 'published')));
  const [techDraftRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemElements).where(and(eq(systemElements.kind, 'technique_entitlement'), eq(systemElements.status, 'draft')));

  // 7. Employments & Classes breakdown
  const [institutionsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(institutions);
  const [positionsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(positions);
  const [activeEmploymentsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(characterEmployments).where(eq(characterEmployments.status, 'active'));

  const [classesRes] = await db.select({ count: sql<number>`count(*)::int` }).from(classGroups);
  const [activeEnrollmentsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(characterEnrollments).where(eq(characterEnrollments.status, 'active'));

  // 8. Shop offers
  const [offersRes] = await db.select({ count: sql<number>`count(*)::int` }).from(shopOffers);

  // 9. Recent audit logs (top 6)
  const recentLogs = await db
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
    .orderBy(desc(auditLogs.createdAt))
    .limit(6);

  // 10. Recent characters preview (top 5)
  const recentCharacters = charRows.slice(0, 5).map(c => {
    const prof = (c.profileData as Record<string, any>) || {};
    return {
      id: c.id,
      name: c.name,
      userEmail: c.userEmail,
      group: String(readProfileValue(prof, ['faction_group', 'group', 'grupo', 'faccion', 'facción']) || 'Sin Grupo'),
      stage: String(readProfileValue(prof, ['basic_stage', 'stage', 'etapa']) || 'Sin Etapa'),
      isCanon: !!c.canonCharacterId,
      updatedAt: c.updatedAt,
    };
  });

  return {
    characters: {
      total: totalCharacters,
      canon: canonAssigned,
      original: totalCharacters - canonAssigned,
      totalExp,
      totalYen,
      byGroup: charactersByGroup,
      byStage: charactersByStage,
      recent: recentCharacters,
    },
    canonCharacters: {
      total: totalCanon,
      active: activeCanon,
      assigned: canonAssigned,
      reserved: reservedCanon,
      available: availableCanon,
    },
    catalog: {
      total: elementsTotalRes?.count || 0,
      published: elementsPublishedRes?.count || 0,
      draft: elementsDraftRes?.count || 0,
    },
    techniques: {
      total: techTotalRes?.count || 0,
      published: techPublishedRes?.count || 0,
      draft: techDraftRes?.count || 0,
    },
    world: {
      institutions: institutionsRes?.count || 0,
      positions: positionsRes?.count || 0,
      activeEmployments: activeEmploymentsRes?.count || 0,
      academicClasses: classesRes?.count || 0,
      activeEnrollments: activeEnrollmentsRes?.count || 0,
      shopOffers: offersRes?.count || 0,
    },
    recentLogs,
  };
}
