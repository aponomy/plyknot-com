import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SYNTHESIS_DIR = resolve(__dirname, "../../research/synthesis");
const PAPERS_DIR    = resolve(__dirname, "../../research/papers");
const PRODUCTS_DIR  = resolve(__dirname, "../../research/products");
const PROJECT_DIR   = resolve(__dirname, "../../research/project");
const CHAT_DIR      = resolve(__dirname, "../../research/project/chat");
const MARKETS_DIR   = resolve(__dirname, "../../research/project/markets");
const RESEARCH_ROOT = resolve(__dirname, "../../research");

/* ── Tracker parsing (mirrors build-roadmap.py in Node.js) ─────────────── */

const TRACKER_SKIP = new Set(["build", "archive", "outlines", "markets"]);

function readFolderTitle(folderPath: string): string {
  for (const name of ["index.md", "Index.md"]) {
    const p = join(folderPath, name);
    if (existsSync(p)) {
      const m = readFileSync(p, "utf-8").match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return folderPath.split("/").pop()!.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

type IssueStatus = "todo" | "doing" | "done";
interface TIssue {
  id: string; theme_id: string; title: string; description: string | null;
  section: string | null; priority: string; status: IssueStatus;
  target_date: string | null; project_id: null; sort_order: number;
  created_by: null; updated_by: null; comment_count: 0;
  created_at: string; updated_at: string;
}

function parseTodoToIssues(content: string, themeId: string): TIssue[] {
  const issues: TIssue[] = [];
  let section: string | null = null;
  let idx = 0;
  const now = new Date().toISOString();
  for (const line of content.split("\n")) {
    const hm = line.match(/^#{2,3}\s+(.+)$/);
    if (hm) { section = hm[1].trim(); continue; }
    const im = line.match(/^\s*-\s+\[([  xX~])\]\s+(?:\*\*(P[0-3])\*\*\s+|(P[0-3]):\s+)?(.+)$/);
    if (!im) continue;
    const [, rawSt, pri1, pri2, rest] = im;
    const priority = pri1 || pri2 || "-";
    let status: IssueStatus = rawSt.toLowerCase() === "x" ? "done" : rawSt === "~" ? "doing" : "todo";
    const dateM = rest.match(/\*\(target:\s*(\d{4}-\d{2}-\d{2})\)\*/);
    const targetDate = dateM ? dateM[1] : null;
    let cleaned = rest
      .replace(/\*\(target:[^)]+\)\*/g, "").replace(/\*\(done[^)]*\)\*/g, "")
      .replace(/\s*\[[a-z]{3,9}\]\s*$/i, "").replace(/~~(.+?)~~/g, "$1")
      .replace(/\s+—\s*$/, "").trim();
    if (/SUPERSEDED|DUPLICATE/i.test(cleaned)) status = "done";
    let title = cleaned, description: string | null = null;
    const di = cleaned.indexOf(" — ");
    if (di >= 0) { title = cleaned.slice(0, di).trim(); description = cleaned.slice(di + 3).trim() || null; }
    if (!title) continue;
    issues.push({ id: `${themeId}/${idx}`, theme_id: themeId, title, description, section, priority,
      status, target_date: targetDate, project_id: null, sort_order: idx,
      created_by: null, updated_by: null, comment_count: 0, created_at: now, updated_at: now });
    idx++;
  }
  return issues;
}

function buildTrackerData() {
  const themes: { id: string; category_slug: string; category_label: string; title: string; sort_order: number; done_count: number; issue_count: number }[] = [];
  const themeIssues: Record<string, TIssue[]> = {};
  const categories: { slug: string; label: string; sort_order: number; theme_count: number; done_count: number; issue_count: number }[] = [];
  const THEME_DEFS: [string, string, string][] = [
    ["papers", "Papers", PAPERS_DIR], ["products", "Products", PRODUCTS_DIR],
    ["markets", "Markets", MARKETS_DIR],
    ["project", "Project", PROJECT_DIR], ["synthesis", "Synthesis", SYNTHESIS_DIR],
  ];
  let themeSort = 0;
  for (const [slug, label, dir] of THEME_DEFS) {
    if (!existsSync(dir)) continue;
    let catDone = 0, catTotal = 0, catCount = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.name.startsWith(".") || TRACKER_SKIP.has(entry.name)) continue;
      const sub = join(dir, entry.name);
      const todoPath = ["todo.md", "Todo.md", "TODO.md"].map(n => join(sub, n)).find(p => existsSync(p));
      if (!todoPath) continue;
      const themeId = `${slug}/${entry.name}`;
      const issues = parseTodoToIssues(readFileSync(todoPath, "utf-8"), themeId);
      const done = issues.filter(i => i.status === "done").length;
      // Count files recursively and check for current.md
      let fileCount = 0;
      let hasCurrent = false;
      function countFiles(d: string) {
        try {
          for (const e of readdirSync(d, { withFileTypes: true })) {
            if (e.name.startsWith(".")) continue;
            if (e.isDirectory()) countFiles(join(d, e.name));
            else if (e.name.endsWith(".md") || e.name.endsWith(".html") || e.name.endsWith(".svg")) {
              fileCount++;
              if (e.name.toLowerCase() === "current.md") hasCurrent = true;
            }
          }
        } catch {}
      }
      countFiles(sub);
      themes.push({ id: themeId, category_slug: slug, category_label: label, title: readFolderTitle(sub), sort_order: themeSort++, done_count: done, issue_count: issues.length, file_count: fileCount, has_current: hasCurrent });
      themeIssues[themeId] = issues;
      catDone += done; catTotal += issues.length; catCount++;
    }
    if (catCount > 0) categories.push({ slug, label, sort_order: categories.length, theme_count: catCount, done_count: catDone, issue_count: catTotal });
  }
  const all = Object.values(themeIssues).flat();
  const total = all.length, done = all.filter(i => i.status === "done").length, doing = all.filter(i => i.status === "doing").length;
  const byPri: Record<string, number> = {};
  for (const i of all) byPri[i.priority] = (byPri[i.priority] ?? 0) + 1;
  return {
    generated: new Date().toISOString(), categories, themes, themeIssues,
    stats: { total, done, doing, todo: total - done - doing, theme_count: themes.length,
      by_priority: Object.entries(byPri).sort().map(([priority, count]) => ({ priority, count })),
      by_category: categories.map(c => ({ slug: c.slug, label: c.label, total: c.issue_count, done: c.done_count })),
    },
  };
}

