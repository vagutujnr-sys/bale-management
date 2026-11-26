import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  BarChart3,
  Boxes,
  Calendar,
  ChevronRight,
  CircleCheck,
  FileText,
  Home,
  LogOut,
  MoreHorizontal,
  Package,
  Scale,
  Settings,
  Sprout,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";
import appIcon from "@/assets/leaf-appicon.png";
import {
  AppHeader,
  BottomNav,
  DeviceFrame,
  MobileDeviceGate,
  Pill,
  SectionTitle,
  StatCard,
  SubHeader,
  type Tab,
} from "@/components/mobile/shell";
import { FarmerOnboarding } from "@/components/mobile/farmer-onboarding";
import { MobileAccountAccess } from "@/components/mobile/account-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bales,
  contract,
  deliveries as seedDeliveries,
  farmers,
  journey,
  money,
  notifications as seedNotes,
  payments,
  salesSheets,
} from "@/data/mock";
import { getSupabaseClient } from "@/lib/supabase";
import { saveAccountFarm, type AccountFarm, type LinkedAccountProfile } from "@/lib/account-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      { title: "Farmer App — Bale Contract System" },
      {
        name: "description",
        content: "Farmers track contracts, deliveries, bales, sales statements and payments.",
      },
      { property: "og:title", content: "Farmer App — Bale Contract System" },
      {
        property: "og:description",
        content: "Track your tobacco contract, deliveries, bales and payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FarmerApp,
});

type Screen =
  | "home"
  | "contract"
  | "deliveries"
  | "payments"
  | "more"
  | "profile"
  | "bales"
  | "statements"
  | "notifications"
  | "settings"
  | "onboarding";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "contract", label: "Contracts", icon: FileText },
  { key: "deliveries", label: "Deliveries", icon: Truck },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const me = farmers[0]!;
const myBales = bales.filter((b) => b.farmerId === me.id);

function FarmerApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<LinkedAccountProfile | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [notes, setNotes] = useState(seedNotes);
  const [deliveries, setDeliveries] = useState(seedDeliveries);
  const unread = notes.filter((n) => n.unread).length;

  const go = (s: Screen) => {
    setDrawer(false);
    if (s === "more") return setDrawer(true);
    setScreen(s);
  };

  return (
    <MobileDeviceGate>
      <DeviceFrame>
        {!signedIn ? (
          <MobileAccountAccess
            title="Farmer Bale Manager"
            accountKind="farmer"
            onAuthenticated={(result) => {
              if (result.status === "linked") {
                setAccount(result);
                setSignedIn(true);
                setScreen(result.farmer ? "home" : "onboarding");
              }
            }}
          />
        ) : (
          <>
            <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
              <p
                role="status"
                className="mx-5 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                Your profile is live. Contract, delivery, bale, statement, and payment screens still
                show demo data.
              </p>
              {screen === "home" && (
                <HomeScreen
                  go={go}
                  unread={unread}
                  farmer={account?.farmer}
                  completion={account?.completion}
                  needsOnboarding={!account?.farmer}
                />
              )}
              {screen === "onboarding" && account && (
                <FarmerOnboarding
                  account={account}
                  onComplete={(completedAccount) => {
                    setAccount(completedAccount);
                    setScreen("home");
                  }}
                  onLater={(farms) => {
                    setAccount((current) => (current ? { ...current, farms } : current));
                    setScreen("home");
                  }}
                />
              )}
              {screen === "contract" && <ContractScreen back={() => go("home")} />}
              {screen === "deliveries" && (
                <DeliveriesScreen
                  back={() => go("home")}
                  list={deliveries}
                  onBook={() =>
                    setDeliveries((d) => [
                      {
                        id: `DLV-${1183 + d.length}`,
                        date: "26 Nov 2026",
                        slot: "08:00 – 10:00",
                        bales: 10,
                        status: "Requested",
                        vehicle: "AEZ 4471",
                        depot: "Harare Floors",
                      },
                      ...d,
                    ])
                  }
                />
              )}
              {screen === "payments" && <PaymentsScreen back={() => go("home")} />}
              {screen === "profile" && (
                <ProfileScreen
                  back={() => go("home")}
                  farmer={account?.farmer}
                  completion={account?.completion}
                  farms={account?.farms ?? []}
                  onFarmsChange={(farms) =>
                    setAccount((current) => (current ? { ...current, farms } : current))
                  }
                />
              )}
              {screen === "bales" && <BalesScreen back={() => go("home")} />}
              {screen === "statements" && <StatementsScreen back={() => go("home")} />}
              {screen === "settings" && <SettingsScreen back={() => go("home")} />}
              {screen === "notifications" && (
                <NotificationsScreen
                  back={() => go("home")}
                  notes={notes}
                  markAll={() => setNotes((n) => n.map((x) => ({ ...x, unread: false })))}
                />
              )}
            </main>
            {screen !== "onboarding" && (
              <BottomNav
                tabs={tabs}
                active={tabs.some((t) => t.key === screen) ? screen : "more"}
                onChange={go}
              />
            )}
            {drawer && (
              <Drawer
                go={go}
                unread={unread}
                close={() => setDrawer(false)}
                logout={() => {
                  void getSupabaseClient()?.auth.signOut();
                  setAccount(null);
                  setDrawer(false);
                  setSignedIn(false);
                  setScreen("home");
                }}
              />
            )}
          </>
        )}
      </DeviceFrame>
    </MobileDeviceGate>
  );
}

