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
    <div className="mt-3 border-t border-[#2a2a2a] pt-3">
      <p className="mb-2 text-xs tracking-widest text-[#ffc84d]">
        ▶ FEATURED QUERIES
      </p>
      <div className="flex flex-wrap gap-2">
        {queries.map((q) => (
          <div
            key={q.id}
            className="group border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 transition-colors hover:border-[#555]"
          >
            <span className="block text-sm font-bold text-[#ffc84d] group-hover:text-[#ffe08a]">
              {q.label}
            </span>
            <span className="block text-xs text-[#9a9a9a]">{q.tagline}</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectCached(q.id, q.label)}
                className="border border-[#3a3a3a] bg-[#141414] px-2.5 py-1 text-[10px] tracking-wider text-[#b4b4b4] hover:border-[#666] hover:text-[#e8e8e8] disabled:opacity-40"
                title="Instant curated matrix — no Wire API calls"
              >
                📦 CACHED
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectLive(q.id, q.label)}
                className="border border-[#3dff7a] bg-[#3dff7a]/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#3dff7a] hover:bg-[#3dff7a]/25 disabled:opacity-40"
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
