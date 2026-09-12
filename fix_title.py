import re

with open('src/views/SystemManual.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("1.3 Etapas de Poder", "1.3 Etapas por Rango de Edad")
content = content.replace("El nivel general de un personaje. Define límites y bases para las estadísticas.", "Define la edad general de un personaje. Establece los límites de atributos, madurez y bases de estadísticas de su cuerpo.")

with open('src/views/SystemManual.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

