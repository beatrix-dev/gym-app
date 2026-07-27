# UI Quality Bar — Base Rule (project-agnostic)

Paste this into any project's `CLAUDE.md`, or keep it as a standing instruction. It doesn't contain colors, fonts, or a specific stack on purpose — those change per project. This is the process bar that stays constant.

## Non-negotiable before calling any UI task "done"

1. **Actually run the dev server and look at the rendered page.** Reading the code back is not verification. If you can't render it in this environment, say so explicitly instead of reporting success.
2. **Every interactive element has a visible affordance** — inputs have a border/background and padding, buttons look clickable (background/border + padding + hover/focus state), links are distinguishable from body text.
3. **Every table, grid, or multi-column layout has explicit sizing.** No unsized cells that collapse, wrap unpredictably, or overlap.
4. **Test empty, loading, and error states** — not just the happy path with realistic data already in it.
5. **Test at a mobile width (~375px)**, not only desktop.
6. **If a utility/atomic CSS framework is involved** (Tailwind, UnoCSS, etc.), confirm the expected class is actually present in the compiled/computed CSS before declaring a style fixed — code that "looks right" doesn't always compile right.
7. **Never build class names via string interpolation** (e.g. `` `bg-${color}-500` ``) when using an atomic CSS framework — these are frequently invisible to the compiler's static scan. Use literal class strings inside a ternary/map/object instead.
8. **If something looks broken, say so.** Reporting "done" on an unverified UI task is worse than reporting nothing.

## Design quality, not just correctness

9. **Don't default to templated AI-design patterns** — warm cream + serif + terracotta accent, near-black + single neon accent, broadsheet hairlines with zero radius — unless the brief actually calls for them. Make one deliberate, justified choice tied to this specific product's content.
10. **Keep a consistent token set per project** — a handful of named colors, 2 type roles, one spacing scale, 1–2 radius values — reused everywhere rather than invented per component.
11. **Spend boldness in one place** (a single signature element); keep everything around it disciplined and quiet.

## Process

12. **State the stack before writing UI code** for a new feature (framework, styling system, build tool) and confirm the styling pipeline is known-working before writing component markup — don't discover a broken build after generating five components.
