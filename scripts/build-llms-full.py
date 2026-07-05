#!/usr/bin/env python3
"""Assemble public/llms-full.txt from the project's README and calculation docs.

This is the "full text" companion to public/llms.txt (llmstxt.org): the complete
readable knowledge behind the simulator, concatenated for AI agents that can't run
the client-rendered app. Committed to public/ so Vite ships it to dist/.

Re-run whenever the README or docs/*.md change (the repo's golden rule already
requires docs to move together with the calculations):

    python scripts/build-llms-full.py
"""
from __future__ import annotations

import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "public", "llms-full.txt")

SITE = "https://webmaxru.github.io/finops-copilot/"
REPO = "https://github.com/webmaxru/finops-copilot"

# (repo-relative path, human title) in reading order
SECTIONS = [
    ("README.md", "Project README"),
    ("docs/README.md", "Calculation documentation — index"),
    ("docs/formulas.md", "Calculation documentation — formulas"),
    ("docs/billing-model.md", "Calculation documentation — billing model"),
    ("docs/simulation-engine.md", "Calculation documentation — simulation engine"),
    ("docs/references.md", "Calculation documentation — references"),
]

HEADER = f"""# Copilot Enterprise Spend Simulator — full text for AI agents

> The complete readable text behind the simulator: its README plus the formal
> calculation documentation (formulas, billing model, engine, and official-source
> citations). The app itself ({SITE}) is a client-rendered React tool, so this file
> exposes its underlying knowledge in full to agents that do not execute JavaScript.

Live app: {SITE}
Source:   {REPO}
Structured index: {SITE}llms.txt

Every billing rule below is validated against official GitHub documentation and
tagged [Fact], [Derived], or [Assumption]. The engine is a pure, deterministic
(seeded) function of its inputs; the tool is a decision-support instrument for
quick validation, not an invoice, and does not model per-token pricing.
"""

SEP = "\n\n" + "=" * 78 + "\n"


def main() -> None:
    parts = [HEADER.rstrip() + "\n"]
    for rel, title in SECTIONS:
        path = os.path.join(ROOT, rel)
        with open(path, "r", encoding="utf-8") as fh:
            body = fh.read().strip()
        parts.append(f"{SEP}# {title}  (source: {rel}){SEP.rstrip()}\n\n{body}\n")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(parts).rstrip() + "\n")
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes) from {len(SECTIONS)} sources")


if __name__ == "__main__":
    main()
