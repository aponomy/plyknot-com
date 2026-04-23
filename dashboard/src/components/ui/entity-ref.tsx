import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { getRegistryEntry, searchRegistry } from "../../lib/mock-data";

interface EntityRefProps {
  id?: number;
  label?: string;
  className?: string;
}

const convergenceColor: Record<string, string> = {
  converged: "text-[var(--color-success)]",
  tension: "text-[var(--color-warning)]",
  divergent: "text-[var(--color-danger)]",
  single: "text-[var(--muted-foreground)]",
  unmeasured: "text-[var(--muted-foreground)]",
};

const complexityLabel: Record<number, string> = {
  0: "L0 fund.",
  1: "L1 chem.",
  2: "L2 bio.",
  3: "L3 org.",
  4: "L4 cogn.",
  5: "L5 social",
};

export function EntityRef({ id, label, className }: EntityRefProps) {
  const [showCard, setShowCard] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("below");
  const ref = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Resolve entry by ID or by label search
  const entry = id != null
    ? getRegistryEntry(id)
    : label
      ? searchRegistry(label)[0]
      : undefined;

  const displayLabel = label ?? entry?.labels[0] ?? `#${id}`;

  function handleEnter() {
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPosition(rect.top > 300 ? "above" : "below");
      }
      setShowCard(true);
    }, 300);
  }

  function handleLeave() {
    clearTimeout(timerRef.current);
    setShowCard(false);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!entry) {
    return <span className={cn("font-mono text-xs", className)}>{displayLabel}</span>;
  }

  return (
    <span
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={cn(
        "font-mono text-xs cursor-help border-b border-dotted border-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors",
        className,
      )}
    >
      {displayLabel}

      {showCard && (
        <span
          className={cn(
            "absolute z-50 w-72 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl p-3 text-left font-sans",
            position === "above" ? "bottom-full mb-1" : "top-full mt-1",
          )}
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          {/* Header */}
          <span className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-[var(--muted-foreground)]">#{entry.id}</span>
            <span className="text-sm font-semibold font-sans">{entry.labels[0]}</span>
          </span>

          {/* Aliases */}
          {entry.labels.length > 1 && (
            <span className="block text-[10px] text-[var(--muted-foreground)] mb-1.5">
              aka: {entry.labels.slice(1).join(", ")}
            </span>
          )}

          {/* Description */}
          <span className="block text-xs text-[var(--muted-foreground)] mb-2 leading-relaxed">
            {entry.description}
          </span>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <span className="flex flex-wrap gap-1 mb-2">
              {entry.tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                  {t}
                </span>
              ))}
            </span>
          )}

          {/* Stats row */}
          <span className="flex items-center gap-3 text-[10px] border-t border-[var(--border)] pt-1.5">
            {entry.convergence && (
              <span className={cn("font-medium", convergenceColor[entry.convergence])}>
                {entry.convergence}
              </span>
            )}
            {entry.depth && (
              <span className="text-[var(--muted-foreground)]">{entry.depth}</span>
            )}
            {entry.measurement_count != null && (
              <span className="font-mono text-[var(--muted-foreground)]">{entry.measurement_count} meas.</span>
            )}
            {entry.instrument_count != null && (
              <span className="font-mono text-[var(--muted-foreground)]">{entry.instrument_count} instr.</span>
            )}
          </span>

          {/* Complexity levels */}
          <span className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[var(--muted-foreground)]">
            {entry.complexity_levels.map((l) => (
              <span key={l} className="px-1 py-0.5 rounded bg-[var(--muted)] font-mono">
                {complexityLabel[l] ?? `L${l}`}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
