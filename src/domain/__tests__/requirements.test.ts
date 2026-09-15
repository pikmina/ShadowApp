import { describe, expect, test } from 'vitest';
import { evaluateRequirements, requirementGroupSchema } from '../requirements';

const context = {
  profile: { FUE: 4, basic_age: 17, basic_stage: 'student', faction_group: 'U.A.' },
  possessions: new Map([
    ['license-a', { quantity: 1, selectedChoices: {} }],
    ['skill-a', { quantity: 1, selectedChoices: { level: 3 } }],
  ]),
  stageIds: ['child', 'student', 'professional'],
};

describe('canonical element requirements', () => {
  test('accepts and evaluates nested canonical groups', () => {
    const requirements = requirementGroupSchema.parse({
      operator: 'all',
      requirements: [
        { id: 'strength', type: 'attribute', attributeId: 'FUE', comparison: 'gte', value: 4 },
        { operator: 'any', requirements: [
          { id: 'license', type: 'owns_element', elementId: 'license-a' },
          { id: 'adult', type: 'age', comparison: 'gte', value: 18 },
        ] },
      ],
    });
    expect(evaluateRequirements(requirements, context)).toEqual({ passed: true, failures: [] });
  });

  test('evaluates skill levels and ordered stages', () => {
    const requirements = requirementGroupSchema.parse({ operator: 'all', requirements: [
      { id: 'skill', type: 'skill_level', skillElementId: 'skill-a', comparison: 'gte', value: 3 },
      { id: 'stage', type: 'stage', stageId: 'student', comparison: 'gte' },
    ] });
    expect(evaluateRequirements(requirements, context).passed).toBe(true);
  });

  test('rejects legacy and unknown requirement shapes', () => {
    expect(() => requirementGroupSchema.parse({ operator: 'all', requirements: [
      { _id: 'old', type: 'attribute', target: 'FUE', min: 2 },
    ] })).toThrow();
  });
});
