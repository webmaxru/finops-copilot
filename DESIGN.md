---
name: Copilot Enterprise Spend Simulator
description: A precision instrument for modeling monthly GitHub Copilot AI-credit spend across cost centers.
colors:
  bg: "#080b16"
  bg-2: "#0b1020"
  panel: "#111731"
  panel-2: "#172142"
  panel-3: "#1f2b52"
  border: "#263257"
  border-soft: "#1b2544"
  text: "#eaf0ff"
  text-dim: "#c1cbe6"
  muted: "#8794ba"
  brand: "#6e7bff"
  brand-strong: "#8f99ff"
  accent: "#b57bf6"
  pool: "#2fd4a4"
  metered: "#f5b33f"
  limit: "#fb6a78"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 4.25rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
rounded:
  sm: "9px"
  md: "14px"
  lg: "18px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "22px"
components:
  button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "7px 13px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "6px 9px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "18px"
  cc-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "14px"
  status-chip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: Copilot Enterprise Spend Simulator

## 1. Overview

**Creative North Star: "The Meter"**

This is a precision spend instrument, not a dashboard. Every decision serves one act: reading a bill as it forms. The surface is a deep-ink navy cockpit (`#080b16`) — nearly black, but tinted toward indigo, never neutral gray — over which panels rise through tonal layering rather than shadow. Numbers are the material: they render in ledger-grade tabular monospace so digits never jitter while the day 1→30 simulation animates the included credit pool draining and the metered overage climbing toward a hard limit. The signature element, the bill-composition meter, is a literal gauge — a license segment and a metered segment filling a track against a coral ceiling marker.

The palette is information, not decoration. Five semantic hues carry fixed meaning everywhere they appear: indigo is interactive and the Business tier, violet is the Enterprise tier and power users, teal is the credit pool that drains, amber is the meter that runs, and coral is the limit that blocks. A user learns the vocabulary once and reads every chart, chip, and readout fluently after that.

It explicitly rejects three things. It is **not a generic SaaS dashboard** — no gradient hero-metric template, no identical icon-heading-text card grids, no tracked uppercase eyebrow stacked above every section. It is **not a flashy consumer or marketing site** — sober and analytical, motion conveys state and never spectacle. And it is **not an intimidating raw spreadsheet** — dense figures stay color-coded, guided, and legible.

**Key Characteristics:**
- Deep-ink navy cockpit with indigo-tinted neutrals; depth from tonal layering, not heavy shadow.
- A fixed, information-coded five-color semantic system (pool / metered / limit / Business / Enterprise).
- Ledger-grade tabular-mono numerals for every value that changes during the simulation.
- Space Grotesk (display) · IBM Plex Sans (UI) · IBM Plex Mono (data) — a three-role pairing on a real contrast axis.
- One signature component — the bill-composition meter — that everything else supports.

## 2. Colors

A deep-ink navy base carrying a five-hue semantic system where every color has one fixed, information-bearing job. Values below are the dark (default) theme; a fully specified light theme mirrors every role.

### Primary
- **Signal Indigo** (`#6e7bff`, `oklch(64.0% 0.194 275.3)`): The interactive color — focus rings, slider fills, primary buttons, links. Doubles as the **Business tier** and the cumulative-bill series in charts. `--brand-strong` (`#8f99ff`) is its hover/press step.

### Secondary
- **Enterprise Violet** (`#b57bf6`, `oklch(69.3% 0.181 303.8)`): The **Enterprise tier** and **power-user** color, and the second half of the two-tone plan-ratio slider. Distinct enough from indigo to read at a glance in a stacked chart.

### Tertiary — the meter triad
- **Pool Teal** (`#2fd4a4`, `oklch(77.7% 0.148 167.8)`): The included credit pool — the thing that *drains*. Also the pulsing "live" status dot.
- **Meter Amber** (`#f5b33f`, `oklch(80.9% 0.147 77.4)`): Metered overage — the meter that *runs* once the pool is empty.
- **Limit Coral** (`#fb6a78`, `oklch(70.7% 0.177 17.0)`): Hard stop / blocked. The ceiling marker, over-limit figures, and destructive-action affordances.

