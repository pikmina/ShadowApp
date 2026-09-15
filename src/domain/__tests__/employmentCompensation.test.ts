import { describe, expect, test } from 'vitest';
import { calculateEmploymentCompensation, defaultEmploymentCompensation, employmentCompensationSchema } from '../employmentCompensation';

describe('employment compensation contract', () => {
  test('combines level, risk and explicit bonuses', () => {
    expect(calculateEmploymentCompensation(defaultEmploymentCompensation, 'level_4', 'serious', 15, 5)).toEqual({
      levelYen: 200, levelExp: 200, riskYen: 40, riskExp: 20,
      bonusYen: 15, bonusExp: 5, totalYen: 255, totalExp: 225,
    });
  });

  test('requires manual approval in every valid configuration', () => {
    expect(() => employmentCompensationSchema.parse({ ...defaultEmploymentCompensation, manualApprovalRequired: false })).toThrow();
  });

  test('rejects duplicate stable IDs and invalid amounts', () => {
    expect(() => employmentCompensationSchema.parse({ ...defaultEmploymentCompensation, levels: [...defaultEmploymentCompensation.levels, defaultEmploymentCompensation.levels[0]] })).toThrow();
    expect(() => employmentCompensationSchema.parse({ ...defaultEmploymentCompensation, risks: [{ id: 'bad', name: 'Bad', yen: -1, exp: 0 }] })).toThrow();
  });

  test('does not silently substitute unknown references', () => {
    expect(() => calculateEmploymentCompensation(defaultEmploymentCompensation, 'unknown', 'none')).toThrow('Unknown employment level');
  });
});
