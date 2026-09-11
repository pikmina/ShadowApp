import re

with open('src/views/RulesAdmin.tsx', 'r') as f:
    content = f.read()

replacement = """              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'self' ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'self'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'self'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'self' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'self' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-bold text-sm text-primary flex items-center gap-1">👤 Portador Equipado (Usuario)</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armaduras, Trajes, Buffs y Reducción de Daño.</span>
                </label>
                
                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'enemy' ? 'bg-destructive/10 border-destructive' : 'bg-card border-border hover:border-destructive/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'enemy'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'enemy'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'enemy' ? 'border-destructive' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'enemy' && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </div>
                    <span className="font-bold text-sm text-destructive flex items-center gap-1">🎯 Objetivo Impactado / Rival (Enemigo)</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Armas, Proyectiles, Venenos y Daño.</span>
                </label>

                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'ally' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-card border-border hover:border-emerald-500/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'ally'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'ally'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'ally' ? 'border-emerald-500' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'ally' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    <span className="font-bold text-sm text-emerald-500 flex items-center gap-1">🤝 Compañero / Aliado</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Curación externa, Buffs de grupo y Apoyo.</span>
                </label>

                <label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors ${mechanicForm.defaultTarget === 'any' ? 'bg-amber-500/10 border-amber-500' : 'bg-card border-border hover:border-amber-500/50'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="target" checked={mechanicForm.defaultTarget === 'any'} onChange={() => setMechanicForm({...mechanicForm, defaultTarget: 'any'})} className="sr-only" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${mechanicForm.defaultTarget === 'any' ? 'border-amber-500' : 'border-muted-foreground'}`}>
                      {mechanicForm.defaultTarget === 'any' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </div>
                    <span className="font-bold text-sm text-amber-500 flex items-center gap-1">🌐 Cualquier Objetivo (Cualquiera)</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-6">Recomendado para Terrenos, Áreas o Efectos que no discriminan bando.</span>
                </label>
              </div>"""

content = re.sub(
    r'<div className="grid grid-cols-1 md:grid-cols-2 gap-4">.*?<label className={`flex flex-col gap-2 p-3 rounded-md border cursor-pointer transition-colors \$\{mechanicForm\.defaultTarget === \'enemy\'[^\n]*\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?<\/label>\n              <\/div>',
    replacement,
    content,
    flags=re.DOTALL
)

with open('src/views/RulesAdmin.tsx', 'w') as f:
    f.write(content)

