const fs = require('fs');

function clean(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /\{\/\* Simulador de Cálculo de CE \*\/\}[\s\S]*?<\/div>\s*<\/div>/g,
    ''
  );
  fs.writeFileSync(file, content);
}

clean('src/views/TechniquesAdmin.tsx');
