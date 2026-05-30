import { NextRequest } from "next/server";
import { resolveSourceWithFallback } from "@/lib/anakin";
import {
  calculateVerdict,
  calculateWeightedDelta,
  enrichVerdictExplanation,
  type SourceResult,
} from "@/lib/discrepancy";
import { extractForSource } from "@/lib/extractors";
import { buildFallbackEvidenceUrl } from "@/lib/evidence";
import {
  buildGeminiFacts,
  synthesizeNarrative,
  type WireContext,
} from "@/lib/gemini";
import { WIRE_SOURCES, MIN_SOURCES_PER_HEMISPHERE } from "@/lib/config/sources";
import { findDemoIdByQuery, getDemoPayload } from "@/lib/demo-data";
import { getWireCache, setWireCache } from "@/lib/wire-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function sseEncode(encoder: TextEncoder, event: string, data: object) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const forceLive = searchParams.get("live") === "1";
  const demoIdParam = searchParams.get("demo");
  const demoId = demoIdParam ?? findDemoIdByQuery(query);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(sseEncode(encoder, event, data));
      };

      if (!query) {
        send("error", { message: "Query target is empty." });
        controller.close();
        return;
      }

      try {
        send("status", { message: "⚡ AXIOM: Initializing Split-Brain Routing Matrix…" });

        if (demoId && !forceLive) {
          const demo = getDemoPayload(demoId);
          if (demo) {
            send("status", { message: `📦 Loading curated matrix: ${demoId}` });
            await new Promise((r) => setTimeout(r, 400));

            for (const source of demo.sources) {
              await new Promise((r) => setTimeout(r, 180));
              send("wire_resolved", {
                wireId: source.sourceId,
                category: source.category,
                signal: source.signal,
                sentiment: source.sentiment,
                metrics: source.metrics,
                volume: source.volume,
                summary: source.summary,
                isLive: false,
                evidenceLinks: [buildFallbackEvidenceUrl(source.sourceId, query)],
              });
            }

            const enriched = enrichVerdictExplanation(
              query,
              demo.sources,
              demo.verdict,
              demo.weightedDelta
            );

            send("final_verdict", {
              ...enriched,
              weightedDelta: demo.weightedDelta,
              isCached: true,
              narrativeMode: "rule-based",
              aiExplanation: null,
            });
            send("status", { message: "✓ Scan complete (curated demo)" });
            controller.close();
            return;
          }
        }

        const results: SourceResult[] = [];
        const wireContext: Record<string, WireContext> = {};

        const tasks = WIRE_SOURCES.map(async (wire) => {
          try {
            let data: unknown;
            let isLive = false;
            let isFallback = false;
            let fromWireCache = false;

            if (!forceLive) {
              const cached = getWireCache(query, wire.slug);
              if (cached) {
                data = cached;
                fromWireCache = true;
                send("status", {
                  message: `[${wire.slug.toUpperCase()}] Wire cache hit (2h TTL)`,
                });
              }
            }

            if (!data) {
              const params = wire.buildParams(query);
              const resolved = await resolveSourceWithFallback(
                wire.actionId,
                params,
                query,
                wire.fallback,
                (msg) =>
                  send("status", { message: `[${wire.slug.toUpperCase()}] ${msg}` })
              );
              data = resolved.data;
              isLive = resolved.isLive;
              isFallback = resolved.isFallback;
              if (!forceLive && !isFallback) {
                setWireCache(query, wire.slug, data);
              }
            }

            const extracted = extractForSource(wire.slug, data);
            const evidenceLinks =
              extracted.evidenceLinks?.length
                ? extracted.evidenceLinks
                : [buildFallbackEvidenceUrl(wire.slug, query)];

            wireContext[wire.slug] = {
              evidenceLinks,
              label: wire.label,
            };

            const result: SourceResult = {
              sourceId: wire.slug,
              category: wire.category,
              signal: extracted.signal,
              sentiment: extracted.sentiment,
              metrics: extracted.metrics.rows,
              volume: extracted.metrics.volume,
              summary: extracted.summary,
              isLive: isLive && !isFallback && !fromWireCache,
            };

            results.push(result);

            send("wire_resolved", {
              wireId: wire.slug,
              label: wire.label,
              category: wire.category,
              signal: extracted.signal,
              sentiment: extracted.sentiment,
              metrics: extracted.metrics.rows,
              volume: extracted.metrics.volume,
              summary: extracted.summary,
              isLive: isLive && !isFallback && !fromWireCache,
              isFallback,
              fromWireCache,
              evidenceLinks,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            send("status", {
              message: `⚠️ [${wire.slug.toUpperCase()}] Fault isolated: ${message}`,
            });
            send("wire_failed", {
              wireId: wire.slug,
              label: wire.label,
              category: wire.category,
              message,
            });
          }
        });

        await Promise.allSettled(tasks);

        const weightedDelta = calculateWeightedDelta(results);
        let verdict = calculateVerdict(
          results,
          MIN_SOURCES_PER_HEMISPHERE,
          query
        );
        verdict = enrichVerdictExplanation(query, results, verdict, weightedDelta);

        let aiExplanation: string | null = null;
        let narrativeMode: "ai-grounded" | "rule-based" = "rule-based";

        if (process.env.GEMINI_API_KEY) {
          send("status", { message: "◈ Gemini: synthesizing grounded narrative…" });
          const facts = buildGeminiFacts(
            query,
            results,
            verdict,
            weightedDelta,
            wireContext
          );
          const synthesis = await synthesizeNarrative(
            facts,
            results,
            verdict,
            weightedDelta
          );
          aiExplanation = synthesis.prose;
          narrativeMode = synthesis.mode;
        }

        send("final_verdict", {
          ...verdict,
          weightedDelta,
          isCached: false,
          aiExplanation,
          narrativeMode,
        });
        send("status", { message: "✓ Scan complete" });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream execution panic";
        send("error", { message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
