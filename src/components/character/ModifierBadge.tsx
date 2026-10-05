import React from 'react';
import {
  BrainCircuit,
  HeartCrack,
  Shirt,
  Crosshair,
  FlaskConical,
  ChevronsDown,
  ChevronsUp,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAlteredStatusLabel } from '../../domain/mechanicalLabels';

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

export interface ActiveStatusItem {
  statusElementId: string;
  name?: string;
  tier?: string;
  remainingTurns?: number;
  expiresAt?: number;
}

export function getStatusDamageTypeColor(statusId: string = '') {
  const st = statusId.toLowerCase();
  if (st.includes('fuego') || st.includes('quemadura')) return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  if (st.includes('hielo') || st.includes('congelado')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  if (st.includes('electro')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
  if (st.includes('acido') || st.includes('veneno')) return 'bg-lime-500/20 text-lime-400 border-lime-500/40';
  if (st.includes('psiquico') || st.includes('mental') || st.includes('berserker') || st.includes('miedo') || st.includes('locura')) return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
  if (st.includes('sensorial') || st.includes('stun') || st.includes('aturdido') || st.includes('conmocion')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (st.includes('motor') || st.includes('inmovilizado') || st.includes('ralentizado') || st.includes('paralyzed')) return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  if (st.includes('anomalia') || st.includes('unstable') || st.includes('inestable')) return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
  if (st.includes('cortante') || st.includes('hemorragia')) return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export const AlteredStatusBadge: React.FC<{ status: ActiveStatusItem; className?: string }> = ({ status, className }) => {
  const label = status.name || getAlteredStatusLabel(status.tier ? `${status.statusElementId}_${status.tier}` : status.statusElementId);
  const colorClass = getStatusDamageTypeColor(status.statusElementId);
  const tierLabel = status.tier ? ` (${status.tier.charAt(0).toUpperCase() + status.tier.slice(1)})` : '';
  const turnsStr = status.remainingTurns ? ` · ${status.remainingTurns}t` : status.expiresAt ? ` · ${status.expiresAt}t` : '';

  return (
    <span
      title={`Estado Alterado: ${label}${tierLabel}${turnsStr}`}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none border transition-colors shrink-0 select-none",
        colorClass,
        className
      )}
    >
      <Flame className="size-3 shrink-0" aria-hidden="true" />
      <span>{label}{tierLabel}{turnsStr}</span>
    </span>
  );
};

export const AlteredStatusBadgeGroup: React.FC<{ statuses?: ActiveStatusItem[]; className?: string }> = ({ statuses = [], className }) => {
  if (!statuses || statuses.length === 0) return null;
  return (
    <div className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {statuses.map((st, idx) => (
        <AlteredStatusBadge key={`${st.statusElementId}-${idx}`} status={st} />
      ))}
    </div>
  );
};
