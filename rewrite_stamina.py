import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_defaults = """const defaultStaminaCosts = {
  baseAction: 1,
  objectUse: 1,
  minTechniqueCost: 1,
  techniqueByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
  skillByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
};"""

new_defaults = """const defaultStaminaCosts = {
  baseAction: 1,
  objectUse: 1,
  minTechniqueCost: 1,
  techniqueByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
  skillByLevel: [1, 2, 3, 4, 5].map(level => ({ level, cost: level })),
  supportDifficulty: [
    { maxCost: 3, name: "Normal", rd: 12 },
    { maxCost: 6, name: "Complicado", rd: 16 },
    { maxCost: 10, name: "Difícil", rd: 20 },
    { maxCost: 99, name: "Muy Difícil", rd: 24 }
  ]
};"""

content = content.replace(old_defaults, new_defaults)

old_state = """  const [staminaCosts, setStaminaCosts] = useState<any>(defaultStaminaCosts);
  const [staminaCostsDirty, setStaminaCostsDirty] = useState(false);"""

new_state = """  const [staminaCosts, setStaminaCosts] = useState<any>(defaultStaminaCosts);
  const [staminaCostsDirty, setStaminaCostsDirty] = useState(false);
  const [isEditingStamina, setIsEditingStamina] = useState(false);"""

content = content.replace(old_state, new_state)

old_ui = """            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Costes Base de Estamina (CE)</CardTitle>
                <CardDescription>
                  Define los costes por defecto para ejecutar mecánicas básicas y de progresión. Se cobra al ejecutar; las mecánicas pasivas cuestan 0.
                </CardDescription>
              </div>
              <Button onClick={saveStaminaCosts}>Guardar costes base</Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 border-t border-border/50">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Mínimo por Técnica</Label><Input type="number" min={1} value={staminaCosts.minTechniqueCost ?? 1} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, minTechniqueCost: Number(e.target.value)}); }} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key].map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = staminaCosts[key].map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
              </div>
            </CardContent>"""

new_ui = """            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex-1">
                <CardTitle>Costes Base de Estamina (CE)</CardTitle>
                <CardDescription>
                  Define los costes por defecto para ejecutar mecánicas básicas y de progresión. Se cobra al ejecutar; las mecánicas pasivas cuestan 0.
                </CardDescription>
              </div>
              {isEditingStamina ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setStaminaCosts(staminaRule?.value || defaultStaminaCosts);
                    setStaminaCostsDirty(false);
                    setIsEditingStamina(false);
                  }}>Cancelar</Button>
                  <Button onClick={() => { saveStaminaCosts(); setIsEditingStamina(false); }}>Guardar costes base</Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditingStamina(true)}><Edit2 className="w-4 h-4 mr-2"/> Editar Costes</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-8 pt-4 border-t border-border/50">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label>Acción o golpe básico</Label><Input disabled={!isEditingStamina} type="number" min={0} value={staminaCosts.baseAction} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, baseAction: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Usar un objeto</Label><Input disabled={!isEditingStamina} type="number" min={0} value={staminaCosts.objectUse} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, objectUse: Number(e.target.value)}); }} /></div>
                <div className="space-y-2"><Label>Mínimo por Técnica</Label><Input disabled={!isEditingStamina} type="number" min={1} value={staminaCosts.minTechniqueCost ?? 1} onChange={e => { setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, minTechniqueCost: Number(e.target.value)}); }} /></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[['Técnica por nivel', 'techniqueByLevel'], ['Habilidad activa por nivel', 'skillByLevel']].map(([label, key]) => <div key={key} className="space-y-2"><Label>{label}</Label><div className="grid grid-cols-5 gap-2">{staminaCosts[key].map((entry: any, index: number) => <div key={entry.level}><span className="block text-center text-[10px] text-muted-foreground">N{entry.level}</span><Input disabled={!isEditingStamina} aria-label={`${label} nivel ${entry.level}`} type="number" min={0} value={entry.cost} onChange={e => { const list = staminaCosts[key].map((item: any, itemIndex: number) => itemIndex === index ? {...item, cost: Number(e.target.value)} : item); setStaminaCostsDirty(true); setStaminaCosts({...staminaCosts, [key]: list}); }} /></div>)}</div></div>)}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div>
                  <h4 className="text-sm font-semibold">Dificultad de Técnicas Defensivas/Soporte</h4>
                  <p className="text-sm text-muted-foreground">Tirada necesaria en función del coste final de estamina de la técnica.</p>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Coste Estamina Máximo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>RD</TableHead>
                        {isEditingStamina && <TableHead className="w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty).map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{"<="}</span>
                              <Input 
                                disabled={!isEditingStamina}
                                type="number" 
                                value={item.maxCost} 
                                onChange={(e) => {
                                  const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                                  list[idx] = { ...list[idx], maxCost: Number(e.target.value) };
                                  setStaminaCostsDirty(true);
                                  setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                                }} 
                                className="w-20"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              disabled={!isEditingStamina}
                              value={item.name} 
                              onChange={(e) => {
                                const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                                list[idx] = { ...list[idx], name: e.target.value };
                                setStaminaCostsDirty(true);
                                setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              disabled={!isEditingStamina}
                              type="number" 
                              value={item.rd} 
                              onChange={(e) => {
                                const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                                list[idx] = { ...list[idx], rd: Number(e.target.value) };
                                setStaminaCostsDirty(true);
                                setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                              }} 
                            />
                          </TableCell>
                          {isEditingStamina && (
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                onClick={() => {
                                  const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                                  list.splice(idx, 1);
                                  setStaminaCostsDirty(true);
                                  setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {isEditingStamina && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                      list.push({ maxCost: 10, name: "Nueva RD", rd: 15 });
                      setStaminaCostsDirty(true);
                      setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Añadir Rango
                  </Button>
                )}
              </div>
            </CardContent>"""

if old_ui in content:
    content = content.replace(old_ui, new_ui)
    print("UI replaced successfully")
else:
    print("Failed to find UI block")

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

