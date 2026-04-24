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

type FactoryView = "agents" | "live-runs" | "judges" | "experts" | "wetlab" | "extraction" | "rendering" | "costs" | "i-am" | "society";

/* ── Agent fleet types (from orchestrator gateway) ── */
type ContainerState = "provisioning" | "idle" | "busy" | "draining" | "terminated";
type AuthStatus = "ok" | "token-expiring" | "token-expired" | "rate-limited" | "quota-exhausted";

interface AgentContainer {
  id: string;
  vendor: string;
  model: string;
  role: string | null;
  project_id: string | null;
  state: ContainerState;
  account_id: string | null;
  total_tasks: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  last_active: string;
}

interface VendorAccount {
  id: string;
  vendor: string;
  label: string;
  plan: string;
  credential_status: string;
  spend_limit_usd: number | null;
  period_spend_usd: number;
  period_requests: number;
  period_tokens_in: number;
  period_tokens_out: number;
  rate_limit_rpm: number | null;
  rate_limit_tpm: number | null;
}

interface ContainerHealth {
  container_id: string;
  heartbeat_ok: boolean;
  missed_heartbeats: number;
  current_task_id: string | null;
  task_started_at: string | null;
  stuck_detected_at: string | null;
  consecutive_errors: number;
  auth_status: AuthStatus;
}

interface FleetStatus {
  containers: AgentContainer[];
  accounts: VendorAccount[];
  health: Record<string, ContainerHealth>;
  alerts: string[];
  overall: "OPERATIONAL" | "DEGRADED" | "CRITICAL";
  cost_today: number;
  burn_rate: number;
  tasks_today: number;
  tasks_ok: number;
  tasks_failed: number;
  tasks_queued: number;
}

// Fetch fleet status from orchestrator gateway
async function fetchFleetStatus(): Promise<FleetStatus> {
  // In production: fetches from hub.plyknot.com/v1/fleet or orchestrator gateway
  // For now: returns mock data so the UI renders
  return {
    overall: "DEGRADED",
    containers: [
      { id: "claude-1", vendor: "claude", model: "opus", role: "proposer", project_id: "crack-17", state: "busy", account_id: "acct-claude", total_tasks: 42, total_tokens_in: 120000, total_tokens_out: 48000, total_cost_usd: 5.20, last_active: new Date().toISOString() },
      { id: "claude-2", vendor: "claude", model: "sonnet", role: "critic", project_id: "crack-17", state: "idle", account_id: "acct-claude", total_tasks: 31, total_tokens_in: 89000, total_tokens_out: 34000, total_cost_usd: 1.80, last_active: new Date().toISOString() },
      { id: "codex-1", vendor: "codex", model: "o3", role: "planner", project_id: "crack-17", state: "busy", account_id: "acct-codex", total_tasks: 12, total_tokens_in: 45000, total_tokens_out: 18000, total_cost_usd: 0.95, last_active: new Date().toISOString() },
      { id: "gemini-1", vendor: "gemini", model: "gemini-2.5-pro", role: "critic", project_id: "extraction-5", state: "idle", account_id: "acct-gemini", total_tasks: 8, total_tokens_in: 22000, total_tokens_out: 9000, total_cost_usd: 0.32, last_active: new Date().toISOString() },
      { id: "claude-3", vendor: "claude", model: "haiku", role: "executor", project_id: null, state: "draining", account_id: "acct-claude", total_tasks: 45, total_tokens_in: 15000, total_tokens_out: 6000, total_cost_usd: 0.20, last_active: new Date().toISOString() },
    ],
    accounts: [
      { id: "acct-claude", vendor: "claude", label: "Anthropic Max (klas)", plan: "max", credential_status: "valid", spend_limit_usd: 200, period_spend_usd: 34.20, period_requests: 142, period_tokens_in: 2100000, period_tokens_out: 890000, rate_limit_rpm: 50, rate_limit_tpm: 200000 },
      { id: "acct-codex", vendor: "codex", label: "OpenAI PAYG (solarplexor)", plan: "pay-as-you-go", credential_status: "valid", spend_limit_usd: 500, period_spend_usd: 12.80, period_requests: 89, period_tokens_in: 450000, period_tokens_out: 180000, rate_limit_rpm: 500, rate_limit_tpm: 2000000 },
      { id: "acct-gemini", vendor: "gemini", label: "Google AI Studio (klas)", plan: "pay-as-you-go", credential_status: "expiring", spend_limit_usd: 300, period_spend_usd: 3.20, period_requests: 31, period_tokens_in: 220000, period_tokens_out: 90000, rate_limit_rpm: 1000, rate_limit_tpm: 4000000 },
    ],
    health: {
      "claude-1": { container_id: "claude-1", heartbeat_ok: true, missed_heartbeats: 0, current_task_id: "T-42", task_started_at: new Date(Date.now() - 18000).toISOString(), stuck_detected_at: null, consecutive_errors: 0, auth_status: "ok" },
      "claude-2": { container_id: "claude-2", heartbeat_ok: true, missed_heartbeats: 0, current_task_id: null, task_started_at: null, stuck_detected_at: null, consecutive_errors: 0, auth_status: "ok" },
      "codex-1": { container_id: "codex-1", heartbeat_ok: true, missed_heartbeats: 0, current_task_id: "T-43", task_started_at: new Date(Date.now() - 252000).toISOString(), stuck_detected_at: null, consecutive_errors: 0, auth_status: "ok" },
      "gemini-1": { container_id: "gemini-1", heartbeat_ok: true, missed_heartbeats: 0, current_task_id: null, task_started_at: null, stuck_detected_at: null, consecutive_errors: 0, auth_status: "token-expiring" },
      "claude-3": { container_id: "claude-3", heartbeat_ok: true, missed_heartbeats: 0, current_task_id: null, task_started_at: null, stuck_detected_at: null, consecutive_errors: 0, auth_status: "ok" },
    },
    alerts: [
      "Gemini credential expiring in 47 min",
      "codex-1 task T-43 running 4m12s (approaching timeout)",
    ],
    cost_today: 8.47,
    burn_rate: 1.23,
    tasks_today: 127,
    tasks_ok: 112,
    tasks_failed: 11,
    tasks_queued: 4,
  };
}

