import re

with open('src/views/PublicSheet.tsx', 'r') as f:
    content = f.read()

# Add state for elements
content = content.replace(
    "const [error, setError] = useState(false);",
    "const [error, setError] = useState(false);\n  const [elements, setElements] = useState<any[]>([]);"
)

# Fetch elements
content = content.replace(
    "const response = await fetch(`/api/public/character/${id}`, { signal: controller.signal });",
    "const [response, elemResponse] = await Promise.all([\n          fetch(`/api/public/character/${id}`, { signal: controller.signal }),\n          fetch('/api/elements', { signal: controller.signal }).catch(() => ({ ok: false, json: async () => [] }))\n        ]);"
)

content = content.replace(
    "setCharacter(await response.json());",
    "setCharacter(await response.json());\n        if ((elemResponse as any).ok) setElements(await (elemResponse as any).json());"
)

# Add mapping logic before return
content = content.replace(
    "const profile = character.profileData || {};",
    """const profile = character.profileData || {};
  
  const getElementName = (id: string) => elements.find(el => el.id === id)?.name || id;
  const traits = Array.isArray(profile.traits) ? profile.traits : [];
  const weaknesses = Array.isArray(profile.weaknesses) ? profile.weaknesses : [];"""
)

# Replace Rasgos panel
content = content.replace(
    '<EntityPanel title="Rasgos" icon={<FileText className="size-4" />} cornerTicks><CyberFillerPanel icon={Feather} title="Sin datos públicos" subtitle="Módulo pendiente de conexión" className="min-h-28 p-4" /></EntityPanel>',
    """<EntityPanel title="Rasgos" icon={<FileText className="size-4" />} cornerTicks>
            {traits.length > 0 ? (
              <div className="space-y-2 p-4 text-sm text-text2">
                {traits.map(id => <div key={id} className="flex items-center gap-2"><div className="size-1 bg-cyan-500 rounded-full" />{getElementName(id)}</div>)}
              </div>
            ) : <CyberFillerPanel icon={Feather} title="Sin datos públicos" subtitle="No posee rasgos registrados" className="min-h-28 p-4" />}
          </EntityPanel>"""
)

# Replace Debilidades panel
content = content.replace(
    '<EntityPanel title="Debilidades" icon={<ShieldHalf className="size-4" />} cornerTicks><CyberFillerPanel icon={ShieldHalf} title="Sin datos públicos" subtitle="Módulo pendiente de conexión" className="min-h-28 p-4" /></EntityPanel>',
    """<EntityPanel title="Debilidades" icon={<ShieldHalf className="size-4" />} cornerTicks>
            {weaknesses.length > 0 ? (
              <div className="space-y-2 p-4 text-sm text-text2">
                {weaknesses.map(id => <div key={id} className="flex items-center gap-2"><div className="size-1 bg-red-500 rounded-full" />{getElementName(id)}</div>)}
              </div>
            ) : <CyberFillerPanel icon={ShieldHalf} title="Sin datos públicos" subtitle="No posee debilidades registradas" className="min-h-28 p-4" />}
          </EntityPanel>"""
)

with open('src/views/PublicSheet.tsx', 'w') as f:
    f.write(content)

