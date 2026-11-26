import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Download, Menu, X } from "lucide-react";
import background from "@/assets/background-sunset.png";
import appIcon from "@/assets/leaf-appicon.png";
import appScreenshot from "@/assets/appscreenshot.png";
import { InstallAppButton } from "@/components/install-app-button";
import { Button } from "@/components/ui/button";
import { priceTable, type Grade } from "@/data/ops";
import { pwaLinks, pwaMeta } from "@/lib/pwa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      ...pwaMeta("farmer"),
      { title: "Farmer App — Bale Contract System" },
      {
        name: "description",
        content:
          "Keep your tobacco contract, deliveries, bale grades and payments close at hand with the Farmer App.",
      },
      { property: "og:title", content: "Farmer App — Bale Contract System" },
      {
        property: "og:description",
        content: "Your tobacco season, contract and payments in one simple app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: pwaLinks("farmer"),
  }),
  component: Index,
});

function Index() {
  const [menuOpen, setMenuOpen] = useState(false);
  const grades = Object.entries(priceTable) as [Grade, number][];
  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="min-h-screen overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(90deg, rgb(13 27 16 / 78%), rgb(13 27 16 / 46%)), url(${background})`,
        backgroundAttachment: "fixed",
      }}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#102016]/90 text-white shadow-lg backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3"
            aria-label="Bale Contract System home"
          >
            <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
            <span className="font-bold leading-tight">Bale Contract System</span>
          </Link>
          <nav
            aria-label="Main menu"
            className="hidden items-center gap-6 text-sm font-semibold md:flex"
          >
            <Link to="/about" className="text-white/80 transition hover:text-white">
              About
            </Link>
            <Link to="/about#how-it-works" className="text-white/80 transition hover:text-white">
              How it works
            </Link>
            <a href="#download" className="text-white/80 transition hover:text-white">
              Download
            </a>
          </nav>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/25 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="absolute inset-0 bg-black/60"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              className="absolute inset-y-0 right-0 flex w-[min(84vw,340px)] flex-col border-l border-white/10 bg-[#102016] p-6 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/15 pb-5">
                <span className="font-bold">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav aria-label="Mobile menu" className="mt-4 grid gap-2">
                <Link
                  to="/about"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 font-medium text-white/85 hover:bg-white/10"
                >
                  About
                </Link>
                <Link
                  to="/about#how-it-works"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 font-medium text-white/85 hover:bg-white/10"
                >
                  How it works
                </Link>
                <a
                  href="#download"
                  onClick={closeMenu}
                  className="rounded-xl px-3 py-3 font-medium text-white/85 hover:bg-white/10"
                >
                  Download
                </a>
              </nav>
            </aside>
          </div>
        )}
      </header>

      <section
        aria-label="Indicative tobacco buying prices"
        className="overflow-hidden border-b border-amber-100 bg-[#fff9eb] py-3 text-primary-deep shadow-md"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-6">
          <div className="shrink-0 border-r border-amber-200 pr-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
              Grade prices
            </p>
            <p className="text-xs text-muted-foreground">USD / kg · per grade</p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="flex w-max animate-price-marquee items-center gap-8 hover:[animation-play-state:paused]">
              {[...grades, ...grades].map(([grade, price], index) => (
                <span
                  key={`${grade}-${index}`}
                  aria-hidden={index >= grades.length}
                  className="flex items-baseline gap-2 whitespace-nowrap"
                >
                  <span className="text-xs font-semibold text-muted-foreground">Grade {grade}</span>
                  <span className="text-lg font-extrabold">${price.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/ kg</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-1 max-w-6xl px-6 text-[10px] text-muted-foreground">
          Indicative rates; final bale prices are confirmed during grading. Contact the buying floor
          for current rates.
        </p>
      </section>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-primary-deep">
              <img src={appIcon} alt="" className="h-5 w-5 object-contain" /> Made for tobacco
              farmers
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
              Your tobacco season, all in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">
              Check your contract, plan deliveries, follow your bales and see your payments from
              your phone.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:max-w-sm">
              <Button asChild size="lg" className="w-full rounded-xl">
                <Link to="/farmer">
                  Open Farmer App <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/80">
              Track your season from your phone or install the Farmer App for quick access.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[300px] animate-phone-float">
            <div className="absolute -inset-8 rounded-full bg-primary/20 blur-2xl" />
            <img
              src={appScreenshot}
              alt="Farmer App home screen showing Mufaro Dube's contract, deliveries, grade, payment and next delivery"
              className="relative block h-auto w-full rounded-lg border-[5px] border-device shadow-device"
            />
          </div>
        </section>

        <section
          id="download"
          className="scroll-mt-32 bg-gradient-to-br from-primary-deep to-primary px-6 py-14 text-white"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-200">
              Choose your app
            </p>
            <h2 className="mt-3 text-3xl font-extrabold">Made for your side of the journey.</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <DownloadCard
                appName="Farmer App"
                description="Contracts, delivery bookings, bale grades, sales statements and payments."
                installName="Farmer App"
                to="/farmer"
                audience="I'm a Farmer"
              />
              <DownloadCard
                appName="Driver/Transporter App"
                description="Register your truck and driver details, then keep track of tobacco delivery jobs."
                installName="Driver/Transporter App"
                to="/driver"
                audience="Driver / Transporter App"
              />
            </div>
          </div>
        </section>

        <footer className="border-t border-white/15 bg-black/45 px-6 py-8 text-white/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm">Farmer App · Driver/Transporter App · Bale Contract System</p>
              <div className="flex gap-5 text-xs">
                <a href="#privacy" className="hover:text-white">
                  Privacy policy
                </a>
                <a href="#terms" className="hover:text-white">
                  Terms and conditions
                </a>
              </div>
            </div>
            <div className="grid gap-5 border-t border-white/15 pt-5 text-xs leading-relaxed sm:grid-cols-2">
              <section id="privacy" className="scroll-mt-32">
                <h2 className="font-bold text-white">Privacy policy</h2>
                <p className="mt-1">
                  Information entered in the transporter registration form is not currently
                  transmitted or retained. Contact the company directly to complete registration.
                </p>
              </section>
              <section id="terms" className="scroll-mt-32">
                <h2 className="font-bold text-white">Terms and conditions</h2>
                <p className="mt-1">
                  Rates are indicative and final prices are confirmed after grading. Delivery
                  requests and transporter registrations require confirmation by the company.
                </p>
              </section>
            </div>
            <p className="text-[10px] text-white/55">© Bale Contract System</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function DownloadCard({
  appName,
  description,
  installName,
  to,
  audience,
}: {
  appName: string;
  description: string;
  installName: string;
  to: "/farmer" | "/driver";
  audience: string;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <img src={appIcon} alt="" className="h-11 w-11 rounded-xl bg-white/90 p-1 object-contain" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-lime-200">{audience}</p>
          <h3 className="text-lg font-bold">{appName}</h3>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-white/80">{description}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button asChild variant="secondary" className="w-full">
          <Link to={to}>
            Open app <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {to === "/farmer" ? (
          <div className="rounded-xl bg-white px-2 py-1 text-primary-deep">
            <InstallAppButton appName={installName} />
          </div>
        ) : (
          <Button
            asChild
            variant="outline"
            className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link to="/driver">
              Register &amp; download <Download className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