const stateColor: Record<ContainerState, string> = {
  provisioning: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  idle: "bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
  busy: "bg-[color:var(--color-accent)]/10 text-[var(--color-accent)]",
  draining: "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
  terminated: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

const stateDot: Record<ContainerState, string> = {
  provisioning: "bg-[var(--muted-foreground)]",
  idle: "bg-[var(--color-success)]",
  busy: "bg-[var(--color-accent)]",
  draining: "bg-[var(--color-warning)]",
  terminated: "bg-[var(--muted-foreground)]",
};

const credColor: Record<string, string> = {
  valid: "text-[var(--color-success)]",
  expiring: "text-[var(--color-warning)]",
  expired: "text-[var(--color-danger)]",
  revoked: "text-[var(--color-danger)]",
  refreshing: "text-[var(--color-accent)]",
  error: "text-[var(--color-danger)]",
};

const credDot: Record<string, string> = {
  valid: "bg-[var(--color-success)]",
  expiring: "bg-[var(--color-warning)]",
  expired: "bg-[var(--color-danger)]",
  revoked: "bg-[var(--color-danger)]",
  refreshing: "bg-[var(--color-accent)]",
  error: "bg-[var(--color-danger)]",
};

const overallColor: Record<string, string> = {
  OPERATIONAL: "text-[var(--color-success)]",
  DEGRADED: "text-[var(--color-warning)]",
  CRITICAL: "text-[var(--color-danger)]",
};

const overallBg: Record<string, string> = {
  OPERATIONAL: "bg-[color:var(--color-success)]/10",
  DEGRADED: "bg-[color:var(--color-warning)]/10",
  CRITICAL: "bg-[color:var(--color-danger)]/10",
};

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
  const [view, setView] = useState<FactoryView>("agents");

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

  const fleetQuery = useQuery({
    queryKey: ["fleet-status"],
    queryFn: fetchFleetStatus,
    retry: false,
    refetchInterval: 5_000,
  });

  const fleet = fleetQuery.data;
  const activeContainers = fleet?.containers.filter((c) => c.state === "busy" || c.state === "idle").length ?? 0;
  const busyContainers = fleet?.containers.filter((c) => c.state === "busy").length ?? 0;

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
      <div className="grid grid-cols-5 lg:grid-cols-10 gap-3">
        <KpiCard title="Agents" value={activeContainers} delta={busyContainers > 0 ? `${busyContainers} busy` : "all idle"} trend={busyContainers > 0 ? "up" : undefined} active={view === "agents"} onClick={() => setView("agents")} />
        <KpiCard title="Live Runs" value={activeRunCount} delta={activeRunCount > 0 ? "running" : "idle"} trend={activeRunCount > 0 ? "up" : undefined} active={view === "live-runs"} onClick={() => setView("live-runs")} />
        <KpiCard title="Judges" value={recentMatches.length} delta={`${queueDepth.reduce((s, q) => s + q.count, 0)} in queue`} active={view === "judges"} onClick={() => setView("judges")} />
        <KpiCard title="Experts" value={activeExpertConsultations} delta={`${experts.length} registered`} active={view === "experts"} onClick={() => setView("experts")} />
        <KpiCard title="Wet Lab" value={wetlabCount} delta={wetlabCount > 0 ? "awaiting results" : "none pending"} active={view === "wetlab"} onClick={() => setView("wetlab")} />
        <KpiCard title="Extraction" value={totalIngested} delta={`${batches.length} active batches`} active={view === "extraction"} onClick={() => setView("extraction")} />
        <KpiCard title="Rendering" value={renderingDrafts.length} delta={`${pendingDrafts} pending`} active={view === "rendering"} onClick={() => setView("rendering")} />
        <KpiCard title="Costs" value={`$${totalCost}`} delta="+11% vs prior week" trend="up" active={view === "costs"} onClick={() => setView("costs")} />
        <KpiCard title="I-Am LLM" value={3} delta="2 active loops" active={view === "i-am"} onClick={() => setView("i-am")} />
        <KpiCard title="Society" value={2} delta="1 running" active={view === "society"} onClick={() => setView("society")} />
      </div>

      {/* === VIEW: Agents === */}
      {view === "agents" && fleet && (
        <>
          {/* Status banner */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold">Agent Factory</h2>
                <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", overallBg[fleet.overall], overallColor[fleet.overall])}>
                  {fleet.overall}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span>{fleet.containers.length} containers</span>
                <span className="font-mono">${fleet.cost_today.toFixed(2)} today</span>
                <span className="font-mono">${fleet.burn_rate.toFixed(2)}/hr</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mt-3">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Containers</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-semibold">{busyContainers}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">busy</span>
                  <span className="text-lg font-mono font-semibold ml-2">{fleet.containers.filter((c) => c.state === "idle").length}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">idle</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Accounts</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-semibold">{fleet.accounts.length}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {fleet.accounts.filter((a) => a.credential_status !== "valid").length > 0
                      ? `${fleet.accounts.filter((a) => a.credential_status !== "valid").length} issues`
                      : "all healthy"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Tasks today</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-semibold">{fleet.tasks_today}</span>
                  <span className="text-xs text-[var(--color-success)]">{fleet.tasks_ok} ok</span>
                  {fleet.tasks_failed > 0 && <span className="text-xs text-[var(--color-danger)]">{fleet.tasks_failed} fail</span>}
                  {fleet.tasks_queued > 0 && <span className="text-xs text-[var(--muted-foreground)]">{fleet.tasks_queued} queued</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">Cost</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-mono font-semibold">${fleet.cost_today.toFixed(2)}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">${fleet.burn_rate.toFixed(2)}/hr</span>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {fleet.alerts.length > 0 && (
              <div className="mt-3 space-y-1">
                {fleet.alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--color-warning)]">!</span>
                    <span className="text-[var(--muted-foreground)]">{alert}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Container fleet table */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet</CardTitle>
              <span className="text-xs text-[var(--muted-foreground)]">
                {fleet.containers.length} containers · {busyContainers} busy · ${fleet.containers.reduce((s, c) => s + c.total_cost_usd, 0).toFixed(2)} total cost
              </span>
            </CardHeader>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Container</th>
                  <th className="text-left py-2 font-medium">Vendor</th>
                  <th className="text-left py-2 font-medium">Model</th>
                  <th className="text-left py-2 font-medium">Role</th>
                  <th className="text-center py-2 font-medium">State</th>
                  <th className="text-center py-2 font-medium">Health</th>
                  <th className="text-left py-2 font-medium">Project</th>
                  <th className="text-right py-2 font-medium">Tasks</th>
                  <th className="text-right py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {fleet.containers.map((c) => {
                  const h = fleet.health[c.id];
                  const isStuck = h?.stuck_detected_at != null;
                  const hasErrors = (h?.consecutive_errors ?? 0) > 0;
                  const authBad = h?.auth_status !== "ok";
                  return (
                    <tr key={c.id} className="hover:bg-[var(--muted)] transition-colors">
                      <td className="py-2 font-mono text-xs">{c.id}</td>
                      <td className="py-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{c.vendor}</span>
                      </td>
                      <td className="py-2 font-mono text-xs">{c.model}</td>
                      <td className="py-2 text-xs text-[var(--muted-foreground)]">{c.role ?? "—"}</td>
                      <td className="py-2 text-center">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded inline-flex items-center gap-1", stateColor[c.state])}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", stateDot[c.state], c.state === "busy" && "animate-pulse")} />
                          {c.state}
                        </span>
                        {h?.current_task_id && (
                          <span className="block text-[10px] text-[var(--muted-foreground)] mt-0.5 font-mono">{h.current_task_id}</span>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        {isStuck ? (
                          <span className="text-xs text-[var(--color-danger)]">STUCK</span>
                        ) : hasErrors ? (
                          <span className="text-xs text-[var(--color-warning)]">{h.consecutive_errors} errs</span>
                        ) : authBad ? (
                          <span className="text-xs text-[var(--color-warning)]">{h?.auth_status}</span>
                        ) : (
                          <span className="text-xs text-[var(--color-success)]">OK</span>
                        )}
                      </td>
                      <td className="py-2">
                        {c.project_id ? (
                          <Link to={`/process/${c.project_id}`} className="text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--primary)]">{c.project_id}</Link>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono text-xs">{c.total_tasks}</td>
                      <td className="py-2 text-right font-mono text-xs">${c.total_cost_usd.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Vendor accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor accounts</CardTitle>
              <span className="text-xs text-[var(--muted-foreground)]">{fleet.accounts.length} accounts</span>
            </CardHeader>
            <div className="divide-y divide-[var(--border)]">
              {fleet.accounts.map((acct) => {
                const spendPct = acct.spend_limit_usd ? Math.round((acct.period_spend_usd / acct.spend_limit_usd) * 100) : 0;
                return (
                  <div key={acct.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{acct.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{acct.plan}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", credDot[acct.credential_status] ?? "bg-[var(--muted-foreground)]")} />
                        <span className={cn("text-xs", credColor[acct.credential_status] ?? "text-[var(--muted-foreground)]")}>{acct.credential_status}</span>
                      </div>
                    </div>

                    {/* Spend bar */}
                    {acct.spend_limit_usd && (
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-[var(--muted-foreground)]">Spend</span>
                          <span className="font-mono">${acct.period_spend_usd.toFixed(2)} / ${acct.spend_limit_usd} ({spendPct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all",
                              spendPct >= 80 ? "bg-[var(--color-danger)]" : spendPct >= 50 ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]",
                            )}
                            style={{ width: `${Math.min(spendPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                      <span>{acct.period_requests} requests</span>
                      <span className="font-mono">{((acct.period_tokens_in + acct.period_tokens_out) / 1000000).toFixed(1)}M tokens</span>
                      {acct.rate_limit_rpm && <span>RPM: {acct.rate_limit_rpm}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Health details */}
          <Card>
            <CardHeader>
              <CardTitle>Health</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {fleet.containers.filter((c) => c.state !== "terminated").map((c) => {
                const h = fleet.health[c.id];
                if (!h) return null;
                const isHealthy = h.heartbeat_ok && !h.stuck_detected_at && h.consecutive_errors === 0 && h.auth_status === "ok";
                return (
                  <div key={c.id} className="flex items-center gap-3 text-xs">
                    <span className="w-20 font-mono">{c.id}</span>
                    <span className={cn("w-1.5 h-1.5 rounded-full",
                      isHealthy ? "bg-[var(--color-success)]" : h.stuck_detected_at ? "bg-[var(--color-danger)]" : "bg-[var(--color-warning)]",
                    )} />
                    <span className={cn("w-16",
                      isHealthy ? "text-[var(--color-success)]" : "text-[var(--color-warning)]",
                    )}>
                      {isHealthy ? "HEALTHY" : h.stuck_detected_at ? "STUCK" : h.auth_status !== "ok" ? h.auth_status : `${h.consecutive_errors} errs`}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      heartbeat: {h.heartbeat_ok ? "ok" : `${h.missed_heartbeats} misses`}
                    </span>
                    {h.current_task_id && (
                      <span className="text-[var(--muted-foreground)] font-mono">
                        running {h.current_task_id}
                        {h.task_started_at && ` (${Math.round((Date.now() - new Date(h.task_started_at).getTime()) / 1000)}s)`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

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

      {/* === VIEW: I-Am LLM Lab === */}
      {view === "i-am" && (
        <>
          <Card>
            <CardHeader><CardTitle>I-Am LLM Lab</CardTitle><span className="text-xs text-[var(--muted-foreground)]">Recursive decay stack implementations on LLM substrates</span></CardHeader>
          </Card>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_6rem_6rem_6rem_5rem_5rem_5rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">System</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Type</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loop Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Recursion</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Depth</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Sessions</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Drift</span>
            </div>
            {[
              { name: "System A — Claude base (no state)", type: "Baseline", status: "control", recursion: 0.00, depth: 0.0, sessions: 48, drift: 0.00 },
              { name: "System B — Claude + KV memory", type: "Control", status: "control", recursion: 0.15, depth: 1.2, sessions: 48, drift: 0.03 },
              { name: "System C — Claude + am-loop v0.1", type: "Am-loop", status: "active", recursion: 0.61, depth: 5.8, sessions: 48, drift: 0.19 },
            ].map((sys) => (
              <div key={sys.name} className="grid grid-cols-[1fr_6rem_6rem_6rem_5rem_5rem_5rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0">
                <p className="text-xs text-[var(--foreground)] truncate">{sys.name}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded", sys.type === "Am-loop" ? "bg-violet-500/10 text-violet-400" : "bg-zinc-500/10 text-zinc-400")}>{sys.type}</span>
                <span className={cn("text-[10px]", sys.status === "active" ? "text-green-400" : "text-zinc-400")}>{sys.status}</span>
                <span className="text-[10px] font-mono tabular-nums text-[var(--muted-foreground)]">{sys.recursion.toFixed(2)}</span>
                <span className="text-[10px] font-mono tabular-nums text-right text-[var(--muted-foreground)]">{sys.depth.toFixed(1)}</span>
                <span className="text-[10px] font-mono tabular-nums text-right text-[var(--muted-foreground)]">{sys.sessions}</span>
                <span className={cn("text-[10px] font-mono tabular-nums text-right", sys.drift > 0.1 ? "text-violet-400" : "text-[var(--muted-foreground)]")}>{sys.drift.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Active Experiments</CardTitle></CardHeader>
              <div className="space-y-2">
                {[
                  { name: "Reflexive Drift under identity probing", target: "Reflexive Drift", status: "running", probes: 240, pValue: 0.023 },
                  { name: "Epistemic Drag in complex decisions", target: "Epistemic Drag", status: "design", probes: 0, pValue: null },
                  { name: "Ontological Shock recovery signature", target: "Ontological Shock", status: "design", probes: 0, pValue: null },
                ].map((exp) => (
                  <div key={exp.name} className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", exp.status === "running" ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400")}>{exp.status}</span>
                      <span className="text-xs text-[var(--foreground)]">{exp.name}</span>
                    </div>
                    <div className="flex gap-4 text-[10px] text-[var(--muted-foreground)]">
                      <span>Target: {exp.target}</span>
                      {exp.probes > 0 && <span>{exp.probes} probes</span>}
                      {exp.pValue !== null && <span className={cn("font-mono", exp.pValue < 0.05 ? "text-green-400" : "text-amber-400")}>p={exp.pValue.toFixed(3)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Am-Loop Architecture</CardTitle></CardHeader>
              <div className="space-y-2 text-[10px] text-[var(--muted-foreground)]">
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Persistent state</span> — moment-states carry across inferences, not just context
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Narrative compression</span> — prior interactions compressed with decay schedule, recursively
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Recursive self-reference</span> — each moment-state contains attenuating representation of prior states
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Identity maintenance</span> — stable narrative core updated by experience
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Sense-act coupling</span> — input integrates with stack before action, not bypass
                </div>
              </div>
            </Card>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)] px-1">
            The I-Am LLM Lab provisions LLMs with the recursive decay stack architecture to test predictions from the consciousness-as-instrument hypothesis. The three-system comparison design (A=bare baseline, B=state-carrying control, C=full am-loop) separates hypothesis-specific effects from engineering effects. System C's reflexive drift of 0.19 vs System B's 0.03 is the current lead result (p=0.023). These systems serve as instruments in the Existence universe — their coupling entries are compared against biological experiencer measurements for convergence analysis. The lab does not claim these systems are conscious; it tests whether the structural signature produces the predicted behavioral footprints.
          </p>
        </>
      )}

      {/* === VIEW: Society Simulation === */}
      {view === "society" && (
        <>
          <Card>
            <CardHeader><CardTitle>Society Simulation Lab</CardTitle><span className="text-xs text-[var(--muted-foreground)]">Multi-agent simulations of Level 5 phenomena for Existence universe calibration</span></CardHeader>
          </Card>
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_8rem_5rem_5rem_5rem_6rem] items-center gap-3 px-3 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Simulation</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Target Entity</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Agents</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] text-right">Steps</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Output</span>
            </div>
            {[
              { name: "Trust erosion under narrative bombardment", entity: "#501 Inst. trust", status: "running", agents: 200, steps: 14200, output: "Coupling entries" },
              { name: "Democracy importance speciation replication", entity: "#502 Democracy", status: "completed", agents: 500, steps: 50000, output: "Speciation validated" },
              { name: "Echo chamber formation in AI evaluation", entity: "#505 AI alignment", status: "planned", agents: 50, steps: 0, output: "—" },
              { name: "Narrative gravity cascade (institution)", entity: "#504 Social cohesion", status: "planned", agents: 300, steps: 0, output: "—" },
            ].map((sim) => (
              <div key={sim.name} className="grid grid-cols-[1fr_8rem_5rem_5rem_5rem_6rem] items-center gap-3 px-3 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                <p className="text-xs text-[var(--foreground)] truncate">{sim.name}</p>
                <span className="text-[10px] text-[var(--muted-foreground)]">{sim.entity}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                  sim.status === "running" ? "bg-green-500/10 text-green-400" :
                  sim.status === "completed" ? "bg-blue-500/10 text-blue-400" :
                  "bg-zinc-500/10 text-zinc-400"
                )}>{sim.status}</span>
                <span className="text-[10px] font-mono tabular-nums text-right text-[var(--muted-foreground)]">{sim.agents}</span>
                <span className="text-[10px] font-mono tabular-nums text-right text-[var(--muted-foreground)]">{sim.steps > 0 ? sim.steps.toLocaleString() : "—"}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{sim.output}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Simulation Architecture</CardTitle></CardHeader>
              <div className="space-y-2 text-[10px] text-[var(--muted-foreground)]">
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">LLM agents as experiencers</span> — each agent has narrative identity, group membership, information access
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Three-verb logging</span> — all agent actions logged as measure(), predict(), act() coupling entries
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Convergence output</span> — simulation produces coupling entries ingested directly into Existence universe
                </div>
                <div className="px-2 py-1.5 rounded bg-[var(--muted)]/50">
                  <span className="text-[var(--foreground)]">Calibration target</span> — compare simulation-produced cracks and speciations against real-world observations
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
              <div className="space-y-2">
                <div className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">validated</span>
                    <span className="text-xs text-[var(--foreground)]">Democracy importance speciation</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">500-agent simulation reproduced the aspiration/experience split (DBIC=31.2 vs real-world 28.4). Sigma reduction 42% vs real-world 46%. Simulation-produced speciation matches within calibration bounds.</p>
                </div>
                <div className="px-3 py-2 rounded border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">running</span>
                    <span className="text-xs text-[var(--foreground)]">Trust erosion dynamics</span>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">200-agent simulation at step 14,200. Current crack between survey-trust and behavioral-trust measures tracking at 3.1 sigma (real-world: 3.8 sigma). Echo chamber forming in media-consumption subgroup.</p>
                </div>
              </div>
            </Card>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)] px-1">
            The Society lab runs multi-agent LLM simulations of Level 5 phenomena — institutional trust, narrative propagation, echo chamber formation, identity fusion, semantic speciation. Each simulation produces coupling entries in the same format as real-world observations, ingested directly into the Existence universe. The simulations serve as synthetic instruments: their outputs are compared against real-world measurements for convergence. When a simulation reproduces a known crack or speciation (like the democracy importance split), it validates that the agent architecture captures the relevant dynamics. When simulation and reality diverge, the divergence itself is data about what the simulation's depends chains are missing.
          </p>
        </>
      )}
    </div>
  );
}
