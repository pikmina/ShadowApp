const fs = require('fs');
let content = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');

// Add imports
if (!content.includes('import { toast } from "sonner"')) {
  // Try to find a good place to put it
  content = content.replace("import { apiFetch, fetcher } from \"../lib/api\";", "import { apiFetch, fetcher } from \"../lib/api\";\nimport { toast } from \"sonner\";");
}

// Add functions to PlayerSheet component
const functions = `
  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de que quieres borrar este personaje? Esta acción es irreversible.")) return;
    try {
      await apiFetch(\`/api/admin/characters/\${id}\`, { method: 'DELETE' });
      toast.success("Personaje borrado exitosamente");
      mutateAll();
    } catch (e) {
      toast.error("Error al borrar el personaje");
    }
  };

  const handleDuplicate = async (character: any) => {
    try {
      const newName = character.name + " (Copia)";
      const body = {
        name: newName,
        profileData: character.profileData
      };
      // Since it's admin, they might be duplicating someone else's char, but wait, POST /api/character saves it for the logged in user right now.
      // Actually we just want a way to duplicate. The current api uses the logged in user.
      await apiFetch('/api/character', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      toast.success("Personaje duplicado exitosamente");
      mutateAll();
    } catch (e) {
      toast.error("Error al duplicar el personaje");
    }
  };
`;

content = content.replace(
  "const charactersList = ",
  functions + "\n  const charactersList = "
);

// Update buttons
content = content.replace(
  '<button className="p-1.5 hover:text-foreground hover:bg-white/5 rounded-md transition-all"><Copy className="w-3.5 h-3.5" /></button>',
  '<button onClick={() => handleDuplicate(c)} className="p-1.5 hover:text-foreground hover:bg-white/5 rounded-md transition-all"><Copy className="w-3.5 h-3.5" /></button>'
);

content = content.replace(
  '<button className="p-1.5 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>',
  '<button onClick={() => handleDelete(c.id)} className="p-1.5 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>'
);

fs.writeFileSync('src/views/PlayerSheet.tsx', content);
