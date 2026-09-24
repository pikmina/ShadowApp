import { z } from 'zod';
import {
  mechanicalBehaviorSchema,
  type MechanicalBehavior,
  attackTypeSchema,
  type AttackType,
  deriveTargetDefense,
} from './mechanicalBehavior.ts';
import {
  deriveSupportDefenseRD,
  type SupportDifficultyTier,
  DEFAULT_SUPPORT_DIFFICULTY_TIERS,
} from './systemMechanics.ts';

// ==========================================
// 1. CONSTANTS & CANONICAL ENUMS
// ==========================================

export const TECHNIQUE_MIN_LEVEL = 1;
export const TECHNIQUE_MAX_LEVEL = 5;

export const TECHNIQUE_SOURCE_TYPES = ['quirk', 'physical', 'weapon'] as const;
export type TechniqueSourceType = (typeof TECHNIQUE_SOURCE_TYPES)[number];

export const techniqueSourceTypeSchema = z.enum(TECHNIQUE_SOURCE_TYPES, {
  message: `Tipo de origen inválido. Debe ser uno de: ${TECHNIQUE_SOURCE_TYPES.join(', ')}`,
});

export const techniqueLevelSchema = z
  .number({ message: 'El nivel de la técnica es obligatorio' })
  .int('El nivel de la técnica debe ser un número entero')
  .min(TECHNIQUE_MIN_LEVEL, `El nivel mínimo de una técnica es ${TECHNIQUE_MIN_LEVEL}`)
  .max(TECHNIQUE_MAX_LEVEL, `El nivel máximo de una técnica es ${TECHNIQUE_MAX_LEVEL}`);

/**
 * Pure canonical helper: derives the technique level from the structural Stamina cost.
 * - Cost 0–5: Level 1 (Despertar)
 * - Cost 6–10: Level 2 (Dominio)
 * - Cost 11+: Level 3 (Trascendencia)
 */
export function deriveTechniqueLevelFromCost(structuralCost: number): {
  level: number;
  label: string;
  tierName: string;
} {
  const cost = Math.max(0, structuralCost);
  if (cost <= 5) {
    return { level: 1, label: 'Nivel 1 · Despertar', tierName: 'Despertar' };
  }
  if (cost <= 10) {
    return { level: 2, label: 'Nivel 2 · Dominio', tierName: 'Dominio' };
  }
  return { level: 3, label: 'Nivel 3 · Trascendencia', tierName: 'Trascendencia' };
}

// ==========================================
// 2. CHARACTER TECHNIQUE DOMAIN ENTITY
// ==========================================

export const characterTechniqueSchema = z.object({
  id: z.string().min(1, 'El ID de la técnica es obligatorio'),
  characterId: z.number().int().positive('El ID del personaje es obligatorio'),
  name: z.string().trim().min(1, 'El nombre de la técnica es obligatorio'),
  description: z.string().optional().default(''),
  level: techniqueLevelSchema.default(1),
  sourceType: techniqueSourceTypeSchema,
  activationAttributeId: z.string().trim().nullable().optional(),
  mechanicalBehaviors: z.array(mechanicalBehaviorSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  revision: z.number().int().positive().default(1),
});

export type CharacterTechnique = z.infer<typeof characterTechniqueSchema>;

// ==========================================
// 3. INPUT SCHEMAS (CREATE & UPDATE)
// ==========================================

export const createCharacterTechniqueSchema = z
  .object({
    id: z.string().optional(),
    characterId: z.number().int().positive('El ID del personaje es obligatorio'),
    name: z.string().trim().min(1, 'El nombre de la técnica es obligatorio'),
    description: z.string().optional().default(''),
    level: techniqueLevelSchema.default(1),
    sourceType: techniqueSourceTypeSchema,
    activationAttributeId: z.string().trim().nullable().optional(),
    mechanicalBehaviors: z.array(mechanicalBehaviorSchema).default([]),
  })
  .strict();

export type CreateCharacterTechniqueInput = z.input<typeof createCharacterTechniqueSchema>;

export const updateCharacterTechniqueSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre de la técnica no puede estar vacío').optional(),
    description: z.string().optional(),
    level: techniqueLevelSchema.optional(),
    sourceType: techniqueSourceTypeSchema.optional(),
    activationAttributeId: z.string().trim().nullable().optional(),
    mechanicalBehaviors: z.array(mechanicalBehaviorSchema).optional(),
    expectedRevision: z.number().int().positive().optional(),
  })
  .strict();

