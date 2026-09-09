const fs = require('fs');

let content = fs.readFileSync('src/views/Shop.tsx', 'utf8');

// Checkout modal
content = content.replace(
  /<DialogContent className="sm:max-w-\[425px\]">/,
  '<DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0 overflow-hidden">'
);
content = content.replace(
  /<DialogHeader>\s*<DialogTitle className="uppercase tracking-widest font-black flex items-center gap-2">\s*<ShieldAlert className="w-5 h-5 text-amber-500" \/> Procesar Compra\s*<\/DialogTitle>\s*<DialogDescription>\s*Asigna esta compra al inventario del personaje seleccionado y descuenta los recursos\.\s*<\/DialogDescription>\s*<\/DialogHeader>/,
  '<DialogHeader className="px-6 pt-6 pb-4 border-b">\n            <DialogTitle className="uppercase tracking-widest font-black flex items-center gap-2">\n              <ShieldAlert className="w-5 h-5 text-amber-500" /> Procesar Compra\n            </DialogTitle>\n            <DialogDescription>\n              Asigna esta compra al inventario del personaje seleccionado y descuenta los recursos.\n            </DialogDescription>\n          </DialogHeader>'
);

// Edit Offer modal
content = content.replace(
  /<DialogContent className="sm:max-w-\[500px\]">/,
  '<DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col p-0 overflow-hidden">'
);
content = content.replace(
  /<DialogHeader>\s*<DialogTitle>Oferta de Tienda<\/DialogTitle>\s*<\/DialogHeader>/,
  '<DialogHeader className="px-6 pt-6 pb-4 border-b">\n            <DialogTitle>Oferta de Tienda</DialogTitle>\n          </DialogHeader>'
);

// Apply flex-1 overflow-y-auto to both body containers
content = content.replace(
  /<div className="grid gap-4 py-4">/g,
  '<div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">'
);

// Apply shrink-0 to footers
content = content.replace(
  /<DialogFooter>/g,
  '<DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">'
);

fs.writeFileSync('src/views/Shop.tsx', content);
