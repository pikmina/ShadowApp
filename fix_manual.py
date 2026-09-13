import re

with open('src/views/SystemManual.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fetching limits Rule
fetch_limits_old = """  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { value: [] };
  const mechanics = mechanicsRule.value || [];"""

fetch_limits_new = """  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { value: [] };
  const mechanics = mechanicsRule.value || [];

  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty') || { 
    value: {
      normal: [],
      sustained: []
    }
  };
  const difficulties = difficultyRule.value;"""

content = content.replace(fetch_limits_old, fetch_limits_new)

# 2. Add Navigation item
nav_old = """                <li><button onClick={() => navigateToSection('etapas')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.3 Etapas por Rango de Edad</button></li>
              </ul>
            </div>"""

nav_new = """                <li><button onClick={() => navigateToSection('etapas')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.3 Etapas por Rango de Edad</button></li>
                <li><button onClick={() => navigateToSection('dificultades')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.4 Rangos de Dificultad</button></li>
              </ul>
            </div>"""

content = content.replace(nav_old, nav_new)

# 3. Add Content Section right after etapas
content_old = """                  </tbody>
                </table>
              </div>
            </section>

            <section id="estamina" className="space-y-6 pt-8 border-t border-border/50">"""

content_new = """                  </tbody>
                </table>
              </div>
            </section>

            <section id="dificultades" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> 1.4 Rangos de Dificultad (RD)</h2>
                <p className="text-muted-foreground">La Dificultad o RD (Rango de Dificultad) es el número objetivo que el jugador debe igualar o superar con su tirada (1D20 + Modificadores) para lograr una acción exitosa.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-oxanium mb-3 text-orange-400">Tiradas Normales</h3>
                  <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[150px]">Nombre</th>
                          <th className="px-4 py-3 font-medium w-[80px] text-center">RD</th>
                          <th className="px-4 py-3 font-medium">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-card">
                        {difficulties.normal?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">{item.rd}</td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">{item.desc}</td>
                          </tr>
                        ))}
                        {(!difficulties.normal || difficulties.normal.length === 0) && (
                          <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No configurado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-oxanium mb-3 text-orange-400">Tiradas Sostenidas (Máximo 5 tiradas)</h3>
                  <p className="text-sm text-muted-foreground mb-3">Para proyectos largos o complejos, en lugar de superar una única dificultad alta, el jugador debe acumular una cantidad de éxitos (tiradas que superan la RD normal) antes de llegar al límite de 5 tiradas o sacar 3 fallos críticos.</p>
                  <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[150px]">Nombre</th>
                          <th className="px-4 py-3 font-medium w-[150px] text-center">Éxitos Requeridos</th>
                          <th className="px-4 py-3 font-medium">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-card">
                        {difficulties.sustained?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">{item.successes} / 5</td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">{item.desc}</td>
                          </tr>
                        ))}
                        {(!difficulties.sustained || difficulties.sustained.length === 0) && (
                          <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No configurado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section id="estamina" className="space-y-6 pt-8 border-t border-border/50">"""

content = content.replace(content_old, content_new)

with open('src/views/SystemManual.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

