const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We want to calculate the cost. The best place is to add a sticky sidebar or an adjacent column.
  // The layout currently uses: <div className="flex-1 overflow-hidden flex flex-col">...</div>
  // Inside: <Tabs ...>...</Tabs>
  // Let's modify the DialogContent to a grid.
  
  if (content.includes('Calculadora de CE')) return;

  // We need to inject the calculator.
  // Let's find the closing tag for the main content inside the dialog, right before DialogFooter (if any) or replacing the Tabs wrapping layout.
  
  // It has:
  // <div className="flex-1 overflow-hidden flex flex-col">
  //   <Tabs ...>
  //     ...
  //   </Tabs>
  // </div>
  // Let's change this to:
  // <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
  //   <div className="flex-1 flex flex-col min-w-0"> <Tabs>...</Tabs> </div>
  //   <div className="w-full md:w-80 bg-black/40 border-l border-border p-6 flex flex-col shrink-0 overflow-y-auto"> ...Calculator... </div>
  // </div>

  const calculatorComponent = `
            <div className="w-full md:w-80 bg-black/40 border-l border-border flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-card/50 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <h3 className="font-bold tracking-wider text-sm uppercase text-foreground">Resumen de Coste</h3>
              </div>
              
              <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
                <div className="bg-card border border-border p-6 rounded-lg text-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
                  
                  <div className="text-6xl font-black font-mono text-primary mb-2 drop-shadow-md">
                    {form.effects.filter((e: any) => e.type === 'mechanic_rule').reduce((sum: number, e: any) => sum + (e.cost || 0), 0)}
                  </div>
                  <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Coste de Activación (CE)
                  </div>
                </div>

                {form.effects.filter((e: any) => e.type === 'mechanic_rule').length === 0 && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-start gap-2">
                    <span className="text-lg leading-none">⚠️</span>
                    <span className="flex-1">Selecciona al menos una regla mecánica (CE) en la pestaña Efectos para calcular su coste.</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider border-b border-border pb-1">Desglose de Reglas</h4>
                  <div className="flex flex-col gap-2">
                    {form.effects.filter((e: any) => e.type === 'mechanic_rule').map((e: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm border border-border/50 bg-black/20 p-2 rounded">
                        <span className="truncate pr-2 text-foreground/80">{e.ruleName || 'Regla'}</span>
                        <span className={\`font-mono font-bold shrink-0 \${e.cost > 0 ? 'text-destructive' : e.cost < 0 ? 'text-primary' : 'text-muted-foreground'}\`}>
                          {e.cost > 0 ? '+' : ''}{e.cost || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
`;

  // Find: <div className="flex-1 overflow-hidden flex flex-col">
  // We need to be careful with the replacement.
  content = content.replace(
    '<div className="flex-1 overflow-hidden flex flex-col">',
    '<div className="flex-1 overflow-hidden flex flex-col md:flex-row">\n          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">'
  );
  
  // Close the left pane div before the calculator, which goes before DialogFooter or just before closing the parent
  // In CatalogAdmin.tsx it ends with:
  //                 </TabsContent>
  //               </div>
  //             </Tabs>
  //           </div>
  //           <DialogFooter className="px-6 py-4 border-t bg-muted/20">

  content = content.replace(
    '</Tabs>\n          </div>\n          <DialogFooter',
    '</Tabs>\n          </div>\n          ' + calculatorComponent + '\n        </div>\n          <DialogFooter'
  );

  // In CatalogAdmin.tsx and TechniquesAdmin.tsx we want to expand the max width
  content = content.replace('sm:max-w-[800px]', 'sm:max-w-[1000px] lg:max-w-[1100px]');
  
  fs.writeFileSync(filePath, content);
}

patchFile('src/views/CatalogAdmin.tsx');
patchFile('src/views/TechniquesAdmin.tsx');
