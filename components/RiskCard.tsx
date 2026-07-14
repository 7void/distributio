"use client";

import type { RiskAssessment, RiskLevel } from "@/lib/types";

interface RiskCardProps {
  risk: RiskAssessment;
}

const levelClasses: Record<RiskLevel, string> = {
  LOW: "border-[#00ff88]/20 bg-[#00ff88]/10 text-accent",
  MEDIUM: "border-[#ffcc00]/20 bg-[#ffcc00]/10 text-[#ffcc00]",
  HIGH: "border-[#ff8800]/20 bg-[#ff8800]/10 text-[#ff8800]",
  CRITICAL: "border-[#ff3355]/20 bg-[#ff3355]/10 text-[#ff3355]"
};

export default function RiskCard({ risk }: RiskCardProps) {
  return (
    <section className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h2 className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        Risk Assessment
      </h2>

      <div className="flex items-end justify-between gap-4 border border-[#0f1a10] p-4">
        <p className="font-heading text-3xl font-bold text-foreground">
          {risk.score} / 100
        </p>
        <span
          className={`border px-2 py-1 text-[9px] uppercase tracking-[0.2em] ${levelClasses[risk.level]}`}
        >
          {risk.level}
        </span>
      </div>

      <div className="mt-6 grid gap-5 text-sm leading-6">
        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Drivers
          </p>
          <ul className="grid list-disc gap-2 pl-5 text-[#c8e8c0]">
            {risk.drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Recommended Actions
          </p>
          <ul className="grid list-disc gap-2 pl-5 text-[#c8e8c0]">
            {risk.mitigations.map((mitigation) => (
              <li key={mitigation}>{mitigation}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
