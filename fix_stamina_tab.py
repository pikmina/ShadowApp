import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to remove the nested Card styling or just replace stamina_tab.
stamina_tab_start = content.find('<TabsContent value="stamina"')
stamina_tab_end = content.find('</TabsContent>', stamina_tab_start) + len('</TabsContent>')

if stamina_tab_start != -1:
    new_stamina_tab = """<TabsContent value="stamina" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Costes Base de Estamina (CE)</CardTitle>
                <CardDescription>
                  Define los costes por defecto para ejecutar mecánicas básicas y de progresión. Se cobra al ejecutar; las mecánicas pasivas cuestan 0.
                </CardDescription>
              </div>
              <Button onClick={saveStaminaCosts}>Guardar costes base</Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 border-t border-border/50">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key].map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = staminaCosts[key].map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>"""

    content = content[:stamina_tab_start] + new_stamina_tab + content[stamina_tab_end:]

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
