import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";
import { fetchSupervisorRuns, fetchQueueStats, fetchAttentionItems, fetchExpertRewards, type AttentionItem } from "../../lib/hub-api";
import {
  queueDepth,
  recentMatches,
  costHistory,
  projects,
  groundingQuality,
  topEntities,
  renderingDrafts,
  validatorLog,
  wetlabRequests,
  experts,
  type WetlabStatus,
  type JudgeAgreement,
  type RenderingStatus,
} from "../../lib/mock-data";

type FactoryView = "live-runs" | "judges" | "experts" | "wetlab" | "extraction" | "rendering" | "costs";

const agreementColor: Record<JudgeAgreement, string> = {
  "3-agree": "bg-[var(--color-success)]",
  "2-1": "bg-[var(--color-warning)]",
  "1-1-1": "bg-[var(--color-danger)]",
};

const statusLabel: Record<RenderingStatus, string> = {
  "pass-1": "Pass 1",
  "pass-2": "Pass 2",
  "validating": "Validating",
  "approved": "Approved",
  "revision-requested": "Revision",
  "rejected": "Rejected",
};

const statusColor: Record<RenderingStatus, string> = {
  "pass-1": "bg-[var(--muted)] text-[var(--muted-foreground)]",
  "pass-2": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "validating": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "approved": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  "revision-requested": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
  "rejected": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

const totalCost = costHistory.reduce((s, e) => s + e.cost, 0);
const todayCost = costHistory[costHistory.length - 1]?.cost ?? 0;
const maxBar = Math.max(...queueDepth.map((q) => q.count));
const batches = projects.filter((p) => p.kind === "extraction-batch");
const totalIngested = batches.reduce((s, b) => s + (b.ingested_count ?? 0), 0);
const pendingDrafts = renderingDrafts.filter((d) => d.status !== "approved" && d.status !== "rejected").length;
const wetlabPending = wetlabRequests.filter((w) => w.status === "requested" || w.status === "in-progress").length;

const wetlabStatusColor: Record<WetlabStatus, string> = {
  "requested": "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  "in-progress": "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  "results-received": "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  "integrated": "bg-[var(--muted)] text-[var(--muted-foreground)]",
  "cancelled": "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
};

const levelIcon: Record<string, string> = { error: "✕", warning: "⚠", info: "ℹ" };
const levelColor: Record<string, string> = { error: "text-[var(--color-danger)]", warning: "text-[var(--color-warning)]", info: "text-[var(--muted-foreground)]" };

export function FactoryPage() {
  const [view, setView] = useState<FactoryView>("live-runs");

  const runsQuery = useQuery({
    queryKey: ["supervisor-runs"],
    queryFn: fetchSupervisorRuns,
    retry: false,
    refetchInterval: 10_000,
  });

  const queueQuery = useQuery({
    queryKey: ["supervisor-queue"],
    queryFn: fetchQueueStats,
    retry: false,
    refetchInterval: 5_000,
  });

  const wetlabQuery = useQuery({
    queryKey: ["attention-wetlab"],
    queryFn: () => fetchAttentionItems({ type: "wet-lab-request" }),
    retry: false,
    refetchInterval: 30_000,
  });

  const blockingQuery = useQuery({
    queryKey: ["attention-blocking"],
    queryFn: () => fetchAttentionItems({ status: "pending" }),
    retry: false,
    refetchInterval: 15_000,
  });

  const runs = runsQuery.data?.runs ?? [];
  const activeRuns = runs.filter((r) => r.status === "running");
  const activeRunCount = queueQuery.data?.active_runs ?? activeRuns.length;
  const liveWetlabItems = wetlabQuery.data?.items ?? [];
  const blockingItems = blockingQuery.data?.items ?? [];

  // Build a map: run_id → blocking attention items
  const blockingByRun = new Map<string, AttentionItem[]>();
  for (const item of blockingItems) {
    if (item.run_id) {
      const list = blockingByRun.get(item.run_id) ?? [];
      list.push(item);
      blockingByRun.set(item.run_id, list);
    }
  }

  const activeExpertConsultations = experts.reduce((s, e) => s + e.active_consultations, 0);

  const rewardsQuery = useQuery({
    queryKey: ["expert-rewards"],
    queryFn: () => fetchExpertRewards(),
    retry: false,
    enabled: view === "experts",
  });

  // Wet lab count: prefer live API, fall back to mock
  const wetlabCount = liveWetlabItems.length > 0
    ? liveWetlabItems.filter((w) => w.status === "pending" || w.status === "in-progress").length
    : wetlabPending;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Factory</h1>
        <span className="text-xs text-[var(--muted-foreground)]">${todayCost} today</span>
      </div>

      {/* KPI boxes — clickable navigation */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard title="Live Runs" value={activeRunCount} delta={activeRunCount > 0 ? "running" : "idle"} trend={activeRunCount > 0 ? "up" : undefined} active={view === "live-runs"} onClick={() => setView("live-runs")} />
        <KpiCard title="Judges" value={recentMatches.length} delta={`${queueDepth.reduce((s, q) => s + q.count, 0)} in queue`} active={view === "judges"} onClick={() => setView("judges")} />
        <KpiCard title="Experts" value={activeExpertConsultations} delta={`${experts.length} registered`} active={view === "experts"} onClick={() => setView("experts")} />
        <KpiCard title="Wet Lab" value={wetlabCount} delta={wetlabCount > 0 ? "awaiting results" : "none pending"} active={view === "wetlab"} onClick={() => setView("wetlab")} />
        <KpiCard title="Extraction" value={totalIngested} delta={`${batches.length} active batches`} active={view === "extraction"} onClick={() => setView("extraction")} />
        <KpiCard title="Rendering" value={renderingDrafts.length} delta={`${pendingDrafts} pending`} active={view === "rendering"} onClick={() => setView("rendering")} />
        <KpiCard title="Costs" value={`$${totalCost}`} delta="+11% vs prior week" trend="up" active={view === "costs"} onClick={() => setView("costs")} />
      </div>

      {/* === VIEW: Live Runs === */}
      {view === "live-runs" && (
        <>
          {runsQuery.isLoading ? (
            <Card>
              <div className="h-24 flex items-center justify-center text-sm text-[var(--muted-foreground)]">Loading supervisor runs…</div>
            </Card>
          ) : runs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Supervisor runs</CardTitle>
                <span className="text-xs text-[var(--muted-foreground)]">{runs.length} total · {activeRunCount} active</span>
              </CardHeader>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <th className="text-left py-2 font-medium">Run</th>
                    <th className="text-left py-2 font-medium">Project</th>
                    <th className="text-center py-2 font-medium">Mode</th>
                    <th className="text-center py-2 font-medium">Round</th>
                    <th className="text-center py-2 font-medium">Status</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                    <th className="text-right py-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-[var(--muted)] transition-colors">
                      <td className="py-2 font-mono text-xs">{run.id.slice(0, 20)}…</td>
                      <td className="py-2">
                        <Link to={`/projects/${run.project_id}`} className="text-xs hover:text-[var(--primary)] transition-colors">{run.project_id}</Link>
                      </td>
                      <td className="py-2 text-center">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{run.mode}</span>
                      </td>
                      <td className="py-2 text-center font-mono text-xs">{run.current_round}</td>
                      <td className="py-2 text-center">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded",
                          run.status === "running" && "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                          run.status === "completed" && "bg-[var(--muted)] text-[var(--muted-foreground)]",
                          run.status === "paused" && "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
                          run.status === "failed" && "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
                        )}>
                          {run.status === "running" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)] mr-1 animate-pulse" />}
                          {run.status}
                        </span>
                        {run.status === "paused" && blockingByRun.has(run.id) && (
                          <span className="block text-[10px] text-[var(--color-warning)] mt-0.5">
                            {blockingByRun.get(run.id)![0].type.replace(/-/g, " ")}:{" "}
                            {blockingByRun.get(run.id)![0].title.slice(0, 40)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">${run.total_cost_usd.toFixed(4)}</td>
                      <td className="py-2 text-right text-xs text-[var(--muted-foreground)]">{run.started_at.split("T")[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>Supervisor runs</CardTitle></CardHeader>
              <p className="text-sm text-[var(--muted-foreground)]">
                {runsQuery.isError ? "Could not load runs. Check hub.plyknot.com authentication." : "No supervisor runs yet."}
              </p>
            </Card>
          )}

          {/* Queue stats */}
          {queueQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle>Task queue</CardTitle>
                <span className="text-xs text-[var(--muted-foreground)]">{activeRunCount} active run{activeRunCount !== 1 ? "s" : ""}</span>
              </CardHeader>
              <div className="space-y-2">
                {Object.entries(queueQuery.data.queue).map(([taskType, statuses]) => {
                  const total = Object.values(statuses).reduce((s, n) => s + n, 0);
                  return (
                    <div key={taskType} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-xs text-[var(--muted-foreground)] font-mono">{taskType}</span>
                      <div className="flex-1 flex gap-0.5 h-4">
                        {Object.entries(statuses).map(([status, count]) => (
                          <div
                            key={status}
                            title={`${count} ${status}`}
                            className={cn("h-full rounded",
                              status === "completed" && "bg-[var(--color-success)]",
                              status === "running" && "bg-[var(--color-accent)]",
                              status === "failed" && "bg-[var(--color-danger)]",
                              status === "queued" && "bg-[var(--muted)]",
                            )}
                            style={{ flex: count }}
                          />
                        ))}
                      </div>
                      <span className="w-6 text-right font-mono text-xs">{total}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* === VIEW: Judges === */}
      {view === "judges" && (
        <>
          {/* Tracker grid — clickable */}
          <Card>
            <CardHeader>
              <CardTitle>Judge ensemble — recent matches</CardTitle>
              <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-success)]" /> 3-agree</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-warning)]" /> 2-1</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-danger)]" /> 1-1-1</span>
              </div>
            </CardHeader>
            <div className="flex gap-1">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  title={`Match ${match.id} · ${match.agreement}\n${match.project} · ${match.hypothesis}\n${match.models.join(", ")}\nResult: ${match.result ?? "⚠ needs resolution"}`}
                  className={cn(
                    "flex-1 h-8 rounded-md transition-opacity hover:opacity-80",
                    agreementColor[match.agreement],
                  )}
                />
              ))}
            </div>
          </Card>

          {/* Queue depth */}
          <Card>
            <CardHeader><CardTitle>Queue depth</CardTitle></CardHeader>
            <div className="space-y-2">
              {queueDepth.map((q) => (
                <div key={q.type} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-xs text-[var(--muted-foreground)] font-mono">{q.type}</span>
                  <div className="flex-1 h-4 bg-[var(--muted)] rounded overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded transition-all" style={{ width: `${(q.count / maxBar) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-xs">{q.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* === VIEW: Experts === */}
      {view === "experts" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Expert panel</CardTitle>
              <span className="text-xs text-[var(--muted-foreground)]">{experts.length} registered · {activeExpertConsultations} active</span>
            </CardHeader>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Expert</th>
                  <th className="text-left py-2 font-medium">Domains</th>
                  <th className="text-left py-2 font-medium">Cluster</th>
                  <th className="text-center py-2 font-medium">Trust</th>
                  <th className="text-center py-2 font-medium">Active</th>
                  <th className="text-right py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {experts.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--muted)] transition-colors">
                    <td className="py-2.5">
                      <p className="text-sm">{e.name}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{e.affiliation}</p>
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {e.domains.slice(0, 3).map((d) => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 text-xs font-mono text-[var(--muted-foreground)]">{e.cluster_id}</td>
                    <td className="py-2.5 text-center font-mono text-xs">{e.trust_weight.toFixed(1)}</td>
                    <td className="py-2.5 text-center">
                      {e.active_consultations > 0 ? (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]">{e.active_consultations}</span>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-xs font-mono text-[var(--muted-foreground)]">
                      {e.cost_per_consultation_usd > 0 ? `$${e.cost_per_consultation_usd.toLocaleString()}` : "free"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cluster diversity */}
          <Card>
            <CardHeader>
              <CardTitle>Cluster diversity</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {[...new Set(experts.map((e) => e.cluster_id))].map((cluster) => {
                const count = experts.filter((e) => e.cluster_id === cluster).length;
                return (
                  <div key={cluster} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                    <span className="font-mono">{cluster}</span>
                    <span className="text-[var(--muted-foreground)]">({count})</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
              Echo-chamber detection: experts from the same cluster agreeing on a hypothesis triggers a flag. Aim for at least 2 clusters per high-stakes consultation.
            </p>
          </Card>

          {/* Rewards */}
          {rewardsQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle>Rewards</CardTitle>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono">${rewardsQuery.data.total_pending_usd.toLocaleString()} pending</span>
                  <span>·</span>
                  <span className="font-mono">${rewardsQuery.data.total_paid_usd.toLocaleString()} paid</span>
                </div>
              </CardHeader>
              {rewardsQuery.data.rewards.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {rewardsQuery.data.rewards.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 text-xs">
                      <span className="font-mono text-[var(--muted-foreground)]">{r.expert_id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{r.type.replace(/-/g, " ")}</span>
                      <span className="flex-1 truncate text-[var(--muted-foreground)]">{r.description}</span>
                      <span className="font-mono font-medium">${r.amount_usd.toLocaleString()}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                        r.status === "pending" ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]" : "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
                      )}>{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No rewards recorded yet.</p>
              )}
            </Card>
          )}
        </>
      )}

      {/* === VIEW: Wet Lab === */}
      {view === "wetlab" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Wet lab requests</CardTitle>
              <span className="text-xs text-[var(--muted-foreground)]">{wetlabRequests.length} total · {wetlabPending} pending</span>
            </CardHeader>
            {wetlabRequests.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {wetlabRequests.map((req) => (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", wetlabStatusColor[req.status])}>
                        {req.status}
                      </span>
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">{req.partner}</span>
                      <Link to={`/projects/${req.project}`} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] ml-auto">{req.project}</Link>
                    </div>
                    <p className="text-sm font-medium">{req.protocol}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                      <span>{req.entity} · {req.property}</span>
                      <span className="font-mono">{req.method}</span>
                      {req.cost != null && <span className="font-mono">${req.cost.toLocaleString()}</span>}
                    </div>
                    {req.estimatedCompletion && req.status !== "results-received" && req.status !== "integrated" && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">Est. completion: {req.estimatedCompletion}</p>
                    )}
                    {req.result && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-xs font-mono">
                        Result: {req.result}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No wet lab requests.</p>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Partners</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">CRO / Cloud Lab</p>
                <div className="space-y-1">
                  {["Syngene", "Jubilant Biosys", "Aragen", "GVK Bio", "Emerald Cloud Lab", "Strateos", "Arctoris"].map((p) => (
                    <span key={p} className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)] mr-1 mb-1">{p}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Academic</p>
                <div className="space-y-1">
                  {["NBIS/SciLifeLab", "Select Indian academic labs"].map((p) => (
                    <span key={p} className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-[var(--muted)] mr-1 mb-1">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* === VIEW: Extraction === */}
      {view === "extraction" && (
        <>
          <Card>
            <CardHeader><CardTitle>Active batches</CardTitle></CardHeader>
            <div className="space-y-3">
              {batches.map((b) => {
                const pct = b.target_count ? Math.round(((b.ingested_count ?? 0) / b.target_count) * 100) : 0;
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <Link to={`/projects/${b.id}`} className="font-mono text-xs hover:text-[var(--primary)] transition-colors">{b.name}</Link>
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">{b.ingested_count}/{b.target_count} — {pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Grounding quality</CardTitle></CardHeader>
              <div className="space-y-2.5">
                {groundingQuality.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--muted-foreground)]">{g.label}</span>
                      <span className="font-mono">{g.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-success)] rounded-full transition-all" style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top entities by activity</CardTitle><span className="text-xs text-[var(--muted-foreground)]">last 7d</span></CardHeader>
              <div className="space-y-2.5">
                {topEntities.map((e) => {
                  const maxNew = Math.max(...topEntities.map((x) => x.newCouplings));
                  return (
                    <div key={e.entity} className="flex items-center gap-3 text-sm">
                      <span className="w-20 truncate">{e.entity}</span>
                      <div className="flex-1 h-4 bg-[var(--muted)] rounded overflow-hidden">
                        <div className="h-full bg-[var(--primary)] rounded transition-all" style={{ width: `${(e.newCouplings / maxNew) * 100}%` }} />
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)] font-mono w-24 text-right">
                        {e.newCouplings} new{e.conflicts > 0 && ` · ${e.conflicts} ⚠`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* === VIEW: Rendering === */}
      {view === "rendering" && (
        <>
          <Card>
            <CardHeader><CardTitle>Drafts</CardTitle></CardHeader>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Title</th>
                  <th className="text-left py-2 font-medium">Project</th>
                  <th className="text-center py-2 font-medium">Status</th>
                  <th className="text-center py-2 font-medium">Issues</th>
                  <th className="text-right py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {renderingDrafts.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--muted)] transition-colors">
                    <td className="py-2.5 max-w-[200px] truncate">{d.title}</td>
                    <td className="py-2.5">
                      <Link to={`/projects/${d.project}`} className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--primary)]">{d.project}</Link>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", statusColor[d.status])}>{statusLabel[d.status]}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      {d.validatorIssues > 0 ? <span className="text-xs font-mono text-[var(--color-danger)]">{d.validatorIssues} ✕</span>
                        : d.validatorWarnings > 0 ? <span className="text-xs font-mono text-[var(--color-warning)]">{d.validatorWarnings} ⚠</span>
                        : <span className="text-xs text-[var(--color-success)]">✓</span>}
                    </td>
                    <td className="py-2.5 text-right text-xs text-[var(--muted-foreground)]">{d.lastUpdated.split("T")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Validator log */}
          <Card>
            <CardHeader><CardTitle>Validator log</CardTitle><span className="text-xs text-[var(--muted-foreground)]">{validatorLog.length} entries</span></CardHeader>
            <div className="divide-y divide-[var(--border)]">
              {validatorLog.map((entry, i) => (
                <div key={i} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm", levelColor[entry.level])}>{levelIcon[entry.level]}</span>
                    <span className="text-xs font-mono text-[var(--muted-foreground)]">{entry.rule}</span>
                    {entry.location && <span className="text-xs text-[var(--muted-foreground)]">@ {entry.location}</span>}
                  </div>
                  <p className="text-xs mt-0.5 ml-5 text-[var(--muted-foreground)]">{entry.message}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* === VIEW: Costs === */}
      {view === "costs" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Cost over last 7 days</CardTitle><span className="text-xs text-[var(--muted-foreground)]">${totalCost} total</span></CardHeader>
              <div className="flex items-end gap-1 h-24">
                {costHistory.map((entry) => {
                  const maxCost = Math.max(...costHistory.map((e) => e.cost));
                  return (
                    <div key={entry.day} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: "80px" }}>
                        <div className="absolute bottom-0 w-full bg-[var(--primary)] rounded-t opacity-80" style={{ height: `${(entry.cost / maxCost) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">{entry.day.split(" ")[1]}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Cost today</CardTitle></CardHeader>
              <p className="text-2xl font-semibold font-mono tabular-nums">${todayCost}</p>
              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Papers ingested</p>
                  <p className="font-mono">47 today</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Couplings emitted</p>
                  <p className="font-mono">213</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">Avg per paper</p>
                  <p className="font-mono">4.5</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
