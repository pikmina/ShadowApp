import { calculateDerivedStats } from './src/lib/characterValidation.ts';

const profile = { basic_stage: 'Novato', FUE: 5, traits: ['trait1'] };
const stages = [{ name: 'Novato', baseHealth: 10, baseStamina: 10 }];
const elements = [
  { id: 'trait1', effects: [{ type: 'stat_modifier', attributeId: 'FUE', value: 2 }, { type: 'modify_derived', target: 'INI', value: 5 }] }
];

console.log(calculateDerivedStats(profile, stages, elements));
