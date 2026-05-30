"use client";

interface Props {
  delta: number;
}

const MIN = -2;
const MAX = 2;

function deltaColor(delta: number): string {
  if (delta > 0.5) return "#ff3333";
  if (delta < -0.5) return "#00ff41";
  return "#ffb000";
}

export function DeltaSigmaGauge({ delta }: Props) {
  const clamped = Math.max(MIN, Math.min(MAX, delta));
  const pct = ((clamped - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="mb-4 w-full">
      <p className="mb-2 text-[9px] tracking-widest text-[#555]">Δ-SIGMA GAUGE</p>

      <div className="relative mx-1 mb-1 h-8">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#333]" />
        {/* Hype zone */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#ff3333]/40 to-[#ff3333]/60"
          style={{ left: "50%", right: 0 }}
        />
        {/* Reality zone */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-gradient-to-l from-transparent via-[#00ff41]/40 to-[#00ff41]/60"
          style={{ left: 0, right: "50%" }}
        />

        {/* Center line */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#555]" />

        {/* Glowing dot */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
          style={{ left: `${pct}%` }}
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: deltaColor(delta),
              boxShadow: `0 0 12px 3px ${deltaColor(delta)}`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[8px] text-[#555]">
        <span className="text-[#00ff41]">−2 REALITY</span>
        <span>0</span>
        <span className="text-[#ff3333]">+2 HYPE</span>
      </div>

      <p
        className="mt-2 text-center text-lg font-bold tabular-nums"
        style={{ color: deltaColor(delta), textShadow: `0 0 20px ${deltaColor(delta)}40` }}
      >
        {delta > 0 ? "+" : ""}
        {delta.toFixed(2)}
      </p>
    </div>
  );
}
