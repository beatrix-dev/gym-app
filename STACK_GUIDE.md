# Stack

Framework

- Vue 3
- Composition API
- <script setup>

Language

- TypeScript

Build

- Vite

Styling

- Tailwind CSS v4

State

- Pinia

Routing

- Vue Router

HTTP

- Axios

---

## Tailwind v4

Known issues

...

(your current Tailwind notes)

---

## Vue

(your Vue notes)

---

## Recommended Patterns

Prefer:

Composables

```
useAuth()
useApi()
useToast()
```

Avoid:

Large components over ~300 lines.

Business logic inside templates.

Deep prop drilling.

---

## Folder Philosophy

Pages

↓

Components

↓

Composables

↓

Services

↓

API

↓

Utilities

Keep dependencies flowing downward.