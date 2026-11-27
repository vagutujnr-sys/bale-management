import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeDollarSign,
  Check,
  ClipboardCheck,
  FileWarning,
  Home,
  ListChecks,
  LogOut,
  MoreHorizontal,
  Scale,
  Search,
} from "lucide-react";
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
import { priceTable, qcQueue as seed, type QcItem } from "@/data/ops";
import type { Grade } from "@/data/mock";
import { money } from "@/data/mock";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      ...pwaMeta("quality"),
      { title: "Quality Control — Bale Contract System" },
      {
        name: "description",
        content: "Grade tobacco bales, apply season prices and manage grading disputes.",
      },
      { property: "og:title", content: "Quality Control — Bale Contract System" },
      { property: "og:description", content: "Grade tobacco bales and apply season prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("quality"),
  }),
  component: QualityApp,
});

type Screen = "home" | "queue" | "prices" | "more" | "grade";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "queue", label: "Bale Queue", icon: ListChecks },
  { key: "prices", label: "Prices", icon: BadgeDollarSign },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const tone = { Waiting: "gold", Graded: "green", Disputed: "ember" } as const;
const grades = Object.keys(priceTable) as Grade[];

function QualityApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [items, setItems] = useState<QcItem[]>(seed);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grade, setGrade] = useState<Grade>("A1");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const selected = items.find((item) => item.baleId === selectedId);
  const waiting = items.filter((item) => item.status === "Waiting");
  const filtered = items.filter((item) =>
    `${item.baleId} ${item.farmer}`.toLowerCase().includes(query.toLowerCase()),
  );

  const openGrading = (item: QcItem) => {
    setSelectedId(item.baleId);
    setGrade(item.grade ?? "A1");
    setMessage("");
    setScreen("grade");
  };
  const saveGrade = () => {
    if (!selected) return;
    setItems((current) =>
      current.map((item) =>
        item.baleId === selected.baleId
          ? { ...item, grade, price: priceTable[grade], status: "Graded" }
          : item,
      ),
    );
    setMessage(`${selected.baleId} graded ${grade} at ${money(priceTable[grade])}/kg.`);
    setScreen("queue");
  };
  const dispute = (id: string) => {
    setItems((current) =>
      current.map((item) => (item.baleId === id ? { ...item, status: "Disputed" } : item)),
    );
    setMessage(`${id} sent for grading review.`);
  };

  const QueueCard = ({ item }: { item: QcItem }) => (
    <article className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{item.baleId}</p>
          <p className="text-xs text-muted-foreground">
            {item.farmer} • {item.weightKg} kg
          </p>
        </div>
        <Pill tone={tone[item.status]}>{item.status}</Pill>
      </div>
      {item.grade && (
        <p className="mt-3 rounded-xl bg-muted p-3 text-sm font-semibold">
          Grade {item.grade} • {money(item.price ?? 0)}/kg •{" "}
          {money(item.weightKg * (item.price ?? 0))} total
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {item.status !== "Graded" && (
          <Button size="sm" className="flex-1" onClick={() => openGrading(item)}>
            <ClipboardCheck /> {item.status === "Disputed" ? "Review grade" : "Grade bale"}
          </Button>
        )}
        {item.status === "Graded" && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => dispute(item.baleId)}
          >
            <FileWarning /> Raise dispute
          </Button>
        )}
      </div>
    </article>
  );

  return (
    <DeviceFrame
      side={
        <AppSide
          name="Quality Control"
          about="For grading teams: work through the bale queue, assign a leaf grade and apply the approved season price."
          tryThis="grade BLS-0007542 and see its value calculated."
        />
      }
    >
      {!signedIn ? (
        <MobileLogin
          appName="Quality Control"
          idLabel="Mobile number"
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && (
              <>
                <AppHeader appName="Quality Control" unread={waiting.length} />
                <RoleHero
                  role="Quality Grader"
                  area="Harare Floors • Grading Bay 2"
                  icon={ClipboardCheck}
                />
                <div className="space-y-6 px-5 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={Scale}
                      value={waiting.length}
                      label="Waiting to grade"
                      tone="gold"
                      onClick={() => setScreen("queue")}
                    />
                    <StatCard
                      icon={Check}
                      value={items.filter((i) => i.status === "Graded").length}
                      label="Graded"
                    />
                    <StatCard
                      icon={FileWarning}
                      value={items.filter((i) => i.status === "Disputed").length}
                      label="Disputed"
                      tone="ember"
                    />
                    <StatCard
                      icon={BadgeDollarSign}
                      value={money(priceTable.A1)}
                      label="Top grade / kg"
                      tone="gold"
                      onClick={() => setScreen("prices")}
                    />
                  </div>
                  <div>
                    <SectionTitle
                      title="Next in the queue"
                      action="View queue"
                      onAction={() => setScreen("queue")}
                    />
                    <div className="space-y-3">
                      {waiting.slice(0, 2).map((item) => (
                        <QueueCard key={item.baleId} item={item} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {screen === "queue" && (
              <>
                <SubHeader title="Grading Queue" onBack={() => setScreen("home")} />
                <div className="space-y-4 px-5">
                  <label className="relative block">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Search bale or farmer"
                      placeholder="Bale ID or farmer"
                      className="pl-9"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  {message && (
                    <p
                      role="status"
                      className="rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
                    >
                      {message}
                    </p>
                  )}
                  <div className="space-y-3">
                    {filtered.map((item) => (
                      <QueueCard key={item.baleId} item={item} />
                    ))}
                  </div>
                </div>
              </>
            )}
            {screen === "grade" && selected && (
              <>
                <SubHeader title="Grade Bale" onBack={() => setScreen("queue")} />
                <div className="space-y-5 px-5">
                  <div className="rounded-2xl bg-hero p-5 text-primary-foreground">
                    <p className="text-sm opacity-80">{selected.farmer}</p>
                    <p className="text-xl font-extrabold">{selected.baleId}</p>
                    <p className="mt-2 text-sm">{selected.weightKg} kg captured at weighing</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Select leaf grade</p>
                    <div className="grid grid-cols-5 gap-2">
                      {grades.map((g) => (
                        <button
                          key={g}
                          onClick={() => setGrade(g)}
                          className={`rounded-xl border-2 py-3 font-bold ${grade === g ? "border-primary bg-primary-soft text-primary" : "bg-card"}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gold-soft p-4">
                      <p className="text-xs text-muted-foreground">Season price</p>
                      <p className="text-lg font-extrabold text-gold">
                        {money(priceTable[grade])}/kg
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary-soft p-4">
                      <p className="text-xs text-muted-foreground">Bale value</p>
                      <p className="text-lg font-extrabold text-primary">
                        {money(selected.weightKg * priceTable[grade])}
                      </p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full rounded-xl" onClick={saveGrade}>
                    <Check /> Confirm grade & price
                  </Button>
                </div>
              </>
            )}
            {screen === "prices" && (
              <>
                <SubHeader title="2026 Season Prices" onBack={() => setScreen("home")} />
                <div className="space-y-3 px-5">
                  {grades.map((g) => (
                    <div
                      key={g}
                      className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-card"
                    >
                      <div>
                        <p className="font-bold">Grade {g}</p>
                        <p className="text-xs text-muted-foreground">Virginia flue-cured</p>
                      </div>
                      <p className="text-lg font-extrabold text-primary">
                        {money(priceTable[g])}
                        <span className="text-xs font-normal text-muted-foreground">/kg</span>
                      </p>
                    </div>
                  ))}
                </div>
              </>
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
          <BottomNav
            tabs={tabs}
            active={screen === "grade" ? "queue" : screen}
            onChange={setScreen}
          />
        </>
      )}
    </DeviceFrame>
  );
}
