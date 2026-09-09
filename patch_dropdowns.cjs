const fs = require('fs');
const files = ['src/views/CatalogAdmin.tsx', 'src/views/TechniquesAdmin.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('<SelectItem value="mechanic_rule">Regla del Sistema (CE)</SelectItem>')) continue;

  content = content.replace(
    '<SelectItem value="player_choice">Elección del Jugador</SelectItem>',
    '<SelectItem value="player_choice">Elección del Jugador</SelectItem>\n                                <SelectItem value="mechanic_rule">Regla del Sistema (CE)</SelectItem>'
  );

  fs.writeFileSync(file, content);
}
