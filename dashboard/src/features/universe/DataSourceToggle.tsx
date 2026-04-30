import type { DataSource } from "../../lib/hub-api";
import { cn } from "../../lib/utils";

interface DataSourceToggleProps {
  value: DataSource;
  onChange: (source: DataSource) => void;
}

const sources: { value: DataSource; label: string }[] = [
  { value: "plyknot.org", label: "Open" },
  { value: "plyknot.com", label: "Research Lab" },
  { value: "cybernetics", label: "Cybernetics" },
  { value: "existence", label: "Social" },
  { value: "internal", label: "Internal" },
];

export function DataSourceToggle({ value, onChange }: DataSourceToggleProps) {
  return (
    <div className="flex items-center rounded-lg bg-[var(--muted)] p-0.5">
      {sources.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === s.value
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
