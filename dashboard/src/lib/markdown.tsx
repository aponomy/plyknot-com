/* Shared markdown renderer used by ResearchPage and TrackerPage */

export function renderMarkdown(content: string): string {
  // Extract code blocks first, replace with placeholders to protect from inline transforms
  const codeBlocks: string[] = [];
  let out = content.replace(/```(\w*)\n([\s\S]*?)```/gm, (_m, _lang, code) => {
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trimEnd();
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="text-[10px] font-mono bg-[var(--muted)] rounded px-3 py-2 my-2 overflow-x-auto whitespace-pre"><code>${escaped}</code></pre>`);
    return `\x00CODEBLOCK${idx}\x00`;
  });

  // Tables — find consecutive lines starting with |
  out = out.replace(/^(\|.+\|\n)+/gm, (block) => {
    const rows = block.trim().split("\n");
    const isAlignRow = (r: string) => /^\|[\s:-]+\|$/.test(r.replace(/\|/g, "|").replace(/[^|:-\s]/g, ""));
    const dataRows = rows.filter((r) => !isAlignRow(r));
    if (dataRows.length === 0) return block;
    const toCell = (tag: string) => (r: string) =>
      r.split("|").slice(1, -1).map((c) => `<${tag} class="px-2 py-1 border border-[var(--border)]">${c.trim()}</${tag}>`).join("");
    const head = `<tr>${toCell("th")(dataRows[0])}</tr>`;
    const body = dataRows.slice(1).map((r) => `<tr>${toCell("td")(r)}</tr>`).join("");
    return `<div class="overflow-x-auto my-2"><table class="text-[10px] border-collapse w-max"><thead class="bg-[var(--muted)]">${head}</thead><tbody>${body}</tbody></table></div>`;
  });

  // Inline transforms (code blocks already extracted, safe from # matching)
  out = out
    .replace(/^#### (.+)$/gm, '<h4 class="text-xs font-semibold mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="text-[10px] px-1 py-0.5 rounded bg-[var(--muted)] font-mono">$1</code>')
    .replace(/^\- \[x\] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-green-400">&#9745;</span><span class="line-through text-[var(--muted-foreground)]">$1</span></div>')
    .replace(/^\- \[ \] (.+)$/gm, '<div class="flex items-center gap-1.5 py-0.5"><span class="text-[var(--muted-foreground)]">&#9744;</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-1.5 py-0.5 list-none"><span class="text-[var(--muted-foreground)] shrink-0">&bull;</span><span>$1</span></li>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[var(--muted)] pl-3 py-1 text-[var(--muted-foreground)] italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-[var(--border)] my-1.5" />');

  // Wrap consecutive <li> elements (possibly separated by blank lines) into <ul>
  out = out.replace(/(<li[\s\S]*?<\/li>)(\n\n?(<li[\s\S]*?<\/li>))*/g, (block) => {
    // Remove any \n between consecutive <li> items
    const items = block.replace(/\n+/g, "");
    return `<ul class="my-1 pl-0">${items}</ul>`;
  });

  // Same for checkbox items
  out = out.replace(/((<div class="flex items-center gap-1\.5 py-0\.5">[\s\S]*?<\/div>)(\n\n?(<div class="flex items-center gap-1\.5 py-0\.5">[\s\S]*?<\/div>))*)/g, (block) => {
    const items = block.replace(/\n+(?=<div class="flex items-center)/g, "");
    return `<div class="my-1">${items}</div>`;
  });

  out = out
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br />");

  // Restore code blocks
  out = out.replace(/\x00CODEBLOCK(\d+)\x00/g, (_m, idx) => codeBlocks[parseInt(idx)]);
  return out;
}

export function MarkdownContent({ content }: { content: string }) {
  const html = renderMarkdown(content);
  return (
    <div
      className="text-xs leading-relaxed text-[var(--foreground)] [&>hr+h1]:mt-1 [&>hr+h2]:mt-1 [&>hr+h3]:mt-1 [&>hr+h4]:mt-1 [&>hr+div+h1]:mt-1 [&>hr+div+h2]:mt-1 [&>hr+br+h1]:mt-1 [&>hr+br+h2]:mt-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
