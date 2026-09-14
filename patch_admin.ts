import fs from 'fs';
let content = fs.readFileSync('src/views/CharactersAdmin.tsx', 'utf8');
content = content.replace(
  /const isCanonCharacter = \(character: Record<string, any>\) => \{\n  return character\.canonCharacterId !== null && character\.canonCharacterId !== undefined;\n\};/,
  `const isCanonCharacter = (character: Record<string, any>) => {
  if (character.canonCharacterId !== null && character.canonCharacterId !== undefined) return true;
  const profile = character.profileData || {};
  const value = readProfile(profile, ['isCanon', 'is_canon', 'canon', 'character_canon']);
  return value === true || value === 'true' || value === 'Sí' || value === 'Si' || String(value).toLowerCase() === 'true';
};`
);
fs.writeFileSync('src/views/CharactersAdmin.tsx', content, 'utf8');
