import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update defaults
old_defaults = """  supportDifficulty: [
    { maxCost: 3, name: "Normal", rd: 12 },
    { maxCost: 6, name: "Complicado", rd: 16 },
    { maxCost: 10, name: "Difícil", rd: 20 },
    { maxCost: 99, name: "Muy Difícil", rd: 24 }
  ]"""
new_defaults = """  supportDifficulty: [
    { maxCost: 3, difficultyId: "normal" },
    { maxCost: 6, difficultyId: "dificil" },
    { maxCost: 10, difficultyId: "muy_dificil" },
    { maxCost: 99, difficultyId: "heroico" }
  ]"""
content = content.replace(old_defaults, new_defaults)


# 2. Update the Table in UI
old_table = """                <div className="rounded-md border">
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
                )}"""

new_table = """                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Coste Estamina Máximo</TableHead>
                        <TableHead>Dificultad (RD Asignado)</TableHead>
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
                            <Select 
                              disabled={!isEditingStamina}
                              value={item.difficultyId || "normal"}
                              onValueChange={(val) => {
                                const list = [...(staminaCosts.supportDifficulty || defaultStaminaCosts.supportDifficulty)];
                                list[idx] = { ...list[idx], difficultyId: val };
                                setStaminaCostsDirty(true);
                                setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar dificultad" />
                              </SelectTrigger>
                              <SelectContent>
                                {difficulties?.normal?.map((d: any) => (
                                  <SelectItem key={d.id} value={d.id}>{d.name} (RD {d.rd})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                      const firstDiff = difficulties?.normal?.[0]?.id || "normal";
                      list.push({ maxCost: 10, difficultyId: firstDiff });
                      setStaminaCostsDirty(true);
                      setStaminaCosts({ ...staminaCosts, supportDifficulty: list });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Añadir Rango
                  </Button>
                )}"""

content = content.replace(old_table, new_table)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

