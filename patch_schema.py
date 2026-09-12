import re

with open('src/domain/systemMechanics.ts', 'r') as f:
    content = f.read()

# Add duration to baseEffectShape
old_base = """const baseEffectShape = {
  id: z.string().min(1),
  timing: effectTimingSchema,
  targeting: effectTargetingSchema,
  costRules: z.array(costRuleReferenceSchema).default([]),
};"""

new_base = """const durationSchema = z.strictObject({
  value: z.number().int().positive(),
  unit: z.enum(["turn", "round", "scene"]),
});

const baseEffectShape = {
  id: z.string().min(1),
  timing: effectTimingSchema,
  targeting: effectTargetingSchema,
  costRules: z.array(costRuleReferenceSchema).default([]),
  duration: durationSchema.optional(),
};"""

# Remove the old durationSchema definition that was below baseEffectShape
content = content.replace("const durationSchema = z.strictObject({\n  value: z.number().int().positive(),\n  unit: z.enum([\"turn\", \"round\", \"scene\"]),\n});", "")
content = content.replace(old_base, new_base)

# Remove duration from barrier
old_barrier = """  z.strictObject({
    ...baseEffectShape,
    type: z.literal("barrier"),
    amount: z.number().positive(),
    duration: durationSchema.optional(),
  }),"""

new_barrier = """  z.strictObject({
    ...baseEffectShape,
    type: z.literal("barrier"),
    amount: z.number().positive(),
  }),"""
content = content.replace(old_barrier, new_barrier)

# Remove duration from status
old_status = """  z.strictObject({
    ...baseEffectShape,
    type: z.literal("status"),
    statusElementId: z.string().min(1),
    duration: durationSchema.optional(),
  }),"""

new_status = """  z.strictObject({
    ...baseEffectShape,
    type: z.literal("status"),
    statusElementId: z.string().min(1),
  }),"""
content = content.replace(old_status, new_status)

with open('src/domain/systemMechanics.ts', 'w') as f:
    f.write(content)
