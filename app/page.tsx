"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { scoreCities } from "@/lib/score";
import type { AnalysisResult, ExtractedFeatures } from "@/lib/types";

const examplePrompts = [
  "A ₹299 premium craft energy drink targeting gym-goers aged 18-30. Needs refrigeration. Competing with Monster and Red Bull.",
  "Mass-market atta at ₹40/kg targeting homemakers across India. No cold chain. Competing with Aashirvaad.",
  "A ₹15,000 smartwatch targeting urban professionals 28-45. Online-first D2C brand.",
  "Artisanal cold-pressed juice at ₹180/bottle targeting fitness-conscious urban women. Needs refrigeration."
];

const loadingPhases = [
  "PARSING PRODUCT",
  "SCORING 50+ MARKETS",
  "WRITING STRATEGY"
];

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % examplePrompts.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timer = window.setInterval(() => {
      setPhaseIndex((current) => Math.min(current + 1, loadingPhases.length - 1));
    }, 1600);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  const characterCount = useMemo(
    () => `${prompt.length.toLocaleString("en-IN")} characters`,
    [prompt.length]
  );

  async function submitAnalysis() {
    if (!prompt.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setPhaseIndex(0);

    try {
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!extractResponse.ok) {
        const payload = (await extractResponse.json()) as { message?: string };
        throw new Error(payload.message ?? "Feature extraction failed.");
      }

      const features = (await extractResponse.json()) as ExtractedFeatures;
      setPhaseIndex(1);
      const scores = scoreCities(features);
      setPhaseIndex(2);

      const memoResponse = await fetch("/api/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, scores })
      });

      if (!memoResponse.ok) {
        const payload = (await memoResponse.json()) as { message?: string };
        throw new Error(payload.message ?? "Strategy memo failed.");
      }

      const memoPayload = (await memoResponse.json()) as { memo: string };
      const result: AnalysisResult = {
        features,
        scores,
        memo: memoPayload.memo,
        prompt
      };

      window.localStorage.setItem("distributio_result", JSON.stringify(result));
      router.push("/results");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing this product."
      );
      setIsLoading(false);
      setPhaseIndex(0);
    }
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#050810] px-6">
        <section className="w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            <span>distribut.io</span>
            <span>live analysis</span>
          </div>
          <div className="border border-[#0f1a10] bg-[#0a1210] p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-55" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-[#00ff88]" />
              </span>
              <p className="font-heading text-2xl font-bold uppercase text-accent sm:text-4xl">
                {loadingPhases[phaseIndex]}
              </p>
            </div>
            <div className="h-1 w-full overflow-hidden bg-[#111c12]">
              <div
                className="h-full bg-[#00ff88] transition-all duration-700"
                style={{
                  width: `${((phaseIndex + 1) / loadingPhases.length) * 100}%`
                }}
              />
            </div>
            <div className="mt-6 grid gap-3">
              {loadingPhases.map((phase, index) => (
                <div
                  key={phase}
                  className={`flex items-center justify-between border border-[#0f1a10] px-4 py-3 text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    index <= phaseIndex ? "text-[#c8e8c0]" : "text-[#2e4d30]"
                  }`}
                >
                  <span>{phase}</span>
                  {index === phaseIndex ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <span>{index < phaseIndex ? "DONE" : "QUEUED"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-5 sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <a
          href="/"
          className="font-heading text-xl font-extrabold tracking-tight text-accent"
        >
          distribut.io
        </a>
        <p className="text-right text-[9px] uppercase tracking-[0.2em] text-[#2e4d30] sm:text-[10px]">
          DISTRIBUTION INTELLIGENCE · INDIA
        </p>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-96px)] max-w-7xl flex-col justify-center py-10">
        <div className="max-w-5xl">
          <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            AI market entry simulator
          </p>
          <h1 className="font-heading text-5xl font-extrabold leading-[0.95] text-foreground sm:text-7xl lg:text-8xl">
            Describe your product. We&apos;ll map its future.
          </h1>
        </div>

        <div className="mt-10 grid gap-4">
          <div className="relative border border-[#0f1a10] bg-[#0a1210]">
            {!prompt ? (
              <p
                key={placeholderIndex}
                className="placeholder-fade pointer-events-none absolute left-5 right-5 top-5 text-base leading-8 text-[#2e4d30] sm:left-7 sm:right-7 sm:top-7 sm:text-lg"
              >
                {examplePrompts[placeholderIndex]}
              </p>
            ) : null}
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder=""
              className="min-h-[220px] w-full resize-none bg-transparent p-5 text-base leading-8 text-[#c8e8c0] outline-none placeholder:text-[#2e4d30] sm:p-7 sm:text-lg"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
              {characterCount}
            </span>
            <button
              type="button"
              disabled={!prompt.trim()}
              onClick={submitAnalysis}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#00ff88] bg-[#00ff88] px-6 text-sm font-medium uppercase tracking-[0.2em] text-[#031009] transition hover:bg-[#78ffbd] disabled:border-[#172219] disabled:bg-[#111811] disabled:text-[#2e4d30]"
            >
              Analyze
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#2e4d30]">
            Tip: mention the per-unit price a consumer pays, not wholesale or bulk pricing.
          </p>

          {errorMessage ? (
            <p className="border border-[#ff3355]/25 bg-[#ff3355]/10 p-4 text-sm leading-6 text-[#ff879b]">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3">
            {examplePrompts.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="max-w-full border border-[#0f1a10] bg-[#0a1210] px-4 py-3 text-left text-xs leading-5 text-[#c8e8c0] transition hover:border-[#00ff88]/40 hover:text-accent sm:max-w-[calc(50%-0.375rem)] lg:max-w-[calc(25%-0.6rem)]"
              >
                <span className="mb-2 block text-[9px] uppercase tracking-[0.2em] text-[#2e4d30]">
                  Example {index + 1}
                </span>
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
