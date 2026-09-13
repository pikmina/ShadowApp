import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fetching limits Rule
fetch_limits_old = """  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores (FUE / DES)","formula":"Floor(Atributo / 2)","desc":"Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5."},{"id":"db","name":"Daño Base (DB)","formula":"Dado de Etapa + Mod. FUE","desc":"Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4)."},{"id":"ini","name":"Iniciativa (INI)","formula":"Floor( (INT + VEL) / 2 ) / 2","desc":"Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc)."}] };
"""

fetch_limits_new = """  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores (FUE / DES)","formula":"Floor(Atributo / 2)","desc":"Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5."},{"id":"db","name":"Daño Base (DB)","formula":"Dado de Etapa + Mod. FUE","desc":"Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4)."},{"id":"ini","name":"Iniciativa (INI)","formula":"Floor( (INT + VEL) / 2 ) / 2","desc":"Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc)."}] };
  
  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty') || { 
    value: {
      normal: [
        { id: "facil", name: "Fácil", rd: 10, desc: "Tareas sencillas sin presión." },
        { id: "normal", name: "Normal", rd: 15, desc: "Reto estándar en condiciones normales." },
        { id: "dificil", name: "Difícil", rd: 20, desc: "Requiere esfuerzo o concentración." },
        { id: "muy_dificil", name: "Muy Difícil", rd: 25, desc: "Solo expertos tienen posibilidad." },
        { id: "heroico", name: "Heroico", rd: 30, desc: "Hazaña legendaria casi imposible." }
      ],
      sustained: [
        { id: "s_facil", name: "Fácil", successes: 2, desc: "Requiere un poco de dedicación." },
        { id: "s_normal", name: "Normal", successes: 3, desc: "Trabajo prolongado estándar." },
        { id: "s_dificil", name: "Difícil", successes: 4, desc: "Proyecto complejo y extenuante." },
        { id: "s_muy_dificil", name: "Muy Difícil", successes: 5, desc: "Requiere perfección constante (5 de 5 tiradas)." }
      ]
    }
  };
  
  const [difficulties, setDifficulties] = useState<any>(difficultyRule.value);
  const [difficultiesDirty, setDifficultiesDirty] = useState(false);
  useEffect(() => {
    if (!difficultiesDirty && difficultyRule?.value) setDifficulties(difficultyRule.value);
  }, [difficultyRule?.value, difficultiesDirty]);
"""

content = content.replace(fetch_limits_old, fetch_limits_new)

# 2. Add limits tab save handler
handlers_old = """  const handleSaveStage = async () => {
    try {
      const current = Array.isArray(stagesRule.value) ? stagesRule.value : [];
      let updated;
      if (editingStageIdx !== null) {
        updated = [...current];
        updated[editingStageIdx] = stageForm;
      } else {
        updated = [...current, stageForm];
      }
      
      await apiFetch("/api/rules", {
        method: "POST",
        body: JSON.stringify({ key: 'system_stages', type: 'json', value: updated, description: stagesRule.description })
      });
      setIsStageDialogOpen(false);
      mutate();
    } catch (err) {
      alert("Error al guardar etapa");
    }
  };"""

handlers_new = handlers_old + """

  const handleSaveDifficulties = async () => {
    try {
      await apiFetch("/api/rules", {
        method: "POST",
        body: JSON.stringify({ key: 'system_difficulty', type: 'json', value: difficulties, description: 'Rangos de Dificultad para tiradas normales y sostenidas' })
      });
      setDifficultiesDirty(false);
      mutate();
      alert("Rangos de dificultad guardados con éxito.");
    } catch (err) {
      alert("Error al guardar rangos de dificultad.");
    }
  };"""

content = content.replace(handlers_old, handlers_new)

# 3. Replace the limits tab
tab_old = """        <TabsContent value="limits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Límites y RD</CardTitle>
              <CardDescription>Esta sección se programará en el siguiente módulo. (Modificadores máximos, Rangos de Dificultad, etc.)</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>"""

tab_new = """        <TabsContent value="limits" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Rangos de Dificultad (RD)</CardTitle>
                <CardDescription>Configuración de los Rangos de Dificultad para las tiradas de los jugadores.</CardDescription>
              </div>
              <Button onClick={handleSaveDifficulties}>Guardar Dificultades</Button>
            </CardHeader>
            <CardContent className="space-y-8 pt-4 border-t border-border/50">
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tiradas Normales</h3>
                <p className="text-sm text-muted-foreground">La Dificultad (RD) que debe igualar o superar el jugador (1D20 + Modificador) para tener éxito.</p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[150px]">Nombre</TableHead>
                        <TableHead className="w-[100px]">RD</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {difficulties.normal?.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input 
                              value={item.name} 
                              onChange={(e) => {
                                const newNormal = [...difficulties.normal];
                                newNormal[idx] = { ...newNormal[idx], name: e.target.value };
                                setDifficulties({ ...difficulties, normal: newNormal });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.rd} 
                              onChange={(e) => {
                                const newNormal = [...difficulties.normal];
                                newNormal[idx] = { ...newNormal[idx], rd: Number(e.target.value) };
                                setDifficulties({ ...difficulties, normal: newNormal });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={item.desc} 
                              onChange={(e) => {
                                const newNormal = [...difficulties.normal];
                                newNormal[idx] = { ...newNormal[idx], desc: e.target.value };
                                setDifficulties({ ...difficulties, normal: newNormal });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tiradas Sostenidas (Máximo 5 tiradas)</h3>
                <p className="text-sm text-muted-foreground">Cantidad de éxitos (superar la RD) necesarios antes de llegar al límite de 5 tiradas o acumular 3 fallos críticos.</p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[150px]">Nombre</TableHead>
                        <TableHead className="w-[150px]">Éxitos requeridos</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {difficulties.sustained?.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input 
                              value={item.name} 
                              onChange={(e) => {
                                const newSustained = [...difficulties.sustained];
                                newSustained[idx] = { ...newSustained[idx], name: e.target.value };
                                setDifficulties({ ...difficulties, sustained: newSustained });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              max={5}
                              min={1}
                              value={item.successes} 
                              onChange={(e) => {
                                const newSustained = [...difficulties.sustained];
                                newSustained[idx] = { ...newSustained[idx], successes: Number(e.target.value) };
                                setDifficulties({ ...difficulties, sustained: newSustained });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={item.desc} 
                              onChange={(e) => {
                                const newSustained = [...difficulties.sustained];
                                newSustained[idx] = { ...newSustained[idx], desc: e.target.value };
                                setDifficulties({ ...difficulties, sustained: newSustained });
                                setDifficultiesDirty(true);
                              }} 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>"""

content = content.replace(tab_old, tab_new)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

