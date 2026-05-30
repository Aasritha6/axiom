"use client";

import type { WireCard } from "@/app/page";

const SIGNAL_ICON: Record<string, string> = {
  BULLISH: "↑",
  BEARISH: "↓",
  NEUTRAL: "→",
};

const SIGNAL_COLOR: Record<string, string> = {
  BULLISH: "text-[#00ff41]",
  BEARISH: "text-[#ff3333]",
  NEUTRAL: "text-[#666]",
};

interface Props {
  card: WireCard;
  index: number;
  accent?: "green" | "amber";
}

function SourceBadge({ card }: { card: WireCard }) {
  if (card.isFallback) {
    return (
      <span className="rounded border border-[#ffb000]/50 bg-[#ffb000]/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-[#ffb000]">
        FALLBACK
      </span>
    );
  }
  if (card.isLive) {
    return (
      <span className="pulse-live rounded border border-[#00ff41]/50 bg-[#00ff41]/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-[#00ff41]">
        LIVE
      </span>
    );
  }
  return (
    <span className="rounded border border-[#666]/50 bg-[#111] px-1 py-0.5 text-[8px] font-bold tracking-wider text-[#888]">
      CACHED
    </span>
  );
}

export function SourceCard({ card, index, accent = "green" }: Props) {
  const borderAccent =
    accent === "amber" ? "border-[#ffb000]/30" : "border-[#00ff41]/30";
  const labelColor = accent === "amber" ? "text-[#ffb000]" : "text-[#00ff41]";

  return (
    <article
      className={`card-arrive border ${borderAccent} bg-[#0a0a0a] p-2`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold tracking-wider ${labelColor}`}>
          [{card.wireId.toUpperCase()}]
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-bold ${SIGNAL_COLOR[card.signal]}`}
            title={card.signal}
          >
            {SIGNAL_ICON[card.signal]} {card.signal}
          </span>
          <SourceBadge card={card} />
        </div>
      </div>

      {card.label && (
        <p className="mb-1 text-[8px] text-[#444]">{card.label}</p>
      )}

      <p className="mb-2 text-[10px] text-[#888]">{card.summary}</p>

      <div className="space-y-0.5 border-t border-[#222] pt-1">
        {card.metrics.map((row) => (
          <div key={row.label} className="flex justify-between text-[9px]">
            <span className="text-[#555]">{row.label}</span>
            <span className="text-[#aaa]">{row.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
