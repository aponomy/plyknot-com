import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SYNTHESIS_DIR = resolve(__dirname, "../../research/notes/synthesis");
const PAPERS_DIR = resolve(__dirname, "../../research/papers");

function scanFolder(folderPath: string, name: string) {
  const files = readdirSync(folderPath)
    .filter((f) => f.endsWith(".md") || f.endsWith(".svg"))
    .sort();
  const indexFile = files.find((f) => f.toLowerCase() === "index.md") || null;
  const todoFile = files.find((f) => f.toLowerCase() === "todo.md") || null;
  const otherFiles = files.filter(
    (f) => f.toLowerCase() !== "index.md" && f.toLowerCase() !== "todo.md",
  );
  const indexContent = indexFile ? readFileSync(join(folderPath, indexFile), "utf-8") : null;
  const todoContent = todoFile ? readFileSync(join(folderPath, todoFile), "utf-8") : null;

  // Also scan sub-folders (e.g. flagship/sections)
  const subFolders: string[] = [];
  const subFiles: string[] = [];
  try {
    for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        subFolders.push(entry.name);
        const subPath = join(folderPath, entry.name);
        for (const sf of readdirSync(subPath)) {
          if (sf.endsWith(".md")) subFiles.push(`${entry.name}/${sf}`);
        }
      }
    }
  } catch {}

  return {
    folder: name,
    indexFile,
    todoFile,
    indexContent,
    todoContent,
    files: otherFiles,
    subFiles,
    fileCount: otherFiles.length + subFiles.length,
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
            const paperFolders = ["flagship", "satellite-1-cxr", "satellite-2-text", "satellite-3-materials", "satellite-4-alphafold", "satellite-5-emergence", "satellite-6"];
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
