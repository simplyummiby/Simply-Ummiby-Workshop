## 0.8.2.4 — Actual Ship Date

- Changed Mark as Mailed to open a Ship Date confirmation dialog.
- Defaulted Ship Date to today while allowing an earlier actual mailing date.
- Added Edit Ship Date to completed orders.
- Stored the actual ship date separately from the record update timestamp.
- Migrated existing completed orders to use their prior mailed timestamp as a fallback date.

## 0.8.2.3 — Inline Reference Data in Orders

- Added an **Add or assign a color…** option directly inside every order line item.
- Existing active colors can be associated with the selected product without leaving the order form.
- New colors can be created with only a name and family, automatically associated with the product, selected in the order, and saved to the shared Colors catalog.
- The order draft remains intact while the inline modal is open.
- Established the UX rule that reference data should be maintained in context instead of interrupting active work.

## 0.8.2.2 — Retire Batch Production

- Audited the Batch Production placeholder and confirmed it contained no unique saved workflow.
- Removed Batch Production from the sidebar and generic placeholder routing.
- Replaced the Dashboard Batch Production shortcut with Build Ready Packs.
- Kept Ready Pack building, batch component preparation, print replenishment, stock receipt, and adjustments in Inventory.
- Preserved existing transaction history, including older `batch-production` source labels.

## 0.8.2.1 — Inventory Section Tables

- Replaced Ready Packs and Finished Inventory card grids with structured tables.
- Standardized all detailed Inventory sections around a table-first layout.
- Added Ready Pack availability and current-material capacity directly in the table.
- Preserved build, unpack, prepare, adjust, edit, archive, and delete actions.

## 0.8.2.1 — Inventory Experience Polish

- Added wrapped two-row Inventory section navigation with icons and no horizontal scrolling.
- Separated Suppliers and Restock Center into an Inventory Tools row.
- Added a guided new-item chooser for Yarn & Cord, Accessories, Ready Packs, Packaging, Print & Branding, Finished Products, and Other.
- Renamed Prepared Components to Ready Packs throughout the visible interface.
- Simplified section metrics to Total Items, Low Stock, and Out of Stock.
- Reduced search and filter typography and spacing.
- Preserved all existing Inventory workflows and relationships.

## 0.7.1 — Order Workspace Refresh

- Restored the working New Order and View Order flows that were lost during the 0.7.0 Orders redesign.
- Rebuilt the View Order screen as a structured order workspace with a compact hero, deadline and progress summaries, workflow navigation, order details, recipe shortcuts, and safer order actions.
- Preserved Production Planning, Manufacturing & Assembly, Pack & Ship, Ready to Mail, mailed completion, recipe access, notes, and inventory transactions.
- Added a reliable Back to Orders path while keeping the Orders index redesign available for the next stabilization pass.

## 0.6.8.3.6 — Sidebar SVG Icons

- Replaced placeholder menu symbols with a consistent inline SVG icon set.
- Added icons for Dashboard, Workshop, Batch Production, Inventory, Products, Resources, and Settings.
- Improved icon alignment, sizing, active states, and hover feedback.

## 0.6.8.3.5 — Editable Product-to-Inventory Links

## 0.6.8.3.5

- Replaced Inventory linked-product checkboxes with a compact multi-select dropdown.
- Added editable Linked Inventory controls to the Product editor.
- Synchronized ordinary material relationships from either Product or Inventory.
- Turned Connects To panels into live relationship summaries.
- Kept packaging and branding relationships in their dedicated Product selectors.


- Added a Linked Products multi-select to Add/Edit Inventory.
- Migrated existing Product Master relationships into editable stable product IDs.
- Product pills in Inventory rows now reflect saved relationships.
- Adding or removing an ordinary material link updates the matching Product Master material list.
- Packaging and prepared-component relationships remain automatic and are identified as such.
- Preserved inline supplier creation and unsaved inventory drafts.

## 0.6.8.3.3 — Live Inventory Product and Purchase Links

- Product pills beneath inventory items are generated from current Product Master relationships.
- Each product pill opens the linked product record.
- Supplier names remain compact, non-clickable metadata.
- A Buy Online link appears only when an exact item purchase URL is available.
- Workshop notes remain wrapped safely beneath the relationship details.

## 0.6.8.3.2 — Inline Supplier Creation

- Added **+ Add New Supplier** beside the Inventory supplier dropdown.
- Preserved unsaved inventory values, notes, material type, quantities, URLs, and image data while creating a supplier.
- Automatically selects a newly created supplier when returning to the Inventory editor.
- Added a safe Back to Inventory Item action from the inline supplier form.
- Kept supplier homepage records separate from item-specific purchase URLs.

## 0.6.8.3 — Safe Inventory Management

- Added Archive, Restore, and safe Delete actions.
- Added reference checks across products, colors, ready packs, orders, and transaction history.
- Added Active, Archived, and All filters.
- Redesigned the inventory editor with grouped sections, conditional print/stock fields, and a Where Used panel.

