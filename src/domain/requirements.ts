import { z } from 'zod';

const comparisonSchema = z.enum(['eq', 'gte', 'lte', 'includes']);

export const requirementSchema: z.ZodType<any> = z.lazy(() => z.union([
  z.strictObject({ id: z.string().min(1), type: z.literal('owns_element'), elementId: z.string().min(1), quantity: z.number().int().positive().optional() }),
  z.strictObject({ id: z.string().min(1), type: z.literal('attribute'), attributeId: z.string().min(1), comparison: comparisonSchema, value: z.number() }),
  z.strictObject({ id: z.string().min(1), type: z.literal('skill_level'), skillElementId: z.string().min(1), comparison: comparisonSchema, value: z.number() }),
  z.strictObject({ id: z.string().min(1), type: z.literal('stage'), stageId: z.string().min(1), comparison: z.enum(['eq', 'gte']) }),
  z.strictObject({ id: z.string().min(1), type: z.literal('age'), comparison: z.enum(['gte', 'lte']), value: z.number() }),
  z.strictObject({ id: z.string().min(1), type: z.literal('character_field'), fieldId: z.string().min(1), comparison: comparisonSchema, value: z.union([z.string(), z.number(), z.boolean()]) }),
  requirementGroupSchema,
]));

export const requirementGroupSchema: z.ZodType<any> = z.lazy(() => z.strictObject({
  operator: z.enum(['all', 'any', 'none']),
  requirements: z.array(requirementSchema),
}));

export type RequirementGroup = z.infer<typeof requirementGroupSchema>;

export type RequirementContext = {
  profile: Record<string, unknown>;
  possessions: Map<string, { quantity: number; selectedChoices?: Record<string, unknown> | null }>;
  stageIds?: string[];
};

export type RequirementEvaluation = { passed: boolean; failures: string[] };

function compare(actual: unknown, comparison: string, expected: unknown): boolean {
  if (comparison === 'eq') return actual === expected;
  if (comparison === 'gte') return Number(actual) >= Number(expected);
  if (comparison === 'lte') return Number(actual) <= Number(expected);
  if (comparison === 'includes') return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? '').includes(String(expected));
  return false;
}

export function evaluateRequirements(group: RequirementGroup, context: RequirementContext): RequirementEvaluation {
  const evaluate = (item: any): RequirementEvaluation => {
    if ('operator' in item) return evaluateRequirements(item, context);
    let passed = false;
    if (item.type === 'owns_element') passed = (context.possessions.get(item.elementId)?.quantity ?? 0) >= (item.quantity ?? 1);
    if (item.type === 'attribute') passed = compare(context.profile[item.attributeId], item.comparison, item.value);
    if (item.type === 'age') passed = compare(context.profile.basic_age ?? context.profile.age, item.comparison, item.value);
    if (item.type === 'character_field') passed = compare(context.profile[item.fieldId], item.comparison, item.value);
    if (item.type === 'stage') {
      const stage = String(context.profile.basic_stage_id ?? context.profile.stageId ?? context.profile.basic_stage ?? '');
      const index = context.stageIds?.indexOf(stage) ?? -1;
      const requiredIndex = context.stageIds?.indexOf(item.stageId) ?? -1;
      passed = item.comparison === 'eq' ? stage === item.stageId : index >= 0 && requiredIndex >= 0 && index >= requiredIndex;
    }
    if (item.type === 'skill_level') {
      const possession = context.possessions.get(item.skillElementId);
      passed = compare(possession?.selectedChoices?.level ?? 0, item.comparison, item.value);
    }
    return { passed, failures: passed ? [] : [item.id] };
  };

  const results = group.requirements.map(evaluate);
  const passed = group.operator === 'all' ? results.every(result => result.passed)
    : group.operator === 'any' ? results.some(result => result.passed)
    : results.every(result => !result.passed);
  return { passed, failures: passed ? [] : results.flatMap(result => result.failures) };
}
