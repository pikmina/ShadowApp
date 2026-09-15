import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, GraduationCap, Copy, Users, BookOpen, RefreshCw, UserMinus, Search, X, Activity } from "lucide-react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "@/components/ui/badge";

const DEPARTMENTS = [
  { id: 'heroes', name: 'Departamento de Héroes', shortName: 'Héroes (A, B)', colorClass: 'text-yellow-500', borderClass: 'border-yellow-500/30', bgClass: 'bg-yellow-500/10', desc: 'Formación práctica, combate táctico, rescate y desarrollo de dones.', classes: 'Clases A y B' },
  { id: 'soporte', name: 'Departamento de Soporte', shortName: 'Soporte (C, D, E)', colorClass: 'text-cyan-400', borderClass: 'border-cyan-400/30', bgClass: 'bg-cyan-400/10', desc: 'Ingeniería, desarrollo de trajes, artefactos e items de apoyo.', classes: 'Clases C, D y E' },
  { id: 'general', name: 'Educación General', shortName: 'Educación General (F, G, H)', colorClass: 'text-emerald-400', borderClass: 'border-emerald-400/30', bgClass: 'bg-emerald-400/10', desc: 'Formación académica superior, ciencias, idiomas y humanidades.', classes: 'Clases F, G y H' },
  { id: 'gestion', name: 'Gestión y Negocios', shortName: 'Gestión y Negocios (I, J, K)', colorClass: 'text-purple-400', borderClass: 'border-purple-400/30', bgClass: 'bg-purple-400/10', desc: 'Administración de agencias, relaciones públicas y economía heroica.', classes: 'Clases I, J y K' },
];

const getDeptStyles = (courseType: string | null) => {
  if (!courseType) return { colorClass: 'text-primary', borderClass: 'border-border', bgClass: 'bg-primary/10' };
  const lower = courseType.toLowerCase();
  if (lower.includes('héroe')) return DEPARTMENTS[0];
  if (lower.includes('soporte')) return DEPARTMENTS[1];
  if (lower.includes('general')) return DEPARTMENTS[2];
  if (lower.includes('gestión') || lower.includes('negocio')) return DEPARTMENTS[3];
  return { colorClass: 'text-primary', borderClass: 'border-border', bgClass: 'bg-primary/10', name: courseType };
};

