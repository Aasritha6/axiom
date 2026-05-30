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
    <footer className="border-t border-[#3a3a3a] px-4 py-2.5">
      <div className="flex items-center gap-3 text-xs">
        <span className={isStreaming ? "pulse-live text-[#3dff7a]" : "text-[#7a7a7a]"}>
          {isStreaming ? "● LIVE" : "○ IDLE"}
        </span>
        {activeQuery && (
          <span className="text-[#9a9a9a]">
            TARGET: <span className="text-[#d4d4d4]">{activeQuery}</span>
          </span>
        )}
        {error && <span className="text-[#ff5c5c]">ERR: {error}</span>}
        {latest && !error && (
          <span className="truncate text-[#b4b4b4]">{latest}</span>
        )}
      </div>
    </footer>
  );
}
