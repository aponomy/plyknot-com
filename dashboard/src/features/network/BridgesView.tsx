import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";
import { StatusPill } from "./shared";

export function BridgesView() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["network-folder", "bridges", null],
    queryFn: () => fetch("/research/network-folder/bridges").then((r) => r.json()),
    staleTime: 30_000,
  });

  const files = useMemo(() => {
    return (data?.files || []).filter((f: string) =>
      f.endsWith(".md") && f !== "index.md" && f !== "todo.md" && f !== "Index.md" && f !== "Todo.md"
    );
  }, [data]);

  const { data: fileData } = useQuery({
    queryKey: ["network-folder-file", "bridges", "bridges", selected],
    queryFn: () => fetch(`/research/network-folder-file/bridges/bridges/${selected}`).then((r) => r.json()),
    enabled: false,  // bridges is flat, not nested — use direct path
    staleTime: 30_000,
  });

  // Use article endpoint since bridges/ is at network root level
  const { data: bridgeFile } = useQuery({
    queryKey: ["bridge-file", selected],
    queryFn: () => fetch(`/research/article/network/bridges/${selected}`).then((r) => r.json()),
    enabled: !!selected,
    staleTime: 30_000,
  });

  // Parse status from each bridge file name or from content
  const bridgeStatuses = useMemo(() => {
    const map: Record<string, string> = {};
    // We'll parse status when file is loaded; for list, sort alphabetically
    return map;
  }, []);

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 230px)" }}>
      <div style={{ width: 280, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px 0" }}>
        {files.map((f: string) => (
          <div
            key={f}
            onClick={() => setSelected(f)}
            style={{
              padding: "8px 14px", cursor: "pointer", fontSize: 12,
              background: selected === f ? "var(--accent)" : "transparent",
              fontWeight: 500,
            }}
          >
            {f.replace(/\.md$/, "").replace(/-/g, " ")}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {!selected ? (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Select a bridge</div>
        ) : bridgeFile?.content ? (
          <MarkdownContent content={bridgeFile.content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Loading...</div>
        )}
      </div>
    </div>
  );
}
