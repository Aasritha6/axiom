"use client";

import { useCallback, useState } from "react";
import { DeltaSigmaGauge } from "@/components/DeltaSigmaGauge";
import type { AxiomVerdict, WeightedDelta } from "@/lib/discrepancy";
import type { NarrativeMode } from "@/lib/gemini";

interface Props {
  verdict: (AxiomVerdict & {
    weightedDelta?: WeightedDelta;
    isCached?: boolean;
    aiExplanation?: string | null;
    narrativeMode?: NarrativeMode;
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
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-[#9a9a9a]">{label}</span>
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
  if (risk === "EXTREME") return "#ff5c5c";
  if (risk === "MODERATE") return "#ffc84d";
  if (risk === "UNDERVALUED") return "#3dff7a";
  if (risk === "PARTIAL") return "#9a9a9a";
  return "#3dff7a";
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
    <section className="flex min-h-[300px] flex-col border-x border-[#3a3a3a] bg-[#050505] lg:min-h-0">
      <header className="border-b border-[#3a3a3a] px-3 py-2.5 text-center">
        <h2 className="text-sm font-bold tracking-widest text-[#e8e8e8]">
          🎯 FORENSIC SYNTHESIS
        </h2>
        <p className="text-[11px] text-[#9a9a9a]">VERDICT MATRIX</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        {!verdict && !isStreaming && (
          <p className="text-sm text-[#7a7a7a]">
            {activeQuery ? "Computing…" : "No active scan"}
          </p>
        )}

        {isStreaming && !verdict && (
          <div className="pulse-live">
            <p className="text-sm text-[#3dff7a]">◈ SYNTHESIZING</p>
            <p className="mt-1 text-xs text-[#9a9a9a]">{activeQuery}</p>
          </div>
        )}

        {verdict && (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              {verdict.isCached ? (
                <span className="text-[10px] text-[#ffc84d]">📦 CURATED DEMO</span>
              ) : (
                <span className="text-[10px] text-[#3dff7a]">⚡ LIVE SCAN</span>
              )}
              <button
                type="button"
                onClick={copyVerdict}
                className="border border-[#3a3a3a] px-2 py-1 text-[10px] tracking-wider text-[#b4b4b4] hover:border-[#3dff7a] hover:text-[#3dff7a]"
              >
                {copied ? "COPIED ✓" : "COPY VERDICT"}
              </button>
            </div>

            <p
              className="mb-1 text-base font-bold tracking-wide"
              style={{ color: riskColor(verdict.riskLevel) }}
            >
              {verdict.verdictLabel}
            </p>
            <p className="mb-3 text-xs text-[#9a9a9a]">
              RISK: {verdict.riskLevel} · CONF: {verdict.confidence}%
            </p>

            {verdict.weightedDelta && (
              <DeltaSigmaGauge delta={verdict.weightedDelta.delta} />
            )}

            <SignalBar
              label="NARRATIVE MOMENTUM"
              counts={verdict.narrative.counts}
              color="#3dff7a"
            />
            <SignalBar
              label="REALITY MOMENTUM"
              counts={verdict.reality.counts}
              color="#ffc84d"
            />

            <div className="my-3 border border-[#3a3a3a] p-3">
              <p className="text-[11px] text-[#9a9a9a]">SIGNAL GAP</p>
              <p className="text-xl font-bold text-[#e8e8e8]">
                {verdict.signalGap > 0 ? "+" : ""}
                {verdict.signalGap}
              </p>
              <p className="text-[10px] text-[#7a7a7a]">
                narrative bullish − reality bullish
              </p>
            </div>

            <div className="border-t border-[#2a2a2a] pt-2 text-left">
              <p className="mb-1 text-[11px] text-[#9a9a9a]">RAW VOLUME</p>
              <div className="flex justify-between text-xs">
                <span className="text-[#3dff7a]">
                  N: {verdict.narrative.totalVolume}
                </span>
                <span className="text-[#ffc84d]">
                  R: {verdict.reality.totalVolume}
                </span>
              </div>
            </div>

            <div className="mt-3 border border-[#2a2a2a] bg-[#0a0a0a] p-3 text-left">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px] tracking-wider text-[#ffc84d]">
                  FORENSIC SYNTHESIS
                </p>
                {verdict.narrativeMode === "ai-grounded" ? (
                  <span className="rounded border border-[#3dff7a]/40 bg-[#3dff7a]/10 px-2 py-0.5 text-[10px] tracking-wider text-[#3dff7a]">
                    AI-grounded
                  </span>
                ) : (
                  <span className="rounded border border-[#555] bg-[#141414] px-2 py-0.5 text-[10px] tracking-wider text-[#9a9a9a]">
                    Rule-based
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-[#d4d4d4]">
                {verdict.aiExplanation ?? verdict.explanation}
              </p>
              {verdict.narrativeMode === "ai-grounded" && (
                <p className="mt-2 text-[10px] text-[#7a7a7a]">
                  Verdict &amp; Δ-Sigma are rule-based · prose cites wire facts only
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
