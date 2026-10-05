import {
  systemMechanicsConfigSchema,
  type SystemMechanicsConfig,
  MECHANIC_CATEGORY_FAMILIES,
  type MechanicCategoryFamily,
  findHealingOption,
  getValidHealingOptions,
  getBarrierAmount,
  type MechanicalEffectType
} from './systemMechanics';
import type { RuleComponent } from './ruleComponents';
import { getDerivedStatLabel, getAttributeLabel } from './mechanicalLabels';

export { findHealingOption, getValidHealingOptions, getBarrierAmount };

export function getCategoryFamily(cat: { family?: string; coreKey?: string; id?: string }): MechanicCategoryFamily {
  if (cat.family && MECHANIC_CATEGORY_FAMILIES.includes(cat.family as any)) {
    return cat.family as MechanicCategoryFamily;
  }
  const key = cat.coreKey || (cat.id?.startsWith("core.") ? cat.id.slice(5) : cat.id || "");
  switch (key) {
    case "activation":
    case "trigger":
      return "activation";
    case "manual_condition":
    case "resource_threshold":
    case "additional_requirement":
    case "die_condition":
      return "condition";
    case "resolution":
    case "roll_type":
    case "manual_resolution":
      return "resolution";
    case "target":
    case "target_count":
    case "range":
    case "area":
    case "selection_restriction":
      return "target";
    case "duration":
    case "frequency":
    case "periodicity":
      return "temporality";
    case "cooldown":
    case "maintenance":
    case "usage":
      return "limitation";
    case "damage":
    case "damage_type":
    case "healing":
    case "barrier":
    case "bonus":
    case "penalty":
    case "status":
    case "status_remove":
    case "transformation":
      return "effect";
    case "cost_adjustment":
    case "health_cost":
    case "caps":
      return "cost";
    default:
      return "other";
  }
}

export const CORE_CATEGORIES = {
  damage: 'Daño',
  damage_type: 'Tipo de daño',
  healing: 'Curación',
  barrier: 'Barrera',
  numeric_modifier: 'Modificador numérico',
  derived_stat: 'Estadística derivada',
  attribute: 'Atributo',
  skill: 'Habilidad',
  status: 'Estado alterado',
  status_remove: 'Retirar / Curar Estado Alterado',
  cost_adjustment: 'Modificar coste',
  manual_resolution: 'Resolución manual',
  target: 'Objetivo',
  target_count: 'Cantidad',
  range: 'Rango',
  area: 'Área',
  selection_restriction: 'Modo de selección',
  duration: 'Duración',
  frequency: 'Frecuencia de ejecución',
  activation: 'Activación',
  trigger: 'Disparador reactivo',
  resolution: 'Tipo de resolución',
  roll_type: 'Tipo de tirada',
  cooldown: 'Cooldown',
  maintenance: 'Mantenimiento',
  usage: 'Límites de uso',
  resource_threshold: 'Umbral de recurso',
  manual_condition: 'Condición manual',
  additional_requirement: 'Requisito adicional',
  die_condition: 'Dado individual',
  health_cost: 'Coste de HP',
  self_damage: 'Daño autoinfligido',
  consequence: 'Consecuencia',
  caps: 'Límites / caps',
  transformation: 'Transformación',
  object_manipulation: 'Manipulación de objetos',
  complexity_adjustment: 'Ajuste por Complejidad',
} as const;
export type CoreCategoryKey = keyof typeof CORE_CATEGORIES;

export const RETIRED_CORE_CATEGORIES = [
  'recoil',
  'stamina_cost',
  'temporary_penalty',
  'consequence_status',
  'end_effect',
  'per_turn_effect',
  'bonus',
  'penalty',
] as const;

export const coreId = (key: string) => `core.${key}`;

export type CoreCategoryContractKind = 'effect' | 'ce_adjustment' | 'component';

export interface CoreCategoryContract {
  coreKey: CoreCategoryKey;
  kind: CoreCategoryContractKind;
  ruleClass: 'effect' | 'cost_modifier' | 'component';
  ruleClassLabel: string;
  effectType?: MechanicalEffectType;
  editorMode: 'effect' | 'parameter' | 'numeric_modifier' | 'component';
}

