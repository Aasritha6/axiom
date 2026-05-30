"use client";

import { SourceCard } from "@/components/SourceCard";
import type { WireCard } from "@/app/page";

interface Props {
  cards: WireCard[];
  isStreaming: boolean;
}

export function RealityPanel({ cards, isStreaming }: Props) {
  return (
    <section className="flex h-full min-h-[400px] flex-col border-l border-[#333] lg:min-h-0">
      <header className="border-b border-[#333] px-3 py-2">
        <h2 className="text-xs font-bold tracking-widest text-[#ffb000]">
          🌍 GROUND REALITY ATOMIZER
        </h2>
        <p className="text-[9px] text-[#555]">
          RIGHT BRAIN · Finance · Amazon · GitHub · Hiring
        </p>
      </header>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {cards.length === 0 && !isStreaming && (
          <p className="text-[10px] text-[#444]">
            Awaiting query — reality wires idle
          </p>
        )}
        {isStreaming && cards.length === 0 && (
          <p className="pulse-live text-[10px] text-[#ffb000]">
            ░ Atomizing finance · reviews · jobs data…
          </p>
        )}
        {cards.map((card, i) => (
          <SourceCard key={`${card.wireId}-${i}`} card={card} index={i} accent="amber" />
        ))}
      </div>
    </section>
  );
}
