export interface ProgressionStep {
  fromLevel: number;
  toLevel: number;
  cost: number;
  cumulativeCost: number;
}

/**
 * Calculates the cost to advance from currentLevel to targetLevel based on baseCost.
 * Rule:
 *   Advancing from level l to l+1 costs: baseCost * Math.max(1, l)
 *   - 0 -> 1: baseCost * 1
 *   - 1 -> 2: baseCost * 1
 *   - 2 -> 3: baseCost * 2
 *   - 3 -> 4: baseCost * 3
 *   - 4 -> 5: baseCost * 4
 *   - ...
 *   - (N-1) -> N: baseCost * (N-1)
 *
 * For multiple levels (e.g. 1 -> 3), it sums the costs of each intermediate step.
 */
export function calculateProgressionCost(
  baseCost: number,
  currentLevel: number,
  targetLevel: number
): number {
  if (baseCost <= 0) return 0;
  const from = Math.max(0, Math.floor(currentLevel));
  const to = Math.max(0, Math.floor(targetLevel));
  if (to <= from) return 0;

  let total = 0;
  for (let l = from; l < to; l++) {
    total += baseCost * Math.max(1, l);
  }
  return total;
}

/**
 * Generates a full breakdown of steps from Level 1 up to maxLevel.
 */
export function getProgressionBreakdown(
  baseCost: number,
  maxLevel: number = 5
): ProgressionStep[] {
  if (baseCost <= 0 || maxLevel < 1) return [];
  const steps: ProgressionStep[] = [];
  let cumulative = 0;

  for (let target = 1; target <= maxLevel; target++) {
    const fromLevel = target === 1 ? 0 : target - 1;
    const stepCost = baseCost * Math.max(1, fromLevel);
    cumulative += stepCost;
    steps.push({
      fromLevel,
      toLevel: target,
      cost: stepCost,
      cumulativeCost: cumulative,
    });
  }

  return steps;
}
