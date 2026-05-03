import { useQuery } from "@tanstack/react-query";
import { MarkdownContent } from "../../lib/markdown";

export function OrganizationView() {
  const { data } = useQuery({
    queryKey: ["network-folder", "organization", null],
    queryFn: () => fetch("/research/network-folder/organization").then((r) => r.json()),
    staleTime: 30_000,
  });

  return (
    <div style={{ maxWidth: 800, padding: "0 4px" }}>
      {data?.indexContent ? (
        <MarkdownContent content={data.indexContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "")} />
      ) : (
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", paddingTop: 40, textAlign: "center" }}>Loading...</div>
      )}
      {data?.todoContent && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 6 }}>Todo</div>
          <MarkdownContent content={data.todoContent} />
        </div>
      )}
    </div>
  );
}
