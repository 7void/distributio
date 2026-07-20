"use client";

import { useEffect, useState } from "react";
import type { AnalysisResult, ChannelMix } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";

export default function ChannelMixCard({ result }: { result: AnalysisResult }) {
  const [data, setData] = useState<ChannelMix | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMix() {
      try {
        const res = await fetch("/api/channel-mix", {
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
    fetchMix();
  }, [result]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-[#0f1a10] bg-[#0a1210]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2e4d30]" />
        <span className="ml-3 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
          Synthesizing Channel Mix...
        </span>
      </div>
    );
  }

  if (!data) return null;

  // Format data for chart
  const chartData = data.channel_split_pct.map((item) => ({
    name: item.channel,
    value: item.pct,
  }));
  const COLORS = ["#00ff88", "#00cc6a", "#00994d", "#006633", "#00331a"];

  return (
    <div className="border border-[#0f1a10] bg-[#0a1210] p-5">
      <h3 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
        Channel Mix Strategy
      </h3>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#050810", borderColor: "#0f1a10", color: "#c8e8c0" }}
                itemStyle={{ color: "#00ff88" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[9px] uppercase tracking-[0.1em] text-[#7a9678]">Lead Channel</span>
            <p className="font-heading font-bold text-accent">{data.lead_channel}</p>
            <p className="mt-1 text-xs text-[#c8e8c0]">{data.lead_channel_reason}</p>
          </div>
          <div className="space-y-2">
            {data.recommended_channels.slice(0, 3).map((ch, idx) => (
              <div key={idx} className="flex justify-between border-b border-[#0f1a10] pb-2 text-xs">
                <span className="text-foreground">{ch.channel}</span>
                <span className="text-accent">{ch.fit_score}% Fit</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
