import { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";
import { useRealtime } from "../lib/realtime";
import { useAuth } from "../lib/auth";

const dotColor = {
  connected: "bg-[var(--color-success)]",
  connecting: "bg-[var(--color-warning)] animate-pulse",
  disconnected: "bg-[var(--color-danger)]",
};

export function ConnectionStatus() {
  const { status, statusCode, statusMessage } = useRealtime();
  const { login } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowTooltip(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showTooltip]);

  // Don't show anything when connected — just a green dot
  if (status === "connected") {
    return (
      <div title="Connected to hub.plyknot.com" className="flex items-center justify-center w-8 h-8">
        <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setShowTooltip((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <div className={cn("w-2 h-2 rounded-full shrink-0", dotColor[status])} />
        <span className="hidden sm:inline">
          {status === "connecting" ? "Connecting…" : statusCode ? `${statusCode}` : "Offline"}
        </span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl p-3 z-50">
          <p className="text-xs font-medium mb-1">
            {status === "connecting" ? "Connecting to hub.plyknot.com…" : "Not connected"}
          </p>
          {statusMessage && (
            <p className="text-xs text-[var(--muted-foreground)] mb-2">{statusMessage}</p>
          )}
          {(statusCode === 401 || statusCode === 403 || !localStorage.getItem("plyknot-hub-token")) && (
            <button
              onClick={login}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Sign in to hub.plyknot.com →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
