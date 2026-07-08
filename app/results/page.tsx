"use client";

import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CityPanel from "@/components/CityPanel";
import MemoBox from "@/components/MemoBox";
import RankingList from "@/components/RankingList";
import ScoreBreakdown from "@/components/ScoreBreakdown";
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

  const metrics = useMemo(() => {
    if (!result) {
      return null;
    }

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

  if (!result || !selectedCity || !metrics) {
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
              {titleCase(result.features.priceSegment)} segment
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem("distributio_result");
              router.push("/");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#0f1a10] bg-[#0a1210] px-4 text-[10px] uppercase tracking-[0.2em] text-[#c8e8c0] transition hover:border-[#00ff88]/40 hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            New Analysis
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-5 sm:px-8 lg:px-12">
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
              Prime Cities
            </p>
            <p className="mt-3 font-heading text-3xl font-bold text-accent">
              {metrics.primeCities}
            </p>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Top-5 Demand
            </p>
            <p className="mt-3 font-heading text-2xl font-bold text-foreground">
              {formatCompactDemand(metrics.topFiveDemand)}
            </p>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
              Viable Markets
            </p>
            <p className="mt-3 font-heading text-3xl font-bold text-foreground">
              {metrics.viableMarkets}
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="grid min-w-0 gap-5">
            <div className="h-[520px] overflow-hidden border border-[#0f1a10] bg-[#0a1210]">
              <DistributionMap
                cities={result.scores}
                selectedCityId={selectedCity.id}
                onCitySelect={setSelectedCity}
              />
            </div>
            <ScoreBreakdown city={selectedCity} />
            <MemoBox memo={result.memo} />
          </div>

          <aside className="grid min-w-0 content-start gap-5">
            <RankingList
              cities={result.scores}
              selectedCityId={selectedCity.id}
              onCitySelect={setSelectedCity}
            />
            <CityPanel city={selectedCity} category={result.features.category} />
          </aside>
        </section>
      </div>
    </main>
  );
}