export type UpdateCharacterTechniqueInput = z.input<typeof updateCharacterTechniqueSchema>;

// ==========================================
// 4. FUNCTIONAL CLASSIFICATION (PART A)
// ==========================================

export const TECHNIQUE_FUNCTIONAL_CATEGORIES = [
  'offensive',
  'support',
  'defensive',
  'control',
] as const;

export type TechniqueFunctionalCategory = (typeof TECHNIQUE_FUNCTIONAL_CATEGORIES)[number];

export const techniqueFunctionalCategorySchema = z.enum(TECHNIQUE_FUNCTIONAL_CATEGORIES, {
  message: `Categoría funcional inválida. Debe ser una de: ${TECHNIQUE_FUNCTIONAL_CATEGORIES.join(', ')}`,
});

/**
 * Pure deterministic helper that derives functional categories from MechanicalBehavior[].
 *
 * Rules:
 * - Does NOT persist its result.
 * - Inspects structured mechanics only (ignores name, description, sourceType, IDs, narrative text).
 * - Inspects all MechanicalBehavior[] and their effects (including branch outcome effects).
 * - Applies directional modifiers:
 *     - outgoing_damage_modifier: offensive only if operation/amount increases damage
 *     - outgoing_healing_modifier: support only if operation/amount increases healing
 *     - incoming_damage_modifier: defensive only if operation/amount reduces incoming damage
 * - Ambiguous effects (resource_modifier, cost_modifier, inventory, counter, manual, etc.) are unclassified.
 * - Deduplicates categories and returns them in canonical order: ['offensive', 'support', 'defensive', 'control'].
 * - Empty or unclassifiable behaviors return []. Never returns 'utility'.
 */
