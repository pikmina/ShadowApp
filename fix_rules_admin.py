import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add State Hooks
state_hooks_old = """  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false); // Deprecated, but keeping to not break if used elsewhere
  const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', targeting: { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }, defaultResolution: 'none', rules: [] });
  const [newRuleName, setNewRuleName] = useState('');"""

state_hooks_new = """  const [isMechanicDialogOpen, setIsMechanicDialogOpen] = useState(false); // Deprecated, but keeping to not break if used elsewhere
  const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', targeting: { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }, defaultResolution: 'none', rules: [] });
  
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  
  const [newRuleName, setNewRuleName] = useState('');"""

content = content.replace(state_hooks_old, state_hooks_new)

# 2. Update handlers
handlers_old = """  const handleAddRuleToForm = () => {
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

handlers_new = """  const handleSaveRuleToForm = () => {
    if (!newRuleName.trim()) return;
    const newRule = {
      id: editingRuleId || Date.now().toString(),
      name: newRuleName,
      cost: newRuleCost,
      mechDesc: newRuleMechDesc,
      ruleType: newRuleType,
      ...(newRuleType === 'effect' ? { effect: newRuleEffect } : {}),
    };
    
    const currentRules = mechanicForm.rules || [];
    const allRules = editingRuleId 
      ? currentRules.map((r: any) => r.id === editingRuleId ? newRule : r)
      : [...currentRules, newRule];
      
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
    closeRuleDialog();
  };

  const openNewRuleDialog = () => {
    setEditingRuleId(null);
    setNewRuleName('');
    setNewRuleCost(0);
    setNewRuleMechDesc('');
    setNewRuleType('effect');
    setNewRuleEffect(createEffectDefinition('damage'));
    setIsRuleDialogOpen(true);
  };

  const handleEditRuleInForm = (rule: any) => {
    setEditingRuleId(rule.id);
    setNewRuleName(rule.name || '');
    setNewRuleCost(rule.cost || 0);
    setNewRuleMechDesc(rule.mechDesc || '');
    setNewRuleType(rule.ruleType || 'effect');
    setNewRuleEffect(rule.effect || createEffectDefinition('damage'));
    setIsRuleDialogOpen(true);
  };

  const closeRuleDialog = () => {
    setIsRuleDialogOpen(false);
    setTimeout(() => {
      setEditingRuleId(null);
      setNewRuleName('');
      setNewRuleCost(0);
      setNewRuleMechDesc('');
      setNewRuleType('effect');
      setNewRuleEffect(createEffectDefinition('damage'));
    }, 200);
  };"""

content = content.replace(handlers_old, handlers_new)

# 3. Form inline replace
form_old = """                <div className="space-y-4">
                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <div><h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Añadir opción mecánica a {mechanicForm.name || 'la categoría'}</h3><p className="text-xs text-muted-foreground mt-1">Define una vez el comportamiento y su Coste de Estamina. Catálogo y Técnicas solo seleccionarán esta opción.</p></div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Nombre</Label><Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: Daño 2D8" /></div>
                      <div className="space-y-2"><Label>Clase</Label><Select value={newRuleType} onValueChange={value => setNewRuleType(value as 'effect' | 'cost_modifier')}><SelectTrigger><SelectValue>{newRuleType === 'effect' ? "Mecánica ejecutable" : "Ajuste de Coste de Estamina"}</SelectValue></SelectTrigger><SelectContent><SelectItem value="effect">Mecánica ejecutable</SelectItem><SelectItem value="cost_modifier">Ajuste de Coste de Estamina</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Coste de Estamina (CE)</Label><Input type="number" disabled={newRuleType === 'effect' && newRuleEffect.timing === 'passive'} value={newRuleType === 'effect' && newRuleEffect.timing === 'passive' ? 0 : newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />{newRuleType === 'effect' && newRuleEffect.timing === 'passive' && <p className="text-xs text-muted-foreground">Las mecánicas pasivas existen permanentemente y no consumen Estamina.</p>}</div>
                    </div>
                    <div className="space-y-2"><Label>Descripción</Label><Input value={newRuleMechDesc} onChange={e => setNewRuleMechDesc(e.target.value)} placeholder="Cuándo o por qué se utiliza" /></div>
                    {newRuleType === 'effect' && <MechanicalEffectDefinitionEditor value={newRuleEffect} onChange={effect => { setNewRuleEffect(effect); if (effect.timing === 'passive') setNewRuleCost(0); }} />}
                    <div className="flex justify-end"><Button onClick={handleAddRuleToForm} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"><Plus className="w-4 h-4 mr-1" /> Añadir opción</Button></div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden bg-card">"""

form_new = """                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Opciones Mecánicas</h3>
                      <p className="text-xs text-muted-foreground mt-1">Define los comportamientos y costes. Catálogo y Técnicas seleccionarán estas opciones.</p>
                    </div>
                    <Button onClick={openNewRuleDialog} size="sm" className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                      <Plus className="w-4 h-4 mr-1" /> Añadir opción
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden bg-card">"""

content = content.replace(form_old, form_new)

# 4. Table Replace (add edit button)
table_row_old = """                            <TableCell className="text-right">
                              <button onClick={() => handleRemoveRuleFromForm(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>"""

table_row_new = """                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleEditRuleInForm(rule)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Editar opción">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleRemoveRuleFromForm(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar opción">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>"""

content = content.replace(table_row_old, table_row_new)

# 5. Add Dialog to end of file, just before the closing tag of TabsContent
dialog_markup = """
          <Dialog open={isRuleDialogOpen} onOpenChange={(open) => !open && closeRuleDialog()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
              <DialogHeader>
                <DialogTitle>{editingRuleId ? 'Editar opción mecánica' : 'Añadir opción mecánica'}</DialogTitle>
                <DialogDescription>Configura el comportamiento y el Coste de Estamina de esta opción.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: Daño 2D8" />
                  </div>
                  <div className="space-y-2">
                    <Label>Clase</Label>
                    <Select value={newRuleType} onValueChange={value => setNewRuleType(value as 'effect' | 'cost_modifier')}>
                      <SelectTrigger><SelectValue>{newRuleType === 'effect' ? "Mecánica ejecutable" : "Ajuste de Coste de Estamina"}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="effect">Mecánica ejecutable</SelectItem>
                        <SelectItem value="cost_modifier">Ajuste de Coste de Estamina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={newRuleMechDesc} onChange={e => setNewRuleMechDesc(e.target.value)} placeholder="Cuándo o por qué se utiliza" />
                  </div>
                  <div className="space-y-2">
                    <Label>Coste de Estamina (CE)</Label>
                    <Input type="number" disabled={newRuleType === 'effect' && newRuleEffect.timing === 'passive'} value={newRuleType === 'effect' && newRuleEffect.timing === 'passive' ? 0 : newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />
                    {newRuleType === 'effect' && newRuleEffect.timing === 'passive' && <p className="text-[10px] text-muted-foreground mt-1">Las mecánicas pasivas existen permanentemente y no consumen Estamina.</p>}
                  </div>
                </div>
                {newRuleType === 'effect' && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <MechanicalEffectDefinitionEditor value={newRuleEffect} onChange={effect => { setNewRuleEffect(effect); if (effect.timing === 'passive') setNewRuleCost(0); }} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRuleDialog}>Cancelar</Button>
                <Button onClick={handleSaveRuleToForm}>{editingRuleId ? 'Guardar cambios' : 'Añadir opción'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
"""

content = content.replace("          )}\n        </TabsContent>", dialog_markup + "\n          )}\n        </TabsContent>")

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