function scanFolder(folderPath: string, name: string) {
  const files = readdirSync(folderPath)
    .filter((f) => f.endsWith(".md") || f.endsWith(".svg") || f.endsWith(".html"))
    .sort();
  const indexFile = files.find((f) => f.toLowerCase() === "index.md") || null;
  const todoFile = files.find((f) => f.toLowerCase() === "todo.md") || null;
  const otherFiles = files.filter(
    (f) => f.toLowerCase() !== "todo.md",
  );
  const indexContent = indexFile ? readFileSync(join(folderPath, indexFile), "utf-8") : null;
  const todoContent = todoFile ? readFileSync(join(folderPath, todoFile), "utf-8") : null;

  // Recursively scan sub-folders
  const subFolders: string[] = [];
  const subFiles: string[] = [];
  function walkDir(dir: string, prefix: string) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          subFolders.push(rel);
          walkDir(join(dir, entry.name), rel);
        } else if (entry.name.endsWith(".md") || entry.name.endsWith(".html") || entry.name.endsWith(".svg")) {
          subFiles.push(rel);
        }
      }
    } catch {}
  }
  for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      walkDir(join(folderPath, entry.name), entry.name);
    }
  }

  // Resolve chat references from Index.md frontmatter
  let chatMeta: Array<{ num: number; title: string }> = [];
  if (indexContent) {
    const chatMatch = indexContent.match(/^chat:\s*(.+)$/m);
    if (chatMatch) {
      const raw = chatMatch[1].trim();
      let nums: number[] = [];
      if (raw.startsWith("[")) {
        nums = raw.replace(/[[\]]/g, "").split(",").map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n));
      } else {
        const n = parseInt(raw); if (!isNaN(n)) nums = [n];
      }
      const summaryDir = resolve(__dirname, "../../research/project/chat/summary");
      try {
        const summaryFiles = readdirSync(summaryDir);
        chatMeta = nums.map((num) => {
          const file = summaryFiles.find((f) => f.startsWith(`${String(num).padStart(2, "0")}-`));
          const title = file ? file.replace(/^\d+-/, "").replace(/\.md$/, "").replace(/-/g, " ") : `Chat ${num}`;
          return { num, title };
        });
      } catch {}
    }
  }

  return {
    folder: name,
    indexFile,
    todoFile,
    indexContent,
    todoContent,
    files: otherFiles,
    subFiles,
    fileCount: otherFiles.length + subFiles.length,
    chatMeta,
  };
}

