import { resolveAppliedMechanics, validatePersistedMechanicalEffects, type SystemMechanicsConfig } from './systemMechanics.ts';
import { mechanicalBehaviorsSchema, isMechanicalBehaviorList } from './mechanicalBehavior.ts';

export function validateElementMechanics(
  effects: unknown[],
  status: string,
  mechanics: SystemMechanicsConfig,
  mechanicalBehaviors?: unknown[]
): string[] {
  if (mechanicalBehaviors && Array.isArray(mechanicalBehaviors) && mechanicalBehaviors.length > 0) {
    const parsedBehaviors = mechanicalBehaviorsSchema.safeParse(mechanicalBehaviors);
    if (!parsedBehaviors.success) {
      return ['Formato de comportamientos mecánicos inválido: ' + parsedBehaviors.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')];
    }
  }

  if (isMechanicalBehaviorList(effects)) {
    const parsedBehaviors = mechanicalBehaviorsSchema.safeParse(effects);
    if (!parsedBehaviors.success) {
      return ['Formato de comportamientos mecánicos inválido: ' + parsedBehaviors.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')];
    }
    return [];
  }

  const parsed = validatePersistedMechanicalEffects(effects);
  if (!parsed.valid) return ['Formato de referencias o efectos inválido'];
  if (status === 'published' && (parsed.canonicalEffects.length || parsed.legacyEffects.length)) return ['Sustituye los efectos anteriores por referencias globales antes de publicar'];
  const resolution = resolveAppliedMechanics(parsed.appliedMechanics, mechanics);
  return resolution.issues.map(issue => `${issue.applicationId}: ${issue.code}`);
}

export function assertElementMechanics(
  effects: unknown[],
  status: string,
  mechanics: SystemMechanicsConfig,
  mechanicalBehaviors?: unknown[]
): void {
  const issues = validateElementMechanics(effects, status, mechanics, mechanicalBehaviors);
  if (issues.length) throw Object.assign(new Error(issues.join('; ')), { status: 409 });
}
