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
  evidenceLinks?: string[];
}

const HYPE_WORDS = [
  "revolutionary",
  "insane",
  "breakthrough",
  "next-gen",
  "unbelievable",
  "game-changer",
  "disrupt",
  "unicorn",
  "moonshot",
  "paradigm",
  "world-class",
  "industry-leading",
  "viral",
  "hype",
  "billion-dollar",
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
  "insolvency",
  "fraud",
  "scam",
  "lawsuit",
  "recall",
  "delist",
  "collapse",
  "shutdown",
  "liquidat",
];

const GROWTH_WORDS = [
  "growth",
  "profit",
  "revenue",
  "expansion",
  "hiring",
  "record",
  "surge",
  "beat",
  "upgrade",
  "outperform",
  "momentum",
  "accelerat",
  "bullish",
  "rally",
  "star",
  "stars",
  "active",
  "commit",
];

/** Signal cutoff — tuned for finer-grained sentiment steps */
const SIGNAL_THRESHOLD = 0.12;

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
  "content_text",
  "full_text",
  "article_body",
  "post_body",
  "message",
  "tweet",
  "post",
  "transcript",
  "abstract",
  "excerpt",
  "preview",
  "subtitle",
  "tagline",
  "bio",
  "about",
  "overview",
  "details",
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

const URL_FIELD_KEYS = new Set([
  "url",
  "link",
  "href",
  "permalink",
  "html_url",
  "web_url",
  "article_url",
]);

/** Pull up to 3 evidence URLs from Wire payload */
export function collectEvidenceLinks(
  data: unknown,
  max = 3,
  depth = 0,
  found: string[] = []
): string[] {
  if (depth > 10 || found.length >= max) return found.slice(0, max);

  if (typeof data === "string") {
    if (/^https?:\/\//i.test(data) && !found.includes(data)) found.push(data);
    return found.slice(0, max);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      collectEvidenceLinks(item, max, depth + 1, found);
      if (found.length >= max) break;
    }
    return found.slice(0, max);
  }

  if (data && typeof data === "object") {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (
        URL_FIELD_KEYS.has(key.toLowerCase()) &&
        typeof val === "string" &&
        /^https?:\/\//i.test(val) &&
        !found.includes(val)
      ) {
        found.push(val);
      } else if (val && typeof val === "object") {
        collectEvidenceLinks(val, max, depth + 1, found);
      }
      if (found.length >= max) break;
    }
  }

  return found.slice(0, max);
}

