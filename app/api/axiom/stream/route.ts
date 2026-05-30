import { NextRequest } from "next/server";
import { resolveSourceWithFallback } from "@/lib/anakin";
import {
  calculateVerdict,
  calculateWeightedDelta,
  type SourceResult,
} from "@/lib/discrepancy";
import { extractForSource } from "@/lib/extractors";
import { WIRE_SOURCES, MIN_SOURCES_PER_HEMISPHERE } from "@/lib/config/sources";
import { findDemoIdByQuery, getDemoPayload } from "@/lib/demo-data";
import { synthesizeWithGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

function sseEncode(encoder: TextEncoder, event: string, data: object) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const forceLive = searchParams.get("live") === "1";
  const demoId = searchParams.get("demo") ?? findDemoIdByQuery(query);

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

        // Cached demo path — unless user explicitly forces live
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
              });
            }

            send("final_verdict", {
              ...demo.verdict,
              weightedDelta: demo.weightedDelta,
              isCached: true,
            });
            controller.close();
            return;
          }
        }

        const results: SourceResult[] = [];

        const tasks = WIRE_SOURCES.map(async (wire) => {
          try {
            const params = wire.buildParams(query);
            const { data, isLive, isFallback } = await resolveSourceWithFallback(
              wire.actionId,
              params,
              query,
              wire.fallback,
              (msg) => send("status", { message: `[${wire.slug.toUpperCase()}] ${msg}` })
            );

            const extracted = extractForSource(wire.slug, data);

            const result: SourceResult = {
              sourceId: wire.slug,
              category: wire.category,
              signal: extracted.signal,
              sentiment: extracted.sentiment,
              metrics: extracted.metrics.rows,
              volume: extracted.metrics.volume,
              summary: extracted.summary,
              isLive,
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
              isLive: isLive && !isFallback,
              isFallback,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            send("status", {
              message: `⚠️ [${wire.slug.toUpperCase()}] Fault isolated: ${message}`,
            });
            send("wire_failed", { wireId: wire.slug, message });
          }
        });

        await Promise.allSettled(tasks);

        const verdict = calculateVerdict(results, MIN_SOURCES_PER_HEMISPHERE);
        const weightedDelta = calculateWeightedDelta(results);

        const aiExplanation = await synthesizeWithGemini(query, results, verdict);

        send("final_verdict", {
          ...verdict,
          weightedDelta,
          isCached: false,
          aiExplanation,
        });
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
