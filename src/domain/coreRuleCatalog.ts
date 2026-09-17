import { systemMechanicsConfigSchema, type SystemMechanicsConfig } from './systemMechanics';
import type { RuleComponent } from './ruleComponents';

export const CORE_CATEGORIES = {
  damage: 'Daño', healing: 'Curación', barrier: 'Barrera', bonus: 'Bono', penalty: 'Pena', status: 'Estado alterado', cost_adjustment: 'Modificar coste', manual_resolution: 'Resolución manual',
  target: 'Objetivo', target_count: 'Cantidad', range: 'Rango', area: 'Área', duration: 'Duración', activation: 'Activación', cooldown: 'Cooldown', maintenance: 'Mantenimiento', usage: 'Límites de uso',
  resource_threshold: 'Umbral de recurso', manual_condition: 'Condición manual', additional_requirement: 'Requisito adicional', die_condition: 'Dado individual',
  stamina_cost: 'Coste de Estamina', health_cost: 'Coste de HP', self_damage: 'Daño propio', temporary_penalty: 'Penalización temporal', consequence_status: 'Estado como consecuencia', end_effect: 'Efecto al terminar', per_turn_effect: 'Efecto por turno', recoil: 'Recoil', caps: 'Límites / caps',
} as const;
export type CoreCategoryKey = keyof typeof CORE_CATEGORIES;
export const coreId = (key: string) => `core.${key}`;

