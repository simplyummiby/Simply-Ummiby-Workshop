# Simply Ummiby Workshop

**Version 0.3.2**

This release adds an order-driven Purchase to Restock center.

## What is new

When a material is marked inside Production Planning as:

- Need to Buy
- Ordered
- Backordered

it now appears automatically in two places:

1. Dashboard Inventory Alerts
2. Inventory → Purchase to Restock

## Purchase to Restock

Materials are grouped so several orders needing the same supply do not create a cluttered list.

For each material, the app shows:

- number of active production items affected,
- customer,
- Etsy order number,
- product,
- color,
- current material status,
- a shortcut back to the affected item.

You can also mark all active instances of that material:

- Ordered
- Available

These changes sync back into the affected Production Planning records.

## Still planned

This is an order-driven restock list, not full counted inventory yet. Supplier links, exact purchase quantities, stock receipts, fabrication-kit counts, and automatic deductions remain planned for the Inventory release.
