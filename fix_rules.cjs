const fs = require('fs');

let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// Dialog 1
content = content.replace(
  /<DialogContent className="admin-dialog sm:max-w-\[500px\]">/,
  '<DialogContent className="admin-dialog sm:max-w-[500px] h-[90vh] flex flex-col p-0 overflow-hidden">'
);
content = content.replace(
  /<DialogHeader>\s*<DialogTitle>Editar \{isDerived \? 'Estadística' : 'Atributo'\}<\/DialogTitle>\s*<DialogDescription>\s*Modifica la descripción o fórmula visual de la regla\.\s*<\/DialogDescription>\s*<\/DialogHeader>/,
  '<DialogHeader className="px-6 pt-6 pb-4 border-b">\n            <DialogTitle>Editar {isDerived ? \'Estadística\' : \'Atributo\'}</DialogTitle>\n            <DialogDescription>\n              Modifica la descripción o fórmula visual de la regla.\n            </DialogDescription>\n          </DialogHeader>'
);
content = content.replace(
  /<div className="grid gap-4 py-4">/,
  '<div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">'
);
content = content.replace(
  /<DialogFooter>\s*<Button variant="outline" onClick=\{([^>]+)\}>Cancelar<\/Button>\s*<Button onClick=\{handleSaveAttr\}>Guardar<\/Button>\s*<\/DialogFooter>/,
  '<DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">\n            <Button variant="outline" onClick={$1}>Cancelar</Button>\n            <Button onClick={handleSaveAttr}>Guardar</Button>\n          </DialogFooter>'
);

// Dialog 2
content = content.replace(
  /<DialogContent className="admin-dialog sm:max-w-\[700px\] p-0 overflow-hidden">/,
  '<DialogContent className="admin-dialog sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">'
);
content = content.replace(
  /<ScrollArea className="max-h-\[70vh\] px-6">/,
  '<div className="flex-1 px-6 overflow-y-auto">'
);
content = content.replace(
  /<\/ScrollArea>/,
  '</div>'
);


fs.writeFileSync('src/views/RulesAdmin.tsx', content);
