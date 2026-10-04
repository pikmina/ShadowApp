import React, { useState } from "react";
import useSWR from "swr";
import { fetcher, apiFetch } from "@/lib/api";
import { Plus, Trash2, Edit2, GraduationCap, Users, BookOpen, Search, X, Activity, CalendarDays } from "lucide-react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

  data?.forEach((year: any) => {
    year.classes?.forEach((cls: any) => {
      totalAulas++;
      alumnosMatriculados += cls.usedSlots || 0;
      capacidadTotal += cls.capacity || 0;
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

  if (searchTerm.trim()) {
    const query = searchTerm.trim().toLocaleLowerCase('es');
    flattenedClasses = flattenedClasses.filter(cls => [cls.name, cls.description, cls.yearName, cls.courseType, ...(cls.students ?? []).map((student: any) => student.name)]
      .filter(Boolean).join(' ').toLocaleLowerCase('es').includes(query));
  }

  const allYears = ['Todos los Años', ...new Set(data?.map((y: any) => y.name) || [])];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20">
      <SectionHeader
        icon={GraduationCap}
        title="Aulas y Estudiantes de la Academia U.A."
        description="Administra años académicos, departamentos de estudio, aulas, cupos y alumnos matriculados."
        actions={
          <>
            <YearDialog mutate={mutate} customButton={<Button variant="outline" size="sm" className="h-9"><CalendarDays className="size-3.5 mr-2" /> Nuevo Año</Button>} />
            <ClassGroupDialog years={data} mutate={mutate} customButton={
              <Button size="sm" className="h-9">
                <Plus className="size-3.5 mr-2" /> Nueva Aula
              </Button>
            } />
          </>
        }
      />

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
            <CalendarDays className="size-4" /> AÑOS ACADÉMICOS
          </div>
          <div className="text-3xl font-bold text-yellow-500">{data?.length ?? 0}</div>
        </EntityPanel>
      </div>

      {/* Departments Legend */}
      <EntityPanel className="p-5 bg-black/40 border-border/50">
        <h3 className="flex items-center gap-2 font-oxanium text-sm font-semibold text-foreground mb-4">
          <BookOpen className="size-4 text-primary" /> Departamentos de Estudio de la Academia U.A.
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
        <div className="space-y-4">
          <div className="space-y-4">
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
          
          <div className="relative w-full border-t border-border/50 pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por aula, año, área, descripción o alumno..." 
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
                  <ClassGroupDialog cls={cls} yearId={cls.yearId} years={data} mutate={mutate} customButton={
                    <Button variant="ghost" size="icon-sm" className="h-6 w-6"><Edit2 className="size-3.5" /></Button>
                  } />
                  <DeleteAction type="class-groups" id={cls.id} mutate={mutate} />
                </div>
              </div>
              
              <h2 className="text-2xl font-black font-oxanium text-white mb-6">{cls.name}</h2>

              {/* Students Progress Section */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4" /> Alumnos Matriculados: <span className="font-bold text-foreground">{cls.usedSlots || 0} / {cls.capacity || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/30 bg-emerald-400/10">{(cls.capacity || 0) - (cls.usedSlots || 0)} vacantes</Badge>
                    <ClassGroupDialog cls={cls} yearId={cls.yearId} years={data} mutate={mutate} customButton={<button className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-muted-foreground/50 underline-offset-2">Ajustar máximo</button>} />
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
                  <EnrollmentDialog cls={cls} mutate={mutate} />
                </div>
                
                {cls.students?.length ? <div className="space-y-2">{cls.students.map((student: any) => <div key={student.enrollmentId} className="flex items-center justify-between rounded-md border border-border/50 bg-background p-2"><span className="text-sm font-semibold">{student.name}</span><Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={async () => { const response = await apiFetch(`/api/admin/enrollments/${student.enrollmentId}`, { method: 'DELETE' }); if (response.ok) { toast.success('Alumno retirado'); await mutate(); } }}><X className="size-4" /></Button></div>)}</div> : <div className="border border-dashed border-border/50 rounded-lg p-4 bg-black/20 text-center text-sm text-muted-foreground">Sin alumnos matriculados aún en esta aula.</div>}
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

function ClassGroupDialog({ cls, yearId, years = [], mutate, customButton }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(cls?.name || "");
  const [description, setDescription] = useState(cls?.description || "");
  const [capacity, setCapacity] = useState(cls?.capacity?.toString() || "30");
  const [active, setActive] = useState(cls ? cls.active : true);
  const [sortOrder, setSortOrder] = useState(cls?.sortOrder || 0);
  const [courseType, setCourseType] = useState(cls?.courseType || "");
  const [academicYearId, setAcademicYearId] = useState(yearId || "");

  const handleSubmit = async () => {
    if (!cls && !academicYearId) return toast.error('Selecciona un año académico');
    const url = cls ? `/api/admin/class-groups/${cls.id}` : `/api/admin/class-groups`;
    const method = cls ? "PUT" : "POST";
    const res = await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYearId: academicYearId || yearId, name, description, capacity: Number(capacity), active, sortOrder: Number(sortOrder), courseType: (courseType && courseType !== "none") ? courseType : null })
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
          {!cls && <div className="space-y-2"><Label>Año académico</Label><Select value={academicYearId} onValueChange={setAcademicYearId}><SelectTrigger><SelectValue placeholder="Selecciona un año">{(Array.isArray(years) ? years : []).find((item: any) => item.id === academicYearId)?.name ?? 'Selecciona un año'}</SelectValue></SelectTrigger><SelectContent>{(Array.isArray(years) ? years : []).filter((item: any) => item.active).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>}
          
          <div className="space-y-2">
            <Label>Curso / Departamento</Label>
            <Select value={courseType} onValueChange={setCourseType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo">{courseType && courseType !== 'none' ? courseType : 'Sin clasificar'}</SelectValue>
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

function EnrollmentDialog({ cls, mutate }: any) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const { data: characters } = useSWR(open ? '/api/admin/characters' : null, fetcher);
  const { data: canonCharacters } = useSWR(open ? '/api/admin/canon-characters' : null, fetcher);
  const options = [
    ...(Array.isArray(characters) ? characters : []).filter((item: any) => !item.canonCharacterId).map((item: any) => ({ value: `character:${item.id}`, label: item.name })),
    ...(Array.isArray(canonCharacters) ? canonCharacters : []).map((item: any) => ({ value: `canon:${item.id}`, label: `${item.name} (canon)` })),
  ].filter(option => !(Array.isArray(cls.students) ? cls.students : []).some((student: any) => option.value === `character:${student.characterId}` || option.value === `canon:${student.canonCharacterId}`));

  const enroll = async () => {
    const [kind, id] = selection.split(':');
    if (!kind || !id) return;
    try {
      await apiFetch('/api/admin/enrollments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classGroupId: cls.id, ...(kind === 'canon' ? { canonCharacterId: id } : { characterId: Number(id) }) }) });
      toast.success('Alumno matriculado'); setOpen(false); setSelection(''); await mutate();
    } catch (error: any) { toast.error(error.message || 'No se pudo matricular'); }
  };

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<button className="text-xs font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-1"><Plus className="size-3.5" /> Matricular alumno</button>} /><DialogContent><DialogHeader><DialogTitle>Matricular alumno en {cls.name}</DialogTitle></DialogHeader><div className="space-y-2"><Label>Personaje</Label><Select value={selection} onValueChange={setSelection}><SelectTrigger><SelectValue placeholder="Selecciona un personaje">{options.find(option => option.value === selection)?.label ?? 'Selecciona un personaje'}</SelectValue></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>{options.length === 0 && <p className="text-xs text-muted-foreground">No hay personajes disponibles para matricular.</p>}</div><DialogFooter><Button onClick={enroll} disabled={!selection}>Matricular</Button></DialogFooter></DialogContent></Dialog>;
}

function DeleteAction({ type, id, mutate }: { type: string, id: string, mutate: any }) {
  const [open, setOpen] = useState(false);
  const handleDelete = async () => {
    const res = await apiFetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Eliminado");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error || "No se pudo eliminar.");
    }
    setOpen(false);
  };
  
  return (
    <>
      <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este registro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
