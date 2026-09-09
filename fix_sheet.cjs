const fs = require('fs');

let content = fs.readFileSync('src/views/SheetBuilderAdmin.tsx', 'utf8');

content = content.replace(
  /<DialogContent className="admin-dialog sm:max-w-\[500px\]">/,
  '<DialogContent className="admin-dialog sm:max-w-[500px] h-[90vh] flex flex-col p-0 overflow-hidden">'
);
content = content.replace(
  /<DialogHeader>\s*<DialogTitle>\{form.id \? "Editar Campo" : "Nuevo Campo de Ficha"\}<\/DialogTitle>\s*<DialogDescription>\s*Define cómo verán los jugadores este campo en su hoja de personaje\.\s*<\/DialogDescription>\s*<\/DialogHeader>/,
  '<DialogHeader className="px-6 pt-6 pb-4 border-b">\n            <DialogTitle>{form.id ? "Editar Campo" : "Nuevo Campo de Ficha"}</DialogTitle>\n            <DialogDescription>\n              Define cómo verán los jugadores este campo en su hoja de personaje.\n            </DialogDescription>\n          </DialogHeader>'
);
content = content.replace(
  /<div className="grid gap-4 py-4">/,
  '<div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">'
);
content = content.replace(
  /<DialogFooter>/,
  '<DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">'
);

fs.writeFileSync('src/views/SheetBuilderAdmin.tsx', content);
