# Architecture

## Version 0.2.0

Simply Ummiby Workshop remains a static, local-first web application.

## Technology

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`
- JSON backup download

## Working entities

### Product

Stores the product name and allowed colors.

### Customer Order

Stores:

- customer name,
- Etsy order number,
- order notes,
- calculated order status,
- timestamps,
- and several independently tracked production items.

### Production Item

Stores:

- product,
- color,
- unit number,
- current status,
- notes,
- and last-updated timestamp.

### Inventory Item

Currently supplies dashboard alert data. Full deductions are planned later.

### Activity Entry

Records meaningful order and progress changes.

## Local data migration

Version 0.2.0 reads the same `localStorage` key used by Version 0.1.0 and upgrades older order records in place. This protects test data already created in the first release.

## Future entities

- Product Recipe
- Fabrication Kit
- Finished Inventory Unit
- Package
- Inventory Transaction
- Resource
- Supplier
- App Settings

## Backup direction

Downloaded JSON remains the canonical restoration format. Google Drive can later store that JSON, while Google Sheets can provide a readable overview.
