const fs = require('fs');

let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// Insert tab trigger
content = content.replace(
    '<TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>',
    '<TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>\n            <TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Mecánicas y Costes (CE)</TabsTrigger>'
);

const mechanicsTabContent = `
        <TabsContent value="mechanics" className="m-0 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sidebar Categorías */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Categorías de Costes (CE)</h3>
                <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                  setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, rules: [] });
                  setIsMechanicDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Nueva
                </Button>
              </div>
              
              <div className="flex flex-col gap-2">
                {mechanics.map((m: any) => {
                  const Icon = availableIcons.find(i => i.value === m.icon)?.icon || Hand;
                  return (
                    <div 
                      key={m.id}
                      onClick={() => setSelectedMechanicId(m.id)}
                      className={\`p-4 rounded-lg border transition-all cursor-pointer \${selectedMechanicId === m.id ? 'bg-black/40 border-primary/50' : 'bg-card border-border hover:border-primary/30 hover:bg-black/20'}\`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-black/40 rounded-md border border-border/50">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold">{m.name}</h4>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1.5">
                            <span>{(m.rules || []).length} reglas</span>
                            <span>&bull;</span>
                            <span className="capitalize">{m.logicalType}</span>
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {m.scope?.techniques && <span className="text-[10px] text-cyan-400">Técnicas</span>}
                            {m.scope?.objects && <span className="text-[10px] text-cyan-400">Objetos</span>}
                            {m.scope?.actions && <span className="text-[10px] text-cyan-400">Acciones normales</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setMechanicForm(m); setIsMechanicDialogOpen(true); }} className="p-1 text-muted-foreground hover:text-foreground">
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteMechanic(m.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {selectedMechanic ? (
                <>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-black/40 rounded-md border border-border/50">
                        {(() => {
                          const Icon = availableIcons.find(i => i.value === selectedMechanic.icon)?.icon || Hand;
                          return <Icon className="w-6 h-6 text-muted-foreground" />;
                        })()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold">{selectedMechanic.name}</h2>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black/50 border border-border/50 capitalize">{selectedMechanic.logicalType}</span>
                          <div className="flex gap-1.5">
                            {selectedMechanic.scope?.techniques && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Técnicas</span>}
                            {selectedMechanic.scope?.objects && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Objetos</span>}
                            {selectedMechanic.scope?.actions && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Acciones normales</span>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{selectedMechanic.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-card">
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Añadir nueva regla a {selectedMechanic.name}</h3>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Nombre de la regla (ej: 3D8, Muy Rápido, Cegado)</Label>
                        <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: 3D8" />
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Coste CE</Label>
                        <Input type="number" value={newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />
                      </div>
                      <Button onClick={handleAddRuleToMechanic} className="w-24 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"><Plus className="w-4 h-4 mr-1" /> Añadir</Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-black/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground">REGLA / OPCIÓN</TableHead>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground w-32 text-center">COSTE (CE)</TableHead>
                          <TableHead className="text-xs font-bold tracking-wider text-muted-foreground w-24 text-right">ACCIONES</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedMechanic.rules || []).map((rule: any) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={\`text-xs px-2 py-1 rounded-md font-bold \${rule.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : rule.cost < 0 ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'}\`}>
                                {rule.cost > 0 ? '+' : ''}{rule.cost} CE
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <button onClick={() => handleDeleteRuleFromMechanic(selectedMechanic.id, rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!selectedMechanic.rules || selectedMechanic.rules.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                              No hay reglas definidas para esta categoría.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-black/20 text-center p-8">
                  <Settings2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Selecciona una categoría</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Selecciona una categoría del panel izquierdo o crea una nueva para configurar sus reglas y costes mecánicos.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
`;

content = content.replace(
    '</Tabs>',
    mechanicsTabContent + '\n      </Tabs>'
);

// We need to add the Dialog for creating/editing a Category
const dialogCode = `
      {/* MECHANIC CATEGORY DIALOG */}
      <Dialog open={isMechanicDialogOpen} onOpenChange={setIsMechanicDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              {mechanicForm.id ? "Editar Categoría de Regla" : "Nueva Categoría de Regla"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="grid gap-2">
              <Label>Nombre de la Categoría</Label>
              <Input value={mechanicForm.name} onChange={e => setMechanicForm({...mechanicForm, name: e.target.value})} placeholder="Ej: Daño" />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={mechanicForm.description} 
                onChange={e => setMechanicForm({...mechanicForm, description: e.target.value})} 
                placeholder="Impacto ofensivo de la técnica..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo Lógico</Label>
                <Select value={mechanicForm.logicalType} onValueChange={v => setMechanicForm({...mechanicForm, logicalType: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offensive">Ofensiva (Ataque / Daño)</SelectItem>
                    <SelectItem value="defensive">Defensiva (Barreras / Evasión)</SelectItem>
                    <SelectItem value="support">Soporte (Curación / Bonos)</SelectItem>
                    <SelectItem value="control">Control (Estados Alterados)</SelectItem>
                    <SelectItem value="limitation">Limitación (Desventajas)</SelectItem>
                    <SelectItem value="utility">Utilidad (Alcance / Duración)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Icono</Label>
                <Select value={mechanicForm.icon} onValueChange={v => setMechanicForm({...mechanicForm, icon: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIcons.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.icon className="w-4 h-4" />
                          <span>{icon.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-cyan-400 mb-3 block">Ámbito de Aplicación (¿A qué elementos del sistema aplica?)</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Técnicas</span>
                  <input type="checkbox" checked={mechanicForm.scope?.techniques || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, techniques: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Objetos</span>
                  <input type="checkbox" checked={mechanicForm.scope?.objects || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, objects: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
                <label className="flex items-center gap-2 border border-border bg-card px-3 py-2 rounded-md flex-1 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="text-sm flex-1 font-medium">Acciones normales</span>
                  <input type="checkbox" checked={mechanicForm.scope?.actions || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, actions: e.target.checked}})} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-primary/30 focus:ring-offset-gray-900" />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted">
            <Button variant="outline" onClick={() => setIsMechanicDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMechanic}>Guardar Categoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace(
  '    </div>\n  );\n}',
  dialogCode + '\n    </div>\n  );\n}'
);

fs.writeFileSync('src/views/RulesAdmin.tsx', content);
