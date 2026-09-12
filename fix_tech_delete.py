import re

with open('src/views/TechniquesAdmin.tsx', 'r') as f:
    content = f.read()

# Add state
content = content.replace(
    'const [isDialogOpen, setIsDialogOpen] = useState(false);',
    'const [isDialogOpen, setIsDialogOpen] = useState(false);\n  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);'
)

# Replace handleDelete
new_handle_delete = """  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/elements/${id}`, {
        method: "DELETE" });
      mutate();
      setDeleteConfirmId(null);
    } catch (e) {
      alert("Error borrando: " + (e as Error).message);
    }
  };"""

content = re.sub(
    r'const handleDelete = async \(id: string\) => \{.*?^\s*\};',
    new_handle_delete,
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Update buttons
content = content.replace(
    '<Button variant="destructive" size="icon" onClick={() => handleDelete(el.id)}><Trash2 className="w-4 h-4" /></Button>',
    '''{deleteConfirmId === el.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(el.id)}>Confirmar</Button>
                          <Button variant="outline" size="icon" onClick={() => setDeleteConfirmId(null)}>X</Button>
                        </div>
                      ) : (
                        <Button variant="destructive" size="icon" onClick={() => setDeleteConfirmId(el.id)}><Trash2 className="w-4 h-4" /></Button>
                      )}'''
)

with open('src/views/TechniquesAdmin.tsx', 'w') as f:
    f.write(content)

