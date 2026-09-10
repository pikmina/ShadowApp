export type MechanicalEffect = {
  _id: string; // Internal editor ID
  type: string; // 'mechanic_rule', 'modify_attribute', etc.
  mechanicId?: string; // Stable ID of the mechanics category
  ruleId?: string; // Stable ID of the rule inside the category
  value?: any;
  // Legacy fields that should be ignored in favor of live resolution
  ruleName?: string;
  cost?: number;
  mechDesc?: string;
};

export type SystemRule = {
  id: string;
  name: string;
  cost: number;
  mechDesc?: string;
};

export type MechanicCategory = {
  id: string;
  name: string;
  rules: SystemRule[];
};

export function resolveLiveRule(effect: MechanicalEffect, mechanicsCategories: MechanicCategory[]): SystemRule | null {
  if (effect.type !== 'mechanic_rule' || !effect.mechanicId || !effect.ruleId) {
    return null;
  }
  
  const category = mechanicsCategories.find(c => c.id === effect.mechanicId);
  if (!category) return null;
  
  const rule = category.rules.find(r => r.id === effect.ruleId);
  return rule || null;
}

export function calculateTotalCE(effects: MechanicalEffect[], mechanicsCategories: MechanicCategory[]): number {
  return effects.reduce((sum, effect) => {
    if (effect.type === 'mechanic_rule') {
      const liveRule = resolveLiveRule(effect, mechanicsCategories);
      const cost = liveRule ? liveRule.cost : (effect.cost || 0);
      return sum + cost;
    }
    if (effect.type === 'deal_damage') return sum + 2;
    if (effect.type === 'apply_status') return sum + 1;
    if (effect.type === 'modify_attribute') return sum + Number(effect.value || 0);
    return sum + Number(effect.cost || 0);
  }, 0);
}

export function getCELevel(totalCE: number): string {
  if (totalCE <= 2) return "Nivel 1 (Bajo)";
  if (totalCE <= 5) return "Nivel 2 (Medio)";
  return "Nivel 3+ (Alto)";
}
