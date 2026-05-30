"use client";

import type { WireCard } from "@/app/page";

interface Props {
  card: WireCard;
  index: number;
  accent?: "green" | "amber";
  onRetry?: () => void;
}

export function FailedWireCard({ card, index, accent = "green", onRetry }: Props) {
  const borderColor = accent === "amber" ? "border-[#ff3333]/50" : "border-[#ff3333]/50";
  const labelColor = accent === "amber" ? "text-[#ffb000]" : "text-[#00ff41]";

  return (
    <article
      className={`card-arrive border ${borderColor} bg-[#1a0505] p-2`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold tracking-wider ${labelColor}`}>
          [{card.wireId.toUpperCase()}]
        </span>
        <span className="rounded border border-[#ff3333]/60 bg-[#ff3333]/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-[#ff3333]">
          FAILED
        </span>
      </div>
      {card.label && (
        <p className="mb-1 text-[8px] text-[#444]">{card.label}</p>
      )}
      <p className="mb-2 text-[10px] text-[#ff6666]">
        {card.errorMessage ?? "Wire fault isolated"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border border-[#ff3333]/40 px-2 py-0.5 text-[8px] text-[#ff6666] hover:bg-[#ff3333]/10"
        >
          RETRY SCAN
        </button>
      )}
    </article>
  );
}
