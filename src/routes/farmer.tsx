import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  MoreHorizontal,
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
  SubHeader,
  type Tab,
} from "@/components/mobile/shell";
import { FarmerOnboarding } from "@/components/mobile/farmer-onboarding";
import { MobileAccountAccess } from "@/components/mobile/account-access";
import { LanguageSelector } from "@/components/mobile/language-selector";
import { LanguageProvider } from "@/lib/language";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase";
import {
  loadFarmerDashboard,
  saveAccountFarm,
  type AccountFarm,
  type FarmerDashboard,
  type LinkedAccountProfile,
} from "@/lib/account-auth";

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
function FarmerApp() {
  return (
    <LanguageProvider>
      <FarmerAppContent />
    </LanguageProvider>
  );
}

function FarmerAppContent() {
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<LinkedAccountProfile | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [dashboard, setDashboard] = useState<FarmerDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (!signedIn) {
      setDashboard(null);
      setDashboardError("");
      return;
    }

    let active = true;
    setDashboardLoading(true);
    setDashboardError("");
    void loadFarmerDashboard()
      .then((records) => {
        if (active) setDashboard(records);
      })
      .catch((error: unknown) => {
        if (active) {
          setDashboardError(
            error instanceof Error ? error.message : "Your farmer records could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });

    return () => {
      active = false;
    };
  }, [signedIn, account?.farmer?.id]);

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
                setScreen("home");
              }
            }}
          />
        ) : (
          <>
            <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-6">
              {screen === "home" && (
                <HomeScreen
                  go={go}
                  farmer={account?.farmer}
                  displayName={account?.profile.displayName}
                  dashboard={dashboard}
                  dashboardLoading={dashboardLoading}
                  dashboardError={dashboardError}
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
              {screen === "contract" && (
                <LiveDataScreen
                  section="contract"
                  title="My Contract"
                  back={() => go("home")}
                  contractingCompany={account?.farmer?.contracting_company}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                />
              )}
              {screen === "deliveries" && (
                <LiveDataScreen
                  section="deliveries"
                  title="Deliveries"
                  back={() => go("home")}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                />
              )}
              {screen === "payments" && (
                <LiveDataScreen
                  section="payments"
                  title="Payments"
                  back={() => go("home")}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                />
              )}
              {screen === "profile" && account && (
                <ProfileScreen
                  back={() => go("home")}
                  profile={account.profile}
                  farmer={account?.farmer}
                  completion={account?.completion}
                  farms={account?.farms ?? []}
                  onSetupProfile={() => go("onboarding")}
                  onFarmsChange={(farms) =>
                    setAccount((current) => (current ? { ...current, farms } : current))
                  }
                />
              )}
              {screen === "bales" && (
                <LiveDataScreen
                  section="bales"
                  title="Bale Tracking"
                  back={() => go("home")}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                />
              )}
              {screen === "statements" && (
                <LiveDataScreen
                  section="statements"
                  title="Sales Statements"
                  back={() => go("home")}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
                />
              )}
              {screen === "settings" && <SettingsScreen back={() => go("home")} />}
              {screen === "notifications" && (
                <LiveDataScreen
                  section="notifications"
                  title="Notifications"
                  back={() => go("home")}
                  dashboard={dashboard}
                  loading={dashboardLoading}
                  error={dashboardError}
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
            {drawer && account && (
              <Drawer
                go={go}
                profile={account.profile}
                farmer={account.farmer}
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
  farmer,
  displayName,
  dashboard,
  dashboardLoading,
  dashboardError,
}: {
  go: (s: Screen) => void;
  farmer?: LinkedAccountProfile["farmer"] | undefined;
  displayName?: string;
  dashboard: FarmerDashboard | null;
  dashboardLoading: boolean;
  dashboardError: string;
}) {
  const { t } = useLanguage();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const farmerName = farmer
    ? `${farmer.first_name} ${farmer.surname}`
    : (displayName ?? t("Farmer"));
  const activeContract =
    dashboard?.contracts.find((contract) =>
      ["active", "approved", "signed"].includes(contract.status.toLowerCase()),
    ) ?? dashboard?.contracts[0];
  const seasonSummary =
    dashboard?.seasonSummaries.find((summary) => summary.contract_id === activeContract?.id) ??
    dashboard?.seasonSummaries[0];
  const latestInspection = [...(dashboard?.qualityInspections ?? [])].sort(
    (left, right) => activityTimestamp(right.inspected_at) - activityTimestamp(left.inspected_at),
  )[0];
  const latestPayment = [...(dashboard?.paymentTransactions ?? [])]
    .filter((payment) => payment.processed_amount !== null)
    .sort(
      (left, right) =>
        activityTimestamp(right.processed_at ?? right.collected_at) -
        activityTimestamp(left.processed_at ?? left.collected_at),
    )[0];
  const nextDelivery = [...(dashboard?.deliveries ?? [])]
    .filter((delivery) => {
      if (!delivery.delivery_date) return false;
      const status = delivery.status.toLowerCase();
      return (
        delivery.delivery_date.slice(0, 10) >= new Date().toISOString().slice(0, 10) &&
        !["cancelled", "completed", "delivered"].includes(status)
      );
    })
    .sort((left, right) => (left.delivery_date ?? "").localeCompare(right.delivery_date ?? ""))[0];
  const stats = [
    {
      icon: Sprout,
      label: "Bales Delivered",
      screen: "bales" as const,
      value: dashboardLoading ? t("Loading...") : dashboard ? String(dashboard.bales.length) : "—",
      color: "text-primary",
    },
    {
      icon: Scale,
      label: "Latest Grade",
      screen: "bales" as const,
      value: dashboardLoading ? t("Loading...") : latestInspection?.grade || "—",
      color: "text-gold",
    },
    {
      icon: Wallet,
      label: "Last Payment",
      screen: "payments" as const,
      value: dashboardLoading
        ? t("Loading...")
        : latestPayment
          ? formatUsd(latestPayment.processed_amount)
          : "—",
      color: "text-primary",
    },
    {
      icon: CalendarDays,
      label: "Next Delivery",
      screen: "deliveries" as const,
      value: dashboardLoading
        ? t("Loading...")
        : nextDelivery?.delivery_date
          ? formatShortDate(nextDelivery.delivery_date)
          : "—",
      color: "text-primary",
    },
  ];
  const journey = [
    { label: "Farmer Registration", completed: Boolean(farmer) },
    {
      label: "Contract Approval",
      completed: Boolean(
        dashboard?.contracts.some((contract) =>
          ["active", "approved", "signed"].includes(contract.status.toLowerCase()),
        ),
      ),
    },
    { label: "Delivery Scheduled", completed: Boolean(dashboard?.deliveries.length) },
    { label: "Bale Reception & Weighing", completed: Boolean(dashboard?.bales.length) },
    {
      label: "Grading & Pricing",
      completed: Boolean(dashboard?.qualityInspections.length || dashboard?.balePrices.length),
    },
    {
      label: "Purchase & Payment",
      completed: Boolean(dashboard?.salesSheets.length || dashboard?.paymentTransactions.length),
    },
  ];
  let nextJourneyStep = true;
  return (
    <>
      <div className="sticky top-0 z-10 bg-field">
        <AppHeader appName="Tobacco Contract System" onBell={() => go("notifications")} />
      </div>
      <div className="bg-field pb-6">
        <div className="px-5 pt-6">
          <p className="text-muted-foreground">{t(greet)},</p>
          <h1 className="text-3xl font-extrabold text-primary-deep">{farmerName}</h1>
          <p className="text-sm text-muted-foreground">
            {farmer
              ? `${t("Grower")} #${farmer.grower_number}`
              : t("Your tobacco journey, our priority")}
          </p>
        </div>
      </div>
      <div className="space-y-6 px-5">
        {dashboardLoading && (
          <p className="text-sm text-muted-foreground">{t("Loading your records...")}</p>
        )}
        {dashboardError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive"
          >
            {dashboardError}
          </p>
        )}
        <button
          type="button"
          onClick={() => go("contract")}
          className="-mt-8 flex w-full items-center gap-4 rounded-[30px] bg-primary-deep p-6 text-left text-primary-foreground shadow-card transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText aria-hidden="true" className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-primary-foreground/75">{t("My Contract")}</p>
            <p className="mt-1 truncate text-2xl font-extrabold">
              {seasonSummary
                ? `${seasonSummary.season_year} ${t("Season")}`
                : (activeContract?.contract_ref ?? t("No contract linked"))}
            </p>
          </div>
          <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold">
            {activeContract ? t(titleCase(activeContract.status)) : t("How to apply")}
          </span>
          <ChevronRight aria-hidden="true" className="h-6 w-6 shrink-0" />
        </button>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <button
              type="button"
              key={stat.label}
              onClick={() => go(stat.screen)}
              className="flex min-h-28 items-center gap-3 rounded-3xl border bg-card p-4 text-left shadow-card"
            >
              <stat.icon aria-hidden="true" className={`h-9 w-9 shrink-0 ${stat.color}`} />
              <span className="min-w-0">
                <span className="block truncate text-xl font-extrabold">{stat.value}</span>
                <span className="mt-1 block text-sm leading-tight text-muted-foreground">
                  {t(stat.label)}
                </span>
              </span>
            </button>
          ))}
        </div>
        {!dashboardLoading && !dashboardError && (
          <section aria-labelledby="farmer-journey-title" className="pb-4">
            <h2 id="farmer-journey-title" className="mb-4 text-lg font-bold">
              {t("My Tobacco Journey")}
            </h2>
            <div>
              {journey.map((stage, index) => {
                const isNext = !stage.completed && nextJourneyStep;
                if (isNext) nextJourneyStep = false;
                return (
                  <div key={stage.label} className="flex min-h-12 gap-3">
                    <div className="flex w-7 shrink-0 flex-col items-center">
                      <span
                        className={`mt-1 h-5 w-5 rounded-full border-2 ${
                          stage.completed
                            ? "border-primary bg-primary"
                            : isNext
                              ? "border-primary bg-background"
                              : "border-muted-foreground/30 bg-background"
                        }`}
                      />
                      {index < journey.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="flex min-h-12 flex-1 items-start justify-between gap-2 pb-3">
                      <span className="pt-1 text-sm font-medium">{t(stage.label)}</span>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          stage.completed
                            ? "bg-primary-soft text-primary-deep"
                            : isNext
                              ? "bg-muted text-muted-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {t(stage.completed ? "Completed" : isNext ? "Next" : "Pending")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function activityTimestamp(date: string | null | undefined) {
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatShortDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

function titleCase(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{t(k)}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}

type FarmerDataSection =
  "contract" | "deliveries" | "payments" | "bales" | "statements" | "notifications";

function LiveDataScreen({
  section,
  title,
  back,
  contractingCompany,
  dashboard,
  loading,
  error,
}: {
  section: FarmerDataSection;
  title: string;
  back: () => void;
  contractingCompany?: string;
  dashboard: FarmerDashboard | null;
  loading: boolean;
  error: string;
}) {
  const { t } = useLanguage();
  const contracts = dashboard?.contracts ?? [];
  const deliveries = dashboard?.deliveries ?? [];
  const bales = dashboard?.bales ?? [];
  const salesSheets = dashboard?.salesSheets ?? [];
  const paymentRequests = dashboard?.paymentRequests ?? [];
  const hasRecords =
    section === "contract"
      ? contracts.length > 0
      : section === "deliveries"
        ? deliveries.length > 0
        : section === "bales"
          ? bales.length > 0
          : section === "statements"
            ? salesSheets.length > 0
            : section === "payments"
              ? paymentRequests.length > 0
              : false;

  return (
    <>
      <SubHeader title={title} onBack={back} />
      <div className="space-y-3 px-5 py-4">
        {section === "contract" && (
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <h2 className="font-semibold">{t("How to apply for a contract")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {contractingCompany
                ? t("Contact {company} or your local office to apply.", {
                    company: contractingCompany,
                  })
                : t("Contact your contracting company or nearest local office to apply.")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Once linked to your account, your contract will appear here.")}
            </p>
          </section>
        )}
        {loading && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("Loading your records...")}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {!loading && !error && section === "notifications" && (
          <p className="py-6 text-center font-semibold">
            {t("This section is not connected to live records yet.")}
          </p>
        )}
        {!loading &&
          !error &&
          !hasRecords &&
          section !== "notifications" &&
          section !== "contract" && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("No live records are available yet.")}
            </p>
          )}
        {!loading &&
          !error &&
          section === "contract" &&
          contracts.map((contract) => {
            const summary = dashboard?.seasonSummaries.find(
              (item) => item.contract_id === contract.id,
            );
            return (
              <section key={contract.id} className="rounded-2xl border bg-card px-4 shadow-card">
                <p className="py-3 font-semibold">
                  {contract.contract_ref} · {t(contract.status)}
                </p>
                <Row k="Contracted quantity" v={formatKg(contract.contracted_quantity_kg)} />
                {contract.expected_deliveries != null && (
                  <Row k="Expected deliveries" v={contract.expected_deliveries} />
                )}
                {contract.starts_on && <Row k="Start date" v={formatDate(contract.starts_on)} />}
                {contract.ends_on && <Row k="End date" v={formatDate(contract.ends_on)} />}
                {summary && <Row k="Received quantity" v={formatKg(summary.received_kg)} />}
              </section>
            );
          })}
        {!loading &&
          !error &&
          section === "deliveries" &&
          deliveries.map((delivery) => {
            const receivedBales = bales.filter((bale) => bale.delivery_id === delivery.id).length;
            return (
              <section key={delivery.id} className="rounded-2xl border bg-card px-4 shadow-card">
                <p className="py-3 font-semibold">
                  {delivery.delivery_ref} · {t(delivery.status)}
                </p>
                {delivery.delivery_date && (
                  <Row k="Delivery date" v={formatDate(delivery.delivery_date)} />
                )}
                {delivery.expected_bale_count != null && (
                  <Row k="Expected bales" v={delivery.expected_bale_count} />
                )}
                <Row k="Bales received" v={receivedBales} />
                {receivedBales > 0 && (
                  <Row
                    k="Received weight"
                    v={formatKg(
                      bales
                        .filter((bale) => bale.delivery_id === delivery.id)
                        .reduce((total, bale) => total + toNumber(bale.received_weight_kg), 0),
                    )}
                  />
                )}
                {delivery.expected_weight_kg != null && (
                  <Row k="Expected weight" v={formatKg(delivery.expected_weight_kg)} />
                )}
              </section>
            );
          })}
        {!loading &&
          !error &&
          section === "bales" &&
          bales.map((bale) => {
            const inspection = dashboard?.qualityInspections.find(
              (item) => item.bale_id === bale.id,
            );
            const location = dashboard?.baleLocations.find((item) => item.bale_id === bale.id);
            const price = dashboard?.balePrices.find((item) => item.bale_id === bale.id);
            return (
              <section key={bale.id} className="rounded-2xl border bg-card px-4 shadow-card">
                <p className="py-3 font-semibold">{bale.bale_ref}</p>
                {bale.received_weight_kg != null && (
                  <Row k="Received weight" v={formatKg(bale.received_weight_kg)} />
                )}
                {inspection?.grade && <Row k="Grade" v={inspection.grade} />}
                {location?.location_ref && <Row k="Location" v={location.location_ref} />}
                {price?.final_price_per_kg != null && (
                  <Row k="Price per kg" v={formatUsd(price.final_price_per_kg)} />
                )}
                {price?.purchase_value != null && (
                  <Row k="Value" v={formatUsd(price.purchase_value)} />
                )}
              </section>
            );
          })}
        {!loading &&
          !error &&
          section === "statements" &&
          salesSheets.map((sheet) => {
            const items =
              dashboard?.salesSheetItems.filter((item) => item.sales_sheet_id === sheet.id) ?? [];
            const adjustments =
              dashboard?.salesSheetAdjustments.filter(
                (adjustment) => adjustment.sales_sheet_id === sheet.id,
              ) ?? [];
            return (
              <section key={sheet.id} className="rounded-2xl border bg-card px-4 shadow-card">
                <p className="py-3 font-semibold">
                  {sheet.sales_sheet_ref} · {t(sheet.status)}
                </p>
                <Row k="Statement date" v={formatDate(sheet.created_at)} />
                <Row k="Gross amount" v={formatUsd(sheet.gross_amount)} />
                <Row k="Bales" v={items.length} />
                {items.length > 0 && (
                  <Row
                    k="Total weight"
                    v={formatKg(items.reduce((total, item) => total + toNumber(item.weight_kg), 0))}
                  />
                )}
                {adjustments.map((adjustment, index) => (
                  <Row
                    key={`${adjustment.category}-${index}`}
                    k={adjustment.description || adjustment.category}
                    v={formatUsd(adjustment.amount)}
                  />
                ))}
              </section>
            );
          })}
        {!loading &&
          !error &&
          section === "payments" &&
          paymentRequests.map((payment) => {
            const transactions =
              dashboard?.paymentTransactions.filter(
                (transaction) => transaction.payment_request_id === payment.id,
              ) ?? [];
            return (
              <section key={payment.id} className="rounded-2xl border bg-card px-4 shadow-card">
                <p className="py-3 font-semibold">
                  {payment.payment_ref} · {t(payment.status)}
                </p>
                <Row k="Requested amount" v={formatUsd(payment.amount)} />
                {payment.payment_method && <Row k="Payment method" v={payment.payment_method} />}
                {payment.collection_point && (
                  <Row k="Collection point" v={payment.collection_point} />
                )}
                {transactions.map((transaction, index) => (
                  <div
                    key={`${transaction.payment_reference ?? transaction.processed_at}-${index}`}
                  >
                    {transaction.processed_amount != null && (
                      <Row k="Processed amount" v={formatUsd(transaction.processed_amount)} />
                    )}
                    {transaction.processed_at && (
                      <Row k="Processed on" v={formatDate(transaction.processed_at)} />
                    )}
                  </div>
                ))}
              </section>
            );
          })}
      </div>
    </>
  );
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string" || value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKg(value: number | string | null | undefined) {
  return `${new Intl.NumberFormat().format(toNumber(value))} kg`;
}

function formatUsd(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    toNumber(value),
  );
}

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function ProfileScreen({
  back,
  profile,
  farmer,
  completion,
  farms,
  onSetupProfile,
  onFarmsChange,
}: {
  back: () => void;
  profile: LinkedAccountProfile["profile"];
  farmer?: LinkedAccountProfile["farmer"] | undefined;
  completion?: number | undefined;
  farms: AccountFarm[];
  onSetupProfile: () => void;
  onFarmsChange: (farms: AccountFarm[]) => void;
}) {
  const { t } = useLanguage();
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
              {farmer ? `${farmer.first_name} ${farmer.surname}` : profile.displayName}
            </p>
            <p className="text-sm text-muted-foreground">
              {farmer ? `${t("Farmer")} #${farmer.farmer_ref}` : profile.phone}
            </p>
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
              <Row k="Status" v={t(farmer.status)} />
            </>
          ) : (
            <Row k="Phone" v={profile.phone ?? ""} />
          )}
        </div>
        {!farmer && (
          <section className="space-y-2 rounded-2xl border bg-card p-4 shadow-card">
            <p className="font-semibold">{t("Finish setting up your farmer profile")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Add your farm and grower details when you are ready.")}
            </p>
            <Button type="button" onClick={onSetupProfile}>
              {t("Continue")}
            </Button>
          </section>
        )}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("My farms")}</h2>
            <Button type="button" size="sm" onClick={() => setAddingFarm(true)}>
              {t("Add farm")}
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
                  <span className="text-xs font-medium text-primary">{t("Primary")}</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingFarm}
                    onClick={() => void saveFarm(farm)}
                  >
                    {t("Make primary")}
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
                  <span className="text-sm font-medium">{t(label)}</span>
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
                  {savingFarm ? t("Saving...") : t("Save farm")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddingFarm(false)}
                  disabled={savingFarm}
                >
                  {t("Cancel")}
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
  const { t } = useLanguage();
  return (
    <>
      <SubHeader title="Settings" onBack={back} />
      <div className="px-5">
        <div className="rounded-2xl border bg-card px-4 shadow-card">
          <Row k="Language" v={<LanguageSelector />} />
        </div>
      </div>
    </>
  );
}

function Drawer({
  go,
  profile,
  farmer,
  close,
  logout,
}: {
  go: (s: Screen) => void;
  profile: LinkedAccountProfile["profile"];
  farmer?: LinkedAccountProfile["farmer"] | undefined;
  close: () => void;
  logout: () => void;
}) {
  const { t } = useLanguage();
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
          <button onClick={close} aria-label={t("Close menu")}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
          <p className="text-sm font-bold text-primary-deep">{t("Tobacco Contract System")}</p>
        </div>
        <div className="my-5 flex items-center gap-3 border-b pb-5">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <User />
          </div>
          <div>
            <p className="font-bold">
              {farmer ? `${farmer.first_name} ${farmer.surname}` : profile.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {farmer ? `${t("Farmer")} #${farmer.farmer_ref}` : profile.phone}
            </p>
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
                <span className="flex-1">{t(label)}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={logout}
          className="mt-4 flex items-center gap-4 border-t px-3 pt-4 text-ember"
        >
          <LogOut className="h-5 w-5" /> {t("Logout")}
        </button>
      </div>
      <button className="flex-1 bg-foreground/40" onClick={close} aria-label={t("Close menu")} />
    </div>
  );
}
