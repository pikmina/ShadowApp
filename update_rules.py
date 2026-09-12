import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

helper = """
  const getEffectLogicalType = (effect: any): 'offensive' | 'defensive' | 'support' | 'control' | 'utility' => {
    if (!effect) return 'utility';
    if (effect.type === 'damage') return 'offensive';
    if (effect.type === 'barrier') return 'defensive';
    if (effect.type === 'healing') return 'support';
    if (effect.type === 'status') return 'control';
    if (effect.type === 'attribute_modifier' || effect.type === 'derived_stat_modifier') return effect.amount >= 0 ? 'support' : 'control';
    return 'utility';
  };

  const deriveLogicalType = (rules: any[]) => {
    const types = rules
      .filter((r: any) => r.ruleType === 'effect' && r.effect)
      .map((r: any) => getEffectLogicalType(r.effect));
    
    if (types.includes('offensive')) return 'offensive';
    if (types.includes('control')) return 'control';
    if (types.includes('support')) return 'support';
    if (types.includes('defensive')) return 'defensive';
    return 'utility';
  };
"""

idx = content.find('const handleAddRuleToForm')
if idx != -1:
    content = content[:idx] + helper + '\n  ' + content[idx:]
else:
    print("handleAddRuleToForm not found")

add_rule_orig = """  const handleAddRuleToForm = () => {
    if (!newRuleName.trim()) return;
    const newRule = {
      id: Date.now().toString(),
      name: newRuleName,
      cost: newRuleCost,
      mechDesc: newRuleMechDesc,
      ruleType: newRuleType,
      ...(newRuleType === 'effect' ? { effect: newRuleEffect } : {}),
    };
    setMechanicForm((current: any) => ({
      ...current,
      rules: [...(current.rules || []), newRule]
    }));
    setNewRuleName('');
    setNewRuleCost(0);
    setNewRuleMechDesc('');
    setNewRuleType('effect');
    setNewRuleEffect(createEffectDefinition('damage'));
  };"""

add_rule_new = """  const handleAddRuleToForm = () => {
    if (!newRuleName.trim()) return;
    const newRule = {
      id: Date.now().toString(),
      name: newRuleName,
      cost: newRuleCost,
      mechDesc: newRuleMechDesc,
      ruleType: newRuleType,
      ...(newRuleType === 'effect' ? { effect: newRuleEffect } : {}),
    };
    
    const currentRules = mechanicForm.rules || [];
    const allRules = [...currentRules, newRule];
    const types = allRules
      .filter((r: any) => r.ruleType === 'effect' && r.effect)
      .map((r: any) => getEffectLogicalType(r.effect));
      
    const hasOffensiveOrControl = types.includes('offensive') || types.includes('control');
    const hasSupportOrDefensive = types.includes('support') || types.includes('defensive');
    
    if (hasOffensiveOrControl && hasSupportOrDefensive) {
      alert("Incompatibilidad mecánica: No puedes mezclar opciones de Daño/Control con opciones de Soporte/Defensivas en la misma categoría técnica.");
      return;
    }
    
    setMechanicForm((current: any) => ({
      ...current,
      logicalType: deriveLogicalType(allRules),
      rules: allRules
    }));
    setNewRuleName('');
    setNewRuleCost(0);
    setNewRuleMechDesc('');
    setNewRuleType('effect');
    setNewRuleEffect(createEffectDefinition('damage'));
  };"""

content = content.replace(add_rule_orig, add_rule_new)

rm_rule_orig = """  const handleRemoveRuleFromForm = (ruleId: string) => {
    setMechanicForm((current: any) => ({
      ...current,
      rules: (current.rules || []).filter((r: any) => r.id !== ruleId)
    }));
  };"""

rm_rule_new = """  const handleRemoveRuleFromForm = (ruleId: string) => {
    setMechanicForm((current: any) => {
      const newRules = (current.rules || []).filter((r: any) => r.id !== ruleId);
      return {
        ...current,
        logicalType: deriveLogicalType(newRules),
        rules: newRules
      };
    });
  };"""

content = content.replace(rm_rule_orig, rm_rule_new)

select_orig_pattern = re.compile(r'<Label>Tipo Lógico</Label>\s*<Select value=\{mechanicForm\.logicalType\}(.|\n)*?</Select>', re.MULTILINE)
select_new = """<Label>Tipo Lógico (Derivado)</Label>
                        <div className="flex items-center h-10 px-3 py-2 text-sm border rounded-md bg-muted/50 text-muted-foreground border-input">
                          {{"offensive": "Ofensiva", "defensive": "Defensiva", "support": "Soporte", "control": "Control", "utility": "Utilidad"}[mechanicForm.logicalType as string] || "Utilidad"}
                        </div>"""

content = select_orig_pattern.sub(select_new, content)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

