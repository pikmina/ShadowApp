import React from 'react';
import { cn } from '@/lib/utils';

export interface CyberModuleProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  glow?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  text?: React.ReactNode;
  variant?: 'accent1' | 'accent2' | 'accent3' | 'accent4' | 'destructive' | 'default';
  pattern?: 'diagonal' | 'radial' | 'dots' | 'grid' | 'none';
  showTelemetry?: boolean;
}

export const CyberModule: React.FC<CyberModuleProps> = ({
  className,
  glow = false,
  icon: Icon,
  title,
  subtitle,
  text,
  variant = 'default',
  pattern = 'diagonal',
  showTelemetry = true,
  ...props
}) => {
  // Color style configuration
  const colorMap = {
    accent1: {
      border: 'border-primary/30 hover:border-primary/60',
      bg: 'bg-primary/5',
      text: 'text-primary',
      glow: 'shadow-[0_0_12px_rgba(48,149,111,0.2)]',
      bar: 'bg-primary',
      dot: 'bg-primary',
      iconBox: 'bg-primary/10 border-primary/30 text-primary',
    },
    accent2: {
      border: 'border-indigo-400/30 hover:border-indigo-400/60',
      bg: 'bg-indigo-400/5',
      text: 'text-indigo-400',
      glow: 'shadow-[0_0_12px_rgba(235,140,55,0.2)]',
      bar: 'bg-indigo-400',
      dot: 'bg-indigo-400',
      iconBox: 'bg-indigo-400/10 border-indigo-400/30 text-indigo-400',
    },
    accent3: {
      border: 'border-teal-400/30 hover:border-teal-400/60',
      bg: 'bg-teal-400/5',
      text: 'text-teal-400',
      glow: 'shadow-[0_0_12px_rgba(45,212,191,0.2)]',
      bar: 'bg-teal-400',
      dot: 'bg-teal-400',
      iconBox: 'bg-teal-400/10 border-teal-400/30 text-teal-400',
    },
    accent4: {
      border: 'border-rose-400/30 hover:border-rose-400/60',
      bg: 'bg-rose-400/5',
      text: 'text-rose-400',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.2)]',
      bar: 'bg-rose-400',
      dot: 'bg-rose-400',
      iconBox: 'bg-rose-400/10 border-rose-400/30 text-rose-400',
    },
    destructive: {
      border: 'border-destructive/40 hover:border-destructive/70',
      bg: 'bg-destructive/10',
      text: 'text-destructive',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
      bar: 'bg-destructive',
      dot: 'bg-destructive',
      iconBox: 'bg-destructive/15 border-destructive/40 text-destructive',
    },
    default: {
      border: 'border-border hover:border-muted-foreground/40',
      bg: 'bg-muted/40',
      text: 'text-muted-foreground',
      glow: 'shadow-none',
      bar: 'bg-muted-foreground',
      dot: 'bg-emerald-400',
      iconBox: 'bg-background/80 border-border text-muted-foreground',
    },
  };

  const styleConfig = colorMap[variant] || colorMap.default;

  // Content normalization
  const mainTitle = title || (text && typeof text === 'string' ? text.split('\n')[0] : text);
  const subTitle = subtitle || (text && typeof text === 'string' && text.includes('\n') ? text.split('\n').slice(1).join(' ') : null);

  return (
    <div
      className={cn(
        "w-full border p-2.5 flex items-center justify-between relative overflow-hidden rounded-md my-2 transition-all group select-none font-oxanium",
        styleConfig.bg,
        styleConfig.border,
        glow && styleConfig.glow,
        className
      )}
      {...props}
    >
      {/* Background Decorative Pattern */}
      {pattern === 'diagonal' && (
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 8px)`,
          }}
        />
      )}
      {pattern === 'dots' && (
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />
      )}
      {pattern === 'radial' && (
        <div 
          className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.08] border border-current pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, transparent 40%, currentColor 41%, currentColor 43%, transparent 44%)`,
          }}
        />
      )}
      {pattern === 'grid' && (
        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />
      )}

      {/* Left: Icon & Text content */}
      <div className="flex items-center gap-2.5 relative z-10 min-w-0">
        {Icon && (
          <div className={cn(
            "p-1.5 rounded border shrink-0 flex items-center justify-center transition-transform group-hover:scale-105",
            styleConfig.iconBox
          )}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          {mainTitle && (
            <span className={cn(
              "text-[10px] uppercase font-bold tracking-widest leading-tight truncate",
              styleConfig.text
            )}>
              {mainTitle}
            </span>
          )}
          {subTitle && (
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 leading-tight truncate mt-0.5">
              {subTitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: Futuristic telemetry graphics */}
      {showTelemetry && (
        <div className="flex items-center gap-2 relative z-10 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Equalizer bars */}
          <div className="flex items-end gap-0.5 h-3.5">
            <span className={cn("w-0.5 h-1.5 rounded-xs", styleConfig.bar)} />
            <span className={cn("w-0.5 h-3 rounded-xs animate-pulse", styleConfig.bar)} />
            <span className={cn("w-0.5 h-2 rounded-xs", styleConfig.bar)} />
            <span className={cn("w-0.5 h-3.5 rounded-xs", styleConfig.bar)} />
            <span className={cn("w-0.5 h-2.5 rounded-xs animate-pulse", styleConfig.bar)} />
          </div>

          {/* Live indicator dot */}
          <span className="relative flex h-2 w-2 ml-1">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", styleConfig.dot)} />
            <span className={cn("relative inline-flex rounded-full h-2 w-2", styleConfig.dot)} />
          </span>
        </div>
      )}

      {/* Top-right corner tech tick */}
      <div className={cn("absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 opacity-50", styleConfig.border)} />
      {/* Bottom-left corner tech tick */}
      <div className={cn("absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 opacity-50", styleConfig.border)} />
    </div>
  );
};
