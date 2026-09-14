import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Link } from 'react-router-dom';
import { EntityPanel } from '@/components/ui/entity-panel';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Library, Shield } from 'lucide-react';

export default function PublicRegistry() {
  const { data: canonCharacters, error } = useSWR('/api/public/canon-characters', fetcher);
  const [searchTerm, setSearchTerm] = useState('');

  if (error) {
    return <div className="p-8 text-center text-red-500">Error al cargar el registro.</div>;
  }

  if (!canonCharacters) {
    return <div className="p-8 text-center text-muted-foreground">Cargando registro...</div>;
  }

  const filtered = canonCharacters.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) && c.active !== false
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-col items-center justify-center text-center py-10">
        <Shield className="size-12 text-primary mb-4" />
        <h1 className="font-oxanium text-3xl font-bold uppercase tracking-widest text-foreground">Registro de Héroes y Villanos</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">Consulta la disponibilidad de personajes oficiales en el universo.</p>
      </div>

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
    </div>
  );
}
