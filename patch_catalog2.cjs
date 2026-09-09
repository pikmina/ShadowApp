const fs = require('fs');
let content = fs.readFileSync('src/views/CatalogAdmin.tsx', 'utf8');

const mechanicRuleUI = `
                            {effect.type === "mechanic_rule" && (
                              <>
                                <span className="text-sm">Categoría:</span>
                                <Select value={effect.mechanicId || ""} onValueChange={v => {
                                  updateEffect(effect._id, { mechanicId: v, ruleId: "" });
                                }}>
                                  <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Seleccionar Categoría" /></SelectTrigger>
                                  <SelectContent>
                                    {mechanics.map((m: any) => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {effect.mechanicId && (
                                  <>
                                    <span className="text-sm">Regla:</span>
                                    <Select value={effect.ruleId || ""} onValueChange={v => {
                                      const mechanic = mechanics.find((m: any) => m.id === effect.mechanicId);
                                      const rule = mechanic?.rules?.find((r: any) => r.id === v);
                                      updateEffect(effect._id, { 
                                        ruleId: v, 
                                        ruleName: rule?.name, 
                                        cost: rule?.cost, 
                                        mechDesc: rule?.mechDesc,
                                        resolution: mechanic?.defaultResolution,
                                        target: mechanic?.defaultTarget
                                      });
                                    }}>
                                      <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Seleccionar Regla" /></SelectTrigger>
                                      <SelectContent>
                                        {(mechanics.find((m: any) => m.id === effect.mechanicId)?.rules || []).map((r: any) => (
                                          <SelectItem key={r.id} value={r.id}>{r.name} ({r.cost > 0 ? '+' : ''}{r.cost} CE)</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                              </>
                            )}
`;

content = content.replace(
  '{effect.type === "modify_derived" && (',
  mechanicRuleUI + '\n                            {effect.type === "modify_derived" && ('
);

fs.writeFileSync('src/views/CatalogAdmin.tsx', content);
