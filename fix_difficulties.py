import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

default_difficulties_code = """const defaultDifficulties = {
  normal: [
    { id: "facil", name: "Fácil", rd: 10, desc: "Tareas sencillas sin presión." },
    { id: "normal", name: "Normal", rd: 15, desc: "Reto estándar en condiciones normales." },
    { id: "dificil", name: "Difícil", rd: 20, desc: "Requiere esfuerzo o concentración." },
    { id: "muy_dificil", name: "Muy Difícil", rd: 25, desc: "Solo expertos tienen posibilidad." },
    { id: "heroico", name: "Heroico", rd: 30, desc: "Hazaña legendaria casi imposible." }
  ],
  sustained: [
    { id: "s_facil", name: "Fácil", successes: 2, desc: "Requiere un poco de dedicación." },
    { id: "s_normal", name: "Normal", successes: 3, desc: "Trabajo prolongado estándar." },
    { id: "s_dificil", name: "Difícil", successes: 4, desc: "Proyecto complejo y extenuante." },
    { id: "s_muy_dificil", name: "Muy Difícil", successes: 5, desc: "Requiere perfección constante (5 de 5 tiradas)." }
  ]
};

export default function RulesAdmin() {"""

content = content.replace("export default function RulesAdmin() {", default_difficulties_code)

old_state = "const [difficulties, setDifficulties] = useState<any>(difficultyRule?.value || { normal: [], sustained: [] });"
new_state = "const [difficulties, setDifficulties] = useState<any>(difficultyRule?.value || defaultDifficulties);"

content = content.replace(old_state, new_state)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
