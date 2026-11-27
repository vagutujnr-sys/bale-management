import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Barcode, Check, Monitor, Printer, Scale, Search, Usb, Wifi } from "lucide-react";
import {
  DesktopLogin,
  DesktopShell,
  PageTitle,
  Panel,
  type NavItem,
} from "@/components/desktop/shell";
import { Pill } from "@/components/mobile/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bales, farmerById, money } from "@/data/mock";
import { qcQueue as seed, type QcItem } from "@/data/ops";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/workstation")({
  head: () => ({
    meta: [
      ...pwaMeta("workstation"),
      { title: "Operations Workstation — Bale Contract System" },
      {
        name: "description",
        content: "Operate floor scales, bale labels, scanners and connected devices.",
      },
      { property: "og:title", content: "Operations Workstation — Bale Contract System" },
      {
        property: "og:description",
        content: "Weigh bales, print labels and check floor equipment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("workstation"),
  }),
  component: WorkstationApp,
});

type Screen = "weigh" | "lookup" | "devices";
const nav: NavItem<Screen>[] = [
  { key: "weigh", label: "Weigh & label", icon: Scale },
  { key: "lookup", label: "Bale lookup", icon: Barcode },
  { key: "devices", label: "Connected devices", icon: Monitor },
];

type LookupResult = { id: string; farmer: string; detail: string; status: string; grade?: string };

function WorkstationApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("weigh");
  const [items, setItems] = useState<QcItem[]>(seed);
  const [selectedId, setSelectedId] = useState(seed[0]!.baleId);
  const [weight, setWeight] = useState(String(seed[0]!.weightKg));
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("BLS-0007536");
  const [result, setResult] = useState<LookupResult | null>(null);
  const selected = items.find((i) => i.baleId === selectedId) ?? items[0]!;
  if (!signedIn)
    return <DesktopLogin appName="Operations Workstation" onSignIn={() => setSignedIn(true)} />;

  const selectBale = (id: string) => {
    setSelectedId(id);
    const item = items.find((i) => i.baleId === id);
    if (item) setWeight(String(item.weightKg));
    setMessage("");
  };
  const capture = (e: React.FormEvent) => {
    e.preventDefault();
    const captured = Number(weight);
    setItems((current) =>
      current.map((i) => (i.baleId === selectedId ? { ...i, weightKg: captured } : i)),
    );
    setMessage(`${selectedId} weight captured: ${captured} kg.`);
  };
  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const code = query.trim().toLowerCase();
    const bale = bales.find((b) => b.id.toLowerCase() === code);
    const qc = items.find((i) => i.baleId.toLowerCase() === code);
    if (bale)
      setResult({
        id: bale.id,
        farmer: farmerById(bale.farmerId)?.name ?? bale.farmerId,
        detail: `${bale.weightKg} kg • ${bale.location} • ${money(bale.weightKg * bale.pricePerKg)}`,
        status: bale.status,
        grade: `${bale.grade} at ${money(bale.pricePerKg)}/kg`,
      });
    else if (qc)
      setResult({
        id: qc.baleId,
        farmer: qc.farmer,
        detail: `${qc.weightKg} kg • Quality queue`,
        status: qc.status,
        grade: qc.grade ? `${qc.grade} at ${money(qc.price ?? 0)}/kg` : "Not graded yet",
      });
    else setResult(null);
  };

  return (
    <DesktopShell
      appName="Operations Workstation"
      nav={nav}
      active={screen}
      onNav={setScreen}
      user="Chipo Mlambo"
      onLogout={() => setSignedIn(false)}
    >
      {screen === "weigh" && (
        <>
          <PageTitle
            title="Weighing & label station"
            sub="Station WS-02 • Grading Bay 2 • Device integrations not configured"
            action={<Pill tone="muted">Scale not connected</Pill>}
          />
          {message && (
            <p
              role="status"
              className="mb-5 rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
            >
              {message}
            </p>
          )}
          <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
            <Panel title="Capture bale weight">
              <form onSubmit={capture} className="space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">Bale on scale</span>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedId}
                    onChange={(e) => selectBale(e.target.value)}
                  >
                    {items.map((i) => (
                      <option key={i.baleId} value={i.baleId}>
                        {i.baleId} — {i.farmer}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-3xl bg-device p-6 text-center text-primary-foreground">
                  <p className="text-xs uppercase tracking-[0.25em] opacity-60">
                    Enter weight manually
                  </p>
                  <div className="mt-2 flex items-end justify-center gap-2">
                    <input
                      aria-label="Scale weight in kilograms"
                      className="w-52 bg-transparent text-center text-6xl font-extrabold outline-none"
                      type="number"
                      min="1"
                      max="500"
                      step="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                    <span className="pb-2 text-xl">kg</span>
                  </div>
                  <p className="mt-2 text-xs text-white/70">Scale integration is not configured.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="submit" size="lg">
                    <Scale /> Capture weight
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={() =>
                      setMessage("Printing is unavailable because a printer is not connected.")
                    }
                  >
                    <Printer /> Print bale label
                  </Button>
                </div>
              </form>
            </Panel>
            <Panel title="Label preview">
              <div className="rounded-xl border-2 border-dashed p-5">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">BALE CONTRACT SYSTEM</p>
                    <p className="mt-1 text-lg font-extrabold">{selected.baleId}</p>
                  </div>
                  <Barcode className="h-14 w-14" />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Farmer", selected.farmer],
                    ["Weight", `${weight} kg`],
                    ["Grade", selected.grade ?? "Pending"],
                    ["Price / kg", selected.price ? money(selected.price) : "Pending"],
                    ["Station", "WS-02 • Harare Floors"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Connect a label printer to print this bale label.
              </p>
            </Panel>
          </div>
        </>
      )}
      {screen === "lookup" && (
        <>
          <PageTitle title="Bale lookup" sub="Check a bale's weight, grade and current location." />
          <Panel className="max-w-3xl">
            <form onSubmit={lookup} className="flex gap-3">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  aria-label="Bale ID"
                  className="pl-9"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setResult(null);
                  }}
                  placeholder="Enter a bale ID"
                  required
                />
              </label>
              <Button type="submit">
                <Barcode /> Look up
              </Button>
            </form>
            {result ? (
              <div className="mt-5 rounded-2xl bg-primary-soft p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-extrabold text-primary">{result.id}</p>
                  <Pill>{result.status}</Pill>
                </div>
                <p className="mt-2 font-semibold">{result.farmer}</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.detail}</p>
                <p className="mt-3 text-sm font-semibold">Grade: {result.grade}</p>
              </div>
            ) : (
              query && (
                <p className="mt-5 text-sm text-muted-foreground">
                  Enter a bale ID and select Look up to search available bale records.
                </p>
              )
            )}
          </Panel>
        </>
      )}
      {screen === "devices" && (
        <>
          <PageTitle
            title="Connected devices"
            sub="Workstation WS-02 • Harare Floors"
            action={<Pill tone="muted">3 devices to configure</Pill>}
          />
          {message && (
            <p role="status" className="mb-5 rounded-xl bg-primary-soft p-3 text-sm text-primary">
              {message}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { name: "Digital platform scale", detail: "USB-Serial • COM3", icon: Usb },
              { name: "Thermal label printer", detail: "Network • 192.168.1.42", icon: Wifi },
              { name: "Handheld barcode scanner", detail: "USB • HID keyboard", icon: Barcode },
            ].map(({ name, detail, icon: Icon }) => (
              <Panel key={name}>
                <div className="flex items-start justify-between">
                  <span className="rounded-2xl bg-primary-soft p-3 text-primary">
                    <Icon />
                  </span>
                  <Pill tone="muted">Not connected</Pill>
                </div>
                <h2 className="mt-5 font-bold">{name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 w-full"
                  onClick={() =>
                    setMessage(`${name} cannot be checked until the device is connected.`)
                  }
                >
                  <Check /> Check connection
                </Button>
              </Panel>
            ))}
          </div>
          <Panel title="Station checklist" className="mt-5 max-w-2xl">
            <ul className="space-y-3 text-sm">
              {[
                "Scale zeroed and calibrated",
                "Label roll loaded",
                "Scanner set to Bale ID mode",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </DesktopShell>
  );
}
