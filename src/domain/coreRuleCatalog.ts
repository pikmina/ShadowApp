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
  status: 'Estado alterado',
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
  caps: 'Límites / caps',
  transformation: 'Transformación',
} as const;
export type CoreCategoryKey = keyof typeof CORE_CATEGORIES;

export const RETIRED_CORE_CATEGORIES = [
  'self_damage',
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
  transformation: {
    coreKey: 'transformation',
    kind: 'effect',
    ruleClass: 'effect',
    ruleClassLabel: 'Efecto',
    effectType: 'transformation',
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
  caps: { coreKey: 'caps', kind: 'component', ruleClass: 'component', ruleClassLabel: 'Aplicación / Regla', editorMode: 'component' },
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
  function option(key: CoreCategoryKey, suffix: string, name: string, component?: RuleComponent, runtimeKey?: string, cost: number = 0) {
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
    cat.rules.push(rule);
  }
  function effect(key: CoreCategoryKey, suffix: string, name: string, value: object, runtimeKey?: string, cost: number = 0) {
    const cat = categories.find(c => c.coreKey === key);
    if (!cat) return;
    cat.rules.push({
      id: `${coreId(key)}.${suffix}`,
      name,
      cost,
      runtimeKey: runtimeKey ?? suffix,
      ruleType: 'effect',
      effect: { timing: 'on_activation', ...value },
    });
  }

  // Damage Dice
  effect('damage', '4d8', '4D8', { type: 'damage', dice: '4D8' }, '4D8', 4);
  effect('damage', '1d6', '1D6', { type: 'damage', dice: '1D6' }, '1D6', 1);
  effect('damage', '1d8', '1D8', { type: 'damage', dice: '1D8' }, '1D8', 1);
  effect('damage', '2d6', '2D6', { type: 'damage', dice: '2D6' }, '2D6', 2);
  effect('damage', '2d8', '2D8', { type: 'damage', dice: '2D8' }, '2D8', 2);
  effect('damage', '1d10', '1D10', { type: 'damage', dice: '1D10' }, '1D10', 2);
  effect('damage', '3d6', '3D6', { type: 'damage', dice: '3D6' }, '3D6', 3);
  effect('damage', '4d6', '4D6', { type: 'damage', dice: '4D6' }, '4D6', 4);
  effect('damage', '2d10', '2D10', { type: 'damage', dice: '2D10' }, '2D10', 4);

  // Damage Types (Canonical Core Category)
  option('damage_type', 'fisico', 'Físico', undefined, 'fisico', 0);
  option('damage_type', 'cinetico', 'Cinético', undefined, 'cinetico', 0);
  option('damage_type', 'fuego', 'Fuego', undefined, 'fuego', 0);
  option('damage_type', 'hielo', 'Hielo', undefined, 'hielo', 0);
  option('damage_type', 'electrico', 'Eléctrico', undefined, 'electrico', 0);
  option('damage_type', 'acido', 'Ácido', undefined, 'acido', 0);
  option('damage_type', 'psiquico', 'Psíquico / Mental', undefined, 'psiquico', 0);
  option('damage_type', 'sonoro', 'Sonoro', undefined, 'sonoro', 0);
  option('damage_type', 'cortante', 'Cortante', undefined, 'cortante', 0);
  option('damage_type', 'perforante', 'Perforante', undefined, 'perforante', 0);
  option('damage_type', 'contundente', 'Contundente', undefined, 'contundente', 0);

  // Healing & Barrier
  effect('healing', '1', 'Curación 1', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 1, magnitude: { kind: 'fixed', amount: 1 } }, '1', 1);
  effect('healing', '2', 'Curación 2', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 2, magnitude: { kind: 'fixed', amount: 2 } }, '2', 1);
  effect('healing', '3', 'Curación 3', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 3, magnitude: { kind: 'fixed', amount: 3 } }, '3', 2);
  effect('healing', '4', 'Curación 4', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 4, magnitude: { kind: 'fixed', amount: 4 } }, '4', 2);
  effect('healing', '5', 'Curación 5', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 5, magnitude: { kind: 'fixed', amount: 5 } }, '5', 3);
  effect('healing', '10', 'Curación 10', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 10, magnitude: { kind: 'fixed', amount: 10 } }, '10', 6);
  effect('healing', 'es2', 'Recuperar 2 EST', { type: 'healing', resourceId: 'ES', kind: 'fixed', amount: 2, magnitude: { kind: 'fixed', amount: 2 } }, 'es2', 1);
  effect('healing', 'hp2', 'Recuperar 2 HP', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 2, magnitude: { kind: 'fixed', amount: 2 } }, 'hp2', 1);
  effect('healing', 'es5', 'Recuperar 5 EST', { type: 'healing', resourceId: 'ES', kind: 'fixed', amount: 5, magnitude: { kind: 'fixed', amount: 5 } }, 'es5', 3);
  effect('healing', 'hp5', 'Recuperar 5 HP', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 5, magnitude: { kind: 'fixed', amount: 5 } }, 'hp5', 3);
  effect('healing', 'es10', 'Recuperar 10 EST', { type: 'healing', resourceId: 'ES', kind: 'fixed', amount: 10, magnitude: { kind: 'fixed', amount: 10 } }, 'es10', 6);
  effect('healing', 'hp10', 'Recuperar 10 HP', { type: 'healing', resourceId: 'SA', kind: 'fixed', amount: 10, magnitude: { kind: 'fixed', amount: 10 } }, 'hp10', 6);
  effect('healing', '1d4', 'Curación 1D4', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '1D4', dice: '1D4', magnitude: { kind: 'dice', formula: '1D4' } }, '1D4', 1);
  effect('healing', '1d6', 'Curación 1D6', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '1D6', dice: '1D6', magnitude: { kind: 'dice', formula: '1D6' } }, '1D6', 2);
  effect('healing', '2d4', 'Curación 2D4', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '2D4', dice: '2D4', magnitude: { kind: 'dice', formula: '2D4' } }, '2D4', 2);
  effect('healing', '2d6', 'Curación 2D6', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '2D6', dice: '2D6', magnitude: { kind: 'dice', formula: '2D6' } }, '2D6', 3);
  effect('healing', '3d4', 'Curación 3D4', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '3D4', dice: '3D4', magnitude: { kind: 'dice', formula: '3D4' } }, '3D4', 3);
  effect('healing', '3d6', 'Curación 3D6', { type: 'healing', resourceId: 'SA', kind: 'dice', formula: '3D6', dice: '3D6', magnitude: { kind: 'dice', formula: '3D6' } }, '3D6', 4);
  effect('barrier', '10', 'Barrera 10', { type: 'barrier', amount: 10 }, '10', 1);
  effect('barrier', '15', 'Barrera 15', { type: 'barrier', amount: 15 }, '15', 2);
  effect('barrier', '20', 'Barrera 20', { type: 'barrier', amount: 20 }, '20', 2);
  effect('barrier', '30', 'Barrera 30', { type: 'barrier', amount: 30 }, '30', 3);
  effect('barrier', '40', 'Barrera 40', { type: 'barrier', amount: 40 }, '40', 4);
  effect('barrier', '50', 'Barrera 50', { type: 'barrier', amount: 50 }, '50', 5);

  // Numeric Modifiers (Generic magnitudes with sign)
  for (const n of [1, 2, 3, 4, 5]) {
    const bonusCost = n === 3 ? 2 : (n === 2 ? 1 : (n > 3 ? n - 1 : 0));
    option('numeric_modifier', String(n), `+${n}`, undefined, String(n), bonusCost);
    option('numeric_modifier', `-${n}`, `−${n}`, undefined, `-${n}`, 0);
  }

  // Derived Stats (Core Category)
  option('derived_stat', 'eva', `${getDerivedStatLabel('EVA')} (EVA)`, undefined, 'EVA', 2);
  option('derived_stat', 'sal', `${getDerivedStatLabel('SAL')} (SA)`, undefined, 'SAL', 0);
  option('derived_stat', 'est', `${getDerivedStatLabel('EST')} (ES)`, undefined, 'EST', 0);
  option('derived_stat', 'ini', `${getDerivedStatLabel('INI')} (INI)`, undefined, 'INI', 0);
  option('derived_stat', 'rd', `${getDerivedStatLabel('RD')} (RD)`, undefined, 'RD', 0);
  option('derived_stat', 'cor', `${getDerivedStatLabel('COR')} (COR)`, undefined, 'COR', 0);

  // Attributes (Core Category)
  option('attribute', 'fue', getAttributeLabel('FUE'), undefined, 'FUE', 0);
  option('attribute', 'res', getAttributeLabel('RES'), undefined, 'RES', 0);
  option('attribute', 'des', getAttributeLabel('DES'), undefined, 'DES', 0);
  option('attribute', 'int', getAttributeLabel('INT'), undefined, 'INT', 0);
  option('attribute', 'vel', getAttributeLabel('VEL'), undefined, 'VEL', 0);
  option('attribute', 'vol', getAttributeLabel('VOL'), undefined, 'VOL', 0);

  // Health Cost (Sacrificio de HP)
  for (const n of [1, 2, 3, 4, 5]) {
    option('health_cost', String(n), `${n} HP`, { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'resource', resourceId: 'SA', amount: n } }, String(n), 0);
  }

  // Status & Manual Adjustments
  effect('status', 'stunned', 'Aturdido', { type: 'status', statusElementId: 'core.status.stunned' });
  effect('cost_adjustment', 'quirk1', '+1 a costes de quirk', { type: 'cost_adjustment', scopeId: 'quirk', amount: 1 });
  effect('manual_resolution', 'unstable', 'Quirk inestable', { type: 'manual_resolution', message: 'El quirk se activa de forma inestable. El Master determina el efecto.' });

  // Transformation Magnitudes
  effect('transformation', 'body', 'Corporal', { type: 'transformation', magnitude: { type: 'body', value: 1 } }, 'body', 1);
  effect('transformation', '2m', '2 metros', { type: 'transformation', magnitude: { type: '2m', value: 2 } }, '2m', 2);
  effect('transformation', '5m', '5 metros', { type: 'transformation', magnitude: { type: '5m', value: 3 } }, '5m', 3);
  effect('transformation', '10m', '10 metros', { type: 'transformation', magnitude: { type: '10m', value: 4 } }, '10m', 4);
  effect('transformation', '20m', '20 metros', { type: 'transformation', magnitude: { type: '20m', value: 6 } }, '20m', 6);

  // Target
  option('target', 'self', 'Uno mismo', { kind: 'target', self: true, allies: false, enemies: false }, 'self');
  option('target', 'enemy', 'Enemigo', { kind: 'target', self: false, allies: false, enemies: true }, 'enemy');
  option('target', 'ally', 'Aliado', { kind: 'target', self: false, allies: true, enemies: false }, 'ally');
  option('target', 'character', 'Personaje', { kind: 'target', self: true, allies: true, enemies: true }, 'character');
  option('target', 'object', 'Objeto', undefined, 'object');
  option('target', 'area', 'Área', undefined, 'area');
  option('target', 'roll', 'Tirada', undefined, 'roll');
  option('target', 'resource', 'Recurso', undefined, 'resource');
  option('target', 'active_element', 'Elemento activo', undefined, 'active_element');
  option('target', 'manual', 'Manual / A determinar', undefined, 'manual');
  option('target', 'allies', 'Aliados', { kind: 'target', self: false, allies: true, enemies: false }, 'allies');
  option('target', 'enemies', 'Enemigos', { kind: 'target', self: false, allies: false, enemies: true }, 'enemies');
  option('target', 'any', 'Cualquiera', { kind: 'target', self: true, allies: true, enemies: true }, 'any');

  // Target Count
  for (const n of [1, 2, 3, 4, 5]) {
    option('target_count', String(n), `Hasta ${n}`, { kind: 'target_count', min: 1, max: n }, String(n));
  }
  option('target_count', 'all', 'Todos los objetivos válidos', undefined, 'all');

  // Range
  option('range', 'self', 'Personal', { kind: 'range', meters: 0 }, 'self');
  option('range', 'contact', 'Contacto', { kind: 'range', meters: 1 }, 'contact');
  option('range', 'distance', 'A distancia', { kind: 'range', meters: 10 }, 'distance');
  option('range', 'unlimited', 'Ilimitado', { kind: 'range', meters: 9999 }, 'unlimited');
  for (const meters of [0, 5, 10, 20, 50]) option('range', String(meters), `${meters} m`, { kind: 'range', meters }, String(meters));

  // Area
  option('area', 'radius', 'Radio circular', { kind: 'area', radius: 5 }, 'radius');
  option('area', 'cone', 'Cono', undefined, 'cone');
  option('area', 'line', 'Línea recta', undefined, 'line');
  option('area', 'zone', 'Zona delimitada', undefined, 'zone');
  for (const meters of [5, 10, 15, 20, 50]) option('area', String(meters), `${meters} m`, { kind: 'area', radius: meters }, String(meters));

  // Selection Mode (Core Category core.selection_restriction)
  option('selection_restriction', 'standard_priority', 'Prioridad estándar', undefined, 'standard_priority', 0);
  option('selection_restriction', 'manual', 'Elección manual', undefined, 'manual', 0);
  option('selection_restriction', 'random', 'Aleatoria', undefined, 'random', 0);
  option('selection_restriction', 'none', 'Sin restricción', undefined, 'none');
  option('selection_restriction', 'nearest', 'Más cercano', undefined, 'nearest');
  option('selection_restriction', 'specific', 'Específico', undefined, 'specific');
  option('selection_restriction', 'exclude', 'Excluir específico', undefined, 'exclude');

  // Duration
  option('duration', 'instant', 'Instantánea', { kind: 'duration', duration: { mode: 'instant' } }, 'instant', 0);
  option('duration', 'turns', 'Por turnos', { kind: 'duration', duration: { mode: 'turns', turns: 1 } }, 'turns', 0);
  for (const n of [1, 2, 3, 4, 5]) {
    const durCost = n === 1 ? 0 : (n === 2 ? 1 : n - 1);
    option('duration', String(n), `${n} turnos`, { kind: 'duration', duration: { mode: 'turns', turns: n } }, String(n), durCost);
  }
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
  option('activation', 'delay1', 'Preparación: 1 turno', { kind: 'activation', turns: 1, signalId: '', passive: false }, 'delay1');
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
    option('usage', period, `1 por ${{ turn: 'turno', combat: 'combate', mission: 'misión', day: 'día' }[period]}`, { kind: 'usage', period, max: 1 }, period, 0);
  }
  for (const n of [1, 2, 3, 4, 5]) {
    option('cooldown', String(n), `${n} ${n === 1 ? 'turno' : 'turnos'}`, { kind: 'cooldown', turns: n }, String(n), -n);
  }

  // Roll Types
  option('roll_type', 'action', 'Acción general', undefined, 'action');
  option('roll_type', 'attack', 'Tirada de ataque', undefined, 'attack');
  option('roll_type', 'defense', 'Tirada de defensa', undefined, 'defense');
  option('roll_type', 'saving', 'Tirada de salvación', undefined, 'saving');
  option('roll_type', 'skill', 'Prueba de habilidad', undefined, 'skill');
  option('roll_type', 'all', 'Cualquier acción', undefined, 'all');

  // Conditions, Maintenance & Requirements
  option('maintenance', 'es1', '1 EST por turno', { kind: 'maintenance', resourceId: 'ES', amount: 1 }, 'es1', 0);
  option('maintenance', 'es2', '2 EST por turno', { kind: 'maintenance', resourceId: 'ES', amount: 2 }, 'es2', 0);
  option('maintenance', 'hp1', '1 HP por turno', { kind: 'maintenance', resourceId: 'SA', amount: 1 }, 'hp1', 0);
  option('maintenance', 'hp2', '2 HP por turno', { kind: 'maintenance', resourceId: 'SA', amount: 2 }, 'hp2', 0);

  for (const [key, sense, label] of [['visual_contact', 'visual', 'Contacto visual'], ['auditory_contact', 'auditory', 'Contacto auditivo']] as const) option('manual_condition', key, label, { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense }] });
  option('manual_condition', 'physical_contact', 'Contacto físico', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense: 'physical' }] });
  option('manual_condition', 'speak_directly', 'Debe hablar directamente al objetivo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'speak_directly' }] }, 'speak_directly', 0);
  option('manual_condition', 'conscious', 'Objetivo consciente', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'conscious' }] });
  option('manual_condition', 'emotion', 'Emoción intensa', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'manual', signalId: 'intense_emotion' }] });

  option('resource_threshold', 'es50', 'ES ≤ 50%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 50 }] }, 'es50', 0);
  option('resource_threshold', 'es25', 'ES ≤ 25%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 25 }] }, 'es25', 0);
  option('resource_threshold', 'hp50', 'HP ≤ 50%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'SA', comparison: 'lte', percent: 50 }] }, 'hp50', 0);
  option('resource_threshold', 'hp25', 'HP ≤ 25%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'SA', comparison: 'lte', percent: 25 }] }, 'hp25', 0);
  
  option('additional_requirement', 'active_ability', 'Técnica activa (configurar ID)', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'ability_active', abilityId: 'ability-id' }] }, 'active_ability', 0);
  option('additional_requirement', 'consumption', 'Consumir algo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'consume_something' }] }, 'consumption', 0);
  
  option('die_condition', '1to5', 'Algún dado entre 1 y 5', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 1, max: 5 }] }, '1to5', 0);
  option('die_condition', 'crit', 'En tirada crítica', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 6, max: 6 }] }, 'crit', 0);

  option('caps', 'ce', 'CE entre 0 y 100 (editable)', { kind: 'cap', subject: 'stamina_cost', min: 0, max: 100 }, 'ce', 0);
  option('caps', 'damage', 'Daño máximo acotado', { kind: 'cap', subject: 'damage', min: 0, max: 50 }, 'damage', 0);

  return systemMechanicsConfigSchema.parse(categories);
}

