import React from 'react';
import {
  BrainCircuit,
  HeartCrack,
  Shirt,
  Crosshair,
  FlaskConical,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModifierSource {
  name: string;
  amount: number;
  kind?: string;
}

export function getModifierIcon(kind?: string, amount: number = 0) {
  const k = (kind || '').toLowerCase().trim();
  if (k === 'trait' || k === 'rasgo' || k === 'traits' || k === 'rasgos') return BrainCircuit;
  if (k === 'weakness' || k === 'debilidad' || k === 'weaknesses' || k === 'debilidades') return HeartCrack;
  if (['equipment', 'weapon', 'armor', 'gear', 'item_equipment', 'equipo', 'item', 'objeto'].includes(k)) return Shirt;
  if (['technique', 'tecnica', 'técnica', 'skill', 'habilidad'].includes(k)) return Crosshair;
  if (['consumable', 'potion', 'pocion', 'poción', 'flask', 'consumible'].includes(k)) return FlaskConical;
  return amount < 0 ? ChevronsDown : ChevronsUp;
}

export function getModifierColor(kind?: string, amount: number = 0) {
  const k = (kind || '').toLowerCase().trim();
  if (k === 'trait' || k === 'rasgo' || k === 'traits' || k === 'rasgos') {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
  if (k === 'weakness' || k === 'debilidad' || k === 'weaknesses' || k === 'debilidades') {
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
  if (['equipment', 'weapon', 'armor', 'gear', 'item_equipment', 'equipo', 'item', 'objeto'].includes(k)) {
    return amount >= 0
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
  if (['technique', 'tecnica', 'técnica', 'skill', 'habilidad'].includes(k)) {
    return amount >= 0
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
  if (['consumable', 'potion', 'pocion', 'poción', 'flask', 'consumible'].includes(k)) {
    return amount >= 0
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }
  if (k === 'upgrade' || k === 'mejora') {
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  }
  return amount >= 0
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/30';
}

interface ModifierBadgeProps {
  source: ModifierSource;
  className?: string;
}

export const ModifierBadge: React.FC<ModifierBadgeProps> = ({ source, className }) => {
  const Icon = getModifierIcon(source.kind, source.amount);
  const colorClass = getModifierColor(source.kind, source.amount);
  const formattedAmount = source.amount > 0 ? `+${source.amount}` : String(source.amount);
  const titleText = `${source.name || 'Modificador'} ${formattedAmount}`;

  return (
    <span
      title={titleText}
      aria-label={titleText}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none border transition-colors cursor-help shrink-0 select-none",
        colorClass,
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>{formattedAmount}</span>
    </span>
  );
};

interface ModifierBadgeGroupProps {
  sources?: ModifierSource[];
  className?: string;
}

export const ModifierBadgeGroup: React.FC<ModifierBadgeGroupProps> = ({ sources = [], className }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {sources.map((source, idx) => (
        <ModifierBadge key={`${source.name}-${source.kind}-${source.amount}-${idx}`} source={source} />
      ))}
    </div>
  );
};

interface ModifierNotesLegendProps {
  className?: string;
}

export const ModifierNotesLegend: React.FC<ModifierNotesLegendProps> = ({ className }) => {
  const items = [
    { icon: BrainCircuit, label: 'Rasgos', color: 'text-emerald-400' },
    { icon: HeartCrack, label: 'Debilidades', color: 'text-rose-400' },
    { icon: Shirt, label: 'Equipo', color: 'text-purple-400' },
    { icon: Crosshair, label: 'Técnica', color: 'text-blue-400' },
    { icon: FlaskConical, label: 'Consumible', color: 'text-amber-400' },
    { icon: ChevronsUp, label: 'Bonificadores', color: 'text-cyan-400' },
    { icon: ChevronsDown, label: 'Penalizadores', color: 'text-rose-400' },
  ];

  return (
    <div className={cn("pt-2 pb-1 text-[10px] text-text2/70 font-mono select-none", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[9px] uppercase tracking-widest font-bold text-text1/60">
          // Leyenda de iconos:
        </span>
        {items.map((it, idx) => {
          const Icon = it.icon;
          return (
            <div key={idx} className="flex items-center gap-1 shrink-0">
              <Icon className={cn("size-3", it.color)} aria-hidden="true" />
              <span className="text-text2/80">{it.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
