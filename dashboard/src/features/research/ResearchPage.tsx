import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, CheckSquare, ArrowLeft } from "lucide-react";
import { KpiCard } from "../../components/ui/kpi-card";
import { cn } from "../../lib/utils";

/* ── Types ──────────────────────────────────────────────────────────── */

interface SynthesisFolder {
  folder: string;
  indexFile: string | null;
  todoFile: string | null;
  indexContent: string | null;
  todoContent: string | null;
  files: string[];
  subFiles?: string[];
  fileCount: number;
}

interface Manifest {
  folders: SynthesisFolder[];
}

interface IndexMeta {
  title: string;
  status: string;
  body: string;
}

/* ── API ────────────────────────────────────────────────────────────── */

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch("/research/manifest");
  if (!res.ok) throw new Error("Failed to fetch research manifest");
  return res.json();
}

async function fetchPapersManifest(): Promise<{ papers: SynthesisFolder[] }> {
  const res = await fetch("/research/papers");
  if (!res.ok) throw new Error("Failed to fetch papers manifest");
  return res.json();
}

async function fetchFile(folder: string, file: string): Promise<string> {
  const res = await fetch(`/research/files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error(`Failed to fetch ${folder}/${file}`);
  const data = await res.json();
  return data.content;
}

async function fetchPaperFile(folder: string, file: string): Promise<string> {
  const res = await fetch(`/research/paper-files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error(`Failed to fetch ${folder}/${file}`);
  const data = await res.json();
  return data.content;
}

function parseIndexMeta(content: string): IndexMeta {
  let title = "";
  let status = "idea";
  let body = content;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const fm = fmMatch[1];
    body = fmMatch[2].trim();
    const titleMatch = fm.match(/title:\s*(.+)/);
    const statusMatch = fm.match(/status:\s*(.+)/);
    if (titleMatch) title = titleMatch[1].trim();
    if (statusMatch) status = statusMatch[1].trim();
  }
  if (!title) {
    const h1 = body.match(/^#\s+(.+)/m);
    title = h1 ? h1[1] : "Untitled";
  }
  return { title, status, body };
}

function parseTodoStats(content: string) {
  const lines = content.split("\n").filter((l) => l.match(/^- \[[ x]\]/));
  const done = lines.filter((l) => l.startsWith("- [x]")).length;
  return { total: lines.length, done, lines };
}

/* ── Markdown renderer ──────────────────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^#### (.+)$/gm, '<h4 class="text-xs font-semibold mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="text-[10px] px-1 py-0.5 rounded bg-[var(--muted)] font-mono">$1</code>')
    .replace(/^\- \[x\] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-green-400">&#9745;</span><span class="line-through text-[var(--muted-foreground)]">$1</span></div>')
    .replace(/^\- \[ \] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-[var(--muted-foreground)]">&#9744;</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex items-start gap-1.5 py-0.5"><span class="text-[var(--muted-foreground)] shrink-0">&bull;</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="flex items-start gap-1.5 py-0.5 pl-2"><span>$1</span></div>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[var(--muted)] pl-3 py-1 text-[var(--muted-foreground)] italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-[var(--border)] my-3" />')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br />');
  return (
    <div
      className="text-xs leading-relaxed text-[var(--foreground)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── File drawer ────────────────────────────────────────────────────── */

function FileDrawer({ folder, file, onClose }: { folder: string; file: string; onClose: () => void }) {
  const { data: content, isLoading } = useQuery({
    queryKey: ["research-file", folder, file],
    queryFn: () => fetchFile(folder, file),
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[640px] max-w-[90vw] bg-[var(--background)] border-l border-[var(--border)] z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-5 py-3 flex items-center gap-3 z-10">
          <FileText size={14} className="text-[var(--muted-foreground)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{file}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{folder}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">
          {isLoading ? (
            <p className="text-xs text-[var(--muted-foreground)]">Loading...</p>
          ) : content ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">File not found.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Topic detail page ──────────────────────────────────────────────── */

function TopicDetail({
  folder,
  onBack,
  onOpenFile,
}: {
  folder: SynthesisFolder;
  onBack: () => void;
  onOpenFile: (folder: string, file: string) => void;
}) {
  const meta = folder.indexContent ? parseIndexMeta(folder.indexContent) : null;
  const todoContent = folder.todoContent;
  const todoStats = todoContent ? parseTodoStats(todoContent) : null;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={14} /> Back to Research
      </button>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{meta?.title || folder.folder}</h2>
        {meta?.status && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded",
            meta.status === "active" ? "bg-green-500/10 text-green-400" :
            meta.status === "completed" ? "bg-blue-500/10 text-blue-400" :
            meta.status === "paused" ? "bg-amber-500/10 text-amber-400" :
            "bg-zinc-500/10 text-zinc-400",
          )}>
            {meta.status}
          </span>
        )}
      </div>

      {/* Index content */}
      {meta?.body && (
        <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] px-4 py-3">
          <MarkdownContent content={meta.body} />
        </div>
      )}

      {/* Todo + Documents side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Todo list */}
        {todoContent && todoStats ? (
          <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={14} className="text-[var(--muted-foreground)]" />
              <span className="text-sm font-semibold">Todo</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{todoStats.done}/{todoStats.total} done</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden ml-2">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: todoStats.total > 0 ? `${(todoStats.done / todoStats.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <MarkdownContent content={todoContent} />
          </div>
        ) : <div />}

        {/* Document list */}
        {folder.files.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] overflow-hidden self-start">
            <div className="px-4 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Documents ({folder.files.length})
              </span>
            </div>
            {folder.files.map((file) => (
              <button
                key={file}
                onClick={() => onOpenFile(folder.folder, file)}
                className="w-full text-left flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
              >
                <FileText size={12} className="text-[var(--muted-foreground)] shrink-0" />
                <span className="text-xs text-[var(--foreground)] truncate">{file.replace(/\.md$/, "")}</span>
                <span className="text-[10px] text-[var(--muted-foreground)] ml-auto shrink-0">
                  {file.endsWith(".svg") ? ".svg" : ".md"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Research page — KPI boxes overview
   ════════════════════════════════════════════════════════════════════════ */

/* ── Tab toggle (same style as Universe DataSourceToggle) ───────────── */

type ResearchTab = "synthesis" | "papers";

function TabToggle({ value, onChange }: { value: ResearchTab; onChange: (t: ResearchTab) => void }) {
  const tabs: { value: ResearchTab; label: string }[] = [
    { value: "synthesis", label: "Synthesis" },
    { value: "papers", label: "Papers" },
  ];
  return (
    <div className="flex items-center rounded-lg bg-[var(--muted)] p-0.5">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === t.value
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Folder card (shared by synthesis and papers) ───────────────────── */

function FolderCardGrid({
  items,
  onSelect,
}: {
  items: { folder: SynthesisFolder; meta: IndexMeta | null; todoStats: ReturnType<typeof parseTodoStats> | null }[];
  onSelect: (folder: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ folder, meta, todoStats }) => {
        const statusBadge = meta?.status === "active"
          ? { bg: "bg-green-500/10", text: "text-green-400" }
          : meta?.status === "completed"
          ? { bg: "bg-blue-500/10", text: "text-blue-400" }
          : meta?.status === "paused"
          ? { bg: "bg-amber-500/10", text: "text-amber-400" }
          : { bg: "bg-zinc-500/10", text: "text-zinc-400" };

        return (
          <button
            key={folder.folder}
            onClick={() => onSelect(folder.folder)}
            className="text-left rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--primary)]/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", statusBadge.bg, statusBadge.text)}>
                {meta?.status || "idea"}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                {folder.fileCount} docs
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-1 line-clamp-1">
              {meta?.title || folder.folder}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed mb-2">
              {meta?.body?.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 120) || "No description"}
            </p>
            {todoStats && todoStats.total > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${(todoStats.done / todoStats.total) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-[var(--muted-foreground)] tabular-nums">
                  {todoStats.done}/{todoStats.total}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Paper detail (like TopicDetail but reads from paper-files) ──────── */

function PaperDetail({
  folder,
  onBack,
  onOpenFile,
}: {
  folder: SynthesisFolder;
  onBack: () => void;
  onOpenFile: (folder: string, file: string) => void;
}) {
  const todoContent = folder.todoContent;
  const todoStats = todoContent ? parseTodoStats(todoContent) : null;
  const allFiles = [...folder.files, ...(folder.subFiles || [])];

  const PAPER_LABELS: Record<string, string> = {
    flagship: "Flagship Paper",
    "satellite-1-cxr": "Satellite 1: CXR Medical AI",
    "satellite-2-text": "Satellite 2: Text as Sensor",
    "satellite-3-materials": "Satellite 3: Materials & Pharma",
    "satellite-4-alphafold": "Satellite 4: AlphaFold Echo Chambers",
    "satellite-5-emergence": "Satellite 5: Emergence & Thermodynamic Bounds",
    "satellite-6": "Satellite 6: Cross-Vendor Clustering",
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={14} /> Back to Papers
      </button>

      <h2 className="text-lg font-semibold">{PAPER_LABELS[folder.folder] || folder.folder}</h2>

      {/* Todo + Documents side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {todoContent && todoStats ? (
          <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={14} className="text-[var(--muted-foreground)]" />
              <span className="text-sm font-semibold">Todo</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{todoStats.done}/{todoStats.total} done</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden ml-2">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: todoStats.total > 0 ? `${(todoStats.done / todoStats.total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <MarkdownContent content={todoContent} />
          </div>
        ) : <div />}

        {allFiles.length > 0 && (
          <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] overflow-hidden self-start">
            <div className="px-4 py-2 bg-[var(--muted)]/50 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Documents ({allFiles.length})
              </span>
            </div>
            {allFiles.map((file) => (
              <button
                key={file}
                onClick={() => onOpenFile(folder.folder, file)}
                className="w-full text-left flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
              >
                <FileText size={12} className="text-[var(--muted-foreground)] shrink-0" />
                <span className="text-xs text-[var(--foreground)] truncate">{file.replace(/\.md$/, "")}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Paper file drawer ──────────────────────────────────────────────── */

function PaperFileDrawer({ folder, file, onClose }: { folder: string; file: string; onClose: () => void }) {
  const { data: content, isLoading } = useQuery({
    queryKey: ["paper-file", folder, file],
    queryFn: () => fetchPaperFile(folder, file),
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[640px] max-w-[90vw] bg-[var(--background)] border-l border-[var(--border)] z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-5 py-3 flex items-center gap-3 z-10">
          <FileText size={14} className="text-[var(--muted-foreground)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{file}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{folder}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4">
          {isLoading ? (
            <p className="text-xs text-[var(--muted-foreground)]">Loading...</p>
          ) : content ? (
            <MarkdownContent content={content} />
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">File not found.</p>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Research page
   ════════════════════════════════════════════════════════════════════════ */

export function ResearchPage() {
  const [tab, setTab] = useState<ResearchTab>("synthesis");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [drawerFile, setDrawerFile] = useState<{ folder: string; file: string; source: "synthesis" | "papers" } | null>(null);
  const closeDrawer = useCallback(() => setDrawerFile(null), []);

  const { data: synthData, isLoading: synthLoading } = useQuery({
    queryKey: ["research-manifest"],
    queryFn: fetchManifest,
  });

  const { data: papersData, isLoading: papersLoading } = useQuery({
    queryKey: ["papers-manifest"],
    queryFn: fetchPapersManifest,
  });

  const synthFolders = synthData?.folders ?? [];
  const paperFolders = papersData?.papers ?? [];

  const synthCards = useMemo(() => synthFolders.map((f) => ({
    folder: f,
    meta: f.indexContent ? parseIndexMeta(f.indexContent) : null,
    todoStats: f.todoContent ? parseTodoStats(f.todoContent) : null,
  })), [synthFolders]);

  const paperCards = useMemo(() => paperFolders.map((f) => {
    const PAPER_LABELS: Record<string, string> = {
      flagship: "Flagship Paper",
      "satellite-1-cxr": "S1: CXR Medical AI",
      "satellite-2-text": "S2: Text as Sensor",
      "satellite-3-materials": "S3: Materials & Pharma",
      "satellite-4-alphafold": "S4: AlphaFold Echo Chambers",
      "satellite-5-emergence": "S5: Emergence",
      "satellite-6": "S6: Cross-Vendor Clustering",
    };
    const todoStats = f.todoContent ? parseTodoStats(f.todoContent) : null;
    return {
      folder: f,
      meta: { title: PAPER_LABELS[f.folder] || f.folder, status: "active", body: "" } as IndexMeta,
      todoStats,
    };
  }), [paperFolders]);

  // Detail views
  const activeSynthFolder = tab === "synthesis" && selectedFolder ? synthFolders.find((f) => f.folder === selectedFolder) : null;
  const activePaperFolder = tab === "papers" && selectedFolder ? paperFolders.find((f) => f.folder === selectedFolder) : null;

  if (activeSynthFolder) {
    return (
      <div className="max-w-5xl">
        <TopicDetail
          folder={activeSynthFolder}
          onBack={() => setSelectedFolder(null)}
          onOpenFile={(f, file) => setDrawerFile({ folder: f, file, source: "synthesis" })}
        />
        {drawerFile && (
          <FileDrawer folder={drawerFile.folder} file={drawerFile.file} onClose={closeDrawer} />
        )}
      </div>
    );
  }

  if (activePaperFolder) {
    return (
      <div className="max-w-5xl">
        <PaperDetail
          folder={activePaperFolder}
          onBack={() => setSelectedFolder(null)}
          onOpenFile={(f, file) => setDrawerFile({ folder: f, file, source: "papers" })}
        />
        {drawerFile && (
          <PaperFileDrawer folder={drawerFile.folder} file={drawerFile.file} onClose={closeDrawer} />
        )}
      </div>
    );
  }

  const isLoading = tab === "synthesis" ? synthLoading : papersLoading;
  const cards = tab === "synthesis" ? synthCards : paperCards;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Research</h1>
        <TabToggle value={tab} onChange={(t) => { setTab(t); setSelectedFolder(null); }} />
      </div>

      {isLoading ? (
        <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Loading...</p>
      ) : (
        <FolderCardGrid
          items={cards}
          onSelect={(folder) => setSelectedFolder(folder)}
        />
      )}
    </div>
  );
}