## 0.6.8.2 — Managed Material Types

- Made Material Type required for inventory items.
- Replaced free-text material entry with a managed dropdown.
- Added inline creation of new material types.
- Added dynamic Inventory tabs for raw material types such as Yarn & Cord, Wood, Hardware, and future types.
- Derived inventory category placement from the selected material type.
- Migrated Cord/Yarn to Yarn & Cord without changing stock quantities.

## 0.6.8.1.1 — Supplier Website Link Fix

- Supplier names now open the supplier's main website.
- Supplier website entries such as `amazon.com` and `www.amazon.com` are normalized to secure `https://` URLs.
- Supplier homepages remain separate from inventory-item purchase links.
- Legacy product-page URLs used as supplier websites are reduced to the supplier domain homepage.
- Invalid supplier URLs no longer open as local files.

## 0.6.8.1 — Supplier Management

- Added a reusable Suppliers directory under Inventory.
- Migrated existing free-text supplier names into stable supplier records.
- Replaced the inventory supplier text field with a supplier dropdown.
- Added supplier contact, website, lead-time, purchasing notes, status, and linked-item summaries.
- Preserved existing inventory quantities, URLs, notes, images, and transaction history.

## 0.6.8 — Recipe Management and Editing

- Replaced recipe cards with a searchable, filterable table.
- Added category, craft, and status filters plus recipe sorting.
- Added direct Open Recipe, Edit Recipe, and Product actions.
- Added recipe-index and Catalog navigation from individual recipes.
- Added a structured Add/Edit Recipe modal.
- Recipe changes now persist in local workshop data and backups.
- Preserved recipe IDs and stage IDs so active-order production progress remains compatible.

## 0.6.8 — Products Startup Fix

- Fixed the startup initialization order introduced in v0.6.7.2.
- Default product categories now initialize before saved-data migration.
- Restored Dashboard and main-view rendering while preserving Categories & Codes, Catalog filters, and sorting.
- Kept existing local-storage data and product relationships intact.

## 0.6.7.2 — Product Categories & Catalog Organization

- Added stable product-category records and Categories & Codes management.
- Added Catalog filtering by category and craft.
- Added sorting by craft/category/product, category/product, name, code, and active status.
- Added category selection and code-prefix suggestions to the Product editor.

## 0.6.7.1 — Color Families & Yarn/Cord Links

- Added color families and family filtering to Products → Colors.
- Linked colors to stable Yarn & Cord inventory item IDs.
- Added linked material stock visibility and product usage summaries.
- Redesigned the Add/Edit Color modal to match the Product editor.
- Migrated existing colors safely with inferred family values.

# Changelog

## 0.6.7 — Product Editor & Automatic Defaults

- Redesigned Add/Edit Product into clear Basics, Colors, Recipe & Materials, and Packaging & Branding sections.
- Added product templates that populate recipes, colors, packaging, printed materials, and inventory connections.
- Filtered mailer, product tag, care sheet, and branding sticker selectors by inventory type.
- Added a read-only recipe and inventory-material summary.
- Improved form typography so labels and entered values have distinct visual weight.
- Preserved existing product, order, recipe, and inventory relationships.

## 0.6.6 — Products Module
- Promoted Products to the main navigation with Catalog, Colors, and Recipes sections.
- Replaced product cards with a table that opens products and recipes directly.
- Added reusable color records and migrated existing product colors to stable IDs.
- Added color creation and editing with product usage visibility.
- Preserved existing product, order, recipe, and inventory relationships.

## 0.6.6

- Removed inventory initials and decorative placeholder squares.
- Reorganized the standard inventory table into Item, On Hand, Reorder At, Status, and Actions.
- Moved type, craft, linked products, allocation context, and descriptive details into compact supporting text.
- Fixed long supplier/notes text so it wraps inside the Item column and never collides with adjacent columns.
- Standardized inventory quick-adjust, Adjust, and Edit controls.
- Preserved real uploaded item photos while hiding empty image placeholders.
- Updated all current release references to 0.6.6.

## 0.6.5.2

- Reorganized Inventory into Yarn & Cord, Accessories, Ready Packs, Finished Inventory, Packaging Supplies, and Print & Branding.
- Split the former Raw Materials category without resetting existing quantities.
- Moved prepared dowels, precut cord sets, and product-specific kits into Ready Packs.
- Renamed Print & Cricut Supplies to Print & Branding.
- Added migration rules for custom inventory items saved under legacy category IDs.
- Updated all current release references to 0.6.5.2.

# Changelog

## 0.6.5.1

