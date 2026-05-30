import type { Signal } from "@/lib/config/sources";

export interface RawMetrics {
  rows: { label: string; value: string | number }[];
  volume: number;
}

export interface ExtractionResult {
  signal: Signal;
  sentiment: number;
  metrics: RawMetrics;
  summary: string;
}

const HYPE_WORDS = [
  "revolutionary",
  "insane",
  "breakthrough",
  "next-gen",
  "unbelievable",
  "game-changer",
  "disrupt",
];

const STRESS_WORDS = [
  "flatline",
  "freeze",
  "drop",
  "unusable",
  "dead",
  "slow",
  "crash",
  "refund",
  "layoff",
  "bankrupt",
  "decline",
];

/** Only scan human-readable fields — never raw JSON keys/URLs */
const TEXT_FIELD_KEYS = new Set([
  "title",
  "description",
  "text",
  "body",
  "summary",
  "snippet",
  "headline",
  "name",
  "selftext",
  "content",
  "caption",
  "review",
  "comment",
]);

export function collectReadableText(data: unknown, depth = 0): string {
  if (depth > 8) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    return data.map((item) => collectReadableText(item, depth + 1)).join(" ");
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const parts: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (TEXT_FIELD_KEYS.has(keyLower) && typeof val === "string") {
        parts.push(val);
      } else if (val && typeof val === "object") {
        parts.push(collectReadableText(val, depth + 1));
      }
    }
    return parts.join(" ");
  }
  return "";
}

function countKeywordMatches(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return re.test(lower);
  }).length;
}

function signalFromSentiment(score: number): Signal {
  if (score > 0.15) return "BULLISH";
  if (score < -0.15) return "BEARISH";
  return "NEUTRAL";
}

function narrativeSentiment(text: string): number {
  const matches = countKeywordMatches(text, HYPE_WORDS);
  if (matches > 0) return Math.min(0.25 * matches, 1.0);
  return 0.0;
}

function realitySentiment(text: string): number {
  const matches = countKeywordMatches(text, STRESS_WORDS);
  if (matches > 0) return Math.max(-0.25 * matches, -1.0);
  return 0.0;
}

function extractArrayLength(data: unknown, keys: string[]): number {
  if (!data || typeof data !== "object") return 0;
  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val.length;
    if (typeof val === "number") return val;
  }
  if (Array.isArray(data)) return data.length;
  return 0;
}

export function extractNewsMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = narrativeSentiment(text);
  const articleCount = extractArrayLength(data, [
    "articles",
    "items",
    "results",
    "headlines",
    "stories",
  ]);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: articleCount,
      rows: [
        { label: "Articles found", value: articleCount },
        { label: "Hype keywords", value: countKeywordMatches(text, HYPE_WORDS) },
      ],
    },
    summary: `${articleCount} news items scanned`,
  };
}

export function extractSocialMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = narrativeSentiment(text);
  const postCount = extractArrayLength(data, [
    "posts",
    "children",
    "data",
    "results",
  ]);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: postCount,
      rows: [
        { label: "Posts / threads", value: postCount },
        { label: "Hype keywords", value: countKeywordMatches(text, HYPE_WORDS) },
      ],
    },
    summary: `${postCount} social signals indexed`,
  };
}

export function extractYoutubeMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = narrativeSentiment(text);
  const videoCount = extractArrayLength(data, ["videos", "items", "results"]);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: videoCount,
      rows: [
        { label: "Videos indexed", value: videoCount },
        { label: "Promo density", value: countKeywordMatches(text, HYPE_WORDS) },
      ],
    },
    summary: `${videoCount} video narratives parsed`,
  };
}

export function extractFinanceMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = realitySentiment(text);
  const priceChange =
    collectReadableText(data).match(/-?\d+\.?\d*%/)?.[0] ??
    (typeof data === "object" &&
    data &&
    "chart" in (data as object)
      ? "see chart"
      : "n/a");
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: 1,
      rows: [
        { label: "Price change", value: priceChange },
        { label: "Stress signals", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `Market reality: ${priceChange}`,
  };
}

export function extractGithubMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = realitySentiment(text);
  const repoCount = extractArrayLength(data, [
    "items",
    "repositories",
    "repos",
    "results",
  ]);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: repoCount,
      rows: [
        { label: "Repos found", value: repoCount },
        { label: "Stress signals", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `${repoCount} GitHub repos indexed`,
  };
}

export function extractAmazonMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = realitySentiment(text);
  const productCount = extractArrayLength(data, ["products", "results", "items"]);
  const ratingMatch = text.match(/(\d\.\d)\s*(out of|star|rating)/i);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: productCount,
      rows: [
        { label: "Products found", value: productCount },
        { label: "Top rating", value: ratingMatch?.[1] ?? "n/a" },
        { label: "Negative cues", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `${productCount} Amazon listings parsed`,
  };
}

export function extractHiringMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = realitySentiment(text);
  const companyCount = extractArrayLength(data, [
    "companies",
    "hits",
    "results",
    "items",
  ]);
  const hiringActive =
    companyCount > 0 &&
    (text.includes("hiring") || text.includes("is_hiring"));
  return {
    signal:
      hiringActive && companyCount >= 5
        ? "BULLISH"
        : companyCount === 0
          ? "BEARISH"
          : signalFromSentiment(sentiment),
    sentiment: companyCount === 0 ? -0.5 : sentiment,
    metrics: {
      volume: companyCount,
      rows: [
        { label: "Hiring companies", value: companyCount },
        { label: "YC pipeline", value: hiringActive ? "active" : "quiet" },
      ],
    },
    summary: `${companyCount} YC companies hiring for query`,
  };
}

export function extractSteamMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const sentiment = realitySentiment(text);
  const gameCount = extractArrayLength(data, [
    "games",
    "results",
    "items",
    "apps",
  ]);
  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: gameCount,
      rows: [
        { label: "Games / apps found", value: gameCount },
        { label: "Negative cues", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `${gameCount} Steam results for query`,
  };
}

const EXTRACTORS: Record<string, (data: unknown) => ExtractionResult> = {
  news: extractNewsMetrics,
  related: extractNewsMetrics,
  social: extractSocialMetrics,
  youtube: extractYoutubeMetrics,
  finance: extractFinanceMetrics,
  amazon: extractAmazonMetrics,
  github: extractGithubMetrics,
  hiring: extractHiringMetrics,
  steam: extractSteamMetrics,
  source: extractNewsMetrics,
  local: extractNewsMetrics,
};

export function extractForSource(slug: string, data: unknown): ExtractionResult {
  const fn = EXTRACTORS[slug];
  if (!fn) {
    const text = collectReadableText(data);
    const sentiment = narrativeSentiment(text);
    return {
      signal: signalFromSentiment(sentiment),
      sentiment,
      metrics: { volume: 0, rows: [{ label: "Payload", value: "received" }] },
      summary: "Generic extraction",
    };
  }
  return fn(data);
}

export type VolumeLevel = "high" | "medium" | "low";

export function classifyVolume(volume: number): VolumeLevel {
  if (volume >= 50) return "high";
  if (volume >= 10) return "medium";
  return "low";
}
