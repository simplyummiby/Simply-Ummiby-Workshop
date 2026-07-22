## Version 0.8.2.3 — In-Context Reference Data

Simply Ummiby Workshop now treats in-context reference maintenance as an application-wide UX rule: active work should not be abandoned merely to add or connect lookup data. The first implementation is in Orders, where a line-item color dropdown can create a new shared color or associate an existing color with the selected product. The current order form remains mounted beneath the modal, and the resulting value is automatically selected.

Future reference selectors should follow the same pattern: open inline, request the minimum required information, save to the canonical catalog, update relationships, return to the original task, and preselect the new value.

## Version 0.8.2.2 — Inventory Section Navigation

Inventory remains a single local-first module backed by `inventoryCatalog`, `inventoryTransactions`, suppliers, product links, and managed material types. The section pages are SPA views controlled by internal state; they do not open external URLs or create parallel data stores. Filters are derived from live item records, including inferred item types used for page-level filtering.

# Architecture

Simply Ummiby Workshop remains a static, local-first web application.

## Technology

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`
- JSON backup download


## Yarn and cord inventory tracking (v0.8.3.0)

Yarn-specific behavior is additive to the general inventory record. `yarnTrackingMode` may be `simple`, `approximate`, or `precise`. Approximate records use `yarnApproximateLevel`; precise records use `yarnOriginalLength`, `yarnRemainingLength`, `yarnLengthUnit`, and append-only `yarnUsageHistory`. The shared migration helper initializes these fields only for yarn/cord material types, keeping other categories free of irrelevant data and controls. Switching modes does not delete history.
