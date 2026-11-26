import type { LucideIcon } from "lucide-react";

export function RoleHero({ role, area, icon: Icon }: { role: string; area: string; icon: LucideIcon }) {
  return (
    <div className="mt-4 flex items-end justify-between bg-hero px-5 py-6 text-primary-foreground">
      <div className="min-w-0">
        <p className="text-sm opacity-80">Welcome,</p>
        <h1 className="truncate text-2xl font-extrabold">{role}</h1>
        <p className="text-sm opacity-80">{area}</p>
      </div>
      <Icon className="h-14 w-14 shrink-0 opacity-90" />
    </div>
  );
}
