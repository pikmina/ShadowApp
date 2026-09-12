import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeMechanicView state
content = content.replace(
    'const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false);',
    'const [activeMechanicView, setActiveMechanicView] = useState<\'list\' | \'edit\'>(\'list\');\n  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false); // Deprecated, but keeping to not break if used elsewhere'
)

# 2. Update handleSaveMechanic to set activeMechanicView
content = content.replace(
    'setIsMechanicDialogOpen(false);',
    'setIsMechanicDialogOpen(false);\n      setActiveMechanicView(\'list\');'
)

# 3. Create a handleAddRuleToForm
add_rule_logic = """
  const handleAddRuleToForm = () => {
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
  };

  const handleRemoveRuleFromForm = (ruleId: string) => {
    setMechanicForm((current: any) => ({
      ...current,
      rules: (current.rules || []).filter((r: any) => r.id !== ruleId)
    }));
  };
"""

content = content.replace(
    'const handleAddRuleToMechanic = async () => {',
    add_rule_logic + '\n  const handleAddRuleToMechanic = async () => {'
)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
