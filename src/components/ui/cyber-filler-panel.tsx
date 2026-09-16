import React from 'react';
import { cn } from '@/lib/utils';

export interface CyberFillerPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  variant?: 'accent1' | 'accent2' | 'accent3' | 'accent4' | 'default';
  pattern?: 'dots' | 'grid' | 'diagonal' | 'none';
}

export const CyberFillerPanel: React.FC<CyberFillerPanelProps> = ({
  className,
  icon: Icon,
  title,
  subtitle,
  variant = 'default',
  pattern = 'dots',
  ...props
}) => {
  const variantStyles = {
    accent1: {
      border: 'border-border',
      text: 'text-primary',
      iconText: 'text-primary/30',
      bottomGlow: 'from-primary/20 via-primary/5 to-transparent',
      dotColor: 'rgba(48,149,111,0.12)',
    },
    accent2: {
      border: 'border-border',
      text: 'text-indigo-400',
      iconText: 'text-indigo-400/30',
      bottomGlow: 'from-indigo-400/20 via-indigo-400/5 to-transparent',
      dotColor: 'rgba(235,140,55,0.12)',
    },
    accent3: {
      border: 'border-border',
      text: 'text-teal-400',
      iconText: 'text-teal-400/30',
      bottomGlow: 'from-teal-400/20 via-teal-400/5 to-transparent',
      dotColor: 'rgba(45,212,191,0.12)',
    },
    accent4: {
      border: 'border-border',
      text: 'text-rose-400',
      iconText: 'text-rose-400/30',
      bottomGlow: 'from-rose-400/20 via-rose-400/5 to-transparent',
      dotColor: 'rgba(244,63,94,0.12)',
    },
    default: {
      border: 'border-border',
      text: 'text-muted-foreground',
      iconText: 'text-muted-foreground/20',
      bottomGlow: 'from-muted-foreground/10 via-transparent to-transparent',
      dotColor: 'rgba(255,255,255,0.06)',
    },
  };

  const styleConfig = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={cn(
        "flex-1 w-full bg-card/20 border p-6 flex flex-col items-center justify-center relative overflow-hidden select-none min-h-[140px] group transition-all font-mono",
        styleConfig.border,
        className
      )}
      {...props}
    >
      {/* Background Dots Pattern */}
      {pattern === 'dots' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${styleConfig.dotColor} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />
      )}

      {pattern === 'grid' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
      )}

      {pattern === 'diagonal' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 12px)`,
          }}
        />
      )}

      {/* Subtle bottom glow highlight */}
      <div 
        className={cn(
          "absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity",
          styleConfig.bottomGlow
        )} 
      />

      {/* Centered Content */}
      <div className="flex flex-col items-center justify-center text-center relative z-10 gap-2 opacity-40 group-hover:opacity-80 transition-opacity">
        {Icon && (
          <div className={cn("transition-transform group-hover:scale-110 duration-300", styleConfig.iconText)}>
            <Icon className="w-8 h-8 stroke-[1.5]" />
          </div>
        )}
        
        {(title || subtitle) && (
          <div className="flex flex-col items-center">
            {title && (
              <span className={cn("text-[10px] font-mono uppercase tracking-[0.25em] font-semibold leading-tight", styleConfig.text)}>
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground leading-tight mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Corner Tech Ticks */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-white/10" />
      <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-white/10" />
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-white/10" />
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-white/10" />
    </div>
  );
};
