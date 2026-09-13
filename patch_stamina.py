import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update defaultStaminaCosts
old_defaults = """const defaultStaminaCosts = {
  baseAction: 1,
  objectUse: 1,"""

new_defaults = """const defaultStaminaCosts = {
  baseAction: 1,
  objectUse: 1,
  minTechniqueCost: 1,"""

content = content.replace(old_defaults, new_defaults)

# 2. Update UI
old_ui = """              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
              </div>"""

new_ui = """              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Mínimo por Técnica</Label><Input type="number" min={1} value={staminaCosts.minTechniqueCost ?? 1} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, minTechniqueCost: Number(e.target.value)}); }} /></div>
              </div>"""

content = content.replace(old_ui, new_ui)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
