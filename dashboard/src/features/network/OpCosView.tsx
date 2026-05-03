import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";
import { StatusPill } from "./shared";

export function OpCosView() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["network-manifest"],
    queryFn: () => fetch("/research/network").then((r) => r.json()),
    staleTime: 30_000,
  });

  const opcos = data?.folders?.find((f: any) => f.section === "opcos");
  const folders = opcos?.subfolders || [];

  const { data: detail } = useQuery({
    queryKey: ["network-folder", "opcos", selected],
    queryFn: () => fetch(`/research/network-folder/opcos/${selected}`).then((r) => r.json()),
    enabled: !!selected,
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 180px)" }}>
      {/* Left list */}
      <div style={{ width: 280, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px 0" }}>
        {opcos?.indexContent && (
          <div style={{ padding: "4px 14px 10px", fontSize: 10, color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
            {opcos.indexContent.match(/^status:\s*(.+)$/m)?.[1]?.trim() || ""}
          </div>
        )}
        {folders.map((f: any) => {
          const status = f.indexContent?.match(/^status:\s*(.+)$/m)?.[1]?.trim();
          const lead = f.indexContent?.match(/^lead:\s*(.+)$/m)?.[1]?.trim();
          return (
            <div
              key={f.folder}
              onClick={() => setSelected(f.folder)}
              style={{
                padding: "8px 14px", cursor: "pointer", fontSize: 12,
                background: selected === f.folder ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>{f.folder}</span>
              <StatusPill status={status || null} />
              {lead && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{lead}</span>}
            </div>
          );
        })}
      </div>
      {/* Right detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {!selected ? (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Select an OpCo</div>
        ) : detail?.indexContent ? (
          <MarkdownContent content={detail.indexContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Loading...</div>
        )}
        {detail?.todoContent && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 6 }}>Todo</div>
            <MarkdownContent content={detail.todoContent} />
          </div>
        )}
      </div>
    </div>
  );
}
