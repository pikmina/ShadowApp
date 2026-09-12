import re

with open('src/views/SystemManual.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_stats = """
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" /> Modificador de Fuerza (Físico)</h3>
                    <p className="text-sm text-muted-foreground">Bonificador de daño aplicado a técnicas y ataques basados en la potencia física.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Mod. FUE = </span> FUE / 2 (Redondeado abajo)
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Crosshair className="w-4 h-4 text-cyan-400" /> Modificador de Destreza (Precisión)</h3>
                    <p className="text-sm text-muted-foreground">Bonificador aplicado a puntería y daño de ataques basados en agilidad y armas a distancia.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Mod. DES = </span> DES / 2 (Redondeado abajo)
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Reducción de Daño (RD)</h3>
                    <p className="text-sm text-muted-foreground">Cantidad de daño que el personaje ignora al recibir un impacto (Armadura y habilidades pasivas).</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">RD = </span> Suma de Pasivas y Equipo
                  </div>
                </div>
"""

insert_point = """                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-yellow-400" /> Iniciativa</h3>
                    <p className="text-sm text-muted-foreground">Determina quién actúa primero en el turno.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Iniciativa = </span> Modificador de [(INT + VEL) / 2]
                  </div>
                </div>"""

if new_stats not in content:
    content = content.replace(insert_point, insert_point + "\n" + new_stats)
    with open('src/views/SystemManual.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