export function deriveTechniqueFunctionalCategories(
  input: CharacterTechnique | MechanicalBehavior[]
): TechniqueFunctionalCategory[] {
  const behaviors = Array.isArray(input) ? input : (input?.mechanicalBehaviors ?? []);
  if (!behaviors || behaviors.length === 0) {
    return [];
  }

  const categorySet = new Set<TechniqueFunctionalCategory>();

  for (const behavior of behaviors) {
    if (!behavior) continue;

    // Collect all effects to inspect: root effects and any branch outcome effects
    const allEffects = [...(behavior.effects ?? [])];
    if (behavior.resolution?.outcomes) {
      for (const outcome of behavior.resolution.outcomes) {
        if (outcome.effects) {
          allEffects.push(...outcome.effects);
        }
      }
    }

    for (const eff of allEffects) {
      if (!eff) continue;

      switch (eff.type) {
        // --- OFFENSIVE ---
        case 'damage':
          categorySet.add('offensive');
          break;

        case 'penalty':
          categorySet.add('offensive');
          break;

        case 'outgoing_damage_modifier': {
          const op = eff.operation ?? 'add';
          const amt = eff.amount;
          // Increases damage if: add > 0, or multiply > 1
          if ((op === 'add' && amt > 0) || (op === 'multiply' && amt > 1)) {
            categorySet.add('offensive');
          }
          break;
        }

        // --- SUPPORT ---
        case 'healing':
          categorySet.add('support');
          break;

        case 'bonus':
          categorySet.add('support');
          break;

        case 'outgoing_healing_modifier': {
          const op = eff.operation ?? 'add';
          const amt = eff.amount;
          // Increases healing if: add > 0, or multiply > 1
          if ((op === 'add' && amt > 0) || (op === 'multiply' && amt > 1)) {
            categorySet.add('support');
          }
          break;
        }

        case 'incoming_healing_modifier': {
          const op = eff.operation ?? 'add';
          const amt = eff.amount;
          if ((op === 'add' && amt > 0) || (op === 'multiply' && amt > 1)) {
            categorySet.add('support');
          }
          break;
        }

        // --- DEFENSIVE ---
        case 'barrier':
          categorySet.add('defensive');
          break;

        case 'incoming_damage_modifier': {
          const op = eff.operation ?? 'add';
          const amt = eff.amount;
          // Reduces incoming damage if: subtract > 0, or add < 0, or multiply < 1
          if (
            (op === 'subtract' && amt > 0) ||
            (op === 'add' && amt < 0) ||
            (op === 'multiply' && amt >= 0 && amt < 1)
          ) {
            categorySet.add('defensive');
          }
          break;
        }

        // --- CONTROL ---
        case 'status_apply':
          categorySet.add('control');
          break;

        case 'turn_loss':
          categorySet.add('control');
          break;

        case 'action_block':
          categorySet.add('control');
          break;

        case 'effect_block':
          categorySet.add('control');
          break;

        // --- INTENTIONALLY UNCLASSIFIED (AMBIGUOUS / NON-CATEGORICAL) ---
        // resource_modifier, cost_modifier, counter_modifier, inventory_consume,
        // inventory_reserve, inventory_release, currency, experience, manual,
        // status_remove, attribute_modifier, skill_modifier, derived_stat_modifier,
        // roll_modifier, cutoff_modifier, rd_modifier
        default:
          break;
      }
    }
  }

  // Return categories in deterministic canonical order
  return TECHNIQUE_FUNCTIONAL_CATEGORIES.filter((cat) => categorySet.has(cat));
}

// ==========================================
// 5. TECHNIQUE ROLL & OPPOSITION CONTRACT (PART B)
// ==========================================

export const OPPOSITION_KINDS = [
  'target_evasion',
  'target_courage',
  'support_defense_rd',
  'explicit_rd',
  'narrator_rd',
] as const;
export type OppositionKind = (typeof OPPOSITION_KINDS)[number];

export const techniqueOppositionSchema = z.object({
  kind: z.enum(OPPOSITION_KINDS),
  targetDefense: z.enum(['EVA', 'COR']).optional(),
  derivedDifficulty: z.number().int().optional(),
  explicitDifficulty: z.number().int().optional(),
  label: z.string(),
});
export type TechniqueOpposition = z.infer<typeof techniqueOppositionSchema>;

export const techniqueBehaviorRollContractSchema = z.object({
  behaviorId: z.string(),
  resolutionType: z.enum(['automatic', 'roll', 'rd', 'manual']),
  rollType: z.enum(['ACC', 'INI', 'SAL', 'RES']).default('ACC'),
  requiresRoll: z.boolean(),
  attribute: z.string().optional(),
  skill: z.string().optional(),
  attackType: attackTypeSchema.optional(),
  difficulty: z.number().int().optional(),
  opposition: techniqueOppositionSchema.optional(),
  rollFormula: z.string().optional(),
  complete: z.boolean(),
  warnings: z.array(z.string()),
});

export type TechniqueBehaviorRollContract = z.infer<typeof techniqueBehaviorRollContractSchema>;

export const techniqueRollContractSchema = z.object({
  behaviors: z.array(techniqueBehaviorRollContractSchema),
  hasRoll: z.boolean(),
  complete: z.boolean(),
  warnings: z.array(z.string()),
});

export type TechniqueRollContract = z.infer<typeof techniqueRollContractSchema>;

export interface DeriveTechniqueRollContractOptions {
  structuralCost?: number;
  supportDifficultyTiers?: SupportDifficultyTier[];
  activationAttributeId?: string | null;
  activationAttribute?: string | null;
}

