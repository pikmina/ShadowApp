import { resolveAppliedMechanics, validatePersistedMechanicalEffects, type SystemMechanicsConfig } from './systemMechanics';

export function validateElementMechanics(effects: unknown[], status: string, mechanics: SystemMechanicsConfig): string[] {
  const parsed = validatePersistedMechanicalEffects(effects);
  if (!parsed.valid) return ['Formato de referencias o efectos inválido'];
  if (status === 'published' && (parsed.canonicalEffects.length || parsed.legacyEffects.length)) return ['Sustituye los efectos anteriores por referencias globales antes de publicar'];
  const resolution = resolveAppliedMechanics(parsed.appliedMechanics, mechanics);
  return resolution.issues.map(issue => `${issue.applicationId}: ${issue.code}`);
}

export function assertElementMechanics(effects: unknown[], status: string, mechanics: SystemMechanicsConfig): void {
  const issues = validateElementMechanics(effects, status, mechanics);
  if (issues.length) throw Object.assign(new Error(issues.join('; ')), { status: 409 });
}
