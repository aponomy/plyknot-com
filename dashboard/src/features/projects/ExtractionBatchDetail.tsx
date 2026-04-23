import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { EntityRef } from "../../components/ui/entity-ref";
import { cn } from "../../lib/utils";
import {
  type Project,
  type DisambiguationVerdict,
  getProjectDisambiguations,
  getProjectCouplings,
} from "../../lib/mock-data";

const verdictColor: Record<DisambiguationVerdict, string> = {
  "strong_match": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  "weak_match": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "ambiguous": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
  "new_entity": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "rejected": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

const verdictLabel: Record<DisambiguationVerdict, string> = {
  "strong_match": "strong match",
  "weak_match": "weak match",
  "ambiguous": "ambiguous",
  "new_entity": "new entity",
  "rejected": "rejected",
};

export function ExtractionBatchDetail({ project: p }: { project: Project }) {
  const pctBudget = p.budget_usd > 0 ? Math.round((p.spent_usd / p.budget_usd) * 100) : 0;
  const pctPapers = p.target_count ? Math.round(((p.ingested_count ?? 0) / p.target_count) * 100) : 0;
  const estDays = p.scout_rate && p.target_count && p.ingested_count
    ? Math.ceil((p.target_count - p.ingested_count) / p.scout_rate)
    : null;

  const disambiguations = getProjectDisambiguations(p.id);
  const couplings = getProjectCouplings(p.id);
  const [expandedDis, setExpandedDis] = useState<Set<string>>(new Set());

  function toggleDis(id: string) {
    setExpandedDis((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <span className={cn("text-xs px-1.5 py-0.5 rounded",
            p.status === "active" ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]",
          )}>{p.status}</span>
        </CardHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-[var(--muted-foreground)]">Kind</p><p>extraction-batch</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Budget</p><p className="font-mono">${p.spent_usd} / ${p.budget_usd} ({pctBudget}%)</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Progress</p><p className="font-mono">{p.ingested_count} / {p.target_count} papers</p></div>
          <div><p className="text-xs text-[var(--muted-foreground)]">Started</p><p>{p.created_at}</p></div>
        </div>
        <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden mt-3">
          <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${pctPapers}%` }} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted-foreground)]">
          {estDays !== null && <span>est. {estDays}d to target</span>}
          {p.scout_rate && <span>· {p.scout_rate} papers/day</span>}
          {p.extractor_success && <span>· {p.extractor_success}% success</span>}
        </div>
        <div className="flex gap-2 mt-4">
          <ActionBtn label={p.status === "active" ? "pause" : "resume"} />
          <ActionBtn label="allocate budget" />
          <ActionBtn label="export couplings" />
          <ActionBtn label={p.archived ? "unarchive" : "archive"} />
        </div>
      </Card>

      {/* Extracted couplings */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted couplings</CardTitle>
          <span className="text-xs text-[var(--muted-foreground)]">{couplings.length} from this batch</span>
        </CardHeader>
        {couplings.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="text-left py-1.5 font-medium">Entity A</th>
                <th className="text-left py-1.5 font-medium">→</th>
                <th className="text-left py-1.5 font-medium">Entity B</th>
                <th className="text-left py-1.5 font-medium">Property</th>
                <th className="text-left py-1.5 font-medium">Value</th>
                <th className="text-left py-1.5 font-medium">Method</th>
                <th className="text-center py-1.5 font-medium">Conf.</th>
                <th className="text-center py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {couplings.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--muted)] transition-colors">
                  <td className="py-1.5 relative"><EntityRef id={c.entityAId} label={c.entityA} /></td>
                  <td className="py-1.5 text-[var(--muted-foreground)]">→</td>
                  <td className="py-1.5 relative"><EntityRef id={c.entityBId} label={c.entityB} /></td>
                  <td className="py-1.5">{c.property}</td>
                  <td className="py-1.5 font-mono">{c.value}{c.sigma ? ` ${c.sigma}` : ""}</td>
                  <td className="py-1.5 text-[var(--muted-foreground)]">{c.method}</td>
                  <td className="py-1.5 text-center font-mono">{(c.groundingConfidence * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-center">
                    <span className={cn("px-1.5 py-0.5 rounded",
                      c.status === "merged" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                      c.status === "conflict" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                      c.status === "pending" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                    )}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">No couplings extracted yet.</p>
        )}
      </Card>

      {/* Disambiguation log */}
      <Card>
        <CardHeader>
          <CardTitle>Disambiguation</CardTitle>
          <div className="flex items-center gap-1.5">
            {(["strong_match", "weak_match", "ambiguous", "new_entity"] as const).map((v) => {
              const count = disambiguations.filter((d) => d.verdict === v).length;
              if (count === 0) return null;
              return (
                <span key={v} className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono", verdictColor[v])}>
                  {count} {verdictLabel[v]}
                </span>
              );
            })}
          </div>
        </CardHeader>
        <div className="space-y-px">
          {disambiguations.map((d) => {
            const isOpen = expandedDis.has(d.id);
            return (
              <div key={d.id}>
                <div
                  onClick={() => toggleDis(d.id)}
                  className="flex items-center gap-2 py-2 px-1 rounded cursor-pointer hover:bg-[var(--muted)] transition-colors"
                >
                  <ChevronRight size={10} className={cn("text-[var(--muted-foreground)] shrink-0 transition-transform", isOpen && "rotate-90")} />
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", verdictColor[d.verdict])}>{verdictLabel[d.verdict]}</span>
                  <span className="text-xs font-mono truncate">{d.submittedLabel}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">· {d.submittedProperty} · {d.submittedMethod}</span>
                  {d.resolvedLabel && (
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-auto shrink-0">→ #{d.resolvedEntityId} {d.resolvedLabel}</span>
                  )}
                  {d.reviewAction === "pending" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--color-warning)]/10 text-[var(--color-warning)] ml-auto shrink-0">needs review</span>
                  )}
                </div>

                {isOpen && (
                  <div className="ml-5 mr-1 mb-2 p-3 rounded-md bg-[var(--background)] border border-[var(--border)] text-xs space-y-3">
                    {/* Submitted value */}
                    <div>
                      <p className="text-[var(--muted-foreground)] mb-1">Submitted</p>
                      <p className="font-mono">{d.submittedLabel} · {d.submittedProperty} = {d.submittedValue} ({d.submittedMethod})</p>
                      {d.paper && <p className="text-[var(--muted-foreground)] mt-0.5">{d.paper}</p>}
                    </div>

                    {/* Check 1: Label similarity */}
                    <div>
                      <p className="text-[var(--muted-foreground)] mb-1">Check 1 — Label embedding similarity</p>
                      <div className="space-y-1">
                        {d.labelCandidates.map((c) => (
                          <div key={c.entityId} className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${c.similarity * 100}%` }} />
                            </div>
                            <span className="font-mono w-10">{(c.similarity * 100).toFixed(0)}%</span>
                            <span className="relative"><EntityRef id={c.entityId} label={c.label} /></span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Check 2: Relational */}
                    <div>
                      <p className="text-[var(--muted-foreground)] mb-1">Check 2 — Relational profile</p>
                      <p className="font-mono">
                        {d.relationalMatches.length > 0
                          ? `Matching entities: ${d.relationalMatches.map((id) => `#${id}`).join(", ")}`
                          : "No relational matches (no declared relations)"}
                      </p>
                    </div>

                    {/* Check 3: Property signature */}
                    <div>
                      <p className="text-[var(--muted-foreground)] mb-1">Check 3 — Property signature</p>
                      <p className="font-mono">
                        {d.propertySignatureMatches.length > 0
                          ? `Entities with "${d.submittedProperty}" measurements: ${d.propertySignatureMatches.map((id) => `#${id}`).join(", ")}`
                          : `No entities have "${d.submittedProperty}" measurements`}
                      </p>
                    </div>

                    {/* Action buttons for pending */}
                    {d.reviewAction === "pending" && (
                      <div className="flex gap-2 pt-1">
                        {d.labelCandidates.map((c) => (
                          <button key={c.entityId} className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                            Accept as #{c.entityId}
                          </button>
                        ))}
                        <button className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                          Create new entity
                        </button>
                        <button className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--color-danger)] hover:bg-[color:var(--color-danger)]/5 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] mr-1">Keywords:</span>
            {(p.keywords ?? []).map((kw) => (
              <span key={kw} className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)]">{kw}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)] mr-1">Venues:</span>
            {(p.venues ?? []).map((v) => (
              <span key={v} className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)]">{v}</span>
            ))}
          </div>
          {p.date_range && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Date range: {p.date_range.start} → {p.date_range.end}
            </p>
          )}
        </div>
      </Card>
    </>
  );
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
      {label}
    </button>
  );
}
