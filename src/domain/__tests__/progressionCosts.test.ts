import { describe, it, expect } from 'vitest';
import { calculateProgressionCost, getProgressionBreakdown } from '../progressionCosts';

describe('Progression Costs Calculation', () => {
  it('calculates skill progression costs correctly for Base 100 (Alerta, Atletismo, etc.)', () => {
    const base = 100;
    // Step by step
    expect(calculateProgressionCost(base, 0, 1)).toBe(100);
    expect(calculateProgressionCost(base, 1, 2)).toBe(100);
    expect(calculateProgressionCost(base, 2, 3)).toBe(200);
    expect(calculateProgressionCost(base, 3, 4)).toBe(300);
    expect(calculateProgressionCost(base, 4, 5)).toBe(400);

    // Multi-step jump (0 to 5)
    expect(calculateProgressionCost(base, 0, 5)).toBe(1100);

    // Partial jump (1 to 4: 1->2 (100) + 2->3 (200) + 3->4 (300) = 600)
    expect(calculateProgressionCost(base, 1, 4)).toBe(600);
  });

  it('calculates skill progression costs correctly for Base 200 (Investigación, Sigilo, etc.)', () => {
    const base = 200;
    expect(calculateProgressionCost(base, 0, 1)).toBe(200);
    expect(calculateProgressionCost(base, 1, 2)).toBe(200);
    expect(calculateProgressionCost(base, 2, 3)).toBe(400);
    expect(calculateProgressionCost(base, 3, 4)).toBe(600);
    expect(calculateProgressionCost(base, 4, 5)).toBe(800);
    expect(calculateProgressionCost(base, 0, 5)).toBe(2200);
  });

  it('calculates skill progression costs correctly for Base 300 (Medicina, Combate, etc.)', () => {
    const base = 300;
    expect(calculateProgressionCost(base, 0, 1)).toBe(300);
    expect(calculateProgressionCost(base, 1, 2)).toBe(300);
    expect(calculateProgressionCost(base, 2, 3)).toBe(600);
    expect(calculateProgressionCost(base, 3, 4)).toBe(900);
    expect(calculateProgressionCost(base, 4, 5)).toBe(1200);
    expect(calculateProgressionCost(base, 0, 5)).toBe(3300);
  });

  it('calculates skill progression costs correctly for Base 500 (Dominio de Quirk)', () => {
    const base = 500;
    expect(calculateProgressionCost(base, 0, 1)).toBe(500);
    expect(calculateProgressionCost(base, 1, 2)).toBe(500);
    expect(calculateProgressionCost(base, 2, 3)).toBe(1000);
    expect(calculateProgressionCost(base, 3, 4)).toBe(1500);
    expect(calculateProgressionCost(base, 4, 5)).toBe(2000);
    expect(calculateProgressionCost(base, 0, 5)).toBe(5500);
  });

  it('calculates attribute progression costs for levels 1 to 10 (Fuerza Base 200)', () => {
    const base = 200;
    expect(calculateProgressionCost(base, 0, 1)).toBe(200);
    expect(calculateProgressionCost(base, 1, 2)).toBe(200);
    expect(calculateProgressionCost(base, 2, 3)).toBe(400);
    expect(calculateProgressionCost(base, 3, 4)).toBe(600);
    expect(calculateProgressionCost(base, 4, 5)).toBe(800);
    expect(calculateProgressionCost(base, 5, 6)).toBe(1000);
    expect(calculateProgressionCost(base, 6, 7)).toBe(1200);
    expect(calculateProgressionCost(base, 7, 8)).toBe(1400);
    expect(calculateProgressionCost(base, 8, 9)).toBe(1600);
    expect(calculateProgressionCost(base, 9, 10)).toBe(1800);
  });

  it('calculates attribute progression costs for Voluntad Base 350', () => {
    const base = 350;
    expect(calculateProgressionCost(base, 0, 1)).toBe(350);
    expect(calculateProgressionCost(base, 1, 2)).toBe(350);
    expect(calculateProgressionCost(base, 2, 3)).toBe(700);
    expect(calculateProgressionCost(base, 3, 4)).toBe(1050);
    expect(calculateProgressionCost(base, 4, 5)).toBe(1400);
    expect(calculateProgressionCost(base, 5, 6)).toBe(1750);
    expect(calculateProgressionCost(base, 6, 7)).toBe(2100);
    expect(calculateProgressionCost(base, 7, 8)).toBe(2450); // Matches the user's highlighted cell in spreadsheet!
    expect(calculateProgressionCost(base, 8, 9)).toBe(2800);
    expect(calculateProgressionCost(base, 9, 10)).toBe(3150);
  });

  it('generates the correct progression breakdown table', () => {
    const breakdown = getProgressionBreakdown(100, 5);
    expect(breakdown).toHaveLength(5);
    expect(breakdown[0]).toEqual({ fromLevel: 0, toLevel: 1, cost: 100, cumulativeCost: 100 });
    expect(breakdown[1]).toEqual({ fromLevel: 1, toLevel: 2, cost: 100, cumulativeCost: 200 });
    expect(breakdown[2]).toEqual({ fromLevel: 2, toLevel: 3, cost: 200, cumulativeCost: 400 });
    expect(breakdown[3]).toEqual({ fromLevel: 3, toLevel: 4, cost: 300, cumulativeCost: 700 });
    expect(breakdown[4]).toEqual({ fromLevel: 4, toLevel: 5, cost: 400, cumulativeCost: 1100 });
  });

  it('handles edge cases safely (negative or zero costs, target <= current)', () => {
    expect(calculateProgressionCost(0, 1, 5)).toBe(0);
    expect(calculateProgressionCost(-100, 1, 5)).toBe(0);
    expect(calculateProgressionCost(100, 5, 5)).toBe(0);
    expect(calculateProgressionCost(100, 5, 2)).toBe(0);
  });
});
