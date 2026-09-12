import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the TabsContent for mechanics
start_mechanics = content.find('<TabsContent value="mechanics"')
end_mechanics = content.find('</TabsContent>', start_mechanics) + len('</TabsContent>')

# Find the Dialog for mechanics
start_dialog = content.find('<Dialog open={isMechanicDialogOpen}')
end_dialog = content.find('</Dialog>', start_dialog) + len('</Dialog>')

# We will remove the Dialog
if start_dialog != -1:
    content = content[:start_dialog] + content[end_dialog:]

# Now we need to replace the TabsContent value="mechanics"
new_mechanics = """<TabsContent value="mechanics" className="m-0 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeMechanicView === 'list' ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Configuración Global (Costes base por ejecución)</h2>
                    <p className="text-sm text-muted-foreground">CE significa Coste de Estamina. Se cobra al ejecutar; las mecánicas pasivas cuestan 0.</p>
                  </div>
                  <Button onClick={saveStaminaCosts}>Guardar costes base</Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                  <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key].map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = staminaCosts[key].map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Categorías Mecánicas</h3>
                  <Button size="sm" onClick={() => {
                    setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', targeting: { allowedEntityKinds: ['character', 'npc'], relationship: 'self', selection: 'direct', minTargets: 1, maxTargets: 1 }, defaultResolution: 'none', rules: [] });
                    setActiveMechanicView('edit');
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mechanics.map((m: any) => {
                    const Icon = availableIcons.find(i => i.value === m.icon)?.icon || availableIcons[0].icon;
                    return (
                      <div 
                        key={m.id}
                        onClick={() => { setMechanicForm(m); setActiveMechanicView('edit'); }}
                        className="p-4 rounded-lg border bg-card border-border hover:border-primary/50 hover:bg-black/20 transition-all cursor-pointer flex flex-col gap-3"
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
                              <span className="capitalize">{{"offensive": "Ofensiva", "defensive": "Defensiva", "support": "Soporte", "control": "Control", "limitation": "Limitación", "utility": "Utilidad"}[m.logicalType as string] || m.logicalType}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteMechanic(m.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {m.scope?.techniques && <span className="text-[10px] text-cyan-400">Técnicas</span>}
                          {m.scope?.objects && <span className="text-[10px] text-cyan-400">Objetos</span>}
                          {m.scope?.actions && <span className="text-[10px] text-cyan-400">Acciones normales</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setActiveMechanicView('list')}><ArrowLeft className="w-4 h-4 mr-2" /> Volver al listado</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActiveMechanicView('list')}>Cancelar</Button>
                  <Button onClick={handleSaveMechanic}>Guardar Categoría</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">{mechanicForm.id ? "Editar Categoría" : "Nueva Categoría"}</h3>
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
                            <SelectValue>{{"offensive": "Ofensiva (Ataque / Daño)", "defensive": "Defensiva (Barreras / Evasión)", "support": "Soporte (Curación / Bonos)", "control": "Control (Estados Alterados)", "limitation": "Limitación (Desventajas)", "utility": "Utilidad (Alcance / Duración)"}[mechanicForm.logicalType as string] || mechanicForm.logicalType}</SelectValue>
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
                            <SelectValue>{availableIcons.find(i => i.value === mechanicForm.icon)?.name || "Seleccionar"}</SelectValue>
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
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-card space-y-4">
                    <Label className="text-primary block">Destinatarios de la Categoría Mecánica</Label>
                    <p className="text-xs text-muted-foreground mb-4">Es la regla efectiva para todas sus opciones. No volverá a capturarse en Catálogo o Técnicas.</p>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'self' ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'self'} onChange={() => setCategoryRelationship('self')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'self' ? 'border-primary' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'self' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className="font-bold text-sm text-primary flex items-center gap-1">👤 Portador Equipado (Usuario)</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Armaduras, Trajes, Buffs y Reducción de Daño.</span>
                      </label>
                      
                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'enemy' ? 'bg-destructive/10 border-destructive' : 'bg-card border-border hover:border-destructive/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'enemy'} onChange={() => setCategoryRelationship('enemy')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'enemy' ? 'border-destructive' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'enemy' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                          </div>
                          <span className="font-bold text-sm text-destructive flex items-center gap-1">🎯 Objetivo Impactado / Rival (Enemigo)</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Armas, Proyectiles, Venenos y Daño.</span>
                      </label>

                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'ally' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-card border-border hover:border-emerald-500/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'ally'} onChange={() => setCategoryRelationship('ally')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'ally' ? 'border-emerald-500' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'ally' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          </div>
                          <span className="font-bold text-sm text-emerald-500 flex items-center gap-1">🤝 Compañero / Aliado</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para Curación externa, Buffs de grupo y Apoyo.</span>
                      </label>

                      <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'any' ? 'bg-amber-500/10 border-amber-500' : 'bg-card border-border hover:border-amber-500/50'}`}>
                        <div className="flex items-center gap-2">
                          <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'any'} onChange={() => setCategoryRelationship('any')} className="sr-only" />
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'any' ? 'border-amber-500' : 'border-muted-foreground'}`}>
                            {mechanicForm.defaultTarget === 'any' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                          </div>
                          <span className="font-bold text-sm text-amber-500 flex items-center gap-1">🌐 Cualquier Objetivo</span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">Recomendado para objetos consumibles que puedes usar en ti mismo o en otro.</span>
                      </label>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border">
                      <Label className="text-primary mb-3 block">Resolución de la Categoría</Label>
                      <p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría.</p>
                      
                      <Select value={mechanicForm.defaultResolution || 'none'} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>
                        <SelectTrigger className="bg-card">
                          <SelectValue>{{"none": "Sin Tirada (Auto Impacto / Defecto)", "eva": "vs Evasión (EVA)", "cor": "vs Coraje (COR)", "rd": "vs Dificultad (RD)", "opposed": "Tirada Enfrentada"}[mechanicForm.defaultResolution as string] || "Sin Tirada (Auto Impacto / Defecto)"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin Tirada (Auto Impacto / Defecto)</SelectItem>
                          <SelectItem value="eva">vs Evasión (EVA)</SelectItem>
                          <SelectItem value="cor">vs Coraje (COR)</SelectItem>
                          <SelectItem value="rd">vs Dificultad (RD)</SelectItem>
                          <SelectItem value="opposed">Tirada Enfrentada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border">
                      <Label className="text-primary mb-3 block">Alcance (Dónde se puede añadir)</Label>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.techniques ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, techniques: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Técnicas
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.objects ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, objects: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Objetos (Catálogo)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                          <input type="checkbox" checked={mechanicForm.scope?.actions ?? false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, actions: e.target.checked}})} className="rounded border-input bg-transparent" />
                          Acciones Normales
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
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
                        {(mechanicForm.rules || []).map((rule: any) => (
                          <TableRow key={rule.id}>
                            <TableCell><div className="font-medium text-sm">{rule.name}</div>{rule.effect && <div className="text-xs text-primary mt-0.5">{describeEffect(rule.effect, mechanicForm.targeting ?? mechanicForm.defaultTargeting)}</div>}{rule.mechDesc && <div className="text-xs text-muted-foreground mt-0.5">{rule.mechDesc}</div>}{!rule.ruleType && <div className="text-xs text-amber-400 mt-0.5">Regla anterior: conviértela explícitamente para que ejecute una mecánica.</div>}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs px-2 py-1 rounded-md font-bold ${rule.cost > 0 ? 'bg-emerald-900/30 text-emerald-400' : rule.cost < 0 ? 'bg-red-900/30 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                                {rule.cost > 0 ? '+' : ''}{rule.cost} CE
                                <span className="block text-[9px] font-normal">Estamina</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <button onClick={() => handleRemoveRuleFromForm(rule.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!mechanicForm.rules || mechanicForm.rules.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                              No hay reglas definidas para esta categoría.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>"""

content = content[:start_mechanics] + new_mechanics + content[end_mechanics:]

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
