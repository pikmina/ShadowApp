import re

with open('src/views/SystemManual.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

header = """                    <tr>
                      <th className="px-4 py-3 font-medium">Etapa</th>
                      <th className="px-4 py-3 font-medium text-center">Edad</th>
                      <th className="px-4 py-3 font-medium text-center">Pts. Atributo</th>
                      <th className="px-4 py-3 font-medium text-center">Máx. por Atributo</th>
                      <th className="px-4 py-3 font-medium text-center">Salud Base</th>
                      <th className="px-4 py-3 font-medium text-center">Estamina Base</th>
                      <th className="px-4 py-3 font-medium text-center">Daño Base</th>
                    </tr>"""

content = re.sub(r'                    <tr>\s*<th className="px-4 py-3 font-medium">Etapa</th>.*?</tr>', header, content, flags=re.DOTALL)

row = """                        <td className="px-4 py-3 font-medium">{st.name}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{st.minAge} - {st.maxAge}</td>
                        <td className="px-4 py-3 text-center">{st.attrPoints}</td>"""

content = re.sub(r'                        <td className="px-4 py-3 font-medium">\{st\.name\}</td>\s*<td className="px-4 py-3 text-center">\{st\.attrPoints\}</td>', row, content)

content = content.replace('colSpan={6}', 'colSpan={7}')

with open('src/views/SystemManual.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