- Added separate raw and prepared Toilet Paper Holder dowel inventory.
- Toilet Paper Holder dowel preparation now consumes one raw TPH dowel and no end caps.
- Preserved the Paper Towel Holder recipe of one raw PTH dowel plus two end caps.
- Added batch and order-time preparation for both product-specific dowel types.
- Updated Outstanding Work and Pack Mailer blocking for both macramé holder products.
- Updated all current release references to 0.6.5.1.

## 0.6.5

- Added Prepared Paper Towel Dowels as a counted prepared component.
- A prepared dowel consumes one raw paper towel dowel and two end caps.
- Added batch preparation from Inventory.
- Added Use Prepared Dowel and Prepare One Now actions inside Pack & Ship.
- Added persistent outstanding-dowel warnings and blocked mailer packing until the dowel is resolved.
- Updated the paper towel holder kit so end caps belong to dowel preparation rather than the cord/ring kit.
- Added safe return behavior for reset, cancellation, and undo.
- Updated all release references to 0.6.5.



## 0.6.4 — Ship By Date tracking

- Added a required Ship By Date field to order creation and editing.
- Added safe migration support for existing orders without a date.
- Displayed the deadline prominently on the Dashboard, Workshop order cards, Processing Area hero, and item workspaces.
- Added normal, due-soon, due-today, overdue, missing-date, and mailed deadline states.
- Sorted active orders with dated orders soonest-first while preserving completed-order history.
- Kept Ship By Date separate from packed and mailed timestamps.

## 0.6.3.4 — 2026-07-15

### Fixed

- Restored the missing final fulfillment action after an order is packed.
- Mark Order Packed now changes the order to Ready to Mail instead of completing it.
- Added a visible Ready to Mail section with a separate Mark as Mailed control.
- Marking an order mailed records a mailed timestamp, moves all items to Completed, and sets progress to 100%.
- Added packed timestamps and safe migration defaults for existing orders.

## 0.6.3.3 — 2026-07-15

### Fixed

- Standardized Pack & Ship row typography and font inheritance.
- All task titles now use the same weight as Prepare Care Sheet and Print & Attach Shipping Label.
- Completed tasks now use one consistent green text and green background treatment.
- Mailer instructions and inventory details no longer override the completed-state styling.


## 0.6.3.2 — 2026-07-15

### Changed

- Reordered Pack & Ship to match the real packing-table workflow.
- Moved product-tag tasks to the start of the sequence.
- Combined care-sheet use and Etsy packing-slip preparation into one inventory-aware row.
- Added the Etsy Orders shortcut directly to the care-sheet/packing-slip row.
- Replaced separate item packing controls with one Pack Mailer task per order item.
- Pack Mailer now lists the tagged product, care sheet/packing slip, and prepared dowel when required as contents inserted together.
- Combined printing and attaching the shipping label into one task with a Shippo shortcut on the row.
- Moved branding sticker application before closing and sealing the package.
- Replaced item-level packed actions with one final Mark Order Packed action.
- Completing the final action moves all active order items to Ready to Mail.

### Preserved

- Stable product-tag inventory links and grouped tag quantities.
- Inventory-aware mailer, care-sheet, and branding-sticker deductions and reversals.
- Out-of-stock protection, low-stock messaging, and order-linked inventory history.


## 0.6.3.1 — 2026-07-15

### Fixed

- Removed the separate item-level Pack the Order panel from Step 3.
- Incorporated each item’s finish, mailer, and Mark Item Packed controls directly into the unified Pack & Ship workflow.
- Added one Pack the Order section containing item-specific packing followed by shared order packaging.
- Updated unified progress to include item packing and packed status.


## 0.6.3 — 2026-07-15

### Added
- Product-specific tag inventory tasks generated from live order items.
- Stable Product Master `packaging.productTagInventoryId` relationships.
- Quantity grouping for identical product/color combinations.
- Required, available, low-stock, missing-link, and out-of-stock tag states.
- Pack the Order and Ship the Order groups in one unified workspace.
- Outstanding Work panel when an order reaches Pack & Ship with earlier work incomplete.

### Changed
- Product-tag steps are no longer duplicated inside each item checklist.
- The old Whole Order / Final Shipping Checklist presentation was replaced by the unified Pack & Ship panel.
- Consumable rows consistently display item name, required quantity, and available quantity.

### Inventory safety
- Completing a tag task consumes the exact grouped quantity and creates an order-linked transaction.
- Reversing a tag task restores the exact quantity.
- Refreshing, reopening, or rerendering cannot deduct tags twice.
- Editing an order first restores completed tag allocations, then regenerates tasks from the updated order.
- Missing configuration and insufficient stock prevent completion and negative inventory.

## 0.6.2.1 — 2026-07-15

### Fixed
- Care-sheet printing now follows a true two-step workflow: open the printable first, then confirm successful output.
- Opening or attempting to print the care sheet never changes inventory.
- A failed or cancelled print can be closed with **Not Printed — Close** without adding stock.
- The successfully printed quantity remains editable before inventory is updated.

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
