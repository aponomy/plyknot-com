import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AgentMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--foreground)]">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ href, children }) => (
          <a href={href} className="text-[var(--primary)] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <pre className="rounded-md bg-[var(--background)] border border-[var(--border)] p-3 my-2 overflow-x-auto">
                <code className="text-xs font-mono">{children}</code>
              </pre>
            );
          }
          return <code className="text-xs font-mono px-1 py-0.5 rounded bg-[var(--muted)]">{children}</code>;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--primary)] pl-3 my-2 text-[var(--muted-foreground)] italic">{children}</blockquote>
        ),
        h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1">{children}</h3>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="text-left py-1 px-2 border-b border-[var(--border)] font-medium text-[var(--muted-foreground)]">{children}</th>,
        td: ({ children }) => <td className="py-1 px-2 border-b border-[var(--border)]">{children}</td>,
      }}
    >
      {content}
    </Markdown>
  );
}
