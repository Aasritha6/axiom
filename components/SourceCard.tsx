"use client";

import type { WireCard } from "@/app/page";
import { FailedWireCard } from "@/components/FailedWireCard";
import { primaryEvidenceUrl } from "@/lib/evidence";

const SIGNAL_ICON: Record<string, string> = {
  BULLISH: "↑",
  BEARISH: "↓",
  NEUTRAL: "→",
};

const SIGNAL_CLASS: Record<string, string> = {
  BULLISH: "signal-bullish",
  BEARISH: "signal-bearish",
  NEUTRAL: "signal-neutral",
};

interface Props {
  card: WireCard;
  index: number;
  accent?: "green" | "amber";
  onRetry?: () => void;
  searchQuery?: string;
}

function SourceBadge({ card }: { card: WireCard }) {
  if (card.failed) return null;
  if (card.fromWireCache)
    return <span className="badge badge-fallback">WIRE CACHE</span>;
  if (card.isFallback)
    return <span className="badge badge-fallback">FALLBACK</span>;
  if (card.isLive)
    return <span className="badge badge-live pulse-live">LIVE</span>;
  return <span className="badge badge-cached">CACHED</span>;
}

export function SourceCard({
  card,
  index,
  accent = "green",
  onRetry,
  searchQuery = "",
}: Props) {
  if (card.failed) {
    return (
      <FailedWireCard
        card={card}
        index={index}
        accent={accent}
        onRetry={onRetry}
      />
    );
  }

  const isAmber = accent === "amber";
  const cardClass = isAmber
    ? "wire-card wire-card-amber card-arrive"
    : "wire-card card-arrive";
  const labelClass = isAmber
    ? "t-label text-[#ffb000]"
    : "t-label text-[#00ff41]";

  const sourceUrl = primaryEvidenceUrl(
    card.wireId,
    searchQuery,
    card.evidenceLinks
  );

  return (
    <article
      className={cardClass}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={labelClass}>[{card.wireId.toUpperCase()}]</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${SIGNAL_CLASS[card.signal ?? "NEUTRAL"]}`}>
            {SIGNAL_ICON[card.signal ?? "NEUTRAL"]} {card.signal ?? "NEUTRAL"}
          </span>
          <SourceBadge card={card} />
        </div>
      </div>

      {card.label && (
        <p className="mb-1.5 text-[9px] tracking-wider text-[#444]">
          {card.label}
        </p>
      )}

      <p className="t-summary mb-2.5">{card.summary}</p>

      <div className="space-y-0.5 border-t border-[#1a1a1a] pt-2">
        {card.metrics.map((row) => (
          <div key={row.label} className="metric-row">
            <span className="t-metric-label">{row.label}</span>
            <span className="t-metric-value">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-[#1a1a1a] pt-2">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="t-evidence inline-flex items-center gap-1"
        >
          View source →
        </a>
      </div>
    </article>
  );
}
