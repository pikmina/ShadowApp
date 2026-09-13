import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Restore staminaRule but better
stamina_old = """  /* useEffect(() => {
    if (!staminaCostsDirty && staminaRule?.value) {
      setStaminaCosts(staminaRule.value);
    }
  }, [staminaRule ? JSON.stringify(staminaRule.value) : null, staminaCostsDirty]); */"""

stamina_new = """  useEffect(() => {
    if (!staminaCostsDirty && staminaRule?.value) {
      setStaminaCosts(staminaRule.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staminaRule?.value, staminaCostsDirty]);"""

# Restore diffRule but better
diff_old = """  /* useEffect(() => {
    if (!difficultiesDirty && difficultyRule?.value) {
      setDifficulties(difficultyRule.value);
    }
  }, [difficultyRule ? JSON.stringify(difficultyRule.value) : null, difficultiesDirty]); */"""

diff_new = """  useEffect(() => {
    if (!difficultiesDirty && difficultyRule?.value) {
      setDifficulties(difficultyRule.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyRule?.value, difficultiesDirty]);"""

# Also fix the inline fallback of difficultyRule!
fallback_old = """  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty') || { 
    value: {
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
    }
  };"""

fallback_new = """  // Define default outside to prevent re-creation
  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty');"""

content = content.replace(stamina_old, stamina_new)
content = content.replace(diff_old, diff_new)
content = content.replace(fallback_old, fallback_new)

# Since we changed difficultyRule, we need to provide a fallback to useState
init_old = """  const [difficulties, setDifficulties] = useState<any>(difficultyRule.value);"""
init_new = """  const [difficulties, setDifficulties] = useState<any>(difficultyRule?.value || { normal: [], sustained: [] });"""
content = content.replace(init_old, init_new)

with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

