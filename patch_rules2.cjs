const fs = require('fs');
let code = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// The defaults
const defaultAttrs = [
  { id: 'fue', name: 'Fuerza', abbrev: 'FUE', desc: 'Capacidad física, levantamiento y daño cuerpo a cuerpo pesado.' },
  { id: 'des', name: 'Destreza', abbrev: 'DES', desc: 'Agilidad, puntería, reflejos y habilidades manuales precisas.' },
  { id: 'res', name: 'Resistencia', abbrev: 'RES', desc: 'Tolerancia al daño físico, enfermedades y fatiga extrema.' },
  { id: 'int', name: 'Inteligencia', abbrev: 'INT', desc: 'Capacidad analítica, memoria, percepción y uso de tecnología.' },
  { id: 'vol', name: 'Voluntad', abbrev: 'VOL', desc: 'Fuerza mental, resistencia psíquica y control de emociones/quirks.' },
  { id: 'vel', name: 'Velocidad', abbrev: 'VEL', desc: 'Capacidad de movimiento, iniciativa en combate y evasión rápida.' }
];

const defaultDerived = [
  { id: 'sa', name: 'Salud (SA)', formula: 'Salud Base de Etapa + RES', desc: 'Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA).' },
  { id: 'es', name: 'Estamina (ES)', formula: 'Salud Base de Etapa + DES', desc: 'Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse.' },
  { id: 'eva', name: 'Evasión (EVA)', formula: '10 + VEL', desc: 'Dificultad (RD) que un enemigo debe superar para acertar un ataque físico.' },
  { id: 'cor', name: 'Coraje (COR)', formula: '10 + VOL', desc: 'Dificultad (RD) que un enemigo debe superar para acertar un ataque mental.' },
  { id: 'mod', name: 'Modificadores', formula: '(Valor - 10) / 2', desc: 'Bonos aplicados a las tiradas d10.' },
  { id: 'ini', name: 'Iniciativa', formula: 'Promedio de INT+VEL', desc: 'Velocidad de reacción en combate.' },
];

// Add state for these in the component
code = code.replace(
  'const [stageForm, setStageForm] = useState({ ...defaultStage });',
  `const [stageForm, setStageForm] = useState({ ...defaultStage });
  
  const attrsRule = rules?.find((r: any) => r.key === 'system_attributes') || { value: ${JSON.stringify(defaultAttrs)} };
  const attributes = attrsRule.value;
  
  const derivedRule = rules?.find((r: any) => r.key === 'system_derived') || { value: ${JSON.stringify(defaultDerived)} };
  const derived = derivedRule.value;

  const [isAttrDialogOpen, setIsAttrDialogOpen] = useState(false);
  const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);
  const [attrForm, setAttrForm] = useState({ id: '', name: '', abbrev: '', desc: '', formula: '' });
  const [isDerived, setIsDerived] = useState(false);

  const handleOpenAttrDialog = (index: number, derivedFlag: boolean) => {
    setIsDerived(derivedFlag);
    setEditingAttrIndex(index);
    if (derivedFlag) {
      setAttrForm({ ...derived[index] });
    } else {
      setAttrForm({ ...attributes[index] });
    }
    setIsAttrDialogOpen(true);
  };

  const handleSaveAttr = async () => {
    try {
      if (isDerived) {
        const newDerived = [...derived];
        if (editingAttrIndex !== null) newDerived[editingAttrIndex] = { ...attrForm };
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
          body: JSON.stringify({ key: 'system_derived', type: 'json', value: newDerived, description: 'Estadísticas derivadas' })
        });
      } else {
        const newAttrs = [...attributes];
        if (editingAttrIndex !== null) newAttrs[editingAttrIndex] = { ...attrForm };
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
          body: JSON.stringify({ key: 'system_attributes', type: 'json', value: newAttrs, description: 'Atributos base' })
        });
      }
      mutate();
      setIsAttrDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };`
);


// Rewrite the attributes table body
const oldAttrTableBody = `<TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Fuerza</TableCell>
                      <TableCell className="font-mono text-xs">FUE</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad física, levantamiento y daño cuerpo a cuerpo pesado.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Destreza</TableCell>
                      <TableCell className="font-mono text-xs">DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Agilidad, puntería, reflejos y habilidades manuales precisas.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Resistencia</TableCell>
                      <TableCell className="font-mono text-xs">RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Tolerancia al daño físico, enfermedades y fatiga extrema.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Inteligencia</TableCell>
                      <TableCell className="font-mono text-xs">INT</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad analítica, memoria, percepción y uso de tecnología.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Voluntad</TableCell>
                      <TableCell className="font-mono text-xs">VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Fuerza mental, resistencia psíquica y control de emociones/quirks.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Velocidad</TableCell>
                      <TableCell className="font-mono text-xs">VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad de movimiento, iniciativa en combate y evasión rápida.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>`;

const newAttrTableBody = `<TableBody>
                    {attributes.map((attr: any, idx: number) => (
                      <TableRow key={attr.id || idx}>
                        <TableCell className="font-semibold">{attr.name}</TableCell>
                        <TableCell className="font-mono text-xs">{attr.abbrev}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{attr.desc}</TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleOpenAttrDialog(idx, false)}>Editar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>`;

code = code.replace(oldAttrTableBody, newAttrTableBody);

// Rewrite the derived table body
const oldDerivedTableBody = `<TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Salud (SA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Salud Base de Etapa + RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Estamina (ES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Salud Base de Etapa + DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Evasión (EVA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">10 + VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque físico.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Coraje (COR)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">10 + VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque mental.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Modificadores</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">(Atributo / 2) - 1</TableCell>
                      <TableCell className="text-sm text-muted-foreground">El bono real que se aplica a las tiradas de D10 (FUE 5 = Mod +1).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Vigilar / Valor</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Voluntad pura. Promedio de INT+VOL aplicado a la tabla de Modificadores.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>`;

const newDerivedTableBody = `<TableBody>
                    {derived.map((d: any, idx: number) => (
                      <TableRow key={d.id || idx}>
                        <TableCell className="font-semibold">{d.name}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{d.formula}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.desc}</TableCell>
                        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleOpenAttrDialog(idx, true)}>Editar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>`;

code = code.replace(oldDerivedTableBody, newDerivedTableBody);

// Inject the Dialog for Attributes
const dialogStr = `{/* ATTR DIALOG */}
      <Dialog open={isAttrDialogOpen} onOpenChange={setIsAttrDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar {isDerived ? 'Estadística' : 'Atributo'}</DialogTitle>
            <DialogDescription>
              Modifica la descripción o fórmula visual de la regla.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={attrForm.name} onChange={e => setAttrForm({...attrForm, name: e.target.value})} />
            </div>
            {!isDerived && (
              <div className="grid gap-2">
                <Label>Abreviatura</Label>
                <Input value={attrForm.abbrev} onChange={e => setAttrForm({...attrForm, abbrev: e.target.value})} />
              </div>
            )}
            {isDerived && (
              <div className="grid gap-2">
                <Label>Fórmula / Expresión</Label>
                <Input value={attrForm.formula || ''} onChange={e => setAttrForm({...attrForm, formula: e.target.value})} />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Input value={attrForm.desc} onChange={e => setAttrForm({...attrForm, desc: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttrDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAttr}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>`;

// Add it just before the STAGE DIALOG
code = code.replace('{/* STAGE DIALOG */}', dialogStr + '\n      {/* STAGE DIALOG */}');

fs.writeFileSync('src/views/RulesAdmin.tsx', code);
