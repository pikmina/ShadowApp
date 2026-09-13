import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the exact block and rearrange
dialog_block = """          <Dialog open={isRuleDialogOpen} onOpenChange={(open) => !open && closeRuleDialog()}>
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
          </Dialog>"""

target = f"{dialog_block}\n          )}}\n        </TabsContent>"
replacement = f"          )}}\n{dialog_block}\n        </TabsContent>"

content = content.replace(target, replacement)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