### Neutral
- **Deep-Ink Navy** (`#080b16` → `#0b1020`): The cockpit base; two-stop background wash.
- **Console Panels** (`#111731` / `#172142` / `#1f2b52`): The tonal layering ramp — each step lifts a surface without a shadow.
- **Borders** (`#263257` / `#1b2544` soft): Hairline separation between layered surfaces.
- **Instrument White** (`#eaf0ff`) / **Dim** (`#c1cbe6`) / **Slate Muted** (`#8794ba`): Text ink from primary to captions. Muted (`oklch(67% 0.058 270)`) is reserved for labels and secondary captions, not body prose.

### Named Rules
**The Fixed-Meaning Rule.** The five semantic hues are never used decoratively. Amber *always* means metered, coral *always* means blocked, teal *always* means the pool. If a value isn't one of those things, it doesn't get that color.

**The No-Color-Alone Rule.** Every semantic color is paired with a label, legend, or text token. Meaning must survive a grayscale render — required for color-vision accessibility.

## 3. Typography

**Display Font:** Space Grotesk (fallback system-ui, sans-serif)
**Body/UI Font:** IBM Plex Sans (fallback system-ui, -apple-system, Segoe UI, Roboto)
**Data/Label Font:** IBM Plex Mono (fallback ui-monospace, Menlo)

**Character:** A three-role pairing on genuine contrast axes: a geometric grotesk for display weight and precision, a humanist sans for calm UI legibility, and a monospace for tabular data. They read as one instrument because all three are engineered, not ornamental.

### Hierarchy
- **Display** (Space Grotesk 600, `clamp(44px, 7vw, 68px)`, lh 0.95, ls −0.02em, tabular-nums): The headline bill readout only. This is the gauge's needle.
- **Headline** (Space Grotesk 600, 24px, lh 1.1, tabular-nums): Secondary readouts (max bill, pool-exhausted day, blocked count).
- **Title** (Space Grotesk 600, 15–15.5px, ls −0.01em): App/brand name and section titles (each prefixed by a leading gradient tick).
- **Body** (IBM Plex Sans 400, 14px base, lh 1.5): UI copy and captions; prose capped at ~62ch (see `.hero-slogan`).
- **Label** (IBM Plex Mono 500, 10.5–11px, ls 0.12–0.16em, uppercase): Readout labels, meter scales, status chips, and the single hero eyebrow.

### Named Rules
**The Tabular-Numeral Rule.** Any figure that changes during the simulation uses `font-variant-numeric: tabular-nums` in IBM Plex Mono or Space Grotesk, so digits hold their column and never jitter while scrubbing the timeline.

**The One-Eyebrow Rule.** The mono uppercase eyebrow is a deliberate, singular instrument label in the hero — plus mono readout labels. It is *not* multiplied above every section; section identity comes from the leading gradient tick, not stacked kickers.

## 4. Elevation

Hybrid, but **tonal-layering first.** Depth comes primarily from the surface ramp (`bg` → `panel` → `panel-2` → `panel-3`), each step a lighter indigo-navy that reads as "closer" without any shadow. Shadows are a small, dark, diffuse vocabulary reserved for genuine lift (panels, popovers) and state (hover, focus). The sticky topbar uses `backdrop-filter: saturate(140%) blur(12px)` over a translucent base; colored glows appear only on the brand mark and the meter's limit ceiling.

### Shadow Vocabulary
- **Subtle** (`box-shadow: 0 1px 2px rgba(2,5,15,0.4)`): Slider thumbs, small raised chips.
- **Panel Lift** (`box-shadow: 0 10px 30px -12px rgba(2,5,15,0.7)`): Panels, hero, and cards on hover.
- **Pop** (`box-shadow: 0 16px 40px -12px rgba(2,5,15,0.8)`): Info popovers and floating surfaces.
- **Focus Ring** (`box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 45%, transparent)`): The universal `:focus-visible` treatment.

### Named Rules
**The Layer-Before-Shadow Rule.** Reach for the next surface step before a shadow. Shadows respond to state and elevation; they are not the default way to separate content.

## 5. Components

### Buttons
- **Shape:** `--radius-sm` (9px); header/icon actions and status pills use full `999px`.
- **Primary:** indigo vertical gradient (`--brand-strong` → `--brand`) with a soft indigo glow, white text, weight 600, padding `7px 13px`.
- **Default:** `--panel-2` fill, 1px `--border`; hover shifts border toward indigo and background to `--panel-3`. `:active` nudges `translateY(1px)`.
- **Ghost (destructive):** transparent; on hover fills `--limit-soft` and text turns coral — the delete/remove affordance.

