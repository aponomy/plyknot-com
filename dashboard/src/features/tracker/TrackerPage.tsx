import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ChevronDown } from "lucide-react";
import {
  fetchTrackerCategories,
  fetchTrackerThemes,
  fetchTrackerTheme,
  fetchTrackerStats,
  fetchTrackerComments,
  createTrackerComment,
  createTrackerIssue,
  updateTrackerIssue,
  deleteTrackerIssue,
  markTrackerIssueDone,
  type TrackerTheme,
  type TrackerIssue,
} from "../../lib/hub-api";

/* ── Tracker-specific color tokens (from dashboard.html) ────────────────── */

const C = {
  p0: "#dc2626", p0Bg: "#fef2f2",
  p1: "#71717a", p1Bg: "#f4f4f5",
  p2: "#a1a1aa", p2Bg: "#f4f4f5",
  doing: "#6366f1", doingBg: "#e0e7ff",
  done: "#16a34a", doneBg: "#dcfce7",
  todo: "#71717a",
  accent: "#6366f1", accentBg: "#e0e7ff",
  danger: "#dc2626",
} as const;

/* ── Constants ──────────────────────────────────────────────────────────── */

const TOTAL_WEEKS = 13;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WK_W = 45; // week cell width in px
const OV_W = 55; // overflow column width
const LABEL_W = 340;
const CAT_ICONS: Record<string, string> = {
  "plyknot-com": "🏢", "research-lab": "🔬", cybernetics: "🤖",
  "plyknot-org": "🌐", research: "📄", "ip-legal": "⚖️", other: "📁",
};

/* ── Week helpers ───────────────────────────────────────────────────────── */

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const d = new Date(now); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function weekIndex(dateStr: string | null, ws: Date): number | null {
  if (!dateStr) return null;
  const wk = Math.floor((new Date(dateStr).getTime() - ws.getTime()) / WEEK_MS);
  if (wk < 0) return -1;
  if (wk >= TOTAL_WEEKS) return TOTAL_WEEKS;
  return wk;
}

function weekToDate(ws: Date, wi: number): string {
  const d = new Date(ws); d.setDate(d.getDate() + wi * 7);
  return d.toISOString().slice(0, 10);
}

