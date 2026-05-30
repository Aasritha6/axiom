"use client";

import type { DemoQuery } from "@/lib/demo-data";

interface Props {
  queries: DemoQuery[];
  onSelect: (demoId: string, label: string) => void;
  disabled?: boolean;
}

export function FeaturedCarousel({ queries, onSelect, disabled }: Props) {
  return (
    <div className="mt-3 border-t border-[#222] pt-3">
      <p className="mb-2 text-[10px] tracking-widest text-[#ffb000]">
        ▶ FEATURED QUERIES — CURATED DEMO MATRICES
      </p>
      <div className="flex flex-wrap gap-2">
        {queries.map((q) => (
          <button
            key={q.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q.id, q.label)}
            className="group border border-[#333] px-3 py-2 text-left transition-colors hover:border-[#ffb000] disabled:opacity-40"
          >
            <span className="block text-xs font-bold text-[#ffb000] group-hover:text-[#ffd060]">
              {q.label}
            </span>
            <span className="block text-[9px] text-[#555]">{q.tagline}</span>
            <span className="mt-1 block text-[8px] text-[#444]">📦 cached</span>
          </button>
        ))}
      </div>
    </div>
  );
}
