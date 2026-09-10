import { SectionHeader } from "../components/common/SectionHeader";
import { Settings as SectionIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, Calendar, Users, Plus, Trash } from "lucide-react";
import { toast } from "sonner";

export default function SettingsAdmin() {
  
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gameDate, setGameDate] = useState({
    year: 2201,
    month: 1,
    day: 1,
  });

  const [groups, setGroups] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
            const res = await apiFetch("/api/settings", {
        headers: {
          Accept: "application/json"
        }
      });
      if (!res.ok) throw new Error("Error fetching settings");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }
      const data = await res.json();
      setGameDate(data.gameDate || { year: 2201, month: 1, day: 1 });
      setGroups(data.groups || []);
      setLoadError(null);
      setLoading(false);
    } catch (error: any) {
      console.error(error);
      setLoadError("Error al cargar los ajustes: " + error.message);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
            const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameDate, groups })
      });
      
      if (res.ok) {
        toast.success("Ajustes guardados correctamente");
      } else {
        throw new Error("Error saving");
      }
      setSaving(false);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar los ajustes");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-destructive font-semibold">{loadError}</div>
        <Button onClick={() => { setLoading(true); fetchSettings(); }}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Ajustes globales" description="Configura la cronología y los grupos del mundo de Shadowmore." />

      <div className="grid gap-6 md:grid-cols-2">
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
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Tiempo
              </Button>
            </div>
          </CardContent>
        </Card>

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
                      className="p-1 h-10 w-full"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    setGroups(groups.filter((_, i) => i !== index));
                  }}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-2" onClick={() => {
              setGroups([...groups, { id: Date.now().toString(), name: "Nuevo Grupo", color: "#3b82f6" }]);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir Grupo
            </Button>

            <div className="pt-4 border-t border-border mt-4 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Grupos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
