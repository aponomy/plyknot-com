import { useState, useMemo } from "react";
import { cn } from "../../lib/utils";
import depData from "../../../scripts/dependency.json";

interface Node {
  id: string;
  label: string;
  kind: string;
  status: string;
  locations: string[];
  summary: string;
}

interface Edge {
  from: string;
  to: string;
  rationale: string;
}

const nodes = depData.nodes as Node[];
const edges = depData.edges as Edge[];

const STATUS_DOT: Record<string, string> = {
  converged: "bg-[color:var(--color-success)]",
  tension: "bg-[color:var(--color-warning)]",
  divergent: "bg-[color:var(--color-danger)]",
  single: "bg-zinc-400",
  proposed: "bg-[var(--primary)]",
  superseded: "bg-zinc-300",
};

const STATUS_LABEL: Record<string, string> = {
  converged: "Solid",
  tension: "Partial",
  divergent: "Contradicted",
  single: "Unvalidated",
  proposed: "Not built",
  superseded: "Replaced",
};

const KIND_LABEL: Record<string, string> = {
  axiom: "axiom",
  primitive: "primitive",
  principle: "principle",
  construct: "construct",
  infrastructure: "infra",
  "domain-finding": "finding",
  "patent-claim": "patent",
  "empirical-test": "test",
  verb: "verb",
};

// Delivery kinds: things you ship or complete
const DELIVERY_KINDS = new Set(["domain-finding", "patent-claim", "empirical-test", "infrastructure", "verb"]);

// Build lookups
const nodeMap = new Map(nodes.map((n) => [n.id, n]));
// dependsOn[X] = nodes that X depends on
const dependsOn = new Map<string, { node: Node; rationale: string }[]>();
for (const e of edges) {
  const toNode = nodeMap.get(e.to);
  if (!toNode) continue;
  if (!dependsOn.has(e.from)) dependsOn.set(e.from, []);
  dependsOn.get(e.from)!.push({ node: toNode, rationale: e.rationale });
}

/** Walk all transitive dependencies of a node. Returns nodes in breadth-first order with depth. */
function walkDeps(rootId: string): { node: Node; depth: number; rationale: string; parentId: string | null }[] {
  const result: { node: Node; depth: number; rationale: string; parentId: string | null }[] = [];
  const visited = new Set<string>();
  const queue: { id: string; depth: number; rationale: string; parentId: string | null }[] = [{ id: rootId, depth: 0, rationale: "", parentId: null }];

  while (queue.length > 0) {
    const { id, depth, rationale, parentId } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node) continue;
    result.push({ node, depth, rationale, parentId });
    for (const dep of dependsOn.get(id) ?? []) {
      if (!visited.has(dep.node.id)) {
        queue.push({ id: dep.node.id, depth: depth + 1, rationale: dep.rationale, parentId: id });
      }
    }
  }
  return result;
}

/** Group deliveries by kind for the picker. */
function groupDeliveries() {
  const groups: { kind: string; label: string; nodes: Node[] }[] = [];
  const kindOrder = ["empirical-test", "patent-claim", "domain-finding", "verb", "infrastructure", "construct", "principle", "primitive"];
  const kindLabels: Record<string, string> = {
    "empirical-test": "Empirical Tests",
    "patent-claim": "Patent Claims",
    "domain-finding": "Domain Findings",
    verb: "Verbs",
    infrastructure: "Infrastructure",
    construct: "Constructs",
    principle: "Principles",
    primitive: "Primitives",
    axiom: "Axioms",
  };

  for (const kind of kindOrder) {
    const items = nodes.filter((n) => n.kind === kind && n.status !== "superseded");
    if (items.length > 0) {
      groups.push({ kind, label: kindLabels[kind] ?? kind, nodes: items });
    }
  }
  // Add axioms last
  const axioms = nodes.filter((n) => n.kind === "axiom");
  if (axioms.length > 0) {
    groups.push({ kind: "axiom", label: "Axioms", nodes: axioms });
  }
  return groups;
}

