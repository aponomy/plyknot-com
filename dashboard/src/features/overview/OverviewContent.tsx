import { useState, useMemo, useEffect } from "react";
import { cn } from "../../lib/utils";
import { BASICS, VERBS, CONCEPTS, ARTICLES, type BasicItem, type ArticleFile } from "./overview-data";
import { SCHEMAS, type SchemaEntry } from "./overview-schemas";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DependencyBrowser } from "./DependencyBrowser";

type Section = "basics" | "schema" | "articles" | "graph";

function groupBy<T extends { group: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

async function fetchArticle(filePath: string): Promise<string> {
  const r = await fetch(`/research/article/${encodeURIComponent(filePath)}`);
  if (!r.ok) return `*Failed to load article (${r.status})*`;
  const data = await r.json();
  return data.content;
}


/* Three-column overview rendered inside ResearchPage's flex row. */
export function OverviewContent() {
  const [section, setSection] = useState<Section>("basics");
  const [selectedId, setSelectedId] = useState<string>("Foundations");
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  const basicsItems = useMemo(() => [...BASICS, ...VERBS, ...CONCEPTS], []);
  const basicsGroups = useMemo(() => groupBy(basicsItems), [basicsItems]);
  const schemaGroups = useMemo(() => groupBy(SCHEMAS), []);
  const articleGroups = useMemo(() => groupBy(ARTICLES), []);

  function handleSection(s: Section) {
    setSection(s);
    setArticleContent(null);
    if (s === "basics") setSelectedId(basicsGroups[0]?.group ?? "Foundations");
    else if (s === "schema") setSelectedId("schema-pipeline");
    else if (s === "articles" && ARTICLES.length > 0) {
      setSelectedId(ARTICLES[0].id);
      loadArticle(ARTICLES[0].filePath);
    }
    // graph has no selectedId
  }

  function loadArticle(filePath: string) {
    setArticleLoading(true);
    setArticleContent(null);
    fetchArticle(filePath).then((content) => {
      setArticleContent(content);
      setArticleLoading(false);
    });
  }

  function handleSelectId(id: string) {
    setSelectedId(id);
    // If it's an article, fetch its content
    const article = ARTICLES.find((a) => a.id === id);
    if (article) {
      loadArticle(article.filePath);
    } else {
      setArticleContent(null);
    }
  }

  // Load first article on initial mount if articles tab
  useEffect(() => {
    if (section === "articles" && ARTICLES.length > 0 && !articleContent) {
      loadArticle(ARTICLES[0].filePath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeArticle = ARTICLES.find((a) => a.id === selectedId);
  // For basics: selectedId is the group name; for schema: it's a schema id
  const activeBasicsGroup = section === "basics" ? basicsGroups.find((g) => g.group === selectedId) : null;
  const activeSchemaItem = section === "schema" ? SCHEMAS.find((s) => s.id === selectedId) : null;

  // Col2 items depend on section type
  const schemaCol2Groups = schemaGroups;
  const articleCol2Groups = articleGroups;

  return (
    <>
      {/* Column 1: Section boxes */}
      <div className="w-[17rem] shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-1">
        {([
          { key: "basics" as const, label: "Basics", desc: "Why, What, How, When + verbs + concepts" },
          { key: "schema" as const, label: "Schema", desc: "Diagrams, concept maps, comparisons" },
          { key: "articles" as const, label: "Articles", desc: `${ARTICLES.length} articles` },
          { key: "graph" as const, label: "Dependency Graph", desc: "65 concepts, 132 edges" },
        ]).map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => handleSection(key)}
            className={cn(
              "text-left rounded-lg border p-3 transition-colors",
              section === key
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:bg-[var(--muted)]",
            )}
          >
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{desc}</p>
          </button>
        ))}
      </div>

      {/* Graph: Finder-style column browser spanning col2+col3 */}
      {section === "graph" ? (
        <DependencyBrowser />
      ) : <>

      {/* Column 2: Item list */}
      <div className="w-72 shrink-0 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
        {section === "basics" && basicsGroups.map(({ group, items }) => (
          <button
            key={group}
            onClick={() => { setSelectedId(group); setArticleContent(null); }}
            className={cn(
              "w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors",
              selectedId === group
                ? "bg-[var(--primary)]/10 text-[var(--foreground)] font-medium"
                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50",
            )}
          >
            <span>{group}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--muted)] shrink-0 ml-1">{items.length}</span>
          </button>
        ))}

        {section === "schema" && schemaCol2Groups.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-3 mb-1 first:mt-0">{group}</p>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedId(item.id); setArticleContent(null); }}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-xs transition-colors",
                  selectedId === item.id
                    ? "bg-[var(--primary)]/10 text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
        ))}

        {section === "articles" && articleCol2Groups.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-3 mb-1 first:mt-0">{group}</p>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectId(item.id)}
                className={cn(
                  "w-full text-left flex items-center justify-between px-2 py-1 rounded text-xs transition-colors",
                  selectedId === item.id
                    ? "bg-[var(--primary)]/10 text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50",
                )}
              >
                <span className="truncate">{item.title}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--muted)] shrink-0 ml-1">
                  {(item as ArticleFile).status}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Column 3: Detail */}
      <div className="flex-1 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
        {/* Basics: render all items in the selected group as sections */}
        {activeBasicsGroup ? (
          <div>
            <h2 className="text-sm font-bold mb-4">{activeBasicsGroup.group}</h2>
            {activeBasicsGroup.items.map((item) => (
              <div key={item.id} className="mb-5">
                <h3 className="text-xs font-semibold mb-1">{item.title}</h3>
                <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{item.summary}</p>
                <div
                  className="text-xs leading-relaxed [&>p]:mb-2 [&_code]:text-[10px] [&_code]:bg-[var(--muted)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_strong]:font-semibold [&_em]:italic [&_ul]:pl-4 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </div>
            ))}
          </div>
        ) : activeArticle ? (
          /* Article: full markdown */
          articleLoading ? (
            <p className="text-xs text-[var(--muted-foreground)] py-4">Loading article...</p>
          ) : articleContent ? (
            <div className="prose prose-sm max-w-none text-xs leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-2 [&_p]:leading-relaxed [&_em]:italic [&_strong]:font-semibold [&_code]:text-[10px] [&_code]:bg-[var(--muted)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--muted-foreground)] [&_hr]:my-4 [&_hr]:border-[var(--border)]">
              <Markdown remarkPlugins={[remarkGfm]}>{articleContent}</Markdown>
            </div>
          ) : null
        ) : activeSchemaItem ? (
          /* Schema: single diagram */
          <div>
            <h2 className="text-sm font-semibold mb-1">{activeSchemaItem.summary}</h2>
            <div
              className="mt-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: activeSchemaItem.svg }}
            />
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">Select an item</p>
        )}
      </div>
      </>}
    </>
  );
}
