import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";

export function OverviewView() {
  const { data } = useQuery({
    queryKey: ["network-manifest"],
    queryFn: () => fetch("/research/network").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: affData } = useQuery({
    queryKey: ["affiliates"],
    queryFn: () => fetch("/research/affiliates").then((r) => r.json()),
    staleTime: 30_000,
  });

  // Count stats
  const opcos = data?.folders?.find((f: any) => f.section === "opcos");
  const bridges = data?.folders?.find((f: any) => f.section === "bridges");
  const markets = data?.folders?.find((f: any) => f.section === "markets");

  const opcosByStatus: Record<string, number> = {};
  for (const sf of opcos?.subfolders || []) {
    const st = sf.indexContent?.match(/^status:\s*(.+)$/m)?.[1]?.trim() || "unknown";
    opcosByStatus[st] = (opcosByStatus[st] || 0) + 1;
  }

  const bridgeCount = (bridges?.files?.length || 0) - 2; // exclude index.md, todo.md
  const marketCount = markets?.subfolders?.length || 0;

  // Affiliate stats
  let totalAffiliates = 0;
  const byTier: Record<string, number> = {};
  for (const r of affData?.rosters || []) {
    for (const t of r.tiers || []) {
      const real = t.entries.filter((e: any) => !e.open).length;
      totalAffiliates += real;
      byTier[t.tier] = (byTier[t.tier] || 0) + real;
    }
  }

  const stats = [
    { label: "OpCos", value: opcos?.subfolders?.length || 0, sub: Object.entries(opcosByStatus).map(([k, v]) => `${v} ${k}`).join(", ") },
    { label: "Markets", value: marketCount },
    { label: "Bridges", value: Math.max(bridgeCount, 0) },
    { label: "Affiliates", value: totalAffiliates, sub: Object.entries(byTier).map(([k, v]) => `${k}: ${v}`).join(", ") },
  ];

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ flex: 1 }}>
        {/* Stat strip */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
        {/* Network index.md */}
        {data?.indexContent && <MarkdownContent content={data.indexContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />}
      </div>
    </div>
  );
}
