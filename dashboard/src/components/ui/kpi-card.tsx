import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down";
  active?: boolean;
  onClick?: () => void;
}

export function KpiCard({ title, value, delta, trend, active, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-[var(--card)] p-4 transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--muted)]",
        active
          ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
          : "border-[var(--border)]",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
        {title}
      </p>
      <p className="text-2xl font-semibold font-mono tabular-nums">{value}</p>
      {delta && (
        <p
          className={cn(
            "flex items-center gap-1 text-xs mt-1",
            trend === "up" && "text-[var(--color-success)]",
            trend === "down" && "text-[var(--color-danger)]",
            !trend && "text-[var(--muted-foreground)]",
          )}
        >
          {trend === "up" && <TrendingUp size={12} />}
          {trend === "down" && <TrendingDown size={12} />}
          {delta}
        </p>
      )}
    </div>
  );
}
