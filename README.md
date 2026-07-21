# Simply Ummiby Workshop

**Version 0.8.2.6**

Version 0.8.2.6 reorganizes the Inventory Overview into a calmer action dashboard and removes technical debt from inventory status calculations. Low stock, out of stock, and unverified counts are now distinct signals instead of one mixed alert list.

## Version 0.8.2.6 highlights

- Replaced the long Inventory Alerts list with Print, Purchase, and Make action groups.
- Limited overview groups to the three most urgent items while keeping complete lists in Restock Center.
- Added separate Out of Stock, Low Stock, Needs Count, and Healthy summary cards.
- Added an Inventory Check panel for quantities that have not yet been verified.
- Added a category snapshot with low, out, and needs-count totals.
- Centralized inventory summaries and restock grouping to reduce duplicate status logic.
- Quantity edits, quick adjustments, and received stock now record a verified-count timestamp.

## Version 0.8.2.5 highlights

- Shows every low and out-of-stock item in Inventory Alerts, including product tags.
- Sorts alerts by urgency, restock method, and item name.
- Displays the total number of inventory items needing attention.
- Corrects Low Stock and Out of Stock totals on inventory section summary cards.
- Retains the editable actual Ship Date workflow introduced in Version 0.8.2.4.

## Version 0.8.2.3 highlights

- Add or assign colors inline from any order line.
- Create a color with minimal required information.
- Automatically associate and preselect the color.
- Preserve the in-progress order and all other line items.

## Version 0.8.2.2 highlights

- Removed Batch Production from the main navigation.
- Replaced the Dashboard shortcut with Build Ready Packs.
- Preserved Ready Pack building, component preparation, printing, stock receipt, and adjustments in Inventory.
- Added a documented Batch Production audit.
- Preserved all inventory transactions and order-production workflows.

## Project documentation

See the `/docs` folder for architecture, modules, roadmap, recipes, vision, audit notes, and the full changelog.
