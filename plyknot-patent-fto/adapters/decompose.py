"""
Adapter: predicate decomposition with explicit LLM call.

The framework's predicate_decomposition module exposes
parse_decomposition_response (parses JSON) and build_graph
(constructs the dependency graph from parsed units). The LLM
call itself lives outside the framework; the workspace must
supply it.

This adapter takes a callable `llm_call(prompt: str) -> str`
plus the source text and returns a DecompositionGraph.
"""

from __future__ import annotations
from typing import Callable

from plyknot.predicate_decomposition import (
    parse_decomposition_response, build_graph, DECOMPOSITION_PROMPT,
    DecompositionGraph,
)


def decompose_text(
    text: str,
    llm_call: Callable[[str], str],
) -> DecompositionGraph:
    """Run the LLM on the decomposition prompt + text, then parse
    and build the graph. The LLM is the transducer; the framework
    primitives do the structural work.
    """
    prompt = DECOMPOSITION_PROMPT + "\n\n" + text
    raw_response = llm_call(prompt)
    units = parse_decomposition_response(raw_response)
    graph = build_graph(units, source_text=text)
    return graph