function HomeScreen({
  go,
  unread,
  farmer,
  completion,
  needsOnboarding,
}: {
  go: (s: Screen) => void;
  unread: number;
  farmer?: LinkedAccountProfile["farmer"] | undefined;
  completion?: number | undefined;
  needsOnboarding: boolean;
}) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const farmerName = farmer ? `${farmer.first_name} ${farmer.surname}` : me.name;
  return (
    <>
      <div className="bg-field pb-6">
        <AppHeader appName="Farmer App" unread={unread} onBell={() => go("notifications")} />
        <div className="px-5 pt-6">
          <p className="text-muted-foreground">{greet},</p>
          <h1 className="text-3xl font-extrabold text-primary-deep">{farmerName}</h1>
          <p className="text-sm text-muted-foreground">
            {farmer ? `Grower #${farmer.grower_number}` : "Your tobacco journey, our priority"}
          </p>
        </div>
      </div>
      <div className="space-y-5 px-5">
        {needsOnboarding && (
          <button
            type="button"
            onClick={() => go("onboarding")}
            className="-mt-2 flex w-full items-center justify-between rounded-2xl border bg-card p-4 text-left shadow-card"
          >
            <span>
              <span className="block font-semibold">Finish setting up your farmer profile</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Add your farm and grower details when you are ready.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </button>
        )}
        {farmer && (
          <button
            type="button"
            onClick={() => go("profile")}
            className="-mt-2 w-full rounded-2xl border bg-card p-4 text-left shadow-card"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Profile completion</span>
              <span>{completion ?? 0}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion ?? 0}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completion ?? 0}%` }}
              />
            </div>
          </button>
        )}
        <button
          onClick={() => go("contract")}
          className="-mt-2 flex w-full items-center gap-4 rounded-2xl bg-hero p-5 text-left text-primary-foreground shadow-card"
        >
          <FileText className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm opacity-80">My Contract</p>
            <p className="text-2xl font-extrabold">{contract.season}</p>
          </div>
          <span className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold">● Active</span>
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Sprout}
            value={myBales.length + 8}
            label="Bales Delivered"
            onClick={() => go("bales")}
          />
          <StatCard
            icon={Scale}
            value="A1"
            label="Top Grade"
            tone="gold"
            onClick={() => go("bales")}
          />
          <StatCard
            icon={Wallet}
            value="$750.00"
            label="Last Payment"
            onClick={() => go("payments")}
          />
          <StatCard
            icon={Calendar}
            value="12 Nov"
            label="Next Delivery"
            onClick={() => go("deliveries")}
          />
        </div>
        <div>
          <SectionTitle title="My Tobacco Journey" />
          <ol className="space-y-0">
            {journey.map((j, i) => (
              <li key={j.label} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 rounded-full border-2",
                      j.status === "done" && "border-primary bg-primary",
                      j.status === "next" && "border-ember bg-ember-soft",
                      j.status === "todo" && "border-border",
                    )}
                  />
                  {i < journey.length - 1 && (
                    <span
                      className={cn(
                        "w-0.5 flex-1",
                        j.status === "done" ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
                <div className="flex flex-1 items-center justify-between pb-4">
                  <span className={cn("text-sm", j.status === "todo" && "text-muted-foreground")}>
                    {j.label}
                  </span>
                  {j.status === "done" && <Pill>Completed</Pill>}
                  {j.status === "next" && <Pill tone="ember">Next</Pill>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}

function ContractScreen({ back }: { back: () => void }) {
  const pct = Math.round((contract.deliveredKg / contract.contractedKg) * 100);
  return (
    <>
      <SubHeader title="My Contract" onBack={back} />
      <div className="space-y-4 px-5">
        <div className="rounded-2xl bg-hero p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-80">{contract.id}</span>
            <span className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold">Active</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold">{contract.season}</p>
          <div className="mt-4 h-2 rounded-full bg-primary-foreground/20">
            <div className="h-2 rounded-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs opacity-90">
            {contract.deliveredKg.toLocaleString()} of {contract.contractedKg.toLocaleString()} kg
            delivered ({pct}%)
          </p>
        </div>
        <div className="rounded-2xl border bg-card px-4 shadow-card">
          <Row k="Variety" v={contract.variety} />
          <Row k="Hectares" v={`${contract.hectares} ha`} />
          <Row k="Inputs advance" v={money(contract.inputsAdvance)} />
          <Row k="Signed on" v={contract.signedOn} />
          <Row k="Expires" v={contract.expiresOn} />
        </div>
        <Button variant="outline" className="w-full rounded-xl">
          Download contract (PDF)
        </Button>
      </div>
    </>
  );
}

function DeliveriesScreen({
  back,
  list,
  onBook,
}: {
  back: () => void;
  list: typeof seedDeliveries;
  onBook: () => void;
}) {
  return (
    <>
      <SubHeader title="Deliveries" onBack={back} />
      <div className="space-y-3 px-5">
        <Button onClick={onBook} className="w-full rounded-xl" size="lg">
          <Truck /> Request a delivery slot
        </Button>
        {list.map((d) => (
          <div key={d.id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-bold">{d.id}</p>
              <Pill
                tone={
                  d.status === "Completed" ? "green" : d.status === "Scheduled" ? "ember" : "gold"
                }
              >
                {d.status}
              </Pill>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {d.date} • {d.slot}
            </p>
            <p className="text-sm text-muted-foreground">
              {d.bales} bales • {d.vehicle} • {d.depot}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function PaymentsScreen({ back }: { back: () => void }) {
  const paid = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <SubHeader title="Payments" onBack={back} />
      <div className="space-y-3 px-5">
        <div className="rounded-2xl bg-hero p-5 text-primary-foreground">
          <p className="text-sm opacity-80">Total paid this season</p>
          <p className="text-3xl font-extrabold">{money(paid)}</p>
          <p className="mt-1 text-xs opacity-80">Into {me.bank}</p>
        </div>
        {payments.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card"
          >
            <Wallet className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{money(p.amount)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.date} • {p.sheet}
              </p>
            </div>
            <Pill tone={p.status === "Paid" ? "green" : "ember"}>{p.status}</Pill>
          </div>
        ))}
      </div>
    </>
  );
}

function BalesScreen({ back }: { back: () => void }) {
  const [open, setOpen] = useState<string | null>(myBales[0]!.id);
  return (
    <>
      <SubHeader title="Bale Tracking" onBack={back} />
      <div className="space-y-3 px-5">
        {myBales.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-card shadow-card">
            <button
              onClick={() => setOpen(open === b.id ? null : b.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <Package className="h-7 w-7 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{b.id}</p>
                <p className="text-xs text-muted-foreground">
                  {b.weightKg} kg • Grade {b.grade} • ${b.pricePerKg.toFixed(2)}/kg
                </p>
              </div>
              <Pill tone={b.status === "In Transit" ? "ember" : "green"}>{b.status}</Pill>
            </button>
            {open === b.id && (
              <div className="border-t px-4 py-3">
                {b.history.map((h) => (
                  <div key={h.label} className="flex items-center gap-2 py-1.5 text-sm">
                    <CircleCheck className="h-4 w-4 text-primary" />
                    <span className="flex-1">{h.label}</span>
                    <span className="text-xs text-muted-foreground">{h.at.split(", ")[1]}</span>
                  </div>
                ))}
                <p className="mt-2 text-sm font-semibold">
                  Value: {money(b.weightKg * b.pricePerKg)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function StatementsScreen({ back }: { back: () => void }) {
  return (
    <>
      <SubHeader title="Sales Statements" onBack={back} />
      <div className="space-y-3 px-5">
        {salesSheets.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="font-bold">{s.id}</p>
              <span className="text-xs text-muted-foreground">{s.date}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-muted p-2">
                <p className="font-bold text-sm">{s.bales}</p>Bales
              </div>
              <div className="rounded-xl bg-muted p-2">
                <p className="font-bold text-sm">{s.kg}</p>kg
              </div>
              <div className="rounded-xl bg-primary-soft p-2 text-primary">
                <p className="font-bold text-sm">{money(s.net)}</p>Net
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Gross {money(s.gross)} − deductions {money(s.deductions)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileScreen({
  back,
  farmer,
  completion,
  farms,
  onFarmsChange,
}: {
  back: () => void;
  farmer?: LinkedAccountProfile["farmer"] | undefined;
  completion?: number | undefined;
  farms: AccountFarm[];
  onFarmsChange: (farms: AccountFarm[]) => void;
}) {
  const [addingFarm, setAddingFarm] = useState(false);
  const [farmDraft, setFarmDraft] = useState({
    farmName: "",
    province: "",
    district: "",
    ward: "",
  });
  const [farmError, setFarmError] = useState("");
  const [savingFarm, setSavingFarm] = useState(false);

  const saveFarm = async (farm: AccountFarm | typeof farmDraft) => {
    setSavingFarm(true);
    setFarmError("");
    try {
      const saved = await saveAccountFarm({
        ...("id" in farm ? { id: farm.id } : {}),
        farmName: "farm_name" in farm ? farm.farm_name : farm.farmName,
        province: farm.province ?? "",
        district: farm.district ?? "",
        ward: farm.ward ?? "",
        isPrimary: "is_primary" in farm ? farm.is_primary : farms.length === 0,
      });
      onFarmsChange([...farms.filter((existing) => existing.id !== saved.farm.id), saved.farm]);
      setAddingFarm(false);
      setFarmDraft({ farmName: "", province: "", district: "", ward: "" });
    } catch (error) {
      setFarmError(error instanceof Error ? error.message : "The farm could not be saved.");
    } finally {
      setSavingFarm(false);
    }
  };

  return (
    <>
      <SubHeader title="My Profile" onBack={back} />
      <div className="space-y-4 px-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <User className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-bold">
              {farmer ? `${farmer.first_name} ${farmer.surname}` : me.name}
            </p>
            <p className="text-sm text-muted-foreground">Farmer #{farmer?.farmer_ref ?? me.id}</p>
          </div>
        </div>
        <div className="rounded-2xl border bg-card px-4 shadow-card">
          {farmer ? (
            <>
              <Row k="Profile completion" v={`${completion ?? 0}%`} />
              <Row k="Grower number" v={farmer.grower_number} />
              <Row k="Farm" v={farmer.farm_name} />
              <Row k="Phone" v={farmer.phone} />
              <Row k="Location" v={`${farmer.ward}, ${farmer.district}, ${farmer.province}`} />
              <Row k="Contracting company" v={farmer.contracting_company} />
              <Row k="Status" v={farmer.status} />
            </>
          ) : (
            <>
              <Row k="Phone" v={me.phone} />
              <Row k="Region" v={me.region} />
              <Row k="Farm size" v={`${me.hectares} ha`} />
              <Row k="Bank account" v={me.bank} />
            </>
          )}
        </div>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">My farms</h2>
            <Button type="button" size="sm" onClick={() => setAddingFarm(true)}>
              Add farm
            </Button>
          </div>
          {farms.map((farm) => (
            <div key={farm.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{farm.farm_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[farm.ward, farm.district, farm.province].filter(Boolean).join(", ")}
                  </p>
                </div>
                {farm.is_primary ? (
                  <span className="text-xs font-medium text-primary">Primary</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingFarm}
                    onClick={() => void saveFarm(farm)}
                  >
                    Make primary
                  </Button>
                )}
              </div>
            </div>
          ))}
          {addingFarm && (
            <form
              className="space-y-3 rounded-2xl border bg-card p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveFarm(farmDraft);
              }}
            >
              {(
                [
                  ["farmName", "Farm name"],
                  ["province", "Province"],
                  ["district", "District"],
                  ["ward", "Ward"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block space-y-1">
                  <span className="text-sm font-medium">{label}</span>
                  <Input
                    value={farmDraft[field]}
                    onChange={(event) =>
                      setFarmDraft((current) => ({ ...current, [field]: event.target.value }))
                    }
                    required
                  />
                </label>
              ))}
              {farmError && (
                <p role="alert" className="text-sm text-destructive">
                  {farmError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={savingFarm}>
                  {savingFarm ? "Saving..." : "Save farm"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddingFarm(false)}
                  disabled={savingFarm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}

function SettingsScreen({ back }: { back: () => void }) {
  const [sms, setSms] = useState(true);
  return (
    <>
      <SubHeader title="Settings" onBack={back} />
      <div className="px-5">
        <div className="rounded-2xl border bg-card px-4 shadow-card">
          <button
            onClick={() => setSms(!sms)}
            className="flex w-full items-center justify-between py-3 text-sm"
          >
            <span>SMS notifications</span>
            <span
              className={cn(
                "h-6 w-11 rounded-full p-0.5 transition",
                sms ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "block h-5 w-5 rounded-full bg-card transition",
                  sms && "translate-x-5",
                )}
              />
            </span>
          </button>
          <Row k="Language" v="English" />
        </div>
      </div>
    </>
  );
}

function NotificationsScreen({
  back,
  notes,
  markAll,
}: {
  back: () => void;
  notes: typeof seedNotes;
  markAll: () => void;
}) {
  return (
    <>
      <SubHeader
        title="Notifications"
        onBack={back}
        right={
          <button onClick={markAll} className="text-xs font-semibold text-primary">
            Read all
          </button>
        }
      />
      <div className="space-y-3 px-5">
        {notes.map((n) => (
          <div
            key={n.id}
            className={cn(
              "rounded-2xl border p-4",
              n.unread ? "border-primary/30 bg-primary-soft" : "bg-card",
            )}
          >
            <div className="flex justify-between">
              <p className="font-bold">{n.title}</p>
              <span className="text-xs text-muted-foreground">{n.time}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Drawer({
  go,
  close,
  logout,
  unread,
}: {
  go: (s: Screen) => void;
  close: () => void;
  logout: () => void;
  unread: number;
}) {
  const items: { s: Screen; label: string; icon: typeof Home }[] = [
    { s: "home", label: "Home", icon: Home },
    { s: "profile", label: "My Profile", icon: User },
    { s: "contract", label: "My Contract", icon: FileText },
    { s: "deliveries", label: "Deliveries", icon: Truck },
    { s: "bales", label: "Bale Tracking", icon: Boxes },
    { s: "statements", label: "Sales Statements", icon: BarChart3 },
    { s: "payments", label: "Payments", icon: Wallet },
    { s: "notifications", label: "Notifications", icon: Bell },
    { s: "settings", label: "Settings", icon: Settings },
  ];
  return (
    <div className="absolute inset-0 z-20 flex">
      <div className="flex w-[85%] flex-col overflow-y-auto bg-card p-5 animate-in slide-in-from-left">
        <div className="flex justify-end">
          <button onClick={close} aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
          <p className="text-sm font-bold text-primary-deep">Tobacco Contract System</p>
        </div>
        <div className="my-5 flex items-center gap-3 border-b pb-5">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <User />
          </div>
          <div>
            <p className="font-bold">{me.name}</p>
            <p className="text-xs text-muted-foreground">Farmer #{me.id}</p>
          </div>
        </div>
        <ul className="space-y-1">
          {items.map(({ s, label, icon: Icon }) => (
            <li key={s}>
              <button
                onClick={() => go(s)}
                className="flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left hover:bg-primary-soft"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1">{label}</span>
                {s === "notifications" && unread > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-destructive text-xs text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={logout}
          className="mt-4 flex items-center gap-4 border-t px-3 pt-4 text-ember"
        >
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </div>
      <button className="flex-1 bg-foreground/40" onClick={close} aria-label="Close menu" />
    </div>
  );
}
