"""
Adapter: build a GroundingIndex from a DecompositionGraph.

The framework's grounding.build_grounding_index takes
`registry_labels: dict[int, str]`. The patent-FTO pipeline
seeds the index from a claim's extracted predicates rather than
the dependency registry. This adapter constructs the
intermediate dict.
"""

from __future__ import annotations

from plyknot.grounding import build_grounding_index, GroundingIndex
from plyknot.predicate_decomposition import DecompositionGraph


def build_index_from_graph(
    graph: DecompositionGraph,
    starting_id: int = 100_000,
) -> tuple[GroundingIndex, dict[int, str]]:
    """Build an embedding index over the graph's predicate units.
    Returns (index, label_dict) so the workspace can map predicate
    IDs back to original predicate units.

    Predicate IDs start at `starting_id` (default 100,000) to
    avoid colliding with the framework's DEPENDENCY_REGISTRY IDs.
    """
    label_dict: dict[int, str] = {}
    for i, unit in enumerate(graph.units):
        # Use a canonical key form: verb + content (subject + object)
        label = f"{unit.verb} {unit.content}".strip()
        label_dict[starting_id + i] = label

    index = build_grounding_index(label_dict)
    return index, label_dict
