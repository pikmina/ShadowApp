const fs = require('fs');

let content = fs.readFileSync('src/views/SettingsAdmin.tsx', 'utf8');

// Add loadError state
content = content.replace(
  /const \[loading, setLoading\] = useState\(true\);/,
  'const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);'
);

// Update fetchSettings to handle error properly
content = content.replace(
  /const data = await res\.json\(\);\s*setGameDate\(data\.gameDate \|\| \{ year: 2201, month: 1, day: 1 \}\);\s*setGroups\(data\.groups \|\| \[\]\);\s*setLoading\(false\);\s*\} catch \(error\) \{[\s\S]*?setLoading\(false\);\s*\}/,
  `const data = await res.json();
      setGameDate(data.gameDate || { year: 2201, month: 1, day: 1 });
      setGroups(data.groups || []);
      setLoadError(null);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      setLoadError("Error al cargar los ajustes: " + error.message);
      setLoading(false);
    }`
);

// Render error state and block editing
content = content.replace(
  /if \(loading\) \{[\s\S]*?return \([\s\S]*?<\/div>\s*\);\s*\}/,
  `if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-destructive font-semibold">{loadError}</div>
        <Button onClick={() => { setLoading(true); fetchSettings(); }}>Reintentar</Button>
      </div>
    );
  }`
);

fs.writeFileSync('src/views/SettingsAdmin.tsx', content);
