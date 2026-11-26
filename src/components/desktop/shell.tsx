import { Link } from "@tanstack/react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import appIcon from "@/assets/leaf-appicon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPhonePin } from "@/lib/account-auth";
import { cn } from "@/lib/utils";

export interface NavItem<T extends string> { key: T; label: string; icon: LucideIcon }

/** Desktop sidebar layout used by Admin and Workstation. */
export function DesktopShell<T extends string>({ appName, nav, active, onNav, user, onLogout, children }: { appName: string; nav: NavItem<T>[]; active: T; onNav: (k: T) => void; user: string; onLogout: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={appIcon} alt="" className="h-9 w-9 object-contain" />
          <div className="min-w-0"><p className="truncate text-sm font-bold text-primary-deep">{appName}</p><p className="text-xs text-muted-foreground">Bale Contract System</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ key, label, icon: I }) => (
            <button key={key} onClick={() => onNav(key)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium", active === key ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-sidebar-accent")}>
              <I className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4 text-sm">
          <p className="font-semibold">{user}</p>
          <button onClick={onLogout} className="mt-2 flex items-center gap-2 text-ember"><LogOut className="h-4 w-4" /> Logout</button>
          <Link to="/" className="mt-3 block text-xs text-muted-foreground hover:underline">← Farmer App home</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 overflow-x-auto border-b bg-card p-2 md:hidden">
          {nav.map(({ key, label }) => (
            <button key={key} onClick={() => onNav(key)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", active === key ? "bg-primary text-primary-foreground" : "bg-muted")}>{label}</button>
          ))}
        </div>
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="min-w-0"><h1 className="truncate text-2xl font-extrabold text-primary-deep">{title}</h1>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      {title && <h2 className="mb-4 font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function DesktopLogin({ appName, onSignIn }: { appName: string; onSignIn: () => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const profile = await signInWithPhonePin(phone, pin, "staff");
      if (profile.status === "unlinked") {
        setError("This account is not linked to a staff profile. Contact an administrator.");
        return;
      }
      onSignIn();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-hero p-12 text-primary-foreground lg:flex">
        <Link to="/" className="text-sm opacity-80 hover:underline">← Farmer App home</Link>
        <div><p className="opacity-80">Bale Contract System</p><h1 className="text-5xl font-extrabold">{appName}</h1></div>
        <p className="text-sm opacity-70">Staff accounts are created by an administrator. Sign in with your mobile number and PIN.</p>
      </div>
      <div className="flex items-center justify-center bg-field p-6">
        <form onSubmit={(event) => void submit(event)} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-card">
          <img src={appIcon} alt="Bale Contract System" className="mx-auto h-14 w-14 object-contain" />
          <h2 className="text-center text-lg font-bold lg:hidden">{appName}</h2>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Mobile number</span><Input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Six-digit PIN</span><Input type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={(e) => setPin(e.target.value)} required /></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}
