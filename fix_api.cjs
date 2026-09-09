const fs = require('fs');
const glob = require('glob');

const files = [
  'src/views/RulesAdmin.tsx',
  'src/views/CatalogAdmin.tsx',
  'src/views/TechniquesAdmin.tsx',
  'src/views/SheetBuilderAdmin.tsx',
  'src/views/Shop.tsx',
  'src/views/SettingsAdmin.tsx',
  'src/components/character/CharacterEditor.tsx',
  'src/views/PlayerSheet.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add imports
  if (!content.includes('import { apiFetch, fetcher } from')) {
    const importPath = file.startsWith('src/views/') ? '../lib/api' : 
                       file.startsWith('src/components/') ? '@/lib/api' : '../lib/api';
    
    // Quick replace logic
    // Just regex replace the old fetcher definition and useSWR calls
    
    // Remove local fetcher definition
    content = content.replace(/const fetcher = async[\s\S]*?return res\.json\(\);\n};\n/g, '');
    content = content.replace(/const fetcher = async[\s\S]*?return res\.json\(\);\n};/g, '');
    
    // Inject import
    content = content.replace(/import useSWR from "swr";/, `import useSWR from "swr";\nimport { apiFetch, fetcher } from "${importPath}";`);
    content = content.replace(/import useSWR from 'swr';/, `import useSWR from "swr";\nimport { apiFetch, fetcher } from "${importPath}";`);
    
    // Replace token handling in components
    content = content.replace(/const \[token, setToken\] = useState<string \| null>\(null\);\n  useEffect\(\(\) => {\n    getToken\(\)\.then\(setToken\);\n  }, \[getToken\]\);/g, '');
    content = content.replace(/const { getToken } = useAuth\(\);/g, '');
    
    // SWR calls
    content = content.replace(/token \? \["\/api\/rules", token\] : null,\n    \(\[url, t\]\) => fetcher\(url, t\)/g, `user ? "/api/rules" : null, fetcher`);
    content = content.replace(/token \? \["\/api\/elements", token\] : null,\n    \(\[url, t\]\) => fetcher\(url, t\)/g, `user ? "/api/elements" : null, fetcher`);
    content = content.replace(/token \? \["\/api\/sheet-fields", token\] : null,\n    \(\[url, t\]\) => fetcher\(url, t\)/g, `user ? "/api/sheet-fields" : null, fetcher`);
    content = content.replace(/token \? \["\/api\/shop\/offers", token\] : null, \(\[url, t\]\) => fetcher\(url, t\)/g, `user ? "/api/shop/offers" : null, fetcher`);
    content = content.replace(/token \? \["\/api\/admin\/characters", token\] : null, \(\[url, t\]\) => fetcher\(url, t\)/g, `user ? "/api/admin/characters" : null, fetcher`);
    content = content.replace(/user \? \['\/api\/sheet-fields', user\.accessToken\] : null, \(\[url, token\]\) => fetcher\(url, token\)/g, `user ? "/api/sheet-fields" : null, fetcher`);
    content = content.replace(/user \? \['\/api\/settings', user\.accessToken\] : null, \(\[url, token\]\) => fetcher\(url, token\)/g, `user ? "/api/settings" : null, fetcher`);
    content = content.replace(/user \? \['\/api\/character', user\.accessToken\] : null,\n    \(\[url, token\]\) => fetcher\(url, token\)/g, `user ? "/api/character" : null, fetcher`);

    // Fetch calls
    content = content.replace(/await fetch\(/g, `await apiFetch(`);
    
    // Headers replacements
    content = content.replace(/headers: \{\s*'Content-Type': 'application\/json',\s*Authorization: `Bearer \$\{token\}`\s*\}/g, `headers: { 'Content-Type': 'application/json' }`);
    content = content.replace(/headers: \{\s*Authorization: `Bearer \$\{token\}`\s*\}/g, `{}`);
    content = content.replace(/headers: \{\s*"Content-Type": "application\/json",\s*Authorization: `Bearer \$\{token\}`\s*\}/g, `headers: { "Content-Type": "application/json" }`);
    
    // Shop fixes
    if (file.includes('Shop.tsx')) {
       content = content.replace(/const { token, role } = useAuth\(\);/, `const { user, dbUser } = useAuth();\n  const role = dbUser?.role;`);
       content = content.replace(/role && role !== 'player' && token \? \["\/api\/admin\/characters", token\] : null, \(\[url, t\]\) => fetcher\(url, t\)/g, `user && role && role !== 'player' ? "/api/admin/characters" : null, fetcher`);
    }

    fs.writeFileSync(file, content);
  }
}
