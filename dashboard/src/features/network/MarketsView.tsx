import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";
import { StatusPill } from "./shared";

export function MarketsView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selFile, setSelFile] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["network-manifest"],
    queryFn: () => fetch("/research/network").then((r) => r.json()),
    staleTime: 30_000,
  });

  const markets = data?.folders?.find((f: any) => f.section === "markets");
  const folders = markets?.subfolders || [];

  const { data: detail } = useQuery({
    queryKey: ["network-folder", "markets", selected],
    queryFn: () => fetch(`/research/network-folder/markets/${selected}`).then((r) => r.json()),
    enabled: !!selected,
    staleTime: 30_000,
  });

  const { data: fileData } = useQuery({
    queryKey: ["network-folder-file", "markets", selected, selFile],
    queryFn: () => fetch(`/research/network-folder-file/markets/${selected}/${selFile}`).then((r) => r.json()),
    enabled: !!selected && !!selFile,
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 180px)" }}>
      {/* Left list */}
      <div style={{ width: 280, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px 0" }}>
        {folders.map((f: any) => {
          const status = f.indexContent?.match(/^status:\s*(.+)$/m)?.[1]?.trim();
          return (
            <div
              key={f.folder}
              onClick={() => { setSelected(f.folder); setSelFile(null); }}
              style={{
                padding: "8px 14px", cursor: "pointer", fontSize: 12,
                background: selected === f.folder ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>{f.folder}</span>
              <StatusPill status={status || null} />
            </div>
          );
        })}
      </div>
      {/* Middle: files in selected market */}
      {selected && detail && (
        <div style={{ width: 200, borderRight: "1px solid var(--border)", overflowY: "auto", padding: "8px 0" }}>
          {detail.files?.map((f: string) => (
            <div
              key={f}
              onClick={() => setSelFile(f)}
              style={{
                padding: "6px 14px", cursor: "pointer", fontSize: 11,
                background: selFile === f ? "var(--accent)" : "transparent",
              }}
            >
              {f.replace(/\.md$/, "")}
            </div>
          ))}
        </div>
      )}
      {/* Right detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {!selected ? (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Select a market</div>
        ) : selFile && fileData?.content ? (
          <MarkdownContent content={fileData.content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
        ) : detail?.indexContent ? (
          <MarkdownContent content={detail.indexContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Loading...</div>
        )}
      </div>
    </div>
  );
}
