import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckSquare, MessageSquare, ChevronRight } from "lucide-react";
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
  chatMeta?: Array<{ num: number; title: string }>;
}

interface Manifest { folders: SynthesisFolder[] }
interface IndexMeta { title: string; status: string; body: string; chats: number[] }

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
interface ChatData {
  number: number;
  title: string;
  summaryContent: string | null;
  fullContent: string | null;
}

async function fetchChat(num: number): Promise<ChatData> {
  const r = await fetch(`/research/chat/${num}`);
  return r.json();
}

async function fetchPaperFile(folder: string, file: string): Promise<string> {
  const r = await fetch(`/research/paper-files/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`);
  return (await r.json()).content;
}

function parseIndexMeta(content: string): IndexMeta {
  let title = "", status = "idea", body = content;
  let chats: number[] = [];
  const fm = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fm) {
    body = fm[2].trim();
    const t = fm[1].match(/title:\s*(.+)/); if (t) title = t[1].trim();
    const s = fm[1].match(/status:\s*(.+)/); if (s) status = s[1].trim();
    const c = fm[1].match(/chat:\s*(.+)/);
    if (c) {
      const raw = c[1].trim();
      if (raw.startsWith("[")) {
        chats = raw.replace(/[[\]]/g, "").split(",").map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
      } else {
        const n = parseInt(raw); if (!isNaN(n)) chats = [n];
      }
    }
  }
  if (!title) { const h = body.match(/^#\s+(.+)/m); title = h ? h[1] : "Untitled"; }
  return { title, status, body, chats };
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

/* ── Parsed todo item ────────────────────────────────────────────────── */

interface TodoItem {
  idx: number;
  done: boolean;
  label: string;
  priority: string | null;  // P0, P1, P2, etc.
  phase: string | null;     // Phase 1, Phase 2, etc.
  date: string | null;      // [may], [jun], etc.
  description: string | null;
}

function parseTodoItems(content: string): TodoItem[] {
  const lines = content.split("\n");
  const items: TodoItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \[( |x)\] (.+)$/);
    if (!m) continue;
    const done = m[1] === "x";
    let raw = m[2];

    // Extract priority (P0:, P1:, etc.)
    const prioMatch = raw.match(/^(P\d):\s*/);
    const priority = prioMatch ? prioMatch[1] : null;
    if (prioMatch) raw = raw.slice(prioMatch[0].length);

    // Extract phase
    const phaseMatch = raw.match(/^(Phase\s+[\d.]+[a-z]?):\s*/i);
    const phase = phaseMatch ? phaseMatch[1] : null;
    if (phaseMatch) raw = raw.slice(phaseMatch[0].length);

    // Extract date from [xxx] at end
    const dateMatch = raw.match(/\s*\[([^\]]+)\]\s*$/);
    const date = dateMatch ? dateMatch[1] : null;
    if (dateMatch) raw = raw.slice(0, dateMatch.index);

    // Collect description lines (indented > lines following)
    const descLines: string[] = [];
    while (i + 1 < lines.length && lines[i + 1].match(/^\s+>/)) {
      descLines.push(lines[i + 1].replace(/^\s+>\s?/, ""));
      i++;
    }

    items.push({
      idx: items.length,
      done,
      label: raw.trim(),
      priority,
      phase,
      date,
      description: descLines.length > 0 ? descLines.join(" ") : null,
    });
  }
  return items;
}

/* ── Todo list (clickable, sorted: open first, done last) ────────────── */

