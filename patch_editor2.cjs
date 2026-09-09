const fs = require('fs');
let code = fs.readFileSync('src/components/character/CharacterEditor.tsx', 'utf8');

// Revert the targetUserId part in props, we don't need it.
code = code.replace(
  'export default function CharacterEditor({ character, onSaved, onCancel, targetUserId }: { character?: any, onSaved: () => void, onCancel?: () => void, targetUserId?: number }) {',
  'export default function CharacterEditor({ character, onSaved, onCancel }: { character?: any, onSaved: () => void, onCancel?: () => void }) {'
);

// Update fetch body to send characterId
code = code.replace(
  /body: JSON\.stringify\(\{[\s\S]*?\}\)/,
  `body: JSON.stringify({
          characterId: character?.id,
          name: formData.name || formData.alias || "Unnamed",
          profileData: formData
        })`
);

fs.writeFileSync('src/components/character/CharacterEditor.tsx', code);
