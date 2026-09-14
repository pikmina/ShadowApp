import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { EntityPanel } from '@/components/ui/entity-panel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Library, Shield } from 'lucide-react';

export default function PublicRegistry() {
  const [activeTab, setActiveTab] = useState<'canon' | 'employments' | 'classes'>('canon');
  const { data: canonCharacters, error } = useSWR('/api/public/canon-characters', fetcher);
  const [searchTerm, setSearchTerm] = useState('');

  if (error) {
    return <div className="p-8 text-center text-red-500">Error al cargar el registro: {error?.message || String(error)}</div>;
  }

  if (!canonCharacters) {
    return <div className="p-8 text-center text-muted-foreground">Cargando registro...</div>;
  }

  const filtered = canonCharacters.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) && c.active !== false
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => setActiveTab('canon')} className={`px-4 py-2 font-oxanium text-sm uppercase tracking-wider ${activeTab === 'canon' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Personajes Canon</button>
        <button onClick={() => setActiveTab('employments')} className={`px-4 py-2 font-oxanium text-sm uppercase tracking-wider ${activeTab === 'employments' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Empleos</button>
        <button onClick={() => setActiveTab('classes')} className={`px-4 py-2 font-oxanium text-sm uppercase tracking-wider ${activeTab === 'classes' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>Clases</button>
      </div>
      <div className="flex flex-col items-center justify-center text-center py-10">
        <Shield className="size-12 text-primary mb-4" />
        <h1 className="font-oxanium text-3xl font-bold uppercase tracking-widest text-foreground">Registro de Héroes y Villanos</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">Consulta la disponibilidad de personajes oficiales en el universo.</p>
      </div>

      {activeTab === 'canon' && (
        <>
          <div className="flex items-center gap-2 max-w-sm mx-auto mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar personaje..."
                className="pl-9 bg-background/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c: any) => (
              <EntityPanel key={c.id} pattern="dots" className="relative p-5 bg-black/40 border-border/50 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-oxanium text-lg font-bold text-foreground">{c.name}</h3>
                  <Badge
                    variant={c.status === 'available' ? 'default' : c.status === 'occupied' ? 'destructive' : 'secondary'}
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {c.status === 'available' ? 'Disponible' : c.status === 'occupied' ? 'Ocupado' : 'Reservado'}
                  </Badge>
                </div>
                {c.status === 'occupied' && c.linkedCharacterId && (
                  <div className="mt-4 pt-4 border-t border-border/50 text-right">
                    <Link to={`/sheet/${c.linkedCharacterId}`} className="text-xs font-oxanium text-primary hover:underline uppercase tracking-wide">
                      Ver Ficha →
                    </Link>
                  </div>
                )}
              </EntityPanel>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm font-oxanium">
                No se encontraron personajes canon con ese nombre.
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === 'employments' && <PublicEmployments />}
      {activeTab === 'classes' && <PublicClasses />}
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
                            <Link to={`/sheet/${occ.characterId}`} className="hover:text-primary transition-colors text-foreground">
                              {occ.name} {occ.canon ? <span className="text-xs text-muted-foreground">({occ.canon.name})</span> : ''}
                            </Link>
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

function PublicClasses() {
  const { data, error, isLoading } = useSWR('/api/public/classes', fetcher);
  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Cargando clases...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error al cargar clases</div>;

  return (
    <div className="space-y-8">
      {data?.map((year: any) => (
        <div key={year.id} className="border border-border bg-card p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-primary font-oxanium">{year.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {year.classes?.map((cls: any) => (
              <EntityPanel key={cls.id} pattern="dots" className="p-4 bg-black/40 h-full flex flex-col">
                <div className="flex justify-between items-start border-b border-border/50 pb-2 mb-3">
                  <div>
                    <h3 className="font-oxanium font-bold text-lg text-foreground">{cls.name}</h3>
                    {cls.description && <p className="text-xs text-muted-foreground mt-1">{cls.description}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {cls.usedSlots} / {cls.capacity === 0 ? '0' : cls.capacity}
                  </Badge>
                </div>
                <div className="space-y-2 mt-2 flex-1">
                  {cls.students.length === 0 && <span className="text-muted-foreground text-xs italic">Sin alumnos inscritos</span>}
                  {cls.students.map((student: any) => (
                    <div key={student.enrollmentId} className="flex items-center justify-between text-sm bg-muted/20 p-2 rounded">
                      <Link to={`/sheet/${student.characterId}`} className="hover:text-primary transition-colors text-foreground truncate mr-2">
                        {student.name}
                      </Link>
                      {student.canon && <Badge variant="secondary" className="text-[9px] shrink-0">Canon</Badge>}
                    </div>
                  ))}
                </div>
              </EntityPanel>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
