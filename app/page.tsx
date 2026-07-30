"use client";

import { ArrowRight } from "lucide-react";

const FEATURES = [
  {
    label: "Where to distribute",
    description:
      "Ranks every Indian city by demand potential, affordability, competition, logistics feasibility, and channel availability — specific to your product."
  },
  {
    label: "How much & when",
    description:
      "Demand forecasts with low/base/high scenarios, inventory allocation by market, seasonal windows, and replenishment signals before stockouts hit."
  },
  {
    label: "What to do next",
    description:
      "A ranked launch sequence, channel mix recommendation, risk register, and a McKinsey-style strategy memo — not a dashboard full of numbers to interpret."
  }
];

const EXAMPLES = [
  "Premium energy drink targeting gym-goers — where in India?",
  "₹40/kg atta competing with Aashirvaad across Tier 2 cities",
  "₹15,000 smartwatch, D2C-first, urban professionals",
  "Cold-pressed juice at ₹180/bottle, needs refrigeration"
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-12">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <a
          href="/"
          className="font-heading text-xl font-extrabold tracking-tight text-accent"
        >
          distribut.io
        </a>
        <p className="text-right text-[9px] uppercase tracking-[0.2em] text-[#2e4d30] sm:text-[10px]">
          DISTRIBUTION INTELLIGENCE · INDIA
        </p>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl flex-col justify-center py-10">
        <div className="max-w-5xl">
          <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            AI-powered market entry simulator
          </p>
          <h1 className="font-heading text-5xl font-extrabold leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
            You have a product.{" "}
            <br className="hidden sm:block" />
            We&apos;ll map its future.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#7a9678] sm:text-xl">
            Tell us about your product. distribut.io analyses 50+ Indian markets,
            calibrates scoring weights to your specific product context, and
            produces a ranked launch strategy — not a generic report.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="/onboarding"
            className="inline-flex min-h-14 items-center justify-center gap-2 border border-[#00ff88] bg-[#00ff88] px-8 text-sm font-medium uppercase tracking-[0.2em] text-[#031009] transition hover:bg-[#78ffbd]"
          >
            Start analysis
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            5-step profile · takes under 3 minutes
          </p>
        </div>

        {/* Feature columns */}
        <div className="mt-16 grid gap-px border border-[#0f1a10] bg-[#0f1a10] sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-[#050810] p-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-accent">
                {f.label}
              </p>
              <p className="text-sm leading-7 text-[#7a9678]">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Example products */}
        <div className="mt-10">
          <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Example analyses
          </p>
          <div className="flex flex-wrap gap-3">
            {EXAMPLES.map((ex) => (
              <div
                key={ex}
                className="border border-[#0f1a10] bg-[#0a1210] px-4 py-3 text-xs leading-5 text-[#7a9678]"
              >
                {ex}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