### Cards / Containers
- **Panel:** radius 14px, subtle top-lit gradient fill, 1px border, Panel-Lift shadow, 18px padding. `h2` carries a 3px leading tick (a `::before` gradient bar from indigo→violet — a pseudo-element accent, *not* a side border).
- **Cost-center card:** radius-sm, gradient fill; hover lifts the border toward indigo and adds Panel-Lift shadow. The result line is separated by a 1px dashed rule. The "add" card is a dashed-outline drop target that fills `--brand-soft` on hover.
- **Responsive grid:** `repeat(auto-fill, minmax(300px, 1fr))` — columns respond structurally, no fluid type.

### Inputs / Controls
- **Range slider:** 6px pill track filled indigo to `--pos%`; 16px white thumb ringed 3px indigo, scales to 1.12 on hover, shows the focus ring on `:focus-visible`.
- **Ratio slider:** two-tone track (indigo Business | violet Enterprise) with a slim vertical bar thumb — the split *is* the readout.
- **Switch:** 34×20 pill; off is muted, checked fills `--brand-soft` with an indigo border and slides the knob to `--brand-strong`.
- **Editable name field:** borderless until hover/focus, then `--panel-2` fill with an indigo border — inline editing, no modal.

### Navigation
- **Topbar:** sticky, 58px, translucent blurred base, 1px soft bottom border. Brand mark is a 30px indigo→violet gradient tile; brand name (Space Grotesk) truncates with ellipsis; a mono uppercase sub-label sits beside it. Actions (promo, theme) are pill buttons, right-aligned; sub-label and button labels hide under 560px.

### Status chip
- Full-pill mono chip on a translucent panel with a **pulsing teal dot** (2.4s ease-in-out) signaling a live simulation; over-limit state recolors to coral.

### The Bill-Composition Meter (signature)
- A 26px track with a faint 10%-repeating tick pattern. A **license segment** (indigo gradient) and a **metered segment** (amber gradient) fill left-to-right; a 2px **coral ceiling marker** with a soft glow marks the hard limit. Segment widths animate over `0.6s cubic-bezier(0.22, 1, 0.36, 1)` as the day advances. A mono scale sits beneath, turning coral when usage runs over.

## 6. Do's and Don'ts

### Do:
- **Do** keep the five semantic hues fixed: indigo = interactive/Business, violet = Enterprise/power-user, teal = pool (drains), amber = metered (runs), coral = limit (blocks).
- **Do** render every changing figure in tabular-mono (`font-variant-numeric: tabular-nums`) so digits don't shift during animation.
- **Do** create depth by stepping the surface ramp (`bg`→`panel`→`panel-2`→`panel-3`) before adding a shadow.
- **Do** pair every semantic color with a label, legend, or text token so meaning survives grayscale.
- **Do** animate state with the project's ease-out curve `cubic-bezier(0.22, 1, 0.36, 1)` (0.15–0.18s for UI state, 0.6s for the meter), and keep the `prefers-reduced-motion` collapse intact.
- **Do** treat the bill-composition meter as the signature — license + metered segments read against the coral ceiling.

### Don't:
- **Don't** build a generic SaaS hero-metric template (big number + gradient accent + supporting stats). The bill readout is an instrument, not a marketing metric.
- **Don't** add identical icon-heading-text card grids, or a tracked uppercase eyebrow above every section — the single hero eyebrow plus the leading gradient tick are the deliberate system.
- **Don't** go flashy/consumer-marketing: no drenched heroes, no motion for spectacle.
- **Don't** turn dense figures into a raw spreadsheet wall — keep them color-coded and guided.
- **Don't** use `background-clip: text` gradient text; emphasize with weight, size, or a single solid color.
- **Don't** use a `border-left`/`border-right` greater than 1px as a colored accent stripe. (The section-title tick is a 3px `::before` pseudo-element, which is allowed; a 1px `border-left` divider on the readouts column is fine.)
- **Don't** repurpose a semantic hue decoratively — no amber unless it means metered, no coral unless it means blocked.
