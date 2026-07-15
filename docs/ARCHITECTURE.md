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
