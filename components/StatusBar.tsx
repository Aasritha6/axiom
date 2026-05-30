"use client";

interface Props {
  logs: string[];
  isStreaming: boolean;
  error: string | null;
  activeQuery: string | null;
}

export function StatusBar({ logs, isStreaming, error, activeQuery }: Props) {
  const latest = logs[logs.length - 1];

  return (
    <footer className="border-t border-[#333] px-4 py-2">
      <div className="flex items-center gap-3 text-[9px]">
        <span className={isStreaming ? "pulse-live text-[#00ff41]" : "text-[#444]"}>
          {isStreaming ? "● LIVE" : "○ IDLE"}
        </span>
        {activeQuery && (
          <span className="text-[#666]">
            TARGET: <span className="text-[#aaa]">{activeQuery}</span>
          </span>
        )}
        {error && <span className="text-[#ff3333]">ERR: {error}</span>}
        {latest && !error && (
          <span className="truncate text-[#555]">{latest}</span>
        )}
      </div>
    </footer>
  );
}
