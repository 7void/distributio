"use client";

import type { ScoredCity } from "@/lib/types";

interface ScoreBreakdownProps {
  city: ScoredCity;
}

function colorForContribution(value: number, isNegative = false) {
  if (isNegative) return "#ff6644";
  if (value >= 25) return "#00ff88";
  if (value >= 18) return "#aaff44";
  if (value >= 10) return "#ffcc00";
  return "#ff8800";
}

export default function ScoreBreakdown({ city }: ScoreBreakdownProps) {
  const bd = city.scoreBreakdown;

  const signalRows: [string, number][] = [
    ["Purchasing Power",     bd.incomeContribution],
    ["Retail Density",       bd.retailContribution],
    ["Digital Penetration",  bd.internetContribution],
    ["Cold Chain",           bd.coldContribution],
    ["Logistics Infrastructure", bd.logisticsContribution],
  ];

  const signalTotal = signalRows.reduce((s, [, v]) => s + v, 0);

  const adj         = bd.adjustmentContribution;
  const feasPct     = bd.feasibilityImpactPct;
  const radPen      = bd.radiusPenalty;

  // Exact derivation matching score.ts:
  // raw = (baseScore + affordAdj + adjustment) × marginMultiplier - radiusPenalty
  // The breakdown signals already include affordability in income/retail contributions.
  const afterAdj    = signalTotal + adj;
  const afterMargin = Math.round(afterAdj * (1 - feasPct / 100));
  const afterRadius = afterMargin - radPen;

  return (
    <section className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h2 className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        HOW THE SCORE IS BUILT
      </h2>

      {/* Signal contributions */}
      <div className="grid gap-4">
        {signalRows.map(([label, value]) => {
          const color = colorForContribution(value);
          return (
            <div key={label} className="grid gap-2">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-[#c8e8c0]">{label}</span>
                <span className="text-accent">{value} pts</span>
              </div>
              <div className="h-2 bg-[#111c12]">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(value, 0), 40) * 2.5}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-[#0f1a10]" />

      {/* Strategic adjustments row */}
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#7a9678]">Strategic Adjustments</span>
          <span className={adj >= 0 ? "text-accent" : "text-[#ff6644]"}>
            {adj >= 0 ? `+${adj}` : adj} pts
          </span>
        </div>
        <div className="h-1.5 bg-[#111c12]">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.min(Math.abs(adj) * 3, 100)}%`,
              backgroundColor: adj >= 0 ? "#00cc6a" : "#ff6644"
            }}
          />
        </div>
        <p className="text-[10px] text-[#2e4d30]">
          Tier, brand maturity, goal alignment, distributor readiness, region preference
        </p>
      </div>

      {/* Logistics feasibility impact */}
      <div className="mt-3 grid gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#7a9678]">Logistics Feasibility Penalty</span>
          <span className={feasPct > 20 ? "text-[#ff6644]" : "text-[#ffcc00]"}>
            -{feasPct}%
          </span>
        </div>
        <div className="h-1.5 bg-[#111c12]">
          <div
            className="h-full bg-[#ff6644] transition-all duration-500"
            style={{ width: `${Math.min(feasPct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-[#2e4d30]">
          Margin feasibility after estimated freight cost
        </p>
      </div>

      {/* Delivery radius penalty — only shown when nonzero */}
      {radPen > 0 && (
        <div className="mt-3 grid gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#7a9678]">Delivery Radius Overshoot</span>
            <span className="text-[#ff6644]">-{radPen} pts</span>
          </div>
          <div className="h-1.5 bg-[#111c12]">
            <div
              className="h-full bg-[#ff3355] transition-all duration-500"
              style={{ width: `${Math.min(radPen * 3, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-[#2e4d30]">
            City exceeds configured delivery radius from warehouse
          </p>
        </div>
      )}

      {/* Math summary — exactly traces the score.ts computation */}
      <p className="mt-5 text-xs leading-6 text-[#7a9678]">
        Signals {signalTotal}pts
        {" "}{adj >= 0 ? "+" : ""}{adj} adjustments
        {" "}→ {afterAdj}pts
        {" "}× {100 - feasPct}% feasibility
        {" "}≈ {afterMargin}pts
        {radPen > 0 && <>{" "}- {radPen} radius</>}
        {" "}→ final <span className="text-foreground font-bold">{city.score}/100</span>
      </p>
    </section>
  );
}
