import { useState } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, ShieldAlert, Briefcase } from "lucide-react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";


export default function EmploymentsAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/employments/structure", fetcher);

  if (isLoading) return <div className="p-8">Cargando empleos...</div>;
  if (error) return <div className="p-8 text-red-500">Error al cargar empleos</div>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <EntityPanel variant="character">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-oxanium text-lg font-semibold text-foreground">
                <Briefcase className="size-4 text-primary" /> Catálogo de Empleos y Cargos
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Administra instituciones, departamentos y posiciones laborales.</p>
            </div>
            <InstitutionDialog mutate={mutate} />
          </div>
          <div className="mt-6 space-y-4">
        {data?.length === 0 && <p className="text-muted-foreground">No hay instituciones registradas.</p>}
        {data?.map((inst: any) => (
          <div key={inst.id} className="border border-border rounded-md bg-background overflow-hidden mb-4">
            <div className="bg-muted/20 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{inst.name} {!inst.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h2>
                {inst.description && <p className="text-sm text-muted-foreground">{inst.description}</p>}
              </div>
              <div className="flex gap-2">
                <DepartmentDialog institutionId={inst.id} mutate={mutate} />
                <InstitutionDialog institution={inst} mutate={mutate} />
                <DeleteAction type="institutions" id={inst.id} mutate={mutate} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {inst.departments?.length === 0 && <p className="text-sm text-muted-foreground">Sin departamentos.</p>}
              {inst.departments?.map((dep: any) => (
                <div key={dep.id} className="border border-border rounded-md p-4 bg-background">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-semibold text-primary">{dep.name} {!dep.active && <span className="text-red-500 text-sm">(Inactivo)</span>}</h3>
                      {dep.description && <p className="text-xs text-muted-foreground">{dep.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <PositionDialog departmentId={dep.id} mutate={mutate} />
                      <DepartmentDialog department={dep} institutionId={inst.id} mutate={mutate} />
                      <DeleteAction type="departments" id={dep.id} mutate={mutate} />
                    </div>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-border/50">
                    {dep.positions?.length === 0 && <p className="text-xs text-muted-foreground">Sin posiciones.</p>}
                    {dep.positions?.map((pos: any) => (
                      <div key={pos.id} className="flex justify-between items-center bg-muted/30 p-2 rounded text-sm">
                        <div>
                          <span className="font-medium">{pos.name}</span> {!pos.active && <span className="text-red-500 text-xs">(Inactivo)</span>}
                          {pos.description && <p className="text-xs text-muted-foreground">{pos.description}</p>}
                          <div className="text-xs mt-1 text-primary">
                            Ocupantes: {pos.occupiedSlots} / {pos.capacity === null ? 'Ilimitado' : pos.capacity}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <PositionDialog position={pos} departmentId={dep.id} mutate={mutate} />
                          <DeleteAction type="positions" id={pos.id} mutate={mutate} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
                </div>
        </div>
      </EntityPanel>
    </div>
  );
}

function InstitutionDialog({ institution, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(institution?.name || "");
  const [description, setDescription] = useState(institution?.description || "");
  const [active, setActive] = useState(institution ? institution.active : true);
  const [sortOrder, setSortOrder] = useState(institution?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = institution ? `/api/admin/institutions/${institution.id}` : `/api/admin/institutions`;
    const method = institution ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Institución guardada");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar institución");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={institution ? "ghost" : "default"} size={institution ? "icon-sm" : "sm"} className={!institution ? "h-9 font-oxanium text-xs uppercase tracking-wider bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/50" : ""} />}>
        {institution ? <Edit2 className="size-4" /> : <><Plus className="size-3.5 mr-1" /> Nueva Institución </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{institution ? "Editar" : "Nueva"} Institución</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden (menor es primero)</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-inst" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-inst" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentDialog({ department, institutionId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(department?.name || "");
  const [description, setDescription] = useState(department?.description || "");
  const [active, setActive] = useState(department ? department.active : true);
  const [sortOrder, setSortOrder] = useState(department?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = department ? `/api/admin/departments/${department.id}` : `/api/admin/departments`;
    const method = department ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institutionId, name, description, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Departamento guardado");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar departamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={department ? "ghost" : "outline"} size={department ? "icon-sm" : "sm"} className={!department ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""} />}>
        {department ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nuevo Depto. </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{department ? "Editar" : "Nuevo"} Departamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-dep" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-dep" className="text-sm">Activo</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PositionDialog({ position, departmentId, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(position?.name || "");
  const [description, setDescription] = useState(position?.description || "");
  const [capacity, setCapacity] = useState(position?.capacity === null ? "" : position?.capacity?.toString() || "");
  const [active, setActive] = useState(position ? position.active : true);
  const [sortOrder, setSortOrder] = useState(position?.sortOrder || 0);

  const handleSubmit = async () => {
    const url = position ? `/api/admin/positions/${position.id}` : `/api/admin/positions`;
    const method = position ? "PUT" : "POST";
    const parsedCap = capacity === "" ? null : Number(capacity);
    
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentId, name, description, capacity: parsedCap, active, sortOrder: Number(sortOrder) })
    });
    if (res.ok) {
      toast.success("Posición guardada");
      setOpen(false);
      mutate();
    } else {
      toast.error("Error al guardar posición");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={position ? "ghost" : "outline"} size={position ? "icon-sm" : "sm"} className={!position ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""} />}>
        {position ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nueva Posición </>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{position ? "Editar" : "Nueva"} Posición</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Capacidad (Dejar vacío para ilimitado)</Label>
            <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="active-pos" checked={active} onCheckedChange={(c: boolean) => setActive(c)} />
            <label htmlFor="active-pos" className="text-sm">Activo</label>
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
      toast.error(err.error || "No se pudo eliminar, es posible que tenga registros hijos activos.");
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
      <Trash2 className="size-4" />
    </Button>
  );
}
