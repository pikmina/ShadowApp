import re

with open('src/views/RulesAdmin.tsx', 'r') as f:
    content = f.read()

# Fix translations and missing elements display for logicalType
mapping = {
    'offensive': 'Ofensiva',
    'defensive': 'Defensiva',
    'support': 'Soporte',
    'control': 'Control',
    'limitation': 'Limitación',
    'utility': 'Utilidad'
}

# Update scope rendering
scope_str = """                          <div className="flex gap-1.5 flex-wrap">
                            {selectedMechanic.scope?.techniques && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Técnicas</span>}
                            {selectedMechanic.scope?.objects && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Objetos</span>}
                            {selectedMechanic.scope?.actions && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-900/50">Aplica a Acciones normales</span>}
                            
                            {selectedMechanic.defaultTarget === 'enemy' && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">🎯 Objetivo / Rival</span>}
                            {selectedMechanic.defaultTarget === 'self' && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">👤 Portador / Usuario</span>}
                            {selectedMechanic.defaultTarget === 'ally' && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">🤝 Compañero / Aliado</span>}
                            {selectedMechanic.defaultTarget === 'any' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">🌐 Cualquier Objetivo</span>}
                            
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
                          </div>"""

content = re.sub(
    r'<div className="flex gap-1\.5 flex-wrap">.*?<\/div>',
    scope_str,
    content,
    flags=re.DOTALL,
    count=1 # replace only the main display area one
)

# Replace logical type mapping in rendering
content = content.replace(
    '<span className="text-xs px-2 py-0.5 rounded-full bg-black/50 border border-border/50 capitalize">{selectedMechanic.logicalType}</span>',
    '<span className="text-xs px-2 py-0.5 rounded-full bg-black/50 border border-border/50 capitalize">{{offensive: "Ofensiva", defensive: "Defensiva", support: "Soporte", control: "Control", limitation: "Limitación", utility: "Utilidad"}[selectedMechanic.logicalType as string] || selectedMechanic.logicalType}</span>'
)
content = content.replace(
    '<span className="capitalize">{m.logicalType}</span>',
    '<span className="capitalize">{{offensive: "Ofensiva", defensive: "Defensiva", support: "Soporte", control: "Control", limitation: "Limitación", utility: "Utilidad"}[m.logicalType as string] || m.logicalType}</span>'
)

# Add defaultResolution to form
resolution_ui = """            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-purple-400 mb-3 block">Tipo de Tirada / Resolución de Acción por Defecto</Label>
              <p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría.</p>
              
              <Select value={mechanicForm.defaultResolution || 'none'} onValueChange={v => setMechanicForm({...mechanicForm, defaultResolution: v})}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin Tirada (Auto Impacto / Defecto)</SelectItem>
                  <SelectItem value="eva">Impacto vs Evasión (EVA)</SelectItem>
                  <SelectItem value="cor">Mente/Moral vs Coraje (COR)</SelectItem>
                  <SelectItem value="rd">Prueba vs Rango de Dificultad (RD)</SelectItem>
                  <SelectItem value="opposed">Tirada Enfrentada Pura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
              <Label className="text-cyan-400 mb-3 block">Ámbito de Aplicación (¿A qué elementos del sistema aplica?)</Label>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 border p-2 rounded-md bg-card cursor-pointer hover:border-cyan-400/50">
                  <input type="checkbox" className="accent-cyan-400" checked={mechanicForm.scope?.techniques || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, techniques: e.target.checked}})} />
                  <span className="text-sm font-medium">Técnicas</span>
                </label>
                <label className="flex items-center gap-2 border p-2 rounded-md bg-card cursor-pointer hover:border-cyan-400/50">
                  <input type="checkbox" className="accent-cyan-400" checked={mechanicForm.scope?.objects || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, objects: e.target.checked}})} />
                  <span className="text-sm font-medium">Objetos</span>
                </label>
                <label className="flex items-center gap-2 border p-2 rounded-md bg-card cursor-pointer hover:border-cyan-400/50">
                  <input type="checkbox" className="accent-cyan-400" checked={mechanicForm.scope?.actions || false} onChange={e => setMechanicForm({...mechanicForm, scope: {...mechanicForm.scope, actions: e.target.checked}})} />
                  <span className="text-sm font-medium">Acciones normales</span>
                </label>
              </div>
            </div>"""

content = re.sub(
    r'<div className="mt-4 border border-border rounded-lg p-4 bg-black/20">\s*<Label className="text-purple-400 mb-3 block">Tipo de Tirada / Resolución de Acción por Defecto<\/Label>.*?<p className="text-xs text-muted-foreground mb-4">Selecciona qué tipo de tirada tendrán los artículos creados en esta categoría\.<\/p>',
    resolution_ui,
    content,
    flags=re.DOTALL
)

with open('src/views/RulesAdmin.tsx', 'w') as f:
    f.write(content)
