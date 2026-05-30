import type { AxiomVerdict, SourceResult } from "@/lib/discrepancy";

/**
 * Gemini synthesis for Bloomberg-style verdict prose.
 * Requires GEMINI_API_KEY in .env.local — get one free at https://aistudio.google.com/apikey
 */
export async function synthesizeWithGemini(
  query: string,
  results: SourceResult[],
  verdict: AxiomVerdict
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const summary = results
    .map(
      (r) =>
        `${r.sourceId} (${r.category}): ${r.signal}, vol=${r.volume}, ${r.summary}`
    )
    .join("\n");

  const prompt = `You are AXIOM, a forensic intelligence terminal comparing promotional narrative vs operational reality for "${query}".

Verdict: ${verdict.verdictLabel} (${verdict.riskLevel})
Signal gap (narrative bullish − reality bullish): ${verdict.signalGap}
Narrative hemisphere: ${verdict.narrative.counts.bullish} bullish, ${verdict.narrative.counts.bearish} bearish, ${verdict.narrative.counts.neutral} neutral
Reality hemisphere: ${verdict.reality.counts.bullish} bullish, ${verdict.reality.counts.bearish} bearish, ${verdict.reality.counts.neutral} neutral

Wire sources:
${summary}

Write 2-3 sentences in Bloomberg-terminal tone: concrete, no fluff. Quantify the narrative-vs-reality gap where possible (market cap, revenue, user sentiment, hiring, product traction).

End with exactly this line format:
ESTIMATED RISK EXPOSURE: [specific dollar, rupee, or % figure — even a rough order-of-magnitude estimate]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 280, temperature: 0.25 },
        }),
      }
    );

    if (!res.ok) return null;

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
