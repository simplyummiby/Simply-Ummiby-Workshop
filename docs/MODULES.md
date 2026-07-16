## Version 0.8.1 — Inventory Pages

Inventory now contains a home page plus Yarn & Cord, Accessories, Prepared Components, Packaging, Print & Branding, Finished Inventory, Suppliers, and Restock Center pages. The Inventory section navigation stays visible, and each subpage provides a Back to Inventory action and live filters appropriate to its records.

# Modules

## Dashboard

- Today’s Focus
- Resume exact production item
- Workshop counts
- Inventory alerts
- Active order preview
- Recent activity
- Quick actions

## Workshop

### Orders

- Manual order entry
- Multiple products per Etsy order
- Independent physical units
- Edit, reset, cancel, notes, and filters

### Processing Area

Each item includes:

- Production Planning
- Manufacturing & Assembly
- Pack & Ship

The active item, active tab, fulfillment choice, checklists, and notes persist locally.

### Final Shipping

The order-level checklist appears inside Pack & Ship and covers the shared care sheet, packing slip, Shippo, label, company sticker, and sealed mailer confirmation. The care-sheet row shows live inventory, low-stock status, and a nearby Print More Care Sheets action.

## Batch Production

Planned for fabrication kits, finished inventory, tags, stickers, and printed resources.

## Inventory

Planned groups:

- Raw Materials
- Fabrication Kits
- Finished Products
- Packaging
- Printed & Cricut-Made Supplies

## Products & Recipes

The three current products now supply built-in preparation, manufacturing, and packing checklists.

## Resources

The Processing Area offers Etsy, Shippo, Cricut, and care-sheet actions. Care-sheet printing opens the configured repository PDF, then separately asks how many successfully printed sheets should be added to inventory. A full Resources module remains planned.

## Settings

Planned stock thresholds, resource links, backup and restore, and future Google Drive options.


## Production Traveler Rules

Materials are informational during Production Planning and do not block manufacturing. The app only asks about unavailable materials when the user attempts to finish Manufacturing & Assembly.


## Purchase to Restock

Working in Version 0.4.0:

- Collects all unavailable materials from active Production Planning records
- Groups repeated material needs
- Shows affected orders and products
- Allows central Ordered and Available updates
- Syncs changes back to each production item


## Integrated Production Traveler

Working in Version 0.4.1:

- Production Planning shows recorded inventory availability and method-specific details
- Manufacturing & Assembly embeds the working recipe
- Fabrication kits skip Cord Preparation
- Raw-material builds include Cord Preparation
- Checkpoints are saved per order item
- Master recipe opens with a Return to This Order action
- Pack the Order and Ship the Order are unified inside Pack & Ship


## Inventory Catalog

Working in Version 0.5.2:

- Raw Materials
- Fabrication Kits
- Finished Inventory
- Packaging Supplies
- Print & Cricut Supplies
- Quantity and condition tracking
- Reorder and preferred-stock levels
- Supplier and resource links
- Add and edit inventory items
- Purchase / Make / Print restock center
- Active-order material needs
- Production Planning quantity lookups


## Dialog System

Version 0.5.2 provides wide, responsive dialogs with a fixed heading, scrollable body, and always-visible action footer. This shared presentation applies to inventory editing and confirmation dialogs.


## Materials & Kit Transactions

Working in Version 0.5.3:

- Raw-material product links
- Bill-of-material-style fabrication-kit components
- Loose versus allocated quantities
- Build Kits
- Break Apart Kits
- Prepared cord-set components
- Reason-based stock adjustments
- Recent transaction history


## Product Master

Working in Version 0.6.0:

- Product identity and colors
- Workshop Recipe relationship
- Bill of materials
- Fabrication-kit contents
- Separate required materials
- Packaging resources and rules
- Product editor
- Product creation
- Automatic Inventory “Used by Products”

## Pack & Ship inventory behavior — Version 0.6.2.1

