import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { EntityRef } from "../../components/ui/entity-ref";
import { cn } from "../../lib/utils";
import { fetchFindings, type Finding, type FindingType, type FindingStatus } from "../../lib/hub-api";

type FilterView = "all" | FindingType;

const typeLabel: Record<FindingType, string> = {
  "crack-resolution": "Crack resolution",
  "opening-discovery": "Opening discovery",
  "echo-chamber-break": "Echo-chamber break",
  "measurement-artifact": "Measurement artifact",
  "methodology-improvement": "Methodology improvement",
};

const statusColor: Record<FindingStatus, string> = {
  draft: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  "expert-reviewed": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "independently-confirmed": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  confirmed: "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  retracted: "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

export function FindingsPage() {
  const [filter, setFilter] = useState<FilterView>("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["findings"],
    queryFn: () => fetchFindings(),
    retry: false,
  });

  const findings = data?.findings ?? [];
  const filtered = filter === "all" ? findings : findings.filter((f) => f.finding_type === filter);

  const confirmed = findings.filter((f) => f.status === "confirmed" || f.status === "independently-confirmed").length;
  const drafts = findings.filter((f) => f.status === "draft").length;
  const reviewed = findings.filter((f) => f.status === "expert-reviewed").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-lg font-semibold">Findings</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Total" value={findings.length} active={filter === "all"} onClick={() => setFilter("all")} />
        <KpiCard title="Confirmed" value={confirmed} delta={confirmed > 0 ? "ready for publication" : ""} active={false} />
        <KpiCard title="Expert reviewed" value={reviewed} active={false} />
        <KpiCard title="Drafts" value={drafts} delta={drafts > 0 ? "awaiting review" : ""} active={false} />
      </div>

      {isLoading && (
        <Card><div className="h-24 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading findings…</div></Card>
      )}

      {isError && (
        <Card>
          <div className="flex items-center gap-2 p-3 text-xs text-[var(--muted-foreground)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]" />
            Could not load findings. Check hub.plyknot.com authentication.
          </div>
        </Card>
      )}

      {!isLoading && filtered.length === 0 && !isError && (
        <Card><p className="text-sm text-[var(--muted-foreground)]">No findings yet.</p></Card>
      )}

      {filtered.map((finding) => (
        <FindingCard key={finding.id} finding={finding} />
      ))}
    </div>
  );
}

function FindingCard({ finding: f }: { finding: Finding }) {
  const sigmaChange = f.sigma_resolved != null && f.sigma_after != null
    ? `σ ${f.sigma_resolved} → ${f.sigma_after}`
    : null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("text-xs px-1.5 py-0.5 rounded", statusColor[f.status])}>{f.status}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">{typeLabel[f.finding_type]}</span>
            {f.project_id && (
              <Link to={`/projects/${f.project_id}`} className="text-[10px] font-mono text-[var(--muted-foreground)] hover:text-[var(--primary)]">
                {f.project_id}
              </Link>
            )}
            {sigmaChange && (
              <span className="text-[10px] font-mono text-[var(--color-success)] ml-auto">{sigmaChange}</span>
            )}
          </div>

          {/* Title + summary */}
          <h3 className="text-sm font-medium mb-1">{f.title}</h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-2">{f.summary}</p>

          {/* Evidence */}
          <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] flex-wrap">
            {f.independent_clusters != null && f.independent_clusters > 0 && (
              <span>{f.independent_clusters} independent cluster{f.independent_clusters > 1 ? "s" : ""}</span>
            )}
            {f.delta_ids && f.delta_ids.length > 0 && (
              <span>{f.delta_ids.length} delta{f.delta_ids.length > 1 ? "s" : ""}</span>
            )}
            {f.hypothesis_ids && f.hypothesis_ids.length > 0 && (
              <span>{f.hypothesis_ids.length} hypothesis{f.hypothesis_ids.length > 1 ? "es" : ""}</span>
            )}
          </div>

          {/* Entities */}
          {f.entities && f.entities.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {f.entities.map((id) => (
                <span key={id} className="relative"><EntityRef id={id} /></span>
              ))}
            </div>
          )}

          {/* Expert reviews */}
          {f.expert_reviews && f.expert_reviews.length > 0 && (
            <div className="mt-2 space-y-1">
              {f.expert_reviews.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono text-[var(--muted-foreground)]">{r.expert_id}</span>
                  <span className={cn("px-1 py-0.5 rounded",
                    r.confidence >= 0.7 ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]" : "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                  )}>{r.opinion} ({(r.confidence * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          )}

          {/* Domains */}
          {f.domains && f.domains.length > 0 && (
            <div className="flex gap-1 mt-2">
              {f.domains.map((d) => (
                <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{d}</span>
              ))}
            </div>
          )}

          {/* Publications */}
          {f.publications && f.publications.length > 0 && (
            <div className="flex gap-2 mt-2">
              {f.publications.map((pub) => (
                <span key={pub.id} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)]">
                  {pub.track}: {pub.status}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
