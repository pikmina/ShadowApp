const fs = require('fs');

let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// Icons import
if (!content.includes('import { Shield, Hand, Heart, Activity, AlertTriangle, Clock, Target, Maximize, TrendingUp, Edit2, Trash2, Plus, GripVertical } from "lucide-react"')) {
    content = content.replace(
        'import { BookOpen as SectionIcon } from "lucide-react";',
        'import { BookOpen as SectionIcon, Hand, Shield, Heart, Activity, AlertTriangle, Clock, Target, Maximize, TrendingUp, Edit2, Trash2, Plus, GripVertical, Settings2 } from "lucide-react";'
    );
}

// Add state for Mechanics
const mechanicStateCode = `
  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { key: 'system_mechanics', type: 'json', value: [], description: 'Mecánicas y Costes del Sistema (CE)' };
  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];
  
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);
  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false);
  const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, rules: [] });
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCost, setNewRuleCost] = useState(0);

  const selectedMechanic = mechanics.find((m: any) => m.id === selectedMechanicId);

  const handleSaveMechanic = async () => {
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === mechanicForm.id);
      
      if (existingIndex >= 0) {
        newMechanics[existingIndex] = { ...mechanicForm };
      } else {
        newMechanics.push({ ...mechanicForm, id: mechanicForm.name.toLowerCase().replace(/\\s+/g, '_') });
      }

      await apiFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify({
          key: 'system_mechanics',
          type: 'json',
          value: newMechanics,
          description: mechanicsRule.description
        })
      });
      setIsMechanicDialogOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMechanic = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres borrar esta categoría?")) return;
    try {
      const newMechanics = mechanics.filter((m: any) => m.id !== id);
      await apiFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify({
          key: 'system_mechanics',
          type: 'json',
          value: newMechanics,
          description: mechanicsRule.description
        })
      });
      if (selectedMechanicId === id) setSelectedMechanicId(null);
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRuleToMechanic = async () => {
    if (!newRuleName.trim() || !selectedMechanic) return;
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === selectedMechanic.id);
      
      if (existingIndex >= 0) {
        const updatedRules = [...(newMechanics[existingIndex].rules || []), { id: Date.now().toString(), name: newRuleName, cost: newRuleCost }];
        newMechanics[existingIndex] = { ...newMechanics[existingIndex], rules: updatedRules };
        
        await apiFetch('/api/rules', {
          method: 'POST',
          body: JSON.stringify({
            key: 'system_mechanics',
            type: 'json',
            value: newMechanics,
            description: mechanicsRule.description
          })
        });
        setNewRuleName('');
        setNewRuleCost(0);
        mutate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRuleFromMechanic = async (mechanicId: string, ruleId: string) => {
    try {
      let newMechanics = [...mechanics];
      const existingIndex = newMechanics.findIndex(m => m.id === mechanicId);
      
      if (existingIndex >= 0) {
        const updatedRules = newMechanics[existingIndex].rules.filter((r: any) => r.id !== ruleId);
        newMechanics[existingIndex] = { ...newMechanics[existingIndex], rules: updatedRules };
        
        await apiFetch('/api/rules', {
          method: 'POST',
          body: JSON.stringify({
            key: 'system_mechanics',
            type: 'json',
            value: newMechanics,
            description: mechanicsRule.description
          })
        });
        mutate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const availableIcons = [
    { name: 'HandFist', value: 'Hand', icon: Hand },
    { name: 'Shield', value: 'Shield', icon: Shield },
    { name: 'Heart', value: 'Heart', icon: Heart },
    { name: 'Activity', value: 'Activity', icon: Activity },
    { name: 'Alert', value: 'AlertTriangle', icon: AlertTriangle },
    { name: 'Clock', value: 'Clock', icon: Clock },
    { name: 'Target', value: 'Target', icon: Target },
    { name: 'Area', value: 'Maximize', icon: Maximize },
    { name: 'Bonus', value: 'TrendingUp', icon: TrendingUp },
  ];
`;

content = content.replace(
  "// Parse stages from rules",
  mechanicStateCode + "\n  // Parse stages from rules"
);

fs.writeFileSync('src/views/RulesAdmin.tsx', content);
