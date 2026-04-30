#!/usr/bin/env python3
"""
Render dependency.json as a top-down tree SVG using Graphviz.

Strategy: compute a spanning tree (BFS from axiom nodes), render tree edges
as solid dark lines and non-tree edges as light dashed curves.

Outputs to src/features/overview/dependency-graph.svg

Usage:
    python3 render-dependency-graph.py
"""

import json, subprocess, tempfile, re
from pathlib import Path
from collections import deque

SCRIPT_DIR = Path(__file__).parent
JSON_PATH = SCRIPT_DIR / "dependency.json"
OUT_SVG = SCRIPT_DIR.parent / "src" / "features" / "overview" / "dependency-graph.svg"

STATUS_COLORS = {
    "converged":  "#16a34a",
    "tension":    "#ca8a04",
    "divergent":  "#dc2626",
    "single":     "#71717a",
    "proposed":   "#6366f1",
    "superseded": "#a1a1aa",
}

STATUS_FILL = {
    "converged":  "#dcfce7",
    "tension":    "#fefce8",
    "divergent":  "#fef2f2",
    "single":     "#f4f4f5",
    "proposed":   "#e0e7ff",
    "superseded": "#f4f4f5",
}

KIND_SHAPES = {
    "axiom":          "doubleoctagon",
    "primitive":      "box",
    "principle":      "hexagon",
    "construct":      "box",
    "infrastructure": "component",
    "domain-finding": "ellipse",
    "patent-claim":   "house",
    "empirical-test": "diamond",
    "verb":           "octagon",
}


def compute_spanning_tree(nodes, edges):
    """BFS from axiom nodes to build a spanning tree. Returns set of tree edge tuples."""
    children = {}  # parent -> [child] (reversed: edge goes from child to parent in data)
    parents = {}   # child -> [parent]
    for e in edges:
        # edge["from"] depends on edge["to"], so tree flows: to -> from (parent -> child)
        parents.setdefault(e["from"], []).append(e["to"])
        children.setdefault(e["to"], []).append(e["from"])

    # Find roots: axiom nodes, or nodes with no parents
    node_ids = {n["id"] for n in nodes}
    axiom_ids = {n["id"] for n in nodes if n["kind"] == "axiom"}
    roots = axiom_ids or (node_ids - set(parents.keys()))

    visited = set()
    tree_edges = set()
    queue = deque(roots)
    visited.update(roots)

    while queue:
        node = queue.popleft()
        for child in children.get(node, []):
            if child not in visited:
                visited.add(child)
                tree_edges.add((child, node))  # child -> parent (matches edge direction)
                queue.append(child)

    # Pick up any disconnected nodes
    for n in nodes:
        if n["id"] not in visited:
            # Attach to first parent if possible
            for p in parents.get(n["id"], []):
                if p in visited:
                    tree_edges.add((n["id"], p))
                    visited.add(n["id"])
                    break
            else:
                visited.add(n["id"])

    return tree_edges


def build_dot(data):
    nodes = data["nodes"]
    edges = data["edges"]
    tree_edges = compute_spanning_tree(nodes, edges)

    lines = [
        'digraph dependency {',
        '  rankdir=TB;',
        '  bgcolor="transparent";',
        '  pad=1.0;',
        '  nodesep=1.2;',
        '  ranksep=1.5;',
        '  splines=polyline;',
        '  node [fontname="Inter, Helvetica, Arial, sans-serif" fontsize=14 '
        '        style="filled,rounded" penwidth=1.5 margin="0.25,0.15"];',
        '  edge [arrowsize=0.7 penwidth=1.2 minlen=2];',
        '',
    ]

    for node in nodes:
        nid = node["id"]
        label = node["label"]
        status = node["status"]
        kind = node["kind"]
        shape = KIND_SHAPES.get(kind, "box")
        color = STATUS_COLORS.get(status, "#71717a")
        fill = STATUS_FILL.get(status, "#f4f4f5")

        if len(label) > 22:
            words = label.split()
            mid = len(words) // 2
            label = " ".join(words[:mid]) + "\\n" + " ".join(words[mid:])

        attrs = (
            f'label="{label}" shape={shape} '
            f'color="{color}" fillcolor="{fill}" fontcolor="#09090b"'
        )
        if status == "superseded":
            attrs += ' style="filled,rounded,dashed" fontcolor="#a1a1aa"'

        lines.append(f'  "{nid}" [{attrs}];')

    lines.append('')

    # Tree edges: solid, dark
    for edge in edges:
        key = (edge["from"], edge["to"])
        if key in tree_edges:
            lines.append(f'  "{edge["from"]}" -> "{edge["to"]}" [color="#71717a"];')

    lines.append('')

    # Non-tree edges: dashed, light, curved (override splines for these)
    for edge in edges:
        key = (edge["from"], edge["to"])
        if key not in tree_edges:
            lines.append(
                f'  "{edge["from"]}" -> "{edge["to"]}" '
                f'[color="#d4d4d8" style=dashed constraint=false];'
            )

    lines.append('}')
    return '\n'.join(lines)


def main():
    data = json.loads(JSON_PATH.read_text())
    dot_source = build_dot(data)

    with tempfile.NamedTemporaryFile(mode='w', suffix='.dot', delete=False) as f:
        f.write(dot_source)
        dot_path = f.name

    OUT_SVG.parent.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        ['dot', '-Tsvg', dot_path, '-o', str(OUT_SVG)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"Graphviz error: {result.stderr}")
        return

    # Post-process: make SVG responsive and add id for JS targeting
    svg = OUT_SVG.read_text()
    svg = re.sub(r'width="\d+pt"', '', svg)
    svg = re.sub(r'height="\d+pt"', '', svg)
    svg = svg.replace('<svg ', '<svg id="dep-graph" style="width:100%;height:100%;" ', 1)
    OUT_SVG.write_text(svg)

    print(f"Rendered {len(data['nodes'])} nodes, {len(data['edges'])} edges → {OUT_SVG.name}")


if __name__ == '__main__':
    main()
