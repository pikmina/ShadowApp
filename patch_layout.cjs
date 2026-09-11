const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group flex min-h-40 flex-row rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden items-stretch">`;
const replacement = `<EntityPanel key={character.id} variant="character" pattern="dots" accent="accent2" cornerTicks className="group rounded-xl bg-black/40 border border-border/50 transition-colors hover:border-primary/60 p-0 overflow-hidden">
              <div className="flex flex-row items-stretch min-h-40 h-full w-full">`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("Successfully replaced step 1");
}

const target2 = `                    )}
                  </div>
                </div>
              </div>
            </EntityPanel>`;
const replacement2 = `                    )}
                  </div>
                </div>
              </div>
              </div>
            </EntityPanel>`;

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("Successfully replaced step 2");
}

fs.writeFileSync(file, content, 'utf8');
