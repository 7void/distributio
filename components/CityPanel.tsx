"use client";

import type { ScoreBand, ScoredCity } from "@/lib/types";

interface CityPanelProps {
  city: ScoredCity;
}

const bandClasses: Record<ScoreBand, string> = {
  PRIME: "border-[#00ff88]/20 bg-[#00ff88]/10 text-accent",
  STRONG: "border-[#aaff44]/20 bg-[#aaff44]/10 text-[#aaff44]",
  MODERATE: "border-[#ffcc00]/20 bg-[#ffcc00]/10 text-[#ffcc00]",
  WEAK: "border-[#ff8800]/20 bg-[#ff8800]/10 text-[#ff8800]",
  AVOID: "border-[#ff3355]/20 bg-[#ff3355]/10 text-[#ff3355]"
};

const levelLabels: Record<ScoredCity["distributionLevel"], string> = {
  0: "Level 0 — Direct flagship or owned channel",
  1: "Level 1 — Distributor to retailer",
  2: "Level 2 — Wholesaler to retailer",
  3: "Level 3 — Broker-agent to wholesaler to retailer"
};

const profileLabels: Record<ScoredCity["distributorProfile"], string> = {
  direct: "Brand-owned direct team",
  retailer: "Modern trade and priority retailers",
  wholesaler: "Regional wholesalers with retailer reach",
  "broker-agent": "Broker-agent network for market activation"
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function CityPanel({ city }: CityPanelProps) {
  return (
    <section className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold text-foreground">
            {city.name}
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            {city.state} · Tier {city.tier}
          </p>
        </div>
        <span
          className={`border px-2 py-1 text-[9px] uppercase tracking-[0.2em] ${bandClasses[city.band]}`}
        >
          {city.band}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="border border-[#0f1a10] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Score
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-accent">
            {city.score}/100
          </p>
        </div>
        <div className="border border-[#0f1a10] p-3">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Demand
          </p>
          <p className="mt-2 text-lg text-foreground">
            {formatNumber(city.demand)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#7a9678]">
            units/mo
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm leading-6">
        <p className="text-[#7a9678]">
          Range: P10 {formatNumber(city.demandLow)} — P90{" "}
          {formatNumber(city.demandHigh)}
        </p>
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Distribution Level
          </p>
          <p className="mt-1 text-[#c8e8c0]">
            {levelLabels[city.distributionLevel]}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Distribution Type
          </p>
          <p className="mt-1 text-[#c8e8c0]">
            {titleCase(city.distributionType)}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Distributor Profile
          </p>
          <p className="mt-1 text-[#c8e8c0]">
            {profileLabels[city.distributorProfile]}
          </p>
        </div>
        <p className="border border-[#00ff88]/20 bg-[#00ff88]/10 p-3 text-[#c8e8c0]">
          {city.cityRecommendation}
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Top Challenges
          </p>
          <ul className="grid gap-2 text-sm text-[#c8e8c0]">
            {city.topDistributionChallenges.slice(0, 2).map((challenge) => (
              <li key={challenge}>• {challenge}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Strong Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {city.strongCategories.map((category) => (
              <span
                key={category}
                className="border border-[#0f1a10] bg-[#111c12] px-2 py-1 text-[10px] text-[#c8e8c0]"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
