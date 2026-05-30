"use client";

interface Props {
  accent?: "green" | "amber";
  label: string;
}

export function WireSkeletonCard({ accent = "green", label }: Props) {
  const isAmber = accent === "amber";
  const barClass = isAmber
    ? "bg-[#ffb000]/15 skeleton-shimmer rounded-sm"
    : "bg-[#00ff41]/15 skeleton-shimmer rounded-sm";
  const cardClass = isAmber
    ? "wire-card wire-card-amber"
    : "wire-card";

  return (
    <div className={cardClass} style={{ opacity: 0.7 }}>
      <div className="mb-2 flex justify-between items-center">
        <div className={`h-2.5 w-20 ${barClass}`} />
        <div className={`h-2.5 w-12 ${barClass}`} />
      </div>
      <div className={`mb-2 h-2 w-full ${barClass}`} />
      <div className={`mb-3 h-2 w-3/4 ${barClass}`} />
      <div className="border-t border-[#1a1a1a] pt-2 space-y-1.5">
        <div className={`h-1.5 w-full ${barClass}`} />
        <div className={`h-1.5 w-4/5 ${barClass}`} />
      </div>
      <p className="mt-2 text-[9px] text-[#333] tracking-wider">{label}</p>
    </div>
  );
}
