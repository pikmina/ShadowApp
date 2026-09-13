import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

handler = """
  const handleSaveDifficulties = async () => {
    try {
      await apiFetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: 'system_difficulty', type: 'json', value: difficulties, description: 'Rangos de Dificultad para tiradas normales y sostenidas' })
      });
      setDifficultiesDirty(false);
      mutate();
      alert("Rangos de dificultad guardados con éxito.");
    } catch (err) {
      alert("Error al guardar rangos de dificultad.");
    }
  };

"""

content = content.replace("  const handleSaveStage = async () => {", handler + "  const handleSaveStage = async () => {")

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

