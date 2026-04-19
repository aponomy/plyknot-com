import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "../../components/ui/card";
import { cn } from "../../lib/utils";
import { reviewItems, type ReviewItemType } from "../../lib/mock-data";

const typeIcon: Record<ReviewItemType, string> = {
  "judge-divergence": "⚠",
  "extraction-conflict": "⚠",
  "embargo-expiry": "⏰",
  "rendering-draft": "📄",
  "trust-drop": "📉",
};

const typeLabel: Record<ReviewItemType, string> = {
  "judge-divergence": "Judge divergence",
  "extraction-conflict": "Extraction conflict",
  "embargo-expiry": "Embargo expiry",
  "rendering-draft": "Rendering draft",
  "trust-drop": "Trust drop",
};

export function ReviewPage() {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const pending = reviewItems.filter((item) => !resolved.has(item.id));
  const resolvedCount = resolved.size;

  function handleAction(itemId: string, _action: string) {
    setResolved((prev) => new Set(prev).add(itemId));
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Review queue</h1>
        <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span>{pending.length} pending</span>
          {resolvedCount > 0 && <span className="text-[var(--color-success)]">{resolvedCount} resolved</span>}
        </div>
      </div>

      {pending.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">All clear — nothing needs review.</p>
          </div>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          {pending.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            >
              <Card className="overflow-hidden">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{typeIcon[item.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                        item.type === "judge-divergence" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                        item.type === "extraction-conflict" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                        item.type === "embargo-expiry" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                        item.type === "rendering-draft" && "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
                        item.type === "trust-drop" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                      )}>
                        {typeLabel[item.type]}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">{item.age} ago</span>
                      {item.project && (
                        <span className="text-xs font-mono text-[var(--muted-foreground)]">· {item.project}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.detail}</p>

                    {/* Inline action buttons */}
                    <div className="flex gap-2 mt-3">
                      {item.actions.map((action) => (
                        <button
                          key={action}
                          onClick={() => handleAction(item.id, action)}
                          className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
