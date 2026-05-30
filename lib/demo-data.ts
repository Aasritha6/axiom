import type { SourceResult } from "@/lib/discrepancy";
import type { AxiomVerdict } from "@/lib/discrepancy";
import { calculateVerdict, calculateWeightedDelta } from "@/lib/discrepancy";

export interface DemoQuery {
  id: string;
  label: string;
  query: string;
  tagline: string;
}

export const FEATURED_QUERIES: DemoQuery[] = [
  {
    id: "humane",
    label: "Humane AI Pin",
    query: "Humane AI Pin",
    tagline: "Classic hype-collapse archetype",
  },
  {
    id: "tesla-fsd",
    label: "Tesla Full Self-Driving",
    query: "Tesla FSD",
    tagline: "High-variance polarizing sentiment",
  },
  {
    id: "wework",
    label: "WeWork",
    query: "WeWork",
    tagline: "Extreme historical narrative deviation",
  },
];

export interface DemoStreamPayload {
  sources: SourceResult[];
  verdict: AxiomVerdict;
  weightedDelta: ReturnType<typeof calculateWeightedDelta>;
  isCached: true;
}

function src(
  sourceId: string,
  category: "NARRATIVE" | "REALITY",
  signal: "BULLISH" | "BEARISH" | "NEUTRAL",
  sentiment: number,
  volume: number,
  rows: { label: string; value: string | number }[],
  summary: string
): SourceResult {
  return {
    sourceId,
    category,
    signal,
    sentiment,
    volume,
    metrics: rows,
    summary,
    isLive: false,
  };
}