function getISOWeek(d: Date): number {
  const dt = new Date(d.getTime()); dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const w1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

interface WeekCol { label: string; weekNum: number }
function getWeekHeaders(ws: Date): WeekCol[] {
  const cols: WeekCol[] = [];
  const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let last = -1;
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const d = new Date(ws); d.setDate(ws.getDate() + w * 7);
    const m = d.getMonth();
    cols.push({ label: m !== last ? mn[m] : "", weekNum: getISOWeek(d) });
    last = m;
  }
  return cols;
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function TrackerPage() {
  const qc = useQueryClient();
  const ws = useMemo(() => getWeekStart(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const wkH = useMemo(() => getWeekHeaders(ws), [ws]);

  const [selTheme, setSelTheme] = useState<string | null>(null);
  const [selIssue, setSelIssue] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("trk-collapsed-cats") ?? "[]")); } catch { return new Set(); }
  });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("trk-collapsed-secs") ?? "[]")); } catch { return new Set(); }
  });
  const [moving, setMoving] = useState<TrackerIssue | null>(null);
  const [filters, setFilters] = useState({ todo: true, doing: true, done: false, P0: true, P1: true, P2: true, nd: true });
  const [viewOpen, setViewOpen] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; issue: TrackerIssue } | null>(null);
  const [priPick, setPriPick] = useState<{ x: number; y: number; issue: TrackerIssue } | null>(null);
  const [clog, setClog] = useState<string[]>([]);
  const [clExp, setClExp] = useState(false);
  const [clInline, setClInline] = useState("");

  /* Queries */
  const { data: catD } = useQuery({ queryKey: ["trk-cat"], queryFn: fetchTrackerCategories });
  const { data: themeD } = useQuery({ queryKey: ["trk-themes"], queryFn: () => fetchTrackerThemes() });
  const { data: detail, isLoading: detailLoading } = useQuery({ queryKey: ["trk-detail", selTheme], queryFn: () => fetchTrackerTheme(selTheme!), enabled: !!selTheme });
  const { data: statsD } = useQuery({ queryKey: ["trk-stats"], queryFn: fetchTrackerStats });
  const cats = catD?.categories ?? [];
  const themes = themeD?.themes ?? [];
  const issues = detail?.issues ?? [];
  const stats = statsD;

  const selectedIssue = useMemo(() => issues.find(i => i.id === selIssue) ?? null, [issues, selIssue]);

  const inv = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["trk-cat"] });
    qc.invalidateQueries({ queryKey: ["trk-themes"] });
    qc.invalidateQueries({ queryKey: ["trk-detail", selTheme] });
    qc.invalidateQueries({ queryKey: ["trk-stats"] });
  }, [qc, selTheme]);

  const addCl = useCallback((t: string) => { if (t.trim()) setClog(p => [...p, t.trim()]); }, []);

  /* ── Direct DB mutations ──────────────────────────────────────────────── */

  const chgPri = async (iss: TrackerIssue, np: string) => {
    if (iss.priority !== np) { await updateTrackerIssue(iss.id, { priority: np as TrackerIssue["priority"] }); inv(); }
    setPriPick(null);
  };

  const chgStatus = async (iss: TrackerIssue, ns: string) => {
    ns === "done" ? await markTrackerIssueDone(iss.id) : await updateTrackerIssue(iss.id, { status: ns as TrackerIssue["status"] });
    inv(); setCtx(null);
  };

  const doDelete = async (iss: TrackerIssue) => {
    await deleteTrackerIssue(iss.id);
    if (selIssue === iss.id) setSelIssue(null);
    inv(); setCtx(null);
  };

  const chgDeadline = async (iss: TrackerIssue, wi: number) => {
    const nd = weekToDate(ws, wi);
    await updateTrackerIssue(iss.id, { target_date: nd }); inv();
  };

  const addNew = async () => {
    if (!selTheme) return;
    const t = prompt("Issue title:"); if (!t?.trim()) return;
    await createTrackerIssue({ theme_id: selTheme, title: t.trim(), priority: "P2" }); inv();
  };

  const saveDetail = async (id: string, data: Partial<Pick<TrackerIssue, "title" | "description" | "section" | "priority" | "status" | "target_date">>) => {
    await updateTrackerIssue(id, data); inv();
  };

  const startMove = (iss: TrackerIssue) => { setMoving(iss); setSelIssue(null); };

  const moveToTheme = async (targetThemeId: string) => {
    if (!moving) return;
    await updateTrackerIssue(moving.id, { theme_id: targetThemeId });
    setMoving(null);
    inv();
  };

  // Existing sections in the currently selected theme (for dropdown)
  const existingSections = useMemo(() => {
    const secs = new Set<string>();
    for (const i of issues) { if (i.section) secs.add(i.section); }
    return [...secs].sort();
  }, [issues]);

  /* Filter + sort */
  const sorted = useMemo(() => {
    const f = issues.filter(i => {
      if (i.status === "todo" && !filters.todo) return false;
      if (i.status === "doing" && !filters.doing) return false;
      if (i.status === "done" && !filters.done) return false;
      if (i.priority === "P0" && !filters.P0) return false;
      if (i.priority === "P1" && !filters.P1) return false;
      if (i.priority === "P2" && !filters.P2) return false;
      if (!i.target_date && !filters.nd) return false;
      return true;
    });
    return [...f].sort((a, b) => {
      if (a.status === "doing" && b.status !== "doing") return -1;
      if (b.status === "doing" && a.status !== "doing") return 1;
      if (a.status === "done") return 1; if (b.status === "done") return -1;
      const pa = a.priority === "-" ? "Z" : a.priority;
      const pb = b.priority === "-" ? "Z" : b.priority;
      return pa.localeCompare(pb) || (a.target_date || "Z").localeCompare(b.target_date || "Z");
    });
  }, [issues, filters]);

  // Group issues by section (null section = unsectioned, rendered first)
  const groupedIssues = useMemo(() => {
    const groups: Array<{ section: string | null; issues: TrackerIssue[] }> = [];
    const sectionMap = new Map<string | null, TrackerIssue[]>();
    const sectionOrder: (string | null)[] = [];
    for (const iss of sorted) {
      const s = iss.section ?? null;
      if (!sectionMap.has(s)) { sectionMap.set(s, []); sectionOrder.push(s); }
      sectionMap.get(s)!.push(iss);
    }
    for (const s of sectionOrder) {
      groups.push({ section: s, issues: sectionMap.get(s)! });
    }
    return groups;
  }, [sorted]);

  const togSection = (s: string) => setCollapsedSections(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); localStorage.setItem("trk-collapsed-secs", JSON.stringify([...n])); return n; });

  const bycat = useMemo(() => {
    const m = new Map<string, TrackerTheme[]>();
    for (const t of themes) { const a = m.get(t.category_slug) ?? []; a.push(t); m.set(t.category_slug, a); }
    return m;
  }, [themes]);

  /* Dismiss popups */
  useEffect(() => {
    const h = () => { setCtx(null); setPriPick(null); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  const togCat = (s: string) => setCollapsed(p => { const n = new Set(p); n.has(s) ? n.delete(s) : n.add(s); localStorage.setItem("trk-collapsed-cats", JSON.stringify([...n])); return n; });
  const tog = (k: keyof typeof filters) => setFilters(f => ({ ...f, [k]: !f[k] }));

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col -m-6" style={{ height: "calc(100vh - 48px)", fontSize: 13 }}>
      {/* Header */}
      <div className="flex items-center h-11 px-4 gap-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 14, fontWeight: 600 }}>Plyknot Roadmap</h1>
        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          {stats ? `${sorted.length} visible / ${stats.total} total · ${stats.done} done` : ""}
        </span>
        <button onClick={addNew} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>+ New</button>
        <div style={{ position: "relative" }}>
          <button onClick={e => { e.stopPropagation(); setViewOpen(v => !v); }} style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>View ▾</button>
          {viewOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "6px 0", minWidth: 180, fontSize: 12, zIndex: 300 }}>
              {([["todo","Todo"],["doing","Doing"],["done","Done"]] as const).map(([k,l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={filters[k]} onChange={() => tog(k)} style={{ accentColor: C.accent }} /> {l}
                </label>
              ))}
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              {([["P0","P0 (critical)"],["P1","P1 (important)"],["P2","P2 (normal)"]] as const).map(([k,l]) => (
                <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", cursor: "pointer" }}>
                  <input type="checkbox" checked={filters[k]} onChange={() => tog(k)} style={{ accentColor: C.accent }} /> {l}
                </label>
              ))}
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 14px", cursor: "pointer" }}>
                <input type="checkbox" checked={filters.nd} onChange={() => tog("nd")} style={{ accentColor: C.accent }} /> No deadline
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 min-h-0">
        {/* ── Nav column ──────────────────────────────────────────────────── */}
        <div style={{ width: 240, minWidth: 240, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: moving ? C.accent : "var(--muted-foreground)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {moving ? (
              <><span>Click destination theme</span><button onClick={() => setMoving(null)} style={{ marginLeft: "auto", border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 11 }}>Cancel</button></>
            ) : "Navigation"}
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cats.map(cat => {
              const ct = bycat.get(cat.slug) ?? [];
              const col = collapsed.has(cat.slug);
              return (
                <div key={cat.slug}>
                  <div onClick={() => togCat(cat.slug)} style={{ padding: "7px 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }}>
                    {col ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                    <span style={{ fontSize: 12 }}>{CAT_ICONS[cat.slug]||"📁"}</span>
                    {cat.slug.toUpperCase()}
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-foreground)", background: "color-mix(in srgb, var(--border) 50%, transparent)", padding: "1px 5px", borderRadius: 8 }}>{cat.issue_count}</span>
                  </div>
                  {!col && ct.map(th => {
                    const sel = selTheme === th.id;
                    return (
                      <div key={th.id} onClick={() => { if (moving) { moveToTheme(th.id); } else { setSelTheme(th.id); setSelIssue(null); } }}
                        style={{ padding: "5px 12px 5px 30px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid color-mix(in srgb, var(--border) 30%, transparent)",
                          ...(sel && !moving ? { background: C.accentBg, color: C.accent, fontWeight: 600 } : {}),
                          ...(moving ? { outline: `1px dashed ${C.accent}`, outlineOffset: -1 } : {}) }}>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{th.title}</span>
                        <span style={{ display: "flex", gap: 3 }}>
                          <NBadge n={0} bg={C.doingBg} fg={C.doing} />
                          <NBadge n={0} bg={C.p0Bg} fg={C.p0} />
                          <NBadge n={th.done_count} bg={C.doneBg} fg={C.done} />
                          <NBadge n={th.issue_count} bg="color-mix(in srgb, var(--border) 50%, transparent)" fg="var(--muted-foreground)" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Content: issues + timeline ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          {selTheme && detail ? (
            <div style={{ minWidth: "fit-content" }}>
              {/* Sticky header */}
              <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", background: "var(--muted)", borderBottom: "1px solid var(--border)", height: 36, minWidth: "fit-content" }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" }}>
                  {detail.title}
                </div>
                <div style={{ display: "flex" }}>
                  {wkH.map((wk, i) => (
                    <div key={i} style={{ width: WK_W, minWidth: WK_W, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>
                      {wk.label && <div style={{ fontWeight: 600 }}>{wk.label}</div>}
                      <div style={{ fontSize: 9 }}>{wk.weekNum}</div>
                    </div>
                  ))}
                  <div style={{ width: OV_W, minWidth: OV_W, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500, flexShrink: 0, borderLeft: "1px solid var(--border)" }}>30+</div>
                </div>
              </div>

              {/* Theme section header */}
              <div style={{ display: "flex", background: "var(--muted)", borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", minWidth: "fit-content" }}>
                <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "5px 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" }}>
                  {detail.title} <span style={{ fontWeight: 400 }}>{detail.done_count}/{detail.issue_count} done</span>
                </div>
                <div style={{ display: "flex" }}>
                  {wkH.map((_, i) => <div key={i} style={{ width: WK_W, minWidth: WK_W, flexShrink: 0, borderRight: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }} />)}
                  <div style={{ width: OV_W, minWidth: OV_W, flexShrink: 0, borderLeft: "1px solid var(--border)" }} />
                </div>
              </div>

              {/* Issue rows grouped by section */}
              {groupedIssues.map(group => {
                const secCollapsed = group.section !== null && collapsedSections.has(group.section);
                return (
                  <div key={group.section ?? "__none__"}>
                    {/* Section sub-header (only if section is set) */}
                    {group.section !== null && (
                      <div onClick={() => togSection(group.section!)}
                        style={{ display: "flex", background: "var(--muted)", borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", minWidth: "fit-content", cursor: "pointer" }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "4px 12px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                          {secCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          {group.section}
                          <span style={{ fontWeight: 400, marginLeft: 4 }}>
                            {group.issues.filter(i => i.status === "done").length}/{group.issues.length}
                          </span>
                        </div>
                        <div style={{ display: "flex" }}>
                          {wkH.map((_, i) => <div key={i} style={{ width: WK_W, minWidth: WK_W, flexShrink: 0, borderRight: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }} />)}
                          <div style={{ width: OV_W, minWidth: OV_W, flexShrink: 0, borderLeft: "1px solid var(--border)" }} />
                        </div>
                      </div>
                    )}

                    {/* Issues in this section */}
                    {!secCollapsed && group.issues.map(iss => {
                      const wi = weekIndex(iss.target_date, ws);
                      const overdue = !!iss.target_date && iss.target_date < today && iss.status !== "done";
                      const diamondColor = overdue ? C.danger : iss.status === "doing" ? C.doing : iss.status === "done" ? C.done : C.todo;
                      const isSel = selIssue === iss.id;

                      return (
                        <div key={iss.id}
                          onClick={() => setSelIssue(iss.id)}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, issue: iss }); }}
                          style={{
                            display: "flex", borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", minHeight: 32, minWidth: "fit-content", cursor: "pointer",
                            ...(iss.status === "doing" ? { boxShadow: `inset 3px 0 0 ${C.doing}` } : {}),
                            ...(iss.status === "done" ? { opacity: 0.5 } : {}),
                            ...(overdue ? { background: C.p0Bg } : {}),
                            ...(isSel ? { background: C.accentBg } : {}),
                          }}>
                          {/* Label */}
                          <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, borderRight: "1px solid var(--border)" }}>
                            {iss.priority.match(/^P[012]$/) && (
                              <span onClick={e => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setPriPick({ x: r.left, y: r.bottom + 4, issue: iss }); }}
                                style={{ fontSize: 9, fontWeight: 700, padding: "0 4px", borderRadius: 2, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", userSelect: "none",
                                  background: iss.priority === "P0" ? C.p0Bg : iss.priority === "P1" ? C.p1Bg : C.p2Bg,
                                  color: iss.priority === "P0" ? C.p0 : iss.priority === "P1" ? C.p1 : C.p2 }}>
                                {iss.priority}
                              </span>
                            )}
                            <span style={{ flex: 1, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                              ...(iss.status === "done" ? { textDecoration: "line-through", color: "var(--muted-foreground)" } : {}),
                              ...(overdue ? { color: C.danger } : {}) }}>
                              {iss.title}
                            </span>
                            {iss.target_date && (
                              <span style={{ fontSize: 10, whiteSpace: "nowrap", flexShrink: 0, color: overdue ? C.danger : "var(--muted-foreground)", ...(overdue ? { fontWeight: 600 } : {}) }}>
                                {iss.target_date.slice(5)}
                              </span>
                            )}
                          </div>

                          {/* Week cells */}
                          <div style={{ display: "flex", alignItems: "center" }}>
                            {wkH.map((_, w) => (
                              <div key={w} onDoubleClick={e => { e.stopPropagation(); chgDeadline(iss, w); }}
                                style={{ width: WK_W, minWidth: WK_W, height: "100%", flexShrink: 0, borderRight: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", position: "relative" }}>
                                {((wi !== null && wi === w) || (wi === -1 && w === 0)) && (
                                  <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", borderRadius: 2, background: diamondColor, cursor: "grab" }}
                                    title={`${iss.target_date} · ${iss.priority}`} />
                                )}
                              </div>
                            ))}
                            <div style={{ width: OV_W, minWidth: OV_W, height: "100%", flexShrink: 0, borderLeft: "1px solid var(--border)", position: "relative" }}>
                              {wi !== null && wi >= TOTAL_WEEKS && (
                                <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, transform: "translate(-50%,-50%) rotate(45deg)", borderRadius: 2, background: diamondColor }} title={`${iss.target_date} · ${iss.priority}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {sorted.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>No matching issues</div>}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", fontSize: 12 }}>
              {selTheme && detailLoading ? "Loading…" : "Select a theme"}
            </div>
          )}
        </div>

        {/* ── Detail panel (right column) ──────────────────────────────────── */}
        {selectedIssue && (
          <IssueDetailPanel
            issue={selectedIssue}
            existingSections={existingSections}
            onSave={saveDetail}
            onDelete={doDelete}
            onMove={startMove}
            onClose={() => setSelIssue(null)}
          />
        )}
      </div>

      {/* ── Changelog footer (instructions only) ──────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", fontSize: 12, zIndex: 200, height: clExp ? 240 : 36, transition: "height 0.2s", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", height: 36, flexShrink: 0, borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }}>
          {!clExp && (
            <input style={{ flex: 1, border: "none", outline: "none", padding: "0 12px", fontSize: 12, fontFamily: "inherit", color: "var(--foreground)", background: "transparent", height: "100%" }}
              placeholder="Type instruction…"
              value={clInline} onChange={e => setClInline(e.target.value)}
              onFocus={() => setClExp(true)}
              onKeyDown={e => { if (e.key === "Enter") { addCl(clInline); setClInline(""); } }} />
          )}
          <span onClick={() => setClExp(v => !v)} style={{ padding: "0 12px", fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap", cursor: "pointer" }}>
            {clog.length} note{clog.length !== 1 ? "s" : ""}
          </span>
          <button onClick={() => { navigator.clipboard.writeText("# Tracker notes\n\n" + clog.map((c,i) => `${i+1}. ${c}`).join("\n")); }}
            style={{ padding: "0 12px", height: "100%", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit", borderLeft: "1px solid var(--border)", background: C.accent, color: "white" }}>Copy</button>
          <button onClick={() => setClog([])}
            style={{ padding: "0 12px", height: "100%", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "inherit", borderLeft: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)" }}>Clear</button>
          {clExp && <button onClick={() => setClExp(false)} style={{ marginLeft: "auto", padding: "0 12px", height: "100%", border: "none", cursor: "pointer", fontSize: 14, background: "transparent", color: "var(--muted-foreground)" }}>▼</button>}
        </div>
        {clExp && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px", fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
              {clog.map((c, i) => (
                <div key={i} style={{ padding: "2px 0", borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{i+1}.</span>
                  <span style={{ flex: 1 }}>{c}</span>
                  <button onClick={() => setClog(p => p.filter((_,j) => j !== i))} style={{ flexShrink: 0, width: 16, height: 16, border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", flexShrink: 0 }}>
              <textarea rows={2} placeholder="Type a note…" style={{ width: "100%", border: "none", outline: "none", padding: "8px 12px", fontSize: 12, fontFamily: "inherit", color: "var(--foreground)", background: "transparent", resize: "none" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCl((e.target as HTMLTextAreaElement).value); (e.target as HTMLTextAreaElement).value = ""; } }} />
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctx && <>
        <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setCtx(null)} />
        <div style={{ position: "fixed", zIndex: 300, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "4px 0", minWidth: 160, fontSize: 12, left: ctx.x, top: Math.min(ctx.y, window.innerHeight - 180) }}>
          {ctx.issue.status === "doing" && <CItem label="⏸ Set to Todo" onClick={() => chgStatus(ctx.issue, "todo")} />}
          {ctx.issue.status === "todo" && <CItem label="▶ Set to Doing" onClick={() => chgStatus(ctx.issue, "doing")} />}
          {ctx.issue.status === "done" && <CItem label="↩ Reopen" onClick={() => chgStatus(ctx.issue, "todo")} />}
          {ctx.issue.status !== "done" && <CItem label="✓ Mark done" onClick={() => chgStatus(ctx.issue, "done")} />}
          <div style={{ height: 1, background: "color-mix(in srgb, var(--border) 50%, transparent)", margin: "4px 0" }} />
          <CItem label="📝 Add note" onClick={() => { setClExp(true); setCtx(null); }} />
          <CItem label="📋 Copy path" onClick={() => { navigator.clipboard.writeText(`${selTheme}/${ctx.issue.title}`); setCtx(null); }} />
          <div style={{ height: 1, background: "color-mix(in srgb, var(--border) 50%, transparent)", margin: "4px 0" }} />
          <CItem label="🗑 Delete" onClick={() => doDelete(ctx.issue)} danger />
        </div>
      </>}

      {/* Priority picker */}
      {priPick && <>
        <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setPriPick(null)} />
        <div style={{ position: "fixed", zIndex: 300, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: 4, display: "flex", gap: 2, left: priPick.x, top: priPick.y }}>
          {([["P0",C.p0Bg,C.p0],["P1",C.p1Bg,C.p1],["P2",C.p2Bg,C.p2],["-","color-mix(in srgb, var(--border) 50%, transparent)","var(--muted-foreground)"]] as const).map(([p,bg,fg]) => (
            <span key={p} onClick={e => { e.stopPropagation(); chgPri(priPick.issue, p); }}
              style={{ padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 700, background: bg, color: fg }}>
              {p === "-" ? "—" : p}
            </span>
          ))}
        </div>
      </>}
    </div>
  );
}

/* ── Issue Detail Panel ───────────────────────────────────────────────────── */

const PANEL_W = 380;

function IssueDetailPanel({ issue, existingSections, onSave, onDelete, onMove, onClose }: {
  issue: TrackerIssue;
  existingSections: string[];
  onSave: (id: string, data: Partial<Pick<TrackerIssue, "title" | "description" | "section" | "priority" | "status" | "target_date">>) => Promise<void>;
  onDelete: (iss: TrackerIssue) => Promise<void>;
  onMove: (iss: TrackerIssue) => void;
  onClose: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [secDropOpen, setSecDropOpen] = useState(false);
  const qc = useQueryClient();
  const [title, setTitle] = useState(issue.title);
  const [desc, setDesc] = useState(issue.description ?? "");
  const [section, setSection] = useState(issue.section ?? "");
  const [priority, setPriority] = useState(issue.priority);
  const [status, setStatus] = useState(issue.status);
  const [targetDate, setTargetDate] = useState(issue.target_date ?? "");
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  // Comments query
  const { data: commentsData } = useQuery({
    queryKey: ["trk-comments", issue.id],
    queryFn: () => fetchTrackerComments(issue.id),
  });
  const comments = commentsData?.comments ?? [];

  // Sync when switching issues
  useEffect(() => {
    setTitle(issue.title);
    setDesc(issue.description ?? "");
    setSection(issue.section ?? "");
    setPriority(issue.priority);
    setStatus(issue.status);
    setTargetDate(issue.target_date ?? "");
    setNewComment("");
  }, [issue.id, issue.title, issue.description, issue.section, issue.priority, issue.status, issue.target_date]);

  const dirty = title !== issue.title || desc !== (issue.description ?? "") || section !== (issue.section ?? "") || priority !== issue.priority || status !== issue.status || targetDate !== (issue.target_date ?? "");

  const save = async () => {
    setSaving(true);
    const data: Partial<Pick<TrackerIssue, "title" | "description" | "section" | "priority" | "status" | "target_date">> = {};
    if (title !== issue.title) data.title = title;
    if (desc !== (issue.description ?? "")) data.description = desc || null;
    if (section !== (issue.section ?? "")) data.section = section || null;
    if (priority !== issue.priority) data.priority = priority;
    if (status !== issue.status) data.status = status;
    if (targetDate !== (issue.target_date ?? "")) data.target_date = targetDate || null;
    if (Object.keys(data).length) await onSave(issue.id, data);
    setSaving(false);
  };

  const postComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    await createTrackerComment(issue.id, newComment.trim());
    setNewComment("");
    qc.invalidateQueries({ queryKey: ["trk-comments", issue.id] });
    setPosting(false);
  };

  const FL: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: 4 };
  const FI: React.CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 12, fontFamily: "inherit", border: "1px solid var(--border)", borderRadius: 4, background: "var(--background)", color: "var(--foreground)", outline: "none" };

  return (
    <div style={{ width: PANEL_W, minWidth: PANEL_W, borderLeft: "1px solid var(--border)", background: "var(--card)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, position: "relative" }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>Issue detail</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(v => !v)} style={{ border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>⋯</button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "4px 0", minWidth: 140, fontSize: 12, zIndex: 300 }}>
                <CItem label="Move to…" onClick={() => { setMenuOpen(false); onMove(issue); }} />
                <CItem label="Delete" onClick={() => { setMenuOpen(false); onDelete(issue); }} danger />
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
        </div>
      </div>

      {/* Scrollable body: form + comments */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Form fields */}
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={FL}>ID</div>
            <input readOnly value={issue.id} onClick={e => (e.target as HTMLInputElement).select()}
              style={{ ...FI, fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)", cursor: "text", background: "var(--muted)" }} />
          </div>
          <div>
            <div style={FL}>Title</div>
            <textarea rows={2} value={title} onChange={e => setTitle(e.target.value)} style={{ ...FI, resize: "vertical" }} />
          </div>
          <div>
            <div style={FL}>Description</div>
            <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description…" style={{ ...FI, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <div style={FL}>Section</div>
              <div style={{ position: "relative" }}>
                <input value={section} onChange={e => { setSection(e.target.value); setSecDropOpen(true); }}
                  onFocus={() => { if (existingSections.length > 0) setSecDropOpen(true); }}
                  onBlur={() => setTimeout(() => setSecDropOpen(false), 150)}
                  placeholder="Sub-group…" style={FI} />
                {secDropOpen && existingSections.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 2, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 4, boxShadow: "0 4px 8px rgba(0,0,0,0.1)", maxHeight: 120, overflowY: "auto", zIndex: 10 }}>
                    {existingSections.filter(s => !section || s.toLowerCase().includes(section.toLowerCase())).map(s => (
                      <div key={s} onMouseDown={e => { e.preventDefault(); setSection(s); setSecDropOpen(false); }}
                        style={{ padding: "4px 8px", fontSize: 11, cursor: "pointer", background: s === section ? C.accentBg : undefined }}
                        onMouseEnter={e => { if (s !== section) e.currentTarget.style.background = "var(--muted)"; }}
                        onMouseLeave={e => { if (s !== section) e.currentTarget.style.background = ""; }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={FL}>Target date</div>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={FI} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div>
              <div style={FL}>Priority</div>
              <div style={{ display: "flex", gap: 3 }}>
                {(["P0", "P1", "P2", "-"] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700, cursor: "pointer",
                      border: priority === p ? `2px solid ${C.accent}` : "2px solid transparent",
                      background: p === "P0" ? C.p0Bg : p === "P1" ? C.p1Bg : p === "P2" ? C.p2Bg : "var(--muted)",
                      color: p === "P0" ? C.p0 : p === "P1" ? C.p1 : p === "P2" ? C.p2 : "var(--muted-foreground)" }}>
                    {p === "-" ? "—" : p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={FL}>Status</div>
              <div style={{ display: "flex", gap: 3 }}>
                {(["todo", "doing", "done"] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ padding: "3px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                      border: status === s ? `2px solid ${C.accent}` : "2px solid transparent",
                      background: s === "doing" ? C.doingBg : s === "done" ? C.doneBg : C.p1Bg,
                      color: s === "doing" ? C.doing : s === "done" ? C.done : C.todo }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
            Created: {issue.created_at?.slice(0, 10)} · Updated: {issue.updated_at?.slice(0, 10)}
          </div>
        </div>

        {/* Save bar */}
        <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={save} disabled={!dirty || saving}
            style={{ width: "100%", padding: "5px 0", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 600, cursor: dirty ? "pointer" : "default",
              background: dirty ? C.accent : "var(--muted)", color: dirty ? "white" : "var(--muted-foreground)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Comments section */}
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={FL}>
            Comments{comments.length > 0 ? ` (${comments.length})` : ""}
          </div>

          {comments.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>No comments yet</div>
          )}

          {comments.map(c => (
            <div key={c.id} style={{ padding: "8px 10px", borderRadius: 6, background: "var(--muted)", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{c.author ?? "unknown"}</span>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{formatCommentDate(c.created_at)}</span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, color: "var(--foreground)" }}>{c.body}</div>
            </div>
          ))}

          {/* Add comment */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <textarea
              rows={2}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postComment(); } }}
              style={{ ...FI, resize: "vertical", fontSize: 12 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={postComment} disabled={!newComment.trim() || posting}
                style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 600, cursor: newComment.trim() ? "pointer" : "default",
                  background: newComment.trim() ? C.accent : "var(--muted)", color: newComment.trim() ? "white" : "var(--muted-foreground)", opacity: posting ? 0.6 : 1 }}>
                {posting ? "Posting…" : "Comment"}
              </button>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>⌘↵ to post</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toISOString().slice(0, 10);
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function NBadge({ n, bg, fg }: { n: number; bg: string; fg: string }) {
  return (
    <span style={{ width: 18, height: 18, borderRadius: "50%", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: fg, opacity: n === 0 ? 0.3 : 1 }}>
      {n}
    </span>
  );
}

function CItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return <div onClick={onClick} style={{ padding: "6px 14px", cursor: "pointer", ...(danger ? { color: C.danger } : {}) }}
    onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")} onMouseLeave={e => (e.currentTarget.style.background = "")}>{label}</div>;
}
