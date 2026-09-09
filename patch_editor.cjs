const fs = require('fs');
let code = fs.readFileSync('src/components/character/CharacterEditor.tsx', 'utf8');

// First, add targetUserId to the props
code = code.replace(
  'export default function CharacterEditor({ character, onSaved, onCancel }: { character?: any, onSaved: () => void, onCancel?: () => void }) {',
  'export default function CharacterEditor({ character, onSaved, onCancel, targetUserId }: { character?: any, onSaved: () => void, onCancel?: () => void, targetUserId?: number }) {'
);

// Second, add it to the fetch body
code = code.replace(
  /body: JSON\.stringify\(\{\s*name: formData\.name \|\| formData\.alias \|\| "Unnamed",\s*profileData: formData\s*\}\)/,
  `body: JSON.stringify({
          name: formData.name || formData.alias || "Unnamed",
          profileData: formData,
          targetUserId: targetUserId
        })`
);

fs.writeFileSync('src/components/character/CharacterEditor.tsx', code);
