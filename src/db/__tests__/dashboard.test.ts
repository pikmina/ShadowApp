import { describe, it, expect } from 'vitest';
import { db } from '../index.ts';
import { getDashboardStats } from '../dashboard.ts';

let dbAvailable = false;
try {
  await db.execute('SELECT 1');
  dbAvailable = true;
} catch (e) {
  console.warn('DB not available for dashboard stats test.');
}

describe.skipIf(!dbAvailable)('Dashboard Stats Integration Tests', () => {
  it('should fetch aggregated dashboard stats correctly', async () => {
    const stats = await getDashboardStats();
    
    // Check top-level structures
    expect(stats).toHaveProperty('characters');
    expect(stats).toHaveProperty('canonCharacters');
    expect(stats).toHaveProperty('catalog');
    expect(stats).toHaveProperty('techniques');
    expect(stats).toHaveProperty('world');
    expect(stats).toHaveProperty('recentLogs');

    // Check characters demographic breakdowns
    expect(stats.characters).toHaveProperty('total');
    expect(stats.characters).toHaveProperty('byGroup');
    expect(stats.characters).toHaveProperty('byStage');
    expect(Array.isArray(stats.characters.byGroup)).toBe(true);
    expect(Array.isArray(stats.characters.byStage)).toBe(true);

    // Check canon characters metrics
    expect(typeof stats.canonCharacters.total).toBe('number');
    expect(typeof stats.canonCharacters.assigned).toBe('number');

    // Check catalog and technique counts
    expect(typeof stats.catalog.total).toBe('number');
    expect(typeof stats.techniques.total).toBe('number');

    // Check world data
    expect(typeof stats.world.institutions).toBe('number');
    expect(typeof stats.world.activeEmployments).toBe('number');
    expect(typeof stats.world.academicClasses).toBe('number');
    expect(typeof stats.world.activeEnrollments).toBe('number');

    // Check recent logs
    expect(Array.isArray(stats.recentLogs)).toBe(true);
  });
});
