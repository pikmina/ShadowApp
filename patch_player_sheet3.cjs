const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');

// We will replace everything after the imports to build a dynamic sheet.
// Let's find where MOCK_CHARACTER starts.
const startIndex = code.indexOf('const MOCK_CHARACTER =');

const newCode = code.substring(0, startIndex) + `

export default function PlayerSheet() {
  const { user, dbUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';

  const { data: ownCharacter, mutate: mutateOwn } = useSWR(
    user && !isMod ? ['/api/character', user.accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const { data: allCharacters, mutate: mutateAll } = useSWR(
    user && isMod ? ['/api/admin/characters', user.accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const charactersList = isMod ? (allCharacters || []) : [];
  
  let displayCharacter = null;
  if (isMod) {
    displayCharacter = charactersList.find((c: any) => c.id === selectedCharacterId) || charactersList[0];
  } else {
    displayCharacter = ownCharacter?.id ? ownCharacter : null;
  }

  // If a moderator hasn't created a character for this user yet
  if (!isMod && (!ownCharacter || !ownCharacter.id)) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
        <Shield className="w-16 h-16 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-bold text-foreground">Aún no tienes una ficha</h2>
        <p className="text-muted-foreground max-w-md">
          Un moderador debe crear tu personaje y asignarte tus estadísticas iniciales.
        </p>
      </div>
    );
  }

  const profile = displayCharacter?.profileData || {};

  if (editing && displayCharacter) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card p-4 rounded-md border border-border">
          <h2 className="text-lg font-bold">Editando: {displayCharacter.name}</h2>
          <Button variant="ghost" onClick={() => setEditing(false)}>Volver a la ficha</Button>
        </div>
        <div className="bg-card p-6 rounded-md shadow border border-border">
          <CharacterEditor 
            character={displayCharacter} 
            onSaved={() => { setEditing(false); if (isMod) mutateAll(); else mutateOwn(); }}
            onCancel={() => setEditing(false)}
            targetUserId={displayCharacter.userId}
          />
        </div>
      </div>
    );
  }

  // Helper to get value
  const getVal = (key: string) => profile[key] || '-';

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {isMod && (
        <div className="w-full md:w-64 flex-shrink-0 space-y-4">
          <div className="bg-card border border-border rounded-md p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><UserStar className="w-4 h-4 text-primary" /> Personajes</h3>
            <div className="space-y-1">
              {charactersList.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCharacterId(c.id)}
                  className={\`w-full text-left px-3 py-2 rounded-md text-sm transition-colors \${displayCharacter?.id === c.id ? 'bg-primary/20 text-primary font-bold' : 'hover:bg-muted text-muted-foreground'}\`}
                >
                  {c.name}
                </button>
              ))}
              {charactersList.length === 0 && <p className="text-xs text-muted-foreground">No hay personajes creados.</p>}
            </div>
            
            <div className="mt-6">
               {/* Later we can add a 'Create New Character' button here, but they need a userId */}
               <p className="text-xs text-muted-foreground italic">Los moderadores pueden editar personajes existentes aquí.</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {!displayCharacter ? (
           <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 bg-card rounded-md border border-border">
             <Info className="w-12 h-12 text-muted-foreground opacity-50" />
             <h2 className="text-lg font-bold text-foreground">Selecciona un personaje</h2>
           </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <ShieldHalf className="w-6 h-6 text-primary" />
                  Ficha de Personaje
                </h2>
                <p className="text-muted-foreground text-sm">Vista de datos y estadísticas actuales.</p>
              </div>
              {isMod && (
                <Button onClick={() => setEditing(true)} variant="default">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Ficha
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profile Image & Basic Info */}
              <div className="col-span-1 space-y-6">
                <div className="bg-card border border-border rounded-md overflow-hidden relative group aspect-[3/4]">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={displayCharacter.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="w-16 h-16 text-muted-foreground opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex flex-col justify-end p-6">
                    <h3 className="text-2xl font-black text-foreground font-oxanium tracking-tight">{displayCharacter.name}</h3>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs mt-1">{getVal('alias')}</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-md p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Raza/Grupo</span>
                    <span className="font-semibold">{getVal('group')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Edad</span>
                    <span className="font-semibold">{getVal('age')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Alineamiento</span>
                    <span className="font-semibold">{getVal('alignment')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ocupación</span>
                    <span className="font-semibold">{getVal('occupation')}</span>
                  </div>
                </div>
              </div>

              {/* Stats & Details */}
              <div className="col-span-1 md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border p-4 rounded-md flex flex-col items-center justify-center text-center">
                    <Heart className="w-6 h-6 text-destructive mb-2" />
                    <span className="text-2xl font-black">{profile.currentHealth || 0} / {profile.maxHealth || 0}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Salud</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-md flex flex-col items-center justify-center text-center">
                    <Zap className="w-6 h-6 text-amber-400 mb-2" />
                    <span className="text-2xl font-black">{profile.currentStamina || 0} / {profile.maxStamina || 0}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Estamina</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-md flex flex-col items-center justify-center text-center">
                    <Coins className="w-6 h-6 text-emerald-400 mb-2" />
                    <span className="text-2xl font-black">{displayCharacter.yen || 0}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Yen</span>
                  </div>
                  <div className="bg-card border border-border p-4 rounded-md flex flex-col items-center justify-center text-center">
                    <Award className="w-6 h-6 text-primary mb-2" />
                    <span className="text-2xl font-black">{displayCharacter.exp || 0}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">EXP</span>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-md p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Atributos Principales</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['FUE', 'RES', 'DES', 'INT', 'VEL', 'VOL'].map(attr => (
                       <div key={attr} className="flex items-center justify-between p-3 bg-muted/50 rounded-sm">
                         <span className="font-bold text-muted-foreground">{attr}</span>
                         <span className="text-xl font-black text-foreground">{profile[attr] || 0}</span>
                       </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-md p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> Descripción</h3>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {getVal('description') !== '-' ? getVal('description') : "Sin descripción."}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Extended Data - We can render dynamically based on available keys later */}
            <div className="bg-card border border-border rounded-md p-6 mt-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><PackageOpen className="w-5 h-5 text-primary" /> Otros Datos</h3>
              <p className="text-sm text-muted-foreground italic">El inventario, técnicas y rasgos se mostrarán aquí (Próximamente).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/views/PlayerSheet.tsx', newCode);
