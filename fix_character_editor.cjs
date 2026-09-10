const fs = require('fs');

let content = fs.readFileSync('src/components/character/CharacterEditor.tsx', 'utf8');

// Fix re-initialization issue
content = content.replace(
  /useEffect\(\(\) => \{\s*if \(character\?\.profileData\) \{\s*setFormData\(character\.profileData\);\s*\}\s*\}, \[character\]\);/,
  `const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (character?.profileData && !isDirty) {
      setFormData(character.profileData);
    }
  }, [character?.profileData, isDirty]);`
);

// Fix updateField to set isDirty
content = content.replace(
  /const updateField = \(id: string, value: any\) => \{\s*setFormData\(prev => \(\{ \.\.\.prev, \[id\]: value \}\)\);\s*\};/,
  `const updateField = (id: string, value: any) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [id]: value }));
  };`
);

// Fix name fallback and handleSave
content = content.replace(
  /body: JSON\.stringify\(\{\s*characterId: character\?\.id,\s*name: formData\.name \|\| formData\.alias \|\| "Unnamed",\s*profileData: formData\s*\}\)/,
  `body: JSON.stringify({
          characterId: character?.id,
          name: formData.name || formData.Nombre || formData.alias || character?.name, // Use existing name if not found in formData
          profileData: formData
        })`
);

// Fix truthy fallback in renderField
content = content.replace(
  /const value = formData\[field\.id\] \|\| "";/g,
  `const value = formData[field.id] ?? "";`
);

fs.writeFileSync('src/components/character/CharacterEditor.tsx', content);
