import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title, description, icon: Icon, action,
}: { title: string; description?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-5 mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-11 w-11 rounded-md bg-primary/10 text-primary grid place-items-center">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
