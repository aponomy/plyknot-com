import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Pin, FileText, CheckSquare, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

/* ── Types ──────────────────────────────────────────────────────────── */

interface SynthesisFolder {
  folder: string;
  hasIndex: boolean;
  hasTodo: boolean;
  indexFile: string | null;
  todoFile: string | null;
  files: string[];
  fileCount: number;
}

interface Manifest {
  folders: SynthesisFolder[];
}

/* ── API ────────────────────────────────────────────────────────────── */

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch("/research/manifest");
  if (!res.ok) throw new Error("Failed to fetch research manifest");
  return res.json();
}

async function fetchFile(folder: string, file: string): Promise<string> {
  const res = await fetch(`/research/files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  if (!res.ok) throw new Error(`Failed to fetch ${folder}/${file}`);
  const data = await res.json();
  return data.content;
}

/* ── Markdown renderer (minimal) ────────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  // Very basic markdown → HTML: headers, bold, italic, lists, links, code
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
      className="text-xs leading-relaxed text-[var(--foreground)] prose-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Todo list from markdown ────────────────────────────────────────── */

function TodoList({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.match(/^- \[[ x]\]/));
  const done = lines.filter((l) => l.startsWith("- [x]")).length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CheckSquare size={12} className="text-[var(--muted-foreground)]" />
        <span className="text-[10px] text-[var(--muted-foreground)]">{done}/{lines.length} done</span>
      </div>
      <div className="space-y-0.5 text-[10px]">
        {lines.slice(0, 8).map((line, i) => {
          const isDone = line.startsWith("- [x]");
          const text = line.replace(/^- \[[ x]\] /, "");
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className={isDone ? "text-green-400" : "text-[var(--muted-foreground)]"}>
                {isDone ? "\u2611" : "\u2610"}
              </span>
              <span className={cn("truncate", isDone && "line-through text-[var(--muted-foreground)]")}>
                {text}
              </span>
            </div>
          );
        })}
        {lines.length > 8 && (
          <span className="text-[var(--muted-foreground)]">+{lines.length - 8} more</span>
        )}
      </div>
    </div>
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

/* ── Folder card ────────────────────────────────────────────────────── */

function FolderCard({
  folder,
  onOpenFile,
}: {
  folder: SynthesisFolder;
  onOpenFile: (folder: string, file: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Fetch index.md content if present
  const { data: indexContent } = useQuery({
    queryKey: ["research-file", folder.folder, folder.indexFile],
    queryFn: () => fetchFile(folder.folder, folder.indexFile!),
    enabled: !!folder.indexFile,
  });

  // Fetch todo.md content if present
  const { data: todoContent } = useQuery({
    queryKey: ["research-file", folder.folder, folder.todoFile],
    queryFn: () => fetchFile(folder.folder, folder.todoFile!),
    enabled: !!folder.todoFile,
  });

  // Extract first paragraph from index for summary
  const summary = indexContent
    ? indexContent.split("\n\n").find((p) => p.trim() && !p.startsWith("#"))?.slice(0, 200)
    : null;

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--muted)]/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--muted-foreground)] shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-[var(--muted-foreground)] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{folder.folder}</p>
          {summary && !expanded && (
            <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)] shrink-0">
          {folder.hasIndex && <span className="px-1.5 py-0.5 rounded bg-[var(--muted)]">Index</span>}
          {folder.hasTodo && <span className="px-1.5 py-0.5 rounded bg-[var(--muted)]">Todo</span>}
          <span>{folder.fileCount} files</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] space-y-3">
          {/* Index content */}
          {indexContent && (
            <div className="pt-3">
              <MarkdownContent content={indexContent} />
            </div>
          )}

          {/* Todo list */}
          {todoContent && (
            <div className="pt-2">
              <TodoList content={todoContent} />
            </div>
          )}

          {/* File list */}
          {folder.files.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                Documents ({folder.files.length})
              </p>
              <div className="space-y-0.5">
                {folder.files.map((file) => (
                  <button
                    key={file}
                    onClick={() => onOpenFile(folder.folder, file)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--muted)]/50 transition-colors text-xs"
                  >
                    <FileText size={12} className="text-[var(--muted-foreground)] shrink-0" />
                    <span className="text-[var(--foreground)] truncate">{file.replace(/\.md$/, "")}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-auto shrink-0">.md</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Research page
   ════════════════════════════════════════════════════════════════════════ */

export function ResearchPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["research-manifest"],
    queryFn: fetchManifest,
  });

  const [drawerFile, setDrawerFile] = useState<{ folder: string; file: string } | null>(null);
  const closeDrawer = useCallback(() => setDrawerFile(null), []);

  const folders = data?.folders ?? [];

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Research</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Synthesis notes from research/notes/synthesis &mdash; {folders.length} topics, {folders.reduce((n, f) => n + f.fileCount, 0)} documents
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Loading research manifest...</p>
      ) : folders.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">No synthesis folders found.</p>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.folder}
              folder={folder}
              onOpenFile={(f, file) => setDrawerFile({ folder: f, file })}
            />
          ))}
        </div>
      )}

      {/* File drawer */}
      {drawerFile && (
        <FileDrawer
          folder={drawerFile.folder}
          file={drawerFile.file}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
