"use client";

import { SourceCard } from "@/components/SourceCard";
import { WireSkeletonCard } from "@/components/WireSkeletonCard";
import type { WireCard } from "@/app/page";

const SKELETON_LABELS = [
  "Routing news wire…",
  "Scanning social…",
  "Indexing related…",
  "Pulling youtube…",
];

interface Props {
  cards: WireCard[];
  isStreaming: boolean;
  onRetry?: () => void;
  searchQuery?: string;
}

export function NarrativePanel({
  cards,
  isStreaming,
  onRetry,
  searchQuery,
}: Props) {
  return (
    <section className="flex h-full min-h-[400px] flex-col border-r border-[#3a3a3a] lg:min-h-0">
      <header className="border-b border-[#3a3a3a] px-3 py-2.5">
        <h2 className="text-sm font-bold tracking-widest text-[#3dff7a]">
          📢 NARRATIVE MATRIX
        </h2>
        <p className="text-xs text-[#9a9a9a]">
          LEFT BRAIN · Google News · Social · Related
        </p>
      </header>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {cards.length === 0 && !isStreaming && (
          <p className="text-sm text-[#7a7a7a]">
            Awaiting query — narrative wires idle
          </p>
        )}
        {isStreaming && cards.length < SKELETON_LABELS.length &&
          SKELETON_LABELS.slice(cards.length).map((label) => (
            <WireSkeletonCard key={label} label={label} accent="green" />
          ))}
        {cards.map((card, i) => (
          <SourceCard
            key={`${card.wireId}-${i}`}
            card={card}
            index={i}
            searchQuery={searchQuery}
            onRetry={card.failed ? onRetry : undefined}
          />
        ))}
      </div>
    </section>
  );
}
