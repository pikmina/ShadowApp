import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, GraduationCap } from "lucide-react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";


export default function ClassesAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/classes/structure", fetcher);

  if (isLoading) return <div className="p-8">Cargando clases...</div>;
  if (error) return <div className="p-8 text-red-500">Error al cargar clases</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <EntityPanel variant="character">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-oxanium text-lg font-semibold text-foreground">
                <GraduationCap className="size-4 text-primary" /> Catálogo de Clases y Grupos
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Administra años académicos y grupos (aulas).</p>
            </div>
            <YearDialog mutate={mutate} />
          </div>
          <div className="mt-6 space-y-4">
        {data?.length === 0 && <p className="text-muted-foreground">No hay años académicos registrados.</p>}
        {data?.map((year: any) => (
          <div key={year.id} className="border border-border rounded-md bg-background overflow-hidden mb-4">
            <div className="bg-muted/20 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{year.name} {!year.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h2>
              </div>
              <div className="flex gap-2">
                <ClassGroupDialog yearId={year.id} mutate={mutate} />
                <YearDialog year={year} mutate={mutate} />
                <DeleteAction type="academic-years" id={year.id} mutate={mutate} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {year.classes?.length === 0 && <p className="text-sm text-muted-foreground">Sin grupos.</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {year.classes?.map((cls: any) => (
                  <div key={cls.id} className="border border-border rounded-md p-4 bg-background">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-primary">{cls.name} {!cls.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h3>
                        {cls.description && <p className="text-xs text-muted-foreground">{cls.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <ClassGroupDialog cls={cls} yearId={year.id} mutate={mutate} />
                        <DeleteAction type="class-groups" id={cls.id} mutate={mutate} />
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-border flex justify-between text-xs">
                      <span className="text-muted-foreground">Ocupación (solo originales)</span>
                      <span className="font-medium text-primary">{cls.usedSlots} / {cls.capacity === 0 ? "Nadie" : cls.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
                </div>
        </div>
      </EntityPanel>
    </div>
  );
}

function YearDialog({ year, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(year?.name || "");
  const [active, setActive] = useState(year ? year.active : true);
  const [sortOrder, setSortOrder] = useState(year?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = year ? `/api/admin/academic-years/${year.id}` : `/api/admin/academic-years`;
    const method = year ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Año académico guardado");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={year ? "ghost" : "default"} size={year ? "icon-sm" : "sm"} className={!year ? "h-9 font-oxanium text-xs uppercase tracking-wider bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/50" : ""} />}>
        {year ? <Edit2 className="size-4" /> : <><Plus className="size-3.5 mr-1" /> Nuevo Año Acad. </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{year ? "Editar" : "Nuevo"} Año Académico</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden (menor es primero)</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-year" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-year" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassGroupDialog({ cls, yearId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cls?.name || "");
  const [description, setDescription] = useState(cls?.description || "");
  const [capacity, setCapacity] = useState(cls?.capacity?.toString() || "30");
  const [active, setActive] = useState(cls ? cls.active : true);
  const [sortOrder, setSortOrder] = useState(cls?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = cls ? `/api/admin/class-groups/${cls.id}` : `/api/admin/class-groups`;
    const method = cls ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYearId: yearId, name, description, capacity: Number(capacity), active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Grupo guardado");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar grupo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={cls ? "ghost" : "outline"} size={cls ? "icon-sm" : "sm"} className={!cls ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""} />}>
        {cls ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nuevo Grupo </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{cls ? "Editar" : "Nuevo"} Grupo / Clase</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre (ej. 1ºA, Héroes de 3º)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Capacidad de PJs Originales</Label>
            <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-cls" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-cls" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAction({ type, id, mutate }: { type: string, id: string, mutate: any }) {
  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar este registro?")) return;
    const res = await apiFetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Eliminado");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error || "No se pudo eliminar.");
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
      <Trash2 className="size-4" />
    </Button>
  );
}
