"use client";

import { useCallback, useState } from "react";
import { DeltaSigmaGauge } from "@/components/DeltaSigmaGauge";
import type { AxiomVerdict, WeightedDelta } from "@/lib/discrepancy";

interface Props {
  verdict: (AxiomVerdict & {
    weightedDelta?: WeightedDelta;
    isCached?: boolean;
    aiExplanation?: string | null;
  }) | null;
  isStreaming: boolean;
  activeQuery: string | null;
}

function SignalBar({
  label,
  counts,
  color,
}: {
  label: string;
  counts: { bullish: number; bearish: number; neutral: number };
  color: string;
}) {
  const total = counts.bullish + counts.bearish + counts.neutral || 1;
  const momentum = counts.bullish - counts.bearish;
  const width = Math.min(Math.abs(momentum) / total, 1) * 100;

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-[9px]">
        <span className="text-[#666]">{label}</span>
        <span style={{ color }}>
          {"↑".repeat(counts.bullish)}
          {"↓".repeat(counts.bearish)}
          {counts.neutral > 0 && `→${counts.neutral}`}
        </span>
      </div>
      <div className="h-1.5 bg-[#111]">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.max(width, 8)}%`,
            backgroundColor: color,
            marginLeft: momentum < 0 ? "auto" : undefined,
          }}
        />
      </div>
    </div>
  );
}

function riskColor(risk: string): string {
  if (risk === "EXTREME") return "#ff3333";
  if (risk === "MODERATE") return "#ffb000";
  if (risk === "UNDERVALUED") return "#00ff41";
  if (risk === "PARTIAL") return "#666";
  return "#00ff41";
}

export function VerdictMatrix({ verdict, isStreaming, activeQuery }: Props) {
  const [copied, setCopied] = useState(false);

  const copyVerdict = useCallback(async () => {
    if (!verdict) return;
    const text = [
      `AXIOM VERDICT — ${activeQuery ?? "query"}`,
      `${verdict.verdictLabel} (${verdict.riskLevel})`,
      `Signal gap: ${verdict.signalGap}`,
      verdict.weightedDelta
        ? `Δ-Sigma: ${verdict.weightedDelta.delta > 0 ? "+" : ""}${verdict.weightedDelta.delta}`
        : "",
      "",
      verdict.aiExplanation ?? verdict.explanation,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, [verdict, activeQuery]);

  return (
    <section className="flex min-h-[300px] flex-col border-x border-[#333] bg-[#050505] lg:min-h-0">
      <header className="border-b border-[#333] px-3 py-2 text-center">
        <h2 className="text-xs font-bold tracking-widest text-white">
          🎯 FORENSIC SYNTHESIS
        </h2>
        <p className="text-[9px] text-[#555]">VERDICT MATRIX</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        {!verdict && !isStreaming && (
          <p className="text-[10px] text-[#444]">
            {activeQuery ? "Computing…" : "No active scan"}
          </p>
        )}

        {isStreaming && !verdict && (
          <div className="pulse-live">
            <p className="text-[10px] text-[#00ff41]">◈ SYNTHESIZING</p>
            <p className="mt-1 text-[9px] text-[#555]">{activeQuery}</p>
          </div>
        )}

        {verdict && (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              {verdict.isCached ? (
                <span className="text-[8px] text-[#ffb000]">📦 CURATED DEMO</span>
              ) : (
                <span className="text-[8px] text-[#00ff41]">⚡ LIVE SCAN</span>
              )}
              <button
                type="button"
                onClick={copyVerdict}
                className="border border-[#333] px-2 py-0.5 text-[8px] tracking-wider text-[#888] hover:border-[#00ff41] hover:text-[#00ff41]"
              >
                {copied ? "COPIED ✓" : "COPY VERDICT"}
              </button>
            </div>

            <p
              className="mb-1 text-sm font-bold tracking-wide"
              style={{ color: riskColor(verdict.riskLevel) }}
            >
              {verdict.verdictLabel}
            </p>
            <p className="mb-3 text-[9px] text-[#666]">
              RISK: {verdict.riskLevel} · CONF: {verdict.confidence}%
            </p>

            {verdict.weightedDelta && (
              <DeltaSigmaGauge delta={verdict.weightedDelta.delta} />
            )}

            <SignalBar
              label="NARRATIVE MOMENTUM"
              counts={verdict.narrative.counts}
              color="#00ff41"
            />
            <SignalBar
              label="REALITY MOMENTUM"
              counts={verdict.reality.counts}
              color="#ffb000"
            />

            <div className="my-3 border border-[#333] p-2">
              <p className="text-[9px] text-[#555]">SIGNAL GAP</p>
              <p className="text-lg font-bold text-white">
                {verdict.signalGap > 0 ? "+" : ""}
                {verdict.signalGap}
              </p>
              <p className="text-[8px] text-[#444]">
                narrative bullish − reality bullish
              </p>
            </div>

            <div className="border-t border-[#222] pt-2 text-left">
              <p className="mb-1 text-[9px] text-[#555]">RAW VOLUME</p>
              <div className="flex justify-between text-[9px]">
                <span className="text-[#00ff41]">
                  N: {verdict.narrative.totalVolume}
                </span>
                <span className="text-[#ffb000]">
                  R: {verdict.reality.totalVolume}
                </span>
              </div>
            </div>

            <div className="mt-3 border border-[#222] bg-[#0a0a0a] p-2 text-left">
              <p className="mb-1 text-[8px] tracking-wider text-[#ffb000]">
                FORENSIC SYNTHESIS
              </p>
              <p className="text-[9px] leading-relaxed text-[#ccc]">
                {verdict.aiExplanation ?? verdict.explanation}
              </p>
              {verdict.aiExplanation && (
                <p className="mt-2 text-[8px] text-[#00ff41]">
                  ◈ Gemini · signal math is rule-based
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
