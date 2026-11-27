import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Banknote,
  Check,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Home,
  LogOut,
  MoreHorizontal,
  WalletCards,
  X,
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
import { financeSheets as seed, type SheetRow } from "@/data/ops";
import { money } from "@/data/mock";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      ...pwaMeta("finance"),
      { title: "Finance App — Bale Contract System" },
      {
        name: "description",
        content: "Review tobacco sales sheets, approve farmer payments and track settlement.",
      },
      { property: "og:title", content: "Finance App — Bale Contract System" },
      { property: "og:description", content: "Approve sales sheets and track farmer payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("finance"),
  }),
  component: FinanceApp,
});

type Screen = "home" | "sheets" | "payments" | "more";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "sheets", label: "Sales Sheets", icon: FileText },
  { key: "payments", label: "Payments", icon: WalletCards },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const tone = {
  "Awaiting Approval": "gold",
  Approved: "green",
  Paid: "green",
  Rejected: "ember",
} as const;

function FinanceApp() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [sheets, setSheets] = useState<SheetRow[]>(seed);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const awaiting = sheets.filter((s) => s.status === "Awaiting Approval");
  const payable = sheets.filter((s) => s.status === "Approved");
  const paid = sheets.filter((s) => s.status === "Paid");
  const update = (id: string, status: SheetRow["status"]) => {
    setSheets((current) => current.map((s) => (s.id === id ? { ...s, status } : s)));
    setMessage(`${id} marked ${status.toLowerCase()}.`);
  };

  const SheetCard = ({ sheet, expanded = false }: { sheet: SheetRow; expanded?: boolean }) => {
    const net = sheet.gross - sheet.deductions;
    return (
      <article className="rounded-2xl border bg-card p-4 shadow-card">
        <button
          className="block w-full text-left"
          onClick={() => setOpen(open === sheet.id ? null : sheet.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold">{sheet.id}</p>
              <p className="text-xs text-muted-foreground">
                {sheet.farmer} • {sheet.bales} bales • {sheet.kg.toLocaleString()} kg
              </p>
            </div>
            <Pill tone={tone[sheet.status]}>{sheet.status}</Pill>
          </div>
          <p className="mt-3 text-xl font-extrabold text-primary">
            {money(net)}{" "}
            <span className="text-xs font-medium text-muted-foreground">net payable</span>
          </p>
        </button>
        {(expanded || open === sheet.id) && (
          <div className="mt-3 border-t pt-2 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Gross value</span>
              <span>{money(sheet.gross)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Inputs & deductions</span>
              <span>− {money(sheet.deductions)}</span>
            </div>
            <div className="flex justify-between border-t py-2 font-bold">
              <span>Net payable</span>
              <span>{money(net)}</span>
            </div>
          </div>
        )}
        {sheet.status === "Awaiting Approval" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => update(sheet.id, "Approved")}>
              <Check /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => update(sheet.id, "Rejected")}>
              <X /> Reject
            </Button>
          </div>
        )}
        {sheet.status === "Approved" && (
          <Button size="sm" className="mt-3 w-full" onClick={() => update(sheet.id, "Paid")}>
            <Banknote /> Mark bank payment paid
          </Button>
        )}
      </article>
    );
  };

  return (
    <DeviceFrame
      side={
        <AppSide
          name="Finance App"
          about="For finance officers: check bale values and deductions, approve each sales sheet and record the farmer's bank payment."
          tryThis="approve SS-2026-0952, then find it under Payments."
        />
      }
    >
      {!signedIn ? (
        <MobileLogin
          appName="Finance App"
          idLabel="Mobile number"
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && (
              <>
                <AppHeader appName="Finance" unread={awaiting.length} />
                <RoleHero
                  role="Finance Officer"
                  area="2026 Buying Season"
                  icon={CircleDollarSign}
                />
                <div className="space-y-6 px-5 pt-5">
                  {message && (
                    <p
                      role="status"
                      className="rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
                    >
                      {message}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={FileCheck2}
                      value={awaiting.length}
                      label="Awaiting approval"
                      tone="gold"
                      onClick={() => setScreen("sheets")}
                    />
                    <StatCard
                      icon={Banknote}
                      value={money(payable.reduce((sum, s) => sum + s.gross - s.deductions, 0))}
                      label="Ready to pay"
                      tone="ember"
                      onClick={() => setScreen("payments")}
                    />
                    <StatCard
                      icon={CircleDollarSign}
                      value={money(paid.reduce((sum, s) => sum + s.gross - s.deductions, 0))}
                      label="Recorded payments this season"
                    />
                    <StatCard
                      icon={FileText}
                      value={sheets.length}
                      label="Sales sheets"
                      onClick={() => setScreen("sheets")}
                    />
                  </div>
                  <div>
                    <SectionTitle
                      title="Approval queue"
                      action="All sheets"
                      onAction={() => setScreen("sheets")}
                    />
                    <div className="space-y-3">
                      {awaiting.map((s) => (
                        <SheetCard key={s.id} sheet={s} />
                      ))}
                      {awaiting.length === 0 && (
                        <p className="rounded-2xl bg-primary-soft p-5 text-center text-sm text-primary">
                          All sales sheets have been reviewed.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            {screen === "sheets" && (
              <>
                <SubHeader title="Sales Sheets" onBack={() => setScreen("home")} />
                <div className="space-y-3 px-5">
                  {message && (
                    <p
                      role="status"
                      className="rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
                    >
                      {message}
                    </p>
                  )}
                  {sheets.map((s) => (
                    <SheetCard key={s.id} sheet={s} />
                  ))}
                </div>
              </>
            )}
            {screen === "payments" && (
              <>
                <SubHeader title="Farmer Payments" onBack={() => setScreen("home")} />
                <div className="space-y-5 px-5">
                  {message && (
                    <p
                      role="status"
                      className="rounded-xl bg-primary-soft p-3 text-sm font-medium text-primary"
                    >
                      {message}
                    </p>
                  )}
                  <section>
                    <SectionTitle title="Ready for bank payment" />
                    <div className="space-y-3">
                      {payable.map((s) => (
                        <SheetCard key={s.id} sheet={s} expanded />
                      ))}
                      {payable.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No approved sheets are waiting for payment.
                        </p>
                      )}
                    </div>
                  </section>
                  <section>
                    <SectionTitle title="Paid" />
                    <div className="space-y-3">
                      {paid.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 rounded-2xl border bg-card p-4"
                        >
                          <span className="rounded-full bg-primary-soft p-2 text-primary">
                            <Check className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{s.farmer}</p>
                            <p className="text-xs text-muted-foreground">{s.id} • Bank transfer</p>
                          </div>
                          <p className="font-bold text-primary">{money(s.gross - s.deductions)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
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
          <BottomNav tabs={tabs} active={screen} onChange={setScreen} />
        </>
      )}
    </DeviceFrame>
  );
}
