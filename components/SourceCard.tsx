"use client";

import type { WireCard } from "@/app/page";
import { FailedWireCard } from "@/components/FailedWireCard";

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
  onRetry?: () => void;
}

function SourceBadge({ card }: { card: WireCard }) {
  if (card.failed) return null;
  if (card.fromWireCache) {
    return (
      <span className="rounded border border-[#ffb000]/50 bg-[#ffb000]/10 px-1 py-0.5 text-[8px] font-bold tracking-wider text-[#ffb000]">
        WIRE CACHE
      </span>
    );
  }
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

export function SourceCard({ card, index, accent = "green", onRetry }: Props) {
  if (card.failed) {
    return (
      <FailedWireCard card={card} index={index} accent={accent} onRetry={onRetry} />
    );
  }

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
            className={`text-xs font-bold ${SIGNAL_COLOR[card.signal ?? "NEUTRAL"]}`}
            title={card.signal ?? "NEUTRAL"}
          >
            {SIGNAL_ICON[card.signal ?? "NEUTRAL"]} {card.signal ?? "NEUTRAL"}
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

      {card.evidenceLinks && card.evidenceLinks.length > 0 && (
        <div className="mt-2 space-y-0.5 border-t border-[#222] pt-1">
          {card.evidenceLinks.slice(0, 3).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[8px] text-[#00ff41] underline hover:text-[#ffb000]"
            >
              View source →{" "}
              {(() => {
                try {
                  return new URL(url).hostname;
                } catch {
                  return url.slice(0, 32);
                }
              })()}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
