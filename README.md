# Simply Ummiby Workshop

**Version 0.6.2**

Version 0.6.2 treats printed care instruction sheets as counted physical inventory while keeping printing and inventory addition intentionally separate. Pack & Ship now shows live care-sheet stock, provides the print link beside the insertion step, consumes one sheet per order, and safely restores it when the step is reversed.

## Version 0.6.2 highlights

- Printed care sheets are tracked under Print & Cricut Supplies.
- **Print More Care Sheets** opens `printables/caresheet-pt-tp.pdf`.
- After printing, an editable confirmation defaults to 10 sheets.
- Opening the printable alone never changes inventory.
- Inserting a care sheet subtracts one and records the related order in Inventory History.
- Low-stock messaging uses the care-sheet inventory item's editable Reorder At threshold.
- Mailer and company-sticker behavior from v0.6.1 remains intact.

## Product Master

Each product can define:

- product name and craft,
- status,
- colors,
- linked Workshop Recipe,
- bill of materials,
- fabrication-kit definition,
- materials stored separately from the kit,
- mailer type,
- product tag,
- care sheet,
- company sticker,
- packaging notes.

Orders continue to use the product list, but that list is now generated from Product Master.

## Automatic inventory relationships

The Inventory editor no longer manually asks which products use an item.

“Used by Products” is calculated automatically from Product Master:

- material connections,
- fabrication-kit contents,
- separate required materials,
- packaging resources.

Adding a new Product Master makes it available to order entry and inventory relationships.

## Inventory modal behavior

Saving or deleting an inventory item returns you to the Inventory category tab you were using, such as Raw Materials or Fabrication Kits.

## Delete inventory items

Inventory items can now be deleted from the edit modal.

Deletion is blocked when an item is still referenced by:

- a Product Master,
- a fabrication-kit component definition.

The app explains which connections must be removed first. Transaction history remains available after deletion.

## Existing modules

Workshop Recipes remain the permanent instruction library. Product Master links a product to its recipe and everything else needed to make, stock, and pack it.
