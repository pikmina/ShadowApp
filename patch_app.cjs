const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// replace Shop fallback with actual import
appCode = appCode.replace('import RulesAdmin from "./views/RulesAdmin";', 'import RulesAdmin from "./views/RulesAdmin";\nimport Shop from "./views/Shop";');

appCode = appCode.replace(
  '<Route path="shop" element={<div className="p-8 text-center text-muted-foreground">Tienda (Próxima Fase)</div>} />',
  '<Route path="shop" element={<Shop />} />'
);

fs.writeFileSync('src/App.tsx', appCode);
