const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');

// Update to fix the "players don't exist, only character management for mods" logic.
// We change it to a "Personajes" page that lists all characters.
code = code.replace(
  '<h3 className="font-bold mb-4 flex items-center gap-2"><UserStar className="w-4 h-4 text-primary" /> Personajes</h3>',
  `<div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><UserStar className="w-4 h-4 text-primary" /> Fichas</h3>
              <Button size="sm" variant="outline" onClick={() => { setSelectedCharacterId(null); setEditing(true); }}>
                + Nuevo
              </Button>
            </div>`
);

// We need to fix the 'targetUserId' in the editor component call inside PlayerSheet
code = code.replace(
  'targetUserId={displayCharacter.userId}',
  ''
);

// Fix title in layout
let layoutCode = fs.readFileSync('src/components/DashboardLayout.tsx', 'utf8');
layoutCode = layoutCode.replace(
  '{ to: "/my-sheet", label: "Mi Ficha", icon: UserRound },',
  '{ to: "/my-sheet", label: "Personajes", icon: UserRound },'
);
fs.writeFileSync('src/components/DashboardLayout.tsx', layoutCode);
fs.writeFileSync('src/views/PlayerSheet.tsx', code);
