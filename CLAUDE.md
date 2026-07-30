# Gym & Grocery Tracker

## Before implementation

- Read `ENGINEERING_PRINCIPLES.md` for every feature.
- For UI work, also read `UI_QUALITY_BAR.md` and `FRONTEND_STYLE_GUIDE.md`.
- Read `STACK_GUIDE.md` before framework-specific work.
- Read `ARCHITECTURE.md` before adding folders or abstractions.

## Working agreements

- Prefer the smallest correct, accessible, maintainable change.
- Reuse existing components and avoid new dependencies unless necessary.
- Keep Vue components focused; put business logic in composables, services, or API modules.
- Explain the implementation plan before editing.
- Preserve unrelated uncommitted work.

## Cost-conscious workflow

- Use one main agent for normal implementation; do not create planner, implementer, reviewer, and tester subagents by default.
- Delegate only independent, read-heavy investigations that would otherwise flood the main context.
- Run the narrowest relevant test or build command; broaden validation only when the change warrants it.
- Invoke `/codex-review` once after a coherent change and its targeted validation, not after each edit.

## Completion

- Self-review for correctness, reuse, accessibility, and clear naming.
- State what was verified and any remaining assumptions or limitations.
- Never claim verification that did not occur.
