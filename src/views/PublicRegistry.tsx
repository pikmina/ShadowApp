import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { EntityPanel } from '@/components/ui/entity-panel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Library, Shield, Users, Clock, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PublicRegistry() {
  const [activeTab, setActiveTab] = useState<'canon' | 'employments' | 'classes' | 'players'>('canon');
  const { data: canonCharacters, error } = useSWR('/api/public/canon-characters', fetcher);
  const { data: fields } = useSWR('/api/sheet-fields', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [affiliationFilter, setAffiliationFilter] = useState('all');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const readProfile = (profile: Record<string, any> | undefined | null, keys: string[]) => {
    if (!profile) return undefined;
    for (const key of keys) {
      if (profile[key] !== undefined && profile[key] !== null && profile[key] !== '') return profile[key];
    }
    return undefined;
  };

  const getProfileValueByCoreKey = (profileData: any, coreKey: string, fallbacks: string[] = []) => {
    if (!profileData) return undefined;
    if (fields) {
      const field = fields.find((f: any) => f.coreKey === coreKey || fallbacks.includes(f.coreKey));
      if (field) {
         if (profileData[field.id] !== undefined && profileData[field.id] !== null && profileData[field.id] !== '') return profileData[field.id];
         if (profileData[`${field.id}_name`] !== undefined && profileData[`${field.id}_name`] !== null && profileData[`${field.id}_name`] !== '') return profileData[`${field.id}_name`];
      }
    }
    return readProfile(profileData, [coreKey, ...fallbacks]);
  };
  const affiliations = React.useMemo(() => {
    if (!canonCharacters) return [];
    return Array.from(new Set(canonCharacters.map((c: any) => getProfileValueByCoreKey(c.profileData, 'faction_group', ['group', 'grupo', 'faccion', 'facción', 'affiliation']) || c.affiliation).filter(Boolean)));
  }, [canonCharacters, fields]);

  const employments = React.useMemo(() => {
    if (!canonCharacters) return [];
    return Array.from(new Set(canonCharacters.flatMap((c: any) => c.employments?.map((e: any) => `${e.position.name} · ${e.institution.name}`) || []).filter(Boolean)));
  }, [canonCharacters]);

  const classes = React.useMemo(() => {
    if (!canonCharacters) return [];
    return Array.from(new Set(canonCharacters.map((c: any) => c.enrollment ? `${c.enrollment.academicYear.name} · ${c.enrollment.classGroup.name}` : null).filter(Boolean)));
  }, [canonCharacters]);

  if (error) {
    return <div className="p-8 text-center text-red-500">Error al cargar el registro: {error?.message || String(error)}</div>;
  }

  if (!canonCharacters) {
    return <div className="p-8 text-center text-muted-foreground">Cargando registro...</div>;
  }

  const filtered = canonCharacters.filter((c: any) => {
    if (c.active === false) return false;
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (affiliationFilter !== 'all' && (getProfileValueByCoreKey(c.profileData, 'faction_group', ['group', 'grupo', 'faccion', 'facción', 'affiliation']) || c.affiliation) !== affiliationFilter) return false;
    if (employmentFilter !== 'all') {
      const emps = c.employments?.map((e: any) => `${e.position.name} · ${e.institution.name}`) || [];
      if (!emps.includes(employmentFilter)) return false;
    }
    if (classFilter !== 'all') {
      const cls = c.enrollment ? `${c.enrollment.academicYear.name} · ${c.enrollment.classGroup.name}` : null;
      if (cls !== classFilter) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex justify-center mb-6">
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="flex-wrap justify-center">
            <TabsTrigger value="canon">Personajes Canon</TabsTrigger>
            <TabsTrigger value="players">Jugadores</TabsTrigger>
            <TabsTrigger value="employments">Empleos</TabsTrigger>
            <TabsTrigger value="classes">Clases</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col items-center justify-center text-center py-10">
        <Shield className="size-12 text-primary mb-4" />
        <h1 className="font-oxanium text-3xl font-bold uppercase tracking-widest text-foreground">Registro de Héroes y Villanos</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">Consulta la disponibilidad de personajes oficiales en el universo.</p>
      </div>

      {activeTab === 'canon' && (
        <>
          <div className="p-4 sm:p-5 bg-card/60 border border-border/80 rounded-lg space-y-3 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar personaje..."
                className="pl-9 w-full bg-background/70 border-border/50 focus:border-primary/50 text-xs h-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2.5 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-fit min-w-[140px] h-9 text-xs font-oxanium bg-background/70 border-border/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="occupied">Ocupado</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                </SelectContent>
              </Select>
              
              {affiliations.length > 0 && (
                <Select value={affiliationFilter} onValueChange={setAffiliationFilter}>
                  <SelectTrigger className="w-fit min-w-[160px] h-9 text-xs font-oxanium bg-background/70 border-border/50">
                    <SelectValue placeholder="Afiliación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las afiliaciones</SelectItem>
                    {affiliations.map(aff => (
                      <SelectItem key={aff as string} value={aff as string}>{aff as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {employments.length > 0 && (
                <Select value={employmentFilter} onValueChange={setEmploymentFilter}>
                  <SelectTrigger className="w-fit min-w-[160px] h-9 text-xs font-oxanium bg-background/70 border-border/50">
                    <SelectValue placeholder="Empleo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleos</SelectItem>
                    {employments.map(emp => (
                      <SelectItem key={emp as string} value={emp as string}>{emp as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {classes.length > 0 && (
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-fit min-w-[160px] h-9 text-xs font-oxanium bg-background/70 border-border/50">
                    <SelectValue placeholder="Clases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las clases</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls as string} value={cls as string}>{cls as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((c: any) => (
              <div key={c.id} className="group relative h-[340px] rounded-xl border border-border/50 overflow-hidden flex flex-col hover:border-primary/50 transition-all duration-300">
                {/* Background Image / Placeholder */}
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                    <Shield className="size-16 text-muted-foreground/20" />
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/10"></div>

                {/* Badge Top Right */}
                <div className="absolute top-4 right-4 z-20">
                  <Badge
                    variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'}
                    className={`uppercase text-[10px] font-bold tracking-wider px-2.5 py-1 ${c.status === 'available' ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-700/90 border-transparent' : c.status === 'occupied' ? 'bg-red-900/80 text-red-100 hover:bg-red-900/90 border-transparent' : 'bg-slate-800/90 text-slate-300 border-transparent backdrop-blur-sm'}`}
                  >
                    {c.status === 'available' ? 'DISPONIBLE' : c.status === 'occupied' ? 'OCUPADO' : 'RESERVADO'}
                  </Badge>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 p-5 h-full flex flex-col justify-end">
                  <div>
                    <h3 className="font-oxanium text-2xl font-bold text-white tracking-wide">{String(getProfileValueByCoreKey(c.profileData, 'basic_name', ['name', 'nombre']) || c.firstName || c.name).trim() + " " + String(getProfileValueByCoreKey(c.profileData, 'last_name', ['apellido']) || c.lastName || '').trim()}</h3>
                    
                    <div className="mt-1.5 text-cyan-400 text-sm font-medium">{getProfileValueByCoreKey(c.profileData, 'faction_group', ['group', 'grupo', 'faccion', 'facción', 'affiliation']) || c.affiliation || 'Sin afiliación'}</div>
                    {(getProfileValueByCoreKey(c.profileData, 'alias', ['hero_name']) || (Array.isArray(c.aliases) && c.aliases.length > 0 ? c.aliases.join(', ') : null)) && (
      <div className="text-slate-300/80 text-xs mt-0.5">AKA: {getProfileValueByCoreKey(c.profileData, 'alias', ['hero_name']) || c.aliases.join(', ')}</div>
  )}
  <div className="text-slate-400 text-xs mt-0.5">Quirk: {getProfileValueByCoreKey(c.profileData, 'quirk_name', ['quirkName', 'don_name', 'don']) || 'Sin don'}</div>
                    
                    {c.summary && <p className="text-sm text-slate-300 mt-4 leading-relaxed line-clamp-3">{c.summary}</p>}
                    
                    <div className="mt-4 space-y-1">
                      {Array.isArray(c.employments) && c.employments.length > 0 && (
                        <p className="text-xs text-slate-400/90 line-clamp-2">{c.employments.map((item: any) => `${item.position.name} · ${item.institution.name}`).join(' | ')}</p>
                      )}
                      {c.enrollment && (
                        <p className="text-xs text-slate-400/90">{c.enrollment.academicYear.name} · {c.enrollment.classGroup.name}</p>
                      )}
                    </div>
                  </div>
                  
                  {c.status === 'occupied' && c.linkedCharacterId && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end">
                      <Link to={`/sheet/${c.linkedCharacterId}`} target="_blank" rel="noopener noreferrer" className="text-xs font-oxanium text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest inline-flex items-center gap-1 font-bold">
                        Ver Ficha <span aria-hidden="true">&rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm font-oxanium">
                No se encontraron personajes con esos filtros.
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'players' && <PublicPlayers />}
      {activeTab === 'employments' && <PublicEmployments />}
      {activeTab === 'classes' && <PublicClasses />}
    </div>
  );
}

function PublicPlayers() {
  const { data, error, isLoading } = useSWR<any[]>('/api/public/players', fetcher);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'absent'>('all');

  if (isLoading) return <div className="text-center p-8 text-muted-foreground font-oxanium">Cargando jugadores...</div>;
  if (error) return <div className="text-center p-8 text-red-500 font-oxanium">Error al cargar jugadores: {error?.message || String(error)}</div>;

  const filtered = (data || []).filter((player: any) => {
    const activeChars = (player.characters || []).filter((c: any) => c.active !== false);
    if (activeChars.length === 0) return false;

    if (statusFilter !== 'all' && player.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchName = player.name?.toLowerCase().includes(q);
      const matchChar = activeChars.some((c: any) => c.name?.toLowerCase().includes(q));
      if (!matchName && !matchChar) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 bg-card/60 border border-border/80 rounded-lg mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[50%] w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar jugador o personaje..."
              className="pl-9 bg-background/70 border-border/50 focus:border-primary/50 text-xs h-9 w-full"
            />
          </div>
          <div className="w-full sm:w-48 shrink-0">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-full h-9 text-xs font-oxanium bg-background/70 border-border/50">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="absent">Ausente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm font-oxanium border border-border/40 rounded-lg bg-card/20">
          No se encontraron jugadores activos con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((player: any) => {
            const activeChars = (player.characters || []).filter((c: any) => c.active !== false);
            const isAbsent = player.status === 'absent';
            return (
              <EntityPanel key={player.id} pattern="dots" className="p-4 bg-black/40 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="size-4 text-primary shrink-0" />
                      <h3 className="font-oxanium font-bold text-base text-foreground truncate">{player.name}</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-oxanium uppercase tracking-wider shrink-0 ${
                        isAbsent
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {isAbsent ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" /> Ausente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="size-3" /> Activo
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="space-y-2 mt-2">
                    <p className="text-[11px] font-oxanium text-muted-foreground uppercase tracking-wider">
                      Personajes ({activeChars.length}):
                    </p>
                    <div className="space-y-1.5">
                      {activeChars.map((char: any) => (
                        <div
                          key={char.id}
                          className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0"></span>
                            <Link
                              to={`/sheet/${char.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground hover:text-primary transition-colors font-medium truncate"
                            >
                              {char.name}
                            </Link>
                          </div>
                          {char.canonCharacterId && (
                            <Badge variant="secondary" className="text-[9px] shrink-0 font-oxanium uppercase ml-2">
                              Canon
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </EntityPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}



function PublicEmployments() {
  const { data, error, isLoading } = useSWR('/api/public/employments', fetcher);
  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Cargando empleos...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error al cargar empleos</div>;

  return (
    <div className="space-y-8">
      {data?.map((inst: any) => (
        <div key={inst.id} className="border border-border bg-card p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-primary font-oxanium">{inst.name}</h2>
          {inst.description && <p className="text-muted-foreground mb-6">{inst.description}</p>}
          <div className="space-y-6">
            {inst.departments?.map((dep: any) => (
              <div key={dep.id} className="pl-4 border-l-2 border-primary/30">
                <h3 className="text-lg font-semibold text-foreground">{dep.name}</h3>
                {dep.description && <p className="text-sm text-muted-foreground mb-4">{dep.description}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {dep.positions?.map((pos: any) => (
                    <EntityPanel key={pos.id} pattern="grid" className="p-4 bg-black/40">
                      <div className="flex justify-between items-start mb-2 border-b border-border/50 pb-2">
                        <h4 className="font-oxanium font-bold text-primary">{pos.name}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {pos.occupiedSlots} / {pos.capacity === null ? '∞' : pos.capacity}
                        </Badge>
                      </div>
                      <div className="space-y-1 mt-3 text-sm">
                        {pos.occupants.length === 0 && <span className="text-muted-foreground text-xs italic">Vacante</span>}
                        {pos.occupants.map((occ: any) => (
                          <div key={occ.employmentId} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                            {occ.characterId ? (
                              <Link to={`/sheet/${occ.characterId}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors text-foreground">{occ.name}</Link>
                            ) : (
                              <span className="text-foreground">{occ.name}</span>
                            )}
                            {occ.canon && <Badge variant="secondary" className="text-[9px]">Canon</Badge>}
                          </div>
                        ))}
                      </div>
                    </EntityPanel>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const getCourseStyles = (courseType: string | null) => {
  if (!courseType) return { colorClass: 'text-primary', borderClass: 'border-border', bgClass: 'bg-primary/10', shortName: '' };
  const lower = courseType.toLowerCase();
  if (lower.includes('héroe') || lower.includes('heroico') || lower.includes('heróico')) return { colorClass: 'text-rose-400', borderClass: 'border-rose-400/30', bgClass: 'bg-rose-400/10', shortName: 'Héroes' };
  if (lower.includes('soporte')) return { colorClass: 'text-cyan-400', borderClass: 'border-cyan-400/30', bgClass: 'bg-cyan-400/10', shortName: 'Soporte' };
  if (lower.includes('general')) return { colorClass: 'text-emerald-400', borderClass: 'border-emerald-400/30', bgClass: 'bg-emerald-400/10', shortName: 'Generales' };
  if (lower.includes('gestión') || lower.includes('negocio')) return { colorClass: 'text-purple-400', borderClass: 'border-purple-400/30', bgClass: 'bg-purple-400/10', shortName: 'Gestión' };
  return { colorClass: 'text-primary', borderClass: 'border-border', bgClass: 'bg-primary/10', shortName: courseType };
};

function PublicClasses() {
  const { data, error, isLoading } = useSWR('/api/public/classes', fetcher);
  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Cargando clases...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error al cargar clases</div>;

  return (
    <div className="space-y-8">
      {data?.map((year: any) => (
        <div key={year.id} className="border border-border bg-card p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-primary font-oxanium">{year.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {year.classes?.map((cls: any) => {
              const styles = getCourseStyles(cls.courseType);
              return (
                <EntityPanel key={cls.id} pattern="dots" className="p-4 bg-black/40 h-full flex flex-col">
                  <div className="flex justify-between items-start border-b border-border/50 pb-2 mb-3">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-oxanium font-bold text-lg text-foreground leading-none">{cls.name}</h3>
                        {cls.courseType && cls.courseType !== 'none' && (
                          <Badge variant="outline" className={`text-[9px] uppercase tracking-wider ${styles.colorClass} ${styles.borderClass} ${styles.bgClass}`}>
                            {styles.shortName}
                          </Badge>
                        )}
                      </div>
                      {cls.description && <p className="text-xs text-muted-foreground mt-1.5">{cls.description}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cls.usedSlots} / {cls.capacity === 0 ? '0' : cls.capacity}
                    </Badge>
                  </div>
                  <div className="space-y-2 mt-2 flex-1">
                    {cls.students.length === 0 && <span className="text-muted-foreground text-xs italic">Sin alumnos inscritos</span>}
                    {cls.students.map((student: any) => (
                      <div key={student.enrollmentId} className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded">
                        {student.characterId ? <Link to={`/sheet/${student.characterId}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors text-foreground truncate mr-2">{student.name}</Link> : <span className="truncate mr-2 text-foreground">{student.name}</span>}
                        {student.canon && <Badge variant="secondary" className="text-[9px] shrink-0">Canon</Badge>}
                      </div>
                    ))}
                  </div>
                </EntityPanel>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