/** Only CREATE / versioned migration uses these defaults. LOAD never calls this. */
export function createCoreCategories(): SystemMechanicsConfig {
  const getLogicalType = (key: string) => {
    switch(key) {
      case 'damage': case 'penalty': return 'offensive';
      case 'healing': case 'bonus': return 'support';
      case 'barrier': return 'defensive';
      case 'status': return 'control';
      case 'activation': case 'cooldown': case 'maintenance': case 'usage_limit': return 'limitation';
      default: return 'utility';
    }
  };
  const categories = Object.entries(CORE_CATEGORIES).map(([key, name]) => ({ id: coreId(key), coreKey: key, name, description: name, logicalType: getLogicalType(key) as any, scope: { techniques: true, objects: true, actions: true }, rules: [] as any[] }));
  function option(key: CoreCategoryKey, suffix: string, name: string, component: RuleComponent) {
    categories.find(c => c.coreKey === key)!.rules.push({ id: `${coreId(key)}.${suffix}`, name, cost: 0, ruleType: 'component', component });
  }
  function effect(key: CoreCategoryKey, suffix: string, name: string, value: object) {
    categories.find(c => c.coreKey === key)!.rules.push({ id: `${coreId(key)}.${suffix}`, name, cost: 0, ruleType: 'effect', effect: { timing: 'on_activation', ...value } });
  }
  effect('damage', '4d8', '4D8', { type: 'damage', dice: '4D8' });
  effect('healing', 'es2', 'Recuperar 2 EST', { type: 'healing', resourceId: 'ES', amount: 2 });
  effect('healing', 'hp2', 'Recuperar 2 HP', { type: 'healing', resourceId: 'SA', amount: 2 });
  effect('barrier', '30', 'Barrera 30', { type: 'barrier', amount: 30 });
  effect('bonus', 'fue2', '+2 FUE', { type: 'attribute_modifier', attributeId: 'FUE', amount: 2 });
  effect('penalty', 'int2', '−2 INT', { type: 'attribute_modifier', attributeId: 'INT', amount: -2 });
  effect('status', 'stunned', 'Aturdido', { type: 'status', statusElementId: 'core.status.stunned' });
  effect('cost_adjustment', 'quirk1', '+1 a costes de quirk', { type: 'cost_adjustment', scopeId: 'quirk', amount: 1 });
  effect('manual_resolution', 'unstable', 'Quirk inestable', { type: 'manual_resolution', message: 'El quirk se activa de forma inestable. El Master determina el efecto.' });
  for (const [suffix, name, self, allies, enemies] of [['self', 'Uno mismo', true, false, false], ['allies', 'Aliados', false, true, false], ['enemies', 'Enemigos', false, false, true], ['any', 'Cualquiera', true, true, true]] as const) option('target', suffix, name, { kind: 'target', self, allies, enemies });
  for (const n of [1, 2, 3, 4, 5]) {
    option('target_count', String(n), `Hasta ${n}`, { kind: 'target_count', min: 1, max: n });
    option('duration', String(n), `${n} turnos`, { kind: 'duration', duration: { mode: 'turns', turns: n } });
  }
  for (const mode of ['instant', 'sustained', 'while_condition'] as const) option('duration', mode, { instant: 'Instantáneo', sustained: 'Sostenido', while_condition: 'Mientras se cumpla' }[mode], { kind: 'duration', duration: { mode } });
  for (const meters of [0, 10, 50]) option('range', String(meters), `${meters} m`, { kind: 'range', meters });
  option('area', '50', 'Radio 50 m', { kind: 'area', radius: 50 });
  option('activation', 'delay1', 'Preparación: 1 turno', { kind: 'activation', turns: 1, signalId: '', passive: false });
  option('activation', 'speech', 'Acción manual: discurso', { kind: 'activation', turns: 0, signalId: 'speech', passive: false });
  option('activation', 'passive', 'Pasivo', { kind: 'activation', turns: 0, signalId: '', passive: true });
  option('cooldown', '2', 'Esperar 2 turnos', { kind: 'cooldown', turns: 2 });
  option('maintenance', 'es1', '1 EST por turno', { kind: 'maintenance', resourceId: 'ES', amount: 1 });
  for (const period of ['turn', 'combat', 'mission', 'day'] as const) option('usage', period, `1 por ${{ turn: 'turno', combat: 'combate', mission: 'misión', day: 'día' }[period]}`, { kind: 'usage', period, max: 1 });
  for (const [key, sense, label] of [['visual_contact', 'visual', 'Contacto visual'], ['auditory_contact', 'auditory', 'Contacto auditivo']] as const) option('manual_condition', key, label, { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense }] });
  option('manual_condition', 'physical_contact', 'Contacto físico', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'contact', sense: 'physical' }] });
  option('manual_condition', 'conscious', 'Objetivo consciente', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'conscious' }] });
  option('resource_threshold', 'es50', 'ES ≤ 50%', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'resource', resourceId: 'ES', comparison: 'lte', percent: 50 }] });
  
  option('additional_requirement', 'active_ability', 'Técnica activa (configurar ID)', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'ability_active', abilityId: 'ability-id' }] });
  option('additional_requirement', 'consumption', 'Consumir algo', { kind: 'condition', role: 'requirement', match: 'all', predicates: [{ kind: 'manual', signalId: 'consume_something' }] });
  
  option('manual_condition', 'emotion', 'Emoción intensa', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'manual', signalId: 'intense_emotion' }] });
  option('die_condition', '1to5', 'Algún dado entre 1 y 5', { kind: 'condition', role: 'condition', match: 'all', predicates: [{ kind: 'die', min: 1, max: 5 }] });
  for (const [key, resourceId, amount] of [['stamina_cost', 'ES', 1], ['health_cost', 'SA', 1], ['self_damage', 'SA', 2]] as const) option(key, 'base', CORE_CATEGORIES[key], { kind: 'consequence', role: key === 'self_damage' ? 'consequence' : 'cost', when: 'activation', consequence: { kind: 'resource', resourceId, amount } });
  option('temporary_penalty', 'des2', '−2 DES mientras esté activo', { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'attribute', attributeId: 'DES', amount: -2, turns: 2, untilEnd: true } });
  option('consequence_status', 'stunned', 'Aturdido 1 turno', { kind: 'consequence', role: 'consequence', when: 'activation', consequence: { kind: 'status', statusElementId: 'core.status.stunned', turns: 1 } });
  option('end_effect', 'int2', 'Al terminar: −2 INT durante 3 turnos', { kind: 'consequence', role: 'consequence', when: 'end', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 3 } });
  option('per_turn_effect', 'hp1', '1 daño propio por turno', { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'resource', resourceId: 'SA', amount: 1 } });
  option('per_turn_effect', 'int2', '−2 INT cada turno', { kind: 'consequence', role: 'consequence', when: 'each_turn', consequence: { kind: 'attribute', attributeId: 'INT', amount: -2, turns: 1 } });
  option('recoil', 'half', 'Mitad del daño provocado', { kind: 'consequence', role: 'consequence', when: 'after_damage', consequence: { kind: 'recoil', fraction: 0.5 } });
  option('caps', 'ce', 'CE entre 0 y 100 (editable)', { kind: 'cap', subject: 'stamina_cost', min: 0, max: 100 });
  return systemMechanicsConfigSchema.parse(categories);
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

  parsed = parsed.map(c => {
    if (c.coreKey && !(c.coreKey in CORE_CATEGORIES)) {
      const { coreKey, ...rest } = c;
      return rest as any;
    }
    return c;
  });

  const missing = createCoreCategories().filter(core => !parsed.some(category => category.id === core.id));
  const result = systemMechanicsConfigSchema.parse([...parsed, ...missing]);
  if (!validateCoreCategories(result)) throw new Error("Reserved core category identity collision");
  return result;
}

export function validateCoreCategories(value: SystemMechanicsConfig): boolean {
  return Object.keys(CORE_CATEGORIES).every(key => value.some(c => c.id === coreId(key) && c.coreKey === key)) && value.every(c => c.coreKey === undefined || c.id === coreId(String(c.coreKey)) && c.coreKey in CORE_CATEGORIES);
}
