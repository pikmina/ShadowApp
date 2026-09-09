const fs = require('fs');
let content = fs.readFileSync('src/views/CatalogAdmin.tsx', 'utf8');

const newSelectItems = `
                        <SelectItem value="trait">Rasgo</SelectItem>
                        <SelectItem value="weakness">Debilidad</SelectItem>
                        <SelectItem value="skill">Habilidad</SelectItem>
                        <SelectItem value="altered_status">Estado Alterado</SelectItem>
                        <SelectItem value="equipment">Equipamiento</SelectItem>
                        <SelectItem value="weapon">Arma</SelectItem>
                        <SelectItem value="consumable">Consumible</SelectItem>
                        <SelectItem value="ammunition">Munición</SelectItem>
`;

content = content.replace(
  /<SelectItem value="trait">Rasgo<\/SelectItem>\s*<SelectItem value="weakness">Debilidad<\/SelectItem>\s*<SelectItem value="skill">Habilidad<\/SelectItem>\s*<SelectItem value="altered_status">Estado Alterado<\/SelectItem>/g,
  newSelectItems
);

fs.writeFileSync('src/views/CatalogAdmin.tsx', content);
