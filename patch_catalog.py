import re

with open('src/views/CatalogAdmin.tsx', 'r') as f:
    content = f.read()

# Add imports for Eye, EyeOff
content = content.replace('Trash2, Edit, Search } from "lucide-react";', 'Trash2, Edit, Search, Eye, EyeOff } from "lucide-react";')

# Add handleToggleStatus
toggle_func = """
  const handleToggleStatus = async (el: any) => {
    try {
      const updatedEl = { ...el, status: el.status === "published" ? "draft" : "published" };
      const res = await apiFetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEl)
      });
      if (!res.ok) throw new Error("Error saving");
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al actualizar estado");
    }
  };

  const handleDelete"""

content = content.replace('  const handleDelete', toggle_func)

# Add button
button_html = """<Button variant="outline" size="icon" aria-label={el.status === "published" ? `Pasar a borrador ${el.name}` : `Publicar ${el.name}`} onClick={() => handleToggleStatus(el)}>
                        {el.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" aria-label={`Editar ${el.name}`}"""

content = content.replace('<Button variant="outline" size="icon" aria-label={`Editar ${el.name}`}', button_html)

with open('src/views/CatalogAdmin.tsx', 'w') as f:
    f.write(content)
