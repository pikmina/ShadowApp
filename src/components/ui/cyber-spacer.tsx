import React from 'react';
import { cn } from '@/lib/utils';

export interface CyberSpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'line' | 'diamond' | 'brackets' | 'dots' | 'circuit' | 'hazard' | 'crosshair';
  accent?: 'accent1' | 'accent2' | 'accent3' | 'accent4' | 'default';
  glow?: boolean;
}

export const CyberSpacer: React.FC<CyberSpacerProps> = ({
  className,
  variant = 'line',
  accent = 'accent1',
  glow = false,
  ...props
}) => {
  const accentColors = {
    accent1: {
      border: 'border-primary/40',
      bg: 'bg-primary',
      text: 'text-primary',
      glow: 'shadow-[0_0_10px_rgba(48,149,111,0.5)]',
      gradient: 'from-transparent via-primary/60 to-transparent',
    },
    accent2: {
      border: 'border-indigo-400/40',
      bg: 'bg-indigo-400',
      text: 'text-indigo-400',
      glow: 'shadow-[0_0_10px_rgba(235,140,55,0.5)]',
      gradient: 'from-transparent via-indigo-400/60 to-transparent',
    },
    accent3: {
      border: 'border-accent3/40',
      bg: 'bg-accent3',
      text: 'text-accent3',
      glow: 'shadow-[0_0_10px_rgba(45,212,191,0.5)]',
      gradient: 'from-transparent via-accent3/60 to-transparent',
    },
    accent4: {
      border: 'border-accent4/40',
      bg: 'bg-accent4',
      text: 'text-accent4',
      glow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]',
      gradient: 'from-transparent via-accent4/60 to-transparent',
    },
    default: {
      border: 'border-border',
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      glow: 'shadow-none',
      gradient: 'from-transparent via-border to-transparent',
    },
  };

  const current = accentColors[accent] || accentColors.accent1;

  if (variant === 'diamond') {
    return (
      <div className={cn("w-full flex items-center justify-center gap-3 my-3 select-none", className)} {...props}>
        <div className={cn("flex-1 h-px bg-gradient-to-r from-transparent to-border", current.border)} />
        <div className={cn("w-2 h-2 rotate-45 border shrink-0", current.border, current.bg, glow && current.glow)} />
        <div className={cn("w-1.5 h-1.5 rotate-45 border shrink-0 opacity-60", current.border)} />
        <div className={cn("w-2 h-2 rotate-45 border shrink-0", current.border, current.bg, glow && current.glow)} />
        <div className={cn("flex-1 h-px bg-gradient-to-l from-transparent to-border", current.border)} />
      </div>
    );
  }

  if (variant === 'brackets') {
    return (
      <div className={cn("w-full flex items-center justify-between my-2 text-[10px] font-mono select-none opacity-70 hover:opacity-100 transition-opacity", current.text, className)} {...props}>
        <span className="tracking-tighter">[ ── +</span>
        <div className={cn("flex-1 mx-3 h-px bg-gradient-to-r", current.gradient)} />
        <span className="tracking-tighter">+ ── ]</span>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn("w-full flex items-center justify-center gap-1.5 my-2.5 select-none", className)} {...props}>
        <div className={cn("flex-1 h-px bg-border/60")} />
        <span className={cn("w-1 h-1 rounded-full", current.bg)} />
        <span className={cn("w-1.5 h-1.5 rounded-full", current.bg, glow && current.glow)} />
        <span className={cn("w-1 h-1 rounded-full", current.bg)} />
        <div className={cn("flex-1 h-px bg-border/60")} />
      </div>
    );
  }

  if (variant === 'circuit') {
    return (
      <div className={cn("w-full relative h-4 my-2 flex items-center select-none overflow-hidden", className)} {...props}>
        <div className={cn("w-full h-px bg-border")} />
        <div className={cn("absolute left-1/4 -translate-y-1/2 top-1/2 flex items-center gap-1 bg-background px-1", current.text)}>
          <div className={cn("w-1.5 h-1.5 rounded-full border", current.border, current.bg)} />
          <div className={cn("w-6 h-px", current.bg)} />
          <div className={cn("w-1 h-1 rotate-45 border", current.border)} />
        </div>
        <div className={cn("absolute right-1/4 -translate-y-1/2 top-1/2 flex items-center gap-1 bg-background px-1", current.text)}>
          <div className={cn("w-1 h-1 rotate-45 border", current.border)} />
          <div className={cn("w-6 h-px", current.bg)} />
          <div className={cn("w-1.5 h-1.5 rounded-full border", current.border, current.bg)} />
        </div>
      </div>
    );
  }

  if (variant === 'hazard') {
    return (
      <div 
        className={cn("w-full h-2 rounded-xs my-2 border border-border/50 opacity-40 hover:opacity-80 transition-opacity", className)}
        style={{
          backgroundImage: 'repeating-linear-gradient(-45deg, var(--muted), var(--muted) 4px, transparent 4px, transparent 8px)',
        }}
        {...props}
      />
    );
  }

  if (variant === 'crosshair') {
    return (
      <div className={cn("w-full flex items-center justify-between my-2 select-none", current.text, className)} {...props}>
        <div className={cn("w-2 h-2 border-l border-t", current.border)} />
        <div className={cn("flex-1 mx-2 h-px bg-gradient-to-r", current.gradient)} />
        <div className={cn("w-1.5 h-1.5 border rotate-45", current.border, current.bg)} />
        <div className={cn("flex-1 mx-2 h-px bg-gradient-to-r", current.gradient)} />
        <div className={cn("w-2 h-2 border-r border-t", current.border)} />
      </div>
    );
  }

  // Default: line
  return (
    <div
      className={cn(
        "w-full h-px my-3 relative overflow-hidden bg-border/60",
        glow && current.glow,
        className
      )}
      {...props}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r animate-pulse", current.gradient)} />
    </div>
  );
};
