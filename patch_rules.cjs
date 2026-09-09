const fs = require('fs');

let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// 1. Update mechanicForm state to include defaultTarget and defaultResolution
content = content.replace(
  "const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, rules: [] });",
  "const [mechanicForm, setMechanicForm] = useState<any>({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', defaultResolution: 'none', rules: [] });"
);

// 2. Add newRuleMechDesc state
content = content.replace(
  "const [newRuleCost, setNewRuleCost] = useState(0);",
  "const [newRuleCost, setNewRuleCost] = useState(0);\n  const [newRuleMechDesc, setNewRuleMechDesc] = useState('');"
);

// 3. Update the reset in the 'Nueva' button
content = content.replace(
  "setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, rules: [] });",
  "setMechanicForm({ id: '', name: '', description: '', logicalType: 'offensive', icon: 'Hand', scope: { techniques: true, objects: true, actions: false }, defaultTarget: 'self', defaultResolution: 'none', rules: [] });"
);

// 4. Update handleAddRuleToMechanic to save newRuleMechDesc
content = content.replace(
  "const updatedRules = [...(newMechanics[existingIndex].rules || []), { id: Date.now().toString(), name: newRuleName, cost: newRuleCost }];",
  "const updatedRules = [...(newMechanics[existingIndex].rules || []), { id: Date.now().toString(), name: newRuleName, cost: newRuleCost, mechDesc: newRuleMechDesc }];"
);
content = content.replace(
  "setNewRuleCost(0);",
  "setNewRuleCost(0);\n        setNewRuleMechDesc('');"
);

// 5. Update UI for the Rules list and the add form
const newRuleForm = `
                  <div className="p-6 rounded-lg border border-border bg-card">
                    <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Añadir nueva regla a {selectedMechanic.name}</h3>
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label>Nombre de la regla (ej: 3D8, Muy Rápido)</Label>
                        <Input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Ej: 3D8" />
                      </div>
                      <div className="col-span-12 md:col-span-5 space-y-2">
                        <Label>Efecto Mecánico (Opcional)</Label>
                        <Input value={newRuleMechDesc} onChange={e => setNewRuleMechDesc(e.target.value)} placeholder="Ej: Reduce la Salud en 3D8." />
                      </div>
                      <div className="col-span-8 md:col-span-2 space-y-2">
                        <Label>Coste CE</Label>
                        <Input type="number" value={newRuleCost} onChange={e => setNewRuleCost(Number(e.target.value))} />
                      </div>
                      <div className="col-span-4 md:col-span-12 flex justify-end mt-2">
                        <Button onClick={handleAddRuleToMechanic} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"><Plus className="w-4 h-4 mr-1" /> Añadir</Button>
                      </div>
                    </div>
                  </div>
`;

content = content.replace(
  /<div className="p-6 rounded-lg border border-border bg-card">\s*<h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-4">Añadir nueva regla a \{selectedMechanic\.name\}<\/h3>\s*<div className="flex items-end gap-3">\s*<div className="flex-1 space-y-2">\s*<Label>Nombre de la regla \(ej: 3D8, Muy Rápido, Cegado\)<\/Label>\s*<Input value=\{newRuleName\} onChange=\{e => setNewRuleName\(e\.target\.value\)\} placeholder="Ej: 3D8" \/>\s*<\/div>\s*<div className="w-32 space-y-2">\s*<Label>Coste CE<\/Label>\s*<Input type="number" value=\{newRuleCost\} onChange=\{e => setNewRuleCost\(Number\(e\.target\.value\)\)\} \/>\s*<\/div>\s*<Button onClick=\{handleAddRuleToMechanic\} className="w-24 bg-primary\/20 hover:bg-primary\/30 text-primary border border-primary\/30"><Plus className="w-4 h-4 mr-1" \/> Añadir<\/Button>\s*<\/div>\s*<\/div>/g,
  newRuleForm
);


// 6. Update the TableCell to show the mechDesc
content = content.replace(
  '<TableCell className="font-medium text-sm">{rule.name}</TableCell>',
  '<TableCell><div className="font-medium text-sm">{rule.name}</div>{rule.mechDesc && <div className="text-xs text-muted-foreground mt-0.5">{rule.mechDesc}</div>}</TableCell>'
);


