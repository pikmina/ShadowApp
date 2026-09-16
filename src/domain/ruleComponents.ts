import { z } from 'zod';

export const ruleDurationSchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('instant') }),
  z.strictObject({ mode: z.literal('turns'), turns: z.number().int().positive() }),
  z.strictObject({ mode: z.literal('sustained') }),
  z.strictObject({ mode: z.literal('while_condition') }),
]);
export const predicateSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('contact'), sense: z.enum(['physical', 'visual', 'auditory']) }),
  z.strictObject({ kind: z.literal('conscious') }),
  z.strictObject({ kind: z.literal('resource'), resourceId: z.enum(['ES', 'SA']), comparison: z.enum(['lte', 'gte']), percent: z.number().min(0).max(100) }),
  z.strictObject({ kind: z.literal('ability_active'), abilityId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('item'), elementId: z.string().min(1), quantity: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('consumable'), elementId: z.string().min(1), quantity: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('manual'), signalId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('die'), min: z.number().int().positive(), max: z.number().int().positive() }),
]);
export const consequenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('resource'), resourceId: z.enum(['ES', 'SA']), amount: z.number().nonnegative() }),
  z.strictObject({ kind: z.literal('attribute'), attributeId: z.string().min(1), amount: z.number(), turns: z.number().int().positive(), untilEnd: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('status'), statusElementId: z.string().min(1), turns: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('recoil'), fraction: z.number().min(0).max(1) }),
  z.strictObject({ kind: z.literal('consume'), elementId: z.string().min(1), quantity: z.number().int().positive() }),
]);
export const ruleComponentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('target'), self: z.boolean(), allies: z.boolean(), enemies: z.boolean() }),
  z.strictObject({ kind: z.literal('target_count'), min: z.number().int().positive(), max: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('range'), meters: z.number().nonnegative() }),
  z.strictObject({ kind: z.literal('area'), radius: z.number().positive() }),
  z.strictObject({ kind: z.literal('duration'), duration: ruleDurationSchema }),
  z.strictObject({ kind: z.literal('activation'), turns: z.number().int().nonnegative(), signalId: z.string(), passive: z.boolean() }),
  z.strictObject({ kind: z.literal('cooldown'), turns: z.number().int().nonnegative() }),
  z.strictObject({ kind: z.literal('maintenance'), resourceId: z.enum(['ES', 'SA']), amount: z.number().nonnegative() }),
  z.strictObject({ kind: z.literal('usage'), period: z.enum(['turn', 'combat', 'mission', 'day']), max: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('condition'), role: z.enum(['condition', 'requirement', 'limiter']), match: z.enum(['all', 'any']), predicates: z.array(predicateSchema).min(1) }),
  z.strictObject({ kind: z.literal('consequence'), role: z.enum(['cost', 'consequence']), when: z.enum(['activation', 'each_turn', 'end', 'after_damage']), consequence: consequenceSchema }),
  z.strictObject({ kind: z.literal('cap'), subject: z.enum(['stamina_cost', 'damage', 'healing', 'barrier', 'attribute_modifier']), min: z.number(), max: z.number() }),
]).superRefine((component, ctx) => {
  if (component.kind === 'cap' && component.subject !== 'attribute_modifier' && component.min < 0) ctx.addIssue({ code: 'custom', message: 'Este límite no admite valores negativos' });
  if ((component.kind === 'cap' || component.kind === 'target_count') && component.min > component.max) ctx.addIssue({ code: 'custom', message: 'El mínimo supera al máximo' });
  if (component.kind === 'target' && !component.self && !component.allies && !component.enemies) ctx.addIssue({ code: 'custom', message: 'Selecciona al menos una relación' });
  if (component.kind === 'condition' && component.predicates.some(p => p.kind === 'die' && p.min > p.max)) ctx.addIssue({ code: 'custom', message: 'Intervalo de dados inválido' });
  if (component.kind === 'activation' && component.passive && (component.turns !== 0 || component.signalId !== '')) ctx.addIssue({ code: 'custom', message: 'Un pasivo no tiene activación demorada ni señal manual' });
  if (component.kind === 'consequence' && component.consequence.kind === 'recoil' && component.when !== 'after_damage') ctx.addIssue({ code: 'custom', message: 'Recoil se resuelve después del daño' });
  if (component.kind === 'consequence' && component.role === 'cost' && component.when !== 'activation') ctx.addIssue({ code: 'custom', message: 'El coste se paga al activar; usa consecuencia para otros momentos' });
});
export type RuleComponent = z.infer<typeof ruleComponentSchema>;
export type RulePredicate = z.infer<typeof predicateSchema>;
export type RuleDuration = z.infer<typeof ruleDurationSchema>;
