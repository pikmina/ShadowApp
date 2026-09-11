const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Check to lucide-react import
content = content.replace(
  "import { AlertCircle, Award, Copy, Edit2, Eye, Plus, Search, Trash2, User, Users } from 'lucide-react';",
  "import { AlertCircle, Award, Check, Copy, Edit2, Eye, Plus, Search, Trash2, User, Users } from 'lucide-react';"
);

// 2. Add confirmDeleteId state
if (!content.includes('confirmDeleteId')) {
  content = content.replace(
    "const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);",
    "const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);\n  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);"
  );
}

// 3. Update handleDelete and button
const targetDelete = `  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres borrar este personaje? Esta acción es irreversible.')) return;
    try {`;
const replaceDelete = `  const handleDelete = async (id: number) => {
    try {`;

content = content.replace(targetDelete, replaceDelete);

const targetBtn = `<Button variant="ghost" size="icon" className="ml-auto size-8 rounded text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(character.id)} title="Borrar personaje" aria-label="Borrar personaje"><Trash2 className="size-3.5" /></Button>`;
const replaceBtn = `<Button 
                          variant="ghost" 
                          size="icon" 
                          className={\`ml-auto size-8 rounded \${confirmDeleteId === character.id ? 'text-red-500 bg-red-500/10' : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}\`} 
                          onClick={() => {
                            if (confirmDeleteId === character.id) {
                              handleDelete(character.id);
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(character.id);
                              setTimeout(() => setConfirmDeleteId(null), 3000);
                            }
                          }} 
                          title={confirmDeleteId === character.id ? "¿Confirmar borrado?" : "Borrar personaje"} 
                          aria-label="Borrar personaje"
                        >
                          {confirmDeleteId === character.id ? <Check className="size-3.5" /> : <Trash2 className="size-3.5" />}
                        </Button>`;

content = content.replace(targetBtn, replaceBtn);

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed delete logic");
