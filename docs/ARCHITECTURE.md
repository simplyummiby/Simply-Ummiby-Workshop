# Architecture

## Version 0.3.1

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
