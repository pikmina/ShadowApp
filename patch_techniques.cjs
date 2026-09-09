const fs = require('fs');
let content = fs.readFileSync('src/views/TechniquesAdmin.tsx', 'utf8');

// 1. Update data fetching to pull mechanics
content = content.replace(
  'const { data: rawElements, mutate } = useSWR(',
  'const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);\n  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };\n  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];\n\n  const { data: rawElements, mutate } = useSWR('
);

// 2. Add 'mechanic_rule' to EFFECT_TYPES
content = content.replace(
  'player_choice: "Elección del Jugador"',
  'player_choice: "Elección del Jugador",\n  mechanic_rule: "Regla del Sistema (CE)"'
);

// 3. Inject the UI inside the map of effects
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
  '{effect.type === "player_choice" && (',
  mechanicRuleUI + '\n                            {effect.type === "player_choice" && ('
);

fs.writeFileSync('src/views/TechniquesAdmin.tsx', content);
