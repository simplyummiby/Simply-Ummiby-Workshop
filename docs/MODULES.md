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

The order-level checklist covers the shared care sheet, packing slip, Shippo, label, company sticker, and sealed mailer confirmation.

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

The Processing Area currently offers basic Etsy, Shippo, Cricut, and care-sheet actions. A full Resources module remains planned.

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
- Final Shipping Checklist is visible only in Pack & Ship


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

## Pack & Ship inventory behavior — Version 0.6.1

- Product mailer checklist steps display the resolved mailer and current quantity.
- Completing a mailer step consumes one configured mailer for that order item.
- The whole-order company-sticker step displays and consumes one configured sticker.
- Unchecking either step restores the exact supply and records the return in Inventory History.
- Missing or zero inventory blocks completion and prevents negative counts.
- Product tags and printed care-sheet inventory remain scheduled for later releases.
