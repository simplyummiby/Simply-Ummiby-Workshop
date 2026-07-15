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