export const CORE_CATEGORY_CONTRACTS: Record<CoreCategoryKey, CoreCategoryContract> = {
  // B. Ajustes de CE / Parámetros
  attribute: {
    coreKey: 'attribute',
    kind: 'ce_adjustment',
    ruleClass: 'cost_modifier',
    ruleClassLabel: 'Ajuste de CE',
    editorMode: 'parameter',
  },
  skill: {
    coreKey: 'skill',
    kind: 'ce_adjustment',
    ruleClass: 'cost_modifier',
    ruleClassLabel: 'Ajuste de CE',
    editorMode: 'parameter',
  },
  derived_stat: {
    coreKey: 'derived_stat',
    kind: 'ce_adjustment',
    ruleClass: 'cost_modifier',
    ruleClassLabel: 'Ajuste de CE',
    editorMode: 'parameter',
  },
  numeric_modifier: {
    coreKey: 'numeric_modifier',
    kind: 'ce_adjustment',
    ruleClass: 'cost_modifier',
    ruleClassLabel: 'Ajuste de CE',
    editorMode: 'numeric_modifier',
  },
  damage_type: {
    coreKey: 'damage_type',
    kind: 'ce_adjustment',
    ruleClass: 'cost_modifier',
    ruleClassLabel: 'Ajuste de CE',
    editorMode: 'parameter',
  },

  // A. Efectos
  damage: {
    coreKey: 'damage',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'damage',
    editorMode: 'effect',
  },
  healing: {
    coreKey: 'healing',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'healing',
    editorMode: 'effect',
  },
  barrier: {
    coreKey: 'barrier',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'barrier',
    editorMode: 'effect',
  },
  status: {
    coreKey: 'status',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'status',
    editorMode: 'effect',
  },
  status_remove: {
    coreKey: 'status_remove',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'status_remove',
    editorMode: 'effect',
  },
  transformation: {
    coreKey: 'transformation',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'transformation',
    editorMode: 'effect',
  },
  object_manipulation: {
    coreKey: 'object_manipulation',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'object_manipulation',
    editorMode: 'effect',
  },
  cost_adjustment: {
    coreKey: 'cost_adjustment',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'cost_adjustment',
    editorMode: 'effect',
  },
  manual_resolution: {
    coreKey: 'manual_resolution',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'manual_resolution',
    editorMode: 'effect',
  },

  // C. Componentes / Reglas / Limitaciones / Activaciones
  target: { coreKey: 'target', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  target_count: { coreKey: 'target_count', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  range: { coreKey: 'range', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  area: { coreKey: 'area', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  selection_restriction: { coreKey: 'selection_restriction', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  duration: { coreKey: 'duration', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  frequency: { coreKey: 'frequency', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  activation: { coreKey: 'activation', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  trigger: { coreKey: 'trigger', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  resolution: { coreKey: 'resolution', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  roll_type: { coreKey: 'roll_type', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  cooldown: { coreKey: 'cooldown', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  maintenance: { coreKey: 'maintenance', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  usage: { coreKey: 'usage', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  resource_threshold: { coreKey: 'resource_threshold', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  manual_condition: { coreKey: 'manual_condition', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  additional_requirement: { coreKey: 'additional_requirement', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  die_condition: { coreKey: 'die_condition', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  health_cost: { coreKey: 'health_cost', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  self_damage: { coreKey: 'self_damage', kind: 'ce_adjustment', ruleClass: 'cost_modifier', ruleClassLabel: 'Ajuste de CE', editorMode: 'parameter' },
  consequence: { coreKey: 'consequence', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  caps: { coreKey: 'caps', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
  complexity_adjustment: { coreKey: 'complexity_adjustment', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
};

export function getCoreCategoryContract(category: { coreKey?: string; id?: string } | null | undefined): CoreCategoryContract | undefined {
  if (!category) return undefined;
  if (category.coreKey && category.coreKey in CORE_CATEGORY_CONTRACTS) {
    return CORE_CATEGORY_CONTRACTS[category.coreKey as CoreCategoryKey];
  }
  return undefined;
}

export function validateCoreCategoryInvariants(categories: SystemMechanicsConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const cat of categories) {
    const contract = getCoreCategoryContract(cat);
    if (!contract) continue;

    for (const rule of cat.rules) {
      if (contract.kind === 'ce_adjustment') {
        if (rule.ruleType === 'effect' || rule.effect) {
          errors.push(`Regla "${rule.name}" (${rule.id}) en categoría core "${cat.name}": es un ajuste de CE y no puede definir un efecto mecánico.`);
        }
      } else if (contract.kind === 'effect') {
        if (rule.ruleType !== 'effect') {
          errors.push(`Regla "${rule.name}" (${rule.id}) en categoría core "${cat.name}": debe ser de clase 'effect'.`);
        } else if (contract.effectType && rule.effect && rule.effect.type !== contract.effectType) {
          errors.push(`Regla "${rule.name}" (${rule.id}) en categoría core "${cat.name}": tipo de efecto contradictorio '${rule.effect.type}' (se requiere '${contract.effectType}').`);
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export interface CategoryOptionView {
  id: string;
  runtimeKey: string;
  name: string;
  cost: number;
  description?: string;
  ruleType?: string;
  formula?: string;
  amount?: number;
  isAvailable: boolean;
}

/** Only CREATE / versioned migration uses these defaults. LOAD never calls this. */
export function createCoreCategories(): SystemMechanicsConfig {
  const getLogicalType = (key: string) => {
    switch(key) {
      case 'damage': case 'damage_type': case 'penalty': return 'offensive';
      case 'healing': case 'bonus': case 'numeric_modifier': return 'support';
      case 'barrier': return 'defensive';
      case 'status': return 'control';
      case 'activation': case 'cooldown': case 'maintenance': case 'usage': case 'frequency': case 'health_cost': return 'limitation';
      default: return 'utility';
    }
  };
  const categories = Object.entries(CORE_CATEGORIES).map(([key, name]) => ({
    id: coreId(key),
    coreKey: key,
    name,
    description: name,
    logicalType: getLogicalType(key) as any,
    family: getCategoryFamily({ coreKey: key }),
    scope: { techniques: true, objects: true, actions: true },
    rules: [] as any[],
  }));
  function option(key: CoreCategoryKey, suffix: string, name: string, component?: RuleComponent, runtimeKey?: string, cost: number = 0, isAvailable?: boolean) {
    const cat = categories.find(c => c.coreKey === key);
    if (!cat) return;
    const rule: any = {
      id: `${coreId(key)}.${suffix}`,
      name,
      cost,
      runtimeKey: runtimeKey ?? suffix,
      ruleType: component ? 'component' : 'cost_modifier',
    };
    if (component) rule.component = component;
    if (isAvailable !== undefined) rule.isAvailable = isAvailable;
    cat.rules.push(rule);
  }
  function effect(key: CoreCategoryKey, suffix: string, name: string, value: object, runtimeKey?: string, cost: number = 0, isAvailable?: boolean) {
    const cat = categories.find(c => c.coreKey === key);
    if (!cat) return;
    const rule: any = {
      id: `${coreId(key)}.${suffix}`,
      name,
      cost,
      runtimeKey: runtimeKey ?? suffix,
      ruleType: 'effect',
      effect: { timing: 'on_activation', ...value },
    };
    if (isAvailable !== undefined) rule.isAvailable = isAvailable;
    cat.rules.push(rule);
  }

  // Damage: Canonical Core Category
  // Fixed damage
  effect('damage', '2', '2', { type: 'damage', dice: '2' }, '2', 1);
  effect('damage', '4', '4', { type: 'damage', dice: '4' }, '4', 2);
  effect('damage', '6', '6', { type: 'damage', dice: '6' }, '6', 3);
  effect('damage', '8', '8', { type: 'damage', dice: '8' }, '8', 4);

  // Dice damage
  effect('damage', '1d4', '1D4', { type: 'damage', dice: '1D4' }, '1D4', 2);
  effect('damage', '1d6', '1D6', { type: 'damage', dice: '1D6' }, '1D6', 2);
  effect('damage', '1d8', '1D8', { type: 'damage', dice: '1D8' }, '1D8', 3);
  effect('damage', '2d4', '2D4', { type: 'damage', dice: '2D4' }, '2D4', 2);
  effect('damage', '2d6', '2D6', { type: 'damage', dice: '2D6' }, '2D6', 3);
  effect('damage', '2d8', '2D8', { type: 'damage', dice: '2D8' }, '2D8', 4);
  effect('damage', '3d4', '3D4', { type: 'damage', dice: '3D4' }, '3D4', 3);
  effect('damage', '3d6', '3D6', { type: 'damage', dice: '3D6' }, '3D6', 5);
  effect('damage', '3d8', '3D8', { type: 'damage', dice: '3D8' }, '3D8', 6);
  effect('damage', '4d4', '4D4', { type: 'damage', dice: '4D4' }, '4D4', 3);
  effect('damage', '4d6', '4D6', { type: 'damage', dice: '4D6' }, '4D6', 5);
  effect('damage', '4d8', '4D8', { type: 'damage', dice: '4D8' }, '4D8', 7);
  effect('damage', '5d4', '5D4', { type: 'damage', dice: '5D4' }, '5D4', 4);
  effect('damage', '5d6', '5D6', { type: 'damage', dice: '5D6' }, '5D6', 6);
  effect('damage', '6d6', '6D6', { type: 'damage', dice: '6D6' }, '6D6', 7);
  effect('damage', '5d8', '5D8', { type: 'damage', dice: '5D8' }, '5D8', 7);

  // Damage Types (Canonical Core Category)
  option('damage_type', 'fisico', 'Físico', undefined, 'fisico', 0);
  option('damage_type', 'cinetico', 'Cinético', undefined, 'cinetico', 0);
  option('damage_type', 'fuego', 'Fuego', undefined, 'fuego', 0);
  option('damage_type', 'hielo', 'Hielo', undefined, 'hielo', 0);
  option('damage_type', 'electrico', 'Eléctrico', undefined, 'electrico', 0);
  option('damage_type', 'acido', 'Ácido', undefined, 'acido', 0);
  option('damage_type', 'psiquico', 'Psíquico / Mental', undefined, 'psiquico', 0);
  option('damage_type', 'sensorial', 'Sensorial', undefined, 'sensorial', 0);
  option('damage_type', 'motor', 'Motor', undefined, 'motor', 0);
  option('damage_type', 'anomalia_don', 'Anomalía de Don', undefined, 'anomalia_don', 0);
  option('damage_type', 'cortante', 'Cortante', undefined, 'cortante', 0);
  option('damage_type', 'perforante', 'Perforante', undefined, 'perforante', 0);
  option('damage_type', 'contundente', 'Contundente', undefined, 'contundente', 0);

  // Healing: Canonical Core Category
  // Fixed healing
  effect('healing', '2', '2', { type: 'healing', kind: 'fixed', amount: 2, magnitude: { kind: 'fixed', amount: 2 } }, '2', 1);
  effect('healing', '3', '3', { type: 'healing', kind: 'fixed', amount: 3, magnitude: { kind: 'fixed', amount: 3 } }, '3', 2);
  effect('healing', '4', '4', { type: 'healing', kind: 'fixed', amount: 4, magnitude: { kind: 'fixed', amount: 4 } }, '4', 2);
  effect('healing', '6', '6', { type: 'healing', kind: 'fixed', amount: 6, magnitude: { kind: 'fixed', amount: 6 } }, '6', 3);
  effect('healing', '8', '8', { type: 'healing', kind: 'fixed', amount: 8, magnitude: { kind: 'fixed', amount: 8 } }, '8', 4);

  // Dice healing
  effect('healing', '1d4', '1D4', { type: 'healing', kind: 'dice', formula: '1D4', dice: '1D4', magnitude: { kind: 'dice', formula: '1D4' } }, '1D4', 1);
  effect('healing', '2d4', '2D4', { type: 'healing', kind: 'dice', formula: '2D4', dice: '2D4', magnitude: { kind: 'dice', formula: '2D4' } }, '2D4', 1);
  effect('healing', '3d4', '3D4', { type: 'healing', kind: 'dice', formula: '3D4', dice: '3D4', magnitude: { kind: 'dice', formula: '3D4' } }, '3D4', 2);
  effect('healing', '4d4', '4D4', { type: 'healing', kind: 'dice', formula: '4D4', dice: '4D4', magnitude: { kind: 'dice', formula: '4D4' } }, '4D4', 2);
  effect('healing', '5d4', '5D4', { type: 'healing', kind: 'dice', formula: '5D4', dice: '5D4', magnitude: { kind: 'dice', formula: '5D4' } }, '5D4', 3);
  effect('healing', '1d6', '1D6', { type: 'healing', kind: 'dice', formula: '1D6', dice: '1D6', magnitude: { kind: 'dice', formula: '1D6' } }, '1D6', 2);
  effect('healing', '2d6', '2D6', { type: 'healing', kind: 'dice', formula: '2D6', dice: '2D6', magnitude: { kind: 'dice', formula: '2D6' } }, '2D6', 3);
  effect('healing', '3d6', '3D6', { type: 'healing', kind: 'dice', formula: '3D6', dice: '3D6', magnitude: { kind: 'dice', formula: '3D6' } }, '3D6', 3);
  effect('healing', '4d6', '4D6', { type: 'healing', kind: 'dice', formula: '4D6', dice: '4D6', magnitude: { kind: 'dice', formula: '4D6' } }, '4D6', 4);
  effect('healing', '5d6', '5D6', { type: 'healing', kind: 'dice', formula: '5D6', dice: '5D6', magnitude: { kind: 'dice', formula: '5D6' } }, '5D6', 5);
  effect('healing', '1d8', '1D8', { type: 'healing', kind: 'dice', formula: '1D8', dice: '1D8', magnitude: { kind: 'dice', formula: '1D8' } }, '1D8', 3);
  effect('healing', '2d8', '2D8', { type: 'healing', kind: 'dice', formula: '2D8', dice: '2D8', magnitude: { kind: 'dice', formula: '2D8' } }, '2D8', 4);
  effect('healing', '3d8', '3D8', { type: 'healing', kind: 'dice', formula: '3D8', dice: '3D8', magnitude: { kind: 'dice', formula: '3D8' } }, '3D8', 5);
  effect('healing', '4d8', '4D8', { type: 'healing', kind: 'dice', formula: '4D8', dice: '4D8', magnitude: { kind: 'dice', formula: '4D8' } }, '4D8', 6);

  // Barrier: Canonical Core Category
  effect('barrier', '15', '15', { type: 'barrier', amount: 15 }, '15', 1);
  effect('barrier', '20', '20', { type: 'barrier', amount: 20 }, '20', 2);
  effect('barrier', '30', '30', { type: 'barrier', amount: 30 }, '30', 3);
  effect('barrier', '40', '40', { type: 'barrier', amount: 40 }, '40', 4);
  effect('barrier', '50', '50', { type: 'barrier', amount: 50 }, '50', 5);

  // Numeric Modifiers: Canonical Core Category (+1..+4 and -1..-5)
  for (const n of [1, 2, 3, 4]) {
    const cost = n - 1;
    option('numeric_modifier', String(n), `+${n}`, undefined, String(n), cost);
  }
  for (const n of [1, 2, 3, 4, 5]) {
    const cost = n - 1;
    option('numeric_modifier', `-${n}`, `-${n}`, undefined, `-${n}`, cost);
  }
  // +5 is retired / not available for new configurations (RULES-DATA-2.1)
  option('numeric_modifier', '5', '+5', undefined, '5', 4, false);

  // Derived Stats (Core Category)
  option('derived_stat', 'db', `${getDerivedStatLabel('DB')} (DB)`, undefined, 'DB', 1);
  option('derived_stat', 'eva', `${getDerivedStatLabel('EVA')} (EVA)`, undefined, 'EVA', 2);
  option('derived_stat', 'sal', `${getDerivedStatLabel('SAL')} (SA)`, undefined, 'SAL', 0);
  option('derived_stat', 'est', `${getDerivedStatLabel('EST')} (ES)`, undefined, 'EST', 0);
  option('derived_stat', 'ini', `${getDerivedStatLabel('INI')} (INI)`, undefined, 'INI', 2);
  option('derived_stat', 'rd', `${getDerivedStatLabel('RD')} (RD)`, undefined, 'RD', 3);
  option('derived_stat', 'cor', `${getDerivedStatLabel('COR')} (COR)`, undefined, 'COR', 2);

  // Attributes (Core Category)
  option('attribute', 'fue', getAttributeLabel('FUE'), undefined, 'FUE', 1);
  option('attribute', 'res', getAttributeLabel('RES'), undefined, 'RES', 1);
  option('attribute', 'des', getAttributeLabel('DES'), undefined, 'DES', 1);
  option('attribute', 'int', getAttributeLabel('INT'), undefined, 'INT', 1);
  option('attribute', 'vel', getAttributeLabel('VEL'), undefined, 'VEL', 1);
  option('attribute', 'vol', getAttributeLabel('VOL'), undefined, 'VOL', 1);

  // Skills (Core Category)
  option('skill', 'base', 'Coste Base de Habilidad', undefined, 'base', 3);
  option('skill', 'carisma', 'Carisma', undefined, 'carisma', 3);
  option('skill', 'presencia', 'Presencia', undefined, 'presencia', 3);

  // Health Cost (Sacrificio de HP)
  for (const n of [1, 2, 3, 4, 5]) {
    option('health_cost', String(n), `${n} HP`, { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'resource', resourceId: 'SA', amount: n } }, String(n), 0);
  }

  // Status (Canonical Altered Statuses)
  effect('status', 'asfixia', 'Asfixia', { type: 'status', statusElementId: 'core.status.asfixia' }, 'asfixia', 3);
  effect('status', 'stunned', 'Aturdido', { type: 'status', statusElementId: 'core.status.stunned' }, 'stunned', 3);
  effect('status', 'berserker', 'Berserker (Familia)', { type: 'status', statusElementId: 'core.status.berserker' }, 'berserker', 3);
  effect('status', 'berserker_grave', 'Berserker Grave', { type: 'status', statusElementId: 'core.status.berserker_grave' }, 'berserker_grave', 5);
  effect('status', 'berserker_leve', 'Berserker Leve', { type: 'status', statusElementId: 'core.status.berserker_leve' }, 'berserker_leve', 3);
  effect('status', 'coma_ilusorio', 'Coma Ilusorio', { type: 'status', statusElementId: 'core.status.coma_ilusorio' }, 'coma_ilusorio', 4);
  effect('status', 'congelado', 'Congelado', { type: 'status', statusElementId: 'core.status.congelado' }, 'congelado', 3);
  effect('status', 'conmocion', 'Conmoción', { type: 'status', statusElementId: 'core.status.conmocion' }, 'conmocion', 3);
  effect('status', 'desbalanceado', 'Desbalanceado', { type: 'status', statusElementId: 'core.status.desbalanceado' }, 'desbalanceado', 3);
  effect('status', 'desorientado', 'Desorientado', { type: 'status', statusElementId: 'core.status.desorientado' }, 'desorientado', 3);
  effect('status', 'dormido', 'Dormido', { type: 'status', statusElementId: 'core.status.dormido' }, 'dormido', 3);
  effect('status', 'electrocutado', 'Electrocutado', { type: 'status', statusElementId: 'core.status.electrocutado' }, 'electrocutado', 3);
  effect('status', 'hemorragia', 'Hemorragia (Familia)', { type: 'status', statusElementId: 'core.status.hemorragia' }, 'hemorragia', 3);
  effect('status', 'hemorragia_grave', 'Hemorragia Grave', { type: 'status', statusElementId: 'core.status.hemorragia_grave' }, 'hemorragia_grave', 6);
  effect('status', 'hemorragia_leve', 'Hemorragia Leve', { type: 'status', statusElementId: 'core.status.hemorragia_leve' }, 'hemorragia_leve', 3);
  effect('status', 'locura', 'Locura', { type: 'status', statusElementId: 'core.status.locura' }, 'locura', 3);
  effect('status', 'miedo', 'Miedo / Aterrorizado', { type: 'status', statusElementId: 'core.status.miedo' }, 'miedo', 3);
  effect('status', 'mutacion_visual', 'Mutación Visual', { type: 'status', statusElementId: 'core.status.mutacion_visual' }, 'mutacion_visual', 3);
  effect('status', 'nulificacion_don', 'Nulificación de Don', { type: 'status', statusElementId: 'core.status.nulificacion_don' }, 'nulificacion_don', 5);
  effect('status', 'quemadura', 'Quemadura (Familia)', { type: 'status', statusElementId: 'core.status.quemadura' }, 'quemadura', 2);
  effect('status', 'quemadura_grave', 'Quemadura Grave', { type: 'status', statusElementId: 'core.status.quemadura_grave' }, 'quemadura_grave', 5);
  effect('status', 'quemadura_leve', 'Quemadura Leve', { type: 'status', statusElementId: 'core.status.quemadura_leve' }, 'quemadura_leve', 2);
  effect('status', 'ralentizado', 'Ralentizado', { type: 'status', statusElementId: 'core.status.ralentizado' }, 'ralentizado', 2);
  effect('status', 'sobrecalentado', 'Sobrecalentado', { type: 'status', statusElementId: 'core.status.sobrecalentado' }, 'sobrecalentado', 3);
  effect('status', 'veneno', 'Veneno (Familia)', { type: 'status', statusElementId: 'core.status.veneno' }, 'veneno', 2);
  effect('status', 'veneno_grave', 'Veneno Grave', { type: 'status', statusElementId: 'core.status.veneno_grave' }, 'veneno_grave', 5);
  effect('status', 'veneno_leve', 'Veneno Leve', { type: 'status', statusElementId: 'core.status.veneno_leve' }, 'veneno_leve', 2);
  effect('status', 'inmovilizado', 'Inmovilizado', { type: 'status', statusElementId: 'core.status.inmovilizado' }, 'inmovilizado', 3);
  effect('status', 'concentrado', 'Concentrado (beneficio)', { type: 'status', statusElementId: 'core.status.concentrado' }, 'concentrado', 3);

  // Status Removal / Cure (Curar / Retirar Estados Alterados)
  effect('status_remove', 'all', 'Curar Cualquier Estado Alterado', { type: 'status_remove', statusElementId: 'all' }, 'all', 4);
  effect('status_remove', 'leve', 'Curar Estado Leve', { type: 'status_remove', statusElementId: 'leve' }, 'leve', 2);
  effect('status_remove', 'moderado', 'Curar Estado Moderado', { type: 'status_remove', statusElementId: 'moderado' }, 'moderado', 3);
  effect('status_remove', 'grave', 'Curar Estado Grave', { type: 'status_remove', statusElementId: 'grave' }, 'grave', 4);
  effect('status_remove', 'veneno', 'Curar Veneno (Cualquier nivel)', { type: 'status_remove', statusElementId: 'veneno' }, 'veneno', 2);
  effect('status_remove', 'hemorragia', 'Curar Hemorragia (Cualquier nivel)', { type: 'status_remove', statusElementId: 'hemorragia' }, 'hemorragia', 2);
  effect('status_remove', 'quemadura', 'Curar Quemadura (Cualquier nivel)', { type: 'status_remove', statusElementId: 'quemadura' }, 'quemadura', 2);
  effect('status_remove', 'aturdido', 'Retirar Aturdido / Conmoción', { type: 'status_remove', statusElementId: 'aturdido' }, 'aturdido', 2);
  effect('status_remove', 'inmovilizado', 'Retirar Inmovilizado / Ralentizado', { type: 'status_remove', statusElementId: 'inmovilizado' }, 'inmovilizado', 2);

  // Manual Adjustments & Costs
  effect('cost_adjustment', 'quirk1', '+1 a costes de quirk', { type: 'cost_adjustment', scopeId: 'quirk', amount: 1 });
  effect('cost_adjustment', 'stamina_reduction', 'Reducción de Estamina', { type: 'cost_adjustment', scopeId: 'stamina', amount: -1 }, 'stamina_reduction', 4);
  effect('manual_resolution', 'unstable', 'Quirk inestable', { type: 'manual_resolution', message: 'El quirk se activa de forma inestable. El Master determina el efecto.' });

  // Object Manipulation (Core Category core.object_manipulation)
  effect('object_manipulation', 'small', 'Objetos pequeños (1–50 cm)', { type: 'object_manipulation', size: 'small', maxDimension: '50cm' }, 'small', 1);
  effect('object_manipulation', 'medium', 'Objetos medianos (hasta 1.50 m)', { type: 'object_manipulation', size: 'medium', maxDimension: '1.50m' }, 'medium', 2);
  effect('object_manipulation', 'large', 'Objetos grandes (hasta 5 m)', { type: 'object_manipulation', size: 'large', maxDimension: '5m' }, 'large', 4);
  effect('object_manipulation', 'huge', 'Objetos enormes (hasta 10 m)', { type: 'object_manipulation', size: 'huge', maxDimension: '10m' }, 'huge', 6);

  // Transformation Magnitudes
  effect('transformation', 'body', 'Corporal', { type: 'transformation', magnitude: { type: 'body', value: 1 } }, 'body', 1);
  effect('transformation', '2m', '2 metros', { type: 'transformation', magnitude: { type: '2m', value: 2 } }, '2m', 2);
  effect('transformation', '5m', '5 metros', { type: 'transformation', magnitude: { type: '5m', value: 3 } }, '5m', 3);
  effect('transformation', '10m', '10 metros', { type: 'transformation', magnitude: { type: '10m', value: 4 } }, '10m', 4);
  effect('transformation', '20m', '20 metros', { type: 'transformation', magnitude: { type: '20m', value: 6 } }, '20m', 6);

  // Target
  option('target', 'self', 'Uno mismo', { kind: 'target', self: true, allies: false, enemies: false }, 'self', 0);
  option('target', 'enemy', 'Enemigo', { kind: 'target', self: false, allies: false, enemies: true }, 'enemy', 0);
  option('target', 'ally', 'Aliado', { kind: 'target', self: false, allies: true, enemies: false }, 'ally', 0);
  option('target', 'character', 'Personaje', { kind: 'target', self: true, allies: true, enemies: true }, 'character', 0);
  option('target', 'object', '1 objeto', undefined, 'object', 1);
  option('target', 'structure', '1 estructura (edificio de hasta 2 pisos)', undefined, 'structure', 3);
  option('target', 'area', 'Área', undefined, 'area', 0);
  option('target', 'roll', 'Tirada', undefined, 'roll', 0);
  option('target', 'resource', 'Recurso', undefined, 'resource', 0);
  option('target', 'active_element', 'Elemento activo', undefined, 'active_element', 0);
  option('target', 'manual', 'Manual / A determinar', undefined, 'manual', 0);
  option('target', 'any', 'Cualquiera', { kind: 'target', self: true, allies: true, enemies: true }, 'any', 0);
  // Legacy target options (marked isAvailable: false)
  option('target', 'allies', 'Aliados (Legacy)', { kind: 'target', self: false, allies: true, enemies: false }, 'allies', 0, false);
  option('target', 'enemies', 'Enemigos (Legacy)', { kind: 'target', self: false, allies: false, enemies: true }, 'enemies', 0, false);

  // Target Count (Capacity & Asymmetry)
  // Enemy capacities
  option('target_count', 'enemy_1', '1 enemigo', { kind: 'target_count', min: 1, max: 1, targetType: 'enemy' }, 'enemy_1', 0);
  option('target_count', 'enemy_2', 'Hasta 2 enemigos', { kind: 'target_count', min: 1, max: 2, targetType: 'enemy' }, 'enemy_2', 2);
  option('target_count', 'enemy_3', 'Hasta 3 enemigos', { kind: 'target_count', min: 1, max: 3, targetType: 'enemy' }, 'enemy_3', 3);
  // Ally capacities
  option('target_count', 'ally_1', '1 aliado', { kind: 'target_count', min: 1, max: 1, targetType: 'ally' }, 'ally_1', 0);
  option('target_count', 'ally_2', 'Hasta 2 aliados', { kind: 'target_count', min: 1, max: 2, targetType: 'ally' }, 'ally_2', 3);
  option('target_count', 'ally_3', 'Hasta 3 aliados', { kind: 'target_count', min: 1, max: 3, targetType: 'ally' }, 'ally_3', 4);
  // Generic target count fallbacks
  option('target_count', '1', 'Hasta 1', { kind: 'target_count', min: 1, max: 1 }, '1', 0);
  option('target_count', '2', 'Hasta 2', { kind: 'target_count', min: 1, max: 2 }, '2', 2);
  option('target_count', '3', 'Hasta 3', { kind: 'target_count', min: 1, max: 3 }, '3', 3);
  option('target_count', '4', 'Hasta 4', { kind: 'target_count', min: 1, max: 4 }, '4', 4);
  option('target_count', '5', 'Hasta 5', { kind: 'target_count', min: 1, max: 5 }, '5', 5);
  option('target_count', 'all', 'Todos los objetivos válidos', undefined, 'all', 0);

  // Range (Preserved structurally with 0 CE, no invented non-canonical distance costs)
  option('range', 'self', 'Personal', { kind: 'range', meters: 0 }, 'self', 0);
  option('range', 'contact', 'Contacto', { kind: 'range', meters: 1 }, 'contact', 0);
  option('range', 'distance', 'A distancia', { kind: 'range', meters: 10 }, 'distance', 0);
  option('range', 'unlimited', 'Ilimitado', { kind: 'range', meters: 9999 }, 'unlimited', 0);
  for (const meters of [0, 5, 10, 20, 50]) option('range', String(meters), `${meters} m`, { kind: 'range', meters }, String(meters), 0);

  // Area (Canonical Radius / Area of Effect)
  option('area', 'radius', 'Radio circular', { kind: 'area', radius: 5 }, 'radius', 0);
  option('area', 'cone', 'Cono', undefined, 'cone', 0);
  option('area', 'line', 'Línea recta', undefined, 'line', 0);
  option('area', 'zone', 'Zona delimitada', undefined, 'zone', 0);
  option('area', '5', '5 metros a la redonda', { kind: 'area', radius: 5 }, '5', 1);
  option('area', '10', '10 metros a la redonda', { kind: 'area', radius: 10 }, '10', 2);
  option('area', '20', '20 metros a la redonda', { kind: 'area', radius: 20 }, '20', 3);
  option('area', '50', '50 metros a la redonda', { kind: 'area', radius: 50 }, '50', 4);
  option('area', '100', '100 metros a la redonda', { kind: 'area', radius: 100 }, '100', 5);

  // Selection Mode (Core Category core.selection_restriction - All cost 0 CE)
  option('selection_restriction', 'standard_priority', 'Prioridad estándar', undefined, 'standard_priority', 0);
  option('selection_restriction', 'manual', 'Elección manual', undefined, 'manual', 0);
  option('selection_restriction', 'random', 'Aleatoria', undefined, 'random', 0);
  option('selection_restriction', 'none', 'Sin restricción', undefined, 'none', 0);
  option('selection_restriction', 'nearest', 'Más cercano', undefined, 'nearest', 0);
  option('selection_restriction', 'specific', 'Específico', undefined, 'specific', 0);
  option('selection_restriction', 'exclude', 'Excluir específico', undefined, 'exclude', 0);

  // Duration
  option('duration', 'instant', 'Instantánea', { kind: 'duration', duration: { mode: 'instant' } }, 'instant', 0);
  option('duration', 'turns', 'Por turnos', { kind: 'duration', duration: { mode: 'turns', turns: 1 } }, 'turns', 0);
  for (const n of [1, 2, 3, 4, 5]) {
    const durCost = n === 1 ? 0 : (n === 2 ? 1 : n - 1);
    const durLabel = n === 1 ? '1 turno' : `${n} turnos`;
    option('duration', String(n), durLabel, { kind: 'duration', duration: { mode: 'turns', turns: n } }, String(n), durCost);
  }
  // Tiempo Pasivo / Long-Term Duration (Canonical Core)
  option('duration', '1_day', '1 día', { kind: 'duration', duration: { mode: 'passive_time', unit: 'day', value: 1 } }, '1_day', 4);
  option('duration', '1_week', '1 semana', { kind: 'duration', duration: { mode: 'passive_time', unit: 'week', value: 1 } }, '1_week', 8);
  option('duration', '1_month', '1 mes', { kind: 'duration', duration: { mode: 'passive_time', unit: 'month', value: 1 } }, '1_month', 14);

  option('duration', 'until_turn_end', 'Hasta el final del turno', { kind: 'duration', duration: { mode: 'until_turn_end' } }, 'until_turn_end');
  option('duration', 'until_next_turn', 'Hasta el siguiente turno', { kind: 'duration', duration: { mode: 'until_next_turn' } }, 'until_next_turn');
  option('duration', 'until_next_roll', 'Hasta la siguiente tirada', { kind: 'duration', duration: { mode: 'until_next_roll' } }, 'until_next_roll');
  option('duration', 'until_next_use', 'Hasta el siguiente uso', { kind: 'duration', duration: { mode: 'until_next_use' } }, 'until_next_use');
  option('duration', 'while_condition', 'Mientras se cumpla la condición', { kind: 'duration', duration: { mode: 'while_condition' } }, 'while_condition');
  option('duration', 'while_owned', 'Mientras posea el elemento', { kind: 'duration', duration: { mode: 'while_owned' } }, 'while_owned');
  option('duration', 'permanent', 'Permanente', { kind: 'duration', duration: { mode: 'permanent' } }, 'permanent');
  option('duration', 'sustained', 'Sostenido', { kind: 'duration', duration: { mode: 'sustained' } }, 'sustained');

  // Frequency
  option('frequency', 'once', 'Una sola vez', undefined, 'once');
  option('frequency', 'each_turn', 'Cada turno', undefined, 'each_turn');
  option('frequency', 'turn_start', 'Inicio del turno', undefined, 'turn_start');
  option('frequency', 'turn_end', 'Fin del turno', undefined, 'turn_end');
  option('frequency', 'every_n_turns', 'Cada N turnos', undefined, 'every_n_turns');

  // Activation
  option('activation', 'action', 'Acción estándar', { kind: 'activation', turns: 0, signalId: 'action', passive: false }, 'action');
  option('activation', 'quick_action', 'Acción rápida', { kind: 'activation', turns: 0, signalId: 'quick_action', passive: false }, 'quick_action');
  option('activation', 'voluntary_reaction', 'Reacción voluntaria', { kind: 'activation', turns: 0, signalId: 'voluntary_reaction', passive: false }, 'voluntary_reaction');
  option('activation', 'free_action', 'Acción libre', { kind: 'activation', turns: 0, signalId: 'free_action', passive: false }, 'free_action');
  option('activation', 'passive', 'Pasivo', { kind: 'activation', turns: 0, signalId: '', passive: true }, 'passive');
  option('activation', 'delay1', 'Preparación: 1 turno', { kind: 'activation', turns: 1, signalId: '', passive: false }, 'delay1', -1);
  option('activation', 'speech', 'Acción manual: discurso', { kind: 'activation', turns: 0, signalId: 'speech', passive: false }, 'speech');
  option('activation', 'manual', 'Activación manual', { kind: 'activation', turns: 0, signalId: 'manual', passive: false }, 'manual');

  // Trigger
  option('trigger', 'receive_damage', 'Al recibir daño', undefined, 'receive_damage');
  option('trigger', 'deal_damage', 'Al infligir daño', undefined, 'deal_damage');
  option('trigger', 'receive_healing', 'Al recibir curación', undefined, 'receive_healing');
  option('trigger', 'attacked', 'Al ser atacado', undefined, 'attacked');
  option('trigger', 'attack', 'Al realizar un ataque', undefined, 'attack');
  option('trigger', 'receive_critical', 'Al recibir un crítico', undefined, 'receive_critical');
  option('trigger', 'deal_critical', 'Al asestar un crítico', undefined, 'deal_critical');
  option('trigger', 'use_quirk', 'Al usar don', undefined, 'use_quirk');
  option('trigger', 'use_technique', 'Al usar técnica', undefined, 'use_technique');
  option('trigger', 'turn_start', 'Al inicio de turno', undefined, 'turn_start');
  option('trigger', 'turn_end', 'Al final de turno', undefined, 'turn_end');
  option('trigger', 'combat_start', 'Al iniciar combate', undefined, 'combat_start');
  option('trigger', 'combat_end', 'Al finalizar combate', undefined, 'combat_end');
  option('trigger', 'manual', 'Manual / Otro evento', undefined, 'manual');

  // Resolution
  option('resolution', 'automatic', 'Automática', undefined, 'automatic');
  option('resolution', 'roll', 'Tirada de ataque / enfrentada', undefined, 'roll');
  option('resolution', 'rd', 'Dificultad fija (RD)', undefined, 'rd');
  option('resolution', 'manual', 'Resolución manual / Master', undefined, 'manual');

  // Limitations: Usage & Cooldown
  for (const period of ['turn', 'combat', 'mission', 'day'] as const) {
    const usageCost = period === 'turn' ? 0 : -4;
    option('usage', period, `1 por ${{ turn: 'turno', combat: 'combate', mission: 'misión', day: 'día' }[period]}`, { kind: 'usage', period, max: 1 }, period, usageCost);
  }
  for (const n of [1, 2, 3, 4, 5]) {
    const cdCost = n === 2 ? -2 : 0;
    option('cooldown', String(n), `${n} ${n === 1 ? 'turno' : 'turnos'}`, { kind: 'cooldown', turns: n }, String(n), cdCost);
  }

  // Roll Types
  option('roll_type', 'action', 'Acción general', undefined, 'action');
  option('roll_type', 'attack', 'Tirada de ataque', undefined, 'attack');
  option('roll_type', 'defense', 'Tirada de defensa', undefined, 'defense');
  option('roll_type', 'saving', 'Tirada de salvación', undefined, 'saving');
  option('roll_type', 'skill', 'Prueba de habilidad', undefined, 'skill');
  option('roll_type', 'all', 'Cualquier acción', undefined, 'all');
  option('roll_type', 'roll', 'Tirada', undefined, 'roll', 3);

  // Conditions, Maintenance & Requirements
  option('maintenance', 'es1', '1 EST por turno', { kind: 'maintenance', resourceId: 'ES', amount: 1 }, 'es1', 0);
  option('maintenance', 'es2', '2 EST por turno', { kind: 'maintenance', resourceId: 'ES', amount: 2 }, 'es2', 0);
  option('maintenance', 'hp1', '1 HP por turno', { kind: 'maintenance', resourceId: 'SA', amount: 1 }, 'hp1', 0);
  option('maintenance', 'hp2', '2 HP por turno', { kind: 'maintenance', resourceId: 'SA', amount: 2 }, 'hp2', 0);

  option('manual_condition', 'visual_contact', 'Contacto visual', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense: 'visual' }] }, 'visual_contact', -1);
  option('manual_condition', 'auditory_contact', 'Contacto auditivo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense: 'auditory' }] }, 'auditory_contact', -1);
  option('manual_condition', 'physical_contact', 'Contacto físico', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense: 'physical' }] }, 'physical_contact', -1);
  option('manual_condition', 'speak_directly', 'Debe hablar directamente al objetivo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'speak_directly' }] }, 'speak_directly', -1);
  option('manual_condition', 'conscious', 'Objetivo consciente', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'conscious' }] }, 'conscious', -2);
  option('manual_condition', 'emotion', 'Emoción intensa', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'manual', signalId: 'intense_emotion' }] }, 'emotion', 0);

  option('resource_threshold', 'es50', 'ES ≤ 50%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 50 }] }, 'es50', 0);
  option('resource_threshold', 'es25', 'ES ≤ 25%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 25 }] }, 'es25', 0);
  option('resource_threshold', 'hp50', 'HP ≤ 50%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'SA', comparison: 'lte', percent: 50 }] }, 'hp50', 0);
  option('resource_threshold', 'hp25', 'HP ≤ 25%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'SA', comparison: 'lte', percent: 25 }] }, 'hp25', 0);
  
  option('additional_requirement', 'active_ability', 'Técnica activa (configurar ID)', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'ability_active', abilityId: 'ability-id' }] }, 'active_ability', -2);
  option('additional_requirement', 'consumption', 'Consumir algo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'consume_something' }] }, 'consumption', -1);
  
  option('die_condition', '1to5', 'Algún dado entre 1 y 5', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 1, max: 5 }] }, '1to5', 0);
  option('die_condition', 'crit', 'En tirada crítica', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 6, max: 6 }] }, 'crit', 0);

  option('caps', 'ce', 'CE entre 0 y 100 (editable)', { kind: 'cap', subject: 'stamina_cost', min: 0, max: 100 }, 'ce', 0);
  option('caps', 'damage', 'Daño máximo acotado', { kind: 'cap', subject: 'damage', min: 0, max: 50 }, 'damage', 0);
  option('caps', 'absorb_max_6', 'Absorbe un máximo de 6 de daño recibido', { kind: 'cap', subject: 'barrier', min: 0, max: 6 }, 'absorb_max_6', -3);

  // Self Damage Exposure (Canonical Core Category core.self_damage)
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    option('self_damage', String(n), `${n} HP`, { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'resource', resourceId: 'SA', amount: n } }, String(n), 0);
  }

  // Consequences (Canonical Core Category core.consequence)
  option('consequence', 'self_damage_turn', 'Recibe 1 punto de daño cada turno activo', { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'resource', resourceId: 'SA', amount: 1 } }, 'self_damage_turn', -1, false);
  option('consequence', 'self_damage_fixed_2', 'Recibe 2 puntos de daño al utilizarla', { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'resource', resourceId: 'SA', amount: 2 } }, 'self_damage_fixed_2', -1, false);
  option('consequence', 'recoil_half', 'Recibe la mitad del daño provocado', { kind: 'consequence', role: 'consequence', when: 'after_damage', consequence: { kind: 'recoil', fraction: 0.5 } }, 'recoil_half', -4);
  option('consequence', 'after_effect_int2_3t', 'Al finalizar: -2 INT durante 3 turnos por sobrecarga sensorial', { kind: 'consequence', role: 'consequence', when: 'end', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3, untilEnd: false } }, 'after_effect_int2_3t', -3);
  option('consequence', 'while_active_des2', '-2 Destreza mientras el efecto está activo', { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'attribute', attributeId: 'DES', amount: -2, turns: 1, untilEnd: true } }, 'while_active_des2', -2);
  option('consequence', 'int2_per_active_turn', '-2 INT cada turno activo (Pendiente por ambigüedad)', { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 1 } }, 'int2_per_active_turn', -1, false);
  option('consequence', 'overheated_threshold', 'Si queda en 5 de EST o menos: adquiere Sobrecalentado', { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'status', statusElementId: 'core.status.sobrecalentado', turns: 1 } }, 'overheated_threshold', -3);

  // Complexity Adjustment (Canonical Core Category core.complexity_adjustment)
  option('complexity_adjustment', 'behaviors_1', '1 Comportamiento', { kind: 'complexity_adjustment', count: 1 }, 'behaviors_1', 0);
  option('complexity_adjustment', 'behaviors_2', '2 Comportamientos', { kind: 'complexity_adjustment', count: 2 }, 'behaviors_2', 2);
  option('complexity_adjustment', 'behaviors_3', '3 Comportamientos', { kind: 'complexity_adjustment', count: 3 }, 'behaviors_3', 4);
  option('complexity_adjustment', 'behaviors_4', '4 Comportamientos', { kind: 'complexity_adjustment', count: 4 }, 'behaviors_4', 6);
  option('complexity_adjustment', 'behaviors_5', '5+ Comportamientos', { kind: 'complexity_adjustment', count: 5 }, 'behaviors_5', 8);

  return systemMechanicsConfigSchema.parse(categories);
}

export function getCategoryOptions(
  categories: SystemMechanicsConfig = [],
  categoryKeyOrId: string,
  catalogSkills?: Array<{ id: string; name: string; status?: string }>,
  catalogStatuses?: Array<{ id: string; name: string; status?: string; metadata?: any }>
): CategoryOptionView[] {
  const cat = categories.find(
    c => c.id === categoryKeyOrId || c.coreKey === categoryKeyOrId || c.id === `core.${categoryKeyOrId}`
  );

  const extractRuleProps = (r: any): CategoryOptionView => {
    const rawFormula = r.effect?.dice || r.effect?.formula || r.effect?.magnitude?.formula || r.component?.formula || r.formula || (r.component as any)?.dice;
    const formula = rawFormula || (/^\d+[dD]\d+$/.test(r.runtimeKey) ? r.runtimeKey : (/^\d+[dD]\d+$/.test(r.name) ? r.name : undefined));
    const amount = typeof r.effect?.amount === 'number' ? r.effect.amount : (typeof r.effect?.magnitude?.amount === 'number' ? r.effect.magnitude.amount : (typeof r.component?.amount === 'number' ? r.component.amount : undefined));
    const runtimeKey = r.runtimeKey || formula || (r.id ? r.id.split('.').pop() : '') || r.id;
    const isAvailable = r.isAvailable !== false;

    return {
      id: r.id,
      runtimeKey,
      name: r.name,
      cost: typeof r.cost === 'number' ? r.cost : 0,
      description: r.mechDesc,
      ruleType: r.ruleType,
      formula: formula || undefined,
      amount,
      isAvailable,
    };
  };

  const mergeCatalogSkills = (views: CategoryOptionView[], targetCat?: any) => {
    if (!catalogSkills || catalogSkills.length === 0) return views;
    const baseRule = targetCat?.rules?.find((r: any) =>
      (r as any).runtimeKey === 'base' ||
      r.id === 'core.skill.base' ||
      r.id.endsWith('.base') ||
      r.name?.toLowerCase().includes('base')
    );
    const baseCost = typeof baseRule?.cost === 'number' ? baseRule.cost : 3;

    for (const sk of catalogSkills) {
      const alreadyExists = views.some(
        v => v.runtimeKey?.toLowerCase() === sk.id.toLowerCase() ||
             v.id === `core.skill.${sk.id}` ||
             v.name.toLowerCase() === sk.name.toLowerCase()
      );
      if (!alreadyExists) {
        views.push({
          id: `core.skill.${sk.id}`,
          runtimeKey: sk.id,
          name: sk.name,
          cost: baseCost,
          ruleType: 'cost_modifier',
          isAvailable: sk.status !== 'draft',
        });
      }
    }
    return views;
  };

  const mergeCatalogStatuses = (views: CategoryOptionView[], targetCat?: any) => {
    if (!catalogStatuses || catalogStatuses.length === 0) return views;

    const leveRule = targetCat?.rules?.find((r: any) => (r as any).runtimeKey === 'leve' || r.id?.endsWith('.leve') || r.name?.toLowerCase().includes('leve'));
    const leveCost = typeof leveRule?.cost === 'number' ? leveRule.cost : 2;

    const modRule = targetCat?.rules?.find((r: any) => (r as any).runtimeKey === 'moderado' || r.id?.endsWith('.moderado') || r.name?.toLowerCase().includes('moderado'));
    const modCost = typeof modRule?.cost === 'number' ? modRule.cost : 3;

    const graveRule = targetCat?.rules?.find((r: any) => (r as any).runtimeKey === 'grave' || r.id?.endsWith('.grave') || r.name?.toLowerCase().includes('grave'));
    const graveCost = typeof graveRule?.cost === 'number' ? graveRule.cost : 5;

    for (const st of catalogStatuses) {
      const meta = st.metadata || {};
      const cleanId = st.id.replace(/^core\.status\./, '');

      if (meta.hasTiers) {
        const tiers = meta.tiers || {};
        if (tiers.leve) {
          const tierKey = `${cleanId}_leve`;
          const exists = views.some(v => v.runtimeKey === tierKey || v.id === `core.status.${tierKey}` || v.name === `${st.name} Leve`);
          if (!exists) {
            views.push({
              id: `core.status.${tierKey}`,
              runtimeKey: tierKey,
              name: `${st.name} Leve`,
              cost: leveCost,
              ruleType: 'effect',
              isAvailable: st.status !== 'draft',
              description: `Estado alterado ${st.name} (Nivel Leve)`,
            });
          }
        }
        if (tiers.moderado) {
          const tierKey = `${cleanId}_moderado`;
          const exists = views.some(v => v.runtimeKey === tierKey || v.id === `core.status.${tierKey}` || v.name === `${st.name} Moderado`);
          if (!exists) {
            views.push({
              id: `core.status.${tierKey}`,
              runtimeKey: tierKey,
              name: `${st.name} Moderado`,
              cost: modCost,
              ruleType: 'effect',
              isAvailable: st.status !== 'draft',
              description: `Estado alterado ${st.name} (Nivel Moderado)`,
            });
          }
        }
        if (tiers.grave) {
          const tierKey = `${cleanId}_grave`;
          const exists = views.some(v => v.runtimeKey === tierKey || v.id === `core.status.${tierKey}` || v.name === `${st.name} Grave`);
          if (!exists) {
            views.push({
              id: `core.status.${tierKey}`,
              runtimeKey: tierKey,
              name: `${st.name} Grave`,
              cost: graveCost,
              ruleType: 'effect',
              isAvailable: st.status !== 'draft',
              description: `Estado alterado ${st.name} (Nivel Grave)`,
            });
          }
        }
      } else {
        const exists = views.some(v => v.runtimeKey === cleanId || v.id === st.id || v.id === `core.status.${cleanId}` || v.name === st.name);
        if (!exists) {
          views.push({
            id: st.id.startsWith('core.status.') ? st.id : `core.status.${cleanId}`,
            runtimeKey: cleanId,
            name: st.name,
            cost: 3,
            ruleType: 'effect',
            isAvailable: st.status !== 'draft',
            description: `Estado alterado ${st.name}`,
          });
        }
      }
    }
    return views;
  };

  // Only fall back to initial schema defaults if categories was not provided at all or is empty (e.g. uninitialized / offline unit tests)
  if (!categories || categories.length === 0) {
    const coreCats = createCoreCategories();
    const fallbackCat = coreCats.find(
      c => c.id === categoryKeyOrId || c.coreKey === categoryKeyOrId || c.id === `core.${categoryKeyOrId}`
    );
    if (!fallbackCat || !Array.isArray(fallbackCat.rules)) return [];
    const baseOpts = fallbackCat.rules.map(extractRuleProps);
    if (categoryKeyOrId === 'skill' || fallbackCat.coreKey === 'skill' || fallbackCat.id === 'core.skill') {
      return mergeCatalogSkills(baseOpts, fallbackCat);
    }
    if (categoryKeyOrId === 'status' || fallbackCat.coreKey === 'status' || fallbackCat.id === 'core.status') {
      return mergeCatalogStatuses(baseOpts, fallbackCat);
    }
    return baseOpts;
  }

  if (!cat || !Array.isArray(cat.rules)) {
    return [];
  }

  const explicitViews = cat.rules.map(extractRuleProps);
  if (categoryKeyOrId === 'skill' || cat.coreKey === 'skill' || cat.id === 'core.skill') {
    return mergeCatalogSkills(explicitViews, cat);
  }
  if (categoryKeyOrId === 'status' || cat.coreKey === 'status' || cat.id === 'core.status') {
    return mergeCatalogStatuses(explicitViews, cat);
  }

  return explicitViews;
}

export function getVisibleOptions<T extends { runtimeKey?: string; id?: string; isAvailable?: boolean; name?: string }>(
  options: T[],
  currentValue?: string | number | null
): T[] {
  if (!Array.isArray(options)) return [];
  const currentStr = currentValue !== undefined && currentValue !== null ? String(currentValue) : undefined;

  return options.filter((opt) => {
    if (opt.isAvailable !== false) return true;
    if (!currentStr) return false;
    return (
      opt.runtimeKey === currentStr ||
      opt.id === currentStr ||
      (opt as any).key === currentStr ||
      (opt as any).ruleId === currentStr ||
      (opt as any).value === currentStr ||
      (opt as any).amount === currentValue ||
      (opt as any).dice === currentStr ||
      (opt as any).formula === currentStr ||
      (opt as any).kind === currentStr
    );
  });
}

export function migrateCoreCategories(existing: unknown): SystemMechanicsConfig {
  if (!existing || (Array.isArray(existing) && existing.length === 0)) {
    return createCoreCategories();
  }
  let parsed = systemMechanicsConfigSchema.parse(existing);
  
  const manualCondition = parsed.find(m => m.id === 'core.manual_condition');
  if (manualCondition) {
    const toMoveToManual = ['core.visual_contact', 'core.physical_contact', 'core.auditory_contact', 'core.conscious'];
    toMoveToManual.forEach(id => {
      const catIndex = parsed.findIndex(m => m.id === id);
      if (catIndex !== -1) {
        const cat = parsed[catIndex];
        cat.rules.forEach(r => {
          if (id === 'core.conscious') {
            r.id = 'core.manual_condition.conscious';
            r.name = 'Objetivo consciente';
          } else {
            r.name = cat.name;
          }
        });
        manualCondition.rules.push(...cat.rules);
        parsed.splice(catIndex, 1);
      }
    });
  }

  let addReq = parsed.find(m => m.id === 'core.additional_requirement');
  if (!addReq) {
    addReq = {
      id: "core.additional_requirement",
      name: "Requisito adicional",
      rules: [],
      scope: { actions: true, objects: true, techniques: true },
      coreKey: "additional_requirement",
      description: "Requisito adicional",
      logicalType: "utility"
    } as any;
    parsed.push(addReq as any);
  }

  const toMoveToAdditional = ['core.active_ability', 'core.consumption'];
  toMoveToAdditional.forEach(id => {
    const catIndex = parsed.findIndex(m => m.id === id);
    if (catIndex !== -1) {
      const cat = parsed[catIndex];
      if (id === 'core.active_ability') {
        cat.rules.forEach(r => {
          r.name = r.name.replace('Habilidad', 'Técnica').replace('habilidad', 'técnica');
        });
      } else if (id === 'core.consumption') {
        cat.rules = [
          {
            id: "core.additional_requirement.consumption",
            cost: 0,
            name: "Consumir algo",
            ruleType: "component",
            component: {
              kind: "condition",
              role: "requirement",
              match: "all",
              predicates: [{ kind: "manual", signalId: "consume_something" }]
            }
          }
        ];
      }
      addReq!.rules.push(...cat.rules);
      parsed.splice(catIndex, 1);
    }
  });

  // Find or create numeric_modifier category
  let numModCat = parsed.find(c => c.id === 'core.numeric_modifier' || c.coreKey === 'numeric_modifier');
  if (!numModCat) {
    numModCat = {
      id: "core.numeric_modifier",
      coreKey: "numeric_modifier",
      name: "Modificador numérico",
      description: "Modificador numérico",
      logicalType: "support",
      family: "effect",
      scope: { techniques: true, objects: true, actions: true },
      rules: []
    } as any;
    parsed.push(numModCat);
  }

  // Migrate legacy bonus and penalty rules
  const legacyBonusCat = parsed.find(c => c.id === 'core.bonus' || c.coreKey === 'bonus');
  if (legacyBonusCat && legacyBonusCat.rules) {
    legacyBonusCat.rules.forEach(r => {
      const amt = (r as any).amount || parseInt((r as any).runtimeKey || r.name, 10);
      if (!isNaN(amt)) {
        const signStr = amt > 0 ? `+${amt}` : String(amt);
        const newId = `core.numeric_modifier.${amt}`;
        if (!numModCat!.rules.some(nr => nr.id === newId || nr.runtimeKey === String(amt))) {
          numModCat!.rules.push({
            id: newId,
            name: signStr,
            cost: typeof r.cost === 'number' ? r.cost : 0,
            runtimeKey: String(amt),
            ruleType: 'cost_modifier',
            isAvailable: r.isAvailable !== false
          });
        }
      }
    });
  }

  const legacyPenaltyCat = parsed.find(c => c.id === 'core.penalty' || c.coreKey === 'penalty');
  if (legacyPenaltyCat && legacyPenaltyCat.rules) {
    legacyPenaltyCat.rules.forEach(r => {
      let amt = (r as any).amount || parseInt((r as any).runtimeKey || r.name, 10);
      if (!isNaN(amt)) {
        if (amt > 0) amt = -amt; // force negative for penalty
        const signStr = String(amt);
        const newId = `core.numeric_modifier.${amt}`;
        if (!numModCat!.rules.some(nr => nr.id === newId || nr.runtimeKey === String(amt))) {
          numModCat!.rules.push({
            id: newId,
            name: signStr,
            cost: typeof r.cost === 'number' ? r.cost : 0,
            runtimeKey: String(amt),
            ruleType: 'cost_modifier',
            isAvailable: r.isAvailable !== false
          });
        }
      }
    });
  }

  // Remove retired obsolete core categories so they don't persist or reappear
  const retiredCoreKeys = RETIRED_CORE_CATEGORIES as readonly string[];
  parsed = parsed.filter(c => !retiredCoreKeys.includes(c.coreKey as string) && !retiredCoreKeys.some(k => c.id === `core.${k}`));

  parsed = parsed.map(c => {
    const withFamily = { ...c, family: c.family || getCategoryFamily(c) };
    if (c.coreKey && !(c.coreKey in CORE_CATEGORIES)) {
      const { coreKey, ...rest } = withFamily;
      return rest as any;
    }
    return withFamily;
  });

  // Ensure all core categories exist in schema (without altering their configured options/rules)
  const defaultCoreCategories = createCoreCategories();
  if (parsed.length === 0) {
    parsed = defaultCoreCategories;
  } else {
    for (const defaultCat of defaultCoreCategories) {
      const existingCat = parsed.find(c => c.id === defaultCat.id || c.coreKey === defaultCat.coreKey);
      if (!existingCat) {
        parsed.push({ ...defaultCat, rules: [] });
      }
    }
  }

  // Migrate legacy attribute-bound bonus/penalty costs to generic magnitude rules when customized
  const numModOptionCat = parsed.find(m => m.id === 'core.numeric_modifier' || m.coreKey === 'numeric_modifier');
  if (numModOptionCat) {
    // legacy bonus fue2 -> numeric_modifier 2
    const legacyFue2 = legacyBonusCat?.rules?.find(r => r.id === 'core.bonus.fue2');
    if (legacyFue2) {
      const opt2 = numModOptionCat.rules.find(r => r.id === 'core.numeric_modifier.2' || (r as any).runtimeKey === '2');
      if (opt2 && typeof legacyFue2.cost === 'number' && legacyFue2.cost !== 0 && opt2.cost <= 1) {
        opt2.cost = legacyFue2.cost;
      }
    }
    // legacy penalty int2 -> numeric_modifier -2
    const legacyInt2 = legacyPenaltyCat?.rules?.find(r => r.id === 'core.penalty.int2');
    if (legacyInt2) {
      const optMinus2 = numModOptionCat.rules.find(r => r.id === 'core.numeric_modifier.-2' || (r as any).runtimeKey === '-2');
      if (optMinus2 && typeof legacyInt2.cost === 'number' && legacyInt2.cost !== 0 && optMinus2.cost <= 1) {
        optMinus2.cost = legacyInt2.cost;
      }
    }
  }

  // Normalize existing core categories rules according to their contract
  for (const cat of parsed) {
    const contract = getCoreCategoryContract(cat);
    if (!contract) continue;

    if (contract.kind === 'ce_adjustment') {
      for (const rule of cat.rules) {
        if (rule.ruleType === 'effect' || rule.effect) {
          rule.ruleType = 'cost_modifier';
          if (!rule.runtimeKey) {
            rule.runtimeKey = (rule.effect as any)?.attributeId || (rule.effect as any)?.statId || rule.id.split('.').pop();
          }
          delete rule.effect;
        }
      }
    } else if (contract.kind === 'effect' && contract.effectType) {
      for (const rule of cat.rules) {
        rule.ruleType = 'effect';
        if (rule.effect && rule.effect.type !== contract.effectType) {
          rule.effect.type = contract.effectType;
        }
      }
    }
  }

  // Ensure all registered core categories exist in parsed configuration
  const canonicalCoreCategories = createCoreCategories();
  for (const freshCat of canonicalCoreCategories) {
    if (freshCat.coreKey && !parsed.some(c => c.id === freshCat.id || c.coreKey === freshCat.coreKey)) {
      parsed.push(freshCat);
    }
  }

  const result = systemMechanicsConfigSchema.parse(parsed);
  if (!validateCoreCategories(result)) throw new Error("Reserved core category identity collision");
  return result;
}

export function validateCoreCategories(value: SystemMechanicsConfig): boolean {
  return Object.keys(CORE_CATEGORIES).every(key => value.some(c => c.id === coreId(key) && c.coreKey === key)) && value.every(c => c.coreKey === undefined || c.id === coreId(String(c.coreKey)) && c.coreKey in CORE_CATEGORIES);
}

/**
 * RULES-DATA-2: Controlled, explicit one-time catalog migration.
 * Upgrades the dummy/default options of damage, healing, barrier, duration (turn values),
 * and numeric_modifier to the canonical Shadowmore values, while preserving any
 * custom non-canonical options in those categories and keeping all other categories
 * untouched.
 */
export function migrateCanonicalCatalogRulesData2(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  const targetCategoryIds = [
    'core.damage',
    'core.healing',
    'core.barrier',
    'core.duration',
    'core.numeric_modifier',
  ];

  const updated = existingCategories.map(cat => {
    if (!targetCategoryIds.includes(cat.id)) {
      return cat;
    }

    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    if (cat.id === 'core.duration') {
      // Preserve non-turn duration rules (instant, sustained, while_condition, etc.)
      // and replace 1-5 turns options with the canonical ones.
      const nonTurnRules = cat.rules.filter(r => {
        const rk = r.runtimeKey || r.id.split('.').pop() || '';
        return !['1', '2', '3', '4', '5'].includes(rk);
      });
      const canonicalTurnRules = canonicalCat.rules.filter(r => {
        const rk = r.runtimeKey || r.id.split('.').pop() || '';
        return ['1', '2', '3', '4', '5'].includes(rk);
      });
      return {
        ...cat,
        rules: [...canonicalTurnRules, ...nonTurnRules],
      };
    }

    // For damage, healing, barrier, numeric_modifier:
    // Retain any custom rules (rules whose IDs do not start with core.<catKey> or are user-created)
    // and replace core rules with the canonical list.
    const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
    return {
      ...cat,
      rules: [...canonicalCat.rules, ...customUserRules],
    };
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-2.1: Controlled, explicit one-time catalog migration.
 * Corrects:
 * - numeric_modifier: +5 marked isAvailable: false (does not exist in canonical catalog; kept for existing refs).
 * - base attributes: FUE/DES/RES/INT/VEL/VOL to +1 CE.
 * - derived stats: DB (+1 CE), EVA (+2 CE), COR (+2 CE), INI (+2 CE), RD (+3 CE).
 * - skills: core.skill with Carisma (+3 CE), Presencia (+3 CE).
 * - roll_type: roll ("Tirada") with +3 CE.
 * - cost_adjustment: stamina_reduction ("Reducción de Estamina") with +4 CE.
 */
export function migrateCanonicalCatalogRulesData2_1(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  updated = updated.map(cat => {
    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    if (cat.id === 'core.numeric_modifier') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const coreRules = canonicalCat.rules.map(cr => {
        if (cr.id === 'core.numeric_modifier.5') {
          return { ...cr, cost: 4, isAvailable: false };
        }
        return cr;
      });
      return {
        ...cat,
        rules: [...coreRules, ...customUserRules],
      };
    }

    if (cat.id === 'core.attribute') {
      const canonicalAttrCosts: Record<string, number> = {
        FUE: 1,
        DES: 1,
        RES: 1,
        INT: 1,
        VEL: 1,
        VOL: 1,
      };
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const coreRules = canonicalCat.rules.map(cr => {
        const rk = (cr.runtimeKey || '').toUpperCase();
        const cost = canonicalAttrCosts[rk] ?? cr.cost ?? 1;
        return { ...cr, cost };
      });
      return {
        ...cat,
        rules: [...coreRules, ...customUserRules],
      };
    }

    if (cat.id === 'core.derived_stat') {
      const canonicalStatCosts: Record<string, number> = {
        DB: 1,
        EVA: 2,
        COR: 2,
        INI: 2,
        RD: 3,
        SAL: 0,
        EST: 0,
      };
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const coreRules = canonicalCat.rules.map(cr => {
        const rk = (cr.runtimeKey || '').toUpperCase();
        const cost = canonicalStatCosts[rk] ?? cr.cost ?? 0;
        return { ...cr, cost };
      });
      return {
        ...cat,
        rules: [...coreRules, ...customUserRules],
      };
    }

    if (cat.id === 'core.skill') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const rules = [...cat.rules.filter(r => r.id.startsWith(`${cat.id}.`))];
      for (const cr of canonicalCat.rules) {
        if (!rules.some(r => r.id === cr.id || (r.runtimeKey && r.runtimeKey === cr.runtimeKey))) {
          rules.push(cr);
        }
      }
      return {
        ...cat,
        rules: [...rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.roll_type') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const rules = [...cat.rules.filter(r => r.id.startsWith(`${cat.id}.`))];
      for (const cr of canonicalCat.rules) {
        if (!rules.some(r => r.id === cr.id || (r.runtimeKey && r.runtimeKey === cr.runtimeKey))) {
          rules.push(cr);
        }
      }
      return {
        ...cat,
        rules: [...rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.cost_adjustment') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const rules = [...cat.rules.filter(r => r.id.startsWith(`${cat.id}.`))];
      for (const cr of canonicalCat.rules) {
        if (!rules.some(r => r.id === cr.id || (r.runtimeKey && r.runtimeKey === cr.runtimeKey))) {
          rules.push(cr);
        }
      }
      return {
        ...cat,
        rules: [...rules, ...customUserRules],
      };
    }

    return cat;
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-3A: Controlled, explicit one-time catalog migration.
 * Integrates canonical rules and CE balance for:
 * 1. Status (24 Altered Statuses with canonical CE, legacy statuses marked isAvailable: false)
 * 2. Object Manipulation (small=1, medium=2, large=4, huge=6)
 * 3. Transformation (body=1, 2m=2, 5m=3, 10m=4, 20m=6)
 * 4. Duration (1_day=4, 1_week=8, 1_month=14)
 */
export function migrateCanonicalCatalogRulesData3A(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  updated = updated.map(cat => {
    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    if (cat.id === 'core.status') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.object_manipulation') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.transformation') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.duration') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      const rules = [...cat.rules.filter(r => r.id.startsWith(`${cat.id}.`))];
      for (const cr of canonicalCat.rules) {
        const existingRule = rules.find(r => r.id === cr.id || (r.runtimeKey && r.runtimeKey === cr.runtimeKey));
        if (!existingRule) {
          rules.push(cr);
        } else if (['1_day', '1_week', '1_month'].includes(cr.runtimeKey || '')) {
          existingRule.cost = cr.cost;
        }
      }
      return {
        ...cat,
        rules: [...rules, ...customUserRules],
      };
    }

    return cat;
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-3B: Controlled, explicit one-time catalog migration.
 * Integrates canonical rules and CE balance for:
 * 1. Target (object=1, structure=3, self=0, enemy=0, ally=0, character=0)
 * 2. Target Count (enemy_2=2, enemy_3=3, ally_2=3, ally_3=4, generic up_to N)
 * 3. Area / Radius (5m=1, 10m=2, 20m=3, 50m=4, 100m=5)
 * 4. Range (preserved with 0 CE)
 * 5. Selection Restriction / Mode (all 0 CE)
 */
export function migrateCanonicalCatalogRulesData3B(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  updated = updated.map(cat => {
    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    if (cat.id === 'core.target') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.target_count') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.area') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.range') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    if (cat.id === 'core.selection_restriction') {
      const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
      return {
        ...cat,
        rules: [...canonicalCat.rules, ...customUserRules],
      };
    }

    return cat;
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-4A: Controlled, explicit one-time catalog migration.
 * Integrates canonical rules and CE balance for:
 * 1. Activation delay (delay1 = -1 CE)
 * 2. Cooldown (2 turns = -2 CE, other 1, 3, 4, 5 = 0 CE)
 * 3. Usage limits (combat = -4 CE, mission = -4 CE, day = -4 CE, turn = 0 CE)
 * 4. Manual conditions (visual_contact = -1, auditory_contact = -1, physical_contact = -1, speak_directly = -1, conscious = -2)
 * 5. Additional requirements (consumption = -1, active_ability = -2)
 */
export function migrateCanonicalCatalogRulesData4A(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  const targetCategoryIds = [
    'core.activation',
    'core.cooldown',
    'core.usage',
    'core.manual_condition',
    'core.additional_requirement',
  ];

  updated = updated.map(cat => {
    if (!targetCategoryIds.includes(cat.id)) {
      return cat;
    }

    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
    return {
      ...cat,
      rules: [...canonicalCat.rules, ...customUserRules],
    };
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-4B: Controlled, explicit one-time catalog migration.
 * Integrates canonical consequences and caps:
 * 1. Self damage per active turn (-1 CE)
 * 2. Fixed self damage 2 (-1 CE)
 * 3. Half dealt damage recoil (-4 CE)
 * 4. After-effect -2 INT for 3 turns (-3 CE)
 * 5. -2 DES while active (-2 CE)
 * 6. -2 INT per active turn (-1 CE)
 * 7. EST <= 5 -> Overheated (-3 CE)
 * 8. Absorb max 6 damage cap (-3 CE)
 */
export function migrateCanonicalCatalogRulesData4B(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  const targetCategoryIds = [
    'core.consequence',
    'core.caps',
    'core.health_cost',
  ];

  updated = updated.map(cat => {
    if (!targetCategoryIds.includes(cat.id)) {
      return cat;
    }

    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    const customUserRules = cat.rules.filter(r => !r.id.startsWith(`${cat.id}.`));
    return {
      ...cat,
      rules: [...canonicalCat.rules, ...customUserRules],
    };
  });

  return systemMechanicsConfigSchema.parse(updated);
}

/**
 * RULES-DATA-5A: Controlled, explicit one-time catalog migration.
 * Synchronizes canonical altered status categories:
 * 1. core.status: All 28 canonical status options (17 unique + 4 families + 7 tier variants).
 *    Purges legacy/non-canonical statuses (vulnerable, paralyzed).
 * 2. core.status_remove: Canonical cure/removal scopes (all, leve, moderado, grave, veneno, hemorragia, quemadura, aturdido, inmovilizado).
 * Retains any customized user CE values for canonical options.
 */
export function migrateCanonicalCatalogRulesData5A(existingCategories: SystemMechanicsConfig): SystemMechanicsConfig {
  const canonicalCats = createCoreCategories();
  const canonicalMap = new Map(canonicalCats.map(c => [c.id, c]));

  let updated = migrateCoreCategories(existingCategories);

  const targetCategoryIds = [
    'core.status',
    'core.status_remove',
  ];

  updated = updated.map(cat => {
    if (!targetCategoryIds.includes(cat.id)) {
      return cat;
    }

    const canonicalCat = canonicalMap.get(cat.id);
    if (!canonicalCat) return cat;

    // Retain existing configured CE costs for canonical rules if user edited them
    const existingCostMap = new Map<string, number>();
    for (const r of cat.rules) {
      if (typeof r.cost === 'number') {
        existingCostMap.set(r.id, r.cost);
        if (r.runtimeKey) existingCostMap.set(r.runtimeKey, r.cost);
      }
    }

    const mergedRules = canonicalCat.rules.map(canRule => {
      const existingCost = existingCostMap.get(canRule.id) ?? (canRule.runtimeKey ? existingCostMap.get(canRule.runtimeKey) : undefined);
      return {
        ...canRule,
        cost: existingCost !== undefined ? existingCost : canRule.cost,
      };
    });

    // Retain any custom user-added rules that don't match core rule IDs or retired IDs
    const customUserRules = cat.rules.filter(r => 
      !r.id.startsWith(`${cat.id}.`) && 
      !['core.status.vulnerable', 'core.status.paralyzed', 'vulnerable', 'paralyzed'].includes(r.id) &&
      !['vulnerable', 'paralyzed'].includes((r as any).runtimeKey)
    );

    return {
      ...cat,
      rules: [...mergedRules, ...customUserRules],
    };
  });

  return systemMechanicsConfigSchema.parse(updated);
}



