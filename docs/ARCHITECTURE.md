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


## Yarn usage workflow refinement (v0.8.3.1)

Routine precise usage is handled through one dedicated Record Use workflow. The inventory editor owns configuration and recalibration values; the usage modal owns subtraction and history entries. This separation prevents duplicate calculation paths and keeps the remaining-length field from becoming an everyday manual counter.

## Precise yarn balance normalization (v0.8.3.2)

Precise-length initialization is handled in the inventory save boundary. A blank remaining-length value on a new precise record inherits the original length, while edits preserve the stored remaining balance unless the user explicitly changes it. Inventory status for precise and approximate yarn is derived from yarn tracking data rather than the generic quantity/condition branch.


## Yarn usage unit conversion (v0.8.3.3)

Precise yarn inventory keeps one canonical balance in the record's selected inventory unit (`yd` or `m`). Record Use accepts centimeters, yards, or meters and converts the entered value through centralized meter-based conversion helpers before subtraction. Usage history stores the original entered amount/unit and the normalized deducted amount, preserving both the maker-facing measurement and the inventory calculation.
