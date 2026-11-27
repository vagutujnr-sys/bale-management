import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bus, Home, LogOut, MapPin, MoreHorizontal, Route as RouteIcon, Truck } from "lucide-react";
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
import { trips as seed, vehicles, type Trip } from "@/data/ops";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: [
      ...pwaMeta("transport"),
      { title: "Transport App — Bale Contract System" },
      {
        name: "description",
        content: "Transport coordinators plan trips and track trucks carrying tobacco bales.",
      },
      { property: "og:title", content: "Transport App — Bale Contract System" },
      {
        property: "og:description",
        content: "Plan trips and track bale trucks from farm to floor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("transport"),
  }),
  component: App,
});

type Screen = "home" | "trips" | "fleet" | "more";
const tabs: Tab<Screen>[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "trips", label: "Trips", icon: RouteIcon },
  { key: "fleet", label: "Fleet", icon: Truck },
  { key: "more", label: "More", icon: MoreHorizontal },
];
const order: Trip["status"][] = ["Planned", "Loading", "On Route", "Arrived"];
const tone = { Planned: "muted", Loading: "gold", "On Route": "ember", Arrived: "green" } as const;

function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [list, setList] = useState<Trip[]>(seed);
  const advance = (id: string) =>
    setList((l) =>
      l.map((t) =>
        t.id === id ? { ...t, status: order[Math.min(order.indexOf(t.status) + 1, 3)]! } : t,
      ),
    );

  const TripCard = ({ t }: { t: Trip }) => (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex justify-between">
        <p className="font-bold">
          {t.id} • {t.vehicle}
        </p>
        <Pill tone={tone[t.status]}>{t.status}</Pill>
      </div>
      <p className="mt-1 flex items-center gap-1 text-sm">
        <MapPin className="h-4 w-4 text-primary" /> {t.route}
      </p>
      <p className="text-xs text-muted-foreground">
        {t.driver} • {t.bales} bales • ETA {t.eta}
      </p>
      <div className="mt-3 flex gap-1">
        {order.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= order.indexOf(t.status) ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
      {t.status !== "Arrived" && (
        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => advance(t.id)}>
          Mark as {order[order.indexOf(t.status) + 1]}
        </Button>
      )}
    </div>
  );

  return (
    <DeviceFrame
      side={
        <AppSide
          name="Transport App"
          about="For transport coordinators: assign trucks and drivers to deliveries and dispatches, and follow each trip from loading to arrival."
          tryThis="move a trip along to its next stage."
        />
      }
    >
      {!signedIn ? (
        <MobileLogin
          appName="Transport App"
          idLabel="Mobile number"
          onSignIn={() => setSignedIn(true)}
        />
      ) : (
        <>
          <main className="no-scrollbar flex-1 overflow-y-auto pb-6">
            {screen === "home" && (
              <>
                <AppHeader appName="Transport" />
                <RoleHero role="Transport Coordinator" area="Fleet & Trips" icon={Bus} />
                <div className="space-y-6 px-5 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={RouteIcon}
                      value={list.filter((t) => t.status === "On Route").length}
                      label="On route"
                      tone="ember"
                    />
                    <StatCard
                      icon={Truck}
                      value={list.filter((t) => t.status === "Loading").length}
                      label="Loading"
                      tone="gold"
                    />
                    <StatCard
                      icon={MapPin}
                      value={list.filter((t) => t.status === "Arrived").length}
                      label="Arrived today"
                    />
                    <StatCard
                      icon={Bus}
                      value={vehicles.length}
                      label="Vehicles"
                      onClick={() => setScreen("fleet")}
                    />
                  </div>
                  <div>
                    <SectionTitle
                      title="Active trips"
                      action="View All"
                      onAction={() => setScreen("trips")}
                    />
                    <div className="space-y-3">
                      {list
                        .filter((t) => t.status !== "Arrived")
                        .slice(0, 2)
                        .map((t) => (
                          <TripCard key={t.id} t={t} />
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {screen === "trips" && (
              <>
                <SubHeader title="Trips" onBack={() => setScreen("home")} />
                <div className="space-y-3 px-5">
                  {list.map((t) => (
                    <TripCard key={t.id} t={t} />
                  ))}
                </div>
              </>
            )}
            {screen === "fleet" && (
              <>
                <SubHeader title="Fleet" onBack={() => setScreen("home")} />
                <ul className="space-y-3 px-5">
                  {vehicles.map((v) => (
                    <li
                      key={v.reg}
                      className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card"
                    >
                      <Truck className="h-7 w-7 text-primary" />
                      <div className="flex-1">
                        <p className="font-bold">{v.reg}</p>
                        <p className="text-xs text-muted-foreground">{v.type}</p>
                      </div>
                      <Pill tone={v.status === "Available" ? "green" : "ember"}>{v.status}</Pill>
                    </li>
                  ))}
                </ul>
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
