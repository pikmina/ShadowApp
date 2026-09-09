import { SectionHeader } from "../components/common/SectionHeader";
import { BookOpen as SectionIcon } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const fetcher = async (url: string, token: string | null) => {
  if (!token) return [];
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) throw new Error("An error occurred while fetching the data.");
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server returned non-JSON response");
  }
  return res.json();
};

const defaultStage = {
  name: "",
  minAge: 15,
  maxAge: 17,
  exp: 2000,
  yen: 2000,
  baseHealth: 20,
  baseStamina: 20,
  baseDefenses: 10,
  attrPoints: 20,
  maxAttr: 6,
  baseDamage: "1D8",
  habN1: 3, habN2: 2, habN3: 1, habN4: 0, habN5: 0,
  techN1: 3, techN2: 0, techN3: 0,
  maxTraits: 3,
  minWeaknesses: 2
};

export default function RulesAdmin() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then(setToken);
  }, [getToken]);

  const { data: rules, error, isLoading, mutate } = useSWR(
    token ? ["/api/rules", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  // Parse stages from rules
  const stagesRule = rules?.find((r: any) => r.key === 'system_stages') || { key: 'system_stages', type: 'json', value: [], description: 'Definición estricta de Etapas por Edad' };
  const stages = Array.isArray(stagesRule.value) ? stagesRule.value : [];

  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [stageForm, setStageForm] = useState({ ...defaultStage });

  const handleOpenStageDialog = (index: number | null) => {
    if (index !== null) {
      setEditingStageIndex(index);
      setStageForm({ ...stages[index] });
    } else {
      setEditingStageIndex(null);
      setStageForm({ ...defaultStage });
    }
    setIsStageDialogOpen(true);
  };

  const handleSaveStage = async () => {
    if (!token) return;
    
    let newStages = [...stages];
    if (editingStageIndex !== null) {
      newStages[editingStageIndex] = stageForm;
    } else {
      newStages.push(stageForm);
    }
    
    // Sort stages logically by minimum age
    newStages.sort((a, b) => a.minAge - b.minAge);

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          key: "system_stages",
          type: "json",
          value: newStages,
          description: "Definición estricta de Etapas por Edad"
        })
      });

      if (!res.ok) throw new Error("Error saving stage");
      setIsStageDialogOpen(false);
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al guardar la etapa.");
    }
  };

  const handleDeleteStage = async (index: number) => {
    if (!token) return;
    if (!confirm(`¿Estás seguro de eliminar la etapa: ${stages[index].name}?`)) return;

    let newStages = [...stages];
    newStages.splice(index, 1);

    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          key: "system_stages",
          type: "json",
          value: newStages,
          description: "Definición estricta de Etapas por Edad"
        })
      });
      if (!res.ok) throw new Error("Error deleting stage");
      mutate();
    } catch (e) {
      console.error(e);
      alert("Error al eliminar la etapa.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={SectionIcon} title="Reglas del sistema" description="Etapas, atributos y valores que definen el sistema de juego." />

      <Tabs defaultValue="stages" className="w-full">
        <div className="w-full overflow-x-auto pb-1.5 no-scrollbar">
          <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto h-auto p-1 gap-1 bg-muted/60 border border-border/50">
            <TabsTrigger value="stages" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Etapas de Personaje</TabsTrigger>
            <TabsTrigger value="attributes" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Atributos Base</TabsTrigger>
            <TabsTrigger value="derived" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Estad. Derivadas</TabsTrigger>
            <TabsTrigger value="limits" className="shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-medium">Límites y RD</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="stages" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Etapas y Experiencia</CardTitle>
                <CardDescription>
                  Define los valores iniciales y límites según el rango de edad.
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenStageDialog(null)}>Añadir Etapa</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead>Exp / Yenes</TableHead>
                      <TableHead>Salud / Def</TableHead>
                      <TableHead>Atributos (Pts/Max)</TableHead>
                      <TableHead>Daño Base</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay etapas configuradas.</TableCell>
                      </TableRow>
                    ) : (
                      stages.map((stage: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{stage.name}</TableCell>
                          <TableCell>{stage.minAge} - {stage.maxAge} años</TableCell>
                          <TableCell>{stage.exp} / {stage.yen}</TableCell>
                          <TableCell>{stage.baseHealth} / {stage.baseDefenses}</TableCell>
                          <TableCell>{stage.attrPoints} pts (Máx {stage.maxAttr})</TableCell>
                          <TableCell>{stage.baseDamage}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleOpenStageDialog(idx)}>Editar</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteStage(idx)}>Borrar</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attributes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Atributos Base del Sistema</CardTitle>
              <CardDescription>Estos son los 6 atributos mecánicos inmutables del Motor de Shadowmore. Desde aquí puedes ajustar sus descripciones y abreviaturas para la hoja de personaje.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Abrev.</TableHead>
                      <TableHead>Descripción Narrativa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Fuerza</TableCell>
                      <TableCell className="font-mono text-xs">FUE</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad física, levantamiento y daño cuerpo a cuerpo pesado.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Destreza</TableCell>
                      <TableCell className="font-mono text-xs">DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Agilidad, puntería, reflejos y habilidades manuales precisas.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Resistencia</TableCell>
                      <TableCell className="font-mono text-xs">RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Tolerancia al daño físico, enfermedades y fatiga extrema.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Inteligencia</TableCell>
                      <TableCell className="font-mono text-xs">INT</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad analítica, memoria, percepción y uso de tecnología.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Voluntad</TableCell>
                      <TableCell className="font-mono text-xs">VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Fuerza mental, resistencia psíquica y control de emociones/quirks.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Velocidad</TableCell>
                      <TableCell className="font-mono text-xs">VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad de movimiento, iniciativa en combate y evasión rápida.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="derived" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas Derivadas (Fórmulas)</CardTitle>
              <CardDescription>Las estadísticas secundarias que el Motor calcula automáticamente combinando atributos base y reglas de etapa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Estadística</TableHead>
                      <TableHead>Fórmula Matemática</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">Salud (SA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Salud Base de Etapa + RES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Llega a 0: Desmayo. Llega a -10: Muerte. (Gastar 2 ES recupera 3 SA).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Estamina (ES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Salud Base de Etapa + DES</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Capacidad para realizar acciones, usar Quirks y Técnicas sin cansarse.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Evasión (EVA)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">10 + VEL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque físico.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Coraje (COR)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">10 + VOL</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Dificultad (RD) que un enemigo debe superar para acertar un ataque mental.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Modificadores (FUE / DES)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Floor(Atributo / 2)</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Escala de poder. Ej: Atributo 0-1 = +0 | 2-3 = +1 | 4-5 = +2 | 10 = +5.</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Daño Base (DB)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Dado de Etapa + Mod. FUE</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Daño a puño limpio. Ej: 1D8 + 2 (si FUE es 4).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Iniciativa (INI)</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">Floor( (INT + VEL) / 2 ) / 2</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Velocidad de reacción. Promedio de INT+VEL aplicado a la tabla de Modificadores (0-1=0, 2-3=1, etc).</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm">Editar</Button></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Límites y RD</CardTitle>
              <CardDescription>Esta sección se programará en el siguiente módulo. (Modificadores máximos, Rangos de Dificultad, etc.)</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>

      {/* STAGE DIALOG */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="admin-dialog sm:max-w-[700px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b">
            <DialogTitle>{editingStageIndex !== null ? "Editar Etapa" : "Nueva Etapa"}</DialogTitle>
            <DialogDescription>
              Ajusta los parámetros estrictos. El sistema generará y validará la información automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh] px-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
              
              <div className="col-span-2 grid gap-2">
                <Label>Nombre de la Etapa (Ej: Novato, Leyenda)</Label>
                <Input value={stageForm.name} onChange={e => setStageForm({...stageForm, name: e.target.value})} placeholder="Emergente" />
              </div>

              <div className="grid gap-2">
                <Label>Edad Mínima</Label>
                <Input type="number" value={stageForm.minAge} onChange={e => setStageForm({...stageForm, minAge: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Edad Máxima</Label>
                <Input type="number" value={stageForm.maxAge} onChange={e => setStageForm({...stageForm, maxAge: Number(e.target.value)})} />
              </div>

              <div className="grid gap-2">
                <Label>Experiencia Inicial</Label>
                <Input type="number" value={stageForm.exp} onChange={e => setStageForm({...stageForm, exp: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Yenes Iniciales</Label>
                <Input type="number" value={stageForm.yen} onChange={e => setStageForm({...stageForm, yen: Number(e.target.value)})} />
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Bases de Combate</h4>
              <div className="grid gap-2">
                <Label>Base de Salud</Label>
                <Input type="number" value={stageForm.baseHealth} onChange={e => setStageForm({...stageForm, baseHealth: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Base de Estamina</Label>
                <Input type="number" value={stageForm.baseStamina} onChange={e => setStageForm({...stageForm, baseStamina: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Base de Defensas (Física/Mental)</Label>
                <Input type="number" value={stageForm.baseDefenses} onChange={e => setStageForm({...stageForm, baseDefenses: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Daño Base</Label>
                <Select value={stageForm.baseDamage} onValueChange={v => setStageForm({...stageForm, baseDamage: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el dado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1D4">1D4</SelectItem>
                    <SelectItem value="1D6">1D6</SelectItem>
                    <SelectItem value="1D8">1D8</SelectItem>
                    <SelectItem value="1D10">1D10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Atributos</h4>
              <div className="grid gap-2">
                <Label>Puntos a Repartir</Label>
                <Input type="number" value={stageForm.attrPoints} onChange={e => setStageForm({...stageForm, attrPoints: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Máximo por Atributo</Label>
                <Input type="number" value={stageForm.maxAttr} onChange={e => setStageForm({...stageForm, maxAttr: Number(e.target.value)})} />
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Habilidades Máximas Permitidas</h4>
              <div className="grid grid-cols-5 gap-2 col-span-2">
                <div className="grid gap-1"><Label className="text-xs">Nivel 1</Label><Input type="number" value={stageForm.habN1} onChange={e => setStageForm({...stageForm, habN1: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 2</Label><Input type="number" value={stageForm.habN2} onChange={e => setStageForm({...stageForm, habN2: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 3</Label><Input type="number" value={stageForm.habN3} onChange={e => setStageForm({...stageForm, habN3: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 4</Label><Input type="number" value={stageForm.habN4} onChange={e => setStageForm({...stageForm, habN4: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 5</Label><Input type="number" value={stageForm.habN5} onChange={e => setStageForm({...stageForm, habN5: Number(e.target.value)})} /></div>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Técnicas Máximas Permitidas</h4>
              <div className="grid grid-cols-3 gap-2 col-span-2">
                <div className="grid gap-1"><Label className="text-xs">Nivel 1 (Despertar)</Label><Input type="number" value={stageForm.techN1} onChange={e => setStageForm({...stageForm, techN1: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 2 (Dominio)</Label><Input type="number" value={stageForm.techN2} onChange={e => setStageForm({...stageForm, techN2: Number(e.target.value)})} /></div>
                <div className="grid gap-1"><Label className="text-xs">Nivel 3 (Trascendencia)</Label><Input type="number" value={stageForm.techN3} onChange={e => setStageForm({...stageForm, techN3: Number(e.target.value)})} /></div>
              </div>

              <h4 className="col-span-2 font-bold text-sm text-foreground mt-2 border-b pb-1">Rasgos y Debilidades</h4>
              <div className="grid gap-2">
                <Label>Máximo de Rasgos</Label>
                <Input type="number" value={stageForm.maxTraits} onChange={e => setStageForm({...stageForm, maxTraits: Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Mínimo de Debilidades</Label>
                <Input type="number" value={stageForm.minWeaknesses} onChange={e => setStageForm({...stageForm, minWeaknesses: Number(e.target.value)})} />
              </div>

            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-muted">
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveStage}>Guardar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
