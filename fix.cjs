const fs = require('fs');
let content = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');

content = content.replace(
  /const \{ data: allCharacters, mutate: mutateAll \} = useSWR\([\s\S]*?\);\n/,
  "const { data: allCharacters, mutate: mutateAll } = useSWR(user && isMod ? '/api/admin/characters' : null, fetcher);\n"
);

// Remove "Mis Fichas"
content = content.replace(
  /             <Button variant="outline" size="sm" className="bg-transparent border-border hover:bg-muted text-xs h-9 px-4">\n               <Users className="w-3.5 h-3.5 mr-2" \/>\n               Mis Fichas\n             <\/Button>\n/,
  ""
);

// Fix select defaults
content = content.replace(
  /<Select defaultValue="all">/g,
  '<Select defaultValue="todos">'
);
content = content.replace(
  /<SelectItem value="all">/g,
  '<SelectItem value="todos">'
);

content = content.replace(
  /<Select defaultValue="name">/g,
  '<Select defaultValue="nombre">'
);
content = content.replace(
  /<SelectItem value="name">/g,
  '<SelectItem value="nombre">'
);

fs.writeFileSync('src/views/PlayerSheet.tsx', content);
