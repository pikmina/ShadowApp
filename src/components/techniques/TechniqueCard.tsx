import React from 'react';
import { Shield, Target, Dices, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const TechniqueCard = ({ technique }: { technique: any }) => {
  return (
    <div className="bg-background border border-border rounded-md p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-primary uppercase text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> {technique.name || 'Técnica Desconocida'}
          <span className="text-muted-foreground text-[10px]">({technique.attribute || 'FUE'})</span>
        </h4>
        <Badge variant="outline" className="text-[9px]">{technique.level || 'Nivel 1 (Despertar)'}</Badge>
      </div>

      <div className="flex gap-2">
        <Badge variant="default" className="bg-primary/20 text-primary border-transparent text-[9px] px-1.5 py-0">
          {technique.cost || 3} ES
        </Badge>
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent text-[9px] px-1.5 py-0">
          {technique.type || 'OFENSIVA'}
        </Badge>
        <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 bg-indigo-400/10 text-[9px] px-1.5 py-0">
          VS {technique.vs || 'EVA'}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed break-words">
        {technique.description || 'Descripción de la técnica.'}
      </p>

      <div className="bg-muted/40 border-l-2 border-primary p-2 text-[10px] text-muted-foreground">
        <strong className="text-foreground">Mecánica:</strong> {technique.mechanic || 'Inflige daño.'}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-primary pt-2 border-t border-border/50">
        <span>EFECTO: {technique.effect || 'DAÑO 3D6'}</span>
        <Dices className="w-3 h-3 opacity-50" />
      </div>
    </div>
  );
};
