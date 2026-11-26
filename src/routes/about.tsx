import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Banknote, FileText, Sprout, Truck } from "lucide-react";
import appIcon from "@/assets/leaf-appicon.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Farmer App — Bale Contract System" },
      {
        name: "description",
        content:
          "Learn how tobacco farmers can follow their contracts, deliveries, bale grades and payments.",
      },
    ],
  }),
  component: AboutPage,
});

const steps = [
  {
    icon: FileText,
    title: "View your contract",
    description: "Check your season, contracted amount and delivery progress.",
  },
  {
    icon: Truck,
    title: "Plan a delivery",
    description: "Request a delivery slot and keep your booking details handy.",
  },
  {
    icon: Sprout,
    title: "Follow your bales",
    description: "See recorded bale weights, grades and pricing.",
  },
  {
    icon: Banknote,
    title: "Track your payment",
    description: "Review sales statements, deductions and payment updates.",
  },
];

function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f7f5eb] text-primary-deep">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3 font-bold">
            <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
            Bale Contract System
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">For farmers</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold md:text-5xl">
          Your crop. Your contract. Your progress.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          The Farmer App brings the key parts of your tobacco season together. Check your contract,
          plan deliveries, follow bale grades, and review sales statements and payment updates from
          your phone.
        </p>

        <section id="how-it-works" className="mt-14 scroll-mt-8">
          <h2 className="text-3xl font-extrabold">How it works</h2>
          <p className="mt-2 text-muted-foreground">
            Follow each step from your season contract through to your payment.
          </p>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-card"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-1 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/farmer">
              Open Farmer App <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/#download">Choose your app</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
