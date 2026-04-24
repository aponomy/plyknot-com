import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckSquare } from "lucide-react";
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

interface Manifest { folders: SynthesisFolder[] }
interface IndexMeta { title: string; status: string; body: string }

/* ── API ────────────────────────────────────────────────────────────── */

async function fetchManifest(): Promise<Manifest> {
  const r = await fetch("/research/manifest"); return r.json();
}
async function fetchPapersManifest(): Promise<{ papers: SynthesisFolder[] }> {
  const r = await fetch("/research/papers"); return r.json();
}
async function fetchFile(folder: string, file: string): Promise<string> {
  const r = await fetch(`/research/files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  return (await r.json()).content;
}
async function fetchPaperFile(folder: string, file: string): Promise<string> {
  const r = await fetch(`/research/paper-files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  return (await r.json()).content;
}

function parseIndexMeta(content: string): IndexMeta {
  let title = "", status = "idea", body = content;
  const fm = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fm) {
    body = fm[2].trim();
    const t = fm[1].match(/title:\s*(.+)/); if (t) title = t[1].trim();
    const s = fm[1].match(/status:\s*(.+)/); if (s) status = s[1].trim();
  }
  if (!title) { const h = body.match(/^#\s+(.+)/m); title = h ? h[1] : "Untitled"; }
  return { title, status, body };
}

function parseTodoStats(content: string) {
  const lines = content.split("\n").filter((l) => l.match(/^- \[[ x]\]/));
  return { total: lines.length, done: lines.filter((l) => l.startsWith("- [x]")).length, lines };
}

/* ── Markdown renderer ──────────────────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/^#### (.+)$/gm, '<h4 class="text-xs font-semibold mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="text-[10px] px-1 py-0.5 rounded bg-[var(--muted)] font-mono">$1</code>')
    .replace(/^\- \[x\] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-green-400">&#9745;</span><span class="line-through text-[var(--muted-foreground)]">$1</span></div>')
    .replace(/^\- \[ \] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-[var(--muted-foreground)]">&#9744;</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex items-start gap-1.5 py-0.5"><span class="text-[var(--muted-foreground)] shrink-0">&bull;</span><span>$1</span></div>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[var(--muted)] pl-3 py-1 text-[var(--muted-foreground)] italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-[var(--border)] my-3" />')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br />");
  return <div className="text-xs leading-relaxed text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── Tab toggle ─────────────────────────────────────────────────────── */

type ResearchTab = "synthesis" | "papers";

function TabToggle({ value, onChange }: { value: ResearchTab; onChange: (t: ResearchTab) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-[var(--muted)] p-0.5">
      {(["synthesis", "papers"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize",
            value === t
              ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ── Paper labels ───────────────────────────────────────────────────── */

const PAPER_LABELS: Record<string, string> = {
  flagship: "Flagship Paper",
  "satellite-1-cxr": "S1: CXR Medical AI",
  "satellite-2-text": "S2: Text as Sensor",
  "satellite-3-materials": "S3: Materials & Pharma",
  "satellite-4-alphafold": "S4: AlphaFold Echo Chambers",
  "satellite-5-emergence": "S5: Emergence",
  "satellite-6": "S6: Cross-Vendor Clustering",
};

/* ════════════════════════════════════════════════════════════════════════
   Main Research page — three-column layout
   Column 1: folder cards (narrow)
   Column 2: file list + todo (medium)
   Column 3: file content (wide)
   ════════════════════════════════════════════════════════════════════════ */

type Col2View = "files" | "todo";

export function ResearchPage() {
  const [tab, setTab] = useState<ResearchTab>("synthesis");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ folder: string; file: string } | null>(null);
  const [col2View, setCol2View] = useState<Col2View>("files");

  const { data: synthData } = useQuery({ queryKey: ["research-manifest"], queryFn: fetchManifest });
  const { data: papersData } = useQuery({ queryKey: ["papers-manifest"], queryFn: fetchPapersManifest });

  const synthFolders = synthData?.folders ?? [];
  const paperFolders = papersData?.papers ?? [];
  const folders = tab === "synthesis" ? synthFolders : paperFolders;

  const folderCards = useMemo(() => folders.map((f) => {
    const isPaper = tab === "papers";
    const meta = isPaper
      ? { title: PAPER_LABELS[f.folder] || f.folder, status: "active", body: "" }
      : f.indexContent ? parseIndexMeta(f.indexContent) : null;
    const todoStats = f.todoContent ? parseTodoStats(f.todoContent) : null;
    return { folder: f, meta, todoStats };
  }), [folders, tab]);

  const activeFolder = selectedFolder ? folders.find((f) => f.folder === selectedFolder) : null;
  const allFiles = activeFolder ? [...activeFolder.files, ...(activeFolder.subFiles || [])] : [];

  // Auto-select first folder on load / tab change
  useEffect(() => {
    if (folders.length > 0 && !selectedFolder) {
      setSelectedFolder(folders[0].folder);
    }
  }, [folders, selectedFolder]);

  // Auto-select first file when folder changes
  useEffect(() => {
    if (activeFolder && allFiles.length > 0) {
      setSelectedFile({ folder: activeFolder.folder, file: allFiles[0] });
    }
  }, [activeFolder?.folder]); // eslint-disable-line react-hooks/exhaustive-deps

  // File content query
  const fetchFn = tab === "synthesis" ? fetchFile : fetchPaperFile;
  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ["research-file-content", tab, selectedFile?.folder, selectedFile?.file],
    queryFn: () => fetchFn(selectedFile!.folder, selectedFile!.file),
    enabled: !!selectedFile,
  });

  function handleSelectFolder(folder: string) {
    setSelectedFolder(folder);
    setSelectedFile(null);
    setCol2View("files");
  }

  function handleTabChange(t: ResearchTab) {
    setTab(t);
    setSelectedFolder(null);
    setSelectedFile(null);
    setCol2View("files");
  }

  const activeMeta = activeFolder?.indexContent ? parseIndexMeta(activeFolder.indexContent) : null;
  const activeTodo = activeFolder?.todoContent ? parseTodoStats(activeFolder.todoContent) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Research</h1>
        <TabToggle value={tab} onChange={handleTabChange} />
      </div>

      {/* Three-column layout — each column scrolls independently */}
      <div className="flex gap-4 overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>

        {/* Column 1: Folder cards */}
        <div className="w-[17rem] shrink-0 space-y-1.5 overflow-y-auto pr-1">
          {folderCards.map(({ folder, meta, todoStats }) => {
            const isActive = selectedFolder === folder.folder;
            const statusColor =
              meta?.status === "active" ? "bg-green-500/10 text-green-400" :
              meta?.status === "completed" ? "bg-blue-500/10 text-blue-400" :
              meta?.status === "paused" ? "bg-amber-500/10 text-amber-400" :
              "bg-zinc-500/10 text-zinc-400";

            return (
              <button
                key={folder.folder}
                onClick={() => handleSelectFolder(folder.folder)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-colors",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn("text-[9px] px-1 py-0.5 rounded", statusColor)}>
                    {meta?.status || "idea"}
                  </span>
                  <span className="text-[9px] text-[var(--muted-foreground)] ml-auto">{folder.fileCount}</span>
                </div>
                <p className="text-[11px] font-medium text-[var(--foreground)] line-clamp-2 leading-tight">
                  {meta?.title || folder.folder}
                </p>
                {todoStats && todoStats.total > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(todoStats.done / todoStats.total) * 100}%` }} />
                    </div>
                    <span className="text-[8px] text-[var(--muted-foreground)] tabular-nums">{todoStats.done}/{todoStats.total}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Column 2: Files or Todo (toggled) */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
          {!activeFolder ? (
            <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Select a topic</p>
          ) : (
            <div className="space-y-2">
              {/* Title + toggle */}
              <h2 className="text-sm font-semibold line-clamp-1">
                {tab === "papers" ? PAPER_LABELS[activeFolder.folder] || activeFolder.folder : activeMeta?.title || activeFolder.folder}
              </h2>

              {/* Files / Todo toggle */}
              {activeFolder.todoContent && (
                <div className="flex items-center rounded-md bg-[var(--muted)] p-0.5">
                  <button
                    onClick={() => setCol2View("files")}
                    className={cn(
                      "flex-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors text-center",
                      col2View === "files"
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)]",
                    )}
                  >
                    Files ({allFiles.length})
                  </button>
                  <button
                    onClick={() => setCol2View("todo")}
                    className={cn(
                      "flex-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors text-center",
                      col2View === "todo"
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)]",
                    )}
                  >
                    Todo ({activeTodo?.done}/{activeTodo?.total})
                  </button>
                </div>
              )}

              {/* File list */}
              {col2View === "files" && allFiles.length > 0 && (
                <div>
                  {allFiles.map((file) => {
                    const isFileActive = selectedFile?.file === file && selectedFile?.folder === activeFolder.folder;
                    return (
                      <button
                        key={file}
                        onClick={() => setSelectedFile({ folder: activeFolder.folder, file })}
                        className={cn(
                          "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors",
                          isFileActive
                            ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                            : "hover:bg-[var(--muted)]/50 text-[var(--muted-foreground)]",
                        )}
                      >
                        <FileText size={10} className="shrink-0" />
                        <span className="truncate">{file.replace(/\.md$/, "")}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Todo list */}
              {col2View === "todo" && activeFolder.todoContent && (
                <div className="text-[10px] leading-tight [&_div]:py-px">
                  <MarkdownContent content={activeFolder.todoContent} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 3: File content */}
        <div className="flex-1 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
          {!selectedFile ? (
            <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">
              {activeFolder ? "Select a document to read" : ""}
            </p>
          ) : fileLoading ? (
            <p className="text-xs text-[var(--muted-foreground)] py-4">Loading...</p>
          ) : fileContent ? (
            <div>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-3">
                {selectedFile.folder} / {selectedFile.file}
              </p>
              <MarkdownContent content={fileContent} />
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">File not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
