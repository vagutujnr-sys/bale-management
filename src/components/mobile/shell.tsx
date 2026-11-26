import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import appIcon from "@/assets/leaf-appicon.png";
import { useIsMobileDevice } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function MobileDeviceGate({ children }: { children: ReactNode }) {
  const isMobileDevice = useIsMobileDevice();

  if (isMobileDevice === undefined) return null;
  if (!isMobileDevice) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <p>Reserved for mobile. Access this portal using your mobile device.</p>
      </main>
    );
  }

  return children;
}

/** Phone-sized frame on desktop, full-screen on mobile. */
export function DeviceFrame({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return (
    <div className="min-h-screen bg-field lg:flex lg:items-center lg:justify-center lg:gap-16 lg:p-8">
      {side && <aside className="hidden max-w-sm lg:block">{side}</aside>}
      <div className="relative mx-auto flex h-[100dvh] w-full flex-col overflow-hidden bg-background lg:h-[860px] lg:w-[400px] lg:rounded-lg lg:border-[10px] lg:border-device lg:shadow-device">
        {children}
      </div>
    </div>
  );
}

export function AppHeader({
  appName,
  onBell,
  unread,
}: {
  appName: string;
  onBell?: () => void;
  unread?: number;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5">
      <div className="flex items-center gap-3">
        <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
        <p className="text-sm font-bold leading-tight text-primary-deep">{appName}</p>
      </div>
      <button
        onClick={onBell}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-primary-deep hover:bg-muted"
      >
        <Bell className="h-6 w-6" />
        {!!unread && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
        )}
      </button>
    </div>
  );
}

export function SubHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_40px] items-center px-4 pt-5 pb-3">
      <button onClick={onBack} aria-label="Back" className="rounded-full p-2 hover:bg-muted">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="truncate text-center text-lg font-bold">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}

export interface Tab<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
}
export function BottomNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<T>[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <nav
      className="grid border-t bg-card"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const on = key === active;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex flex-col items-center gap-1 py-3 text-xs font-medium",
              on ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={on ? 2.5 : 2} />
            {label}
            {on && <span className="absolute bottom-0 h-0.5 w-10 rounded-full bg-primary" />}
          </button>
        );
      })}
    </nav>
  );
}

export function StatCard({
  icon: Icon,
  value,
  label,
  tone = "primary",
  onClick,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  tone?: "primary" | "gold" | "ember";
  onClick?: () => void;
}) {
  const toneCls = { primary: "text-primary", gold: "text-gold", ember: "text-ember" }[tone];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-card transition hover:border-primary/40"
    >
      <Icon className={cn("h-8 w-8 shrink-0", toneCls)} />
      <div className="min-w-0">
        <div className="truncate text-xl font-extrabold">{value}</div>
        <div className="text-xs leading-tight text-muted-foreground">{label}</div>
      </div>
    </button>
  );
}

const pillTones: Record<string, string> = {
  green: "bg-primary-soft text-primary",
  ember: "bg-ember-soft text-ember",
  gold: "bg-gold-soft text-gold",
  muted: "bg-muted text-muted-foreground",
};
export function Pill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: keyof typeof pillTones;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold",
        pillTones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-sm font-semibold text-primary">
          {action} ›
        </button>
      )}
    </div>
  );
}

export function SystemLink() {
  return (
    <Link to="/" className="text-sm font-semibold text-primary hover:underline">
      ← Farmer App home
    </Link>
  );
}
