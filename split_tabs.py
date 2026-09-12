import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update TabsList
content = content.replace(
    '<TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Mecánicas y Estamina (CE)</TabsTrigger>',
    '<TabsTrigger value="mechanics" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Categorías Mecánicas</TabsTrigger>\n            <TabsTrigger value="stamina" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Costes de Estamina</TabsTrigger>'
)

# 2. Extract the stamina section from mechanics
stamina_block = """<div className="rounded-lg border border-border bg-card p-5 space-y-4">
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
              </div>"""

content = content.replace(stamina_block, "")

# 3. Add the stamina tab content
stamina_tab = f"""
        <TabsContent value="stamina" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Costes Base de Estamina (CE)</CardTitle>
              <CardDescription>
                Define los costes por defecto para ejecutar mecánicas básicas y de progresión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stamina_block}
            </CardContent>
          </Card>
        </TabsContent>
"""

# Find where to insert the new tab (before <TabsContent value="mechanics")
mechanics_idx = content.find('<TabsContent value="mechanics"')
if mechanics_idx != -1:
    content = content[:mechanics_idx] + stamina_tab + content[mechanics_idx:]

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

