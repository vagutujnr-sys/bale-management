import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Check, Clock, DoorOpen, Home, ListChecks, LogOut, MoreHorizontal, Truck, X } from "lucide-react";
import { AppHeader, BottomNav, DeviceFrame, Pill, SectionTitle, StatCard, SubHeader, type Tab } from "@/components/mobile/shell";
import { MobileLogin } from "@/components/mobile/login";
import { RoleHero } from "@/components/mobile/hero";
import { AppSide } from "@/components/mobile/side";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { arrivals as seed, type GateArrival } from "@/data/ops";

export const Route = createFileRoute("/gate")({
  head: () => ({
    meta: [
      { title: "Gate App — Bale Contract System" },
      { name: "description", content: "Gate clerks verify delivery bookings and trucks arriving at the floors." },
      { property: "og:title", content: "Gate App — Bale Contract System" },
      { property: "og:description", content: "Verify trucks and delivery bookings at the gate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Screen = "home" | "verify" | "log" | "more";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "verify", label: "Verify", icon: Barcode },
  { key: "log", label: "Gate Log", icon: ListChecks },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const tone = { Expected: "gold", Verified: "green", Inside: "green", Rejected: "ember" } as const;

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [list, setList] = useState<GateArrival[]>(seed);
  const [code, setCode] = useState("");
  const [found, setFound] = useState<GateArrival | null>(null);
  const [msg, setMsg] = useState("");
  const update = (id: string, status: GateArrival["status"]) => {
    setList((l) => l.map((a) => (a.id === id ? { ...a, status } : a)));
    setFound(null);
    setMsg(status === "Verified" ? "Truck verified and admitted." : "Arrival rejected.");
  };
  const expected = list.filter((a) => a.status === "Expected");

  return (
    <DeviceFrame side={<AppSide name="Gate App" about="For gate clerks: check each truck's delivery booking, confirm the farmer and bale count, and admit or turn away the load." tryThis="verify booking DLV-1182 or plate ADF 2210." />}>
      {!signedIn ? (
        <MobileLogin appName="Gate App" idLabel="Mobile number" onSignIn={() => setSignedIn(true)} />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && (
              <>
                <AppHeader appName="Gate Operations" unread={expected.length} />
                <RoleHero role="Gate Clerk" area="Harare Floors • Gate 1" icon={DoorOpen} />
                <div className="space-y-6 px-5 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={Clock} value={expected.length} label="Expected trucks" tone="gold" />
                    <StatCard icon={Check} value={list.filter((a) => a.status !== "Expected" && a.status !== "Rejected").length} label="Admitted today" />
                    <StatCard icon={Truck} value={list.reduce((s, a) => s + (a.status === "Expected" ? 0 : a.bales), 0)} label="Bales received" />
                    <StatCard icon={X} value={list.filter((a) => a.status === "Rejected").length} label="Rejected" tone="ember" />
                  </div>
                  <div>
                    <SectionTitle title="Arriving next" action="Verify" onAction={() => setScreen("verify")} />
                    <ul className="space-y-3">
                      {expected.map((a) => (
                        <li key={a.id}><button onClick={() => { setFound(a); setScreen("verify"); }} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-card">
                          <Truck className="h-7 w-7 shrink-0 text-gold" />
                          <div className="min-w-0 flex-1"><p className="font-bold">{a.vehicle}</p><p className="truncate text-xs text-muted-foreground">{a.farmer} • {a.bales} bales • ETA {a.time}</p></div>
                          <Pill tone="gold">Expected</Pill>
                        </button></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
            {screen === "verify" && (
              <>
                <SubHeader title="Verify Arrival" onBack={() => setScreen("home")} />
                <div className="space-y-4 px-5">
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setMsg(""); const a = list.find((x) => [x.booking, x.vehicle, x.id].some((v) => v.toLowerCase() === code.trim().toLowerCase())); setFound(a ?? null); if (!a) setMsg("No booking matches that code or plate."); }}>
                    <Input placeholder="Booking no. or number plate" value={code} onChange={(e) => setCode(e.target.value)} />
                    <Button type="submit">Check</Button>
                  </form>
                  {msg && <p className="rounded-xl bg-primary-soft p-3 text-sm text-primary">{msg}</p>}
                  {found && (
                    <div className="rounded-2xl border bg-card p-5 shadow-card">
                      <div className="flex justify-between"><p className="text-xl font-extrabold">{found.vehicle}</p><Pill tone={tone[found.status]}>{found.status}</Pill></div>
                      {[["Booking", found.booking], ["Farmer", found.farmer], ["Driver", found.driver], ["Bales declared", found.bales], ["Slot", found.time]].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b py-2.5 text-sm last:border-0"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span></div>
                      ))}
                      {found.status === "Expected" && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button onClick={() => update(found.id, "Verified")}><Check /> Admit</Button>
                          <Button variant="outline" onClick={() => update(found.id, "Rejected")}><X /> Reject</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {screen === "log" && (
              <>
                <SubHeader title="Gate Log" onBack={() => setScreen("home")} />
                <ul className="divide-y px-5">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                      <div><p className="font-semibold">{a.id} • {a.vehicle}</p><p className="text-xs text-muted-foreground">{a.time} • {a.farmer}</p></div>
                      <Pill tone={tone[a.status]}>{a.status}</Pill>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {screen === "more" && (
              <>
                <SubHeader title="More" onBack={() => setScreen("home")} />
                <div className="px-5"><Button variant="outline" className="w-full rounded-xl text-ember" onClick={() => { setSignedIn(false); setScreen("home"); }}><LogOut /> Logout</Button></div>
              </>
            )}
          </main>
          <BottomNav tabs={tabs} active={screen} onChange={setScreen} />
        </>
      )}
    </DeviceFrame>
  );
}
