import type { Signal, SourceCategory } from "@/lib/config/sources";
import { classifyVolume, type VolumeLevel } from "@/lib/extractors";

export interface SourceResult {
  sourceId: string;
  category: SourceCategory;
  signal: Signal;
  sentiment: number;
  metrics: { label: string; value: string | number }[];
  volume: number;
  summary: string;
  isLive: boolean;
}

export interface SignalCounts {
  bullish: number;
  bearish: number;
  neutral: number;
}

export interface HemisphereVerdict {
  counts: SignalCounts;
  totalVolume: number;
  volumeLevel: VolumeLevel;
  sourceCount: number;
  sufficient: boolean;
}

export interface AxiomVerdict {
  narrative: HemisphereVerdict;
  reality: HemisphereVerdict;
  /** Narrative bullish minus reality bullish */
  signalGap: number;
  verdictLabel: string;
  riskLevel: string;
  confidence: number;
  narrativeMomentum: number;
  realityMomentum: number;
  explanation: string;
}

function countSignals(results: SourceResult[]): SignalCounts {
  return results.reduce(
    (acc, r) => {
      acc[r.signal === "BULLISH" ? "bullish" : r.signal === "BEARISH" ? "bearish" : "neutral"]++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 } as SignalCounts
  );
}

function buildHemisphere(
  results: SourceResult[],
  minSources: number
): HemisphereVerdict {
  const counts = countSignals(results);
  const totalVolume = results.reduce((s, r) => s + r.volume, 0);
  return {
    counts,
    totalVolume,
    volumeLevel: classifyVolume(totalVolume),
    sourceCount: results.length,
    sufficient: results.length >= minSources,
  };
}

function decisionTreeVerdict(
  narrative: HemisphereVerdict,
  reality: HemisphereVerdict,
  delta: number
): { label: string; risk: string; explanation: string } {
  if (!narrative.sufficient || !reality.sufficient) {
    return {
      label: "INSUFFICIENT DATA",
      risk: "PARTIAL",
      explanation: "Need ≥2 sources per hemisphere for a valid verdict.",
    };
  }

  const nHigh = narrative.volumeLevel === "high" || narrative.counts.bullish >= 2;
  const nLow = narrative.volumeLevel === "low" && narrative.counts.bullish <= 1;
  const rStrong =
    reality.volumeLevel !== "low" &&
    (reality.counts.bullish >= reality.counts.bearish || reality.totalVolume >= 20);
  const rWeak =
    reality.volumeLevel === "low" ||
    reality.counts.bearish > reality.counts.bullish;

  let result: { label: string; risk: string; explanation: string };

  if (nHigh && rWeak) {
    result = {
      label: "HYPE DOMINATES REALITY",
      risk: "EXTREME",
      explanation: `Narrative: ${narrative.counts.bullish}↑ ${narrative.counts.bearish}↓ · Reality: ${reality.counts.bullish}↑ ${reality.counts.bearish}↓ — loud story, weak execution.`,
    };
  } else if (nLow && rStrong) {
    result = {
      label: "REALITY EXCEEDS HYPE",
      risk: "UNDERVALUED",
      explanation: `Quiet narrative but strong reality metrics (${reality.totalVolume} data points).`,
    };
  } else if (narrative.counts.bullish > reality.counts.bullish + 1) {
    result = {
      label: "NARRATIVE DEVIATION",
      risk: "MODERATE",
      explanation: `Narrative leads by ${narrative.counts.bullish - reality.counts.bullish} bullish signal(s).`,
    };
  } else {
    result = {
      label: "CONSENSUS ALIGNED",
      risk: "LOW",
      explanation: "Narrative and reality signals are in equilibrium.",
    };
  }

  // Δ-Sigma refinement — align gauge with verdict label
  if (delta >= 0.75 && rWeak && result.label !== "HYPE DOMINATES REALITY") {
    return {
      label: "HYPE DOMINATES REALITY",
      risk: "EXTREME",
      explanation: `Δ-Sigma +${delta.toFixed(2)} confirms narrative-reality divergence.`,
    };
  }
  if (delta <= -0.75 && nLow && result.label !== "REALITY EXCEEDS HYPE") {
    return {
      label: "REALITY EXCEEDS HYPE",
      risk: "UNDERVALUED",
      explanation: `Δ-Sigma ${delta.toFixed(2)} — substance ahead of story.`,
    };
  }
  if (result.label === "CONSENSUS ALIGNED") {
    if (delta > 0.45) {
      return {
        label: "NARRATIVE DEVIATION",
        risk: "MODERATE",
        explanation: `Δ-Sigma +${delta.toFixed(2)} — narrative sentiment ahead of reality.`,
      };
    }
    if (delta < -0.45) {
      return {
        label: "REALITY EXCEEDS HYPE",
        risk: "UNDERVALUED",
        explanation: `Δ-Sigma ${delta.toFixed(2)} — operational signals stronger than coverage.`,
      };
    }
  }

  return result;
}

