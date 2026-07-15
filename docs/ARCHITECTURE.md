# Architecture

## Version 0.6.2.1

Simply Ummiby Workshop remains a static, local-first web application.

## Technology

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`
- JSON backup download

## Core entities

### Product

Stores:

- product name,
- colors,
- preparation checklist,
- manufacturing checklist,
- packing checklist.

### Customer Order

Stores:

- customer and Etsy order information,
- order notes,
- production items,
- final shipping checklist,
- timestamps,
- calculated status.

### Production Item

Stores:

- product and color,
- independent status,
- notes,
- fulfillment method,
- active processing tab,
- preparation checks,
- manufacturing checks,
- packing checks,
- timestamps.

## Migration

Version 0.3.0 migrates Version 0.2 local data in place. Existing production items receive the correct product recipe and empty workflow checklists without deleting the order.

## External resources

Version 0.3.0 opens Etsy, Shippo, and Cricut as external shortcuts. URLs live under `settings.externalLinks`.

## Printing

The current care sheet is generated in a temporary printable browser window. The final Resources module should link to the user’s approved PDF instead.

## Future entities

- Package
- Inventory Transaction
- Fabrication Kit
- Finished Inventory Unit
- Supplier
- Saved Resource


## Version 0.3.1 workflow model

Production items now store `materialStatuses` and nested `manufacturingChecks`. The migration maps earlier flat manufacturing checklists into the new sectioned traveler model.


## Derived restock data

Version 0.4.0 does not store a second independent shopping list. The Purchase to Restock center is derived from active production-item `materialStatuses`. This avoids duplicate records and keeps the central view synchronized with Production Planning.


## Integrated traveler rendering

The Manufacturing & Assembly tab reads stage instructions from the master recipe but stores completion in the production item’s `recipeStageChecks`.

The selected fulfillment method determines stage visibility:

- finished inventory: no manufacturing stages,
- fabrication kit: skips `cord-preparation`,
- raw materials: includes every master-recipe stage.

The final shipping section is rendered only inside Pack & Ship.


## Inventory catalog architecture

Inventory catalog defaults live in `js/data/inventory-catalog.js`.

The working catalog is persisted in `data.inventoryCatalog` and contains:

- categories,
- inventory items,
- tracking type (`quantity` or `condition`),
- restock type (`purchase`, `make`, or `print`),
- on-hand levels,
- thresholds,
- supplier / resource details,
- optional product and color links.

Version 0.5.2 migrates legacy inventory quantities into matching catalog records.


## Dialog layout

The shared modal is a three-row grid: heading, scrollable body, and action footer. The modal itself is constrained to the viewport so long forms never push the Save action off screen.


## Inventory transactions and kit allocation

Fabrication kits define `components` as inventory item IDs and quantities.

Building a kit transfers quantities from loose component records into the kit count. Allocation is derived from:

`kit quantity × component quantity`

Breaking a kit reverses the transfer.

Inventory movements are retained in `data.inventoryTransactions`. Product relationships are stored in `linkedProductIds`.


## Product Master architecture

Product Master defaults live in `js/data/product-masters.js`.

The working records are stored in `data.productMasters`. The legacy `data.products` list is regenerated from Product Master for compatibility with order entry.

Inventory product relationships are derived by scanning Product Master materials, kit definitions, separate materials, and packaging resource IDs.

Inventory deletion is blocked while a Product Master or kit component references the record.

## Version 0.6.1 inventory-aware Pack & Ship tasks

Mailer and company-sticker checklist actions use the shared Pack & Ship inventory transaction helpers in `js/app.js`. Each completed task stores its transaction ID on the owning order item or order-level shipping record. That durable reference makes task completion idempotent across rerenders, refreshes, and reopened orders.

Mailer inventory is resolved from the Product Master `packaging.mailerType` relationship. The current supported mappings are Large Poly Mailer → `poly-mailer-large` and Standard Poly Mailer → `poly-mailer-standard`. Company stickers resolve from `packaging.companyStickerInventoryId`.

Consumption transactions record the inventory item, quantity, order ID, Etsy order number, optional order-item ID, checklist task ID, source (`pack-and-ship`), and timestamp. Unchecking creates a linked restoration transaction and removes the active task reference. Inventory is never allowed to become negative.

Legacy checked tasks without a stored transaction are preserved without making an automatic historical deduction. Clearing one of those tasks changes only the checklist state and shows a reconciliation notice.

## Version 0.6.2.1 care-sheet inventory and printing

The `care-sheets` inventory record stores counted quantity, an editable low-stock threshold (`reorderAt`), editable `defaultPrintQuantity`, the repository-relative `printableFile`, and applicable product relationships. Catalog migration merges these new defaults into existing local data without resetting the user's saved quantity or thresholds.

`printCareSheet()` opens the configured PDF in a new tab and then displays a separate confirmation dialog. Inventory changes only through `addPrintedCareSheets(quantity)`, which validates the entered quantity, adds it to counted stock, and creates a `print-and-cricut` inventory transaction. Cancelling the dialog or merely opening the PDF makes no inventory change.

The whole-order `careSheetPrinted` step remains stored for backward compatibility but is presented as **Insert care instruction sheet**. It uses the same idempotent Pack & Ship transaction helpers introduced in v0.6.1, with task key `shipping-care-sheet`. One sheet is consumed per order, a linked transaction ID prevents repeat deduction, and unchecking creates a matching restoration transaction. Low-stock messaging is derived from the inventory item's configured `reorderAt` value.


## Version 0.6.3 product-tag tasks and unified Pack & Ship

Product Master stores each product's tag relationship at `packaging.productTagInventoryId`. Pack & Ship never resolves tags by label text. `productTagGroupsForOrder()` derives stable tasks from the current order items, grouping identical product/color combinations and retaining the related order-item IDs.

Each task uses a durable key based on product ID and color. Its inventory transaction ID is stored in the order-level `shipping.inventoryTaskTransactions` map, while completion state is stored in `shipping.productTagChecks`. This provides idempotent consumption and exact reversal across rerenders and reopened orders.

When an existing order is edited, completed tag allocations are restored before its item list is rebuilt. Tasks are then regenerated from the revised products, colors, and quantities, preventing stale tag deductions.

The former order-level Final Shipping Checklist was replaced with a unified Pack & Ship workspace containing Pack the Order and Ship the Order groups. Earlier incomplete production is surfaced in an Outstanding Work panel rather than being hidden by the current workflow stage.


## Version 0.6.3.1 unified workflow correction

Step 3 now renders one unified Pack & Ship panel. Item-specific finishing, mailer consumption, and packed status appear inside the Pack the Order group before shared tags, care sheets, branding sticker, sealing, and shipping. The former separate item-level packing panel was removed.

## Version 0.6.3.2 packing-sequence correction

Step 3 now follows one physical packing sequence: attach the product-specific tag; prepare one care sheet with the Etsy packing slip printed on its reverse; pack the tagged product, care sheet/packing slip, and prepared dowel when required into the correct mailer; print and attach the shipping label through Shippo; apply the company sticker; close and seal the package; then mark the order packed. The Etsy Orders and Shippo shortcuts live on the exact rows where they are used. Item-level packed buttons are no longer part of this workflow; the final order action moves all active items to Ready to Mail.


## Version 0.6.3.3 Pack & Ship visual consistency

Pack & Ship checklist rows share one explicit font family, title size, and title weight. All rows render black text before completion and apply the same green background, border, title, supporting-copy, and inventory-detail treatment after completion.


## Version 0.6.4 Ready to Mail completion

- Packing and mailing are separate order states.
- Mark Order Packed records `shipping.packedAt` and moves active items to `Ready to Mail`.
- Mark as Mailed records `shipping.mailedAt`, moves all order items to `Completed`, and completes the order at 100%.
- Existing saved orders migrate with nullable packed and mailed timestamps.


## Version 0.6.5 — Prepared Dowel Workflow

Paper towel dowels now have two inventory states: raw Paper Towel Dowels and Prepared Paper Towel Dowels. A prepared dowel is cut to length, fitted with two end caps, inspected, and ready for packing. Preparing one consumes one raw dowel and two end caps. Prepared dowels may be made in batches from Inventory or created directly for an order. A paper towel holder cannot complete Pack Mailer until its prepared-dowel requirement is resolved.

## Version 0.6.5.1 — Product-Specific Dowel Workflows

Paper Towel Holder and Toilet Paper Holder dowels are separate raw and prepared inventory items. Preparing a Paper Towel Holder dowel consumes one raw PTH dowel and two end caps. Preparing a Toilet Paper Holder dowel consumes one raw TPH dowel and no end caps. Both may be prepared in batches or directly for an order, and Pack Mailer remains blocked until the correct prepared dowel is assigned.

## Version 0.6.5.2 — Inventory Category Reorganization

Inventory category IDs now separate fibers from hardware:

- `yarn-cord` — macramé cord, crochet yarn, and future fiber stock
- `accessories` — wooden rings, raw dowels, end caps, beads, and hardware
- `prepared-components` — prepared dowels, precut cord sets, and product-specific kits
- `finished-inventory` — completed products
- `packaging` — poly mailers and packing supplies
- `print-branding` — care sheets, product tags, and company stickers

The inventory migration maps legacy `raw-materials`, `fabrication-kits`, and `print-supplies` records to the new categories while preserving quantities and user edits.


## Version 0.6.6 — Inventory Table Presentation

The inventory catalog continues to use the same data and transaction architecture. This release changes presentation only: descriptive metadata is contained in the Item cell, quantity allocation context appears under On Hand, and placeholder initials are no longer rendered. Long text uses wrapping and overflow protection so it cannot cross grid columns.


## Version 0.6.7 — Product Editor Architecture

The Product editor now uses stable Product Master relationships, shared Color IDs, filtered inventory-type selectors, template-based defaults, and a read-only recipe/material summary. Existing product materials remain stored on the Product Master and are copied from the selected template for new product records.

## Version 0.6.7.1 — Color Data Relationships

Color records now store `family` and `inventoryItemId`. The inventory link is restricted to the `yarn-cord` category and uses a stable inventory item ID. Existing records are migrated by inferring a family from the color name while preserving all prior color/product relationships.

## Version 0.6.8 — Startup Initialization Correction

Default product-category constants are declared before `loadData()` runs. This prevents temporal-dead-zone failures while migrating existing saved products into category records.


## Version 0.6.8 — Editable Recipe Data

Bundled recipes are migrated into `data.recipes` during startup. Saved recipe records override bundled defaults by stable recipe ID. Recipe and production-stage IDs remain stable so order travelers can continue storing stage checkoffs safely.


## Version 0.6.8.1.1 — Supplier Records

Suppliers are stored in `data.suppliers` with stable IDs. Inventory items store `supplierId` and retain a supplier-name snapshot for backward compatibility and searching. Startup migration deduplicates existing free-text supplier names case-insensitively and links inventory records without changing stock or transactions.

## Version 0.6.8.2 — Managed Inventory Material Types

Inventory material types are stored in `inventoryMaterialTypes` as stable records with a name, category destination, status, and `showAsTab` flag. Inventory items require a material type; their category is derived from the selected type. Raw-material types can render as dynamic Inventory tabs.
