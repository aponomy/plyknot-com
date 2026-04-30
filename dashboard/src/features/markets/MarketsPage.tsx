import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { KpiCard } from "../../components/ui/kpi-card";
import { MARKETS, type Market } from "./markets-data";

type StatusFilter = "all" | "active" | "exploring" | "planned";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  exploring: "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  planned: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  exploring: "Exploring",
  planned: "Planned",
};

export function MarketsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: MARKETS.length,
    active: MARKETS.filter((m) => m.status === "active").length,
    exploring: MARKETS.filter((m) => m.status === "exploring").length,
    planned: MARKETS.filter((m) => m.status === "planned").length,
  }), []);

  const filtered = useMemo(
    () => filter === "all" ? MARKETS : MARKETS.filter((m) => m.status === filter),
    [filter],
  );

  const active = MARKETS.find((m) => m.id === selected);

  return (
    <div className="flex gap-0 overflow-hidden -m-6" style={{ height: "calc(100vh - 96px)" }}>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-lg font-semibold mb-4">Markets</h1>

        {/* Filter boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {(["all", "active", "exploring", "planned"] as const).map((f) => (
            <KpiCard
              key={f}
              title={FILTER_LABELS[f]}
              value={counts[f]}
              active={filter === f}
              onClick={() => setFilter(filter === f ? "all" : f)}
            />
          ))}
        </div>

        {/* Market cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(selected === m.id ? null : m.id)}
              className={cn(
                "text-left rounded-xl border p-3 transition-colors",
                selected === m.id
                  ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
                  : "border-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold truncate">{m.name}</p>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1", STATUS_STYLE[m.status])}>
                  {m.status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 leading-tight">{m.summary}</p>
              <div className="flex gap-3 mt-2 text-[10px] text-[var(--muted-foreground)]">
                <span>{m.size}</span>
                <span>Products: <strong className="text-[var(--foreground)]">{m.products.length}</strong></span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                Mgr: <strong className={m.manager === "Vacant" ? "text-[var(--color-danger)]" : "text-[var(--foreground)]"}>{m.manager}</strong>
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Right-side detail panel */}
      {active && (
        <aside className="w-[630px] shrink-0 border-l border-[var(--border)] bg-[var(--card)] flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)] shrink-0">
            <span className="text-sm font-semibold truncate">{active.name}</span>
            <button
              onClick={() => setSelected(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <MarketDetail market={active} />
          </div>
        </aside>
      )}
    </div>
  );
}

function MarketDetail({ market: m }: { market: Market }) {
  return (
    <>
      <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium inline-block", STATUS_STYLE[m.status])}>
        {m.status}
      </span>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className="text-[10px] font-medium leading-tight">{m.size}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">Size</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className={cn("text-[10px] font-medium", m.manager === "Vacant" && "text-[var(--color-danger)]")}>{m.manager}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">Manager</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className="text-base font-semibold font-mono">{m.products.length}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">Products</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Strategy</p>
        <p className="text-xs leading-relaxed">{m.strategy}</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Products</p>
        <div className="flex flex-wrap gap-1">
          {m.products.map((p) => (
            <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{p}</span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Next Actions</p>
        <ul className="space-y-1">
          {m.actions.map((a, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              <span className="text-[var(--muted-foreground)] mt-px shrink-0">&#9744;</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
