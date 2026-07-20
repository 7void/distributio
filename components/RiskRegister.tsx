"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult, RiskRegister } from "@/lib/types";
import { Loader2, AlertTriangle, ShieldCheck, Info } from "lucide-react";

export default function RiskRegisterCard({ result }: { result: AnalysisResult }) {
  const [data, setData] = useState<RiskRegister | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRisk() {
      try {
        const res = await fetch("/api/risk", {
          method: "POST",
          body: JSON.stringify({ features: result.features, scores: result.scores }),
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
    fetchRisk();
  }, [result]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-[#0f1a10] bg-[#0a1210]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2e4d30]" />
        <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          Compiling Risk Register...
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          Risk Register
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.1em] text-[#7a9678]">Risk Score:</span>
          <span className={`font-heading font-bold ${data.risk_score > 60 ? 'text-red-400' : 'text-accent'}`}>
            {data.risk_score}/100
          </span>
        </div>
      </div>

      <div className="mb-6 flex gap-4 text-xs">
        <div className="flex flex-1 items-center gap-3 border border-[#0f1a10] bg-[#050810] p-3">
          <div className={`p-2 ${data.go_nogo === 'go' ? 'bg-accent/10 text-accent' : data.go_nogo === 'go_with_caution' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
            {data.go_nogo === 'go' ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#7a9678]">Recommendation</p>
            <p className="font-heading font-bold text-foreground">
              {data.go_nogo.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3 border border-[#0f1a10] bg-[#050810] p-3">
          <div className="p-2 bg-blue-500/10 text-blue-500">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.1em] text-[#7a9678]">Launch Probability</p>
            <p className="font-heading font-bold text-foreground">{data.launch_probability}%</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.risks.map((risk, idx) => (
          <div key={idx} className="border-l-2 border-[#0f1a10] pl-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                risk.severity === 'high' ? 'text-red-400' : 
                risk.severity === 'medium' ? 'text-yellow-500' : 'text-accent'
              }`}>
                {risk.severity} SEVERITY
              </span>
              <span className="text-[10px] text-[#2e4d30]">•</span>
              <span className="text-[10px] uppercase text-[#7a9678]">{risk.category}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#c8e8c0]">{risk.description}</p>
            <p className="mt-1 text-xs text-[#7a9678]">Mitigation: {risk.mitigation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
