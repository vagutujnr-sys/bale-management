import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDownToLine,
  Barcode,
  Boxes,
  Briefcase,
  CircleCheck,
  Home,
  LogOut,
  MoreHorizontal,
  Package,
  QrCode,
  Scale,
  Search,
  Truck,
  User,
  Warehouse,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  AppHeader,
  BottomNav,
  DeviceFrame,
  Pill,
  SectionTitle,
  StatCard,
  SubHeader,
  SystemLink,
  type Tab,
} from "@/components/mobile/shell";
import { MobileLogin } from "@/components/mobile/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bales as seedBales,
  farmerById,
  gradeMix,
  movements as seedMoves,
  storageLocations,
  warehouseStats,
  type Bale,
  type Movement,
} from "@/data/mock";
import { cn } from "@/lib/utils";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/warehouse")({
  head: () => ({
    meta: [
      ...pwaMeta("warehouse"),
      { title: "Warehouse App — Bale Contract System" },
      {
        name: "description",
        content: "Warehouse officers receive, store, track and dispatch tobacco bales.",
      },
      { property: "og:title", content: "Warehouse App — Bale Contract System" },
      {
        property: "og:description",
        content: "Scan, store and dispatch tobacco bales with full traceability.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("warehouse"),
  }),
  component: WarehouseApp,
});

type Screen = "home" | "scan" | "stock" | "more";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "scan", label: "Scan", icon: Barcode },
  { key: "stock", label: "Stock", icon: Boxes },
  { key: "more", label: "More", icon: MoreHorizontal },
];

function WarehouseApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [bales, setBales] = useState<Bale[]>(seedBales);
  const [moves, setMoves] = useState<Movement[]>(seedMoves);
  const [selected, setSelected] = useState<string>(seedBales[0]!.id);

  const openBale = (id: string) => {
    setSelected(id);
    setScreen("stock");
  };
  const dispatchBale = (id: string) => {
    setBales((bs) =>
      bs.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "In Transit",
              history: [
                ...b.history,
                { label: "Dispatched #DSP-2027", at: "Today, now", stage: "Dispatch" },
              ],
            }
          : b,
      ),
    );
    setMoves((m) => [
      { id: "DSP-2027", type: "Dispatch", ago: "Just now", bales: 1, status: "Dispatched" },
      ...m,
    ]);
  };
  const receiveBale = (id: string) => {
    setBales((bs) =>
      bs.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "In Store",
              location: "Warehouse A - Row E",
              history: [
                ...b.history,
                { label: "Transferred to Warehouse", at: "Today, now", stage: "Warehouse" },
              ],
            }
          : b,
      ),
    );
    setMoves((m) => [
      {
        id: `RCV-${1048 + m.length}`,
        type: "Receipt",
        ago: "Just now",
        bales: 1,
        status: "Received",
      },
      ...m,
    ]);
  };

  return (
    <DeviceFrame side={<Side />}>
      {!signedIn ? (
        <MobileLogin
          appName="Warehouse App"
          idLabel="Mobile number"
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && <HomeScreen moves={moves} bales={bales} go={setScreen} />}
            {screen === "scan" && (
              <ScanScreen bales={bales} back={() => setScreen("home")} onFound={openBale} />
            )}
            {screen === "stock" && (
              <StockScreen
                bales={bales}
                selected={selected}
                setSelected={setSelected}
                back={() => setScreen("home")}
                onDispatch={dispatchBale}
                onReceive={receiveBale}
              />
            )}
            {screen === "more" && (
              <MoreScreen
                back={() => setScreen("home")}
                logout={() => {
                  setSignedIn(false);
                  setScreen("home");
                }}
              />
            )}
          </main>
          <BottomNav tabs={tabs} active={screen} onChange={setScreen} />
        </>
      )}
    </DeviceFrame>
  );
}

function Side() {
  return (
    <div className="space-y-4">
      <SystemLink />
      <h2 className="text-4xl font-extrabold text-primary-deep">Warehouse App</h2>
      <p className="text-muted-foreground">
        For warehouse officers: see stock by grade, scan a bale to find its farmer, weight, grade
        and location, receive bales from the floor and send them out on dispatch.
      </p>
      <p className="text-sm text-muted-foreground">
        Try: scan BLS-0007542 and receive it, or dispatch a stored bale.
      </p>
    </div>
  );
}

