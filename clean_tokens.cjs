const fs = require('fs');

const files = [
  'src/views/RulesAdmin.tsx',
  'src/views/CatalogAdmin.tsx',
  'src/views/TechniquesAdmin.tsx',
  'src/views/SheetBuilderAdmin.tsx',
  'src/views/Shop.tsx',
  'src/views/SettingsAdmin.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove useState<string | null>(null) for token
  content = content.replace(/const \[token, setToken\] = useState<string \| null>\(null\);\n/g, '');
  
  // Remove if (!token) return;
  content = content.replace(/if \(!token\) return;\n/g, '');
  
  // Remove token = await getToken()
  content = content.replace(/const token = await getToken\(\);\n/g, '');
  
  // Fix Shop.tsx specifically
  if (file.includes('Shop.tsx')) {
    content = content.replace(
      /const \{ data: elements \} = useSWR\(token \? \["\/api\/elements", token\] : null, \(\[url, t\]\) => fetcher\(url, t\)\);/g,
      'const { data: elements } = useSWR(user ? "/api/elements" : null, fetcher);'
    );
  }
  
  fs.writeFileSync(file, content);
}