function countKeywordMatches(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.filter((w) => {
    const re = new RegExp(
      `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "i"
    );
    return re.test(lower);
  }).length;
}

function clampSentiment(score: number): number {
  return Math.max(-1, Math.min(1, score));
}

export function signalFromSentiment(score: number): Signal {
  if (score > SIGNAL_THRESHOLD) return "BULLISH";
  if (score < -SIGNAL_THRESHOLD) return "BEARISH";
  return "NEUTRAL";
}

/** Narrative: hype keywords + volume amplification when coverage is loud */
function narrativeSentiment(text: string, volume = 0): number {
  const matches = countKeywordMatches(text, HYPE_WORDS);
  if (matches === 0) return 0.0;

  const keywordScore = Math.min(0.18 * matches, 0.85);
  const volumeBoost =
    volume >= 100 ? 0.18 : volume >= 50 ? 0.12 : volume >= 20 ? 0.06 : 0;
  return clampSentiment(keywordScore + volumeBoost);
}

/** Reality text: growth cues vs stress cues */
function realityTextSentiment(text: string): number {
  const stress = countKeywordMatches(text, STRESS_WORDS);
  const growth = countKeywordMatches(text, GROWTH_WORDS);
  if (stress === 0 && growth === 0) return 0;
  return clampSentiment(growth * 0.14 - stress * 0.18);
}

function digNumeric(data: unknown, keys: string[], depth = 0): number | null {
  if (depth > 12 || data == null) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = digNumeric(item, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (typeof data === "object") {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const keyLower = key.toLowerCase();
      if (keys.some((k) => k.toLowerCase() === keyLower)) {
        if (typeof val === "number" && !Number.isNaN(val)) return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val.replace(/[%$,+\s]/g, ""));
          if (!Number.isNaN(parsed)) return parsed;
        }
      }
      const nested = digNumeric(val, keys, depth + 1);
      if (nested !== null) return nested;
    }
  }

  return null;
}

function extractPriceChangePercent(data: unknown, text: string): number | null {
  const fromJson = digNumeric(data, [
    "regularMarketChangePercent",
    "percentChange",
    "changePercent",
    "priceChangePercent",
    "regularMarketChange",
  ]);
  if (fromJson !== null) return fromJson;

  const pctMatch = text.match(/([+-]?\d+\.?\d*)\s*%/);
  if (pctMatch) return parseFloat(pctMatch[1]);

  return null;
}

function sentimentFromPriceChange(pct: number | null): number {
  if (pct === null) return 0;
  if (pct >= 15) return 0.85;
  if (pct >= 8) return 0.6;
  if (pct >= 3) return 0.35;
  if (pct >= 0.5) return 0.15;
  if (pct >= 0) return 0.05;
  if (pct >= -3) return -0.2;
  if (pct >= -8) return -0.45;
  if (pct >= -20) return -0.7;
  return -0.9;
}

function extractMaxStars(data: unknown): number {
  let max = 0;

  function walk(node: unknown, depth: number) {
    if (depth > 12 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node === "object") {
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        const k = key.toLowerCase();
        if (
          (k === "stargazers_count" || k === "stars" || k === "star_count") &&
          typeof val === "number"
        ) {
          max = Math.max(max, val);
        } else if (val && typeof val === "object") {
          walk(val, depth + 1);
        }
      }
    }
  }

  walk(data, 0);
  return max;
}

function sentimentFromGithub(repoCount: number, maxStars: number, textScore: number): number {
  let score = textScore;

  if (repoCount === 0) score -= 0.4;
  else if (repoCount >= 100) score += 0.5;
  else if (repoCount >= 30) score += 0.35;
  else if (repoCount >= 10) score += 0.2;
  else score += 0.08;

  if (maxStars >= 10_000) score += 0.28;
  else if (maxStars >= 1_000) score += 0.18;
  else if (maxStars >= 100) score += 0.08;

  return clampSentiment(score);
}

function extractBestRating(text: string, data: unknown): number | null {
  const fromJson = digNumeric(data, [
    "rating",
    "averageRating",
    "avg_rating",
    "stars",
    "review_rating",
  ]);
  if (fromJson !== null && fromJson >= 0 && fromJson <= 5) return fromJson;

  const matches = [
    ...text.matchAll(/(\d\.\d)\s*(?:\/\s*5|out of 5|star|rating|★)/gi),
    ...text.matchAll(/(\d\.\d)\s*★/g),
  ];
  if (matches.length === 0) return null;

  const ratings = matches.map((m) => parseFloat(m[1])).filter((r) => r >= 0 && r <= 5);
  return ratings.length ? Math.min(...ratings) : null;
}

function sentimentFromAmazon(
  productCount: number,
  rating: number | null,
  textScore: number
): number {
  let score = textScore;

  if (productCount === 0) score -= 0.15;
  else if (productCount >= 500) score += 0.05;

  if (rating !== null) {
    if (rating >= 4.5) score += 0.45;
    else if (rating >= 4.0) score += 0.22;
    else if (rating >= 3.5) score += 0.05;
    else if (rating >= 3.0) score -= 0.15;
    else if (rating >= 2.5) score -= 0.35;
    else score -= 0.55;
  }

  return clampSentiment(score);
}

function sentimentFromHiring(companyCount: number, textScore: number): number {
  if (companyCount === 0) return -0.55;
  if (companyCount >= 50) return clampSentiment(0.55 + textScore * 0.2);
  if (companyCount >= 20) return clampSentiment(0.42 + textScore * 0.2);
  if (companyCount >= 10) return clampSentiment(0.28 + textScore * 0.15);
  if (companyCount >= 5) return clampSentiment(0.15 + textScore * 0.1);
  return clampSentiment(textScore);
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
  const articleCount = extractArrayLength(data, [
    "articles",
    "items",
    "results",
    "headlines",
    "stories",
  ]);
  const sentiment = narrativeSentiment(text, articleCount);
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
  const postCount = extractArrayLength(data, [
    "posts",
    "children",
    "data",
    "results",
  ]);
  const sentiment = narrativeSentiment(text, postCount);
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
  const videoCount = extractArrayLength(data, ["videos", "items", "results"]);
  const sentiment = narrativeSentiment(text, videoCount);
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
  const textScore = realityTextSentiment(text);
  const priceChangePct = extractPriceChangePercent(data, text);
  const priceScore = sentimentFromPriceChange(priceChangePct);
  const sentiment = clampSentiment(priceScore * 0.75 + textScore * 0.25);
  const priceDisplay =
    priceChangePct !== null
      ? `${priceChangePct > 0 ? "+" : ""}${priceChangePct.toFixed(2)}%`
      : text.match(/[+-]?\d+\.?\d*%/)?.[0] ?? "n/a";

  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: 1,
      rows: [
        { label: "Price change", value: priceDisplay },
        { label: "Stress signals", value: countKeywordMatches(text, STRESS_WORDS) },
        { label: "Growth signals", value: countKeywordMatches(text, GROWTH_WORDS) },
      ],
    },
    summary: `Market reality: ${priceDisplay}`,
  };
}

export function extractGithubMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const textScore = realityTextSentiment(text);
  const repoCount = extractArrayLength(data, [
    "items",
    "repositories",
    "repos",
    "results",
  ]);
  const maxStars = extractMaxStars(data);
  const sentiment = sentimentFromGithub(repoCount, maxStars, textScore);

  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: repoCount,
      rows: [
        { label: "Repos found", value: repoCount },
        { label: "Top stars", value: maxStars > 0 ? maxStars.toLocaleString() : "n/a" },
        { label: "Stress signals", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `${repoCount} GitHub repos indexed`,
  };
}

export function extractAmazonMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const textScore = realityTextSentiment(text);
  const productCount = extractArrayLength(data, ["products", "results", "items"]);
  const rating = extractBestRating(text, data);
  const sentiment = sentimentFromAmazon(productCount, rating, textScore);

  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
    metrics: {
      volume: productCount,
      rows: [
        { label: "Products found", value: productCount },
        { label: "Lowest rating", value: rating !== null ? `${rating.toFixed(1)}★` : "n/a" },
        { label: "Negative cues", value: countKeywordMatches(text, STRESS_WORDS) },
      ],
    },
    summary: `${productCount} Amazon listings parsed`,
  };
}

export function extractHiringMetrics(data: unknown): ExtractionResult {
  const text = collectReadableText(data);
  const textScore = realityTextSentiment(text);
  const companyCount = extractArrayLength(data, [
    "companies",
    "hits",
    "results",
    "items",
  ]);
  const sentiment = sentimentFromHiring(companyCount, textScore);
  const hiringActive =
    companyCount > 0 &&
    (text.includes("hiring") || text.includes("is_hiring"));

  return {
    signal: signalFromSentiment(sentiment),
    sentiment,
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
  const textScore = realityTextSentiment(text);
  const gameCount = extractArrayLength(data, [
    "games",
    "results",
    "items",
    "apps",
  ]);
  const sentiment =
    gameCount === 0
      ? clampSentiment(textScore - 0.2)
      : clampSentiment(textScore + Math.min(gameCount / 200, 0.25));

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
  const fallbackText = collectReadableText(data);
  const base = fn
    ? fn(data)
    : {
        signal: signalFromSentiment(narrativeSentiment(fallbackText)),
        sentiment: narrativeSentiment(fallbackText),
        metrics: { volume: 0, rows: [{ label: "Payload", value: "received" }] },
        summary: "Generic extraction",
      };

  return {
    ...base,
    evidenceLinks: collectEvidenceLinks(data),
  };
}

export type VolumeLevel = "high" | "medium" | "low";

export function classifyVolume(volume: number): VolumeLevel {
  if (volume >= 50) return "high";
  if (volume >= 10) return "medium";
  return "low";
}
