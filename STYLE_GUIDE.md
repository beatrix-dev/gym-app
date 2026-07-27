# Frontend Style Guide — this project

**Stack:** Vue 3 (Composition API, `<script setup>`) + TypeScript + Vite + Tailwind CSS v4 via `@tailwindcss/vite` + Pinia + Vue Router + Axios.

For the process checklist that applies to every project, see `UI_QUALITY_BAR.md`. This file covers what's specific to *this* stack: known failure modes for this exact setup, plus this project's design tokens and component baselines.

---

## 1. Tailwind v4 + Vite failure modes for this stack

v4 works very differently from v3 — most v3 troubleshooting advice (checking `content:` globs in `tailwind.config.js`) doesn't apply here.

**A. Missing plugin or missing CSS import — causes total silent failure.**
v4 requires both of these or nothing gets styled, with no build error:
```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```
```css
/* main CSS entry, imported once in main.ts */
@import "tailwindcss";
```
Check this first if *everything* is unstyled. (If only *some* elements are unstyled, it's more likely C below.)

**B. Auto content-detection can still miss files.**
v4 has no `content:` array by default — it scans the Vite module graph automatically, but it also respects `.gitignore`, and there are known Vite-plugin issues around first-dev-load misses (styles appear only after a manual refresh) and incomplete scans across monorepo packages. If a component's classes never rendered even once, confirm the file isn't gitignored and lives inside this Vite project's own module graph (not a separate workspace package).

**C. Dynamically-built class names — the most likely cause of "some elements styled, others not."**
```vue
<!-- BREAKS — Tailwind can't see interpolated strings at scan time -->
<input :class="`border-${variant}-500`" />

<!-- WORKS — literal class strings, even inside a ternary or object -->
<input :class="variant === 'error' ? 'border-red-500' : 'border-gray-300'" />
<div :class="{ 'bg-red-500': isError }" />
```
Grep any component with missing styles for template-literal class bindings first.

**D. Custom tokens live in CSS now, not `tailwind.config.js`.**
v4 defines theme tokens via `@theme { --color-brand: ...; }` directly in CSS. A leftover v3-style `tailwind.config.js` `theme.extend` block isn't the source of truth unless explicitly wired up — if a custom color/spacing value isn't rendering, confirm it's declared inside an `@theme` block.

**E. Verify before declaring fixed.**
Dev tools → Elements → computed styles, confirm the expected class is actually applied. Don't assume from source code alone.

---

## 2. Vue-specific gotchas

- **`<style scoped>` vs Tailwind utilities:** a scoped selector targeting a bare element (`input`, `table`) can have higher specificity than expected and silently override utility classes. Prefer utility classes over scoped element selectors for anything Tailwind already covers.
- **Pinia auth store + router guards:** a route can render before the auth store finishes hydrating, causing a flash of empty/unstyled content between navigation and guard resolution. Handle this loading gap explicitly (skeleton/spinner) rather than letting raw markup show through.
- **`<script setup>` class bindings:** object/array class syntax (`:class="{ 'bg-red-500': isError }"`) is safe — the failure mode is specifically template-literal *interpolation*, not object/array bindings.

---

## 3. Design tokens for this project

Chosen direction: **Signal** — calm/focused, not the app's personality centerpiece. Accent is spent narrowly (primary buttons, PR highlights, active nav link) so it still reads as a deliberate accent rather than wallpaper; everything else is quiet neutral.

- **Palette:**
  - accent `--color-accent-600` `#2563eb` (Tailwind blue-600) — primary actions, active nav, PR highlight
  - accent hover `--color-accent-700` `#1d4ed8`
  - accent subtle `--color-accent-50` `#eff6ff` / `--color-accent-100` `#dbeafe` — selected-row/badge backgrounds
  - neutral scale: Tailwind's built-in **slate** (`slate-50`…`slate-900`) — not `gray`, don't mix the two
  - success `--color-success` `#16a34a` (emerald-600) — distinct hue from accent so "PR hit" and "primary action" never look the same
  - error `--color-error` `#dc2626` (red-600)
  - All four custom tokens are declared in `src/style.css` via `@theme` (v4 requires this — see §1D), generating `bg-accent-600`, `text-accent-600`, `bg-success`, `text-error`, etc.

- **Type:** one family (system-ui stack, Tailwind's default `font-sans`) — a second display face isn't justified for a personal utility tool. Two roles via weight/tracking instead of a second font:
  - Display (page titles, `h1`/`h2`): `font-semibold tracking-tight text-slate-900`
  - Body (labels, table text, buttons): `font-normal text-slate-700` / `text-sm`

- **Spacing:** Tailwind's default scale — avoid arbitrary one-off values (already followed throughout).

- **Radius:** two values, not more —
  - `rounded-md` — inputs, buttons, badges
  - `rounded-xl` — cards/containers (workout-log form panel, PR list items), paired with `shadow-sm` so cards read as elevated above the `bg-slate-50` page background

---

## 4. Baseline component classes

**Input**
```
w-full rounded-md border border-slate-300 px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600
```

**Button (primary)**
```
inline-flex items-center justify-center rounded-md bg-accent-600
px-4 py-2 text-sm font-medium text-white hover:bg-accent-700
```

**Button (secondary)**
```
inline-flex items-center justify-center rounded-md border border-slate-300
px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50
```

**Card / container**
```
rounded-xl border border-slate-200 bg-white p-4 shadow-sm
```

**Tables**
Set explicit `<col>` widths or `w-[Npx]`/`min-w-[Npx]` per column, or use CSS grid instead of a bare `<table>`. On mobile, prefer stacked cards over a compressed horizontal table.
