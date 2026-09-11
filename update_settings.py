import re

with open('src/views/SettingsAdmin.tsx', 'r') as f:
    content = f.read()

# We need to add Tabs imports
if 'Tabs,' not in content:
    content = content.replace('import { Button }', 'import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";\nimport { Button }')

# We need to separate handleSave into handleSaveDate and handleSaveGroups
content = content.replace(
    'const handleSave = async () => {',
    '''const [activeTab, setActiveTab] = useState("time");
    
  const handleSaveDate = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameDate, expectedUpdatedAt })
      });
      if (res.ok) {
        toast.success("Tiempo guardado correctamente");
        fetchSettings(); // refresh to get new expectedUpdatedAt
      } else {
        if (res.status === 409) {
          toast.error("Conflicto: Otro administrador modificó los ajustes. Recarga la página.");
        } else {
          throw new Error("Error saving");
        }
      }
    } catch (error) {
      toast.error("Error al guardar el tiempo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroups = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups, expectedUpdatedAt })
      });
      if (res.ok) {
        toast.success("Grupos guardados correctamente");
        fetchSettings(); // refresh to get new expectedUpdatedAt
      } else {
        if (res.status === 409) {
          toast.error("Conflicto: Otro administrador modificó los ajustes. Recarga la página.");
        } else {
          throw new Error("Error saving");
        }
      }
    } catch (error) {
      toast.error("Error al guardar los grupos");
    } finally {
      setSaving(false);
    }
  };'''
)

# Remove the old handleSave up to the end of the try-catch block
content = re.sub(r'const handleSave = async \(\) => \{.*?setSaving\(false\);\n    \}\n  \};', '', content, flags=re.DOTALL)

# Replace the layout
layout_str = '''<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-card/50 border border-border">
          <TabsTrigger value="time">Tiempo On-Rol</TabsTrigger>
          <TabsTrigger value="groups">Grupos / Facciones</TabsTrigger>
        </TabsList>
        <TabsContent value="time">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Tiempo On-Rol
              </CardTitle>
              <CardDescription>
                Define la fecha actual dentro del juego. Los personajes pueden usar esto como referencia para su edad o eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Día</Label>
                  <Input 
                    id="day" 
                    type="number" 
                    min={1} 
                    max={31}
                    value={gameDate.day}
                    onChange={(e) => setGameDate({ ...gameDate, day: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <Input 
                    id="month" 
                    type="number" 
                    min={1} 
                    max={12}
                    value={gameDate.month}
                    onChange={(e) => setGameDate({ ...gameDate, month: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input 
                    id="year" 
                    type="number" 
                    value={gameDate.year}
                    onChange={(e) => setGameDate({ ...gameDate, year: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border mt-4 flex justify-end">
                <Button onClick={handleSaveDate} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Tiempo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Grupos / Facciones
              </CardTitle>
              <CardDescription>
                Define los grupos o facciones que los usuarios pueden seleccionar para sus personajes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <div key={group.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input 
                        placeholder="Nombre del Grupo" 
                        value={group.name}
                        onChange={(e) => {
                          const newGroups = [...groups];
                          newGroups[index].name = e.target.value;
                          setGroups(newGroups);
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Input 
                        type="color" 
                        value={group.color}
                        onChange={(e) => {
                          const newGroups = [...groups];
                          newGroups[index].color = e.target.value;
                          setGroups(newGroups);
                        }}
                        className="p-1 h-10 w-full cursor-pointer"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                      setGroups(groups.filter((_, i) => i !== index));
                    }}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-2 border-dashed border-2" onClick={() => {
                setGroups([...groups, { id: Date.now().toString(), name: "Nuevo Grupo", color: "#3b82f6" }]);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Grupo
              </Button>
              <div className="pt-4 border-t border-border mt-4 flex justify-end">
                <Button onClick={handleSaveGroups} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Grupos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>'''

# Remove the old grid layout
content = re.sub(r'<div className="grid gap-6 md:grid-cols-2">.*?</div>\n    </div>\n  \);\n\}', layout_str + '\n    </div>\n  );\n}', content, flags=re.DOTALL)

with open('src/views/SettingsAdmin.tsx', 'w') as f:
    f.write(content)

