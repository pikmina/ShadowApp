import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_select_value = """<SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar dificultad" />
                              </SelectTrigger>"""

new_select_value = """<SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar dificultad">
                                  {(() => {
                                    const match = difficulties?.normal?.find((d: any) => d.id === (item.difficultyId || "normal"));
                                    return match ? `${match.name} (RD ${match.rd})` : "Seleccionar dificultad...";
                                  })()}
                                </SelectValue>
                              </SelectTrigger>"""

content = content.replace(old_select_value, new_select_value)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