export default function ClassesAdmin() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/classes/structure", fetcher);
  const [activeArea, setActiveArea] = useState('Todas las Áreas');
  const [activeYear, setActiveYear] = useState('Todos los Años');
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) return <div className="p-8">Cargando clases...</div>;
  if (error) return <div className="p-8 text-red-500">Error al cargar clases</div>;

  // Calculate global stats
  let totalAulas = 0;
  let alumnosMatriculados = 0;
  let capacidadTotal = 0;
  let tutoresAssigned = 0; // Mocked

  data?.forEach((year: any) => {
    year.classes?.forEach((cls: any) => {
      totalAulas++;
      alumnosMatriculados += cls.usedSlots || 0;
      capacidadTotal += cls.capacity || 0;
      // In a real scenario, we'd check if cls has a tutor assigned
    });
  });

  const ocupacion = capacidadTotal > 0 ? Math.round((alumnosMatriculados / capacidadTotal) * 100) : 0;

  // Filter classes for the grid
  let flattenedClasses: any[] = [];
  data?.forEach((year: any) => {
    year.classes?.forEach((cls: any) => {
      flattenedClasses.push({ ...cls, yearName: year.name, yearId: year.id });
    });
  });

  if (activeArea !== 'Todas las Áreas') {
    flattenedClasses = flattenedClasses.filter(cls => {
      if (activeArea === 'Héroes (A, B)') return cls.courseType?.toLowerCase().includes('héroe');
      if (activeArea === 'Soporte (C, D, E)') return cls.courseType?.toLowerCase().includes('soporte');
      if (activeArea === 'Educación General (F, G, H)') return cls.courseType?.toLowerCase().includes('general');
      if (activeArea === 'Gestión y Negocios (I, J, K)') return cls.courseType?.toLowerCase().includes('gestión') || cls.courseType?.toLowerCase().includes('negocio');
      return true;
    });
  }

  if (activeYear !== 'Todos los Años') {
    flattenedClasses = flattenedClasses.filter(cls => cls.yearName === activeYear);
  }

  if (searchTerm) {
    flattenedClasses = flattenedClasses.filter(cls => cls.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const allYears = ['Todos los Años', ...new Set(data?.map((y: any) => y.name) || [])];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20">
      
      {/* Header Panel */}
      <EntityPanel variant="default" className="p-6 bg-black/40 border-border/50">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <GraduationCap className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="font-oxanium text-xl font-bold text-foreground">Aulas y Estudiantes de la Academia U.A.</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Estructura oficial en 4 departamentos de estudio, tutores elegidos de empleados U.A. y cupos de alumnos.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button variant="outline" size="sm" className="bg-background border-border/50 text-muted-foreground">
              <UserMinus className="size-3.5 mr-2" /> Limpiar personajes eliminados
            </Button>
            <Button variant="outline" size="sm" className="bg-background border-border/50 text-muted-foreground">
              <RefreshCw className="size-3.5 mr-2" /> Restaurar Estructura Oficial
            </Button>
            {/* We still need YearDialog for creating years, let's just make it a general config button or keep Year/Class dialogs */}
            <ClassGroupDialog yearId={data?.[0]?.id} mutate={mutate} customButton={
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white border-none">
                <Plus className="size-3.5 mr-2" /> Nueva Aula U.A.
              </Button>
            } />
          </div>
        </div>
      </EntityPanel>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <EntityPanel className="p-4 bg-black/40 border-border/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-primary font-oxanium text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="size-4" /> TOTAL AULAS
          </div>
          <div className="text-3xl font-bold text-foreground">{totalAulas}</div>
        </EntityPanel>
        <EntityPanel className="p-4 bg-black/40 border-border/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-400 font-oxanium text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="size-4" /> ALUMNOS MATRICULADOS
          </div>
          <div className="text-3xl font-bold text-emerald-400">{alumnosMatriculados}</div>
        </EntityPanel>
        <EntityPanel className="p-4 bg-black/40 border-border/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-cyan-400 font-oxanium text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="size-4" /> CAPACIDAD TOTAL
          </div>
          <div className="text-3xl font-bold text-foreground">{capacidadTotal} <span className="text-sm font-normal text-muted-foreground">cupos</span></div>
        </EntityPanel>
        <EntityPanel className="p-4 bg-black/40 border-border/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-purple-400 font-oxanium text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="size-4" /> OCUPACIÓN
          </div>
          <div className="text-3xl font-bold text-foreground">{ocupacion}%</div>
        </EntityPanel>
        <EntityPanel className="p-4 bg-black/40 border-border/50 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-yellow-500 font-oxanium text-xs font-bold uppercase tracking-wider mb-2">
            <GraduationCap className="size-4" /> TUTORES U.A.
          </div>
          <div className="text-3xl font-bold text-yellow-500">{tutoresAssigned} <span className="text-sm font-normal text-muted-foreground">/ {totalAulas}</span></div>
        </EntityPanel>
      </div>

      {/* Departments Legend */}
      <EntityPanel className="p-5 bg-black/40 border-border/50">
        <h3 className="flex items-center gap-2 font-oxanium text-sm font-semibold text-foreground mb-4">
          <BookOpen className="size-4 text-primary" /> Departamentos de Estudio Oficiales de la Academia U.A.:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} className={`p-4 rounded-lg border ${dept.borderClass} bg-background/50`}>
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-oxanium font-bold ${dept.colorClass}`}>{dept.name}</h4>
                <Badge variant="outline" className={`text-[9px] ${dept.colorClass} ${dept.borderClass} ${dept.bgClass}`}>{dept.classes}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{dept.desc}</p>
            </div>
          ))}
        </div>
      </EntityPanel>

      {/* Filters */}
      <EntityPanel className="p-4 bg-black/40 border-border/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Área de estudio:</span>
              <div className="flex gap-2">
                <Badge 
                  variant="outline" 
                  className={`cursor-pointer px-3 py-1.5 text-xs ${activeArea === 'Todas las Áreas' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                  onClick={() => setActiveArea('Todas las Áreas')}
                >
                  Todas las Áreas
                </Badge>
                {DEPARTMENTS.map(dept => (
                  <Badge 
                    key={dept.id}
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1.5 text-xs ${activeArea === dept.shortName ? `${dept.bgClass} ${dept.colorClass} ${dept.borderClass}` : 'bg-background hover:bg-muted'}`}
                    onClick={() => setActiveArea(dept.shortName)}
                  >
                    {dept.shortName}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Año:</span>
              <div className="flex gap-2">
                {allYears.map((yr: any) => (
                  <Badge 
                    key={yr}
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1.5 text-xs ${activeYear === yr ? 'bg-primary/20 text-primary border-primary/50' : 'bg-background hover:bg-muted'}`}
                    onClick={() => setActiveYear(yr)}
                  >
                    {yr}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar aula, tutor o alumno..." 
              className="pl-9 bg-background/50"
            />
          </div>
        </div>
      </EntityPanel>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {flattenedClasses.map(cls => {
          const styles = getDeptStyles(cls.courseType);
          return (
            <EntityPanel key={cls.id} className="p-5 bg-[#111111] border-[#222222] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${styles.colorClass} ${styles.borderClass} bg-transparent`}>
                    {styles.name?.toUpperCase() || cls.courseType?.toUpperCase() || 'SIN DEPARTAMENTO'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-background/50 border-border text-muted-foreground">
                    {cls.yearName}
                  </Badge>
                </div>
                <div className="flex gap-1 text-muted-foreground">
                  <Button variant="ghost" size="icon-sm" className="h-6 w-6"><Copy className="size-3.5" /></Button>
                  <ClassGroupDialog cls={cls} yearId={cls.yearId} mutate={mutate} customButton={
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6"><Edit2 className="size-3.5" /></Button>
                  } />
                  <DeleteAction type="class-groups" id={cls.id} mutate={mutate} />
                </div>
              </div>
              
              <h2 className="text-2xl font-black font-oxanium text-white mb-6">{cls.name}</h2>

              {/* Tutor Section */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="size-4" /> Tutor Responsable (Academia U.A.):
                  </div>
                  <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400/30 bg-orange-400/10">Sin verificar</Badge>
                </div>
                <div className="font-semibold text-foreground pl-6">(Sin tutor asignado)</div>
              </div>

              {/* Students Progress Section */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4" /> Alumnos Matriculados: <span className="font-bold text-foreground">{cls.usedSlots || 0} / {cls.capacity || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10">{(cls.capacity || 0) - (cls.usedSlots || 0)} vacantes</Badge>
                    <button className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-muted-foreground/50 underline-offset-2">Ajustar Máx.</button>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(cls.capacity > 0 ? (cls.usedSlots / cls.capacity) * 100 : 0)}%` }} 
                  />
                </div>
              </div>

              {/* Students List */}
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-500">
                    <BookOpen className="size-3.5" /> LISTA DE ALUMNOS:
                  </div>
                  <button className="text-xs font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                    <Plus className="size-3.5" /> Matricular Alumno
                  </button>
                </div>
                
                <div className="border border-dashed border-border/50 rounded-lg p-4 bg-black/20 text-center text-sm text-muted-foreground">
                  Sin alumnos matriculados aún en esta aula.
                </div>
                
                {/* Example of a populated student (commented out as per design request to not fully implement yet, but showing structural readiness) */}
                {/* 
                <div className="border border-border/50 rounded-md p-2 bg-background flex items-center justify-between mt-2 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                      <img src="/placeholder-avatar.jpg" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Izuku Midoriya</span>
                        <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 px-1 py-0 h-4">1er Año</Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">One For All • Novato</div>
                    </div>
                  </div>
                  <button className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
                    <X className="size-4" />
                  </button>
                </div> 
                */}
              </div>

            </EntityPanel>
          );
        })}
      </div>
      {flattenedClasses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron aulas que coincidan con los filtros.
        </div>
      )}

    </div>
  );
}

// Reuse Dialogs but adapt to customButton
function YearDialog({ year, mutate, customButton }: any) {
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
      <DialogTrigger
        render={
          customButton || (
            <Button variant={year ? "ghost" : "default"} size={year ? "icon-sm" : "sm"} className={!year ? "h-9 font-oxanium text-xs uppercase tracking-wider bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/50" : ""}>
              {year ? <Edit2 className="size-4" /> : <><Plus className="size-3.5 mr-1" /> Nuevo Año Acad. </>}
            </Button>
          )
        }
      />
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

function ClassGroupDialog({ cls, yearId, mutate, customButton }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cls?.name || "");
  const [description, setDescription] = useState(cls?.description || "");
  const [capacity, setCapacity] = useState(cls?.capacity?.toString() || "30");
  const [active, setActive] = useState(cls ? cls.active : true);
  const [sortOrder, setSortOrder] = useState(cls?.sortOrder || 0);
  const [courseType, setCourseType] = useState(cls?.courseType || "");

  const handleSubmit = async () => {
    const url = cls ? `/api/admin/class-groups/${cls.id}` : `/api/admin/class-groups`;
    const method = cls ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYearId: yearId, name, description, capacity: Number(capacity), active, sortOrder: Number(sortOrder), courseType: (courseType && courseType !== "none") ? courseType : null })
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
      <DialogTrigger
        render={
          customButton || (
            <Button variant={cls ? "ghost" : "outline"} size={cls ? "icon-sm" : "sm"} className={!cls ? "h-7 font-oxanium text-[10px] uppercase tracking-wider" : ""}>
              {cls ? <Edit2 className="size-4" /> : <><Plus className="size-3 mr-1" /> Nuevo Grupo </>}
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>{cls ? "Editar" : "Nuevo"} Grupo / Clase</DialogTitle></DialogHeader>
        <div className="space-y-4">
          
          <div className="space-y-2">
            <Label>Curso / Departamento</Label>
            <Select value={courseType} onValueChange={setCourseType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin clasificar</SelectItem>
                <SelectItem value="Departamento de Héroes">Departamento de Héroes</SelectItem>
                <SelectItem value="Departamento de Soporte">Departamento de Soporte</SelectItem>
                <SelectItem value="Departamento de Educación General">Departamento de Educación General</SelectItem>                <SelectItem value="Departamento de Gestión y Negocios">Departamento de Gestión y Negocios</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
    <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