- Product mailer checklist steps display the resolved mailer and current quantity.
- Completing a mailer step consumes one configured mailer for that order item.
- The whole-order company-sticker step displays and consumes one configured sticker.
- Unchecking either step restores the exact supply and records the return in Inventory History.
- Missing or zero inventory blocks completion and prevents negative counts.
- Product tags and printed care-sheet inventory remain scheduled for later releases.

## Product-specific tags and unified Pack & Ship — Version 0.6.3

- Product Master includes a Product Tag Inventory Item relationship.
- Tag tasks are generated from order items, not checklist wording.
- Identical product/color items are grouped and consume the grouped quantity.
- Different products or colors receive separate tasks.
- Tag consumption and reversal use the shared Pack & Ship transaction system.
- Pack the Order contains product tags, care sheet, branding sticker, product insertion, and sealing.
- Ship the Order contains packing slip, Shippo/label purchase, and label attachment.
- Inventory-aware rows show required and available quantities plus shortage states.
- Outstanding earlier work remains visible from Pack & Ship.


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

## Version 0.6.5.2 — Inventory Navigation

The Inventory module now uses these browsable categories:

- Overview
- Yarn & Cord
- Accessories
- Prepared Components
- Finished Inventory
- Packaging Supplies
- Print & Branding
- Restock Center

Prepared Components replaces the former Fabrication Kits label and also houses prepared dowels and precut cord sets.


## Version 0.6.6 — Inventory Table Polish

Standard inventory categories use a simplified table with Item, On Hand, Reorder At, Status, and Actions. Item details may include material type, craft, linked products, supplier, and notes. Uploaded photos remain available; generated initials are removed.


## Version 0.6.7 — Product Editor

Add/Edit Product is organized into Basics, Colors, Recipe & Materials, and Packaging & Branding. New products may start from an existing product family template. Inventory selectors are restricted to Mailers, Product Tags, Care Sheets, and Stickers.

## Version 0.6.7.1 — Colors Enhancements

Products → Colors supports family filters, Yarn & Cord inventory links, stock summaries, product-usage summaries, and a sectioned Add/Edit Color modal.

## Version 0.6.8 — Products Rendering Fix

The Products category and Catalog organization from v0.6.7.2 remains available. This corrective release restores the Dashboard and all main views by fixing category initialization order.


## Version 0.6.8 — Recipes

The Products > Recipes view now provides a table, search, category/craft/status filters, sorting, direct product navigation, and Add/Edit Recipe management. The recipe editor covers master details, methods, quick reference, materials, tools, production stages, workshop notes, packing guidance, and revision history.


## Version 0.6.8.1.1 — Suppliers

Inventory includes a Suppliers directory with reusable vendor records. Add/Edit Inventory selects a supplier from the directory, while supplier records show contact information and linked inventory items.

## Version 0.6.8.2 — Material Type Navigation

The Inventory editor requires a managed Material Type. Users can create a new raw-material type from the same form, and it immediately becomes an Inventory tab. Prepared, finished, packaging, and print types continue to route to their operational sections.


## Version 0.6.8.3 — Inventory Editor and Lifecycle

Inventory includes Active, Archived, and All filters; Archive, Restore, and Delete actions; a sectioned Add/Edit modal; conditional stock and print fields; and a Where Used panel.


## Version 0.6.8.3.5 — Linked Products in Inventory

The Inventory editor includes a Linked Products multi-select. The table displays the resulting product relationships as clickable pills without adding another column.


## Version 0.6.8.3.6 — Sidebar Navigation

All primary modules now have distinct SVG navigation icons: Dashboard, Workshop, Batch Production, Inventory, Products, Resources, and Settings.


## Version 0.7.1 — Orders Experience

The former Workshop destination is presented as **Orders**. Its internal `workshop` view key remains stable for backward compatibility, while the user-facing module now provides an Orders hero, live metrics, richer filtering, deadline visibility, and a table-based index. Existing order and workflow data structures are unchanged.
