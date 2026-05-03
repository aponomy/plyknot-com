import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";
import { TierBadge, OpcoTag, StatusPill, TIER_COLORS } from "./shared";

type SubView = "by-paper" | "all-people" | "ladder";

export function ResearchersView() {
  const [subView, setSubView] = useState<SubView>("by-paper");
  const [selPaper, setSelPaper] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["affiliates"],
    queryFn: () => fetch("/research/affiliates").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: ladderDoc } = useQuery({
    queryKey: ["ladder-doc"],
    queryFn: () => fetch("/research/article/project/strategy/17-researcher-collaboration-strategy.md").then((r) => r.json()),
    staleTime: 60_000,
    enabled: subView === "ladder",
  });

  const rosters = data?.rosters || [];
  const selRoster = rosters.find((r: any) => r.paper === selPaper);

  // Flatten all people for the table view
  const allPeople = useMemo(() => {
    const people: any[] = [];
    for (const r of rosters) {
      for (const t of r.tiers || []) {
        for (const e of t.entries) {
          if (!e.open) {
            people.push({ ...e, tier: t.tier, paper: r.paper, paperTitle: r.paperTitle, opco: r.opco });
          }
        }
      }
    }
    return people;
  }, [rosters]);

  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return allPeople;
    const q = filter.toLowerCase();
    return allPeople.filter((p) =>
      (p.name?.toLowerCase().includes(q)) ||
      (p.affiliation?.toLowerCase().includes(q)) ||
      (p.tier?.toLowerCase().includes(q)) ||
      (p.opco?.toLowerCase().includes(q)) ||
      (p.paper?.toLowerCase().includes(q))
    );
  }, [allPeople, filter]);

  return (
    <div>
      {/* Sub-view toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {([["by-paper", "By paper"], ["all-people", "All people"], ["ladder", "Ladder"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubView(key as SubView)}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
              border: subView === key ? "1px solid var(--foreground)" : "1px solid var(--border)",
              background: subView === key ? "var(--foreground)" : "transparent",
              color: subView === key ? "var(--background)" : "var(--foreground)",
              fontWeight: subView === key ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === "by-paper" && (
        <div style={{ display: "flex", gap: 0, height: "calc(100vh - 230px)" }}>
          <div style={{ width: 300, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px 0" }}>
            {rosters.map((r: any) => {
              const total = (r.tiers || []).reduce((s: number, t: any) => s + t.entries.filter((e: any) => !e.open).length, 0);
              return (
                <div
                  key={r.paper}
                  onClick={() => setSelPaper(r.paper)}
                  style={{
                    padding: "8px 14px", cursor: "pointer", fontSize: 11,
                    background: selPaper === r.paper ? "var(--accent)" : "transparent",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ flex: 1 }}>{r.paperTitle}</span>
                  <StatusPill status={r.status} />
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)", minWidth: 16, textAlign: "right" }}>{total}</span>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {!selRoster ? (
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Select a paper</div>
            ) : (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{selRoster.paperTitle}</h3>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {selRoster.domain && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{selRoster.domain}</span>}
                  <OpcoTag opco={selRoster.opco} />
                  <StatusPill status={selRoster.status} />
                </div>
                {selRoster.gapNote && (
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 12, fontStyle: "italic" }}>Gap: {selRoster.gapNote}</div>
                )}
                {(selRoster.tiers || []).map((t: any) => (
                  <div key={t.tier} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <TierBadge tier={t.tier} />
                      <span style={{ fontSize: 11, fontWeight: 500 }}>{t.label}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>({t.entries.length})</span>
                    </div>
                    {t.entries.map((e: any, i: number) => (
                      <div key={i} style={{ padding: "4px 0 4px 24px", fontSize: 11, borderBottom: "1px solid var(--border)" }}>
                        {e.open ? (
                          <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>{e.raw}</span>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 600 }}>
                              {e.starred && <span style={{ color: TIER_COLORS.T3, marginRight: 4 }}>⭐</span>}
                              {e.name}
                            </span>
                            {e.affiliation && <span style={{ color: "var(--muted-foreground)", marginLeft: 4 }}>({e.affiliation})</span>}
                            {e.notes && <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>{e.notes}</div>}
                            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                              {e.status && <span style={{ fontSize: 10 }}>Status: {e.status}</span>}
                              {e.action && <span style={{ fontSize: 10, color: TIER_COLORS.T3 }}>Action: {e.action}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {selRoster.history?.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 10, color: "var(--muted-foreground)" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>History</div>
                    {selRoster.history.map((h: string, i: number) => <div key={i}>{h}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {subView === "all-people" && (
        <div>
          <input
            placeholder="Filter by name, affiliation, tier, opco, paper..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: "100%", maxWidth: 400, padding: "6px 10px", fontSize: 11,
              border: "1px solid var(--border)", borderRadius: 6, marginBottom: 12,
              background: "var(--background)", color: "var(--foreground)",
            }}
          />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Name</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Affiliation</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Tier</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Paper</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Action</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>OpCo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 500 }}>
                      {p.starred && <span style={{ marginRight: 4 }}>⭐</span>}
                      {p.name}
                    </td>
                    <td style={{ padding: "5px 8px", color: "var(--muted-foreground)" }}>{p.affiliation || "—"}</td>
                    <td style={{ padding: "5px 8px" }}><TierBadge tier={p.tier} /></td>
                    <td style={{ padding: "5px 8px", fontSize: 10 }}>{p.paperTitle}</td>
                    <td style={{ padding: "5px 8px" }}>{p.status || "—"}</td>
                    <td style={{ padding: "5px 8px", fontSize: 10, color: TIER_COLORS.T3 }}>{p.action || ""}</td>
                    <td style={{ padding: "5px 8px" }}><OpcoTag opco={p.opco} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "var(--muted-foreground)" }}>No matches</div>}
          </div>
        </div>
      )}

      {subView === "ladder" && (
        <div style={{ maxWidth: 800 }}>
          {ladderDoc?.content ? (
            <MarkdownContent content={ladderDoc.content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
          ) : (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Loading...</div>
          )}
        </div>
      )}
    </div>
  );
}
