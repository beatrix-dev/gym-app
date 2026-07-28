# Engineering Principles

## Simplicity

Prefer the simplest solution that satisfies the requirements.

Avoid unnecessary abstraction.

---

## Readability

Optimise code for the next engineer.

Good naming is better than comments.

---

## Maintainability

Reduce duplication.

Extract reusable logic.

Keep components focused.

---

## Modularity

Business logic belongs in composables/services.

Components should primarily render UI.

---

## Error Handling

Fail loudly.

Handle expected failures gracefully.

Never silently swallow exceptions.

---

## Performance

Measure before optimising.

Avoid unnecessary rendering.

Lazy-load large features.

Avoid expensive computations inside templates.

---

## Security

Validate all user input.

Escape output appropriately.

Never hardcode credentials.

Follow least-privilege principles.

---

## Testing

New functionality should consider:

- Happy path
- Empty state
- Error state
- Loading state
- Edge cases

---

## Code Review

Before considering work complete ask:

- Can this be simpler?
- Can code be reused?
- Is naming clear?
- Is accessibility maintained?
- Would another engineer understand this in six months?