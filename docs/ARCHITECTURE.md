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


## Yarn usage unit conversion (v0.8.4.0)

Precise yarn inventory keeps one canonical balance in the record's selected inventory unit (`yd` or `m`). Record Use accepts centimeters, yards, or meters and converts the entered value through centralized meter-based conversion helpers before subtraction. Usage history stores the original entered amount/unit and the normalized deducted amount, preserving both the maker-facing measurement and the inventory calculation.

## Executable Recipe Inventory (v0.8.4.0)
Recipes may include an `inventoryConsumption` array. Each row identifies either a counted inventory item or a color-matched yarn/cord source, the required quantity, and the unit. Production Planning resolves the plan, validates stock, previews deductions, and sends all changes through shared consume/restore helpers. Order items retain transaction IDs so reset, cancellation, or a fulfillment-method change can reverse only the inventory that item consumed.


## Inventory-Linked Recipe Components (v0.8.4.2)

Recipe materials are stored as structured component records. Each component references an inventory item ID (or the special order-color yarn resolver), carries a usage type, and stores either a counted quantity or pieces × cut length. The recipe editor derives `inventoryConsumption` from these components, so display names may be renamed without breaking production deductions. Unlinked legacy text rows must be explicitly matched before a recipe can be saved as executable.


### Recipe inventory picker
Recipe component selectors are grouped by material type and may be filtered locally by item name, type, or craft. Inline inventory creation writes a normal inventory record, refreshes all open component selectors, and links the new record by permanent ID.


## Two-Phase Recipe Components (v0.8.5.0)

Recipe components now include a `phase` value of `manufacturing` or `packaging`. Legacy components default safely to manufacturing. Both phases retain permanent inventory IDs and the same counted-item or cut-length structure.

Production planning reads only manufacturing definitions. Packaging definitions are validated and consumed when the order is marked packed. Packaging transactions are stored per order item and restored during reset/cancellation. Existing Pack & Ship transactions for the same inventory item are detected to prevent duplicate deductions during migration from the older packaging workflow.
