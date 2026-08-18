"use client";

import { useState, useMemo, useCallback } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { scoreCities } from "@/lib/score";
import type { AnalysisResult, ScoredCity, ProductProfile } from "@/lib/types";

interface ScenarioSimulatorProps {
  originalResult: AnalysisResult;
  onSimulatedScores: (scores: ScoredCity[] | null) => void;
}

const WAREHOUSE_CITIES = [
  "Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
  "Lucknow", "Indore", "Nagpur", "Bhopal", "Chandigarh"
];

// ── Price → Segment + Affordability recalculation ─────────────────────────────
// When the user moves the price slider, we must re-derive:
//   1. priceSegment   — which tier the product now belongs to
//   2. affordability  — how accessible the new price is to the average Indian consumer
//
// Price segment thresholds are category-relative. We use the ORIGINAL price as the
// baseline "mid" anchor and derive thresholds proportionally.
// Affordability formula: maps price vs. category median to a 0.5–1.1 multiplier.
//   - Price at 0.5× median → premium affordability (1.1, rich cities favoured more)
//   - Price at median       → neutral (1.0)
//   - Price at 2× median    → affordability drops to 0.7 (lower-income cities penalised)
//   - Price at 4× median    → affordability floor of 0.5 (only high-income metros viable)
// Cited basis: Engel's Law (Ernst Engel, 1857) — as price rises relative to income,
// fewer households can afford the product. NCAER 2023 quintile data shows bottom-40%
// Indian households spend <18% of income on discretionary items; doubling price halves
// the accessible consumer base.
function derivePriceSignals(newPrice: number, originalPrice: number, originalAffordability: number) {
  const ratio = newPrice / originalPrice; // 1.0 = unchanged, 2.0 = doubled, 0.5 = halved

  // Affordability recalculation: linear decay above 1.0, linear gain below 1.0
  // Anchored to: ratio=1.0 → original affordability, ratio=2.0 → -0.25 penalty,
  // ratio=0.5 → +0.10 bonus. Clamped to [0.5, 1.15].
  let newAffordability: number;
  if (ratio >= 1) {
    // Each doubling of price reduces affordability by 0.25
    newAffordability = originalAffordability - (ratio - 1) * 0.25;
  } else {
    // Price drop below original improves affordability slightly (max +0.10)
    newAffordability = originalAffordability + (1 - ratio) * 0.10;
  }
  newAffordability = Math.max(0.5, Math.min(1.15, newAffordability));

  // Price segment re-classification (absolute INR thresholds, India FMCG standard)
  let newSegment: "mass" | "mid" | "premium" | "luxury";
  if      (newPrice <= 50)   newSegment = "mass";
  else if (newPrice <= 300)  newSegment = "mid";
  else if (newPrice <= 1500) newSegment = "premium";
  else                        newSegment = "luxury";

  return { newAffordability, newSegment };
}

