import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "../lib/utils";
import {
  fetchAttentionItems,
  fetchAttentionStats,
  resolveAttentionItem,
  type AttentionItem,
  type AttentionType,
  type AttentionPriority,
} from "../lib/hub-api";
import { reviewItems } from "../lib/mock-data";

const typeIcon: Record<AttentionType, string> = {
  "wet-lab-request": "⚗️",
  "human-input": "❓",
  "review": "📄",
  "budget-exceeded": "💰",
  "judge-divergence": "⚠",
  "approval": "✓",
  "expert-consultation": "🔬",
};

const borderByPriority: Record<AttentionPriority, string> = {
  critical: "border-l-[var(--color-danger)]",
  high: "border-l-[var(--color-warning)]",
  medium: "border-l-[var(--color-accent)]",
  low: "border-l-[var(--border)]",
};

const borderByType: Record<AttentionType, string> = {
  "wet-lab-request": "border-l-[var(--color-accent)]",
  "human-input": "border-l-[var(--color-warning)]",
  "review": "border-l-[var(--color-accent)]",
  "budget-exceeded": "border-l-[var(--color-danger)]",
  "judge-divergence": "border-l-[var(--color-danger)]",
  "approval": "border-l-[var(--color-warning)]",
  "expert-consultation": "border-l-[var(--color-success)]",
};

function useAttentionData() {
  const itemsQuery = useQuery({
    queryKey: ["attention-items"],
    queryFn: () => fetchAttentionItems({ status: "pending" }),
    retry: false,
    refetchInterval: 10_000,
  });

  const statsQuery = useQuery({
    queryKey: ["attention-stats"],
    queryFn: fetchAttentionStats,
    retry: false,
    refetchInterval: 10_000,
  });

  // Fall back to mock data if hub is unavailable
  const liveItems = itemsQuery.data?.items;
  const useMock = !liveItems;

  const mockItems: AttentionItem[] = reviewItems.map((r) => ({
    id: r.id,
    type: r.type === "judge-divergence" ? "judge-divergence"
      : r.type === "extraction-conflict" ? "review"
      : r.type === "embargo-expiry" ? "approval"
      : r.type === "rendering-draft" ? "review"
      : "human-input",
    priority: r.type === "judge-divergence" ? "high" : "medium",
    status: "pending",
    project_id: r.project,
    title: r.title,
    description: r.detail,
    requested_action: r.actions[0] ?? "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    _mockActions: r.actions,
  } as AttentionItem & { _mockActions?: string[] }));

  return {
    items: liveItems ?? mockItems,
    count: statsQuery.data?.pending ?? (useMock ? mockItems.length : 0),
    isLive: !useMock,
  };
}

export function AlertDrawer() {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { items, count } = useAttentionData();

  const pending = items.filter((item) => !resolved.has(item.id));
  const displayCount = count - resolved.size;

  async function handleResolve(item: AttentionItem, action: string) {
    setResolved((prev) => new Set(prev).add(item.id));
    try {
      await resolveAttentionItem(item.id, { action });
      queryClient.invalidateQueries({ queryKey: ["attention-items"] });
      queryClient.invalidateQueries({ queryKey: ["attention-stats"] });
    } catch {
      // Best effort — item is already visually resolved
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        title="Attention items"
      >
        <Bell size={16} />
        {displayCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[var(--color-danger)] text-white text-[9px] font-bold px-1">
            {displayCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md border-l border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border)] shrink-0">
                <div>
                  <h2 className="text-sm font-semibold">Attention</h2>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {pending.length} pending{resolved.size > 0 && ` · ${resolved.size} resolved`}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {pending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-[var(--muted-foreground)]">
                    <p className="text-sm">All clear</p>
                    <p className="text-xs mt-1">Nothing needs your attention right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2 px-3">
                    {pending.map((item) => (
                      <AttentionCard key={item.id} item={item} onResolve={handleResolve} />
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function AttentionCard({ item, onResolve }: { item: AttentionItem; onResolve: (item: AttentionItem, action: string) => void }) {
  const age = getAge(item.created_at);
  const border = item.priority === "critical" ? borderByPriority.critical : borderByType[item.type] ?? borderByPriority.medium;

  // Determine action buttons based on type
  const actions = getActions(item);

  return (
    <div className={cn("rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 border-l-[3px]", border)}>
      {/* Meta */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] mb-1.5">
        <span>{typeIcon[item.type]}</span>
        <span className="font-medium uppercase tracking-wider">{item.type.replace(/-/g, " ")}</span>
        <span>·</span>
        <span className={cn("px-1 py-0.5 rounded text-[10px]",
          item.priority === "critical" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
          item.priority === "high" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
        )}>{item.priority}</span>
        <span>·</span>
        <span>{age}</span>
        {item.project_id && (
          <>
            <span>·</span>
            <span className="font-mono">{item.project_id}</span>
          </>
        )}
      </div>

      {/* Title + description */}
      <p className="text-[13px] font-medium leading-snug mb-1">{item.title}</p>
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-1">{item.description}</p>

      {/* Requested action */}
      {item.requested_action && (
        <p className="text-xs text-[var(--foreground)] mb-3 italic">{item.requested_action}</p>
      )}

      {/* Wet-lab spec */}
      {item.assay_spec && (
        <div className="text-xs mb-3 p-2 rounded bg-[var(--muted)] space-y-1">
          <p><span className="text-[var(--muted-foreground)]">Assay:</span> {item.assay_spec.assay_type}</p>
          <p><span className="text-[var(--muted-foreground)]">Targets:</span> {item.assay_spec.targets.join(", ")}</p>
          <p><span className="text-[var(--muted-foreground)]">Partners:</span> {item.assay_spec.partner_ids.join(", ")}</p>
          <p><span className="text-[var(--muted-foreground)]">Est. cost:</span> <span className="font-mono">${item.assay_spec.estimated_cost_usd.toLocaleString()}</span></p>
          <p><span className="text-[var(--muted-foreground)]">Turnaround:</span> {item.assay_spec.estimated_turnaround_days} days</p>
        </div>
      )}

      {/* Blocking info */}
      {item.blocking_task_id && (
        <p className="text-[10px] text-[var(--muted-foreground)] mb-2">
          Blocking task: <span className="font-mono">{item.blocking_task_id}</span>
          {item.run_id && <> · run: <span className="font-mono">{item.run_id.slice(0, 20)}</span></>}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {actions.map((action, i) => (
          <button
            key={action}
            onClick={() => onResolve(item, action)}
            className={cn(
              "text-[11px] px-3 py-1.5 rounded-md transition-colors",
              i === 0
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                : "border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]",
            )}
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

function getActions(item: AttentionItem): string[] {
  // Use mock actions if available
  const mock = (item as unknown as Record<string, unknown>)._mockActions as string[] | undefined;
  if (mock) return mock;

  switch (item.type) {
    case "wet-lab-request": return ["Approve & send", "Modify spec", "Reject"];
    case "judge-divergence": return ["Pick winner", "Add 4th judge", "Skip match"];
    case "review": return ["Approve", "Request revision", "Reject"];
    case "budget-exceeded": return ["Authorize +$100", "Authorize +$500", "Pause project"];
    case "approval": return ["Approve", "Deny"];
    case "human-input": return ["Respond", "Defer"];
    case "expert-consultation": return ["View material", "Send reminder", "Reassign", "Cancel"];
    default: return ["Acknowledge"];
  }
}

function getAge(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
