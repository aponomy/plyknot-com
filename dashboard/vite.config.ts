import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SYNTHESIS_DIR = resolve(__dirname, "../../research/notes/synthesis");

/** Vite plugin that serves the research/notes/synthesis folder as a local API */
function researchFilesPlugin(): Plugin {
  return {
    name: "research-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/research/")) return next();

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");

        // GET /research/manifest — list all folders and their files
        if (req.url === "/research/manifest") {
          try {
            const entries = readdirSync(SYNTHESIS_DIR, { withFileTypes: true });
            const folders = entries
              .filter((e) => e.isDirectory() && !e.name.startsWith("."))
              .map((e) => {
                const folderPath = join(SYNTHESIS_DIR, e.name);
                const files = readdirSync(folderPath)
                  .filter((f) => f.endsWith(".md") || f.endsWith(".svg"))
                  .sort();
                const hasIndex = files.includes("Index.md") || files.includes("index.md");
                const hasTodo = files.includes("Todo.md") || files.includes("todo.md");
                const indexFile = files.find((f) => f.toLowerCase() === "index.md") || null;
                const todoFile = files.find((f) => f.toLowerCase() === "todo.md") || null;
                const otherFiles = files.filter(
                  (f) => f.toLowerCase() !== "index.md" && f.toLowerCase() !== "todo.md",
                );
                return {
                  folder: e.name,
                  hasIndex,
                  hasTodo,
                  indexFile,
                  todoFile,
                  files: otherFiles,
                  fileCount: otherFiles.length,
                };
              })
              .sort((a, b) => a.folder.localeCompare(b.folder));
            res.end(JSON.stringify({ folders }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        // GET /research/files/<folder>/<file> — read a specific file
        const fileMatch = req.url.match(/^\/research\/files\/(.+)$/);
        if (fileMatch) {
          const relPath = decodeURIComponent(fileMatch[1]);
          const absPath = resolve(SYNTHESIS_DIR, relPath);
          // Security: must be within SYNTHESIS_DIR
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
            const content = readFileSync(absPath, "utf-8");
            res.end(JSON.stringify({ path: relPath, content }));
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
