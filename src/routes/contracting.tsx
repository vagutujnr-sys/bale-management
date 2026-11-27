import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileSignature, FilePlus, FileText, Home, LogOut, Users, X } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  DeviceFrame,
  Pill,
  SectionTitle,
  StatCard,
  SubHeader,
  type Tab,
} from "@/components/mobile/shell";
import { MobileLogin } from "@/components/mobile/login";
import { RoleHero } from "@/components/mobile/hero";
import { AppSide } from "@/components/mobile/side";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contracts as seed, type ContractRow } from "@/data/ops";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/contracting")({
  head: () => ({
    meta: [
      ...pwaMeta("contracting"),
      { title: "Contracting App — Bale Contract System" },
      {
        name: "description",
        content: "Field officers register farmers and issue season tobacco contracts.",
      },
      { property: "og:title", content: "Contracting App — Bale Contract System" },
      {
        property: "og:description",
        content: "Register farmers and manage season contracts in the field.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("contracting"),
  }),
  component: App,
});

type Screen = "home" | "contracts" | "new" | "more";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "contracts", label: "Contracts", icon: FileText },
  { key: "new", label: "New", icon: FilePlus },
  { key: "more", label: "More", icon: Users },
];
const tone = { Active: "green", Pending: "ember", Draft: "muted", Rejected: "gold" } as const;

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [list, setList] = useState<ContractRow[]>(seed);
  const [open, setOpen] = useState<string | null>(null);
  const setStatus = (id: string, status: ContractRow["status"]) =>
    setList((l) => l.map((c) => (c.id === id ? { ...c, status } : c)));
  const pending = list.filter((c) => c.status === "Pending");

  return (
    <DeviceFrame
      side={
        <AppSide
          name="Contracting App"
          about="For field officers: register growers, capture hectares and expected volume, and send season contracts for approval."
          tryThis="approve a pending contract or register a new farmer."
        />
      }
    >
      {!signedIn ? (
        <MobileLogin
          appName="Contracting App"
          idLabel="Mobile number"
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && (
              <>
                <AppHeader appName="Contracting" unread={pending.length} />
                <RoleHero
                  role="Contracting Officer"
                  area="2026 Season Contracts"
                  icon={FileSignature}
                />
                <div className="space-y-6 px-5 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={FileText}
                      value={list.length}
                      label="Contracts"
                      onClick={() => setScreen("contracts")}
                    />
                    <StatCard
                      icon={FileSignature}
                      value={pending.length}
                      label="Awaiting approval"
                      tone="ember"
                      onClick={() => setScreen("contracts")}
                    />
                    <StatCard
                      icon={Check}
                      value={list.filter((c) => c.status === "Active").length}
                      label="Active"
                    />
                    <StatCard
                      icon={Users}
                      value={`${list.reduce((s, c) => s + c.hectares, 0).toFixed(1)} ha`}
                      label="Contracted area"
                      tone="gold"
                    />
                  </div>
                  <div>
                    <SectionTitle title="Needs your approval" />
                    <div className="space-y-3">
                      {pending.length === 0 && (
                        <p className="text-sm text-muted-foreground">All caught up.</p>
                      )}
                      {pending.map((c) => (
                        <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-card">
                          <div className="flex justify-between">
                            <p className="font-bold">{c.farmer}</p>
                            <Pill tone="ember">Pending</Pill>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.id} • {c.hectares} ha • {c.kg.toLocaleString()} kg
                          </p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button size="sm" onClick={() => setStatus(c.id, "Active")}>
                              <Check /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setStatus(c.id, "Rejected")}
                            >
                              <X /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {screen === "contracts" && (
              <>
                <SubHeader title="Contracts" onBack={() => setScreen("home")} />
                <div className="space-y-3 px-5">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setOpen(open === c.id ? null : c.id)}
                      className="block w-full rounded-2xl border bg-card p-4 text-left shadow-card"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="truncate font-bold">{c.farmer}</p>
                        <Pill tone={tone[c.status]}>{c.status}</Pill>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.id} • Farmer #{c.farmerId}
                      </p>
                      {open === c.id && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-xl bg-muted p-2">
                            <p className="text-sm font-bold">{c.hectares}</p>ha
                          </div>
                          <div className="rounded-xl bg-muted p-2">
                            <p className="text-sm font-bold">{c.kg.toLocaleString()}</p>kg
                          </div>
                          <div className="rounded-xl bg-muted p-2">
                            <p className="text-sm font-bold">{c.season}</p>Season
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
            {screen === "new" && (
              <NewContract
                onBack={() => setScreen("home")}
                onSave={(c) => {
                  setList((l) => [c, ...l]);
                  setScreen("contracts");
                }}
                n={list.length}
              />
            )}
            {screen === "more" && (
              <>
                <SubHeader title="More" onBack={() => setScreen("home")} />
                <div className="px-5">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-ember"
                    onClick={() => {
                      setSignedIn(false);
                      setScreen("home");
                    }}
                  >
                    <LogOut /> Logout
                  </Button>
                </div>
              </>
            )}
          </main>
          <BottomNav tabs={tabs} active={screen} onChange={setScreen} />
        </>
      )}
    </DeviceFrame>
  );
}

function NewContract({
  onBack,
  onSave,
  n,
}: {
  onBack: () => void;
  onSave: (c: ContractRow) => void;
  n: number;
}) {
  const [f, setF] = useState({ farmer: "", phone: "", region: "", hectares: "2.5", kg: "5000" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  return (
    <>
      <SubHeader title="Register & Contract" onBack={onBack} />
      <form
        className="space-y-3 px-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            id: `CT-2026-${String(412 + n).padStart(4, "0")}`,
            farmerId: `TCF00${1245 + n}`,
            farmer: f.farmer,
            season: "2026",
            kg: Number(f.kg),
            hectares: Number(f.hectares),
            status: "Pending",
          });
        }}
      >
        {(
          [
            ["farmer", "Farmer full name"],
            ["phone", "Phone number"],
            ["region", "Region"],
            ["hectares", "Hectares"],
            ["kg", "Expected volume (kg)"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="block space-y-1.5">
            <span className="text-sm font-medium">{l}</span>
            <Input value={f[k]} onChange={set(k)} required />
          </label>
        ))}
        <Button type="submit" size="lg" className="w-full rounded-xl">
          Submit for approval
        </Button>
      </form>
    </>
  );
}