const DEMO_MATRICES: Record<string, SourceResult[]> = {
  humane: [
    src("news", "NARRATIVE", "BULLISH", 0.85, 142, [
      { label: "Articles (7d)", value: 142 },
      { label: "Hype keywords", value: 38 },
    ], "142 articles — peak revolutionary rhetoric"),
    src("related", "NARRATIVE", "BULLISH", 0.78, 67, [
      { label: "Related stories", value: 67 },
      { label: "Cross-coverage", value: "HIGH" },
    ], "67 related stories amplifying launch hype"),
    src("social", "NARRATIVE", "BULLISH", 0.72, 87, [
      { label: "Reddit threads", value: 87 },
      { label: "Viral index", value: "HIGH" },
    ], "87 Reddit threads — influencer amplification"),
    src("youtube", "NARRATIVE", "BULLISH", 0.91, 34, [
      { label: "Videos indexed", value: 34 },
      { label: "Promo density", value: 12 },
    ], "34 YouTube reviews — overwhelmingly promotional"),
    src("finance", "REALITY", "BEARISH", -0.65, 1, [
      { label: "Price change", value: "-78%" },
      { label: "Market cap erosion", value: "SEVERE" },
    ], "Funding reality: catastrophic decline"),
    src("amazon", "REALITY", "BEARISH", -0.88, 1240, [
      { label: "Listings", value: 1240 },
      { label: "Avg rating", value: "2.1★" },
    ], "Amazon reviews — refund requests dominate"),
    src("github", "REALITY", "BEARISH", -0.92, 3, [
      { label: "Active repos", value: 3 },
      { label: "Commit velocity", value: "FLATLINE" },
    ], "3 repos — commits flatlined post-launch"),
    src("steam", "REALITY", "BEARISH", -0.95, 0, [
      { label: "Steam presence", value: 0 },
      { label: "Player traction", value: "NONE" },
    ], "No Steam market traction — product dead on arrival"),
  ],
  "tesla-fsd": [
    src("news", "NARRATIVE", "BULLISH", 0.55, 98, [
      { label: "Articles (7d)", value: 98 },
      { label: "Autonomy mentions", value: 67 },
    ], "98 news items — autonomy narrative strong"),
    src("related", "NARRATIVE", "BULLISH", 0.42, 45, [
      { label: "Related coverage", value: 45 },
    ], "45 related autonomy stories"),
    src("social", "NARRATIVE", "NEUTRAL", 0.05, 210, [
      { label: "Reddit threads", value: 210 },
      { label: "Polarization", value: "EXTREME" },
    ], "210 threads — evenly split sentiment"),
    src("youtube", "NARRATIVE", "BULLISH", 0.48, 56, [
      { label: "Videos indexed", value: 56 },
      { label: "Demo footage", value: 41 },
    ], "56 videos — demo-heavy content"),
    src("finance", "REALITY", "BULLISH", 0.35, 1, [
      { label: "TSLA change (1mo)", value: "+4.2%" },
      { label: "FSD revenue", value: "$1.2B" },
    ], "Financials stable — FSD revenue growing"),
    src("amazon", "REALITY", "NEUTRAL", -0.1, 890, [
      { label: "Accessory listings", value: 890 },
      { label: "Avg rating", value: "3.4★" },
    ], "Mixed product experience reports"),
    src("github", "REALITY", "BULLISH", 0.55, 28, [
      { label: "Open repos", value: 28 },
      { label: "Stars (top)", value: "12.4k" },
    ], "28 public repos — active autopilot tooling"),
    src("steam", "REALITY", "NEUTRAL", 0.1, 12, [
      { label: "Steam apps", value: 12 },
      { label: "FSD-related", value: "INDIRECT" },
    ], "12 Steam listings — mostly third-party tools"),
  ],
  wework: [
    src("news", "NARRATIVE", "BULLISH", 0.95, 320, [
      { label: "Peak articles", value: 320 },
      { label: "Unicorn narrative", value: "PEAK" },
    ], "320 articles at peak — 'future of work'"),
    src("related", "NARRATIVE", "BULLISH", 0.82, 88, [
      { label: "Related stories", value: 88 },
    ], "88 related unicorn coverage pieces"),
    src("social", "NARRATIVE", "BULLISH", 0.88, 156, [
      { label: "Social mentions", value: 156 },
      { label: "Community hype", value: "MAX" },
    ], "156 social signals — cult following"),
    src("youtube", "NARRATIVE", "BULLISH", 0.75, 28, [
      { label: "Pitch videos", value: 28 },
      { label: "Vision rhetoric", value: 22 },
    ], "28 promotional pitch videos"),
    src("finance", "REALITY", "BEARISH", -0.99, 1, [
      { label: "IPO valuation", value: "$47B → $0.5B" },
      { label: "Bankruptcy", value: "FILED" },
    ], "Valuation collapse — bankruptcy filed"),
    src("amazon", "REALITY", "BEARISH", -0.7, 12, [
      { label: "Product listings", value: 12 },
      { label: "Brand merch", value: "LIQUIDATING" },
    ], "Minimal Amazon presence post-collapse"),
    src("github", "REALITY", "BEARISH", -0.6, 5, [
      { label: "Public repos", value: 5 },
      { label: "Last commit", value: "2y ago" },
    ], "Stale open-source footprint"),
    src("steam", "REALITY", "BEARISH", -0.85, 2, [
      { label: "Steam apps", value: 2 },
      { label: "Market relevance", value: "MINIMAL" },
    ], "Negligible Steam footprint post-collapse"),
  ],
};

export function getDemoPayload(queryId: string): DemoStreamPayload | null {
  const sources = DEMO_MATRICES[queryId];
  if (!sources) return null;

  const verdict = calculateVerdict(sources);
  const weightedDelta = calculateWeightedDelta(sources);

  return { sources, verdict, weightedDelta, isCached: true };
}

export function findDemoIdByQuery(query: string): string | null {
  const normalized = query.trim().toLowerCase();
  const match = FEATURED_QUERIES.find(
    (q) =>
      q.query.toLowerCase() === normalized ||
      q.label.toLowerCase() === normalized ||
      q.id === normalized
  );
  return match?.id ?? null;
}