export interface EffectiveBehaviorResolution {
  type: 'automatic' | 'roll' | 'rd' | 'manual';
  isDerived: boolean;
  rollType: 'ACC' | 'INI' | 'SAL' | 'RES';
  requiresRoll: boolean;
  attribute?: string;
  skill?: string;
  difficulty?: number;
  attackType?: AttackType;
  oppositionKind?: OppositionKind;
  oppositionLabel?: string;
  targetDefense?: 'EVA' | 'COR';
  summaryLabel: string;
}

/**
 * Single authoritative domain helper that derives the effective resolution of a behavior.
 * Precedence for attribute:
 * 1. Explicit behavior attribute (behavior.resolution.attribute)
 * 2. Technique activation attribute (options.activationAttributeId / options.activationAttribute)
 * 3. undefined
 *
 * Precedence for resolution:
 * 1. Explicit user override (isExplicit === true, or 'rd'/'manual' or explicit configured fields)
 * 2. Automatic derivation:
 *    - Offensive with Physical damage -> ACC vs Evasión (EVA)
 *    - Offensive with Mental/Psychic damage -> ACC vs Coraje (COR)
 *    - Support / Defensive with structural cost -> ACC vs RD (derived tier)
 *    - Default -> Automática (Sin tirada)
 */
export function deriveEffectiveBehaviorResolution(
  behavior: MechanicalBehavior,
  options?: DeriveTechniqueRollContractOptions
): EffectiveBehaviorResolution {
  const behaviorCategories = deriveTechniqueFunctionalCategories([behavior]);
  const isSupportOrDefensive = behaviorCategories.includes('support') || behaviorCategories.includes('defensive');
  const hasDamage = (behavior.effects || []).some((e) => e.type === 'damage');
  const damageEff = (behavior.effects || []).find((e) => e.type === 'damage');
  const isOffensive = behaviorCategories.includes('offensive') || hasDamage;
  const isDamageMental = damageEff?.damageType === 'psiquico' || (damageEff as any)?.tag === 'mental';
  const isDamagePhysical = damageEff?.damageType === 'fisico';

  const storedRes = behavior.resolution;
  const explicitAttr = storedRes?.attribute?.trim() || undefined;
  const fallbackAttr = (options?.activationAttributeId ?? options?.activationAttribute)?.trim() || undefined;
  const effectiveAttribute = explicitAttr ?? fallbackAttr;

  // An explicit override exists ONLY if:
  // 1. isExplicit or explicitOverride is true
  // 2. storedRes.type is 'rd' or 'manual'
  // 3. storedRes.type is 'roll' and user provided specific non-derived settings (e.g. attribute or skill or explicit attackType)
  const isExplicit = Boolean(
    (storedRes as any)?.isExplicit === true ||
    (storedRes as any)?.explicitOverride === true ||
    (storedRes && (storedRes.type === 'rd' || storedRes.type === 'manual')) ||
    (storedRes && storedRes.type === 'roll' && (storedRes.attribute || storedRes.skill || storedRes.attackType || (storedRes as any).isExplicit))
  );

  if (isExplicit && storedRes) {
    let attackType = storedRes.attackType;
    if (storedRes.type === 'roll' && !attackType && isOffensive) {
      if (isDamageMental) attackType = 'mental';
      else if (isDamagePhysical) attackType = 'physical';
      // else if damage exists but without damageType, leave undefined for validation warning
    }

    let oppositionKind: OppositionKind | undefined = undefined;
    let oppositionLabel: string | undefined = undefined;
    let targetDefense: 'EVA' | 'COR' | undefined = undefined;
    let difficulty = storedRes.difficulty;

    if (storedRes.type === 'roll') {
      if (attackType === 'physical') {
        targetDefense = 'EVA';
        oppositionKind = 'target_evasion';
        oppositionLabel = 'Evasión';
      } else if (attackType === 'mental') {
        targetDefense = 'COR';
        oppositionKind = 'target_courage';
        oppositionLabel = 'Coraje';
      }
    } else if (storedRes.type === 'rd') {
      if (storedRes.difficulty !== undefined) {
        oppositionKind = 'explicit_rd';
        oppositionLabel = `RD ${storedRes.difficulty}`;
      } else if (isSupportOrDefensive && options?.structuralCost !== undefined) {
        const derivedRd = deriveSupportDefenseRD(options.structuralCost, options.supportDifficultyTiers);
        difficulty = derivedRd;
        oppositionKind = 'support_defense_rd';
        oppositionLabel = `RD ${derivedRd}`;
      } else {
        oppositionKind = 'narrator_rd';
        oppositionLabel = 'RD del Narrador';
      }
    }

    const requiresRoll = storedRes.type === 'roll' || storedRes.type === 'rd';
    const summaryLabel = storedRes.type === 'automatic'
      ? 'Automática (Sin tirada)'
      : storedRes.type === 'roll'
      ? `Acción (ACC) vs ${oppositionLabel || 'Oposición'}`
      : storedRes.type === 'rd'
      ? `Acción (ACC) vs ${oppositionLabel || 'RD'}`
      : 'Resolución manual';

    return {
      type: storedRes.type,
      attribute: effectiveAttribute,
      skill: storedRes.skill,
      difficulty,
      attackType,
      isDerived: false,
      rollType: 'ACC',
      requiresRoll,
      oppositionKind,
      oppositionLabel,
      targetDefense,
      summaryLabel,
    };
  }

  // Otherwise, DERIVE resolution automatically based on classification:
  if (isOffensive) {
    const attackType: AttackType = isDamageMental ? 'mental' : 'physical';
    const targetDefense: 'EVA' | 'COR' = attackType === 'physical' ? 'EVA' : 'COR';
    const oppositionLabel = attackType === 'physical' ? 'Evasión' : 'Coraje';
    const oppositionKind: OppositionKind = attackType === 'physical' ? 'target_evasion' : 'target_courage';

    return {
      type: 'roll',
      attackType,
      attribute: effectiveAttribute,
      skill: storedRes?.skill,
      isDerived: true,
      rollType: 'ACC',
      requiresRoll: true,
      oppositionKind,
      oppositionLabel,
      targetDefense,
      summaryLabel: `Acción (ACC) vs ${oppositionLabel}`,
    };
  }

  if (isSupportOrDefensive && options?.structuralCost !== undefined) {
    const derivedRd = deriveSupportDefenseRD(options.structuralCost, options.supportDifficultyTiers);
    return {
      type: 'rd',
      difficulty: derivedRd,
      attribute: effectiveAttribute,
      skill: storedRes?.skill,
      isDerived: true,
      rollType: 'ACC',
      requiresRoll: true,
      oppositionKind: 'support_defense_rd',
      oppositionLabel: `RD ${derivedRd}`,
      summaryLabel: `Acción (ACC) vs RD ${derivedRd}`,
    };
  }

  return {
    type: 'automatic',
    attribute: effectiveAttribute,
    skill: storedRes?.skill,
    difficulty: storedRes?.difficulty,
    isDerived: true,
    rollType: 'ACC',
    requiresRoll: false,
    summaryLabel: 'Automática (Sin tirada)',
  };
}

