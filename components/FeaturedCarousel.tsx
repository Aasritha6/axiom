"use client";

import type { DemoQuery } from "@/lib/demo-data";

interface Props {
  queries: DemoQuery[];
  onSelectCached: (demoId: string, label: string) => void;
  onSelectLive: (demoId: string, label: string) => void;
  disabled?: boolean;
}

export function FeaturedCarousel({
  queries,
  onSelectCached,
  onSelectLive,
  disabled,
}: Props) {
  return (
    <div className="mt-3 border-t border-[#222] pt-3">
      <p className="mb-2 text-[10px] tracking-widest text-[#ffb000]">
        ▶ FEATURED QUERIES — CURATED DEMO MATRICES
      </p>
      <div className="flex flex-wrap gap-2">
        {queries.map((q) => (
          <div
            key={q.id}
            className="group border border-[#333] bg-[#0a0a0a] px-3 py-2 transition-colors hover:border-[#444]"
          >
            <span className="block text-xs font-bold text-[#ffb000] group-hover:text-[#ffd060]">
              {q.label}
            </span>
            <span className="block text-[9px] text-[#555]">{q.tagline}</span>
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectCached(q.id, q.label)}
                className="border border-[#2a2a2a] bg-[#111] px-2 py-0.5 text-[8px] tracking-wider text-[#666] hover:border-[#555] hover:text-[#999] disabled:opacity-40"
                title="Instant curated matrix — no Wire API calls"
              >
                📦 CACHED
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectLive(q.id, q.label)}
                className="border border-[#00ff41] bg-[#00ff41]/15 px-2 py-0.5 text-[8px] font-bold tracking-wider text-[#00ff41] hover:bg-[#00ff41]/25 disabled:opacity-40"
                title="Full Wire pipeline + Gemini narrative"
              >
                ⚡ RUN LIVE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
