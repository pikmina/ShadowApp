const fs = require('fs');
let content = fs.readFileSync('src/views/CatalogAdmin.tsx', 'utf8');

const newKindTypes = `const KIND_TYPES: Record<string, string> = {
  trait: "Rasgo",
  weakness: "Debilidad",
  skill: "Habilidad",
  altered_status: "Estado Alterado",
  equipment: "Equipamiento",
  weapon: "Arma",
  consumable: "Consumible",
  ammunition: "Munición"
};`;
content = content.replace(/const KIND_TYPES: Record<string, string> = \{[\s\S]*?\};/, newKindTypes);

content = content.replace(
  'const { data: rawElements, mutate } = useSWR(',
  'const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);\n  const mechanicsRule = rules?.find((r: any) => r.key === "system_mechanics") || { value: [] };\n  const mechanics = Array.isArray(mechanicsRule.value) ? mechanicsRule.value : [];\n\n  const { data: rawElements, mutate } = useSWR('
);

content = content.replace(
  'system_override: "Excepción de Regla (Flag)"',
  'system_override: "Excepción de Regla (Flag)",\n  mechanic_rule: "Regla del Sistema (CE)"'
);

fs.writeFileSync('src/views/CatalogAdmin.tsx', content);
