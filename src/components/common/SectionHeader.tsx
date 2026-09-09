import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function SectionHeader({ title, description, icon: Icon, actions }: { title: string; description: string; icon: LucideIcon; actions?: ReactNode }) {
  return (
    <header className="admin-section-header">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></div>
        <div className="min-w-0"><h1 className="font-oxanium text-2xl font-semibold tracking-tight text-foreground">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
