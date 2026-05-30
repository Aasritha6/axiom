import type { AxiomVerdict, SourceResult, WeightedDelta } from "@/lib/discrepancy";
import { buildForensicExplanation } from "@/lib/discrepancy";

export type NarrativeMode = "ai-grounded" | "rule-based";

export interface WireFactSource {
  sourceIndex: number;
  sourceId: string;
  category: string;
  signal: string;
  sentiment: number;
  volume: number;
  summary: string;
  metrics: { label: string; value: string | number }[];
  title: string | null;
  url: string | null;
  snippet: string | null;
}

export interface GeminiFacts {
  query: string;
  verdictLabel: string;
  riskLevel: string;
  signalGap: number;
  deltaSigma: number;
  meanNarrative: number;
  meanReality: number;
  narrative: {
    bullish: number;
    bearish: number;
    neutral: number;
    totalVolume: number;
    volumeLevel: string;
  };
  reality: {
    bullish: number;
    bearish: number;
    neutral: number;
    totalVolume: number;
    volumeLevel: string;
  };
  sources: WireFactSource[];
}

interface GeminiStructuredOutput {
  headline: string;
  body: string;
  citations: { claim: string; sourceIndex: number }[];
}

export interface NarrativeSynthesis {
  prose: string;
  mode: NarrativeMode;
  headline?: string;
}

export interface WireContext {
  evidenceLinks?: string[];
  label?: string;
}

export function buildGeminiFacts(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict,
  weightedDelta: WeightedDelta,
  wireContext: Record<string, WireContext> = {}
): GeminiFacts {
  return {
    query,
    verdictLabel: verdict.verdictLabel,
    riskLevel: verdict.riskLevel,
    signalGap: verdict.signalGap,
    deltaSigma: weightedDelta.delta,
    meanNarrative: weightedDelta.meanNarrative,
    meanReality: weightedDelta.meanReality,
    narrative: {
      bullish: verdict.narrative.counts.bullish,
      bearish: verdict.narrative.counts.bearish,
      neutral: verdict.narrative.counts.neutral,
      totalVolume: verdict.narrative.totalVolume,
      volumeLevel: verdict.narrative.volumeLevel,
    },
    reality: {
      bullish: verdict.reality.counts.bullish,
      bearish: verdict.reality.counts.bearish,
      neutral: verdict.reality.counts.neutral,
      totalVolume: verdict.reality.totalVolume,
      volumeLevel: verdict.reality.volumeLevel,
    },
    sources: results.map((r, i) => {
      const ctx = wireContext[r.sourceId] ?? {};
      const url = ctx.evidenceLinks?.[0] ?? null;
      return {
        sourceIndex: i,
        sourceId: r.sourceId,
        category: r.category,
        signal: r.signal,
        sentiment: r.sentiment,
        volume: r.volume,
        summary: r.summary,
        metrics: r.metrics,
        title: ctx.label ?? r.sourceId.toUpperCase(),
        url,
        snippet: r.summary.slice(0, 240),
      };
    }),
  };
}

const SYSTEM_PROMPT = `You are AXIOM narrative synthesizer. Rules are STRICT:
- Use ONLY numbers, labels, and text in the provided facts JSON.
- Do NOT invent sources, URLs, counts, valuations, or verdict categories.
- The verdict label and risk level in facts are FINAL — do not change them.
- Every claim in body must map to a citation with a valid sourceIndex from facts.sources.
- If evidence is thin, say "insufficient evidence" for that point — do not guess.
- Output valid JSON only with keys: headline, body, citations.
- headline: one short line echoing facts.verdictLabel (no new classification).
- body: 2-3 sentences, Bloomberg-terminal tone, cite metrics from facts.
- citations: array of { claim, sourceIndex } where sourceIndex is an integer index into facts.sources.`;

function parseStructuredOutput(raw: string): GeminiStructuredOutput | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as GeminiStructuredOutput;
    if (
      typeof parsed.headline === "string" &&
      typeof parsed.body === "string" &&
      Array.isArray(parsed.citations)
    ) {
      return parsed;
    }
  } catch {
    /* invalid JSON */
  }
  return null;
}

function validateCitations(
  output: GeminiStructuredOutput,
  facts: GeminiFacts
): boolean {
  if (!output.citations.length) return output.body.length > 20;
  return output.citations.every(
    (c) =>
      typeof c.sourceIndex === "number" &&
      c.sourceIndex >= 0 &&
      c.sourceIndex < facts.sources.length &&
      typeof c.claim === "string" &&
      c.claim.length > 0
  );
}

function allowedUrlSet(facts: GeminiFacts): Set<string> {
  const urls = new Set<string>();
  for (const s of facts.sources) {
    if (s.url) urls.add(s.url);
  }
  return urls;
}

/** Remove URLs in prose that were not present in facts */
export function stripUnknownUrls(text: string, allowed: Set<string>): string {
  const urlRegex = /https?:\/\/[^\s)\]"']+/gi;
  return text
    .replace(urlRegex, (match) => (allowed.has(match) ? match : ""))
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatGroundedProse(
  output: GeminiStructuredOutput,
  facts: GeminiFacts
): string {
  const allowed = allowedUrlSet(facts);
  const headline = stripUnknownUrls(output.headline, allowed);
  const body = stripUnknownUrls(output.body, allowed);
  const citeLines = output.citations
    .slice(0, 4)
    .map((c) => {
      const src = facts.sources[c.sourceIndex];
      const tag = src?.sourceId?.toUpperCase() ?? `S${c.sourceIndex}`;
      return `[${tag}] ${c.claim}`;
    })
    .join(" · ");

  const parts = [headline, body];
  if (citeLines) parts.push(`Sources: ${citeLines}`);
  return parts.filter(Boolean).join("\n\n");
}

export function ruleBasedNarrative(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict,
  weightedDelta: WeightedDelta
): NarrativeSynthesis {
  return {
    prose: buildForensicExplanation(query, results, verdict, weightedDelta),
    mode: "rule-based",
  };
}

/**
 * Gemini narrates only — verdict math is already computed in discrepancy.ts.
 * Returns rule-based fallback on missing key, API error, or validation failure.
 */
export async function synthesizeNarrative(
  facts: GeminiFacts,
  results: SourceResult[],
  verdict: AxiomVerdict,
  weightedDelta: WeightedDelta
): Promise<NarrativeSynthesis> {
  const fallback = () =>
    ruleBasedNarrative(facts.query, results, verdict, weightedDelta);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback();

  const userPayload = JSON.stringify(facts, null, 0);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              parts: [
                {
                  text: `facts JSON:\n${userPayload}\n\nRespond with JSON: { "headline": string, "body": string, "citations": [{ "claim": string, "sourceIndex": number }] }`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 420,
            temperature: 0.15,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!res.ok) return fallback();

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return fallback();

    const structured = parseStructuredOutput(raw);
    if (!structured || !validateCitations(structured, facts)) return fallback();

    const prose = formatGroundedProse(structured, facts);
    if (prose.length < 40) return fallback();

    return {
      prose,
      mode: "ai-grounded",
      headline: structured.headline,
    };
  } catch {
    return fallback();
  }
}

/** @deprecated Use synthesizeNarrative */
export async function synthesizeWithGemini(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict
): Promise<string | null> {
  const { calculateWeightedDelta } = await import("@/lib/discrepancy");
  const weightedDelta = calculateWeightedDelta(results);
  const facts = buildGeminiFacts(query, results, verdict, weightedDelta);
  const out = await synthesizeNarrative(facts, results, verdict, weightedDelta);
  return out.mode === "ai-grounded" ? out.prose : null;
}
