const fs = require('fs');

let content = fs.readFileSync('src/views/TechniquesAdmin.tsx', 'utf8');

// Fix effect card colors (line 382)
content = content.replace(
  /<div key=\{effect._id\} className="flex flex-col gap-2 bg-indigo-50\/50 border border-indigo-100 p-3 rounded-md">/,
  '<div key={effect._id} className="flex flex-col gap-2 bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-md">'
);

// We should also check if the simulator exists in TechniquesAdmin and fix it
if (content.includes('bg-indigo-50 border border-indigo-100 rounded-lg p-4')) {
    content = content.replace(
      /<div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-lg p-4">/,
      '<div className="mt-8 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">'
    );
    content = content.replace(
      /<h4 className="text-sm font-semibold text-indigo-900 mb-2">Simulador de Coste \(CE\)<\/h4>/,
      '<h4 className="text-sm font-semibold text-indigo-300 mb-2">Simulador de Coste (CE)</h4>'
    );
    content = content.replace(
      /<span className="text-indigo-700">Coste total calculado por el motor:<\/span>/,
      '<span className="text-indigo-200">Coste total calculado por el motor:</span>'
    );
}

fs.writeFileSync('src/views/TechniquesAdmin.tsx', content);