function TodoList({ content, selectedIdx, onSelect }: { content: string; selectedIdx: number | null; onSelect: (idx: number) => void }) {
  const items = useMemo(() => parseTodoItems(content), [content]);
  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);
  const sorted = [...open, ...done];

  return (
    <div>
      {sorted.map((item) => {
        const isActive = selectedIdx === item.idx;
        return (
          <button
            key={item.idx}
            onClick={() => onSelect(item.idx)}
            className={cn(
              "w-full text-left flex items-start gap-1.5 py-[3px] text-[11px] leading-tight rounded px-1 transition-colors",
              isActive ? "bg-[var(--primary)]/10" : "hover:bg-[var(--muted)]/30",
            )}
          >
            <span className={cn("shrink-0 mt-px", item.done ? "text-green-400" : "text-[var(--muted-foreground)]")}>
              {item.done ? "\u2611" : "\u2610"}
            </span>
            <span className={cn("flex-1", item.done && "line-through text-[var(--muted-foreground)]")}>
              {item.priority && <span className={cn(
                "font-mono mr-1",
                item.priority === "P0" ? "text-red-400" : item.priority === "P1" ? "text-amber-400" : "text-[var(--muted-foreground)]",
              )}>{item.priority}</span>}
              {item.label}
            </span>
            {item.date && (
              <span className="text-[9px] text-[var(--muted-foreground)] shrink-0 mt-px">{item.date}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Todo detail (shown in column 3) ─────────────────────────────────── */

function TodoDetail({ content, idx }: { content: string; idx: number }) {
  const items = useMemo(() => parseTodoItems(content), [content]);
  const item = items[idx];
  if (!item) return <p className="text-xs text-[var(--muted-foreground)]">Todo not found.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{item.label}</h2>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-2">
        {item.priority && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-mono",
            item.priority === "P0" ? "bg-red-500/10 text-red-400" :
            item.priority === "P1" ? "bg-amber-500/10 text-amber-400" :
            "bg-zinc-500/10 text-zinc-400",
          )}>
            {item.priority}
          </span>
        )}
        {item.phase && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">
            {item.phase}
          </span>
        )}
        {item.date && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
            {item.date}
          </span>
        )}
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded",
          item.done ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400",
        )}>
          {item.done ? "done" : "open"}
        </span>
      </div>

      {/* Description */}
      {item.description ? (
        <div className="border-l-2 border-[var(--border)] pl-3">
          <p className="text-xs leading-relaxed text-[var(--foreground)]">{item.description}</p>
        </div>
      ) : (
        <p className="text-xs text-[var(--muted-foreground)] italic">No description.</p>
      )}
    </div>
  );
}