function HomeScreen({
  moves,
  bales,
  go,
}: {
  moves: Movement[];
  bales: Bale[];
  go: (s: Screen) => void;
}) {
  const transit =
    warehouseStats.transit + bales.filter((b) => b.status === "In Transit").length - 1;
  let acc = 0;
  const stops = gradeMix
    .map((g) => {
      const s = `${g.color} ${acc}% ${acc + g.pct}%`;
      acc += g.pct;
      return s;
    })
    .join(", ");
  return (
    <>
      <AppHeader appName="Warehouse App" unread={1} />
      <div className="mt-4 flex items-end justify-between bg-hero px-5 py-6 text-primary-foreground">
        <div>
          <p className="text-sm opacity-80">Welcome,</p>
          <h1 className="text-2xl font-extrabold">Warehouse Officer</h1>
          <p className="text-sm opacity-80">Warehouse Operations</p>
        </div>
        <Warehouse className="h-16 w-16 opacity-90" />
      </div>
      <div className="space-y-6 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Package}
            value={warehouseStats.total.toLocaleString()}
            label="Total Bales (In Storage)"
            onClick={() => go("stock")}
          />
          <StatCard icon={Truck} value={transit} label="Bales in Transit" tone="ember" />
          <StatCard
            icon={Warehouse}
            value={warehouseStats.locations}
            label="Storage Locations"
            onClick={() => go("more")}
          />
          <StatCard
            icon={CircleCheck}
            value={`${warehouseStats.accuracy}%`}
            label="Stock Accuracy"
          />
        </div>
        <div>
          <SectionTitle title="Stock Overview" action="View All" onAction={() => go("stock")} />
          <div className="flex items-center gap-6 rounded-2xl border bg-card p-4 shadow-card">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full"
              style={{ background: `conic-gradient(${stops})` }}
            >
              <div className="absolute inset-4 grid place-items-center rounded-full bg-card text-center">
                <div>
                  <p className="font-extrabold">{warehouseStats.total.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Bales</p>
                </div>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {gradeMix.map((g) => (
                <li key={g.grade} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: g.color }} />
                  <span className="flex-1">{g.grade}</span>
                  <span className="font-bold">{g.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <SectionTitle title="Recent Movements" />
          <ul className="space-y-3">
            {moves.slice(0, 5).map((m) => {
              const Icon =
                m.type === "Receipt" ? ArrowDownToLine : m.type === "Dispatch" ? Truck : Briefcase;
              return (
                <li key={m.id + m.ago} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground",
                      m.type === "Dispatch" ? "bg-ember" : "bg-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {m.type} #{m.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.ago} • {m.bales.toLocaleString()} bales
                    </p>
                  </div>
                  <Pill tone={m.status === "Dispatched" ? "ember" : "green"}>{m.status}</Pill>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

function ScanScreen({
  bales,
  back,
  onFound,
}: {
  bales: Bale[];
  back: () => void;
  onFound: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const lookup = (c: string) => {
    const b = bales.find((x) => x.id.toLowerCase() === c.trim().toLowerCase());
    if (b) onFound(b.id);
    else setErr("No bale found with that code.");
  };
  return (
    <>
      <SubHeader title="Scan Bale" onBack={back} />
      <div className="space-y-5 px-5">
        <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-3xl bg-device text-primary-foreground">
          <div className="absolute inset-10 rounded-2xl border-2 border-dashed border-leaf" />
          <div className="relative text-center">
            <QrCode className="mx-auto h-14 w-14" />
            <p className="mt-2 text-sm">Enter a bale ID below to look it up</p>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr("");
            lookup(code);
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Or type a bale code, e.g. BLS-0007542"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit">Find</Button>
        </form>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
    </>
  );
}

const stageTone = {
  Gate: "green",
  Warehouse: "green",
  Quality: "gold",
  Dispatch: "ember",
} as const;

function StockScreen({
  bales,
  selected,
  setSelected,
  back,
  onDispatch,
  onReceive,
}: {
  bales: Bale[];
  selected: string;
  setSelected: (id: string) => void;
  back: () => void;
  onDispatch: (id: string) => void;
  onReceive: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const bale = bales.find((b) => b.id === selected) ?? bales[0]!;
  const farmer = farmerById(bale.farmerId);
  const matches = q
    ? bales.filter(
        (b) =>
          b.id.toLowerCase().includes(q.toLowerCase()) ||
          farmerById(b.farmerId)?.name.toLowerCase().includes(q.toLowerCase()),
      )
    : [];
  return (
    <>
      <SubHeader title="Bale Tracking" onBack={back} right={<QrCode className="h-6 w-6" />} />
      <div className="space-y-4 px-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="rounded-xl pl-9"
            placeholder="Search by Bale ID or farmer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-xl border bg-popover shadow-card">
              {matches.map((b) => (
                <li key={b.id}>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setSelected(b.id);
                      setQ("");
                    }}
                  >
                    {b.id} — {farmerById(b.farmerId)?.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-muted p-4">
          <Barcode className="h-10 w-10 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Bale ID</p>
            <p className="truncate text-xl font-extrabold">{bale.id}</p>
          </div>
          <Pill
            tone={
              bale.status === "In Transit" ? "ember" : bale.status === "In Store" ? "green" : "gold"
            }
          >
            ● {bale.status}
          </Pill>
        </div>
        <div className="rounded-2xl border bg-card px-4 shadow-card">
          {[
            [Package, "Grade", bale.grade],
            [Scale, "Weight", `${bale.weightKg} kg`],
            [MapPin, "Storage Location", bale.location],
            [Calendar, "Received On", bale.receivedOn],
            [User, "Farmer", farmer?.name],
          ].map(([Icon, k, v]) => {
            const I = Icon as typeof Package;
            return (
              <div
                key={k as string}
                className="flex items-center gap-3 border-b py-3 text-sm last:border-0"
              >
                <I className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground">{k as string}</span>
                <span className="font-semibold">{v as string}</span>
              </div>
            );
          })}
        </div>
        <div>
          <SectionTitle title="Movement History" />
          <ol>
            {bale.history.map((h, i) => (
              <li key={h.label + i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  </span>
                  {i < bale.history.length - 1 && <span className="w-0.5 flex-1 bg-primary" />}
                </div>
                <div className="flex flex-1 items-start justify-between pb-4">
                  <div>
                    <p className="text-sm font-semibold">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{h.at}</p>
                  </div>
                  <Pill tone={stageTone[h.stage]}>{h.stage}</Pill>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {bale.status === "In Store" && (
          <Button size="lg" className="w-full rounded-xl" onClick={() => onDispatch(bale.id)}>
            <Truck /> Dispatch this bale
          </Button>
        )}
        {(bale.status === "Weighed" || bale.status === "Graded") && (
          <Button size="lg" className="w-full rounded-xl" onClick={() => onReceive(bale.id)}>
            <ArrowDownToLine /> Receive into warehouse
          </Button>
        )}
        {bale.status === "In Transit" && (
          <Button size="lg" variant="outline" className="w-full rounded-xl">
            <Truck /> Track Dispatch
          </Button>
        )}
        <div>
          <SectionTitle title="All bales" />
          <ul className="divide-y rounded-2xl border bg-card">
            {bales.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelected(b.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
                    b.id === bale.id && "bg-primary-soft",
                  )}
                >
                  <span className="font-semibold">{b.id}</span>
                  <span className="text-muted-foreground">
                    {b.grade} • {b.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function MoreScreen({ back, logout }: { back: () => void; logout: () => void }) {
  return (
    <>
      <SubHeader title="Storage Locations" onBack={back} />
      <div className="space-y-3 px-5">
        {storageLocations.map((l) => {
          const pct = Math.round((l.used / l.capacity) * 100);
          return (
            <div key={l.name} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex justify-between">
                <p className="font-bold">{l.name}</p>
                <span className="text-sm text-muted-foreground">{l.rows} rows</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full", pct > 85 ? "bg-ember" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {l.used.toLocaleString()} / {l.capacity.toLocaleString()} bales ({pct}%)
              </p>
            </div>
          );
        })}
        <Button variant="outline" className="w-full rounded-xl text-ember" onClick={logout}>
          <LogOut /> Logout
        </Button>
      </div>
    </>
  );
}