function DepTreeNode({ node, depth, rationale, expanded, onToggle, selected, onSelect }: {
  node: Node; depth: number; rationale: string;
  expanded: boolean; onToggle: () => void;
  selected: boolean; onSelect: () => void;
}) {
  const deps = dependsOn.get(node.id) ?? [];
  const isLeaf = deps.length === 0;
  const isRisk = node.status !== "converged";

  return (
    <div>
      <button
        onClick={() => { onSelect(); if (!isLeaf) onToggle(); }}
        className={cn(
          "w-full text-left flex items-center gap-1.5 py-1.5 pr-2 rounded transition-colors",
          selected ? "bg-[var(--primary)]/8" : "hover:bg-[var(--muted)]/40",
          isRisk && depth > 0 && "border-l-2 border-[color:var(--color-warning)]",
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {!isLeaf ? (
          <span className="text-[10px] text-[var(--muted-foreground)] w-3 shrink-0">{expanded ? "▼" : "▶"}</span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[node.status])} />
        <span className="text-xs flex-1 truncate">{node.label}</span>
        <span className="text-[9px] text-[var(--muted-foreground)] shrink-0">{KIND_LABEL[node.kind]}</span>
      </button>
    </div>
  );
}

export function DependencyBrowser() {
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const deliveryGroups = useMemo(() => groupDeliveries(), []);

  // Walk dependencies when a delivery is selected
  const depTree = useMemo(() => {
    if (!selectedDelivery) return [];
    return walkDeps(selectedDelivery);
  }, [selectedDelivery]);

  // Stats for the selected delivery
  const stats = useMemo(() => {
    if (depTree.length === 0) return null;
    const total = depTree.length;
    const converged = depTree.filter((d) => d.node.status === "converged").length;
    const risks = depTree.filter((d) => d.node.status !== "converged" && d.depth > 0);
    const maxDepth = Math.max(...depTree.map((d) => d.depth));
    return { total, converged, risks, maxDepth };
  }, [depTree]);

  // Build visible tree (respect expanded state)
  const visibleTree = useMemo(() => {
    if (depTree.length === 0) return [];
    // Rebuild as a proper tree traversal respecting expand/collapse
    const result: typeof depTree = [];
    const childrenOf = new Map<string | null, typeof depTree>();
    for (const item of depTree) {
      const key = item.parentId;
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(item);
    }

    function visit(parentId: string | null) {
      for (const item of childrenOf.get(parentId) ?? []) {
        result.push(item);
        if (expandedNodes.has(item.node.id)) {
          visit(item.node.id);
        }
      }
    }
    visit(null);
    return result;
  }, [depTree, expandedNodes]);

  function handleSelectDelivery(id: string) {
    setSelectedDelivery(id);
    setSelectedNode(id);
    // Auto-expand first two levels
    const tree = walkDeps(id);
    const autoExpand = new Set(tree.filter((d) => d.depth <= 1).map((d) => d.node.id));
    setExpandedNodes(autoExpand);
  }

  function toggleExpand(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedNodes(new Set(depTree.map((d) => d.node.id)));
  }

  function collapseAll() {
    if (selectedDelivery) {
      setExpandedNodes(new Set([selectedDelivery]));
    }
  }

  const detailNode = selectedNode ? nodeMap.get(selectedNode) : null;
  const detailDeps = detailNode ? (dependsOn.get(detailNode.id) ?? []) : [];

  return (
    <div className="flex-1 border-l border-[var(--border)] flex overflow-hidden">
      {/* Col A: Delivery picker */}
      <div className="w-64 min-w-[16rem] shrink-0 border-r border-[var(--border)] overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
          Select a delivery
        </div>
        {deliveryGroups.map(({ kind, label, nodes: items }) => (
          <div key={kind}>
            <p className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
            {items.map((node) => (
              <button
                key={node.id}
                onClick={() => handleSelectDelivery(node.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors text-xs",
                  selectedDelivery === node.id
                    ? "bg-[var(--primary)]/8 font-medium"
                    : "hover:bg-[var(--muted)]/40 text-[var(--muted-foreground)]",
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[node.status])} />
                <span className="truncate">{node.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Col B: Dependency tree */}
      <div className="flex-1 min-w-[20rem] border-r border-[var(--border)] flex flex-col overflow-hidden">
        {!selectedDelivery ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
            Select a delivery to see its dependency tree
          </div>
        ) : (
          <>
            {/* Stats bar */}
            {stats && (
              <div className="flex items-center gap-3 px-3 h-9 border-b border-[var(--border)] shrink-0 text-[10px]">
                <span className="font-medium">{stats.total} dependencies</span>
                <span className="text-[var(--color-success)]">{stats.converged} solid</span>
                {stats.risks.length > 0 && (
                  <span className="text-[var(--color-warning)]">{stats.risks.length} at risk</span>
                )}
                <span className="text-[var(--muted-foreground)]">depth {stats.maxDepth}</span>
                <div className="ml-auto flex gap-1">
                  <button onClick={expandAll} className="px-1.5 py-0.5 rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Expand all</button>
                  <button onClick={collapseAll} className="px-1.5 py-0.5 rounded text-[var(--muted-foreground)] hover:bg-[var(--muted)]">Collapse</button>
                </div>
              </div>
            )}
            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1">
              {visibleTree.map((item) => (
                <DepTreeNode
                  key={item.node.id}
                  node={item.node}
                  depth={item.depth}
                  rationale={item.rationale}
                  expanded={expandedNodes.has(item.node.id)}
                  onToggle={() => toggleExpand(item.node.id)}
                  selected={selectedNode === item.node.id}
                  onSelect={() => setSelectedNode(item.node.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Col C: Node detail */}
      <div className="w-80 min-w-[20rem] shrink-0 overflow-y-auto p-4">
        {detailNode ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", STATUS_DOT[detailNode.status])} />
                <h2 className="text-sm font-semibold">{detailNode.label}</h2>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                  {KIND_LABEL[detailNode.kind] ?? detailNode.kind}
                </span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  detailNode.status === "converged" ? "bg-[color:var(--color-success)]/10 text-[var(--color-success)]" :
                  detailNode.status === "tension" ? "bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]" :
                  detailNode.status === "divergent" ? "bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]" :
                  "bg-[var(--muted)] text-[var(--muted-foreground)]",
                )}>
                  {STATUS_LABEL[detailNode.status] ?? detailNode.status}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{detailNode.summary}</p>
            </div>

            {detailNode.locations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Locations</p>
                <div className="flex flex-wrap gap-1">
                  {detailNode.locations.map((loc, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{loc}</span>
                  ))}
                </div>
              </div>
            )}

            {detailDeps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                  Depends on ({detailDeps.length})
                </p>
                {detailDeps.map(({ node, rationale }) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className="w-full text-left flex items-start gap-2 py-1.5 hover:bg-[var(--muted)]/30 rounded px-1 transition-colors"
                  >
                    <span className={cn("w-2 h-2 rounded-full mt-0.5 shrink-0", STATUS_DOT[node.status])} />
                    <div>
                      <span className="text-xs font-medium">{node.label}</span>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{rationale}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-8">Click a node in the tree</p>
        )}
      </div>
    </div>
  );
}