/** Vite plugin that serves research files as a local API */
function researchFilesPlugin(): Plugin {
  return {
    name: "research-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/research/")) return next();

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // GET /research/tracker — roadmap data parsed from todo.md files
        if (req.url === "/research/tracker") {
          try { res.end(JSON.stringify(buildTrackerData())); } catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: String(err) })); }
          return;
        }

        // GET /research/folder/:theme/:folder — scanFolder for any theme subfolder
        const thFolderMatch = req.url.match(/^\/research\/folder\/([^/]+)\/([^/]+)$/);
        if (thFolderMatch) {
          const THEME_DIRS: Record<string, string> = { papers: PAPERS_DIR, products: PRODUCTS_DIR, markets: MARKETS_DIR, project: PROJECT_DIR, synthesis: SYNTHESIS_DIR };
          const themeDir = THEME_DIRS[thFolderMatch[1]];
          if (!themeDir) { res.statusCode = 404; res.end(JSON.stringify({ error: "Unknown theme" })); return; }
          const folderPath = join(themeDir, decodeURIComponent(thFolderMatch[2]));
          if (!existsSync(folderPath)) { res.statusCode = 404; res.end(JSON.stringify({ error: "Not found" })); return; }
          try { res.end(JSON.stringify(scanFolder(folderPath, thFolderMatch[2]))); }
          catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: String(err) })); }
          return;
        }

        // GET /research/folder-file/:theme/:folder/:file — read file from any theme subfolder
        const thFolderFileMatch = req.url.match(/^\/research\/folder-file\/([^/]+)\/([^/]+)\/(.+)$/);
        if (thFolderFileMatch) {
          const THEME_DIRS: Record<string, string> = { papers: PAPERS_DIR, products: PRODUCTS_DIR, markets: MARKETS_DIR, project: PROJECT_DIR, synthesis: SYNTHESIS_DIR };
          const themeDir = THEME_DIRS[thFolderFileMatch[1]];
          if (!themeDir) { res.statusCode = 404; res.end(JSON.stringify({ error: "Unknown theme" })); return; }
          const baseDir = join(themeDir, decodeURIComponent(thFolderFileMatch[2]));
          const filePath = decodeURIComponent(thFolderFileMatch[3]);
          const absPath = resolve(baseDir, filePath);
          if (!absPath.startsWith(baseDir)) { res.statusCode = 403; res.end(JSON.stringify({ error: "Forbidden" })); return; }
          if (!existsSync(absPath) || !statSync(absPath).isFile()) { res.statusCode = 404; res.end(JSON.stringify({ error: "Not found" })); return; }
          try { res.end(JSON.stringify({ path: filePath, content: readFileSync(absPath, "utf-8") })); }
          catch (err) { res.statusCode = 500; res.end(JSON.stringify({ error: String(err) })); }
          return;
        }

        // GET /research/manifest — synthesis folders
        if (req.url === "/research/manifest") {
          try {
            const entries = readdirSync(SYNTHESIS_DIR, { withFileTypes: true });
            const folders = entries
              .filter((e) => e.isDirectory() && !e.name.startsWith("."))
              .map((e) => scanFolder(join(SYNTHESIS_DIR, e.name), e.name))
              .sort((a, b) => a.folder.localeCompare(b.folder));
            res.end(JSON.stringify({ folders }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/papers — papers manifest
        if (req.url === "/research/papers") {
          try {
            const paperFolders = ["flagship", "satellite-1-cxr", "satellite-2-text", "satellite-3-materials", "satellite-4-alphafold", "satellite-5-emergence", "satellite-6", "satellite-7-quantum-vqe"];
            const papers = paperFolders
              .filter((name) => existsSync(join(PAPERS_DIR, name)))
              .map((name) => scanFolder(join(PAPERS_DIR, name), name));
            res.end(JSON.stringify({ papers }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/files/<path> — read file from synthesis dir
        const fileMatch = req.url.match(/^\/research\/files\/(.+)$/);
        if (fileMatch) {
          const relPath = decodeURIComponent(fileMatch[1]);
          const absPath = resolve(SYNTHESIS_DIR, relPath);
          if (!absPath.startsWith(SYNTHESIS_DIR)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: "Forbidden" }));
            return;
          }
          if (!existsSync(absPath) || !statSync(absPath).isFile()) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          try {
            res.end(JSON.stringify({ path: relPath, content: readFileSync(absPath, "utf-8") }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/paper-files/<path> — read file from papers dir
        const paperFileMatch = req.url.match(/^\/research\/paper-files\/(.+)$/);
        if (paperFileMatch) {
          const relPath = decodeURIComponent(paperFileMatch[1]);
          const absPath = resolve(PAPERS_DIR, relPath);
          if (!absPath.startsWith(PAPERS_DIR)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: "Forbidden" }));
            return;
          }
          if (!existsSync(absPath) || !statSync(absPath).isFile()) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          try {
            res.end(JSON.stringify({ path: relPath, content: readFileSync(absPath, "utf-8") }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/chat/<number> — returns summary + full file paths
        const chatMatch = req.url.match(/^\/research\/chat\/(\d+)$/);
        if (chatMatch) {
          const num = chatMatch[1];
          try {
            const summaryDir = join(CHAT_DIR, "summary");
            const fullDir = join(CHAT_DIR, "full");
            const summaryFiles = readdirSync(summaryDir).filter((f) => f.startsWith(`${num.padStart(2, "0")}-`));
            const fullFiles = readdirSync(fullDir).filter((f) => f.startsWith(`${num.padStart(2, "0")}-`));
            const summaryFile = summaryFiles[0] || null;
            const fullFile = fullFiles[0] || null;
            const summaryContent = summaryFile ? readFileSync(join(summaryDir, summaryFile), "utf-8") : null;
            const fullContent = fullFile ? readFileSync(join(fullDir, fullFile), "utf-8") : null;
            res.end(JSON.stringify({
              number: parseInt(num),
              summaryFile,
              fullFile,
              summaryContent,
              fullContent,
              title: summaryFile ? summaryFile.replace(/^\d+-/, "").replace(/\.md$/, "").replace(/-/g, " ") : `Chat ${num}`,
            }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/article/<path> — read file from research root
        const articleMatch = req.url.match(/^\/research\/article\/(.+)$/);
        if (articleMatch) {
          const relPath = decodeURIComponent(articleMatch[1]);
          const absPath = resolve(RESEARCH_ROOT, relPath);
          if (!absPath.startsWith(RESEARCH_ROOT)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ error: "Forbidden" }));
            return;
          }
          if (!existsSync(absPath) || !statSync(absPath).isFile()) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }
          try {
            res.end(JSON.stringify({ path: relPath, content: readFileSync(absPath, "utf-8") }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), researchFilesPlugin()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8791",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/v1"),
      },
    },
  },
});
