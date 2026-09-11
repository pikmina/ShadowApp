const fs = require('fs');
const file = 'src/views/RulesAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldTableBody = `<TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Salud (SA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Salud Base de Etapa + RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Estamina (ES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Salud Base de Etapa + DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Evasión (EVA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">10 + VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque físico.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Coraje (COR)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">10 + VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque mental.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Modificadores (FUE / DES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Floor(Atributo / 2)</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Daño Base (DB)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Dado de Etapa + Mod. FUE</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Iniciativa (INI)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">Floor( (INT + VEL) / 2 ) / 2</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>`;

const newTableBody = `<TableBody>
                    {derived.map((stat: any, idx: number) => (
                      <TableRow key={stat.id || idx}>
                        <TableCell className="font-semibold">{stat.name}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded w-fit">{stat.formula}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{stat.desc}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleOpenAttrDialog(idx, true)}>Editar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>`;

const oldDerived = \`const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores","formula":"(Valor - 10) / 2","desc":"Bonos aplicados a las tiradas d10."},{"id":"ini","name":"Iniciativa","formula":"Promedio de INT+VEL","desc":"Velocidad de reacción en combate."}] };\`;
const newDerived = \`const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: [{"id":"sa","name":"Salud (SA)","formula":"Salud Base de Etapa + RES","desc":"Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA)."},{"id":"es","name":"Estamina (ES)","formula":"Salud Base de Etapa + DES","desc":"Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse."},{"id":"eva","name":"Evasión (EVA)","formula":"10 + VEL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque físico."},{"id":"cor","name":"Coraje (COR)","formula":"10 + VOL","desc":"Dificultad (RD) que un enemigo debe superar para acertar un ataque mental."},{"id":"mod","name":"Modificadores (FUE / DES)","formula":"Floor(Atributo / 2)","desc":"Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5."},{"id":"db","name":"Daño Base (DB)","formula":"Dado de Etapa + Mod. FUE","desc":"Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4)."},{"id":"ini","name":"Iniciativa (INI)","formula":"Floor( (INT + VEL) / 2 ) / 2","desc":"Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc)."}] };\`;

if (content.includes(oldTableBody)) {
  content = content.replace(oldTableBody, newTableBody);
  content = content.replace(oldDerived, newDerived);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully patched RulesAdmin");
} else {
  console.log("Table body not found. Maybe formatting differences?");
}
