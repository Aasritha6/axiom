export type SourceCategory = "NARRATIVE" | "REALITY";
export type Signal = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface WireSource {
  id: string;
  slug: string;
  label: string;
  category: SourceCategory;
  actionId: string;
  catalog: string;
  credits?: number;
  buildParams: (query: string) => Record<string, unknown>;
  fallback?: "reddit_json" | "yahoo_finance";
}

/** Map common company names → tickers for yf_quote */
const TICKER_ALIASES: Record<string, string> = {
  tesla: "TSLA",
  humane: "HUMA",
  openai: "MSFT",
  apple: "AAPL",
  google: "GOOGL",
  alphabet: "GOOGL",
  microsoft: "MSFT",
  nvidia: "NVDA",
  wework: "WEWKQ",
  meta: "META",
  amazon: "AMZN",
};

export function guessTicker(query: string): string {
  const key = query.trim().toLowerCase().split(/\s+/)[0];
  if (TICKER_ALIASES[key]) return TICKER_ALIASES[key];
  const upper = query.trim().toUpperCase().split(/\s+/)[0];
  if (/^[A-Z]{1,5}(-[A-Z]+)?$/.test(upper)) return upper;
  return upper.slice(0, 4) || "SPY";
}

/**
 * All 8 Wire sources — verified via GET /v1/wire/catalog/{slug}
 * Run: npm run catalog
 */
export const WIRE_SOURCES: WireSource[] = [
  // ── NARRATIVE (Left Brain) ──────────────────────────────────────
  {
    id: "news",
    slug: "news",
    label: "GOOGLE NEWS SEARCH",
    category: "NARRATIVE",
    actionId: "gn_search",
    catalog: "google_news",
    credits: 2,
    buildParams: (q) => ({
      query: q,
      when: "",
      after: "",
      before: "",
      country: "",
      language: "en",
      limit: 20,
    }),
  },
  {
    id: "related",
    slug: "related",
    label: "RELATED COVERAGE",
    category: "NARRATIVE",
    actionId: "gn_related",
    catalog: "google_news",
    credits: 2,
    buildParams: (q) => ({
      query: q,
      when: "",
      country: "",
      language: "en",
      limit: 15,
    }),
  },
  {
    id: "social",
    slug: "social",
    label: "REDDIT SEARCH",
    category: "NARRATIVE",
    actionId: "rt_search",
    catalog: "reddit",
    credits: 2,
    buildParams: (q) => ({
      query: q,
      sort: "relevance",
      time: "month",
      limit: 25,
    }),
    fallback: "reddit_json",
  },
  {
    id: "youtube",
    slug: "youtube",
    label: "YOUTUBE SEARCH",
    category: "NARRATIVE",
    actionId: "yt_search",
    catalog: "youtube",
    credits: 2,
    buildParams: (q) => ({ query: q, limit: 10 }),
  },

  // ── REALITY (Right Brain) ───────────────────────────────────────
  {
    id: "finance",
    slug: "finance",
    label: "YAHOO FINANCE QUOTE",
    category: "REALITY",
    actionId: "yf_quote",
    catalog: "yahoo_finance",
    credits: 1,
    buildParams: (q) => ({ ticker: guessTicker(q) }),
    fallback: "yahoo_finance",
  },
  {
    id: "amazon",
    slug: "amazon",
    label: "AMAZON PRODUCTS",
    category: "REALITY",
    actionId: "am_search_products",
    catalog: "amazon",
    credits: 1,
    buildParams: (q) => ({
      query: q,
      page: 1,
      limit: 24,
      sort: "rating_high",
    }),
  },
  {
    id: "github",
    slug: "github",
    label: "GITHUB REPOS",
    category: "REALITY",
    actionId: "gh_search_repos",
    catalog: "github",
    credits: 2,
    buildParams: (q) => ({
      query: q,
      sort: "stars",
      order: "desc",
      per_page: 10,
      page: 1,
    }),
  },
  {
    id: "steam",
    slug: "steam",
    label: "STEAM MARKET",
    category: "REALITY",
    actionId: "st_search",
    catalog: "steam",
    credits: 2,
    buildParams: (q) => ({ query: q, limit: 10 }),
  },
];

export const MIN_SOURCES_PER_HEMISPHERE = 2;

/** Full catalog reference saved by npm run catalog */
export const WIRE_CATALOG_SLUGS = [
  "google_news",
  "reddit",
  "youtube",
  "yahoo_finance",
  "amazon",
  "github",
  "ycombinator",
  "steam",
  "indeed",
] as const;
