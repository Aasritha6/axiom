"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { NarrativePanel } from "@/components/NarrativePanel";
import { RealityPanel } from "@/components/RealityPanel";
import { VerdictMatrix } from "@/components/VerdictMatrix";
import { StatusBar } from "@/components/StatusBar";
import type { AxiomVerdict, WeightedDelta } from "@/lib/discrepancy";
import { FEATURED_QUERIES } from "@/lib/demo-data";
import { WIRE_SOURCES } from "@/lib/config/sources";

export interface WireCard {
  wireId: string;
  label?: string;
  category: "NARRATIVE" | "REALITY";
  signal?: "BULLISH" | "BEARISH" | "NEUTRAL";
  sentiment?: number;
  metrics: { label: string; value: string | number }[];
  volume?: number;
  summary: string;
  isLive: boolean;
  isFallback?: boolean;
  fromWireCache?: boolean;
  failed?: boolean;
  errorMessage?: string;
  evidenceLinks?: string[];
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [lastRunOpts, setLastRunOpts] = useState<{
    demo?: string;
    forceLive?: boolean;
  }>({});
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [narrativeCards, setNarrativeCards] = useState<WireCard[]>([]);
  const [realityCards, setRealityCards] = useState<WireCard[]>([]);
  const [verdict, setVerdict] = useState<
    (AxiomVerdict & {
      weightedDelta?: WeightedDelta;
      isCached?: boolean;
      aiExplanation?: string | null;
    }) | null
  >(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const allCards = useMemo(
    () => [...narrativeCards, ...realityCards],
    [narrativeCards, realityCards]
  );

  const sourceStats = useMemo(() => {
    const total = WIRE_SOURCES.length;
    const resolved = allCards.filter((c) => !c.failed).length;
    const failed = allCards.filter((c) => c.failed).length;
    const live = allCards.filter(
      (c) => c.isLive && !c.isFallback && !c.fromWireCache
    ).length;
    const fallback = allCards.filter((c) => c.isFallback).length;
    const wireCache = allCards.filter((c) => c.fromWireCache).length;
    const demoCached = allCards.filter(
      (c) => !c.isLive && !c.isFallback && !c.fromWireCache && !c.failed
    ).length;
    return { total, resolved, failed, live, fallback, wireCache, demoCached };
  }, [allCards]);

  const resetStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setNarrativeCards([]);
    setRealityCards([]);
    setVerdict(null);
    setStatusLog([]);
    setError(null);
  }, []);

  const runAnalysis = useCallback(
    (q: string, opts?: { demo?: string; forceLive?: boolean }) => {
      resetStream();
      setActiveQuery(q);
      setLastRunOpts(opts ?? {});
      setIsStreaming(true);

      const params = new URLSearchParams({ query: q });
      if (opts?.demo) params.set("demo", opts.demo);
      if (opts?.forceLive) params.set("live", "1");

      const es = new EventSource(`/api/axiom/stream?${params}`);
      eventSourceRef.current = es;

      const pushCard = (card: WireCard) => {
        if (card.category === "NARRATIVE") {
          setNarrativeCards((prev) => [...prev, card]);
        } else {
          setRealityCards((prev) => [...prev, card]);
        }
      };

      es.addEventListener("status", (e) => {
        const data = JSON.parse(e.data) as { message: string };
        setStatusLog((prev) => [...prev.slice(-20), data.message]);
      });

      es.addEventListener("wire_resolved", (e) => {
        pushCard(JSON.parse(e.data) as WireCard);
      });

      es.addEventListener("wire_failed", (e) => {
        const data = JSON.parse(e.data) as {
          wireId: string;
          label?: string;
          category: "NARRATIVE" | "REALITY";
          message: string;
        };
        pushCard({
          wireId: data.wireId,
          label: data.label,
          category: data.category,
          failed: true,
          errorMessage: data.message,
          summary: "Wire execution failed",
          metrics: [],
          isLive: false,
        });
      });

      es.addEventListener("final_verdict", (e) => {
        const data = JSON.parse(e.data) as AxiomVerdict & {
          weightedDelta: WeightedDelta;
          isCached: boolean;
          aiExplanation?: string | null;
        };
        setVerdict(data);
        setIsStreaming(false);
        es.close();
      });

      es.addEventListener("error", (e) => {
        if (e instanceof MessageEvent && e.data) {
          const data = JSON.parse(e.data) as { message: string };
          setError(data.message);
        } else {
          setError("Stream connection lost");
        }
        setIsStreaming(false);
        es.close();
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) return;
        setIsStreaming(false);
      };
    },
    [resetStream]
  );

  const handleRetry = useCallback(() => {
    if (!activeQuery) return;
    runAnalysis(activeQuery, { ...lastRunOpts, forceLive: true });
  }, [activeQuery, lastRunOpts, runAnalysis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    runAnalysis(trimmed, { forceLive: true });
  };

  const handleFeaturedCached = (demoId: string, label: string) => {
    setQuery(label);
    runAnalysis(label, { demo: demoId });
  };

  const handleFeaturedLive = (demoId: string, label: string) => {
    setQuery(label);
    runAnalysis(label, { demo: demoId, forceLive: true });
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-[#00ff41]">
      <header className="border-b border-[#333] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-widest text-[#00ff41]">
              ◈ AXIOM
            </h1>
            <p className="text-[10px] tracking-wider text-[#666]">
              NARRATIVE vs. GROUND TRUTH · FORENSIC TERMINAL v0.3
            </p>
            {(isStreaming || allCards.length > 0) && (
              <p className="mt-1 text-[9px] text-[#ffb000]">
                {sourceStats.total} sources · {sourceStats.resolved} resolved
                {sourceStats.failed > 0 && (
                  <> · <span className="text-[#ff3333]">{sourceStats.failed} failed</span></>
                )}
                {" · "}
                <span className="text-[#00ff41]">{sourceStats.live} live</span>
                {sourceStats.fallback > 0 && (
                  <> · {sourceStats.fallback} fallback</>
                )}
                {sourceStats.wireCache > 0 && (
                  <> · {sourceStats.wireCache} wire cache</>
                )}
                {sourceStats.demoCached > 0 && (
                  <> · {sourceStats.demoCached} demo</>
                )}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 gap-2 sm:max-w-md">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: Cursor, Humane AI Pin, Tesla FSD…"
              className="flex-1 border border-[#333] bg-black px-3 py-1.5 text-sm text-[#00ff41] placeholder-[#444] outline-none focus:border-[#00ff41]"
            />
            <button
              type="submit"
              disabled={isStreaming}
              className="border border-[#00ff41] px-4 py-1.5 text-xs tracking-wider hover:bg-[#00ff41] hover:text-black disabled:opacity-40"
            >
              {isStreaming ? "SCANNING…" : "EXECUTE LIVE"}
            </button>
          </form>
        </div>

        <FeaturedCarousel
          queries={FEATURED_QUERIES}
          onSelectCached={handleFeaturedCached}
          onSelectLive={handleFeaturedLive}
          disabled={isStreaming}
        />
      </header>

      <div className="relative grid flex-1 grid-cols-1 gap-0 lg:grid-cols-12">
        <div className="order-1 lg:order-2 lg:col-span-2">
          <VerdictMatrix
            verdict={verdict}
            isStreaming={isStreaming}
            activeQuery={activeQuery}
          />
        </div>

        <div className="order-2 lg:order-1 lg:col-span-5">
          <NarrativePanel
            cards={narrativeCards}
            isStreaming={isStreaming}
            onRetry={handleRetry}
          />
        </div>

        <div className="order-3 lg:col-span-5">
          <RealityPanel
            cards={realityCards}
            isStreaming={isStreaming}
            onRetry={handleRetry}
          />
        </div>
      </div>

      <StatusBar
        logs={statusLog}
        isStreaming={isStreaming}
        error={error}
        activeQuery={activeQuery}
      />
    </main>
  );
}
