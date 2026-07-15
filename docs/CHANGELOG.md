# Changelog

## 0.6.2 — 2026-07-15

### Added

- Counted care-sheet inventory under Print & Cricut Supplies
- Editable default print batch quantity, set to 10
- Repository printable-file relationship for `printables/caresheet-pt-tp.pdf`
- **Print More Care Sheets** beside the Pack & Ship insertion task
- Print confirmation that adds only the quantity actually printed
- Low-stock and out-of-stock messaging based on the inventory item's Reorder At threshold
- Care-sheet consumption and restoration records in Inventory History

### Changed

- The shipping step now reads **Insert care instruction sheet** instead of treating printing and insertion as the same action
- Checking the insertion step subtracts one care sheet per Etsy order
- Unchecking the insertion step returns the exact sheet to inventory
- The inventory editor now supports Default Print Quantity and Printable File fields

### Fixed

- Opening or cancelling the print workflow does not change inventory
- Refreshing or reopening an order cannot deduct the same care sheet twice
- Care-sheet inventory cannot become negative

### Release note

- The source archive did not include the approved PDF. The app now points to the correct repository location and includes a `printables/README.md` placement note rather than fabricating a replacement care sheet.

## 0.6.1 — 2026-07-15

### Added

- Inventory-aware Pack & Ship mailer tasks
- Live available quantities beside mailer and company-sticker checklist steps
- Pack & Ship consumption and restoration records in Inventory History
- Durable checklist transaction references tied to the Etsy order and order item
- Clear out-of-stock messages that prevent negative inventory

### Changed

- Checking a product's mailer step subtracts the correct configured poly mailer
- Checking the whole-order company-sticker step subtracts one configured Simply Ummiby company sticker
- Unchecking either inventory-aware task automatically returns the exact supply to inventory
- Resetting or cancelling an order returns Pack & Ship supplies already consumed

### Fixed

- Reopening, refreshing, or rerendering an order cannot deduct the same packaging supply twice
- Existing checked legacy tasks do not trigger surprise historical deductions

### Audited for later releases

- Product tags remain checklist-only and will receive product-specific inventory mapping later
- Care sheets were prepared for counted inventory, completed in v0.6.2

## 0.6.0 — 2026-07-14

### Added

- Product Master library
- Product Master detail page
- Product name, craft, status, and colors
- Workshop Recipe link
- Product bill of materials
- Fabrication-kit definition
- Separate-material definition
- Packaging and resource relationships
- Product Master editor
- Add new product
- Product list generated from Product Master
- Automatic Used by Products calculation
- Delete Inventory Item
- Delete protection for referenced items

### Fixed

- Saving an inventory edit now returns to the category tab that was open
- Deleting an inventory item returns to the current category tab

### Changed

- Product Master is now the single source of truth for products
- Inventory product relationships are derived rather than manually maintained

## 0.5.3 — 2026-07-14

- Added materials and fabrication-kit transactions

## 0.5.2 — 2026-07-14

- Improved modal width and sticky actions
