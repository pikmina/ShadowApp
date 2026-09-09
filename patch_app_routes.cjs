const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
code = code.replace(
  'import PlayerSheet from "./views/PlayerSheet";',
  'import PlayerSheet from "./views/PlayerSheet";\nimport PublicSheet from "./views/PublicSheet";'
);

// Add Route
code = code.replace(
  '<Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />',
  '<Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />\n      <Route path="/sheet/:id" element={<PublicSheet />} />'
);

fs.writeFileSync('src/App.tsx', code);
