## Version 0.8.2.1 — Inventory Page Architecture Complete

Inventory now has a stable home-and-section-page architecture. Future work may add distinct artwork per section and Smart Stock capacity estimates after recipe usage data is mature.

# Roadmap

## Version 0.1.0 — Foundation — Complete

- Theme, navigation, dashboard shell, local storage, backups, and documentation

## Version 0.2.0 — Workshop Orders — Complete

- Manual orders, multiple products, independent items, order workspace, statuses, notes, resume, edit/reset/cancel

## Version 0.3.0 — Processing Workflow — Complete

- Prepare, Manufacture, and Pack & Ship tabs
- Fulfillment method
- Product-specific checklists
- Saved checklist progress
- Waiting on Material
- Whole-order final shipping checklist
- Ready to Mail workflow
- External shortcuts and temporary care-sheet printing

## Version 0.3.1 — Production Traveler Refinement — Complete

- Nonblocking materials status
- Production Planning
- Manufacturing & Assembly sections
- Missing-material completion warning

## Version 0.4.0 — Order-Driven Restock Alerts — Complete

- Dashboard material alerts
- Purchase to Restock center
- Grouped active-order material needs
- Ordered and Available status syncing

## Version 0.3.5 — Recipe Refinement

- Review real production checklists
- Correct wording and order based on actual use
- Add custom-order exceptions
- Improve care-sheet and resource links

## Version 0.4.0 — Package Planner

- Build one or more mailers per Etsy order
- Assign items to packages
- Enforce paper towel holder mailing rules
- Separate tags, care sheets, stickers, labels, and packing slips by package

## Version 0.5.2 — Inventory Catalog — Complete

- Raw materials
- Fabrication kits by product and color
- Finished inventory
- Packaging and printed supplies
- Automatic deductions and undo
- Stock thresholds and supplier links

## Version 0.6.0 — Batch Production

- Purchase to Restock
- Make to Restock
- Print to Restock
- Suggested batch quantities

## Future — Resources Expansion

- Final care-instruction printing
- Etsy, Shippo, Cricut, Canva, and supplier shortcuts

## Future — Backup & Restore

- Restore from JSON
- Google Drive backup exploration
- Google Sheets export

## Version 1.0.0

A stable local-first workshop management system ready for everyday use.


## Version 0.5.2 — Inventory Transactions

- Confirm and deduct fabrication kit
- Confirm and deduct finished inventory
- Build fabrication kits from raw materials
- Packaging and print-supply deductions
- Undo recent inventory transactions


## Version 0.5.3 — Materials & Kit Transactions — Complete

- Link raw materials to products
- Distinguish loose, allocated, and total owned
- Build complete kits from loose components
- Break kits apart and return components
- Reason-based stock adjustments
- Inventory transaction history


## Version 0.6.0 — Product Master — Complete

- Single source of truth for sellable products
- Colors, recipe, materials, kit, and packaging
- Automatic inventory product relationships
- Product creation and editing
- Inventory deletion with reference protection
- Return to current inventory tab after modal actions

## Version 0.6.1 — Inventory-Aware Packaging Tasks — Complete

- Mailer checklist deductions and returns
- Company-sticker deductions and returns
- Pack & Ship transaction references and Inventory History records
- Duplicate-deduction protection across refresh and reopen
- Zero-stock protection
- Product-tag and care-sheet audit for upcoming releases

## Version 0.6.2.1 — Care Sheet Inventory and Printing — Complete

- Count printed care sheets as Print & Cricut inventory
- Default editable print batch of 10
- Open the repository care-sheet PDF without automatically changing inventory
- Confirm the quantity successfully printed before adding stock
- Show live care-sheet stock and low-stock messaging in Pack & Ship
- Consume one sheet per order and restore it safely when reversed
- Record print additions, order consumption, and returns in Inventory History


## Version 0.6.3 — Product-Specific Tags and Unified Pack & Ship — Complete

- [x] Store stable product-tag inventory IDs in Product Master
- [x] Generate product-specific tag tasks from live order items
- [x] Group identical product/color quantities
- [x] Consume and restore exact tag quantities safely
- [x] Handle missing configuration and zero inventory
- [x] Regenerate tag tasks safely after order edits
- [x] Merge Pack the Order and Ship the Order into one workspace
- [x] Remove the duplicate Final Shipping Checklist presentation
- [x] Show required and available quantities for consumables


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

## Version 0.6.5.2 — Completed

- Split Raw Materials into Yarn & Cord and Accessories.
- Rename Fabrication Kits to Ready Packs.
- Rename Print & Cricut Supplies to Print & Branding.
- Preserve Packaging Supplies as a dedicated category.
- Migrate legacy and custom inventory records without resetting stock.


## Version 0.6.6 — Completed

Inventory table readability pass completed: removed initials, simplified columns, standardized controls, and fixed long-description overlap.


## Version 0.6.7 — Completed

- Redesigned the Product editor.
- Added automatic product-family defaults.
- Added filtered packaging and branding selectors.
- Added linked recipe and inventory-material summaries.
- Improved form typography and layout.

## Version 0.6.7.1 — Completed

- Color families and filtering
- Yarn & Cord inventory relationships
- Redesigned color editor

## Version 0.6.8 — Completed

- Corrected product-category startup initialization.
- Restored all app views without removing the v0.6.7.2 category, filtering, or sorting features.


## Version 0.6.8 — Completed

- Added Recipe Library table and management controls.
- Added persistent recipe editing.
- Added recipe navigation to Recipes and Catalog.
- Preserved active-order production-stage compatibility.


## Version 0.6.8.1.1 — Completed

- Supplier directory and editor
- Stable supplier links from inventory
- Migration of legacy supplier text
- Supplier dropdown in Add/Edit Inventory

## Version 0.6.8.2 — Completed

- Required managed Material Type dropdown.
- Inline creation of new material types.
- Dynamic material-type Inventory tabs.
- Safe migration of existing inventory type names and quantities.


## Version 0.6.8.3 — Completed

- Safe inventory archive, restore, and deletion
- Reference checking before removal
- Redesigned inventory editor
- Where Used relationship summary


## Version 0.6.8.3.5 — Completed

- Editable Linked Products field in Inventory.
- Stable product IDs stored on inventory records.
- Live product pills synchronized with Product Master materials.
- Automatic packaging/component links preserved.


## Version 0.6.8.3.6 — Completed

Completed the sidebar SVG icon refresh and standardized navigation icon sizing and interaction states.


## Version 0.7.1 — Orders Experience

The former Workshop destination is presented as **Orders**. Its internal `workshop` view key remains stable for backward compatibility, while the user-facing module now provides an Orders hero, live metrics, richer filtering, deadline visibility, and a table-based index. Existing order and workflow data structures are unchanged.
