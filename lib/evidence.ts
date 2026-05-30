import { guessTicker } from "@/lib/config/sources";

/** Fallback search URLs when Wire payload has no direct link */
export function buildFallbackEvidenceUrl(wireId: string, query: string): string {
  const q = encodeURIComponent(query.trim() || "news");
  const fallbacks: Record<string, string> = {
    news: `https://news.google.com/search?q=${q}`,
    related: `https://news.google.com/search?q=${q}`,
    social: `https://www.reddit.com/search/?q=${q}`,
    youtube: `https://www.youtube.com/results?search_query=${q}`,
    finance: `https://finance.yahoo.com/quote/${guessTicker(query)}`,
    amazon: `https://www.amazon.com/s?k=${q}`,
    github: `https://github.com/search?q=${q}&type=repositories`,
    hiring: `https://www.ycombinator.com/companies`,
  };
  return fallbacks[wireId] ?? `https://www.google.com/search?q=${q}`;
}

export function primaryEvidenceUrl(
  wireId: string,
  query: string,
  evidenceLinks?: string[]
): string {
  const first = evidenceLinks?.find((u) => /^https?:\/\//i.test(u));
  return first ?? buildFallbackEvidenceUrl(wireId, query);
}