// 7. Add target/resolution badges to the mechanic overview
const newOverviewBadges = `
                          <div className="flex gap-1.5 flex-wrap">
                            {selectedMechanic.scope?.techniques && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Técnicas</span>}
                            {selectedMechanic.scope?.objects && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Objetos</span>}
                            {selectedMechanic.scope?.actions && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Acciones normales</span>}
                            
                            {selectedMechanic.defaultTarget === 'enemy' && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">🎯 Objetivo / Rival</span>}
                            {selectedMechanic.defaultTarget === 'self' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">👤 Portador / Usuario</span>}
                            
                            {selectedMechanic.defaultResolution && selectedMechanic.defaultResolution !== 'none' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-900/50 flex items-center gap-1">
                                🎲 {
                                  selectedMechanic.defaultResolution === 'eva' ? 'vs Evasión (EVA)' :
                                  selectedMechanic.defaultResolution === 'cor' ? 'vs Coraje (COR)' :
                                  selectedMechanic.defaultResolution === 'rd' ? 'vs Dificultad (RD)' :
                                  selectedMechanic.defaultResolution === 'opposed' ? 'Tirada Enfrentada' : ''
                                }
                              </span>
                            )}
                          </div>
`;
content = content.replace(
  /<div className="flex gap-1\.5">\s*\{selectedMechanic\.scope\?\.techniques && <span className="text-xs px-2 py-0\.5 rounded-full bg-cyan-900\/30 text-cyan-400 border border-cyan-900\/50">Aplica a Técnicas<\/span>\}\s*\{selectedMechanic\.scope\?\.objects && <span className="text-xs px-2 py-0\.5 rounded-full bg-cyan-900\/30 text-cyan-400 border border-cyan-900\/50">Aplica a Objetos<\/span>\}\s*\{selectedMechanic\.scope\?\.actions && <span className="text-xs px-2 py-0\.5 rounded-full bg-cyan-900\/30 text-cyan-400 border border-cyan-900\/50">Aplica a Acciones normales<\/span>\}\s*<\/div>/g,
  newOverviewBadges
);


// 8. Add target/resolution fields to the Dialog
const newDialogFields = `
            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-primary mb-3 block">Destinatario por Defecto de los Efectos Mecánicos</Label>
              <p className="text-xs text-muted-foreground mb-4">Define a quién aplicarán automáticamente los efectos de los elementos creados en esta categoría.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={\`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors \${mechanicForm.defaultTarget === 'self' ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}\`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'self'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'self'})} className="sr-only" />
                    <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${mechanicForm.defaultTarget === 'self' ? 'border-primary' : 'border-muted-foreground'}\`}>
                      {mechanicForm.defaultTarget === 'self' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm text-primary flex items-center gap-1">👤 Portador Equipado (Usuario)</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armaduras, Trajes, Buffs y Reducción de Daño.</span>
                </label>
                
                <label className={\`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors \${mechanicForm.defaultTarget === 'enemy' ? 'bg-destructive/10 border-destructive' : 'bg-card border-border hover:border-destructive/50'}\`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'enemy'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'enemy'})} className="sr-only" />
                    <div className={\`w-4 h-4 rounded-full border flex items-center justify-center \${mechanicForm.defaultTarget === 'enemy' ? 'border-destructive' : 'border-muted-foreground'}\`}>
                      {mechanicForm.defaultTarget === 'enemy' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </div>
                    <span className="font-bold text-sm text-destructive flex items-center gap-1">🎯 Objetivo Impactado / Rival</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armas, Proyectiles, Venenos y Daño.</span>
                </label>
              </div>
            </div>

            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-purple-400 mb-3 block">Tipo de Tirada / Resolución de Acción por Defecto</Label>
              <p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría.</p>
              
              <Select value={mechanicForm.defaultResolution} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Sin resolución por defecto (Uso Pasivo / Sin tirada) --</SelectItem>
                  <SelectItem value="eva">Ataque Físico / Proyectil (Contra Evasión - EVA)</SelectItem>
                  <SelectItem value="cor">Ataque Mental / Ilusión (Contra Coraje - COR)</SelectItem>
                  <SelectItem value="rd">Acción Compleja (Contra Rango de Dificultad - RD Estático)</SelectItem>
                  <SelectItem value="opposed">Tirada Enfrentada de Atributos</SelectItem>
                </SelectContent>
              </Select>
            </div>
`;

content = content.replace(
  '<div className="mt-4 border border-border rounded-lg p-4 bg-black/20">',
  newDialogFields + '\n            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">'
);

fs.writeFileSync('src/views/RulesAdmin.tsx', content);
