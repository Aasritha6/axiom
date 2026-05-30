"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { NarrativePanel } from "@/components/NarrativePanel";
import { RealityPanel } from "@/components/RealityPanel";
import { VerdictMatrix } from "@/components/VerdictMatrix";
import { StatusBar } from "@/components/StatusBar";
import type { AxiomVerdict, WeightedDelta } from "@/lib/discrepancy";
import { FEATURED_QUERIES } from "@/lib/demo-data";
import { WIRE_SOURCES } from "@/lib/config/sources";
import type { NarrativeMode } from "@/lib/gemini";

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
      narrativeMode?: NarrativeMode;
    }) | null
  >(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasUserInteracted = useRef(false);
  const hasAutoLoaded = useRef(false);

  const isLiveScan =
    isStreaming &&
    (lastRunOpts.forceLive === true ||
      (!lastRunOpts.demo && !verdict?.isCached));

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
          narrativeMode?: NarrativeMode;
        };
        setVerdict(data);
        setIsStreaming(false);
        setStatusLog((prev) => [...prev.slice(-20), "✓ Scan complete"]);
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

  const loadDemo = useCallback(
    (demoId: string) => {
      const entry = FEATURED_QUERIES.find((q) => q.id === demoId);
      if (!entry) return;
      setQuery(entry.label);
      runAnalysis(entry.label, { demo: demoId });
    },
    [runAnalysis]
  );

  useEffect(() => {
    if (hasAutoLoaded.current || hasUserInteracted.current) return;
    hasAutoLoaded.current = true;
    const timer = setTimeout(() => loadDemo("cursor"), 500);
    return () => clearTimeout(timer);
  }, [loadDemo]);

  const markInteracted = () => {
    hasUserInteracted.current = true;
  };

  const handleRetry = useCallback(() => {
    markInteracted();
    if (!activeQuery) return;
    runAnalysis(activeQuery, { ...lastRunOpts, forceLive: true });
  }, [activeQuery, lastRunOpts, runAnalysis]);

  const handleRunLive = () => {
    markInteracted();
    const trimmed = query.trim();
    if (!trimmed) return;
    runAnalysis(trimmed, { forceLive: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markInteracted();
    handleRunLive();
  };

  const handleFeaturedCached = (demoId: string, label: string) => {
    markInteracted();
    setQuery(label);
    runAnalysis(label, { demo: demoId });
  };

  const handleFeaturedLive = (demoId: string, label: string) => {
    markInteracted();
    setQuery(label);
    runAnalysis(label, { demo: demoId, forceLive: true });
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-[#00ff41]">
      <header className="border-b border-[#333] px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="shrink-0">
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
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-[#ff3333]">
                      {sourceStats.failed} failed
                    </span>
                  </>
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

          <div className="flex w-full flex-1 flex-wrap items-center gap-2 lg:max-w-2xl">
            {(isLiveScan || (isStreaming && lastRunOpts.forceLive)) && (
              <span className="badge badge-live pulse-live shrink-0">
                ● LIVE
              </span>
            )}
            <form
              onSubmit={handleSubmit}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  markInteracted();
                  setQuery(e.target.value);
                }}
                placeholder="Try: Byju's, Cursor, Humane AI Pin…"
                className="min-w-0 flex-1 border border-[#333] bg-black px-3 py-2 text-sm text-[#00ff41] placeholder-[#444] outline-none focus:border-[#00ff41] sm:py-1.5"
              />
              <button
                type="submit"
                disabled={isStreaming}
                className="shrink-0 bg-[#00ff41] px-4 py-2 text-xs font-bold tracking-wider text-black hover:bg-[#33ff66] disabled:opacity-40 sm:py-1.5"
              >
                {isStreaming ? "SCANNING…" : "RUN LIVE"}
              </button>
            </form>
          </div>
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
            searchQuery={activeQuery ?? query}
          />
        </div>

        <div className="order-3 lg:col-span-5">
          <RealityPanel
            cards={realityCards}
            isStreaming={isStreaming}
            onRetry={handleRetry}
            searchQuery={activeQuery ?? query}
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
