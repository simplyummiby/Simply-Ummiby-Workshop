# Architecture

## Version 0.5.3

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
