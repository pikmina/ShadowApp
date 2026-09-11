const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden">
              <div className="flex flex-row items-stretch min-h-40 h-full w-full">`;

const replacement = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex flex-col h-full rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden">
              <div className="flex-1 flex flex-row items-stretch min-h-40 w-full">`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Fixed layout.");
} else {
  console.log("Layout target not found.");
}
