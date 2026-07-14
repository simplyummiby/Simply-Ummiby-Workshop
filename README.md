# Simply Ummiby Workshop

**Version 0.5.3**

Version 0.5.3 connects raw materials to products and introduces trustworthy fabrication-kit transactions.

## Raw materials and products

Raw-material records can now be linked to one or more products from the inventory editor.

The Raw Materials table shows:

- loose quantity,
- quantity allocated inside complete fabrication kits,
- total physically owned,
- products that use the material.

A component is never counted as both loose inventory and kit inventory.

## Fabrication-kit contents

The initial kit recipes are:

### Natural/Beige Paper Towel Holder Kit

- 1 prepared paper towel holder cord set
- 1 wooden ring
- 2 end caps
- paper towel dowel remains separate

### Natural/Beige Toilet Paper Holder Kit

- 1 prepared toilet paper holder cord set
- 1 wooden ring

Prepared cord sets are quantity-tracked raw/prepared components.

## Build Kits

Building kits:

1. checks loose component availability,
2. deducts the required loose components,
3. increases complete kit inventory,
4. records every movement in inventory history.

## Break Apart Kits

Breaking a kit:

1. decreases complete kit inventory,
2. returns all listed components to loose inventory,
3. records the transaction.

Only complete kits count as fabrication-kit inventory.

## Stock adjustments

Use **Adjust** for broken, damaged, used, returned, received, or corrected stock. Inventory cannot go below zero.

## Transaction history

The Inventory overview includes recent movement history for:

- quick quantity changes,
- kit building,
- kit breakdown,
- damaged items,
- count corrections,
- received stock,
- other adjustments.
