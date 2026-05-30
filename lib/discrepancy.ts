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
  reality: HemisphereVerdict
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

  if (nHigh && rWeak) {
    return {
      label: "HYPE DOMINATES REALITY",
      risk: "EXTREME",
      explanation: `Narrative: ${narrative.counts.bullish}↑ ${narrative.counts.bearish}↓ · Reality: ${reality.counts.bullish}↑ ${reality.counts.bearish}↓ — loud story, weak execution.`,
    };
  }
  if (nLow && rStrong) {
    return {
      label: "REALITY EXCEEDS HYPE",
      risk: "UNDERVALUED",
      explanation: `Quiet narrative but strong reality metrics (${reality.totalVolume} data points).`,
    };
  }
  if (narrative.counts.bullish > reality.counts.bullish + 1) {
    return {
      label: "NARRATIVE DEVIATION",
      risk: "MODERATE",
      explanation: `Narrative leads by ${narrative.counts.bullish - reality.counts.bullish} bullish signal(s).`,
    };
  }
  return {
    label: "CONSENSUS ALIGNED",
    risk: "LOW",
    explanation: "Narrative and reality signals are in equilibrium.",
  };
}

export function calculateVerdict(
  results: SourceResult[],
  minSourcesPerHemisphere = 2
): AxiomVerdict {
  const narrativeResults = results.filter((r) => r.category === "NARRATIVE");
  const realityResults = results.filter((r) => r.category === "REALITY");

  const narrative = buildHemisphere(narrativeResults, minSourcesPerHemisphere);
  const reality = buildHemisphere(realityResults, minSourcesPerHemisphere);

  const signalGap = narrative.counts.bullish - reality.counts.bullish;
  const { label, risk, explanation } = decisionTreeVerdict(narrative, reality);

  const totalSources = results.length;
  const maxSources = 8;

  return {
    narrative,
    reality,
    signalGap,
    verdictLabel: label,
    riskLevel: risk,
    confidence: Math.min(Math.round((totalSources / maxSources) * 100), 100),
    narrativeMomentum: narrative.counts.bullish - narrative.counts.bearish,
    realityMomentum: reality.counts.bullish - reality.counts.bearish,
    explanation,
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

  const avgN =
    narrative.reduce((a, c) => a + c.sentiment, 0) / (narrative.length || 1);
  const avgR =
    reality.reduce((a, c) => a + c.sentiment, 0) / (reality.length || 1);

  const meanNarrative = parseFloat((avgN * 0.6).toFixed(2));
  const meanReality = parseFloat((avgR * 1.4).toFixed(2));
  const delta = parseFloat((meanNarrative - meanReality).toFixed(2));

  return { delta, meanNarrative, meanReality };
}
