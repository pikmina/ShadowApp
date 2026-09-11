const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">`;
const endStr = `                      </>\n                    )}\n                  </div>\n                </div>\n              </div>\n            </EntityPanel>\n          );\n        })}\n      </div>`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  const replacement = `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCharacters.map((character: any) => {
          const profile = character.profileData || {};
          const name = String(readProfile(profile, ['basic_name', 'name', 'nombre']) || character.name || 'Sin nombre');
          const alias = String(readProfile(profile, ['alias', 'hero_name', 'nombre_heroe']) || 'Desconocido');
          const quirk = String(readProfile(profile, ['quirk_name', 'quirkName', 'don_name', 'don']) || 'Sin don');
          const group = readProfile(profile, ['faction_group', 'group', 'grupo', 'faccion', 'facción']);
          const avatar = readProfile(profile, ['avatarUrl', 'avatar_url', 'avatar', 'image', 'imagen']);
          const isOwner = character.userId === dbUser?.id;

          const stage = String(readProfile(profile, ['basic_stage', 'stage', 'etapa']) || 'Desconocida');
          const age = String(readProfile(profile, ['basic_age', 'age', 'edad']) || '?');
          const alignment = String(readProfile(profile, ['basic_alignment', 'alignment', 'alineamiento']) || 'Heroico');
          const bloodType = String(readProfile(profile, ['basic_blood_type', 'blood_type', 'sangre']) || 'O+');

          return (
            <EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex min-h-40 flex-row rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden">
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
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">«{alias}» • {stage} ({age}a)</p>
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">{bloodType} • {alignment}</p>
                    <p className="truncate font-oxanium text-[11px] text-muted-foreground">{quirk}</p>
                  </div>
                </div>

                <div>
                  <div className="my-2 border-t border-dashed border-border/50" />
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => window.open(\`/sheet/\${character.id}\`, '_blank', 'noopener,noreferrer')} title="Ver ficha pública" aria-label="Ver ficha pública"><Eye className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-primary border-primary/30" onClick={() => { setSelectedCharacterId(character.id); setEditing(true); }} title="Editar ficha" aria-label="Editar ficha"><Edit2 className="size-3.5" /></Button>
                    <Button variant="outline" size="icon" className="size-8 rounded bg-background/50 border-border/50 text-muted-foreground hover:text-foreground" onClick={() => setRewardingCharId(character.id)} title="Administrar recompensas" aria-label="Administrar recompensas"><Award className="size-3.5" /></Button>
                    {dbUser?.role === 'superadmin' && (
                      <>
                        <span className="mx-0.5 h-4 w-px bg-border/50" />
                        <Button variant="ghost" size="icon" className="size-8 rounded text-muted-foreground hover:text-foreground" onClick={() => handleDuplicate(character.id)} title="Duplicar personaje" aria-label="Duplicar personaje"><Copy className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="ml-auto size-8 rounded text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(character.id)} title="Borrar personaje" aria-label="Borrar personaje"><Trash2 className="size-3.5" /></Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </EntityPanel>
          );
        })}
      </div>`;

  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log("Successfully patched using string replace");
} else {
  console.log("Could not find start or end bounds.");
  console.log("Start index: ", startIndex);
  console.log("End index: ", endIndex);
}
