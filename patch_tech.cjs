const fs = require('fs');
let file = fs.readFileSync('src/views/TechniquesAdmin.tsx', 'utf8');

file = file.replace(
  '<div className="flex items-center gap-2 pl-10">',
  `<div className="flex flex-col gap-2 pl-10">
    <div className="flex items-center gap-2">
      {effect.type !== 'mechanic_rule' && (
        <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
          <span className="text-sm font-bold text-primary">Coste CE:</span>
          <Input type="number" className="w-20 bg-card font-mono" value={effect.cost || 0} onChange={e => updateEffect(effect._id, { cost: Number(e.target.value) })} />
        </div>
      )}`
);

file = file.replace(
  '                          </div>\n                        </div>\n                      ))}',
  `                          </div>
                            </div>
                        </div>
                      ))}`
);

fs.writeFileSync('src/views/TechniquesAdmin.tsx', file);