/**
 * Resolves a user-friendly display name for a mechanical behavior without exposing technical IDs.
 * Precedence:
 * 1. Valid non-empty behavior.name
 * 2. "Comportamiento {index + 1}" (if index is a non-negative number)
 * 3. "Este comportamiento" (generic fallback when no name or index is available)
 */
export function getBehaviorDisplayName(
  behavior?: Partial<MechanicalBehavior> | null,
  index?: number
): string {
  if (behavior?.name && behavior.name.trim().length > 0) {
    return behavior.name.trim();
  }
  if (typeof index === 'number' && index >= 0) {
    return `Comportamiento ${index + 1}`;
  }
  return 'Este comportamiento';
}

/**
 * Pure domain helper that inspects a CharacterTechnique or MechanicalBehavior[]
 * and reports its configured roll requirements and opposition contract without calculating dice.
 */
export function deriveTechniqueRollContract(
  input: CharacterTechnique | MechanicalBehavior[],
  options?: DeriveTechniqueRollContractOptions
): TechniqueRollContract {
  const isTechnique = !Array.isArray(input);
  const behaviors = isTechnique ? (input?.mechanicalBehaviors ?? []) : input;
  const techActivationAttr = isTechnique ? (input as CharacterTechnique).activationAttributeId : undefined;

  const mergedOptions: DeriveTechniqueRollContractOptions = {
    ...options,
    activationAttributeId: options?.activationAttributeId !== undefined
      ? options.activationAttributeId
      : (options?.activationAttribute !== undefined ? options.activationAttribute : techActivationAttr),
  };

  if (!behaviors || behaviors.length === 0) {
    return {
      behaviors: [],
      hasRoll: false,
      complete: true,
      warnings: [],
    };
  }

  const behaviorContracts: TechniqueBehaviorRollContract[] = [];

  for (let idx = 0; idx < behaviors.length; idx++) {
    const behavior = behaviors[idx];
    const behaviorId = behavior.id || `behavior_${idx + 1}`;
    const effRes = deriveEffectiveBehaviorResolution(behavior, mergedOptions);

    const resolutionType = effRes.type;
    const rollType = effRes.rollType;
    const requiresRoll = effRes.requiresRoll;
    const attackType = effRes.attackType;
    const attribute = effRes.attribute?.trim() ? effRes.attribute.trim() : undefined;
    const skill = effRes.skill?.trim() ? effRes.skill.trim() : undefined;
    const explicitDifficulty = effRes.difficulty;

    let opposition: TechniqueOpposition | undefined = undefined;
    if (effRes.oppositionKind && effRes.oppositionLabel) {
      opposition = {
        kind: effRes.oppositionKind,
        targetDefense: effRes.targetDefense,
        derivedDifficulty: effRes.oppositionKind === 'support_defense_rd' ? effRes.difficulty : undefined,
        explicitDifficulty: effRes.oppositionKind === 'explicit_rd' ? effRes.difficulty : undefined,
        label: effRes.oppositionLabel,
      };
    }

    const warnings: string[] = [];
    let complete = true;

    const behaviorCategories = deriveTechniqueFunctionalCategories([behavior]);
    const isOffensive = behaviorCategories.includes('offensive') || (behavior.effects || []).some((e) => e.type === 'damage');

    const displayName = getBehaviorDisplayName(behavior, idx);
    const subject = displayName === 'Este comportamiento' ? displayName : `El comportamiento "${displayName}"`;

    if (requiresRoll) {
      if (!attribute) {
        complete = false;
        warnings.push(
          `${subject} requiere especificar un atributo para la tirada de resolución.`
        );
      }

      if (resolutionType === 'roll' && !attackType && isOffensive) {
        complete = false;
        warnings.push(
          `${subject} de ataque requiere clasificar el tipo de ataque (Físico o Mental).`
        );
      }
    }

    let rollFormula: string | undefined = effRes.summaryLabel;
    if (requiresRoll && attribute) {
      const parts = ['2D10', attribute];
      if (skill) parts.push(skill);
      const formulaLeft = parts.join(' + ');
      const oppLabel = opposition ? opposition.label : 'RD';
      rollFormula = `${formulaLeft} vs. ${oppLabel}`;
    }

    behaviorContracts.push({
      behaviorId,
      resolutionType,
      rollType,
      requiresRoll,
      attribute,
      skill,
      attackType,
      difficulty: explicitDifficulty,
      opposition,
      rollFormula,
      complete,
      warnings,
    });
  }

  const hasRoll = behaviorContracts.some((b) => b.requiresRoll);
  const allComplete = behaviorContracts.every((b) => b.complete);
  const allWarnings = behaviorContracts.flatMap((b) => b.warnings);

  return {
    behaviors: behaviorContracts,
    hasRoll,
    complete: allComplete,
    warnings: allWarnings,
  };
}
