import { mechanicalBehaviorSchema, type MechanicalBehaviorInput } from './mechanicalBehavior.ts';
const passive = (id: string, effect: any): MechanicalBehaviorInput => ({ id, mode: 'continuous', effects: [{ id: id + '.effect', ...effect }] });
const manual = (id: string, message: string) => passive(id, { type: 'manual', message });
const entries: Array<{ key: string; name: string; description: string; behaviors: MechanicalBehaviorInput[]; pending?: string }> = [
  ...[
    ['agile', 'Ágil', 'vel', 'Velocidad'], ['ambidextrous', 'Ambidiestro', 'des', 'Destreza'],
    ['mental-fortitude', 'Fortaleza mental', 'vol', 'Voluntad'], ['strong', 'Fuerte', 'fue', 'Fuerza'],
    ['keen-mind', 'Mente Aguda', 'int', 'Inteligencia'], ['resilient', 'Resistente', 'res', 'Resistencia'],
  ].map(([key, name, attributeId, label]) => ({ key, name, description: '+1 en ' + label + '.', behaviors: [passive(key + '.attribute', { type: 'attribute_modifier', attributeId, amount: 1 })] })),
  ...[['improved-stamina', 'Estamina Mejorada', 'estamina'], ['improved-health', 'Salud Mejorada', 'salud']].map(([key, name, statId]) => ({ key, name, description: '+2 ' + statId + ' máxima.', behaviors: [passive(key + '.maximum', { type: 'derived_stat_modifier', statId, amount: 2 })] })),
  { key: 'natural-leader', name: 'Líder nato', description: 'Al dar un discurso, una vez por combate, hasta 3 aliados recuperan 2 de Estamina.', behaviors: [{
    id: 'natural-leader.speech', mode: 'active', activation: { actionType: 'manual', timing: 'immediate', description: 'Dar un discurso.' },
    conditions: [{ type: 'manual', signalId: 'speech', description: 'Ha dado un discurso.' }], target: { type: 'ally', quantity: { mode: 'up_to', count: 3 } },
    effects: [{ id: 'natural-leader.recover', type: 'healing', resourceId: 'ES', amount: 2 }], limitations: [{ id: 'natural-leader.usage', type: 'usage_limit', period: 'combat', max: 1 }],
  }], pending: 'Falta integración con combate persistido y selección validada de hasta 3 aliados.' },
  { key: 'quick-reflexes', name: 'Reflejos Rápidos', description: '+2 iniciativa solo en el primer turno.', behaviors: [{
    ...passive('quick-reflexes.initiative', { type: 'derived_stat_modifier', statId: 'ini', amount: 2 }), conditions: [{ type: 'manual', signalId: 'first_turn', description: 'Solo durante el primer turno del combate.' }],
  }], pending: 'El combate debe suministrar first_turn solo durante el primer turno. No es un bono permanente de ficha.' },
  { key: 'wealth', name: 'Riqueza', description: 'Obtiene 300 yenes al mes en concepto de herencia, regalos, etc.', behaviors: [manual('wealth.monthly', 'Ingreso mensual: +300 ¥. Aplicación manual; calendario y pago transaccional periódico pendientes.')], pending: 'No hay runtime calendario: pago mensual manual; nunca durante LOAD o UPDATE.' },
  { key: 'talented', name: 'Talentoso', description: 'Permite un atributo adicional en el máximo aunque ya se haya alcanzado el límite de atributos al máximo, sin elevar el máximo individual.', behaviors: [manual('talented.cap-exception', 'Un atributo adicional puede alcanzar el máximo de etapa. No aumenta el máximo individual. Resolución manual hasta definir el límite de cantidad de atributos al máximo.')], pending: 'Las etapas no definen cuántos atributos pueden estar al máximo. Excepción manual pendiente de ese contrato; no inventar límite.' },
  { key: 'regeneration', name: 'Regeneración', description: 'Recupera 2 puntos de Salud por turno y puede regenerar extremidades perdidas.', behaviors: [
    { id: 'regeneration.turn', mode: 'reactive', trigger: { kind: 'turn_start' }, target: { type: 'self' }, effects: [{ id: 'regeneration.heal', type: 'healing', resourceId: 'SA', amount: 2 }] },
    manual('regeneration.limbs', 'Puede regenerar extremidades perdidas. Resolución manual; no existe sistema anatómico.'),
  ], pending: 'Persistencia del combate pendiente; anatomía manual.' },
  { key: 'flying', name: 'Volador', description: 'Puede volar.', behaviors: [manual('flying.capability', 'Puede volar. Capacidad narrativa manual; no presupone velocidad ni motor de movimiento.')] },
];
export const SYSTEM_TRAITS = entries.map(entry => ({
  id: 'core.trait.' + entry.key, kind: 'trait' as const, name: entry.name, description: entry.description,
  mechanicalBehaviors: entry.behaviors.map(b => mechanicalBehaviorSchema.parse({ ...b, internalNotes: entry.pending ?? '' })),
  metadata: { seedVersion: 1, supportPending: entry.pending ? [entry.pending] : [] },
}));
