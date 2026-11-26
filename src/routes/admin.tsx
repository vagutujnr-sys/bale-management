import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Banknote, Building2, Check, DoorOpen, ExternalLink, FileSignature, LayoutDashboard, Monitor, Plus, Settings, ShieldCheck, Truck, Users, Warehouse } from "lucide-react";
import { DesktopLogin, DesktopShell, PageTitle, Panel, type NavItem } from "@/components/desktop/shell";
import { Pill } from "@/components/mobile/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contracts, defaultRoleApplications, financeSheets, roles, staffApplications, users as seedUsers, weeklyIntake, type AppUser, type StaffApplicationKey } from "@/data/ops";
import { money } from "@/data/mock";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Main Administration — Bale Contract System" },
      { name: "description", content: "Manage tobacco-system users, roles, season settings and operational performance." },
      { property: "og:title", content: "Main Administration — Bale Contract System" },
      { property: "og:description", content: "Company-wide dashboard, users, roles and settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminApp,
});

type Screen = "dashboard" | "applications" | "users" | "roles" | "settings";
const nav: NavItem<Screen>[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "applications", label: "Applications", icon: ExternalLink },
  { key: "users", label: "Users", icon: Users },
  { key: "roles", label: "Roles & permissions", icon: ShieldCheck },
  { key: "settings", label: "System settings", icon: Settings },
];
const applicationIcons = {
  contracting: FileSignature,
  gate: DoorOpen,
  transport: Truck,
  quality: Check,
  finance: Banknote,
  warehouse: Warehouse,
  workstation: Monitor,
  admin: LayoutDashboard,
} satisfies Record<StaffApplicationKey, typeof LayoutDashboard>;

function AdminApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [userList, setUserList] = useState<AppUser[]>(seedUsers);
  const [roleApplications, setRoleApplications] = useState(defaultRoleApplications);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", role: "Contracting Officer" });
  const [settings, setSettings] = useState({ company: "Bale Tobacco Company", season: "2026", floor: "Harare Floors", currency: "USD" });
  const [message, setMessage] = useState("");
  if (!signedIn) return <DesktopLogin appName="Main Administration" onSignIn={() => setSignedIn(true)} />;

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedApps = (roleApplications[draft.role] ?? []).map((key) => staffApplications.find((app) => app.key === key)?.name ?? key);
    setUserList((current) => [...current, { id: `U-${String(current.length + 1).padStart(2, "0")}`, ...draft, apps: assignedApps, active: true }]);
    setDraft({ name: "", email: "", role: "Contracting Officer" });
    setAdding(false);
    setMessage("User added for this session. No invitation email was sent.");
  };
  const totalIntake = weeklyIntake.reduce((sum, d) => sum + d.bales, 0);
  const gross = financeSheets.reduce((sum, s) => sum + s.gross, 0);

  return <DesktopShell appName="Main Administration" nav={nav} active={screen} onNav={setScreen} user="Grace Mhlanga" onLogout={() => setSignedIn(false)}>
    {screen === "dashboard" && <>
      <PageTitle title="Season overview" sub="Harare Floors • 2026 buying season • Operational data is not connected" action={<Pill tone="muted">Connection required</Pill>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Active contracts", value: contracts.filter((c) => c.status === "Active").length, icon: FileSignature }, { label: "Bales this week", value: totalIntake.toLocaleString(), icon: Warehouse }, { label: "Sales-sheet value", value: money(gross), icon: Activity }, { label: "Active system users", value: userList.filter((u) => u.active).length, icon: Users }].map(({ label, value, icon: Icon }) => <Panel key={label}><div className="flex items-center gap-4"><span className="rounded-2xl bg-primary-soft p-3 text-primary"><Icon /></span><div><p className="text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></div></Panel>)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Weekly bale intake">
          <div className="flex h-64 items-end gap-3 border-b pb-1">{weeklyIntake.map((d) => <div key={d.day} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><p className="text-xs font-semibold">{d.bales.toLocaleString()}</p><div className="mx-auto w-full max-w-12 rounded-t-lg bg-primary" style={{ height: `${Math.round(d.bales / 14)}%` }} /><p className="text-xs text-muted-foreground">{d.day}</p></div>)}</div>
          <p className="mt-4 text-sm text-muted-foreground">Friday is the busiest intake day, with 1,380 bales received.</p>
        </Panel>
        <Panel title="Operational snapshot"><div className="space-y-3">{[
          ["Contracts awaiting approval", contracts.filter((c) => c.status === "Pending").length, "gold"],
          ["Sales sheets awaiting approval", financeSheets.filter((s) => s.status === "Awaiting Approval").length, "ember"],
          ["Approved sheets ready to pay", financeSheets.filter((s) => s.status === "Approved").length, "green"],
        ].map(([label, value, color]) => <div key={String(label)} className="flex items-center justify-between rounded-xl bg-muted p-3"><span className="text-sm">{label}</span><Pill tone={color as "gold" | "ember" | "green"}>{value}</Pill></div>)}</div></Panel>
      </div>
    </>}
    {screen === "applications" && <>
      <PageTitle title="Staff applications" sub="Choose which tools to share by role. Farmers use the separate Farmer App." />
      <p className="mb-5 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Access shown here follows each role's application assignments. Changes last for this session only and are not saved.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staffApplications.map((app) => {
          const Icon = applicationIcons[app.key];
          const assignedRoles = roles.filter((role) => roleApplications[role.name]?.includes(app.key));
          return (
            <Panel key={app.key}>
              <span className="mb-4 inline-flex rounded-xl bg-primary-soft p-3 text-primary"><Icon /></span>
              <h2 className="font-bold">{app.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-muted-foreground">{app.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shared with</p>
              <div className="mt-2 flex min-h-8 flex-wrap gap-2">
                {assignedRoles.length
                  ? assignedRoles.map((role) => <Pill key={role.name}>{role.name}</Pill>)
                  : <span className="text-sm text-muted-foreground">No roles assigned</span>}
              </div>
              <a href={app.route} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                Open application <ExternalLink className="h-4 w-4" />
              </a>
            </Panel>
          );
        })}
      </div>
    </>}
    {screen === "users" && <>
      <PageTitle title="Users" sub="See each user's role-based application access." action={<Button onClick={() => setAdding(!adding)}><Plus /> Add user</Button>} />
      {message && <p role="status" className="mb-4 rounded-xl bg-primary-soft p-3 text-sm text-primary">{message}</p>}
      {adding && <Panel title="Add user" className="mb-5"><form onSubmit={addUser} className="grid gap-4 md:grid-cols-4"><Input aria-label="Full name" placeholder="Full name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><Input aria-label="Email address" type="email" placeholder="Email address" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /><select aria-label="User role" className="rounded-md border bg-background px-3 text-sm" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>{roles.map((r) => <option key={r.name}>{r.name}</option>)}</select><Button type="submit">Add user</Button></form></Panel>}
      <Panel><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{["User", "Role", "Applications", "Status", "Access"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{userList.map((u) => { const userApps = (roleApplications[u.role] ?? []).map((key) => staffApplications.find((app) => app.key === key)?.name ?? key); return <tr key={u.id}><td className="px-3 py-4"><p className="font-semibold">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></td><td className="px-3 py-4">{u.role}</td><td className="px-3 py-4">{userApps.join(", ") || "No applications assigned"}</td><td className="px-3 py-4"><Pill tone={u.active ? "green" : "muted"}>{u.active ? "Active" : "Disabled"}</Pill></td><td className="px-3 py-4"><Button size="sm" variant="outline" onClick={() => setUserList((current) => current.map((item) => item.id === u.id ? { ...item, active: !item.active } : item))}>{u.active ? "Disable" : "Enable"}</Button></td></tr>; })}</tbody></table></div></Panel>
    </>}
    {screen === "roles" && <>
      <PageTitle title="Roles & permissions" sub="Set which applications each team role can access." />
      <p className="mb-5 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
        Application assignments apply to every user with that role. Changes last for this session only and are not saved.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Panel key={role.name}>
            <span className="mb-4 inline-flex rounded-xl bg-primary-soft p-3 text-primary"><ShieldCheck /></span>
            <h2 className="font-bold">{role.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{role.perms} assigned permissions</p>
            <fieldset className="mt-4 space-y-3">
              <legend className="mb-2 text-sm font-semibold">Application access</legend>
              {staffApplications.map((app) => (
                <label key={app.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={roleApplications[role.name]?.includes(app.key) ?? false}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setRoleApplications((current) => {
                        const assigned = current[role.name] ?? [];
                        const next = enabled
                          ? [...assigned, app.key]
                          : assigned.filter((key) => key !== app.key);
                        return { ...current, [role.name]: next };
                      });
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  {app.name}
                </label>
              ))}
            </fieldset>
          </Panel>
        ))}
      </div>
    </>}
    {screen === "settings" && <><PageTitle title="System settings" sub="Company and buying-season defaults used across the apps." /><Panel className="max-w-2xl"><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setMessage("Settings updated for this session only; changes are not saved."); }}>{([["company", "Company name"], ["season", "Current season"], ["floor", "Default buying floor"], ["currency", "Currency"]] as const).map(([key, label]) => <label key={key} className="block space-y-1.5"><span className="text-sm font-medium">{label}</span><Input value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} /></label>)}<Button type="submit"><Building2 /> Save settings</Button>{message && <p role="status" className="text-sm text-primary">{message}</p>}</form></Panel></>}
  </DesktopShell>;
}
