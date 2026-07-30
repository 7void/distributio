"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CityPanel from "@/components/CityPanel";
import MemoBox from "@/components/MemoBox";
import RankingList from "@/components/RankingList";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ChannelMixCard from "@/components/ChannelMixCard";
import RiskRegisterCard from "@/components/RiskRegister";
import GtmPlanCard from "@/components/GtmPlan";
import type { AnalysisResult, ScoredCity } from "@/lib/types";

const DistributionMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[#0a1210] text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
      Loading map...
    </div>
  )
});

function formatCompactDemand(value: number) {
  if (value >= 100000) {
    return `${Math.round(value / 100000)}L units/mo`;
  }
  return `${Math.round(value / 1000)}K units/mo`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ResultsSkeleton() {
  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-4">
        <div className="h-16 animate-pulse bg-[#0a1210]" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse bg-[#0a1210]" />
          ))}
        </div>
        <div className="h-[520px] animate-pulse bg-[#0a1210]" />
      </div>
    </main>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedCity, setSelectedCity] = useState<ScoredCity | null>(null);

  // Filter States
  const [regionFilter, setRegionFilter] = useState<"all" | "metro" | "tier2">("all");
  const [radiusFilter, setRadiusFilter] = useState<"all" | "within">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high">("all");

  useEffect(() => {
    const stored = window.localStorage.getItem("distributio_result");

    if (!stored) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as AnalysisResult;
      setResult(parsed);
      setSelectedCity(parsed.scores[0] ?? null);
    } catch {
      window.localStorage.removeItem("distributio_result");
      router.replace("/");
    }
  }, [router]);

  // Apply filters to city rankings
  const filteredScores = useMemo(() => {
    if (!result) return [];
    
    return result.scores.filter((city) => {
      // 1. Region / Tier filter
      if (regionFilter === "metro" && city.tier !== 1) return false;
      if (regionFilter === "tier2" && city.tier === 1) return false;

      // 2. Logistics / Delivery Radius filter
      if (radiusFilter === "within" && city.confidenceLevel === "low") {
        // CityPanel assigns low confidence primarily on distance constraint
        // Let's also check if warehouse exists and radius is exceeded
        return false;
      }

      // 3. Confidence filter
      if (confidenceFilter === "high" && city.confidenceLevel !== "high") return false;

      return true;
    });
  }, [result, regionFilter, radiusFilter, confidenceFilter]);

  // Sync selected city when filters change so we don't display a filtered-out city
  useEffect(() => {
    if (filteredScores.length > 0) {
      const isSelectedStillVisible = filteredScores.some((c) => c.id === selectedCity?.id);
      if (!isSelectedStillVisible) {
        setSelectedCity(filteredScores[0]);
      }
    } else {
      setSelectedCity(null);
    }
  }, [filteredScores, selectedCity]);

  const metrics = useMemo(() => {
    if (!result) return null;

    const topMarket = result.scores[0];
    const primeCities = result.scores.filter((city) => city.score >= 80).length;
    const topFiveDemand = result.scores
      .slice(0, 5)
      .reduce((sum, city) => sum + city.demand, 0);
    const viableMarkets = result.scores.filter((city) => city.score >= 50).length;

    return {
      topMarket,
      primeCities,
      topFiveDemand,
      viableMarkets
    };
  }, [result]);

  if (!result || !metrics) {
    return <ResultsSkeleton />;
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 border-b border-[#0f1a10] bg-[#050810]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="font-heading text-xl font-extrabold tracking-tight text-accent"
          >
            distribut.io
          </a>
          <div className="min-w-0">
            <p className="truncate text-center font-heading text-lg font-bold text-foreground">
              {result.features.productName}
            </p>
            <p className="mt-1 text-center text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              {titleCase(result.features.priceSegment)} segment · dispatch: {result.profile?.warehouseCity || "Local"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem("distributio_result");
              router.push("/onboarding");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#0f1a10] bg-[#0a1210] px-4 text-[10px] uppercase tracking-[0.2em] text-[#c8e8c0] transition hover:border-[#00ff88]/40 hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            New Analysis
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-8 lg:px-12">
        {/* Top Metric Cards */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Top Market
            </p>
            <p className="mt-3 font-heading text-2xl font-bold text-foreground">
              {metrics.topMarket.name}
            </p>
            <p className="text-xs text-[#7a9678]">{metrics.topMarket.state}</p>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Prime Cities (≥80)
            </p>
            <p className="mt-3 font-heading text-3xl font-bold text-accent">
              {metrics.primeCities}
            </p>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Top-5 demand
            </p>
            <p className="mt-3 font-heading text-2xl font-bold text-foreground">
              {formatCompactDemand(metrics.topFiveDemand)}
            </p>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Viable Markets (≥50)
            </p>
            <p className="mt-3 font-heading text-3xl font-bold text-foreground">
              {metrics.viableMarkets}
            </p>
          </div>
        </section>

        {/* Phase 2: Interactive Filters bar */}
        <section className="flex flex-wrap items-center gap-4 border border-[#0f1a10] bg-[#0a1210] p-4 text-xs">
          <div className="flex items-center gap-2 text-[#7a9678] uppercase tracking-[0.1em]">
            <Filter className="h-3.5 w-3.5 text-accent" />
            <span>Filter Results:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[#2e4d30] uppercase text-[9px] tracking-[0.1em]">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as any)}
              className="border border-[#0f1a10] bg-[#050810] px-2 py-1.5 text-[#c8e8c0] outline-none"
            >
              <option value="all">All India</option>
              <option value="metro">Metros Only</option>
              <option value="tier2">Tier 2 & 3 Cities</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#2e4d30] uppercase text-[9px] tracking-[0.1em]">Distance:</span>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(e.target.value as any)}
              className="border border-[#0f1a10] bg-[#050810] px-2 py-1.5 text-[#c8e8c0] outline-none"
            >
              <option value="all">Any Distance</option>
              <option value="within">Within Delivery Radius</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#2e4d30] uppercase text-[9px] tracking-[0.1em]">Confidence:</span>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value as any)}
              className="border border-[#0f1a10] bg-[#050810] px-2 py-1.5 text-[#c8e8c0] outline-none"
            >
              <option value="all">All Confidence</option>
              <option value="high">High Confidence Only</option>
            </select>
          </div>
          
          <span className="ml-auto text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Showing {filteredScores.length} of {result.scores.length} markets
          </span>
        </section>

        {/* Map & Listings panel */}
        <section className="grid gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="grid min-w-0 gap-5">
            <div className="h-[520px] overflow-hidden border border-[#0f1a10] bg-[#0a1210]">
              <DistributionMap
                cities={filteredScores}
                selectedCityId={selectedCity?.id || ""}
                onCitySelect={setSelectedCity}
              />
            </div>
            {selectedCity && <ScoreBreakdown city={selectedCity} />}
            <MemoBox memo={result.memo} />
          </div>

          <aside className="grid min-w-0 content-start gap-5">
            <RankingList
              cities={filteredScores}
              selectedCityId={selectedCity?.id || ""}
              onCitySelect={setSelectedCity}
            />
            {selectedCity && <CityPanel city={selectedCity} category={result.features.category} />}
          </aside>
        </section>

        {/* Phase 3 Strategic Dashboard */}
        <div className="mt-6 border-t border-[#0f1a10] pt-6">
          <h2 className="mb-6 font-heading text-xl font-bold text-foreground">
            Strategic Launch Dashboard
          </h2>
          <section className="grid gap-5 lg:grid-cols-3">
            <ChannelMixCard result={result} />
            <RiskRegisterCard result={result} />
            <GtmPlanCard result={result} />
          </section>
        </div>
      </div>
    </main>
  );
}