/** Volume-weighted mean — sources with more data points count more */
function weightedAvgSentiment(results: SourceResult[]): number {
  if (results.length === 0) return 0;
  const totalWeight = results.reduce(
    (sum, r) => sum + Math.max(r.volume, 1),
    0
  );
  const weighted = results.reduce(
    (sum, r) => sum + r.sentiment * Math.max(r.volume, 1),
    0
  );
  return weighted / totalWeight;
}

export function calculateVerdict(
  results: SourceResult[],
  minSourcesPerHemisphere = 2,
  query = ""
): AxiomVerdict {
  const narrativeResults = results.filter((r) => r.category === "NARRATIVE");
  const realityResults = results.filter((r) => r.category === "REALITY");

  const narrative = buildHemisphere(narrativeResults, minSourcesPerHemisphere);
  const reality = buildHemisphere(realityResults, minSourcesPerHemisphere);

  const weightedDelta = calculateWeightedDelta(results);
  const signalGap = narrative.counts.bullish - reality.counts.bullish;
  const { label, risk } = decisionTreeVerdict(
    narrative,
    reality,
    weightedDelta.delta
  );

  const totalSources = results.length;
  const maxSources = 8;
  const totalVolume = narrative.totalVolume + reality.totalVolume;
  const coverageScore = (totalSources / maxSources) * 70;
  const volumeScore = Math.min(totalVolume / 300, 1) * 30;

  const base: AxiomVerdict = {
    narrative,
    reality,
    signalGap,
    verdictLabel: label,
    riskLevel: risk,
    confidence: Math.min(Math.round(coverageScore + volumeScore), 100),
    narrativeMomentum: narrative.counts.bullish - narrative.counts.bearish,
    realityMomentum: reality.counts.bullish - reality.counts.bearish,
    explanation: "",
  };

  return {
    ...base,
    explanation: buildForensicExplanation(query, results, base, weightedDelta),
  };
}

/** Legacy weighted delta for display alongside signal counts */
export interface WeightedDelta {
  delta: number;
  meanNarrative: number;
  meanReality: number;
}

export function calculateWeightedDelta(
  results: SourceResult[]
): WeightedDelta {
  const narrative = results.filter((r) => r.category === "NARRATIVE");
  const reality = results.filter((r) => r.category === "REALITY");

  const avgN = weightedAvgSentiment(narrative);
  const avgR = weightedAvgSentiment(reality);

  const meanNarrative = parseFloat((avgN * 0.6).toFixed(2));
  const meanReality = parseFloat((avgR * 1.4).toFixed(2));
  const rawDelta = meanNarrative - meanReality;
  const delta = parseFloat(Math.max(-2, Math.min(2, rawDelta)).toFixed(2));

  return { delta, meanNarrative, meanReality };
}

function formatCountsLine(
  label: string,
  h: HemisphereVerdict
): string {
  const { bullish, bearish, neutral } = h.counts;
  const total = h.sourceCount || 1;
  const bullPct = Math.round((bullish / total) * 100);
  return `${label} ${bullish}↑/${bearish}↓/${neutral}→ (${bullPct}% bullish, vol ${h.totalVolume} · ${h.volumeLevel})`;
}

/** Rule-based forensic prose — used as fallback when Gemini is unavailable */
export function buildForensicExplanation(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict,
  weightedDelta: WeightedDelta
): string {
  const n = verdict.narrative;
  const r = verdict.reality;
  const delta = weightedDelta.delta;
  const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
  const volRatio =
    n.totalVolume > 0
      ? (r.totalVolume / n.totalVolume).toFixed(1)
      : "N/A";

  const topReality = results
    .filter((s) => s.category === "REALITY" && s.signal === "BULLISH")
    .sort((a, b) => b.volume - a.volume)[0];
  const topNarrative = results
    .filter((s) => s.category === "NARRATIVE")
    .sort((a, b) => b.volume - a.volume)[0];

  const lines = [
    `${query}: ${verdict.verdictLabel} (${verdict.riskLevel}) · Δ-Sigma ${deltaStr} · signal gap ${verdict.signalGap > 0 ? "+" : ""}${verdict.signalGap}.`,
    formatCountsLine("Narrative", n) + "; " + formatCountsLine("Reality", r) + `.`,
    `Reality/narrative volume ratio ${volRatio}x · confidence ${verdict.confidence}%.`,
  ];

  if (topReality) {
    lines.push(
      `Strongest reality wire [${topReality.sourceId}]: ${topReality.summary} (${topReality.volume} pts).`
    );
  }
  if (topNarrative && n.counts.bullish >= 2) {
    lines.push(
      `Loudest narrative wire [${topNarrative.sourceId}]: ${topNarrative.summary}.`
    );
  }

  return lines.join(" ");
}

export function enrichVerdictExplanation(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict,
  weightedDelta: WeightedDelta
): AxiomVerdict {
  return {
    ...verdict,
    explanation: buildForensicExplanation(
      query,
      results,
      verdict,
      weightedDelta
    ),
  };
}
