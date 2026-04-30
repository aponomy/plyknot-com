import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { KpiCard } from "../../components/ui/kpi-card";
import { PRODUCTS, type Product } from "./products-data";

type StatusFilter = "all" | "active" | "pipeline" | "idea";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  pipeline: "bg-[var(--primary)]/10 text-[var(--primary)]",
  idea: "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  pipeline: "Pipeline",
  idea: "Gap / Ideas",
};

export function ProductsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: PRODUCTS.length,
    active: PRODUCTS.filter((p) => p.status === "active").length,
    pipeline: PRODUCTS.filter((p) => p.status === "pipeline").length,
    idea: PRODUCTS.filter((p) => p.status === "idea").length,
  }), []);

  const filtered = useMemo(
    () => filter === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.status === filter),
    [filter],
  );

  const active = PRODUCTS.find((p) => p.id === selected);

  return (
    <div className="flex gap-0 overflow-hidden -m-6" style={{ height: "calc(100vh - 96px)" }}>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-lg font-semibold mb-4">Products</h1>

        {/* Filter boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {(["all", "active", "pipeline", "idea"] as const).map((f) => (
            <KpiCard
              key={f}
              title={FILTER_LABELS[f]}
              value={counts[f]}
              active={filter === f}
              onClick={() => setFilter(filter === f ? "all" : f)}
            />
          ))}
        </div>

        {/* Product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(selected === p.id ? null : p.id)}
              className={cn(
                "text-left rounded-xl border p-3 transition-colors",
                selected === p.id
                  ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
                  : "border-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold truncate">{p.name}</p>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1", STATUS_STYLE[p.status])}>
                  {p.status === "idea" ? "Gap" : p.status}
                </span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 leading-tight">{p.summary}</p>
              <div className="flex gap-3 mt-2 text-[10px] text-[var(--muted-foreground)]">
                <span>ARR <strong className="text-[var(--foreground)]">{p.arr}</strong></span>
                <span>Users <strong className="text-[var(--foreground)]">{p.users}</strong></span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right-side detail panel (same width as Agent panel) */}
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
            <ProductDetail product={active} />
          </div>
        </aside>
      )}
    </div>
  );
}

function ProductDetail({ product: p }: { product: Product }) {
  return (
    <>
      {p.status === "idea" && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[color:var(--color-danger)]/5 border border-[color:var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
          Gap product &mdash; fills market coverage gap
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", STATUS_STYLE[p.status])}>
          {p.status === "idea" ? "Gap / Idea" : p.status}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className="text-base font-semibold font-mono">{p.arr}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">ARR</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className="text-base font-semibold font-mono">{p.users}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">Users</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
          <p className="text-[10px] font-medium leading-tight">{p.stage}</p>
          <p className="text-[9px] text-[var(--muted-foreground)]">Stage</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Description</p>
        <p className="text-xs leading-relaxed">{p.detail}</p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Target Markets</p>
        <div className="flex flex-wrap gap-1">
          {p.markets.map((m) => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">{m}</span>
          ))}
        </div>
      </div>
    </>
  );
}
