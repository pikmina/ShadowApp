import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

export interface EntityPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'character' | 'shopItem' | 'technique' | 'job' | string;
  pattern?: 'dots' | 'grid' | 'diagonal' | 'radial' | 'none';
  accent?: 'accent1' | 'accent2' | 'accent3' | 'accent4' | 'default';
  glow?: boolean;
  cornerTicks?: boolean;
  title?: string;
  subtitle?: React.ReactNode;
  badge?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "border-border bg-card",
  character: "border-border bg-card",
  shopItem: "border-border bg-card",
  technique: "border-border bg-card",
  job: "border-border bg-card",
};

const patternColors: Record<string, string> = {
  accent1: 'color-mix(in srgb, var(--primary) 12%, transparent)',
  accent2: 'color-mix(in srgb, var(--indigo-400) 12%, transparent)',
  accent3: 'color-mix(in srgb, var(--teal-400) 12%, transparent)',
  accent4: 'color-mix(in srgb, var(--rose-400) 12%, transparent)',
  default: 'color-mix(in srgb, var(--foreground) 6%, transparent)',
};

const glowStyles: Record<string, string> = {
  accent1: 'shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_15%,transparent)]',
  accent2: 'shadow-[0_0_15px_color-mix(in_srgb,var(--indigo-400)_15%,transparent)]',
  accent3: 'shadow-[0_0_15px_color-mix(in_srgb,var(--teal-400)_15%,transparent)]',
  accent4: 'shadow-[0_0_15px_color-mix(in_srgb,var(--rose-400)_15%,transparent)]',
  default: 'shadow-[0_0_15px_color-mix(in_srgb,var(--foreground)_5%,transparent)]',
};

export const EntityPanel: React.FC<EntityPanelProps> = ({
  variant = 'default',
  pattern = 'none',
  accent = 'default',
  glow = false,
  cornerTicks = false,
  title,
  subtitle,
  badge,
  icon,
  children,
  className,
  ...props
}) => {
  const hasHeader = Boolean(title || subtitle || badge || icon);
  const patternColor = patternColors[accent] || patternColors.default;

  const renderPattern = () => {
    if (pattern === 'none') return null;

    return (
      <>
        {pattern === 'dots' && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${patternColor} 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />
        )}

        {pattern === 'grid' && (
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        {pattern === 'diagonal' && (
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-10"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 10px)`,
            }}
          />
        )}

        {pattern === 'radial' && (
          <div
            className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-10 border border-current pointer-events-none z-0"
            style={{
              backgroundImage: `radial-gradient(circle, transparent 35%, currentColor 36%, currentColor 38%, transparent 39%, transparent 60%, currentColor 61%, currentColor 63%, transparent 64%)`,
            }}
          />
        )}
      </>
    );
  };

  const renderTicks = () => {
    if (!cornerTicks) return null;
    return (
      <>
        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-foreground/20 pointer-events-none z-10" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-foreground/20 pointer-events-none z-10" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-foreground/20 pointer-events-none z-10" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-foreground/20 pointer-events-none z-10" />
      </>
    );
  };

  if (hasHeader) {
    return (
      <Card
        className={cn(
          "overflow-hidden border-border bg-card relative gap-0 py-0",
          variantStyles[variant] || "border-border bg-card",
          glow && glowStyles[accent],
          className
        )}
        {...props}
      >
        {renderPattern()}
        {renderTicks()}
        <CardHeader className="sm:p-5 pb-3 border-b border-border/50 relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && <div className="text-primary shrink-0">{icon}</div>}
              <div>
                {title && <CardTitle className="text-base font-oxanium text-foreground uppercase">{title}</CardTitle>}
                {subtitle && <CardDescription className="text-xs text-muted-foreground">{subtitle}</CardDescription>}
              </div>
            </div>
            {badge && <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-transparent">{badge}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 relative z-10">{children}</CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-border bg-card relative overflow-hidden gap-0 py-0",
        variantStyles[variant] || "border-border bg-card",
        glow && glowStyles[accent],
        className
      )}
      {...props}
    >
      {renderPattern()}
      {renderTicks()}
      {children}
    </Card>
  );
};
