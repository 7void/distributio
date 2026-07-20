"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult, GtmPlan } from "@/lib/types";
import { Loader2, ArrowRight } from "lucide-react";

export default function GtmPlanCard({ result }: { result: AnalysisResult }) {
  const [data, setData] = useState<GtmPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGtm() {
      try {
        const res = await fetch("/api/gtm", {
          method: "POST",
          body: JSON.stringify({ features: result.features, scores: result.scores, profile: result.profile }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchGtm();
  }, [result]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-[#0f1a10] bg-[#0a1210]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2e4d30]" />
        <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          Mapping GTM Timeline...
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h3 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        Go-To-Market Plan
      </h3>

      <div className="mb-6 p-4 border border-[#00ff88]/20 bg-[#00ff88]/5">
        <p className="text-[9px] uppercase tracking-[0.1em] text-accent mb-1">Recommended Strategy</p>
        <p className="text-sm font-semibold text-[#c8e8c0]">{data.recommended_strategy}</p>
        <div className="mt-3 text-xs text-[#7a9678]">
          <strong className="text-foreground">First Move:</strong> {data.first_move}
        </div>
      </div>

      <div className="relative border-l border-[#0f1a10] ml-3 pl-4 space-y-6">
        {data.launch_sequence.map((phase, idx) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-accent" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Phase {phase.phase}
              </span>
              <span className="text-[10px] text-[#2e4d30]">•</span>
              <span className="text-[10px] uppercase text-[#7a9678]">{phase.week}</span>
            </div>
            <p className="font-heading text-sm font-bold text-foreground mb-1">
              {phase.city}
            </p>
            <p className="text-xs text-[#c8e8c0]">{phase.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
