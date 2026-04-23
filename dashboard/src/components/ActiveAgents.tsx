import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchQueueStats } from "../lib/hub-api";

export function ActiveAgents() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["supervisor-queue"],
    queryFn: fetchQueueStats,
    retry: false,
    refetchInterval: 5_000,
  });

  const count = data?.active_runs ?? 0;
  if (count === 0) return null;

  return (
    <button
      onClick={() => navigate("/factory")}
      title={`${count} live run${count !== 1 ? "s" : ""}`}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
    >
      <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
      <span className="font-mono">{count}</span>
      <span className="hidden sm:inline">run{count !== 1 ? "s" : ""}</span>
    </button>
  );
}
