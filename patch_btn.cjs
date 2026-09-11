const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '<button type="button" className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-border/50 bg-black/20 self-stretch" onClick={() => window.open(`/sheet/${character.id}`, \'_blank\', \'noopener,noreferrer\')} aria-label={`Abrir ficha pública de ${name}`}>',
  '<a href={`/sheet/${character.id}`} target="_blank" rel="noopener noreferrer" className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-border/50 bg-black/20 self-stretch" aria-label={`Abrir ficha pública de ${name}`}>'
);
content = content.replace(
  '              </button>',
  '              </a>'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched button to a");
