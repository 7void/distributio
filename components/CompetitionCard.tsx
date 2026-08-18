"use client";

import type { CompetitionIntelligence } from "@/lib/types";

interface CompetitionCardProps {
  data: CompetitionIntelligence;
}

const CONCENTRATION_LABEL: Record<string, string> = {
  low: "Low Concentration",
  medium: "Medium Concentration",
  high: "High Concentration",
};

const BARRIER_COLOR: Record<string, string> = {
  low:    "#00ff88",
  medium: "#ffcc00",
  high:   "#ff6644",
};

export default function CompetitionCard({ data }: CompetitionCardProps) {
  const hhi = data.hhi_estimate;
  // HHI scale: 0 = no competition, 10000 = monopoly
  const hhiPct = Math.min((hhi / 10000) * 100, 100);
  const hhiColor = hhi < 1500 ? "#00ff88" : hhi < 2500 ? "#ffcc00" : "#ff6644";

  const penalties = data.competition_penalty;

  return (
    <section className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h2 className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        Competition Intelligence
      </h2>
      <p className="mb-5 text-[9px] text-[#7a9678]">
        Powered by Gemini · HHI + Porter&apos;s Five Forces · Price-point sub-segmentation
      </p>

      {/* HHI Bar */}
      <div className="mb-5 grid gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#c8e8c0]">Market Concentration (HHI)</span>
          <span className="font-bold" style={{ color: hhiColor }}>
            {hhi.toLocaleString("en-IN")} — {CONCENTRATION_LABEL[data.market_concentration]}
          </span>
        </div>
        <div className="h-2 bg-[#111c12]">
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${hhiPct}%`, backgroundColor: hhiColor }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-[#2e4d30]">
          <span>0 — Greenfield</span>
          <span>1500 — Moderate</span>
          <span>10000 — Monopoly</span>
        </div>
      </div>

      {/* Entry barrier */}
      <div className="mb-5 flex items-center justify-between border border-[#0f1a10] px-3 py-2">
        <span className="text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
          Entry Barrier
        </span>
        <span
          className="text-xs font-bold uppercase"
          style={{ color: BARRIER_COLOR[data.entry_barrier] ?? "#c8e8c0" }}
        >
          {data.entry_barrier}
        </span>
      </div>

      {/* Top competitors */}
      {data.top_competitors.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
            Key Players at This Price Point
          </p>
          <div className="grid gap-2">
            {data.top_competitors.map((c) => (
              <div key={c.name} className="grid gap-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#c8e8c0]">{c.name}</span>
                  <span className="text-[#7a9678]">~{c.estimated_share_pct}%</span>
                </div>
                <div className="h-1.5 bg-[#111c12]">
                  <div
                    className="h-full bg-[#00cc6a]/60 transition-all duration-500"
                    style={{ width: `${Math.min(c.estimated_share_pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-tier score penalty */}
      <div className="mb-5 border border-[#0f1a10] p-3">
        <p className="mb-3 text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
          Score Penalty Applied per City Tier
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Tier-1 Metro", val: penalties.tier1 },
            { label: "Tier-2 City", val: penalties.tier2 },
            { label: "Tier-3 City", val: penalties.tier3 },
          ].map(({ label, val }) => (
            <div key={label} className="border border-[#0f1a10] bg-[#050810] py-2">
              <p className="text-[8px] uppercase tracking-widest text-[#2e4d30]">{label}</p>
              <p className={`mt-1 font-heading text-lg font-bold ${val > 0 ? "text-[#ff6644]" : "text-accent"}`}>
                {val > 0 ? `-${val}` : "0"}
              </p>
              <p className="text-[8px] text-[#2e4d30]">pts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gemini reasoning */}
      <div className="border-t border-[#0f1a10] pt-4">
        <p className="mb-1 text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
          Analysis
        </p>
        <p className="text-[10px] leading-5 text-[#7a9678]">{data.reasoning}</p>
      </div>
    </section>
  );
}
