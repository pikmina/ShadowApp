import re

with open('src/views/RulesAdmin.tsx', 'r') as f:
    content = f.read()

resolution_ui = """
            <div className="mt-4 border border-border rounded-lg p-4 bg-black/20">
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
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">"""

content = content.replace(
    '</div>\n          <DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">',
    resolution_ui
)

with open('src/views/RulesAdmin.tsx', 'w') as f:
    f.write(content)

