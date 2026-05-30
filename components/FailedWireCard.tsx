"use client";

import type { WireCard } from "@/app/page";

interface Props {
  card: WireCard;
  index: number;
  accent?: "green" | "amber";
  onRetry?: () => void;
}

export function FailedWireCard({ card, index, onRetry }: Props) {
  return (
    <article
      className="failed-card card-arrive"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="t-label text-[#00ff41]">
          [{card.wireId.toUpperCase()}]
        </span>
        <span className="badge badge-failed">FAILED</span>
      </div>
      {card.label && (
        <p className="mb-1 text-[9px] tracking-wider text-[#444]">{card.label}</p>
      )}
      <p className="text-[11px] text-[#ff6666] leading-relaxed">
        {card.errorMessage ?? "Wire fault isolated"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 border border-[#ff3333]/40 px-2 py-1 text-[9px] tracking-wider text-[#ff6666] hover:bg-[#ff3333]/10 transition-colors"
        >
          ↺ RETRY SCAN
        </button>
      )}
    </article>
  );
}