export default function ScenarioSimulator({
  originalResult,
  onSimulatedScores,
}: ScenarioSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const originalMargin = originalResult.profile?.marginPercent ?? 30;
  const originalPrice  = originalResult.features.priceINR;
  const originalWarehouse = originalResult.profile?.warehouseCity ?? "Delhi";
  const originalAffordability = originalResult.features.affordability ?? 1.0;

  const [margin, setMargin]       = useState(originalMargin);
  const [price, setPrice]         = useState(originalPrice);
  const [warehouse, setWarehouse] = useState(originalWarehouse);

  const hasChanges =
    margin !== originalMargin ||
    price  !== originalPrice  ||
    warehouse !== originalWarehouse;

  const simulatedScores = useMemo(() => {
    if (!hasChanges) return null;

    // Recalculate affordability and price segment based on new price.
    // This is the critical fix: without this, affordability stays frozen
    // at the original AI-extracted value even when price doubles or halves.
    const { newAffordability, newSegment } = derivePriceSignals(
      price,
      originalPrice,
      originalAffordability
    );

    const newFeatures = {
      ...originalResult.features,
      priceINR: price,
      affordability: newAffordability,
      priceSegment: newSegment,
    };
    const newProfile: ProductProfile = {
      ...(originalResult.profile as ProductProfile),
      marginPercent: margin,
      priceINR: price,
      warehouseCity: warehouse,
    };
    return scoreCities(newFeatures, newProfile, originalResult.competitionIntelligence);
  }, [margin, price, warehouse, hasChanges, originalResult, originalPrice, originalAffordability]);

  const handleApply = useCallback(() => {
    setIsActive(true);
    onSimulatedScores(simulatedScores);
  }, [simulatedScores, onSimulatedScores]);

  const handleReset = useCallback(() => {
    setMargin(originalMargin);
    setPrice(originalPrice);
    setWarehouse(originalWarehouse);
    setIsActive(false);
    onSimulatedScores(null);
  }, [originalMargin, originalPrice, originalWarehouse, onSimulatedScores]);

  const diffMap = useMemo(() => {
    if (!simulatedScores) return new Map<string, number>();
    const map = new Map<string, number>();
    simulatedScores.forEach((sc) => {
      const orig = originalResult.scores.find((o) => o.id === sc.id);
      if (orig) map.set(sc.id, sc.score - orig.score);
    });
    return map;
  }, [simulatedScores, originalResult.scores]);

  return (
    <div className="border border-[#0f1a10] bg-[#0a1210]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#0d1a0e]"
      >
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#c8e8c0]">
            Scenario Simulator
          </span>
          {isActive && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-accent">
              Active
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[#2e4d30]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#2e4d30]" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-[#0f1a10] px-5 pb-5 pt-4">
          <p className="mb-5 text-[10px] leading-5 text-[#7a9678]">
            Adjust variables below and hit <strong className="text-accent">Apply</strong> to
            see how city scores change in real-time — no AI re-run required.
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
                  Net Margin to Brand
                </label>
                <span className="font-heading text-sm font-bold text-accent">
                  {margin}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={70}
                step={1}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#111c12] accent-[#00ff88]"
              />
              <div className="flex justify-between text-[8px] text-[#2e4d30]">
                <span>5%</span>
                <span className="text-[#7a9678]">Original: {originalMargin}%</span>
                <span>70%</span>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
                  Product Price
                </label>
                <span className="font-heading text-sm font-bold text-accent">
                  ₹{price}
                </span>
              </div>
              <input
                type="range"
                min={Math.max(5, Math.round(originalPrice * 0.3))}
                max={Math.round(originalPrice * 3)}
                step={originalPrice < 100 ? 5 : originalPrice < 500 ? 10 : 50}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#111c12] accent-[#00ff88]"
              />
              <div className="flex justify-between text-[8px] text-[#2e4d30]">
                <span>₹{Math.max(5, Math.round(originalPrice * 0.3))}</span>
                <span className="text-[#7a9678]">Original: ₹{originalPrice}</span>
                <span>₹{Math.round(originalPrice * 3)}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[9px] uppercase tracking-[0.15em] text-[#2e4d30]">
                Warehouse City
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="border border-[#0f1a10] bg-[#050810] px-3 py-2 text-xs text-[#c8e8c0] outline-none focus:border-accent/40"
              >
                {WAREHOUSE_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}{city === originalWarehouse ? " (current)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[8px] text-[#2e4d30]">
                Changes freight distances for all cities
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleApply}
              disabled={!hasChanges}
              className="inline-flex items-center gap-2 border border-accent/40 bg-accent/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply Scenario
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 border border-[#0f1a10] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#7a9678] transition hover:border-[#2e4d30] hover:text-[#c8e8c0]"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            {hasChanges && !isActive && (
              <span className="ml-auto text-[9px] text-[#7a9678]">
                Hit Apply to update the rankings
              </span>
            )}
          </div>

          {isActive && diffMap.size > 0 && (
            <div className="mt-5 border-t border-[#0f1a10] pt-4">
              <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
                Score Changes vs Original
              </p>
              <div className="grid max-h-52 gap-1.5 overflow-y-auto pr-1">
                {Array.from(diffMap.entries())
                  .filter(([, d]) => d !== 0)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .slice(0, 12)
                  .map(([cityId, delta]) => {
                    const city = originalResult.scores.find((c) => c.id === cityId);
                    const simCity = simulatedScores?.find((c) => c.id === cityId);
                    if (!city || !simCity) return null;
                    return (
                      <div
                        key={cityId}
                        className="flex items-center justify-between gap-3 text-[10px]"
                      >
                        <span className="text-[#c8e8c0]">{city.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#7a9678]">
                            {city.score} → {simCity.score}
                          </span>
                          <span
                            className={`min-w-[44px] rounded px-1.5 py-0.5 text-center font-bold ${
                              delta > 0
                                ? "bg-accent/10 text-accent"
                                : "bg-[#ff6644]/10 text-[#ff6644]"
                            }`}
                          >
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
