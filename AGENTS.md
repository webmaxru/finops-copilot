# AGENTS.md

Agent and contributor instructions for this repository live in
**[`.github/copilot-instructions.md`](./.github/copilot-instructions.md)** — read them before making changes.

Summary of the mandatory rules:

1. **Keep `docs/` and the calculation code in sync** — a change to the math (`src/model/**`) and its documentation ([`docs/formulas.md`](./docs/formulas.md) et al.) is a single change; never let them diverge.
2. **Website changes update the docs** when they affect what/how anything is calculated.
3. **Validate every change against official documentation** (`docs.github.com`, GitHub official changelog, `learn.microsoft.com`) before implementing; cite it in [`docs/references.md`](./docs/references.md) and tag **[Fact]/[Derived]/[Assumption]**. Never invent billing numbers.
4. **Deploy on every change** — after any change, commit and push to `main`; the GitHub Pages workflow ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) then builds and publishes automatically. No need to ask.

See [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) for the full rules, the code↔docs map, and the definition-of-done checklist.
