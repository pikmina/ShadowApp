import { expect, test, describe } from 'vitest';
import { z } from 'zod';

describe('API Input Validation', () => {
  const RewardSchema = z.object({
    type: z.enum(['exp', 'yen']),
    amount: z.number().int().min(-100000).max(100000).refine(val => val !== 0, { message: "Amount cannot be 0" }),
    reason: z.string().optional()
  });

  const PurchaseSchema = z.object({
    characterId: z.number().int().positive(),
    cartItems: z.array(z.object({
      offerId: z.string().min(1),
      quantity: z.number().int().positive(),
      selectedCurrency: z.enum(['exp', 'yen'])
    }))
  });

  test('Rejects decimal rewards', () => {
    expect(RewardSchema.safeParse({ type: 'exp', amount: 10.5 }).success).toBe(false);
  });

  test('Rejects zero reward', () => {
    expect(RewardSchema.safeParse({ type: 'exp', amount: 0 }).success).toBe(false);
  });

  test('Accepts negative reward', () => {
    expect(RewardSchema.safeParse({ type: 'exp', amount: -50 }).success).toBe(true);
  });

  test('Purchase rejects zero or negative quantity', () => {
    expect(PurchaseSchema.safeParse({ characterId: 1, cartItems: [{ offerId: "1", quantity: 0, selectedCurrency: "exp" }] }).success).toBe(false);
    expect(PurchaseSchema.safeParse({ characterId: 1, cartItems: [{ offerId: "1", quantity: -5, selectedCurrency: "exp" }] }).success).toBe(false);
  });

  test('Purchase rejects invalid currency', () => {
    expect(PurchaseSchema.safeParse({ characterId: 1, cartItems: [{ offerId: "1", quantity: 1, selectedCurrency: "gold" }] }).success).toBe(false);
  });
});
