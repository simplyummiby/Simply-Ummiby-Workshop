# Simply Ummiby Workshop

**Version 0.8.2.4**

Version 0.8.2.4 records the actual date an order shipped, even when the order is marked complete later. Completed orders can also have their ship date corrected without changing the rest of the workflow.

## Version 0.8.2.4 highlights

- Mark as Mailed now opens a Ship Date confirmation dialog.
- Ship Date defaults to today and may be changed to an earlier date.
- Completed orders include an Edit Ship Date control.
- The actual ship date is stored separately from the app update timestamp.
- Existing completed orders inherit a date from their prior mailed timestamp when available.

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
