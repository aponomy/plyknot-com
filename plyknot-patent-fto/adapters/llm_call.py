"""
Adapter: LLM call utility for predicate decomposition.

The workspace pipeline needs to call an LLM with the
DECOMPOSITION_PROMPT + claim text. This adapter provides:
- `make_anthropic_caller(model, api_key)`: returns a callable
- `make_google_caller(model, api_key)`: returns a callable
- `make_stub_caller(stub_response)`: deterministic for testing

Each caller is a function `(prompt: str) -> str` matching the
adapter signature in adapters/decompose.py.
"""

from __future__ import annotations
import os
from typing import Callable


def make_anthropic_caller(
    model: str = 'claude-haiku-4-5-20251001',
    api_key: str | None = None,
) -> Callable[[str], str]:
    """Returns a callable that sends prompts to the Anthropic API."""
    try:
        from anthropic import Anthropic
    except ImportError:
        raise ImportError(
            "Install the anthropic package: pip install anthropic")

    key = api_key or os.environ.get('ANTHROPIC_API_KEY')
    if not key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    client = Anthropic(api_key=key)

    def call(prompt: str) -> str:
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            messages=[{'role': 'user', 'content': prompt}],
        )
        return response.content[0].text

    return call


def make_google_caller(
    model: str = 'gemini-2.5-pro',
    api_key: str | None = None,
) -> Callable[[str], str]:
    """Returns a callable that sends prompts to the Gemini API."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError(
            "Install google-generativeai: pip install google-generativeai")

    key = api_key or os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if not key:
        raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY not set")
    genai.configure(api_key=key)
    gen_model = genai.GenerativeModel(model)

    def call(prompt: str) -> str:
        response = gen_model.generate_content(prompt)
        return response.text

    return call


def make_stub_caller(stub_response: str) -> Callable[[str], str]:
    """Returns a deterministic caller for testing without API spend.
    Always returns `stub_response` regardless of input prompt.
    """
    def call(prompt: str) -> str:
        return stub_response
    return call
