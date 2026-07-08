"use client";

import type { ScoredCity } from "@/lib/types";

interface ScoreBreakdownProps {
  city: ScoredCity;
}

const rows = [
  ["Purchasing Power", "incomeContribution"],
  ["Retail Density", "retailContribution"],
  ["Digital Penetration", "internetContribution"],
  ["Cold Chain", "coldContribution"]
] as const;

function colorForContribution(value: number) {
  if (value >= 30) {
    return "#00ff88";
  }

  if (value >= 20) {
    return "#aaff44";
  }

  if (value >= 10) {
    return "#ffcc00";
  }

  return "#ff8800";
}

export default function ScoreBreakdown({ city }: ScoreBreakdownProps) {
  const total =
    city.scoreBreakdown.incomeContribution +
    city.scoreBreakdown.retailContribution +
    city.scoreBreakdown.internetContribution +
    city.scoreBreakdown.coldContribution;

  return (
    <section className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h2 className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        HOW THE SCORE IS BUILT
      </h2>
      <div className="grid gap-4">
        {rows.map(([label, key]) => {
          const value = city.scoreBreakdown[key];
          const color = colorForContribution(value);

          return (
            <div key={key} className="grid gap-2">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-[#c8e8c0]">{label}</span>
                <span className="text-accent">{value} pts</span>
              </div>
              <div className="h-2 bg-[#111c12]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.min(value, 40) * 2.5}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs leading-6 text-[#7a9678]">
        Score = {city.scoreBreakdown.incomeContribution} +{" "}
        {city.scoreBreakdown.retailContribution} +{" "}
        {city.scoreBreakdown.internetContribution} +{" "}
        {city.scoreBreakdown.coldContribution} = {total}/100 before multipliers
      </p>
    </section>
  );
}
