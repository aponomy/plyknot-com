/* Shared constants and helpers for the Network page */

export const TIER_COLORS: Record<string, string> = {
  T0: "#6b7280",  // gray-500
  T1: "#6366f1",  // indigo-500
  T2: "#a855f7",  // purple-500
  T3: "#f59e0b",  // amber-500
  T4: "#dc2626",  // red-600
};

export const OPCO_COLORS: Record<string, string> = {
  health: "#ef4444",     // red-500
  pharma: "#3b82f6",     // blue-500
  regulatory: "#a855f7", // purple-500
  finance: "#22c55e",    // green-500
  "ai-safety": "#f59e0b",// amber-500
  none: "#9ca3af",       // gray-400
};

export const STATUS_COLORS: Record<string, string> = {
  exploring: "#6366f1",
  scoping: "#9ca3af",
  formed: "#22c55e",
  paused: "#f59e0b",
  active: "#22c55e",
  stub: "#9ca3af",
  dormant: "#9ca3af",
  archived: "#6b7280",
  missing: "#ef4444",
  proposed: "#6366f1",
  silent: "#9ca3af",
};

export function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const color = STATUS_COLORS[status] || "#9ca3af";
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 9999,
      background: `${color}18`, color, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] || "#9ca3af";
  return (
    <span style={{
      fontSize: 10, padding: "1px 5px", borderRadius: 4,
      background: `${color}18`, color, fontWeight: 600, fontFamily: "monospace",
    }}>
      {tier}
    </span>
  );
}

export function OpcoTag({ opco }: { opco: string | null }) {
  if (!opco || opco === "none") return null;
  const color = OPCO_COLORS[opco] || "#9ca3af";
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 9999,
      background: `${color}18`, color, fontWeight: 500,
    }}>
      {opco}
    </span>
  );
}

export const SUB_TABS = ["Overview", "OpCos", "Markets", "Organization", "Researchers", "Bridges"] as const;
export type SubTab = (typeof SUB_TABS)[number];
