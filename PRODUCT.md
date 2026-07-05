# Product

## Register

product

## Users

Enterprise FinOps analysts, platform / developer-experience admins, and engineering leaders who own GitHub Copilot spend.

Their context: GitHub moved Copilot to usage-based billing (AI credits) on June 1, 2026, so a monthly bill is now `fixed license fees + metered usage after the shared included credit pool drains`. That is hard to reason about intuitively, and the real billing console is a risky place to experiment. These users need to validate "what-if" configurations — seat counts, Business/Enterprise plan mix, universal and power-user budgets, per-user limits, and cost-center splits — *before* committing them for real.

The job to be done: answer questions like *"if we buy 100 seats at 70/30, cap people at $50, and split teams into cost centers, what will we actually pay, and who gets blocked?"* — in minutes, without building spreadsheets. The primary on-screen task is: adjust smart-default sliders, add/remove cost centers, then play the animated day 1→30 simulation and read the KPIs, burndown/spend charts, and warnings.

## Product Purpose

A static, browser-only simulator (React + TypeScript + Vite, no backend) that models a month of GitHub Copilot enterprise spend across **Copilot Business** and **Copilot Enterprise** seats, with first-class support for **multiple cost centers**.

It exists to make usage-based Copilot billing legible: it shows the shared included credit pool draining and metered (overage) cost growing until it hits configured limits, so teams can size the pool, set budgets and per-user limits, and see exactly where usage meters or gets blocked.

Success looks like: a user validates several realistic setups quickly, understands the split between fixed license cost and metered overage, sees who gets blocked and when — and **trusts the result** because every billing rule is cited to official GitHub documentation and tagged **[Fact]**, **[Derived]**, or **[Assumption]**. It is a decision-support instrument for quick validation, explicitly not an invoice.

## Brand Personality

Three words: **precise, trustworthy, instrument-grade.**

Voice and tone are analytical, sober, and transparent. The product speaks in ledger-grade numerals and named, fixed semantics rather than persuasion; every non-USD input carries its live USD equivalent so the user is never guessing at what a number means. The guiding metaphor, carried through the code and copy, is **"The Meter"**: a precision spend instrument in a deep-ink cockpit, with the bill-composition meter as its signature element.

Emotional goal: the calm confidence of reading a well-built gauge. The user should feel they are inspecting a trustworthy instrument, not being sold to.

## Anti-references

- **Generic SaaS dashboard.** No gradient hero-metric template (big number + small label + gradient accent), no endless identical icon-heading-text card grids, no tiny uppercase tracked eyebrow above every section. Familiarity is fine; templated slop is not.
- **Flashy consumer / marketing aesthetic.** This is an analytical instrument, not a landing page — no drenched hero, no persuasion-first layout, no motion for spectacle.
- **Intimidating raw spreadsheet.** Dense figures must stay legible, guided, and color-coded by meaning; never a bare wall of cells the user has to decode alone.

## Design Principles

1. **Truth over persuasion.** Every displayed number must be defensible. Validate billing rules against official GitHub docs, cite them, tag each as [Fact] / [Derived] / [Assumption], and never invent or guess billing figures. This is the reason the simulator can be trusted.
2. **Math and its documentation are one change.** The calculation code (`src/model/**`) and the formal spec in `docs/` never drift — they ship together.
3. **An instrument, not a dashboard.** Color is information, not decoration: the pool drains (teal), the meter runs (amber), the limit blocks (red), and those meanings stay fixed everywhere they appear.
4. **Legible under density.** Ledger-grade tabular numerals, live USD equivalents on every credit/percent input, and progressive guidance so the numbers inform rather than overwhelm.
5. **Deterministic and inspectable.** Same inputs always yield the same result (seeded RNG); the whole 30-day month is computed once so timeline scrubbing and animation are honest and instant.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** *(assumption — a sensible default; the codebase already uses contrast-conscious tokens and enforces readable body contrast).* Confirm/adjust the target if a stricter bar is required.
- **Light and dark themes** with an explicit `color-scheme`; a deep-ink dark theme is the default, with a fully specified light theme.
- **Reduced motion is honored** via `prefers-reduced-motion` alternatives for reveals and the day-by-day animation.
- **Meaning is never carried by color alone.** The fixed pool / metered / limit / tier semantics are always paired with labels, legends, or text so the interface remains usable with color-vision deficiencies.
- **Keyboard and assistive-tech support:** visible `:focus-visible` states and ARIA roles on interactive controls (sliders, toggles, popovers, status regions).