export function getCategoryOptions(
  categories: SystemMechanicsConfig = [],
  categoryKeyOrId: string
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

  if (!cat || !Array.isArray(cat.rules) || cat.rules.length === 0) {
    const coreCats = createCoreCategories();
    const fallbackCat = coreCats.find(
      c => c.id === categoryKeyOrId || c.coreKey === categoryKeyOrId || c.id === `core.${categoryKeyOrId}`
    );
    if (!fallbackCat || !Array.isArray(fallbackCat.rules)) return [];
    return fallbackCat.rules.map(extractRuleProps);
  }

  return cat.rules.map(extractRuleProps);
}

export function getVisibleOptions<T extends { runtimeKey?: string; id?: string; isAvailable?: boolean; name?: string }>(
  options: T[],
  currentValue?: string | number | null
): T[] {
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
  let parsed = systemMechanicsConfigSchema.parse(existing ?? []);
  
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

  // Backfill missing core categories
  const defaultCoreCategories = createCoreCategories();
  for (const defaultCat of defaultCoreCategories) {
    const existingCat = parsed.find(c => c.id === defaultCat.id || c.coreKey === defaultCat.coreKey);
    if (!existingCat) {
      parsed.push(defaultCat);
    } else {
      // Backfill missing core options into existing categories without overwriting existing or custom rules
      for (const defaultRule of defaultCat.rules) {
        const hasRule = existingCat.rules.some(r => r.id === defaultRule.id || ((r as any).runtimeKey && (r as any).runtimeKey === (defaultRule as any).runtimeKey));
        if (!hasRule) {
          existingCat.rules.push(defaultRule);
        }
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

  const result = systemMechanicsConfigSchema.parse(parsed);
  if (!validateCoreCategories(result)) throw new Error("Reserved core category identity collision");
  return result;
}

export function validateCoreCategories(value: SystemMechanicsConfig): boolean {
  return Object.keys(CORE_CATEGORIES).every(key => value.some(c => c.id === coreId(key) && c.coreKey === key)) && value.every(c => c.coreKey === undefined || c.id === coreId(String(c.coreKey)) && c.coreKey in CORE_CATEGORIES);
}
