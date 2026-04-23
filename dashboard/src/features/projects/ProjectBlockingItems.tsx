import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import {
  fetchAttentionItems,
  resolveAttentionItem,
  type AttentionItem,
  type AttentionType,
} from "../../lib/hub-api";

const typeIcon: Record<AttentionType, string> = {
  "wet-lab-request": "⚗️",
  "human-input": "❓",
  "review": "📄",
  "budget-exceeded": "💰",
  "judge-divergence": "⚠",
  "approval": "✓",
  "expert-consultation": "🔬",
};

const actions: Record<AttentionType, string[]> = {
  "wet-lab-request": ["Approve & send", "Reject"],
  "judge-divergence": ["Pick winner", "Add 4th judge"],
  "review": ["Approve", "Reject"],
  "budget-exceeded": ["Authorize", "Pause"],
  "approval": ["Approve", "Deny"],
  "expert-consultation": ["Send to expert", "Reassign", "Cancel"],
  "human-input": ["Respond"],
};

export function ProjectBlockingItems({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["attention-items", projectId],
    queryFn: () => fetchAttentionItems({ project_id: projectId, status: "pending" }),
    retry: false,
    refetchInterval: 15_000,
  });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  async function handleResolve(item: AttentionItem, action: string) {
    try {
      await resolveAttentionItem(item.id, { action });
      queryClient.invalidateQueries({ queryKey: ["attention-items"] });
      queryClient.invalidateQueries({ queryKey: ["attention-stats"] });
    } catch {
      // best effort
    }
  }

  return (
    <Card className="border-l-[3px] border-l-[var(--color-warning)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">⚠</span>
        <span className="text-xs font-medium">{items.length} item{items.length > 1 ? "s" : ""} blocking this project</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => {
          const age = getAge(item.created_at);
          return (
            <div key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--muted-foreground)]">
                <span>{typeIcon[item.type]}</span>
                <span className="uppercase tracking-wider font-medium">{item.type.replace(/-/g, " ")}</span>
                <span className={cn("px-1 py-0.5 rounded text-[10px]",
                  item.priority === "critical" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                  item.priority === "high" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                )}>{item.priority}</span>
                <span className="ml-auto">{age}</span>
              </div>
              <p className="text-sm font-medium mb-0.5">{item.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-2">{item.description}</p>
              {item.assay_spec && (
                <p className="text-xs text-[var(--muted-foreground)] mb-2 font-mono">
                  {item.assay_spec.partner_ids.join(" + ")} · est. ${item.assay_spec.estimated_cost_usd.toLocaleString()} · {item.assay_spec.estimated_turnaround_days}d
                </p>
              )}
              <div className="flex gap-1.5">
                {(actions[item.type] ?? ["Acknowledge"]).map((action, i) => (
                  <button
                    key={action}
                    onClick={() => handleResolve(item, action)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-md transition-colors",
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
        })}
      </div>
    </Card>
  );
}

function getAge(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
