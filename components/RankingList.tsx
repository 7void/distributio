"use client";

import type { ScoreBand, ScoredCity } from "@/lib/types";

interface RankingListProps {
  cities: ScoredCity[];
  selectedCityId: string;
  onCitySelect: (city: ScoredCity) => void;
}

const bandClasses: Record<ScoreBand, string> = {
  PRIME: "border-[#00ff88]/20 bg-[#00ff88]/10 text-accent",
  STRONG: "border-[#aaff44]/20 bg-[#aaff44]/10 text-[#aaff44]",
  MODERATE: "border-[#ffcc00]/20 bg-[#ffcc00]/10 text-[#ffcc00]",
  WEAK: "border-[#ff8800]/20 bg-[#ff8800]/10 text-[#ff8800]",
  AVOID: "border-[#ff3355]/20 bg-[#ff3355]/10 text-[#ff3355]"
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function RankingList({
  cities,
  selectedCityId,
  onCitySelect
}: RankingListProps) {
  return (
    <section className="border border-[#0f1a10] bg-[#0a1210]">
      <div className="flex items-center justify-between border-b border-[#0f1a10] p-4">
        <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          City Rankings
        </h2>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          {cities.length} markets
        </span>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {cities.map((city, index) => (
          <button
            key={city.id}
            type="button"
            onClick={() => onCitySelect(city)}
            className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_4.5rem] gap-3 border-b border-[#0f1a10] p-4 text-left transition hover:bg-[#101b13] ${
              selectedCityId === city.id ? "bg-[#102116]" : "bg-transparent"
            }`}
          >
            <span className="text-xs text-[#2e4d30]">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm text-foreground">
                  {city.name}
                </span>
                <span
                  className={`border px-2 py-1 text-[8px] uppercase tracking-[0.2em] ${bandClasses[city.band]}`}
                >
                  {city.band}
                </span>
              </span>
              <span className="mt-3 block h-1.5 bg-[#111c12]">
                <span
                  className="block h-full bg-[#00ff88]"
                  style={{ width: `${city.score}%` }}
                />
              </span>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-[#7a9678]">
                {formatNumber(city.demand)} units/mo
              </span>
            </span>
            <span className="text-right font-heading text-xl font-bold text-accent">
              {city.score}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