type ResearchTab = "synthesis" | "papers";

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
  const [selectedTodo, setSelectedTodo] = useState<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<{ num: number; showFull: boolean } | null>(null);
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
  const allFiles = useMemo(() => {
    if (!activeFolder) return [];
    const raw = [...activeFolder.files, ...(activeFolder.subFiles || [])];
    // Put Index.md first
    const idx = raw.findIndex((f) => f.toLowerCase() === "index.md");
    if (idx > 0) { const [item] = raw.splice(idx, 1); raw.unshift(item); }
    return raw;
  }, [activeFolder]);

  // Auto-select first folder on load / tab change
  useEffect(() => {
    if (folders.length > 0 && !selectedFolder) {
      setSelectedFolder(folders[0].folder);
    }
  }, [folders, selectedFolder]);

  // Auto-select first file or first todo when folder changes
  useEffect(() => {
    if (!activeFolder) return;
    if (col2View === "todo" && activeFolder.todoContent) {
      const items = parseTodoItems(activeFolder.todoContent);
      const open = items.filter((t) => !t.done);
      setSelectedTodo(open.length > 0 ? open[0].idx : items.length > 0 ? items[0].idx : null);
      setSelectedFile(null);
    } else if (allFiles.length > 0) {
      const indexFile = allFiles.find((f) => f.toLowerCase() === "index.md");
      setSelectedFile({ folder: activeFolder.folder, file: indexFile || allFiles[0] });
      setSelectedTodo(null);
      setSelectedChat(null);
    }
  }, [activeFolder?.folder]); // eslint-disable-line react-hooks/exhaustive-deps

  // File content query
  const fetchFn = tab === "synthesis" ? fetchFile : fetchPaperFile;
  const { data: fileContent, isLoading: fileLoading } = useQuery({
    queryKey: ["research-file-content", tab, selectedFile?.folder, selectedFile?.file],
    queryFn: () => fetchFn(selectedFile!.folder, selectedFile!.file),
    enabled: !!selectedFile,
  });

  // Chat query
  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ["research-chat", selectedChat?.num],
    queryFn: () => fetchChat(selectedChat!.num),
    enabled: !!selectedChat,
  });

  function handleSelectFolder(folder: string) {
    setSelectedFolder(folder);
    setSelectedFile(null);
    setSelectedTodo(null);
    setSelectedChat(null);
    // col2View is preserved — if user was on Todo tab, it stays on Todo
  }

  function handleTabChange(t: ResearchTab) {
    setTab(t);
    setSelectedFolder(null);
    setSelectedFile(null);
    setSelectedTodo(null);
    setSelectedChat(null);
    setCol2View("files");
  }

  function handleSelectFile(folder: string, file: string) {
    setSelectedFile({ folder, file });
    setSelectedTodo(null);
    setSelectedChat(null);
  }

  function handleSelectTodo(idx: number) {
    setSelectedTodo(idx);
    setSelectedFile(null);
    setSelectedChat(null);
  }

  function handleSelectChat(num: number) {
    setSelectedChat({ num, showFull: false });
    setSelectedFile(null);
    setSelectedTodo(null);
  }

  const activeMeta = activeFolder?.indexContent ? parseIndexMeta(activeFolder.indexContent) : null;
  const activeTodo = activeFolder?.todoContent ? parseTodoStats(activeFolder.todoContent) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-lg font-semibold">Research</h1>

      {/* Three-column layout — each column scrolls independently */}
      <div className="flex gap-4 overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>

        {/* Column 1: Folder cards */}
        <div className="w-[17rem] shrink-0 flex flex-col pr-1">
          <h2 className="text-sm font-semibold mb-2">Content</h2>

          {/* Synthesis / Papers toggle */}
          <div className="flex items-center rounded-md bg-[var(--muted)] p-0.5 mb-2">
            {(["synthesis", "papers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={cn(
                  "flex-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors text-center capitalize",
                  tab === t
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {folderCards.map(({ folder, meta, todoStats }) => {
            const isActive = selectedFolder === folder.folder;

            return (
              <button
                key={folder.folder}
                onClick={() => handleSelectFolder(folder.folder)}
                className={cn(
                  "w-full text-left px-2 py-2.5 transition-colors",
                  isActive
                    ? "bg-[var(--primary)]/5"
                    : "hover:bg-[var(--muted)]/30",
                )}
              >
                <p className={cn("text-xs font-medium line-clamp-1 leading-tight", isActive ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
                  {meta?.title || folder.folder}
                </p>
                {todoStats && todoStats.total > 0 && (
                  <div className="flex items-center gap-1 mt-1">
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
                    onClick={() => { setCol2View("files"); if (allFiles.length > 0 && activeFolder) { setSelectedFile({ folder: activeFolder.folder, file: allFiles[0] }); setSelectedTodo(null); } }}
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
                    onClick={() => { setCol2View("todo"); if (activeFolder?.todoContent) { const items = parseTodoItems(activeFolder.todoContent); const open = items.filter((t) => !t.done); setSelectedTodo(open.length > 0 ? open[0].idx : items.length > 0 ? items[0].idx : null); setSelectedFile(null); } }}
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
                        onClick={() => handleSelectFile(activeFolder.folder, file)}
                        className={cn(
                          "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
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

                  {/* Chat links */}
                  {activeFolder.chatMeta && activeFolder.chatMeta.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-3 mb-1 px-2">Chats ({activeFolder.chatMeta.length})</p>
                      {activeFolder.chatMeta.map((chat) => {
                        const isActive = selectedChat?.num === chat.num;
                        return (
                          <button
                            key={chat.num}
                            onClick={() => handleSelectChat(chat.num)}
                            className={cn(
                              "w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
                              isActive
                                ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                                : "hover:bg-[var(--muted)]/50 text-[var(--muted-foreground)]",
                            )}
                          >
                            <MessageSquare size={10} className="shrink-0" />
                            <span className="truncate capitalize">{chat.title}</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Todo list */}
              {col2View === "todo" && activeFolder.todoContent && (
                <TodoList content={activeFolder.todoContent} selectedIdx={selectedTodo} onSelect={handleSelectTodo} />
              )}
            </div>
          )}
        </div>

        {/* Column 3: File content, Todo detail, or Chat */}
        <div className="flex-1 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
          {selectedChat ? (
            /* Chat view */
            chatLoading ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">Loading chat...</p>
            ) : chatData ? (
              <div>
                {/* Breadcrumb + full transcript link */}
                <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] mb-3">
                  <button onClick={() => { setSelectedChat(null); if (allFiles.length > 0 && activeFolder) { const idx = allFiles.find((f) => f.toLowerCase() === "index.md"); handleSelectFile(activeFolder.folder, idx || allFiles[0]); } }} className="hover:text-[var(--foreground)] transition-colors">
                    {activeMeta?.title || activeFolder?.folder}
                  </button>
                  <ChevronRight size={10} />
                  {selectedChat.showFull ? (
                    <>
                      <button onClick={() => setSelectedChat({ ...selectedChat, showFull: false })} className="hover:text-[var(--foreground)] transition-colors">
                        {chatData.title}
                      </button>
                      <ChevronRight size={10} />
                      <span className="text-[var(--foreground)]">Full transcript</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[var(--foreground)]">{chatData.title}</span>
                      {chatData.fullContent && (
                        <>
                          <span className="mx-1">·</span>
                          <button onClick={() => setSelectedChat({ ...selectedChat, showFull: true })} className="text-[var(--primary)] hover:underline">
                            Full transcript
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                <MarkdownContent content={
                  selectedChat.showFull
                    ? (chatData.fullContent || "Full transcript not available.")
                    : (chatData.summaryContent || "No summary available.")
                } />
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">Chat not found.</p>
            )
          ) : selectedTodo !== null && activeFolder?.todoContent ? (
            <TodoDetail content={activeFolder.todoContent} idx={selectedTodo} />
          ) : !selectedFile ? (
            <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">
              {activeFolder ? "Select a document or todo" : ""}
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
