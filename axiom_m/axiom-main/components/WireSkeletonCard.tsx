"use client";

interface Props {
  accent?: "green" | "amber";
  label: string;
}

export function WireSkeletonCard({ accent = "green", label }: Props) {
  const border = accent === "amber" ? "border-[#ffb000]/20" : "border-[#00ff41]/20";
  const bar = accent === "amber" ? "bg-[#ffb000]/20" : "bg-[#00ff41]/20";

  return (
    <div className={`animate-pulse border ${border} bg-[#0a0a0a] p-2`}>
      <div className="mb-2 flex justify-between">
        <div className={`h-2 w-16 rounded ${bar}`} />
        <div className={`h-2 w-10 rounded ${bar}`} />
      </div>
      <div className={`mb-2 h-2 w-full rounded ${bar}`} />
      <div className={`mb-1 h-1.5 w-4/5 rounded ${bar}`} />
      <p className="text-[8px] text-[#444]">{label}</p>
    </div>
  );
}
