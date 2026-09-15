import { z } from 'zod';
import { requirementGroupSchema } from './requirements.ts';

const compensationEntrySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  yen: z.number().int().min(0),
  exp: z.number().int().min(0),
});

export const employmentCompensationSchema = z.strictObject({
  version: z.literal(1),
  manualApprovalRequired: z.literal(true),
  levels: z.array(compensationEntrySchema).min(1),
  risks: z.array(compensationEntrySchema).min(1),
}).superRefine((value, ctx) => {
  for (const key of ['levels', 'risks'] as const) {
    const seen = new Set<string>();
    value[key].forEach((entry, index) => {
      if (seen.has(entry.id)) ctx.addIssue({ code: 'custom', path: [key, index, 'id'], message: `Duplicate ${key} id` });
      seen.add(entry.id);
    });
  }
});

export type EmploymentCompensation = z.infer<typeof employmentCompensationSchema>;

export const employmentBonusSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  requirements: requirementGroupSchema,
  yen: z.number().int().min(0),
  exp: z.number().int().min(0),
});

export const positionEmploymentRulesSchema = z.object({
  levelId: z.string().min(1).nullable().optional(),
  riskId: z.string().min(1).nullable().optional(),
  bonusYen: z.number().int().min(0).optional(),
  bonusExp: z.number().int().min(0).optional(),
  minPosts: z.number().int().min(0).nullable().optional(),
  requirements: requirementGroupSchema.optional(),
  optionalBonuses: z.array(employmentBonusSchema).optional(),
});

export type EmploymentBonus = z.infer<typeof employmentBonusSchema>;

export const defaultEmploymentCompensation: EmploymentCompensation = {
  version: 1,
  manualApprovalRequired: true,
  levels: [
    { id: 'level_1', name: 'Nivel I', yen: 400, exp: 400 },
    { id: 'level_2', name: 'Nivel II', yen: 300, exp: 300 },
    { id: 'level_3', name: 'Nivel III', yen: 250, exp: 250 },
    { id: 'level_4', name: 'Nivel IV', yen: 200, exp: 200 },
    { id: 'level_5', name: 'Nivel V', yen: 100, exp: 100 },
    { id: 'level_6', name: 'Nivel VI', yen: 50, exp: 50 },
    { id: 'per_topic', name: 'Por tema', yen: 30, exp: 30 },
    { id: 'per_article', name: 'Por artículo', yen: 40, exp: 40 },
    { id: 'per_sale', name: 'Por venta', yen: 50, exp: 50 },
  ],
  risks: [
    { id: 'none', name: 'Ninguno', yen: 0, exp: 0 },
    { id: 'low', name: 'Leve', yen: 20, exp: 0 },
    { id: 'moderate', name: 'Moderado', yen: 30, exp: 10 },
    { id: 'serious', name: 'Grave', yen: 40, exp: 20 },
    { id: 'extreme', name: 'Extremo', yen: 50, exp: 30 },
  ],
};

export function calculateEmploymentCompensation(
  config: EmploymentCompensation,
  levelId: string,
  riskId: string,
  bonusYen = 0,
  bonusExp = 0,
) {
  const parsed = employmentCompensationSchema.parse(config);
  if (!Number.isSafeInteger(bonusYen) || bonusYen < 0 || !Number.isSafeInteger(bonusExp) || bonusExp < 0) {
    throw new Error('Employment bonuses must be non-negative safe integers');
  }
  const level = parsed.levels.find(entry => entry.id === levelId);
  const risk = parsed.risks.find(entry => entry.id === riskId);
  if (!level) throw new Error(`Unknown employment level: ${levelId}`);
  if (!risk) throw new Error(`Unknown employment risk: ${riskId}`);
  return {
    levelYen: level.yen,
    levelExp: level.exp,
    riskYen: risk.yen,
    riskExp: risk.exp,
    bonusYen,
    bonusExp,
    totalYen: level.yen + risk.yen + bonusYen,
    totalExp: level.exp + risk.exp + bonusExp,
  };
}
