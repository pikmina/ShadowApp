const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex min-h-40 flex-row rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden">
              <button type="button" className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-border/50 bg-black/20" onClick={() => window.open(\`/sheet/\${character.id}\`, '_blank', 'noopener,noreferrer')} aria-label={\`Abrir ficha pública de \${name}\`}>
                {avatar ? (
                  <img src={String(avatar)} alt={name} className="size-full object-cover grayscale opacity-90 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted/20 font-oxanium text-2xl font-bold text-primary/50">{name.charAt(0).toUpperCase() || <User className="size-9" />}</div>
                )}
                <div className="absolute top-2 left-2 rounded-full bg-black/40 p-0.5 border border-yellow-500/30">
                  <AlertCircle className="size-3.5 text-yellow-500" />
                </div>
              </button>
              
              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-3.5">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-oxanium text-sm font-semibold text-foreground transition-colors group-hover:text-primary" title={name}>{name}</h2>
                    {group && <Badge variant="outline" className="shrink-0 border-green-800 text-green-500 bg-green-950/30 h-5 px-1.5 font-oxanium text-[9px] uppercase rounded tracking-wider">{String(group)}</Badge>}
                  </div>`;

const replacement = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex min-h-40 flex-row rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden items-stretch">
              <button type="button" className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden border-r border-border/50 bg-black/20 self-stretch" onClick={() => window.open(\`/sheet/\${character.id}\`, '_blank', 'noopener,noreferrer')} aria-label={\`Abrir ficha pública de \${name}\`}>
                {avatar ? (
                  <img src={String(avatar)} alt={name} className="absolute inset-0 size-full object-cover grayscale opacity-90 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                ) : (
                  <div className="absolute inset-0 flex size-full items-center justify-center bg-muted/20 font-oxanium text-2xl font-bold text-primary/50">{name.charAt(0).toUpperCase() || <User className="size-9" />}</div>
                )}
                <div className="absolute top-2 left-2 rounded-full bg-black/40 p-0.5 border border-yellow-500/30">
                  <AlertCircle className="size-3.5 text-yellow-500" />
                </div>
              </button>
              
              <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-3.5">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-oxanium text-sm font-semibold text-foreground transition-colors group-hover:text-primary" title={name}>{name}</h2>
                    {group && <Badge variant="outline" className={\`shrink-0 h-5 px-1.5 font-oxanium text-[9px] uppercase rounded tracking-wider \${getGroupColorClass(String(group))}\`}>{String(group)}</Badge>}
                  </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Successfully replaced");
} else {
  console.log("Not found. Actual:");
  const actualStart = content.indexOf('<EntityPanel key={character.id} variant="character"');
  if(actualStart !== -1) {
      console.log(content.substring(actualStart, actualStart + 400));
  }
}
