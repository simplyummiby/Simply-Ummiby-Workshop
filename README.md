# Simply Ummiby Workshop

**Version 0.6.1**

Version 0.6.1 makes the existing Pack & Ship mailer and company-sticker tasks inventory-aware while preserving Product Master as the source of packaging relationships.

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
