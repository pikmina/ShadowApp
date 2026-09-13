import re

with open('src/domain/systemMechanics.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_schema = """export const staminaExecutionCostsSchema = z.strictObject({
  baseAction: z.number().int().nonnegative(),
  objectUse: z.number().int().nonnegative(),
  techniqueByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  skillByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
});"""

new_schema = """export const staminaExecutionCostsSchema = z.strictObject({
  baseAction: z.number().int().nonnegative(),
  objectUse: z.number().int().nonnegative(),
  minTechniqueCost: z.number().int().nonnegative().optional(),
  techniqueByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  skillByLevel: z.array(z.strictObject({ level: z.number().int().positive(), cost: z.number().int().nonnegative() })),
  supportDifficulty: z.array(z.strictObject({
    maxCost: z.number().int().nonnegative(),
    difficultyId: z.string().optional()
  })).optional()
});"""

content = content.replace(old_schema, new_schema)

with open('src/domain/systemMechanics.ts', 'w', encoding='utf-8') as f:
    f.write(content)
