# Project Architecture

## Directory Structure

src/

components/

pages/

layouts/

stores/

composables/

services/

api/

router/

assets/

utils/

---

## Component Rules

Presentational components:

- Render only

Container components:

- Fetch data
- Coordinate state

---

## State

Global state:

Pinia

Local state:

Component refs/reactive

Derived state:

Computed properties

---

## API

HTTP logic belongs inside services.

Components should not call Axios directly.

---

## Styling

Tailwind utilities first.

Avoid scoped CSS unless necessary.

Prefer composition over overrides.

---

## Naming

Components

PascalCase

Composables

useSomething.ts

Stores

useSomethingStore.ts

Pages

FeatureNameView.vue